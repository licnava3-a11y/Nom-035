export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Generate the Manus OAuth login URL.
 *
 * Two distinct concepts:
 *
 * 1. `redirectUri` — The callback URL registered with the OAuth portal.
 *    The portal redirects the browser here with ?code=&state= after auth.
 *    MUST always be `origin + /api/oauth/callback` — the server always uses
 *    this path in the token exchange regardless of which callback route fires.
 *
 * 2. `state` — Encodes where to send the user AFTER the session is created.
 *    Format: btoa(returnTo) where returnTo is a path like "/" or "/dashboard".
 *    The server decodes this to redirect the user post-login.
 *    Must NOT encode the redirectUri (different purpose).
 */
export const getLoginUrl = (returnTo = "/") => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // The callback URL registered with the OAuth portal.
  // The server uses this exact path in the token exchange (buildRegisteredRedirectUri).
  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  // state encodes only the post-login destination path (NOT the redirectUri).
  const state = btoa(returnTo);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("responseType", "code");

  return url.toString();
};
