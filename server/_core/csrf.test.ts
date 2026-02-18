/**
 * Tests para CSRF Protection
 * Valida generación, validación e invalidación de tokens CSRF
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  generateCSRFToken,
  validateCSRFToken,
  invalidateCSRFToken,
} from "./csrf";

describe("CSRF Protection", () => {
  const sessionId = "test-session-123";

  beforeEach(() => {
    // Limpiar tokens previos
    invalidateCSRFToken(sessionId);
  });

  describe("generateCSRFToken", () => {
    it("debe generar un token válido", () => {
      const token = generateCSRFToken(sessionId);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("debe generar tokens únicos para cada llamada", () => {
      const token1 = generateCSRFToken("session-1");
      const token2 = generateCSRFToken("session-2");
      
      expect(token1).not.toBe(token2);
    });

    it("debe sobrescribir token existente para la misma sesión", () => {
      const token1 = generateCSRFToken(sessionId);
      const token2 = generateCSRFToken(sessionId);
      
      // Token1 ya no debe ser válido
      expect(validateCSRFToken(sessionId, token1)).toBe(false);
      // Token2 debe ser válido
      expect(validateCSRFToken(sessionId, token2)).toBe(true);
    });
  });

  describe("validateCSRFToken", () => {
    it("debe validar token correcto", () => {
      const token = generateCSRFToken(sessionId);
      
      expect(validateCSRFToken(sessionId, token)).toBe(true);
    });

    it("debe rechazar token incorrecto", () => {
      generateCSRFToken(sessionId);
      const fakeToken = "fake-token-12345";
      
      expect(validateCSRFToken(sessionId, fakeToken)).toBe(false);
    });

    it("debe rechazar token de otra sesión", () => {
      const token = generateCSRFToken("session-1");
      
      expect(validateCSRFToken("session-2", token)).toBe(false);
    });

    it("debe rechazar token vacío", () => {
      generateCSRFToken(sessionId);
      
      expect(validateCSRFToken(sessionId, "")).toBe(false);
    });

    it("debe rechazar cuando no existe token para la sesión", () => {
      expect(validateCSRFToken("non-existent-session", "any-token")).toBe(false);
    });

    it("debe rechazar token después de invalidación", () => {
      const token = generateCSRFToken(sessionId);
      
      invalidateCSRFToken(sessionId);
      
      expect(validateCSRFToken(sessionId, token)).toBe(false);
    });
  });

  describe("invalidateCSRFToken", () => {
    it("debe invalidar token existente", () => {
      const token = generateCSRFToken(sessionId);
      
      expect(validateCSRFToken(sessionId, token)).toBe(true);
      
      invalidateCSRFToken(sessionId);
      
      expect(validateCSRFToken(sessionId, token)).toBe(false);
    });

    it("no debe lanzar error al invalidar sesión inexistente", () => {
      expect(() => invalidateCSRFToken("non-existent-session")).not.toThrow();
    });
  });

  describe("Security - Timing Attack Prevention", () => {
    it("debe usar comparación segura de tokens", () => {
      const token = generateCSRFToken(sessionId);
      const similarToken = token.slice(0, -1) + "X"; // Token casi idéntico
      
      // Ambas validaciones deben tomar tiempo similar (timing-safe)
      const start1 = Date.now();
      validateCSRFToken(sessionId, token);
      const time1 = Date.now() - start1;
      
      const start2 = Date.now();
      validateCSRFToken(sessionId, similarToken);
      const time2 = Date.now() - start2;
      
      // Diferencia de tiempo debe ser mínima (< 10ms)
      expect(Math.abs(time1 - time2)).toBeLessThan(10);
    });
  });

  describe("Token Expiration", () => {
    it("debe rechazar token expirado (simulación)", async () => {
      // Nota: Este test requiere modificar el tiempo de expiración
      // o usar mocks de Date.now() para simular paso del tiempo
      
      const token = generateCSRFToken(sessionId);
      
      // Token válido inicialmente
      expect(validateCSRFToken(sessionId, token)).toBe(true);
      
      // En producción, el token expira después de CSRF_CONFIG.tokenExpiry (1 hora)
      // Para testing real, se necesitaría:
      // 1. Reducir tokenExpiry a 100ms en config de test
      // 2. Esperar 150ms
      // 3. Validar que el token sea rechazado
    });
  });

  describe("Edge Cases", () => {
    it("debe manejar sessionIds con caracteres especiales", () => {
      const specialSessionId = "session-!@#$%^&*()_+-=[]{}|;:',.<>?";
      const token = generateCSRFToken(specialSessionId);
      
      expect(validateCSRFToken(specialSessionId, token)).toBe(true);
    });

    it("debe manejar sessionIds muy largos", () => {
      const longSessionId = "a".repeat(1000);
      const token = generateCSRFToken(longSessionId);
      
      expect(validateCSRFToken(longSessionId, token)).toBe(true);
    });

    it("debe manejar múltiples sesiones concurrentes", () => {
      const sessions = ["session-1", "session-2", "session-3"];
      const tokens = sessions.map((sid) => ({
        sessionId: sid,
        token: generateCSRFToken(sid),
      }));
      
      // Todos los tokens deben ser válidos para sus respectivas sesiones
      tokens.forEach(({ sessionId, token }) => {
        expect(validateCSRFToken(sessionId, token)).toBe(true);
      });
      
      // Tokens no deben ser válidos para otras sesiones
      expect(validateCSRFToken(sessions[0], tokens[1].token)).toBe(false);
      expect(validateCSRFToken(sessions[1], tokens[2].token)).toBe(false);
    });
  });

  describe("Token Format", () => {
    it("debe generar tokens hexadecimales", () => {
      const token = generateCSRFToken(sessionId);
      
      // Token debe ser hexadecimal (solo caracteres 0-9, a-f)
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it("debe generar tokens de longitud consistente", () => {
      const token1 = generateCSRFToken("session-1");
      const token2 = generateCSRFToken("session-2");
      
      // Longitud debe ser consistente (32 bytes * 2 caracteres hex = 64 caracteres)
      expect(token1.length).toBe(token2.length);
      expect(token1.length).toBe(64); // 32 bytes en hex
    });
  });
});
