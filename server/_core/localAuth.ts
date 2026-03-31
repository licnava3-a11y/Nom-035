/**
 * Autenticación local con usuario/contraseña
 * Permite instalar la plataforma en cualquier servidor sin depender de Manus OAuth.
 *
 * Activar con: LOCAL_AUTH=true en .env
 * Cuando está activo, el flujo de Manus OAuth queda deshabilitado.
 */

import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import * as db from "../db";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createLocalSessionToken(
  openId: string,
  name: string
): Promise<string> {
  const issuedAt = Date.now();
  const expirationSeconds = Math.floor((issuedAt + ONE_YEAR_MS) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({
    openId,
    appId: "local",
    name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

// ─── Rutas de autenticación local ────────────────────────────────────────────

export function registerLocalAuthRoutes(app: Express) {
  /**
   * POST /api/auth/login
   * Body: { email: string, password: string }
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "Email y contraseña son requeridos" });
      return;
    }

    try {
      // Buscar usuario por email
      const user = await db.getUserByEmail(email.toLowerCase().trim());

      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Credenciales inválidas" });
        return;
      }

      // Verificar contraseña
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        res.status(401).json({ error: "Credenciales inválidas" });
        return;
      }

      // Crear sesión JWT
      const sessionToken = await createLocalSessionToken(
        user.openId,
        user.name || user.email || ""
      );

      // Actualizar lastSignedIn
      await db.upsertUser({
        openId: user.openId,
        departamento: user.departamento || "General",
        lastSignedIn: new Date(),
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[LocalAuth] Login error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  /**
   * POST /api/auth/register
   * Solo disponible cuando LOCAL_AUTH=true y no existe ningún admin
   * Body: { name, email, password }
   */
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    if (!name || !email || !password) {
      res
        .status(400)
        .json({ error: "Nombre, email y contraseña son requeridos" });
      return;
    }

    if (password.length < 8) {
      res
        .status(400)
        .json({ error: "La contraseña debe tener al menos 8 caracteres" });
      return;
    }

    try {
      // Verificar si ya existe un usuario con ese email
      const existing = await db.getUserByEmail(email.toLowerCase().trim());
      if (existing) {
        res.status(409).json({ error: "El email ya está registrado" });
        return;
      }

      // Verificar si ya existe algún admin (para el primer setup)
      const adminExists = await db.adminExists();

      const passwordHash = await hashPassword(password);
      const openId = `local_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      await db.upsertUser({
        openId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        loginMethod: "local",
        departamento: "Administración",
        lastSignedIn: new Date(),
        // El primer usuario registrado es admin automáticamente
        role: adminExists ? "student" : "admin",
      } as any);

      // Actualizar passwordHash por separado (campo extendido)
      await db.upsertUser({
        openId,
        departamento: "Administración",
        ...(({ passwordHash }) => ({ passwordHash }))({ passwordHash }),
      } as any);

      const user = await db.getUserByEmail(email.toLowerCase().trim());
      if (!user) throw new Error("Error al crear usuario");

      const sessionToken = await createLocalSessionToken(
        user.openId,
        user.name || user.email || ""
      );

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.json({
        success: true,
        isFirstAdmin: !adminExists,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[LocalAuth] Register error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

  /**
   * POST /api/auth/logout
   */
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });

  /**
   * GET /api/auth/mode
   * Retorna el modo de autenticación activo para que el frontend sepa qué mostrar
   */
  app.get("/api/auth/mode", (_req: Request, res: Response) => {
    res.json({
      mode: "local",
      localAuthEnabled: true,
      oauthEnabled: false,
    });
  });

  console.log("[LocalAuth] Rutas de autenticación local registradas");
}
