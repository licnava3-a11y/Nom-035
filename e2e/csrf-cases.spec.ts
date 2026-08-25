import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";
import {
  removeCSRFHeader,
  invalidateCSRFToken,
  waitForCSRFToken,
} from "./helpers/csrf";

/**
 * Tests E2E para validar protección CSRF en formularios de casos NOM-035
 *
 * Estos tests verifican que:
 * 1. Las mutations sin token CSRF sean rechazadas con 403
 * 2. Las mutations con token válido sean exitosas
 * 3. Los tokens inválidos sean rechazados
 * 4. El manejo de errores funcione correctamente
 */

test.describe("CSRF Protection - Casos NOM-035", () => {
  test.beforeEach(async ({ page }) => {
    // Autenticar usuario antes de cada test
    await login(page);

    // Navegar a la página de gestión de casos
    await page.goto("/casos-gestion");

    // Esperar a que la página cargue completamente
    await page.waitForLoadState("networkidle");
  });

  test("debe rechazar creación de caso sin token CSRF", async ({ page }) => {
    // Interceptar y remover el header CSRF
    await removeCSRFHeader(page);

    // Intentar crear un caso
    await page.click('[data-testid="create-case-button"]');

    // Llenar formulario
    await page.fill('[name="reporterName"]', "Juan Pérez");
    await page.fill('[name="description"]', "Caso de prueba sin token CSRF");
    await page.selectOption('[name="departmentId"]', "1");
    await page.selectOption('[name="category"]', "harassment");

    // Enviar formulario
    await page.click('[data-testid="submit-case-button"]');

    // Verificar que se muestre error 403
    await expect(page.locator("text=/CSRF|Token|403|Forbidden/i")).toBeVisible({
      timeout: 5000,
    });

    // Verificar que el caso NO se haya creado
    const casesList = page.locator('[data-testid="cases-list"]');
    await expect(casesList).not.toContainText("Caso de prueba sin token CSRF");
  });

  test("debe permitir creación de caso con token CSRF válido", async ({
    page,
  }) => {
    // Esperar a que el token CSRF se cargue
    const token = await waitForCSRFToken(page);
    expect(token).toBeTruthy();
    expect(token.length).toBeGreaterThan(0);

    // Crear un caso
    await page.click('[data-testid="create-case-button"]');

    // Llenar formulario
    await page.fill('[name="reporterName"]', "María García");
    await page.fill(
      '[name="description"]',
      "Caso de prueba con token CSRF válido"
    );
    await page.selectOption('[name="departmentId"]', "2");
    await page.selectOption('[name="category"]', "discrimination");

    // Enviar formulario
    await page.click('[data-testid="submit-case-button"]');

    // Verificar mensaje de éxito
    await expect(
      page.locator("text=/creado exitosamente|success/i")
    ).toBeVisible({ timeout: 5000 });

    // Verificar que el caso aparezca en la lista
    await page.waitForTimeout(1000); // Esperar a que se actualice la lista
    const casesList = page.locator('[data-testid="cases-list"]');
    await expect(casesList).toContainText("María García");
  });

  test("debe rechazar creación de caso con token CSRF inválido", async ({
    page,
  }) => {
    // Interceptar y modificar el token CSRF
    await invalidateCSRFToken(page);

    // Intentar crear un caso
    await page.click('[data-testid="create-case-button"]');

    // Llenar formulario
    await page.fill('[name="reporterName"]', "Carlos López");
    await page.fill(
      '[name="description"]',
      "Caso de prueba con token inválido"
    );
    await page.selectOption('[name="departmentId"]', "1");
    await page.selectOption('[name="category"]', "violence");

    // Enviar formulario
    await page.click('[data-testid="submit-case-button"]');

    // Verificar que se muestre error 403
    await expect(page.locator("text=/CSRF|Token|403|inválido/i")).toBeVisible({
      timeout: 5000,
    });
  });

  test("debe actualizar caso existente con token CSRF válido", async ({
    page,
  }) => {
    // Esperar a que el token CSRF se cargue
    await waitForCSRFToken(page);

    // Seleccionar un caso existente
    const firstCase = page.locator('[data-testid="case-item"]').first();
    await firstCase.click();

    // Hacer clic en editar
    await page.click('[data-testid="edit-case-button"]');

    // Modificar descripción
    await page.fill(
      '[name="description"]',
      "Descripción actualizada con token CSRF"
    );

    // Guardar cambios
    await page.click('[data-testid="save-case-button"]');

    // Verificar mensaje de éxito
    await expect(
      page.locator("text=/actualizado exitosamente|success/i")
    ).toBeVisible({ timeout: 5000 });
  });

  test("debe rechazar actualización de caso sin token CSRF", async ({
    page,
  }) => {
    // Seleccionar un caso existente
    const firstCase = page.locator('[data-testid="case-item"]').first();
    await firstCase.click();

    // Hacer clic en editar
    await page.click('[data-testid="edit-case-button"]');

    // Interceptar y remover el header CSRF
    await removeCSRFHeader(page);

    // Modificar descripción
    await page.fill(
      '[name="description"]',
      "Intento de actualización sin token"
    );

    // Intentar guardar cambios
    await page.click('[data-testid="save-case-button"]');

    // Verificar que se muestre error 403
    await expect(page.locator("text=/CSRF|Token|403|Forbidden/i")).toBeVisible({
      timeout: 5000,
    });
  });

  test("debe asignar caso con token CSRF válido", async ({ page }) => {
    // Esperar a que el token CSRF se cargue
    await waitForCSRFToken(page);

    // Seleccionar un caso sin asignar
    const unassignedCase = page
      .locator('[data-testid="case-item"][data-status="open"]')
      .first();
    await unassignedCase.click();

    // Hacer clic en asignar
    await page.click('[data-testid="assign-case-button"]');

    // Seleccionar un usuario
    await page.selectOption('[name="assignedTo"]', "1");

    // Confirmar asignación
    await page.click('[data-testid="confirm-assign-button"]');

    // Verificar mensaje de éxito
    await expect(
      page.locator("text=/asignado exitosamente|success/i")
    ).toBeVisible({ timeout: 5000 });
  });

  test("debe manejar múltiples mutations consecutivas con mismo token", async ({
    page,
  }) => {
    // Esperar a que el token CSRF se cargue
    const initialToken = await waitForCSRFToken(page);

    // Crear primer caso
    await page.click('[data-testid="create-case-button"]');
    await page.fill('[name="reporterName"]', "Primer Caso");
    await page.fill('[name="description"]', "Descripción del primer caso");
    await page.selectOption('[name="departmentId"]', "1");
    await page.selectOption('[name="category"]', "harassment");
    await page.click('[data-testid="submit-case-button"]');
    await expect(page.locator("text=/creado exitosamente/i")).toBeVisible({
      timeout: 5000,
    });

    // Esperar un momento
    await page.waitForTimeout(500);

    // Verificar que el token no haya cambiado
    const tokenAfterFirst = await waitForCSRFToken(page);
    expect(tokenAfterFirst).toBe(initialToken);

    // Crear segundo caso con el mismo token
    await page.click('[data-testid="create-case-button"]');
    await page.fill('[name="reporterName"]', "Segundo Caso");
    await page.fill('[name="description"]', "Descripción del segundo caso");
    await page.selectOption('[name="departmentId"]', "2");
    await page.selectOption('[name="category"]', "discrimination");
    await page.click('[data-testid="submit-case-button"]');

    // Verificar que el segundo caso también se cree exitosamente
    await expect(page.locator("text=/creado exitosamente/i")).toBeVisible({
      timeout: 5000,
    });
  });
});
