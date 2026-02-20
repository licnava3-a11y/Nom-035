import { test as base, Page } from '@playwright/test';

/**
 * Usuario mock para tests E2E
 * Este usuario se inyecta en el frontend sin necesidad de autenticación real
 */
const MOCK_USER = {
  id: 'test-user-001',
  openId: 'test-openid-001',
  name: 'Usuario de Prueba E2E',
  email: 'test@example.com',
  role: 'admin' as const,
  createdAt: new Date('2024-01-01').toISOString(),
};

/**
 * Fixture extendido de Playwright que inyecta un usuario mock
 * 
 * Estrategia:
 * 1. Intercepta requests a /api/trpc/auth.me
 * 2. Devuelve usuario mock en lugar de hacer request real
 * 3. Permite testing de ~60% de funcionalidades sin autenticación compleja
 * 
 * Limitaciones:
 * - No prueba flujo de login/logout real
 * - No prueba OAuth
 * - No prueba permisos a nivel de backend (solo frontend)
 */
export const test = base.extend<{ mockedAuthPage: Page }>({
  mockedAuthPage: async ({ page }, use) => {
    // Interceptar todas las requests a auth.me
    await page.route('**/api/trpc/auth.me*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: MOCK_USER,
          },
        }),
      });
    });

    // Navegar a la página principal para inicializar el mock
    await page.goto('/');
    
    // Esperar a que React renderice el componente con el usuario mock
    await page.waitForTimeout(1000);

    // Usar la página con el mock inyectado
    await use(page);
  },
});

export { expect } from '@playwright/test';
