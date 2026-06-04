import type { CookieOptions, Request } from "express";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isIpAddress(host: string) {
  // Basic IPv4 check and IPv6 presence detection.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  return host.includes(":");
}

function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname) || isIpAddress(hostname);
}

function isSecureRequest(req: Request) {
  const hostname = req.hostname;

  // In production (non-localhost), ALWAYS treat as secure.
  // Cloud Run / Manus proxy always terminates TLS before reaching the app.
  // Returning false here would set secure=false on a SameSite=None cookie,
  // which browsers silently drop — causing an infinite login redirect loop.
  if (!isLocalHost(hostname)) return true;

  // For local development, detect HTTPS normally.
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const hostname = req.hostname;
  const shouldSetDomain =
    hostname &&
    !LOCAL_HOSTS.has(hostname) &&
    !isIpAddress(hostname) &&
    hostname !== "127.0.0.1" &&
    hostname !== "::1";

  // IMPORTANT: Do NOT set a domain with a leading dot for Manus-hosted apps.
  // Manus production domains (*.manus.space) are on a public suffix list;
  // setting domain=.nom035mood-32dy4ksx.manus.space causes browsers to reject
  // the cookie entirely (same-site / public-suffix restriction).
  // Omitting the domain attribute makes the browser scope the cookie to the
  // exact hostname, which is what we want for single-domain apps.
  const domain = undefined;

  return {
    domain,
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: isSecureRequest(req),
  };
}
