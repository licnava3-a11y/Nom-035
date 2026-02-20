# Estrategia Simplificada de Testing E2E

## Resumen Ejecutivo

Después de 8 sesiones de depuración del sistema complejo de bypass de autenticación para tests E2E, se propone una estrategia simplificada que prioriza pragmatismo y mantenibilidad sobre perfección técnica.

---

## Problemas Identificados con Enfoque Actual

### 1. Complejidad Excesiva
- Sistema de bypass con `TEST_MODE=true`
- Endpoints especiales `/api/test/auth/token`
- Middleware condicional según environment
- Gestión compleja de cookies entre contexts

### 2. Problemas Técnicos Persistentes
- Cookies no persisten después de navegación
- `context.request.post()` no comparte cookies con browser
- Timeouts en tests (>2 minutos)
- Dificultad para depurar problemas de autenticación

### 3. ROI Negativo
- **Tiempo invertido**: 12-14 horas
- **Tests funcionando**: 0/180
- **Funcionalidad del sistema**: 100% operacional sin tests

---

## Estrategia Simplificada Propuesta

### Opción 1: Tests Sin Autenticación (Recomendado)

**Concepto**: Probar funcionalidades públicas y flujos sin autenticación.

**Implementación**:
```typescript
// tests/e2e/public-flows.spec.ts
test('Landing page loads correctly', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Plataforma NOM-035');
});

test('Login page is accessible', async ({ page }) => {
  await page.goto('/');
  await page.click('text=Iniciar Sesión');
  await expect(page).toHaveURL(/.*oauth/);
});
```

**Ventajas**:
- ✅ Simple y mantenible
- ✅ No requiere autenticación compleja
- ✅ Tests rápidos (<10 segundos)
- ✅ Fácil depuración

**Desventajas**:
- ❌ No prueba flujos autenticados
- ❌ Cobertura limitada (~20% del sistema)

---

### Opción 2: Mock de Usuario en Frontend

**Concepto**: Inyectar usuario mock directamente en el contexto de React.

**Implementación**:
```typescript
// tests/fixtures/mock-auth.ts
export const mockAuthFixture = test.extend({
  page: async ({ page }, use) => {
    // Interceptar request a /api/trpc/auth.me
    await page.route('**/api/trpc/auth.me**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          result: {
            data: {
              id: 1,
              name: 'Usuario de Prueba E2E',
              email: 'test@example.com',
              role: 'admin'
            }
          }
        })
      });
    });
    
    await use(page);
  },
});

// tests/e2e/authenticated-flows.spec.ts
mockAuthFixture('Dashboard loads with mock user', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('text=Usuario de Prueba E2E')).toBeVisible();
});
```

**Ventajas**:
- ✅ No requiere backend de testing
- ✅ Tests rápidos
- ✅ Fácil configuración
- ✅ Cobertura media (~60% del sistema)

**Desventajas**:
- ❌ No prueba autenticación real
- ❌ Puede divergir del comportamiento real

---

### Opción 3: Usuario de Prueba Real (Manual)

**Concepto**: Crear usuario de prueba en BD y autenticarse manualmente una vez.

**Implementación**:
```sql
-- Crear usuario de prueba en BD
INSERT INTO users (name, email, open_id, role, created_at)
VALUES ('E2E Test User', 'e2e@test.com', 'test-open-id', 'admin', NOW());
```

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    storageState: 'tests/auth-state.json', // Reusar sesión
  },
});

// tests/setup/auth.setup.ts
test('authenticate', async ({ page }) => {
  // Login manual una vez, guardar cookies
  await page.goto('/');
  // ... proceso de login manual ...
  await page.context().storageState({ path: 'tests/auth-state.json' });
});
```

**Ventajas**:
- ✅ Autenticación real
- ✅ Cobertura completa (100%)
- ✅ Comportamiento idéntico a producción

**Desventajas**:
- ❌ Requiere login manual inicial
- ❌ Sesión puede expirar
- ❌ Más complejo de mantener

---

## Recomendación Final

**Implementar Opción 2 (Mock de Usuario en Frontend)** por las siguientes razones:

1. **Balance óptimo**: Cobertura media (~60%) con complejidad baja
2. **Mantenibilidad**: Código simple y fácil de depurar
3. **Velocidad**: Tests rápidos (<30 segundos por suite)
4. **Pragmatismo**: Prioriza valor sobre perfección técnica

---

## Plan de Implementación (2-3 horas)

### Fase 1: Crear Fixture de Mock (30 min)
```bash
# Crear archivo de fixture
touch tests/fixtures/mock-auth.ts

# Implementar interceptor de /api/trpc/auth.me
# Configurar usuario mock con datos realistas
```

### Fase 2: Migrar Tests Existentes (1 hora)
```bash
# Reemplazar authenticatedPage con mockAuthFixture
# Eliminar código de bypass de autenticación
# Simplificar configuración de Playwright
```

### Fase 3: Ejecutar y Validar (30 min)
```bash
# Ejecutar suite completa
pnpm test:e2e

# Generar reporte HTML
# Documentar cobertura
```

### Fase 4: Limpieza (30 min)
```bash
# Eliminar archivos obsoletos:
# - server/_core/test-auth.ts
# - tests/fixtures/auth.ts (viejo)
# - Código de TEST_MODE en server/_core/index.ts

# Actualizar documentación
```

---

## Métricas de Éxito

- ✅ 180 tests ejecutándose en <5 minutos
- ✅ Tasa de éxito >90%
- ✅ Cobertura de flujos críticos (dashboard, búsqueda, CRUD)
- ✅ Mantenibilidad: <1 hora/mes de mantenimiento

---

## Conclusión

La estrategia simplificada prioriza **valor práctico sobre perfección técnica**. El sistema está 100% funcional en producción, y los tests E2E son una herramienta de desarrollo, no un requisito crítico.

**Próximo paso**: Implementar Opción 2 en próxima sesión dedicada (2-3 horas).
