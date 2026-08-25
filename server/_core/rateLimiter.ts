/**
 * Configuración de Rate Limiting para protección contra ataques DoS y spam
 * Implementa límites diferenciados por tipo de endpoint
 */

import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request, Response } from "express";
import { logStructured } from "./logger";

/**
 * Helper para generar key de rate limit compatible con IPv4 e IPv6
 * Usa ipKeyGenerator oficial para manejar correctamente IPv6
 */
const generateKey = (req: Request): string => {
  return ipKeyGenerator(req.ip ?? "");
};

/**
 * Rate limiter global para todas las rutas
 * Límite: 100 requests por 15 minutos por IP
 * NOTA: Desactivado en desarrollo para evitar bloqueos durante pruebas
 */
export const globalLimiter = rateLimit({
  skip: () => process.env.NODE_ENV === "development",
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Límite de 100 requests por ventana
  message: {
    error:
      "Demasiadas solicitudes desde esta IP, por favor intenta nuevamente en 15 minutos.",
    retryAfter: 900, // segundos
  },
  standardHeaders: true, // Retorna info de rate limit en headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita headers `X-RateLimit-*`
  // Función para generar key por IP (compatible con IPv4 e IPv6)
  keyGenerator: generateKey,
  // Handler para cuando se excede el límite
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error:
        "Demasiadas solicitudes desde esta IP, por favor intenta nuevamente en 15 minutos.",
      retryAfter: 900,
    });
  },
});

/**
 * Rate limiter estricto para endpoints de autenticación
 * Límite: 5 requests por 15 minutos por IP
 * Previene ataques de fuerza bruta en login/registro
 * NOTA: Desactivado en desarrollo para evitar bloqueos durante pruebas
 */
export const authLimiter = rateLimit({
  skip: () => process.env.NODE_ENV === "development",
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 30, // 30 intentos por ventana — suficiente para OAuth callbacks legítimos (era 5, demasiado restrictivo)
  message: {
    error:
      "Demasiados intentos de autenticación desde esta IP, por favor intenta nuevamente en 15 minutos.",
    retryAfter: 900,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // No contar requests exitosos
  keyGenerator: generateKey,
  handler: (req: Request, res: Response) => {
    logStructured("warn", "rate_limit_exceeded", { scope: "auth" });
    res.status(429).json({
      error:
        "Demasiados intentos de autenticación. Por favor intenta nuevamente en 15 minutos.",
      retryAfter: 900,
    });
  },
});

/**
 * Rate limiter para formularios de contacto y públicos
 * Límite: 3 requests por hora por IP
 * Previene spam en formularios públicos
 * NOTA: Desactivado en desarrollo para evitar bloqueos durante pruebas
 */
export const contactFormLimiter = rateLimit({
  skip: () => process.env.NODE_ENV === "development",
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Límite de 3 envíos por hora
  message: {
    error:
      "Has enviado demasiados mensajes. Por favor intenta nuevamente en 1 hora.",
    retryAfter: 3600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: (req: Request, res: Response) => {
    logStructured("warn", "rate_limit_exceeded", { scope: "contact_form" });
    res.status(429).json({
      error:
        "Has enviado demasiados mensajes. Por favor intenta nuevamente en 1 hora.",
      retryAfter: 3600,
    });
  },
});

/**
 * Rate limiter para endpoints de API sensibles
 * Límite: 20 requests por 5 minutos por IP
 * Protege endpoints que realizan operaciones costosas
 * NOTA: Desactivado en desarrollo para evitar bloqueos durante pruebas
 */
export const apiLimiter = rateLimit({
  skip: () => process.env.NODE_ENV === "development",
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // Límite de 20 requests por ventana
  message: {
    error:
      "Demasiadas solicitudes a este endpoint. Por favor intenta nuevamente en 5 minutos.",
    retryAfter: 300,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: (req: Request, res: Response) => {
    logStructured("warn", "rate_limit_exceeded", {
      scope: "api",
      path: req.path,
    });
    res.status(429).json({
      error:
        "Demasiadas solicitudes a este endpoint. Por favor intenta nuevamente en 5 minutos.",
      retryAfter: 300,
    });
  },
});

/**
 * Rate limiter para exportaciones y reportes
 * Límite: 10 requests por 10 minutos por IP
 * Previene abuso de endpoints que generan PDFs/Excel
 * NOTA: Desactivado en desarrollo para evitar bloqueos durante pruebas
 */
export const exportLimiter = rateLimit({
  skip: () => process.env.NODE_ENV === "development",
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 10, // Límite de 10 exportaciones por ventana
  message: {
    error:
      "Demasiadas exportaciones solicitadas. Por favor intenta nuevamente en 10 minutos.",
    retryAfter: 600,
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: generateKey,
  handler: (req: Request, res: Response) => {
    logStructured("warn", "rate_limit_exceeded", { scope: "export" });
    res.status(429).json({
      error:
        "Demasiadas exportaciones solicitadas. Por favor intenta nuevamente en 10 minutos.",
      retryAfter: 600,
    });
  },
});
