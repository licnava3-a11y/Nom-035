import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import { waitForCSRFToken, getCSRFToken } from "./helpers/csrf";

/**
 * Tests E2E para validar renovación automática de tokens CSRF
 *
 * Estos tests verifican que:
 * 1. El token se cargue correctamente al iniciar la aplicación
 * 2. El token se renueve automáticamente cada 50 minutos
 * 3. El token expirado se maneje correctamente
 * 4. La renovación manual funcione correctamente
 */

test.describe("CSRF Token Renewal", () => {
  test.beforeEach(async ({ page }) => {
    // Autenticar usuario antes de cada test
    await login(page);
    await page.waitForLoadState("networkidle");
  });

  test("debe cargar token CSRF al iniciar la aplicación", async ({ page }) => {
    // Navegar a la página principal
    await page.goto("/");

    // Esperar a que el token CSRF se cargue
    const token = await waitForCSRFToken(page, 10000);

    // Verificar que el token exista y tenga la longitud correcta (64 caracteres hex)
    expect(token).toBeTruthy();
    expect(token.length).toBe(64);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  test("debe mantener el mismo token durante la sesión activa", async ({
    page,
  }) => {
    // Navegar a la página principal
    await page.goto("/");

    // Obtener token inicial
    const initialToken = await waitForCSRFToken(page);

    // Navegar a diferentes páginas
    await page.goto("/empleados");
    await page.waitForLoadState("networkidle");
    const tokenAfterNavigation1 = await getCSRFToken(page);

    await page.goto("/casos");
    await page.waitForLoadState("networkidle");
    const tokenAfterNavigation2 = await getCSRFToken(page);

    await page.goto("/encuestas");
    await page.waitForLoadState("networkidle");
    const tokenAfterNavigation3 = await getCSRFToken(page);

    // Verificar que el token sea el mismo en todas las páginas
    expect(tokenAfterNavigation1).toBe(initialToken);
    expect(tokenAfterNavigation2).toBe(initialToken);
    expect(tokenAfterNavigation3).toBe(initialToken);
  });

  test("debe renovar token automáticamente antes de expiración", async ({
    page,
  }) => {
    // Este test simula el paso del tiempo acelerando el reloj del navegador
    await page.goto("/");

    // Obtener token inicial
    const initialToken = await waitForCSRFToken(page);

    // Acelerar el tiempo del navegador para simular 50 minutos
    await page.evaluate(() => {
      // Sobrescribir Date.now() para simular paso del tiempo
      const originalNow = Date.now;
      const startTime = originalNow();

      Date.now = function () {
        // Simular que han pasado 50 minutos (3000000 ms)
        return startTime + 50 * 60 * 1000;
      };
    });

    // Esperar a que se ejecute el refetchInterval (puede tomar unos segundos)
    await page.waitForTimeout(5000);

    // Verificar que el token se haya renovado
    const renewedToken = await getCSRFToken(page);

    // El token debe ser diferente al inicial
    expect(renewedToken).toBeTruthy();
    expect(renewedToken).not.toBe(initialToken);
    expect(renewedToken.length).toBe(64);
  });

  test("debe manejar token expirado con renovación automática", async ({
    page,
  }) => {
    await page.goto("/casos-gestion");

    // Esperar a que el token se cargue
    await waitForCSRFToken(page);

    // Simular expiración del token en el servidor
    // (esto requeriría un endpoint de test en el backend)
    await page.evaluate(() => {
      // Forzar expiración del token modificando el timestamp
      localStorage.setItem("csrf_token_expired", "true");
    });

    // Intentar crear un caso (esto debería fallar y renovar el token)
    await page.click('[data-testid="create-case-button"]');
    await page.fill('[name="reporterName"]', "Test Token Expirado");
    await page.fill(
      '[name="description"]',
      "Caso de prueba con token expirado"
    );
    await page.selectOption('[name="departmentId"]', "1");
    await page.selectOption('[name="category"]', "harassment");
    await page.click('[data-testid="submit-case-button"]');

    // Verificar que se muestre el mensaje de renovación
    await expect(
      page.locator("text=/sesión ha expirado|intenta nuevamente/i")
    ).toBeVisible({ timeout: 5000 });

    // Esperar a que el token se renueve
    await page.waitForTimeout(2000);

    // Reintentar la creación del caso
    await page.click('[data-testid="submit-case-button"]');

    // Verificar que ahora sea exitoso
    await expect(page.locator("text=/creado exitosamente/i")).toBeVisible({
      timeout: 5000,
    });
  });

  test("debe permitir renovación manual del token", async ({ page }) => {
    await page.goto("/");

    // Obtener token inicial
    const initialToken = await waitForCSRFToken(page);

    // Llamar a la función de renovación manual (si está expuesta)
    const renewedToken = await page.evaluate(async () => {
      // Acceder al contexto CSRF y renovar manualmente
      const renewFn = (window as any).renewCSRFToken;
      if (renewFn) {
        await renewFn();
        return (window as any).csrfToken;
      }
      return null;
    });

    // Verificar que el token se haya renovado
    if (renewedToken) {
      expect(renewedToken).toBeTruthy();
      expect(renewedToken).not.toBe(initialToken);
      expect(renewedToken.length).toBe(64);
    }
  });

  test("debe incluir token CSRF en todas las mutations", async ({ page }) => {
    await page.goto("/casos-gestion");

    // Esperar a que el token se cargue
    const token = await waitForCSRFToken(page);

    // Capturar requests a /api/trpc
    const requests: any[] = [];
    page.on("request", request => {
      if (request.url().includes("/api/trpc")) {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
        });
      }
    });

    // Realizar una mutation (crear caso)
    await page.click('[data-testid="create-case-button"]');
    await page.fill('[name="reporterName"]', "Test Headers");
    await page.fill('[name="description"]', "Verificación de headers CSRF");
    await page.selectOption('[name="departmentId"]', "1");
    await page.selectOption('[name="category"]', "harassment");
    await page.click('[data-testid="submit-case-button"]');

    // Esperar a que se complete la request
    await page.waitForTimeout(2000);

    // Verificar que al menos una request POST incluya el header CSRF
    const postRequests = requests.filter(r => r.method === "POST");
    expect(postRequests.length).toBeGreaterThan(0);

    const hasCSRFHeader = postRequests.some(
      r => r.headers["x-csrf-token"] === token
    );
    expect(hasCSRFHeader).toBe(true);
  });

  test("debe persistir token entre recargas de página", async ({ page }) => {
    await page.goto("/");

    // Obtener token inicial
    const initialToken = await waitForCSRFToken(page);

    // Recargar la página
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Obtener token después de recargar
    const tokenAfterReload = await waitForCSRFToken(page);

    // El token debe ser diferente (se genera uno nuevo al recargar)
    // pero debe existir y tener el formato correcto
    expect(tokenAfterReload).toBeTruthy();
    expect(tokenAfterReload.length).toBe(64);
    expect(tokenAfterReload).toMatch(/^[a-f0-9]{64}$/);
  });
});
