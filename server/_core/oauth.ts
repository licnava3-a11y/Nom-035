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
 * Shared OAuth callback handler.
 * Used by both /api/oauth/callback (dev/custom flow) and
 * /manus-oauth/callback (Manus production platform flow).
 */
async function handleOAuthCallback(req: Request, res: Response) {
  const code = getQueryParam(req, "code");
  const state = getQueryParam(req, "state");

  if (!code || !state) {
    res.status(400).send("Missing OAuth parameters");
    return;
  }

  try {
    console.log("[OAuth] Starting callback with code:", code?.substring(0, 10) + "...");
    const tokenResponse = await sdk.exchangeCodeForToken(code, state);
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
    console.log("[OAuth] Cookie set, redirecting to /");

    // Decode state to get the original redirect URI and extract the path
    let redirectTo = "/";
    try {
      const decodedState = atob(state);
      const url = new URL(decodedState);
      // Only redirect to the path portion to avoid open redirect vulnerabilities
      redirectTo = url.pathname || "/";
    } catch {
      redirectTo = "/";
    }

    res.redirect(302, redirectTo);
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
