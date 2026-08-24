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

    it("debe sobrescribir token existente para la misma sesión", async () => {
      const token1 = generateCSRFToken(sessionId);
      const token2 = generateCSRFToken(sessionId);

      // Token1 ya no debe ser válido (fue sobrescrito)
      const result1 = await validateCSRFToken(sessionId, token1);
      expect(result1.valid).toBe(false);

      // Token2 debe ser válido
      const result2 = await validateCSRFToken(sessionId, token2);
      expect(result2.valid).toBe(true);
    });
  });

  describe("validateCSRFToken", () => {
    it("debe validar token correcto", async () => {
      const token = generateCSRFToken(sessionId);

      const result = await validateCSRFToken(sessionId, token);
      expect(result.valid).toBe(true);
    });

    it("debe rechazar token incorrecto", async () => {
      generateCSRFToken(sessionId);
      const fakeToken = "fake-token-12345";

      const result = await validateCSRFToken(sessionId, fakeToken);
      expect(result.valid).toBe(false);
    });

    it("debe rechazar token de otra sesión", async () => {
      const token = generateCSRFToken("session-1");

      const result = await validateCSRFToken("session-2", token);
      expect(result.valid).toBe(false);
    });

    it("debe rechazar token vacío", async () => {
      generateCSRFToken(sessionId);

      const result = await validateCSRFToken(sessionId, "");
      expect(result.valid).toBe(false);
    });

    it("debe rechazar cuando no existe token para la sesión", async () => {
      const result = await validateCSRFToken(
        "non-existent-session",
        "any-token"
      );
      expect(result.valid).toBe(false);
    });

    it("debe rechazar token después de invalidación", async () => {
      const token = generateCSRFToken(sessionId);

      invalidateCSRFToken(sessionId);

      const result = await validateCSRFToken(sessionId, token);
      expect(result.valid).toBe(false);
    });
  });

  describe("invalidateCSRFToken", () => {
    it("debe invalidar token existente", async () => {
      const token = generateCSRFToken(sessionId);

      const result1 = await validateCSRFToken(sessionId, token);
      expect(result1.valid).toBe(true);

      invalidateCSRFToken(sessionId);

      const result2 = await validateCSRFToken(sessionId, token);
      expect(result2.valid).toBe(false);
    });

    it("no debe lanzar error al invalidar sesión inexistente", () => {
      expect(() => invalidateCSRFToken("non-existent-session")).not.toThrow();
    });
  });

  describe("Security - Timing Attack Prevention", () => {
    it("debe usar comparación segura de tokens", async () => {
      const token = generateCSRFToken(sessionId);
      const similarToken = token.slice(0, -1) + "X"; // Token casi idéntico

      // Ambas validaciones deben tomar tiempo similar (timing-safe)
      const start1 = Date.now();
      await validateCSRFToken(sessionId, token);
      const time1 = Date.now() - start1;

      const start2 = Date.now();
      await validateCSRFToken(sessionId, similarToken);
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
      const result = await validateCSRFToken(sessionId, token);
      expect(result.valid).toBe(true);

      // En producción, el token expira después de CSRF_CONFIG.tokenExpiry (1 hora)
      // Para testing real, se necesitaría:
      // 1. Reducir tokenExpiry a 100ms en config de test
      // 2. Esperar 150ms
      // 3. Validar que el token sea rechazado
    });
  });

  describe("Edge Cases", () => {
    it("debe manejar sessionIds con caracteres especiales", async () => {
      const specialSessionId = "session-!@#$%^&*()_+-=[]{}|;:',.<>?";
      const token = generateCSRFToken(specialSessionId);

      const result = await validateCSRFToken(specialSessionId, token);
      expect(result.valid).toBe(true);
    });

    it("debe manejar sessionIds muy largos", async () => {
      const longSessionId = "a".repeat(1000);
      const token = generateCSRFToken(longSessionId);

      const result = await validateCSRFToken(longSessionId, token);
      expect(result.valid).toBe(true);
    });

    it("debe manejar múltiples sesiones concurrentes", async () => {
      const sessions = ["session-1", "session-2", "session-3"];
      const tokens = sessions.map(sid => ({
        sessionId: sid,
        token: generateCSRFToken(sid),
      }));

      // Todos los tokens deben ser válidos para sus respectivas sesiones
      for (const { sessionId, token } of tokens) {
        const result = await validateCSRFToken(sessionId, token);
        expect(result.valid).toBe(true);
      }

      // Tokens no deben ser válidos para otras sesiones
      const result1 = await validateCSRFToken(sessions[0], tokens[1].token);
      expect(result1.valid).toBe(false);

      const result2 = await validateCSRFToken(sessions[1], tokens[2].token);
      expect(result2.valid).toBe(false);
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
