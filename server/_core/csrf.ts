/**
 * CSRF Protection Module
 * Implementa protección contra ataques Cross-Site Request Forgery
 * Compatible con tRPC y arquitectura moderna de SPAs
 */

import crypto from "crypto";
import { TRPCError } from "@trpc/server";

/**
 * Configuración de CSRF
 */
const CSRF_CONFIG = {
  tokenLength: 32, // Longitud del token en bytes
  tokenExpiry: 3600000, // 1 hora en milisegundos
  headerName: "x-csrf-token", // Nombre del header HTTP
  cookieName: "csrf_token", // Nombre de la cookie
  secretKey: process.env.CSRF_SECRET || process.env.JWT_SECRET || "default-csrf-secret-change-me",
};

/**
 * Almacenamiento en memoria de tokens CSRF
 * En producción, usar Redis o base de datos para escalabilidad
 */
const tokenStore = new Map<string, { token: string; expiresAt: number }>();

/**
 * Limpieza periódica de tokens expirados (cada 10 minutos)
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of tokenStore.entries()) {
    if (value.expiresAt < now) {
      tokenStore.delete(key);
    }
  }
}, 600000);

/**
 * Genera un token CSRF único y seguro
 */
export function generateCSRFToken(sessionId: string): string {
  const token = crypto.randomBytes(CSRF_CONFIG.tokenLength).toString("hex");
  const expiresAt = Date.now() + CSRF_CONFIG.tokenExpiry;

  // Almacenar token asociado al sessionId
  tokenStore.set(sessionId, { token, expiresAt });

  return token;
}

/**
 * Valida un token CSRF
 */
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const storedToken = tokenStore.get(sessionId);

  if (!storedToken) {
    return false; // Token no encontrado
  }

  if (storedToken.expiresAt < Date.now()) {
    tokenStore.delete(sessionId); // Limpiar token expirado
    return false; // Token expirado
  }

  // Validar longitudes antes de comparación segura
  if (storedToken.token.length !== token.length) {
    return false;
  }
  
  // Comparación segura contra timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(storedToken.token), Buffer.from(token));
  } catch (error) {
    // Si hay error en la comparación, rechazar token
    return false;
  }
}

/**
 * Invalida un token CSRF (útil para logout)
 */
export function invalidateCSRFToken(sessionId: string): void {
  tokenStore.delete(sessionId);
}

/**
 * Middleware de tRPC para validar CSRF en mutations críticas
 * Uso: .use(requireCSRF)
 */
export function requireCSRF<T extends { req: any; user?: any }>(opts: { ctx: T; next: () => any }) {
  const { ctx, next } = opts;

  // Obtener token del header
  const csrfToken = ctx.req.headers[CSRF_CONFIG.headerName];

  if (!csrfToken || typeof csrfToken !== "string") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Token CSRF faltante. Por favor recarga la página.",
    });
  }

  // Obtener sessionId (del usuario autenticado o de la sesión)
  const sessionId = ctx.user?.id?.toString() || ctx.req.sessionID || ctx.req.ip;

  if (!sessionId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sesión no válida. Por favor inicia sesión nuevamente.",
    });
  }

  // Validar token
  const isValid = validateCSRFToken(sessionId, csrfToken);

  if (!isValid) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Token CSRF inválido o expirado. Por favor recarga la página.",
    });
  }

  // Token válido, continuar
  return next();
}

/**
 * Genera un nuevo token CSRF para el usuario actual
 * Debe ser llamado desde un procedure público o protegido
 */
export function getCSRFTokenForUser(sessionId: string): string {
  return generateCSRFToken(sessionId);
}

/**
 * Configuración exportada para uso en frontend
 */
export const csrfConfig = {
  headerName: CSRF_CONFIG.headerName,
  cookieName: CSRF_CONFIG.cookieName,
};
