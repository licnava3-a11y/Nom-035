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
 * Derive the redirect URI that was registered in the OAuth authorization request.
 *
 * The OAuth server validates that the redirectUri in the token exchange matches
 * the one originally sent in the authorization request. We reconstruct it from
 * the incoming request so it always matches, regardless of which callback path
 * Manus platform uses (/api/oauth/callback or /manus-oauth/callback).
 *
 * Uses x-forwarded-proto / x-forwarded-host headers (set by Cloud Run / Manus proxy)
 * to get the real public-facing URL.
 */
function deriveRedirectUri(req: Request): string {
  // In production behind a proxy, use forwarded headers for the real public URL.
  // app.set('trust proxy', true) ensures req.protocol and req.hostname are correct.
  const proto = req.protocol; // "https" in production (from x-forwarded-proto)
  const host = req.get("x-forwarded-host") || req.get("host") || req.hostname;
  const path = req.path; // "/api/oauth/callback" or "/manus-oauth/callback"
  return `${proto}://${host}${path}`;
}

/**
 * Decode the state parameter to extract the post-login redirect path.
 *
 * State encodes where to send the user AFTER login (not the OAuth redirectUri).
 * Format: btoa(origin + returnTo) — we extract only the pathname for safety.
 */
function decodeReturnPath(state: string): string {
  try {
    const decoded = atob(state);
    // state may be a full URL (origin + path) or just a path
    try {
      const url = new URL(decoded);
      return url.pathname || "/";
    } catch {
      // If not a valid URL, treat as a path directly
      return decoded.startsWith("/") ? decoded : "/";
    }
  } catch {
    return "/";
  }
}

/**
 * Shared OAuth callback handler.
 * Used by both /api/oauth/callback (dev/custom flow) and
 * /manus-oauth/callback (Manus production platform flow).
 *
 * FIX: Previously, the code used atob(state) as the redirectUri for token exchange.
 * This was WRONG because:
 *   - state = btoa(origin + returnTo) — encodes where to redirect the user after login
 *   - redirectUri for token exchange must be the EXACT callback URL registered in the
 *     authorization request (e.g. https://site.com/api/oauth/callback)
 * These are two different things. The mismatch caused "Missing OAuth parameters" / token
 * exchange failures on the OAuth server side.
 */
async function handleOAuthCallback(req: Request, res: Response) {
  const code = getQueryParam(req, "code");
  const state = getQueryParam(req, "state");

  console.log("[OAuth] Callback received:", {
    path: req.path,
    hasCode: !!code,
    hasState: !!state,
    host: req.get("host"),
    xForwardedHost: req.get("x-forwarded-host"),
    protocol: req.protocol,
  });

  if (!code || !state) {
    console.error("[OAuth] Missing parameters:", { code: !!code, state: !!state, query: req.query });
    res.status(400).send("Missing OAuth parameters");
    return;
  }

  try {
    // Build the redirectUri from the actual request URL — this MUST match what was
    // sent to the OAuth portal in the authorization request.
    const redirectUri = deriveRedirectUri(req);
    console.log("[OAuth] Starting callback with code:", code.substring(0, 10) + "...", "redirectUri:", redirectUri);

    const tokenResponse = await sdk.exchangeCodeForToken(code, redirectUri);
    console.log("[OAuth] Token exchange successful");

    const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
    console.log("[OAuth] User info retrieved:", { openId: userInfo.openId, email: userInfo.email });

    if (!userInfo.openId) {
      console.error("[OAuth] Missing openId from user info");
      res.status(400).json({ error: "openId missing from user info" });
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
    console.log("[OAuth] User upserted successfully");

    const sessionToken = await sdk.createSessionToken(userInfo.openId, {
      name: userInfo.name || "",
      expiresInMs: ONE_YEAR_MS,
    });
    console.log("[OAuth] Session token created");

    const cookieOptions = getSessionCookieOptions(req);
    console.log("[OAuth] Cookie options:", { ...cookieOptions, hostname: req.hostname });
    res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
    console.log("[OAuth] Cookie set");

    // Decode state to get the post-login redirect path
    const returnPath = decodeReturnPath(state);
    console.log("[OAuth] Redirecting to:", returnPath);
    res.redirect(302, returnPath);
  } catch (error) {
    console.error("[OAuth] Callback failed", error);
    res.status(500).json({ error: "OAuth callback failed" });
  }
}

export function registerOAuthRoutes(app: Express) {
  // Route used when the app generates its own login URL (dev + custom domain)
  app.get("/api/oauth/callback", handleOAuthCallback);

  // Route used by the Manus production platform (nom035mood-32dy4ksx.manus.space)
  // The platform redirects to /manus-oauth/callback after authentication
  app.get("/manus-oauth/callback", handleOAuthCallback);
}
