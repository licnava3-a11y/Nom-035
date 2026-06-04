import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Build the canonical redirectUri that was registered with the OAuth portal
 * during the authorization request.
 *
 * CRITICAL: The OAuth server validates that the redirectUri in the token exchange
 * EXACTLY matches the one sent in the authorization request. The frontend always
 * registers `origin + /api/oauth/callback` as the redirectUri (see const.ts and
 * index.html). Therefore the exchange MUST always use that same path, regardless
 * of which callback route actually received the request (/api/oauth/callback or
 * /manus-oauth/callback).
 *
 * Uses x-forwarded-proto and x-forwarded-host (set by Cloud Run / Manus proxy)
 * to reconstruct the correct public-facing origin.
 */
function buildRegisteredRedirectUri(req: Request): string {
  // In production behind Cloud Run / Manus proxy, trust proxy headers.
  // app.set('trust proxy', true) ensures req.protocol and req.hostname are correct.
  const proto = req.protocol; // "https" in production (from x-forwarded-proto)
  const host = req.get("x-forwarded-host") || req.get("host") || req.hostname;
  // ALWAYS use /api/oauth/callback — this is what the frontend sends to the OAuth portal.
  // Even when Manus platform redirects to /manus-oauth/callback, the registered
  // redirectUri in the authorization was /api/oauth/callback.
  return `${proto}://${host}/api/oauth/callback`;
}

/**
 * Decode the state parameter to extract the post-login redirect path.
 *
 * State encodes where to send the user AFTER login (NOT the OAuth redirectUri).
 * Handles two formats:
 *   - btoa(returnPath): e.g. btoa("/dashboard") → "/dashboard"  [new format from const.ts]
 *   - btoa(fullUrl): e.g. btoa("https://site.com/api/oauth/callback") → "/" [old inline script]
 *
 * Always returns a safe path (never a full URL to prevent open redirect).
 */
function decodeReturnPath(state: string): string {
  try {
    const decoded = atob(state);
    // If it looks like a full URL, extract only the pathname
    if (decoded.startsWith("http://") || decoded.startsWith("https://")) {
      try {
        const url = new URL(decoded);
        // Avoid redirecting to the callback itself (would cause infinite loop)
        const path = url.pathname;
        if (path === "/api/oauth/callback" || path === "/manus-oauth/callback") {
          return "/";
        }
        return path || "/";
      } catch {
        return "/";
      }
    }
    // It's already a path
    if (decoded.startsWith("/")) {
      // Avoid redirecting to the callback itself
      if (decoded === "/api/oauth/callback" || decoded === "/manus-oauth/callback") {
        return "/";
      }
      return decoded;
    }
    return "/";
  } catch {
    return "/";
  }
}

/**
 * Shared OAuth callback handler.
 * Handles both /api/oauth/callback and /manus-oauth/callback.
 *
 * ROOT CAUSE FIX (definitive):
 * The OAuth server requires that the redirectUri in the token exchange matches
 * EXACTLY the one registered in the authorization request. The frontend always
 * registers `origin + /api/oauth/callback`. We must always use that same value
 * in the exchange, even if the callback arrives at /manus-oauth/callback.
 */
async function handleOAuthCallback(req: Request, res: Response) {
  const code = getQueryParam(req, "code");
  const state = getQueryParam(req, "state");

  console.log("[OAuth] Callback received:", {
    path: req.path,
    hasCode: !!code,
    hasState: !!state,
    protocol: req.protocol,
    host: req.get("host"),
    xForwardedHost: req.get("x-forwarded-host"),
    xForwardedProto: req.get("x-forwarded-proto"),
    query: Object.keys(req.query),
  });

  if (!code || !state) {
    console.error("[OAuth] Missing parameters — code:", !!code, "state:", !!state, "query:", req.query);
    // Redirect to friendly error page instead of plain text
    res.redirect(302, "/login-error?reason=missing_params");
    return;
  }

  try {
    // The redirectUri for token exchange must match what was registered in the
    // authorization request: always origin + /api/oauth/callback
    const redirectUri = buildRegisteredRedirectUri(req);
    console.log("[OAuth] Token exchange — redirectUri:", redirectUri);

    const tokenResponse = await sdk.exchangeCodeForToken(code, redirectUri);
    console.log("[OAuth] Token exchange successful");

    const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
    console.log("[OAuth] User info:", { openId: userInfo.openId, email: userInfo.email });

    if (!userInfo.openId) {
      console.error("[OAuth] Missing openId in user info response");
      res.redirect(302, "/login-error?reason=missing_openid");
      return;
    }

    await db.upsertUser({
      openId: userInfo.openId,
      name: userInfo.name || null,
      email: userInfo.email ?? null,
      loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
      lastSignedIn: new Date(),
      departamento: "",
    });

    const sessionToken = await sdk.createSessionToken(userInfo.openId, {
      name: userInfo.name || "",
      expiresInMs: ONE_YEAR_MS,
    });

    const cookieOptions = getSessionCookieOptions(req);
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    console.log("[OAuth] Session cookie set, sameSite:", cookieOptions.sameSite, "secure:", cookieOptions.secure);

    // Decode state to get the post-login destination path
    const returnPath = decodeReturnPath(state);
    console.log("[OAuth] Login successful, redirecting to:", returnPath);
    res.redirect(302, returnPath);
  } catch (error: any) {
    console.error("[OAuth] Callback failed:", error?.response?.status, error?.response?.data ?? error?.message ?? error);
    res.redirect(302, "/login-error?reason=exchange_failed");
  }
}

export function registerOAuthRoutes(app: Express) {
  // Primary callback — used when the app generates its own login URL
  app.get("/api/oauth/callback", handleOAuthCallback);

  // Secondary callback — used by Manus production platform
  // The platform may redirect here after authentication
  app.get("/manus-oauth/callback", handleOAuthCallback);
}
