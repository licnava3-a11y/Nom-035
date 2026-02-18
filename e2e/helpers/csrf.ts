import { Page } from '@playwright/test';

/**
 * Helpers para manipulación de tokens CSRF en tests E2E
 */

/**
 * Obtener el token CSRF actual del navegador
 */
export async function getCSRFToken(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    // Acceder a la variable global csrfToken definida en main.tsx
    return (window as any).csrfToken || null;
  });
}

/**
 * Interceptar y remover el header CSRF de todas las requests
 * Útil para simular ataques CSRF
 */
export async function removeCSRFHeader(page: Page) {
  await page.route('**/api/trpc/**', async (route) => {
    const headers = route.request().headers();
    delete headers['x-csrf-token'];
    
    await route.continue({ headers });
  });
}

/**
 * Interceptar y modificar el token CSRF para simular token inválido
 */
export async function invalidateCSRFToken(page: Page) {
  await page.route('**/api/trpc/**', async (route) => {
    const headers = route.request().headers();
    headers['x-csrf-token'] = 'invalid-token-12345678';
    
    await route.continue({ headers });
  });
}

/**
 * Esperar a que el token CSRF se cargue en el navegador
 */
export async function waitForCSRFToken(page: Page, timeout: number = 5000): Promise<string> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    const token = await getCSRFToken(page);
    if (token) {
      return token;
    }
    await page.waitForTimeout(100);
  }
  
  throw new Error('CSRF token not loaded within timeout');
}

/**
 * Verificar que una request incluya el header CSRF
 */
export async function verifyCSRFHeaderPresent(page: Page, urlPattern: string): Promise<boolean> {
  return new Promise((resolve) => {
    page.on('request', (request) => {
      if (request.url().includes(urlPattern)) {
        const headers = request.headers();
        resolve('x-csrf-token' in headers);
      }
    });
  });
}
