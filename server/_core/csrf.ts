/**
 * CSRF Protection Module
 * Implementa protección contra ataques Cross-Site Request Forgery
 * Compatible con tRPC y arquitectura moderna de SPAs
 */

import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { csrfViolations } from "../../drizzle/schema";

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
export async function validateCSRFToken(
  sessionId: string, 
  token: string,
  req?: { ip?: string; headers?: any; url?: string; method?: string }
): Promise<{ valid: boolean; reason?: string }> {
  const storedToken = tokenStore.get(sessionId);

  if (!storedToken) {
    if (req) {
      await logCSRFViolation({
        token,
        userId: sessionId,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers?.['user-agent'],
        endpoint: req.url,
        method: req.method,
        reason: 'invalid_token',
      });
    }
    return { valid: false, reason: 'invalid_token' };
  }

  if (storedToken.expiresAt < Date.now()) {
    tokenStore.delete(sessionId);
    if (req) {
      await logCSRFViolation({
        token,
        userId: sessionId,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers?.['user-agent'],
        endpoint: req.url,
        method: req.method,
        reason: 'expired_token',
      });
    }
    return { valid: false, reason: 'expired_token' };
  }

  // Validar longitudes antes de comparación segura
  if (storedToken.token.length !== token.length) {
    if (req) {
      await logCSRFViolation({
        token,
        userId: sessionId,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers?.['user-agent'],
        endpoint: req.url,
        method: req.method,
        reason: 'malformed_token',
      });
    }
    return { valid: false, reason: 'malformed_token' };
  }
  
  // Comparación segura contra timing attacks
  try {
    const isValid = crypto.timingSafeEqual(Buffer.from(storedToken.token), Buffer.from(token));
    if (!isValid && req) {
      await logCSRFViolation({
        token,
        userId: sessionId,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers?.['user-agent'],
        endpoint: req.url,
        method: req.method,
        reason: 'user_mismatch',
      });
    }
    return { valid: isValid };
  } catch (error) {
    if (req) {
      await logCSRFViolation({
        token,
        userId: sessionId,
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers?.['user-agent'],
        endpoint: req.url,
        method: req.method,
        reason: 'malformed_token',
      });
    }
    return { valid: false, reason: 'malformed_token' };
  }
}

/**
 * Invalida un token CSRF (útil para logout)
 */
export function invalidateCSRFToken(sessionId: string): void {
  tokenStore.delete(sessionId);
}

/**
 * Registra una violación de CSRF en la base de datos
 */
async function logCSRFViolation(violation: {
  token: string;
  userId: string;
  ipAddress: string;
  userAgent?: string;
  endpoint?: string;
  method?: string;
  reason: 'missing_token' | 'invalid_token' | 'expired_token' | 'user_mismatch' | 'malformed_token';
}): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn('[CSRF] Database not available, skipping violation logging');
      return;
    }
    await db.insert(csrfViolations).values(violation);
  } catch (error) {
    // No fallar si el logging falla, solo registrar en consola
    console.error('[CSRF] Error logging violation:', error);
  }
}

/**
 * Middleware de tRPC para validar CSRF en mutations críticas
 * Uso: .use(requireCSRF)
 */
export async function requireCSRF<T extends { req: any; user?: any }>(opts: { ctx: T; next: () => any }) {
  const { ctx, next } = opts;

  // Obtener token del header
  const csrfToken = ctx.req.headers[CSRF_CONFIG.headerName];

  if (!csrfToken || typeof csrfToken !== "string") {
    // Registrar violación por token faltante
    await logCSRFViolation({
      token: '',
      userId: ctx.user?.id?.toString() || 'anonymous',
      ipAddress: ctx.req.ip || 'unknown',
      userAgent: ctx.req.headers?.['user-agent'],
      endpoint: ctx.req.url,
      method: ctx.req.method,
      reason: 'missing_token',
    });
    
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

  // Validar token con logging
  const validation = await validateCSRFToken(sessionId, csrfToken, ctx.req);

  if (!validation.valid) {
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
