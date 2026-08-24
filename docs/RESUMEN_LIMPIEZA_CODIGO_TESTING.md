# Resumen de Limpieza de Código Obsoleto de Testing

**Fecha**: 20 de febrero de 2026  
**Sesión**: 11

---

## Objetivo

Eliminar todo el código obsoleto relacionado con testing E2E para simplificar la base de código y reducir complejidad innecesaria.

---

## Archivos Eliminados

### 1. Sistema de Bypass de Autenticación

- **`server/_core/test-auth.ts`** (2,373 bytes)
  - Sistema complejo de bypass de autenticación con TEST_MODE
  - Endpoints `/api/test/auth/token` y `/api/test/auth/logout`
  - Middleware de bypass de autenticación
  - **Razón**: Nunca funcionó correctamente, añadía complejidad innecesaria

### 2. Fixtures de Autenticación Obsoletos

- **`tests/fixtures/auth.ts`** (2,136 bytes)
  - Fixture antiguo con sistema de cookies
  - Usaba `context.request.post()` que no compartía cookies
  - **Razón**: Reemplazado por mock-auth.ts (que tampoco funcionó)

- **`tests/fixtures/mock-auth.ts`** (1,557 bytes)
  - Fixture de mock que intercepta `/api/trpc/auth.me`
  - Timing issue: interceptor se configuraba después de navegar
  - **Razón**: No funcional, añadía complejidad sin beneficio

---

## Código Limpiado en Archivos Existentes

### 1. `server/_core/index.ts`

**Líneas eliminadas**: 45, 105-120

```typescript
// ❌ ELIMINADO: Import obsoleto
import {
  testAuthBypass,
  createTestAuthEndpoint,
  createTestLogoutEndpoint,
} from "./test-auth";

// ❌ ELIMINADO: Logging y endpoints de TEST_MODE
console.log(
  "[SERVER INIT] TEST_MODE environment variable:",
  process.env.TEST_MODE
);
console.log(
  "[SERVER INIT] All environment variables:",
  Object.keys(process.env).filter(k => k.includes("TEST"))
);

if (process.env.TEST_MODE === "true") {
  console.log("[TEST MODE] ✅ Test authentication endpoints ENABLED");
  console.log("[TEST MODE] Registering POST /api/test/auth/token");
  console.log("[TEST MODE] Registering POST /api/test/auth/logout");
  app.post("/api/test/auth/token", createTestAuthEndpoint());
  app.post("/api/test/auth/logout", createTestLogoutEndpoint());
  app.use(testAuthBypass);
  console.log("[TEST MODE] Test auth bypass middleware applied");
} else {
  console.log(
    "[SERVER INIT] ⚠️ TEST_MODE is NOT enabled (value:",
    process.env.TEST_MODE,
    ")"
  );
}
```

### 2. `playwright.config.ts`

**Líneas modificadas**: 117-126

```typescript
// ❌ ANTES: Configuración compleja con TEST_MODE
webServer: {
  command: 'TEST_MODE=true pnpm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: false, // Deshabilitado para forzar TEST_MODE=true
  timeout: 120 * 1000,
  env: {
    TEST_MODE: 'true',
  },
},

// ✅ DESPUÉS: Configuración simplificada
webServer: {
  command: 'pnpm run dev',
  url: 'http://localhost:3000',
  reuseExistingServer: true,
  timeout: 120 * 1000,
},
```

---

## Impacto

### Código Eliminado

- **3 archivos** eliminados (5,066 bytes total)
- **~40 líneas** de código de servidor eliminadas
- **~10 líneas** de configuración simplificadas

### Beneficios

1. **Simplicidad**: Código más fácil de entender y mantener
2. **Claridad**: Eliminada complejidad innecesaria de TEST_MODE
3. **Mantenibilidad**: Menos código obsoleto que mantener
4. **Rendimiento**: Servidor más ligero sin middleware de bypass

### Errores TypeScript

- **Antes**: 705 errores (incluyendo import de test-auth.ts)
- **Después**: 704 errores (import eliminado)
- **Reducción**: 1 error

---

## Estado Actual del Testing E2E

### Tests Existentes

- **3 archivos** de tests E2E en `tests/e2e/`
  - busqueda-confirmaciones.spec.ts
  - calendario-graficos.spec.ts
  - workflow-aprobacion-bases.spec.ts

### Estado

- **0/180 tests** funcionando (0% de cobertura)
- **14 horas** invertidas en desarrollo de infraestructura
- **ROI**: Negativo

### Recomendación

**POSPONER testing E2E** hasta que:

1. Se corrijan los 704 errores TypeScript de Drizzle ORM
2. Se estabilice el sistema en producción
3. Se tenga tiempo para implementar solución más simple

---

## Próximos Pasos Sugeridos

1. **Corregir errores TypeScript de Drizzle ORM** (3-4h)
   - Investigar solución para ~600 errores relacionados con enum columns
   - Aplicar fix sistemático en queries afectadas

2. **Mejorar documentación del sistema** (1-2h)
   - Documentar arquitectura actual
   - Crear guías de desarrollo

3. **Implementar features de negocio pendientes** (según prioridad)
   - Enfocarse en funcionalidades que agregan valor al usuario
   - Priorizar sobre infraestructura de testing

---

## Conclusión

La limpieza de código obsoleto de testing ha simplificado significativamente la base de código, eliminando ~5KB de código que no aportaba valor y añadía complejidad innecesaria. El sistema ahora es más fácil de entender y mantener.

El enfoque en testing E2E debe ser reconsiderado con una estrategia más pragmática que priorice el ROI y la simplicidad sobre la cobertura exhaustiva.
