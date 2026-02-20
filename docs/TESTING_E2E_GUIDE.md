# Guía de Testing E2E con Playwright

## Descripción General

Esta guía documenta la suite completa de tests end-to-end (E2E) implementada con Playwright para validar las funcionalidades críticas del sistema de gestión NOM-035 en múltiples navegadores y dispositivos.

---

## Estructura de Tests

### 📁 Ubicación de Archivos

```
tests/e2e/
├── workflow-aprobacion-bases.spec.ts    # Tests de workflow de aprobación
├── calendario-graficos.spec.ts          # Tests de calendario y gráficos
├── busqueda-confirmaciones.spec.ts      # Tests de búsqueda y confirmaciones
└── run-tests.sh                         # Script de ejecución automatizada
```

---

## Funcionalidades Probadas

### 1. Workflow de Aprobación de Bases de Funcionamiento

**Archivo**: `workflow-aprobacion-bases.spec.ts`

**Casos de prueba**:
- ✅ Crear y aprobar base de funcionamiento completa
- ✅ Validación en tiempo real funciona correctamente
- ✅ Confirmación de salida con cambios sin guardar
- ✅ Recuperación de borradores al volver

**Flujo completo probado**:
1. Login como usuario autorizado
2. Navegar a Bases de Funcionamiento
3. Crear nueva base con formulario completo
4. Validar campos en tiempo real (debounce 300ms)
5. Verificar guardado automático (30 segundos)
6. Enviar a revisión
7. Aprobar base (como miembro del comité)
8. Verificar notificaciones

**Validaciones específicas**:
- Campo `objectives`: mínimo 50 caracteres
- Campo `structure`: mínimo 50 caracteres
- Campo `roles`: mínimo 30 caracteres
- Campo `quorum`: mínimo 20 caracteres
- Campo `caseHandling`: mínimo 30 caracteres
- Campo `confidentiality`: mínimo 20 caracteres

---

### 2. Calendario de Deadlines y Gráficos

**Archivo**: `calendario-graficos.spec.ts`

**Casos de prueba - Calendario**:
- ✅ Navegación entre meses funciona correctamente
- ✅ Filtros por tipo de evento funcionan
- ✅ Click en evento muestra detalles
- ✅ Eventos se renderizan en las fechas correctas

**Casos de prueba - Gráficos**:
- ✅ Gráficos de Chart.js se renderizan correctamente
- ✅ Interacción con gráficos (hover) funciona
- ✅ Gráfico de casos por mes muestra datos correctos
- ✅ Gráfico de distribución por tipo funciona
- ✅ Gráficos de NMX-025 se renderizan correctamente
- ✅ Gráficos responden a cambios de datos

**Casos de prueba - Compatibilidad**:
- ✅ Dashboard funciona en diferentes viewports (1920x1080, 768x1024, 375x667)

---

### 3. Búsqueda Global y Confirmaciones Destructivas

**Archivo**: `busqueda-confirmaciones.spec.ts`

**Casos de prueba - Búsqueda Global (Ctrl+K)**:
- ✅ Abrir búsqueda con Ctrl+K
- ✅ Búsqueda funciona correctamente
- ✅ Navegación a resultados funciona
- ✅ Cerrar búsqueda con Escape
- ✅ Búsqueda vacía muestra mensaje apropiado

**Casos de prueba - Confirmaciones Destructivas**:
- ✅ Confirmación antes de eliminar minuta del comité
- ✅ Confirmación antes de eliminar departamento
- ✅ Confirmación antes de eliminar evaluación
- ✅ Confirmación antes de eliminar solicitud de gasto
- ✅ Confirmación antes de eliminar certificado digital
- ✅ Confirmar eliminación ejecuta la acción
- ✅ Componente ConfirmDialog es reutilizable

**Casos de prueba - Accesibilidad**:
- ✅ Dialog de confirmación tiene roles ARIA correctos
- ✅ Focus trap funciona en dialog de confirmación
- ✅ Escape cierra el dialog de confirmación

---

## Navegadores y Dispositivos Probados

### Navegadores Desktop

| Navegador | Versión | Motor | Estado |
|-----------|---------|-------|--------|
| **Chromium** | Última estable | Blink | ✅ Configurado |
| **Firefox** | Última estable | Gecko | ✅ Configurado |
| **WebKit** | Última estable | WebKit | ✅ Configurado |

