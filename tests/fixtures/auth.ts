import { test as base, expect } from '@playwright/test';

/**
 * Fixture de autenticación para tests E2E
 * Utiliza el endpoint de bypass de autenticación del servidor
 * Requiere TEST_MODE=true en el servidor
 */

export interface AuthFixtures {
  authenticatedPage: any;
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Llamar al endpoint de autenticación de prueba
    const response = await page.request.post('http://localhost:3000/api/test/auth/token');
    
    if (!response.ok()) {
      throw new Error(
        'Failed to authenticate test user. Make sure TEST_MODE=true is set in environment.'
      );
    }

    const data = await response.json();
    console.log('[Test Auth] Authenticated as:', data.user.name);

    // Navegar a la página principal (ya autenticado por cookie)
    await page.goto('/');

    // Esperar a que la aplicación cargue
    await page.waitForLoadState('networkidle');

    // Verificar que estamos autenticados
    await expect(page.locator('text=Usuario de Prueba E2E')).toBeVisible({ timeout: 10000 });

    await use(page);

    // Limpiar sesión después del test
    await page.request.post('http://localhost:3000/api/test/auth/logout');
  },
});

export { expect };
