/**
 * Bypass de autenticación para entorno de testing
 * SOLO se activa cuando TEST_MODE=true
 * NO usar en producción
 */

import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
// JWT_SECRET se obtiene directamente de process.env

// Usuario de prueba para tests E2E
export const TEST_USER = {
  id: 1,
  openId: 'test-user-e2e-openid',
  name: 'Usuario de Prueba E2E',
  email: 'test-e2e@example.com',
  role: 'admin' as const,
  createdAt: new Date('2024-01-01'),
};

/**
 * Middleware de bypass de autenticación para testing
 * Inyecta usuario de prueba en req.user cuando TEST_MODE=true
 */
export function testAuthBypass(req: Request, res: Response, next: NextFunction) {
  // Solo activar en modo testing
  if (process.env.TEST_MODE !== 'true') {
    return next();
  }

  // Si ya hay usuario autenticado, no hacer nada
  if ((req as any).user) {
    return next();
  }

  // Inyectar usuario de prueba
  (req as any).user = TEST_USER;
  next();
}

/**
 * Endpoint para obtener token de prueba
 * POST /api/test/auth/token
 * Solo disponible cuando TEST_MODE=true
 */
export function createTestAuthEndpoint() {
  return (req: Request, res: Response) => {
    // Verificar que estamos en modo testing
    if (process.env.TEST_MODE !== 'true') {
      return res.status(403).json({ 
        error: 'Test endpoints only available in TEST_MODE' 
      });
    }

    // Crear token JWT con usuario de prueba
    const token = jwt.sign(
      {
        sub: TEST_USER.openId,
        name: TEST_USER.name,
        email: TEST_USER.email,
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Establecer cookie de sesión
    res.cookie('session', token, {
      httpOnly: true,
      secure: false, // false para testing local
      sameSite: 'lax',
      maxAge: 3600000, // 1 hora
    });

    res.json({
      success: true,
      user: TEST_USER,
      token,
    });
  };
}

/**
 * Endpoint para limpiar sesión de prueba
 * POST /api/test/auth/logout
 */
export function createTestLogoutEndpoint() {
  return (req: Request, res: Response) => {
    if (process.env.TEST_MODE !== 'true') {
      return res.status(403).json({ 
        error: 'Test endpoints only available in TEST_MODE' 
      });
    }

    res.clearCookie('session');
    res.json({ success: true });
  };
}
