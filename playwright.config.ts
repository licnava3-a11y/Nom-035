import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para testing multi-navegador
 * Prueba funcionalidades críticas en Chrome, Firefox y WebKit (Safari)
 * 
 * Para ejecutar:
 * - Todos los tests: pnpm exec playwright test
 * - Solo Chrome: pnpm exec playwright test --project=chromium
 * - Solo Firefox: pnpm exec playwright test --project=firefox
 * - Solo WebKit: pnpm exec playwright test --project=webkit
 * - Con UI: pnpm exec playwright test --ui
 * - Ver reporte: pnpm exec playwright show-report
 */
export default defineConfig({
  // Directorio de tests
  testDir: './tests/e2e',
  
  // Tiempo máximo por test
  timeout: 30 * 1000,
  
  // Configuración de expect
  expect: {
    timeout: 5000,
  },
  
  // Ejecutar tests en paralelo
  fullyParallel: true,
  
  // Fallar si hay tests con .only
  forbidOnly: !!process.env.CI,
  
  // Reintentos en CI
  retries: process.env.CI ? 2 : 0,
  
  // Workers en paralelo
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }],
  ],
  
  // Configuración compartida para todos los proyectos
  use: {
    // URL base de la aplicación
    baseURL: 'http://localhost:3000',
    
    // Capturar screenshots en fallos
    screenshot: 'only-on-failure',
    
    // Capturar video en fallos
    video: 'retain-on-failure',
    
    // Capturar trace en fallos
    trace: 'on-first-retry',
    
    // Timeout para acciones individuales
    actionTimeout: 10 * 1000,
    
    // Timeout para navegación
    navigationTimeout: 15 * 1000,
  },

  // Proyectos de testing multi-navegador
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 },
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
      },
    },

    // Tests en dispositivos móviles
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
      },
    },

    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
      },
    },

    // Tests en tablets
    {
      name: 'tablet',
      use: { 
        ...devices['iPad Pro'],
      },
    },
  ],

  // Servidor de desarrollo
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },
});
