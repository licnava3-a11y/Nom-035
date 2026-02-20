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
  authenticatedPage: async ({ page, context }, use) => {
    // Navegar primero a la página para establecer el dominio
    await page.goto('/');
    
    // Llamar al endpoint de autenticación usando el contexto del navegador
    // Esto asegura que las cookies se compartan correctamente
    const response = await context.request.post('http://localhost:3000/api/test/auth/token', {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok()) {
      const body = await response.text();
      throw new Error(
        `Failed to authenticate test user. Status: ${response.status()}, Body: ${body}. Make sure TEST_MODE=true is set in environment.`
      );
    }

    const data = await response.json();
    console.log('[Test Auth] Authenticated as:', data.user.name);

    // Navegar al dashboard en lugar de reload para que las cookies persistan
    await page.goto('/dashboard');

    // Esperar a que la aplicación cargue
    await page.waitForLoadState('networkidle');

    // Esperar a que la query de autenticación se complete
    // El frontend hace un request a /api/trpc/auth.me para obtener el usuario
    await page.waitForResponse(
      response => response.url().includes('/api/trpc/auth.me') && response.status() === 200,
      { timeout: 10000 }
    );

    // Esperar un momento adicional para que React renderice el componente
    await page.waitForTimeout(1000);

    // Verificar que estamos autenticados
    // Buscar el nombre del usuario en el sidebar (DashboardLayout)
    await expect(page.locator('text=Usuario de Prueba E2E')).toBeVisible({ timeout: 5000 });

    await use(page);

    // Limpiar sesión después del test
    await context.request.post('http://localhost:3000/api/test/auth/logout');
  },
});

export { expect };