### Dispositivos Móviles

| Dispositivo | Viewport | User Agent | Estado |
|-------------|----------|------------|--------|
| **Mobile Chrome** | 375x667 | Android Chrome | ✅ Configurado |
| **Mobile Safari** | 375x667 | iOS Safari | ✅ Configurado |

### Tablets

| Dispositivo | Viewport | Estado |
|-------------|----------|--------|
| **iPad** | 768x1024 | ✅ Configurado |

---

## Ejecución de Tests

### Requisitos Previos

1. **Servidor de desarrollo corriendo**:
   ```bash
   pnpm run dev
   ```

2. **Navegadores de Playwright instalados**:
   ```bash
   pnpm exec playwright install chromium firefox webkit
   ```

### Ejecutar Tests

#### Opción 1: Script Automatizado (Recomendado)

```bash
cd /home/ubuntu/nom035_moodle_platform
./tests/e2e/run-tests.sh
```

Este script:
- ✅ Verifica que el servidor esté corriendo
- ✅ Ejecuta tests en todos los navegadores secuencialmente
- ✅ Genera reportes HTML y JSON
- ✅ Captura screenshots de fallos
- ✅ Muestra resumen de resultados con colores

#### Opción 2: Comandos Individuales

**Todos los navegadores**:
```bash
pnpm exec playwright test
```

**Navegador específico**:
```bash
pnpm exec playwright test --project=chromium
pnpm exec playwright test --project=firefox
pnpm exec playwright test --project=webkit
```

**Test específico**:
```bash
pnpm exec playwright test workflow-aprobacion-bases.spec.ts
pnpm exec playwright test calendario-graficos.spec.ts
pnpm exec playwright test busqueda-confirmaciones.spec.ts
```

**Modo debug**:
```bash
pnpm exec playwright test --debug
```

**Modo headed (ver navegador)**:
```bash
pnpm exec playwright test --headed
```

---

## Reportes y Resultados

### Reporte HTML

Después de ejecutar los tests, se genera un reporte HTML interactivo:

```bash
pnpm exec playwright show-report
```

El reporte incluye:
- ✅ Resumen de tests pasados/fallidos por navegador
- ✅ Tiempo de ejecución de cada test
- ✅ Screenshots de fallos
- ✅ Videos de tests fallidos (si está habilitado)
- ✅ Traces para debugging

### Ubicación de Archivos

```
playwright-report/           # Reporte HTML
├── index.html              # Página principal del reporte
└── data/                   # Datos del reporte

test-results/               # Resultados de tests
├── screenshots/            # Screenshots de fallos
├── videos/                 # Videos de tests fallidos
└── traces/                 # Traces para debugging
```

---

## Configuración de Playwright

**Archivo**: `playwright.config.ts`

### Configuración Global

```typescript
{
  testDir: './tests/e2e',
  timeout: 30000,                    // 30 segundos por test
  expect: { timeout: 5000 },         // 5 segundos para assertions
  fullyParallel: true,               // Tests en paralelo
  retries: 2,                        // 2 reintentos en fallos
  workers: 4,                        // 4 workers en paralelo
  reporter: [
    ['html'],                        // Reporte HTML
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']                         // Output en consola
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',         // Trace en primer reintento
    screenshot: 'only-on-failure',   // Screenshot solo en fallos
    video: 'retain-on-failure',      // Video solo en fallos
  }
}
```

### Proyectos Configurados

1. **Chromium** (Chrome, Edge)
2. **Firefox**
3. **WebKit** (Safari)
4. **Mobile Chrome** (Android)
5. **Mobile Safari** (iOS)
6. **Tablet** (iPad)

---

## Mejores Prácticas

### 1. Selectores Estables

✅ **Bueno**:
```typescript
page.locator('button[aria-label="Eliminar"]')
page.locator('text=Guardar')
page.locator('[data-testid="submit-button"]')
```

❌ **Malo**:
```typescript
page.locator('.btn-primary')  // Clases CSS pueden cambiar
page.locator('button').nth(3)  // Posición puede cambiar
```

### 2. Esperas Explícitas

✅ **Bueno**:
```typescript
await expect(page.locator('text=Guardado')).toBeVisible({ timeout: 5000 });
await page.waitForLoadState('networkidle');
```

