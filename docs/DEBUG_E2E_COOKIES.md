# Debug: Problema de Cookies en Tests E2E

**Fecha**: 20 de febrero de 2026

## 🔍 Problema Identificado

El screenshot del test fallido muestra que después del reload, la aplicación redirige a la página de inicio (Home) en lugar de permanecer en el dashboard autenticado.

**Evidencia**:
- Screenshot muestra: "Plataforma NOM-035 STPS 2018" con botón "Acceder a la Plataforma"
- Logs del servidor: `[Auth] Missing session cookie` (2 veces)
- Test falla en: `page.waitForResponse` esperando `/api/trpc/auth.me` con status 200

## 🧪 Flujo del Test

1. ✅ **POST `/api/test/auth/token`** - Exitoso, devuelve usuario "Usuario de Prueba E2E"
2. ✅ **Cookie establecida** - El endpoint establece la cookie de sesión
3. ❌ **Reload de página** - La cookie NO persiste después del reload
4. ❌ **Redirección a Home** - La aplicación detecta que no hay sesión y redirige
5. ❌ **No hay request a `/api/trpc/auth.me`** - Porque no hay cookie de sesión

## 🔎 Causa Raíz

**Hipótesis**: La cookie establecida por `context.request.post()` no se está compartiendo correctamente con el contexto del navegador de Playwright.

**Razones posibles**:
1. **Domain mismatch**: La cookie se establece para un dominio diferente al que navega el navegador
2. **Secure flag**: La cookie requiere HTTPS pero el test usa HTTP
3. **SameSite attribute**: La cookie tiene `SameSite=Strict` o `SameSite=Lax` que previene su envío
4. **Path mismatch**: La cookie se establece para un path específico que no coincide

## 🛠️ Soluciones a Probar

### Solución 1: Verificar y Establecer Cookies Manualmente

Después de llamar al endpoint de autenticación, extraer las cookies de la respuesta y establecerlas manualmente en el contexto del navegador:

```typescript
const response = await context.request.post('/api/test/auth/token');
const cookies = response.headers()['set-cookie'];

// Parsear y establecer cookies manualmente
if (cookies) {
  const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
  for (const cookie of cookieArray) {
    const parsed = parseCookie(cookie); // Función helper
    await context.addCookies([parsed]);
  }
}
```

### Solución 2: Usar Storage State

Guardar el estado de autenticación después del login y reutilizarlo:

```typescript
// Después de autenticación exitosa
await context.storageState({ path: 'auth-state.json' });

// En tests subsecuentes
const context = await browser.newContext({ storageState: 'auth-state.json' });
```

### Solución 3: No Hacer Reload

En lugar de reload, navegar directamente a la URL del dashboard:

```typescript
// En lugar de:
await page.reload();

// Usar:
await page.goto('/dashboard');
```

### Solución 4: Verificar Configuración de Cookies en el Servidor

Revisar `server/_core/test-auth.ts` para asegurar que las cookies se establecen correctamente:

```typescript
res.cookie('session', token, {
  httpOnly: true,
  secure: false, // Debe ser false para tests locales
  sameSite: 'lax', // Permitir envío en navegación
  path: '/',
  maxAge: 24 * 60 * 60 * 1000 // 24 horas
});
```

## 📊 Estado Actual

- ❌ **Test E2E**: Fallando por problema de cookies
- ✅ **Endpoint de autenticación**: Funciona correctamente
- ✅ **Fixture mejorado**: Espera correctamente a queries
- ❌ **Persistencia de cookies**: No funciona después de reload

## 🎯 Próximos Pasos

1. Implementar Solución 3 (más simple): No hacer reload, navegar a dashboard
2. Si falla, implementar Solución 1: Establecer cookies manualmente
3. Si falla, revisar configuración de cookies en servidor (Solución 4)
4. Como última opción, usar Storage State (Solución 2)

---

**Nota**: El problema NO es del fixture ni del timing, sino de cómo Playwright maneja las cookies entre requests API y navegación del navegador.
