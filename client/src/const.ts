export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Generate the Manus OAuth login URL.
 *
 * Two distinct concepts:
 *
 * 1. `redirectUri` — The callback URL registered with the OAuth portal.
 *    The OAuth server will redirect the browser here with ?code=&state= after
 *    authentication. The token exchange on the server side MUST use this exact URL.
 *    We use /api/oauth/callback for both dev and production (the server also handles
 *    /manus-oauth/callback for the Manus platform flow).
 *
 * 2. `state` — Encodes where to send the user AFTER the session is created.
 *    The server decodes this to redirect the user to the right page post-login.
 *    We encode only the returnTo path (not the full origin) to keep it simple and safe.
 *
 * FIX: Previously state encoded the full origin URL (btoa(origin + returnTo)).
 * The server was then using atob(state) as the redirectUri in the token exchange,
 * causing a mismatch with the actual redirectUri registered in the authorization.
 * Now state encodes only the returnTo path, and the server derives the redirectUri
 * from the actual incoming request URL.
 */
export const getLoginUrl = (returnTo = "/") => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // redirectUri: the callback URL the OAuth portal will redirect to after auth.
  // Must match what the server uses in the token exchange (derived from req.path).
  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  // state: encodes only the post-login destination path.
  // Server decodes this to redirect the user after setting the session cookie.
  const state = btoa(returnTo);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("responseType", "code");

  return url.toString();
};