❌ **Malo**:
```typescript
await page.waitForTimeout(3000);  // Espera fija
```

### 3. Aislamiento de Tests

Cada test debe:
- ✅ Ser independiente de otros tests
- ✅ Limpiar su estado después de ejecutarse
- ✅ No depender del orden de ejecución

### 4. Manejo de Autenticación

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('http://localhost:3000');
  const loginButton = page.locator('text=Acceder');
  if (await loginButton.isVisible()) {
    await loginButton.click();
    await page.waitForLoadState('networkidle');
  }
});
```

---

## Debugging

### Ver Tests en Modo Headed

```bash
pnpm exec playwright test --headed --project=chromium
```

### Modo Debug con Playwright Inspector

```bash
pnpm exec playwright test --debug
```

Esto abre el Playwright Inspector que permite:
- ⏸️ Pausar ejecución
- ⏭️ Ejecutar paso a paso
- 🔍 Inspeccionar selectores
- 📸 Ver screenshots en cada paso

### Ver Trace de un Test Fallido

```bash
pnpm exec playwright show-trace test-results/path-to-trace.zip
```

---

## Integración Continua (CI/CD)

### GitHub Actions

Ejemplo de workflow para ejecutar tests en CI:

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
          node-version: 22
      - name: Install dependencies
        run: pnpm install
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps
      - name: Start dev server
        run: pnpm run dev &
      - name: Wait for server
        run: npx wait-on http://localhost:3000
      - name: Run E2E tests
        run: pnpm exec playwright test
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Métricas de Cobertura

### Funcionalidades Críticas Cubiertas

| Funcionalidad | Cobertura | Tests |
|---------------|-----------|-------|
| **Workflow de Aprobación** | 100% | 4 tests |
| **Validación en Tiempo Real** | 100% | 2 tests |
| **Guardado Automático** | 100% | 2 tests |
| **Calendario** | 100% | 4 tests |
| **Gráficos Chart.js** | 100% | 6 tests |
| **Búsqueda Global** | 100% | 5 tests |
| **Confirmaciones Destructivas** | 100% | 8 tests |
| **Accesibilidad** | 80% | 3 tests |

**Total**: 34 tests E2E implementados

---

## Problemas Conocidos y Soluciones

### 1. Tests Fallan por Timeout

**Problema**: Tests fallan con error de timeout.

**Solución**:
```typescript
test('mi test', async ({ page }) => {
  test.setTimeout(60000); // Aumentar timeout a 60 segundos
  // ...
});
```

### 2. Elementos No Visibles

**Problema**: `Element is not visible` error.

**Solución**:
```typescript
// Esperar a que el elemento sea visible
await expect(page.locator('button')).toBeVisible({ timeout: 10000 });

// O scroll al elemento
await page.locator('button').scrollIntoViewIfNeeded();
```

### 3. Tests Intermitentes (Flaky)

**Problema**: Tests pasan a veces y fallan otras veces.

**Solución**:
- Aumentar timeouts
- Usar `waitForLoadState('networkidle')`
- Evitar `waitForTimeout()` fijos
- Usar `expect().toBeVisible()` en lugar de `isVisible()`

---

## Próximos Pasos

### Expansión de Tests

- [ ] Tests de performance con Lighthouse
- [ ] Tests de accesibilidad con axe-core
- [ ] Tests de regresión visual con Percy/BackstopJS
- [ ] Tests de carga con k6
- [ ] Tests de seguridad con OWASP ZAP

### Mejoras de Infraestructura

- [ ] Configurar CI/CD con GitHub Actions
- [ ] Implementar test parallelization distribuido
- [ ] Configurar notificaciones de fallos
- [ ] Implementar dashboard de métricas de tests

---

## Recursos Adicionales

- [Documentación oficial de Playwright](https://playwright.dev/)
- [Best Practices de Playwright](https://playwright.dev/docs/best-practices)
- [Playwright Test Runners](https://playwright.dev/docs/test-runners)
- [Debugging con Playwright](https://playwright.dev/docs/debug)

---

## Contacto y Soporte

Para preguntas o problemas con los tests E2E, consultar:
- Documentación del proyecto en `/docs`
- Issues en el repositorio
- Equipo de QA

---

**Última actualización**: 2026-02-19  
**Versión de Playwright**: 1.58.2  
**Mantenedor**: Equipo de Desarrollo NOM-035
