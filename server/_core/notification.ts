import { TRPCError } from "@trpc/server";
import { ENV } from "./env";
import { getDb } from "../db";
import { smtpConfig } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { logNonBlockingFailure, logStructured } from "./logger";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const buildEndpointUrl = (baseUrl: string): string => {
  const normalizedBase = baseUrl.endsWith("/")
    ? baseUrl
    : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

// ── Caché del estado notificationsEnabled ────────────────────────────────────
let _notifEnabledCache: boolean | null = null;
let _notifEnabledCacheAt = 0;
const NOTIF_CACHE_TTL_MS = 30_000;

export async function isNotificationsEnabled(): Promise<boolean> {
  const now = Date.now();
  if (_notifEnabledCache !== null && now - _notifEnabledCacheAt < NOTIF_CACHE_TTL_MS) {
    return _notifEnabledCache;
  }
  // Por defecto TRUE (notificaciones activas) a menos que se configure lo contrario
  const envDefault = process.env.NOTIFICATIONS_ENABLED !== "false";
  try {
    const db = await getDb();
    if (!db) {
      _notifEnabledCache = envDefault;
    } else {
      const configs = await db
        .select({ notificationsEnabled: smtpConfig.notificationsEnabled })
        .from(smtpConfig)
        .where(eq(smtpConfig.isActive, true))
        .limit(1);
      if (configs.length > 0 && configs[0].notificationsEnabled !== null) {
        _notifEnabledCache = Boolean(configs[0].notificationsEnabled);
      } else {
        _notifEnabledCache = envDefault;
      }
    }
  } catch (error) {
    logNonBlockingFailure("notification.enabled_config_read_failed", error);
    _notifEnabledCache = envDefault;
  }
  _notifEnabledCacheAt = now;
  return _notifEnabledCache!;
}

export function invalidateNotificationsCache(): void {
  _notifEnabledCache = null;
  _notifEnabledCacheAt = 0;
}

/**
 * Dispatches a project-owner notification through the Manus Notification Service.
 * Returns `true` if the request was accepted, `false` when the upstream service
 * cannot be reached (callers can fall back to email/slack). Validation errors
 * bubble up as TRPC errors so callers can fix the payload.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  // Guard: verificar si las notificaciones internas están habilitadas
  const notifEnabled = await isNotificationsEnabled();
  if (!notifEnabled) {
    logStructured("info", "notification.owner_skipped_disabled", { titleLength: title.length, contentLength: content.length });
    return false;
  }

  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured.",
    });
  }

  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured.",
    });
  }

  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1",
      },
      body: JSON.stringify({ title, content }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      logStructured("warn", "notification.owner_upstream_rejected", {
        status: response.status,
        statusText: response.statusText,
        detailLength: detail.length,
      });
      return false;
    }

    return true;
  } catch (error) {
    logNonBlockingFailure("notification.owner_upstream_failed", error);
    return false;
  }
}
