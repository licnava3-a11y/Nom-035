export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = (returnTo = "/") => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // redirectUri: where Manus OAuth sends the code after authentication
  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  // state: encodes the destination path the user should land on after login.
  // The server decodes this to redirect the user after setting the session cookie.
  // We encode the full origin URL so the server can safely extract just the pathname.
  const stateUrl = `${window.location.origin}${returnTo}`;
  const state = btoa(stateUrl);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("responseType", "code");

  return url.toString();
};
