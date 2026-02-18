import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para tests E2E
 * Enfocado en validación de protección CSRF en formularios críticos
 */
export default defineConfig({
  testDir: './e2e',
  
  // Timeout por test (30 segundos)
  timeout: 30 * 1000,
  
  // Configuración de expect
  expect: {
    timeout: 5000,
  },
  
  // Ejecutar tests en paralelo
  fullyParallel: true,
  
  // Fallar en CI si quedan tests .only
  forbidOnly: !!process.env.CI,
  
  // Reintentos en CI
  retries: process.env.CI ? 2 : 0,
  
  // Workers en paralelo
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],
  
  // Configuración compartida para todos los proyectos
  use: {
    // URL base de la aplicación
    baseURL: 'http://localhost:3000',
    
    // Capturar screenshots solo en fallos
    screenshot: 'only-on-failure',
    
    // Capturar videos solo en fallos
    video: 'retain-on-failure',
    
    // Trace solo en retry
    trace: 'on-first-retry',
  },
  
  // Configurar proyectos para diferentes navegadores
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    
    // Tests en móvil
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  
  // Servidor de desarrollo
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
