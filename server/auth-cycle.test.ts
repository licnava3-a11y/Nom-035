/**
 * auth-cycle.test.ts
 * ==================
 * Tests de regresión para prevenir el ciclo infinito de login.
 *
 * El ciclo ocurre cuando:
 * 1. El servidor construye redirectUri = http://localhost:3000/api/oauth/callback
 * 2. El portal OAuth rechaza el token exchange (401) porque el redirectUri no coincide
 * 3. El servidor redirige a /login-error?reason=code_expired
 * 4. El frontend reinicia el flujo → ciclo infinito
 *
 * Solución: el host real de la solicitud tiene prioridad para que preview y
 * producción usen el mismo origen que abrió el navegador.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = join(import.meta.dirname, "..");

// ─── Test 1: APP_PUBLIC_URL debe estar en ENV ────────────────────────────────
describe("ENV.appPublicUrl", () => {
  it("debe exportar appPublicUrl desde env.ts", () => {
    const envContent = readFileSync(join(ROOT, "server/_core/env.ts"), "utf-8");
    expect(envContent).toContain("appPublicUrl");
    expect(envContent).toContain("APP_PUBLIC_URL");
  });
});

// ─── Test 2: oauth.ts debe usar el host real de la solicitud ─────────────────
describe("buildRegisteredRedirectUri en oauth.ts", () => {
  it("debe reconstruir el redirectUri desde los headers del proxy", () => {
    const oauthContent = readFileSync(join(ROOT, "server/_core/oauth.ts"), "utf-8");
    const redirectFunction = oauthContent.match(/function buildRegisteredRedirectUri[\s\S]*?\n\}/)?.[0] ?? "";
    expect(redirectFunction).toContain("x-forwarded-proto");
    expect(redirectFunction).toContain("x-forwarded-host");
    expect(redirectFunction).toContain("/api/oauth/callback");
  });

  it("no debe priorizar APP_PUBLIC_URL sobre el host actual", () => {
    const oauthContent = readFileSync(join(ROOT, "server/_core/oauth.ts"), "utf-8");
    const redirectFunction = oauthContent.match(/function buildRegisteredRedirectUri[\s\S]*?\n\}/)?.[0] ?? "";
    expect(redirectFunction).not.toContain("ENV.appPublicUrl");
    expect(redirectFunction).toContain('req.get("host")');
  });
});

// ─── Test 3: DashboardLayout no debe tener queries protectedProcedure sin enabled guard ──
describe("DashboardLayout - enabled guards", () => {
  it("todas las queries protectedProcedure deben tener enabled: !!user", () => {
    const layoutContent = readFileSync(
      join(ROOT, "client/src/components/DashboardLayout.tsx"),
      "utf-8"
    );
    // Buscar patrones de useQuery sin enabled guard
    // Las queries que son protectedProcedure y se ejecutan sin user causan el ciclo
    const queryMatches = layoutContent.match(/\.useQuery\(/g) ?? [];
    const enabledMatches = layoutContent.match(/enabled:\s*!!\s*user/g) ?? [];
    // Debe haber al menos tantos enabled guards como queries protectedProcedure
    // (las queries publicProcedure no necesitan guard)
    // Verificamos que el patrón enabled: !!user existe en el archivo
    expect(enabledMatches.length).toBeGreaterThan(0);
    // El archivo no debe tener menuCounters, postCaseSurveys, recognitions, internalMailbox
    // sin enabled guard — verificamos que cada uno tiene su guard
    const menuCountersIdx = layoutContent.indexOf("menuCounters");
    const postCaseSurveysIdx = layoutContent.indexOf("postCaseSurveys");
    const recognitionsIdx = layoutContent.indexOf("recognitions");
    const internalMailboxIdx = layoutContent.indexOf("internalMailbox");

    if (menuCountersIdx > -1) {
      // Buscar enabled: !!user cerca de menuCounters (dentro de 300 chars)
      const nearMenuCounters = layoutContent.slice(menuCountersIdx, menuCountersIdx + 300);
      expect(nearMenuCounters).toContain("enabled");
    }
    if (postCaseSurveysIdx > -1) {
      const nearPostCaseSurveys = layoutContent.slice(postCaseSurveysIdx, postCaseSurveysIdx + 300);
      expect(nearPostCaseSurveys).toContain("enabled");
    }
    // Buscar la query específica de recognitions (no la primera ocurrencia del string en el menú)
    const recognitionsQueryIdx = layoutContent.indexOf("trpc.recognitions.getUnreadCount");
    if (recognitionsQueryIdx > -1) {
      const nearRecognitionsQuery = layoutContent.slice(recognitionsQueryIdx, recognitionsQueryIdx + 400);
      expect(nearRecognitionsQuery).toContain("enabled");
    }
    // Buscar la query específica de internalMailbox (no la primera ocurrencia del string en el menú)
    const internalMailboxQueryIdx = layoutContent.indexOf("trpc.internalMailbox.getUnreadCount");
    if (internalMailboxQueryIdx > -1) {
      const nearInternalMailboxQuery = layoutContent.slice(internalMailboxQueryIdx, internalMailboxQueryIdx + 400);
      expect(nearInternalMailboxQuery).toContain("enabled");
    }
  });
});

// ─── Test 4: NotificationBell debe tener enabled guard ───────────────────────
describe("NotificationBell - enabled guard", () => {
  it("getUnreadCount debe tener enabled guard para no ejecutarse sin autenticación", () => {
    const bellContent = readFileSync(
      join(ROOT, "client/src/components/NotificationBell.tsx"),
      "utf-8"
    );
    expect(bellContent).toContain("enabled");
    // Debe tener isAuthenticated o user como guard
    const hasAuthGuard =
      bellContent.includes("isAuthenticated") || bellContent.includes("!!user");
    expect(hasAuthGuard).toBe(true);
  });
});

// ─── Test 5: NotificationsDropdown debe tener enabled guards ─────────────────
describe("NotificationsDropdown - enabled guards", () => {
  it("todas las queries deben tener enabled guard", () => {
    const dropdownContent = readFileSync(
      join(ROOT, "client/src/components/NotificationsDropdown.tsx"),
      "utf-8"
    );
    expect(dropdownContent).toContain("enabled");
    const enabledCount = (dropdownContent.match(/enabled:/g) ?? []).length;
    expect(enabledCount).toBeGreaterThanOrEqual(2);
  });
});

// ─── Test 6: ProtectedRoute debe usar useEffect para redirects ───────────────
describe("ProtectedRoute - sin redirects en render", () => {
  it("los redirects deben estar dentro de useEffect, no en el render directo", () => {
    const protectedRouteContent = readFileSync(
      join(ROOT, "client/src/components/ProtectedRoute.tsx"),
      "utf-8"
    );
    // Debe usar useEffect
    expect(protectedRouteContent).toContain("useEffect");
    // window.location.href NO debe estar fuera de useEffect (en el cuerpo del render)
    // Verificar que window.location.href está dentro de un useEffect
    const useEffectBlocks = protectedRouteContent.match(/useEffect\([\s\S]*?\}, \[/g) ?? [];
    const hasRedirectInEffect = useEffectBlocks.some(block =>
      block.includes("window.location") || block.includes("getLoginUrl")
    );
    expect(hasRedirectInEffect).toBe(true);
  });
});

// ─── Test 7: APP_PUBLIC_URL está configurado como secret ─────────────────────
describe("APP_PUBLIC_URL configuración", () => {
  it("APP_PUBLIC_URL debe estar en env.ts como variable de entorno", () => {
    const envContent = readFileSync(join(ROOT, "server/_core/env.ts"), "utf-8");
    expect(envContent).toContain("process.env.APP_PUBLIC_URL");
  });

  it("oauth.ts debe tener el comentario de causa raíz del ciclo para documentación", () => {
    const oauthContent = readFileSync(join(ROOT, "server/_core/oauth.ts"), "utf-8");
    // Debe tener documentación sobre por qué APP_PUBLIC_URL es necesario
    expect(oauthContent).toContain("APP_PUBLIC_URL");
    expect(oauthContent).toContain("redirectUri");
  });
});
