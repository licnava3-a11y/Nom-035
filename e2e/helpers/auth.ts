import { Page } from '@playwright/test';

/**
 * Helper para autenticación en tests E2E
 * Simula el flujo de login de Manus OAuth
 */

export interface TestUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
}

/**
 * Usuario de prueba para tests E2E
 */
export const TEST_USER: TestUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
};

/**
 * Autenticar usuario en la aplicación
 * 
 * NOTA: Este helper asume que existe un endpoint de test
 * para bypass de OAuth en desarrollo. En producción, este
 * endpoint debe estar deshabilitado.
 */
export async function login(page: Page, user: TestUser = TEST_USER) {
  // Navegar a la página de login de test
  await page.goto('/api/test/login');
  
  // Esperar a que la autenticación se complete
  await page.waitForURL('/', { timeout: 10000 });
  
  // Verificar que el usuario esté autenticado
  await page.waitForSelector('[data-testid="user-menu"]', { timeout: 5000 });
}

/**
 * Cerrar sesión del usuario
 */
export async function logout(page: Page) {
  // Hacer clic en el menú de usuario
  await page.click('[data-testid="user-menu"]');
  
  // Hacer clic en el botón de logout
  await page.click('[data-testid="logout-button"]');
  
  // Esperar redirección a login
  await page.waitForURL(/login/, { timeout: 5000 });
}

/**
 * Verificar que el usuario esté autenticado
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}
