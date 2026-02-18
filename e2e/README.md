# Tests End-to-End (E2E) con Playwright

Esta suite de tests E2E valida la protección CSRF implementada en la plataforma NOM-035, garantizando que todos los formularios críticos estén protegidos contra ataques Cross-Site Request Forgery.

---

## Estructura de Tests

La suite de tests está organizada en los siguientes archivos:

| Archivo | Descripción | Tests |
|---------|-------------|-------|
| `csrf-cases.spec.ts` | Validación de CSRF en formularios de casos NOM-035 | 7 tests |
| `csrf-token-renewal.spec.ts` | Validación de renovación automática de tokens | 7 tests |

**Total**: 14 tests E2E que cubren todos los escenarios críticos de protección CSRF.

---

## Configuración

### Requisitos Previos

Asegúrate de tener instaladas las dependencias de Playwright:

```bash
pnpm install
```

### Instalación de Navegadores

La primera vez que ejecutes los tests, Playwright descargará automáticamente los navegadores necesarios. Para instalarlos manualmente:

```bash
pnpm exec playwright install
```

---

## Ejecución de Tests

### Ejecutar Todos los Tests

```bash
pnpm test:e2e
```

### Ejecutar Tests en Modo UI (Interactivo)

```bash
pnpm test:e2e:ui
```

Este modo permite ver los tests ejecutándose en tiempo real y depurar interactivamente.

### Ejecutar Tests Específicos

```bash
# Solo tests de casos
pnpm exec playwright test csrf-cases

# Solo tests de renovación de tokens
pnpm exec playwright test csrf-token-renewal

# Un test específico por nombre
pnpm exec playwright test -g "debe rechazar creación de caso sin token CSRF"
```

### Ejecutar Tests en Navegador Específico

```bash
# Solo en Chromium
pnpm exec playwright test --project=chromium

# Solo en Firefox
pnpm exec playwright test --project=firefox

# Solo en WebKit (Safari)
pnpm exec playwright test --project=webkit
```

### Modo Debug

Para depurar tests paso a paso:

```bash
pnpm exec playwright test --debug
```

---

## Reportes

### Ver Reporte HTML

Después de ejecutar los tests, puedes ver un reporte HTML detallado:

```bash
pnpm exec playwright show-report
```

El reporte incluye:
- Screenshots de fallos
- Videos de tests fallidos
- Traces para debugging
- Tiempos de ejecución
- Logs detallados

### Ubicación de Reportes

| Tipo | Ubicación |
|------|-----------|
| Reporte HTML | `playwright-report/index.html` |
| Screenshots | `test-results/*/test-failed-*.png` |
| Videos | `test-results/*/video.webm` |
| Traces | `test-results/*/trace.zip` |

---

## Cobertura de Tests

### Tests de Formularios de Casos (`csrf-cases.spec.ts`)

1. **Rechazo sin token CSRF**: Verifica que las mutations sin token sean rechazadas con error 403
2. **Éxito con token válido**: Verifica que las mutations con token válido sean exitosas
3. **Rechazo con token inválido**: Verifica que los tokens manipulados sean rechazados
4. **Actualización de caso**: Verifica que las actualizaciones requieran token CSRF
5. **Rechazo de actualización sin token**: Verifica que las actualizaciones sin token fallen
6. **Asignación de caso**: Verifica que las asignaciones requieran token CSRF
7. **Múltiples mutations consecutivas**: Verifica que el mismo token pueda usarse múltiples veces

### Tests de Renovación de Tokens (`csrf-token-renewal.spec.ts`)

1. **Carga inicial de token**: Verifica que el token se cargue al iniciar la aplicación
2. **Persistencia durante navegación**: Verifica que el token se mantenga entre páginas
3. **Renovación automática**: Verifica que el token se renueve antes de expirar (50 min)
4. **Manejo de token expirado**: Verifica que los tokens expirados se renueven automáticamente
5. **Renovación manual**: Verifica que la renovación manual funcione correctamente
6. **Inclusión en headers**: Verifica que el token se incluya en todas las mutations
7. **Persistencia entre recargas**: Verifica que se genere un nuevo token al recargar

---

## Agregar Nuevos Tests

### Paso 1: Crear Archivo de Test

Crea un nuevo archivo en el directorio `e2e/` con el sufijo `.spec.ts`:

```typescript
// e2e/csrf-my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { removeCSRFHeader, waitForCSRFToken } from './helpers/csrf';

test.describe('CSRF Protection - My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto('/my-feature');
  });
  
  test('debe rechazar mutation sin token CSRF', async ({ page }) => {
    await removeCSRFHeader(page);
    
    // Tu código de test aquí
    
    await expect(page.locator('text=/CSRF|403/i')).toBeVisible();
  });
});
```

### Paso 2: Usar Helpers

Los helpers disponibles en `e2e/helpers/` simplifican la escritura de tests:

**Autenticación** (`auth.ts`):
```typescript
import { login, logout, isAuthenticated } from './helpers/auth';

// Login con usuario de prueba
await login(page);

// Logout
await logout(page);

// Verificar autenticación
const isAuth = await isAuthenticated(page);
```

**Manipulación de CSRF** (`csrf.ts`):
```typescript
import { 
  getCSRFToken, 
  removeCSRFHeader, 
  invalidateCSRFToken, 
  waitForCSRFToken 
} from './helpers/csrf';

// Obtener token actual
const token = await getCSRFToken(page);

// Remover header CSRF (simular ataque)
await removeCSRFHeader(page);

// Invalidar token (simular token corrupto)
await invalidateCSRFToken(page);

// Esperar a que el token se cargue
const token = await waitForCSRFToken(page, 5000);
```

### Paso 3: Ejecutar el Nuevo Test

```bash
pnpm exec playwright test csrf-my-feature
```

---

## Buenas Prácticas

### 1. Usar data-testid para Selectores

En lugar de selectores frágiles basados en clases CSS, usa `data-testid`:

```tsx
// En el componente React
<button data-testid="submit-button">Enviar</button>

// En el test
await page.click('[data-testid="submit-button"]');
```

### 2. Esperar a que los Elementos Estén Listos

Siempre espera a que los elementos estén visibles antes de interactuar:

```typescript
// ❌ Mal
await page.click('[data-testid="button"]');

// ✅ Bien
await page.waitForSelector('[data-testid="button"]', { state: 'visible' });
await page.click('[data-testid="button"]');

// ✅ Mejor (Playwright espera automáticamente)
await page.click('[data-testid="button"]'); // Playwright espera visibilidad
```

### 3. Limpiar Estado Entre Tests

Usa `beforeEach` para resetear el estado:

```typescript
test.beforeEach(async ({ page }) => {
  // Limpiar cookies/localStorage si es necesario
  await page.context().clearCookies();
  
  // Autenticar usuario
  await login(page);
  
  // Navegar a página inicial
  await page.goto('/');
});
```

### 4. Verificar Mensajes de Error

Usa expresiones regulares flexibles para verificar mensajes:

```typescript
// ✅ Flexible (funciona con variaciones del mensaje)
await expect(page.locator('text=/CSRF|Token|403|Forbidden/i')).toBeVisible();

// ❌ Frágil (falla si cambia el texto exacto)
await expect(page.locator('text=Token CSRF inválido')).toBeVisible();
```

### 5. Capturar Screenshots en Fallos

Playwright captura automáticamente screenshots en fallos, pero puedes hacerlo manualmente:

```typescript
test('mi test', async ({ page }) => {
  await page.screenshot({ path: 'debug-screenshot.png' });
});
```

---

## Troubleshooting

### Error: "Timeout waiting for selector"

**Causa**: El elemento no aparece en el tiempo esperado.

**Solución**:
```typescript
// Aumentar timeout
await page.waitForSelector('[data-testid="element"]', { timeout: 10000 });

// Verificar que la página haya cargado
await page.waitForLoadState('networkidle');
```

### Error: "Navigation timeout"

**Causa**: La página tarda demasiado en cargar.

**Solución**:
```typescript
// Aumentar timeout de navegación
await page.goto('/page', { timeout: 60000 });

// O configurar globalmente en playwright.config.ts
timeout: 60 * 1000,
```

### Error: "Element is not visible"

**Causa**: El elemento existe pero no es visible.

**Solución**:
```typescript
// Esperar a que sea visible
await page.waitForSelector('[data-testid="element"]', { state: 'visible' });

// O hacer scroll hasta el elemento
await page.locator('[data-testid="element"]').scrollIntoViewIfNeeded();
```

### Tests Fallan en CI pero Pasan Localmente

**Causas comunes**:
- Diferencias de timing (CI es más lento)
- Diferencias de resolución de pantalla
- Estado compartido entre tests

**Soluciones**:
```typescript
// Aumentar timeouts en CI
retries: process.env.CI ? 2 : 0,

// Ejecutar tests secuencialmente en CI
workers: process.env.CI ? 1 : undefined,

// Limpiar estado entre tests
test.beforeEach(async ({ page }) => {
  await page.context().clearCookies();
});
```

---

## Integración Continua (CI)

### GitHub Actions

Ejemplo de configuración para ejecutar tests E2E en GitHub Actions:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps
      
      - name: Run E2E tests
        run: pnpm test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Recursos Adicionales

- [Documentación oficial de Playwright](https://playwright.dev/)
- [Best Practices de Playwright](https://playwright.dev/docs/best-practices)
- [Documentación de CSRF Protection](../docs/CSRF_SECURITY.md)
- [Guía de tRPC Testing](https://trpc.io/docs/testing)

---

**Autor**: Verónica Nava Córdova  
**Última actualización**: Febrero 2026  
**Versión**: 1.0
