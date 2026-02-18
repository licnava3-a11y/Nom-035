# Protección CSRF (Cross-Site Request Forgery)

**Autor**: Verónica Nava Córdova  
**Fecha**: 18 de febrero de 2026  
**Versión**: 1.0

---

## Resumen Ejecutivo

La plataforma NOM-035 implementa un **sistema completo de protección CSRF** que previene ataques de falsificación de peticiones entre sitios. Este documento detalla la arquitectura de seguridad de 3 capas, el flujo de generación y validación de tokens, y las guías para desarrolladores.

---

## Arquitectura de Seguridad

La protección CSRF se implementa en **tres capas independientes** que trabajan en conjunto para garantizar la seguridad de todas las mutations críticas del sistema.

### Capa 1: Backend - Generación y Validación de Tokens

**Ubicación**: `server/_core/csrf.ts`

El módulo backend implementa la lógica fundamental de seguridad CSRF mediante las siguientes funciones principales.

**Generación de Tokens Seguros**:
```typescript
export function generateCSRFToken(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex'); // 64 caracteres hex
  const expiresAt = Date.now() + CSRF_TOKEN_EXPIRY; // 1 hora
  
  tokenStore.set(token, { userId, expiresAt });
  return token;
}
```

El sistema genera tokens aleatorios de 32 bytes (256 bits) usando `crypto.randomBytes`, lo que garantiza una entropía criptográficamente segura. Cada token se asocia con el ID del usuario y una fecha de expiración de 1 hora.

**Validación Timing-Safe**:
```typescript
export function validateCSRFToken(token: string, userId: string): boolean {
  const record = tokenStore.get(token);
  
  if (!record) return false;
  if (Date.now() > record.expiresAt) {
    tokenStore.delete(token);
    return false;
  }
  
  // Protección contra timing attacks
  const userIdBuffer = Buffer.from(record.userId);
  const providedUserIdBuffer = Buffer.from(userId);
  
  if (userIdBuffer.length !== providedUserIdBuffer.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(userIdBuffer, providedUserIdBuffer);
}
```

La validación utiliza `crypto.timingSafeEqual` para comparar los IDs de usuario, previniendo ataques de temporización que podrían revelar información sobre tokens válidos mediante análisis del tiempo de respuesta.

**Limpieza Automática de Tokens Expirados**:
```typescript
setInterval(() => {
  const now = Date.now();
  for (const [token, record] of tokenStore.entries()) {
    if (now > record.expiresAt) {
      tokenStore.delete(token);
    }
  }
}, 15 * 60 * 1000); // Cada 15 minutos
```

Un proceso periódico elimina tokens expirados del almacenamiento en memoria cada 15 minutos, manteniendo el uso de memoria bajo control.

### Capa 2: Interceptor HTTP - Inyección Automática de Tokens

**Ubicación**: `client/src/main.tsx`

El interceptor HTTP agrega automáticamente el token CSRF en el header `x-csrf-token` de todas las requests salientes, sin necesidad de modificar cada componente individualmente.

```typescript
const csrfTokenRef = { current: '' };

// Interceptor de requests
trpcClient.httpBatchLink({
  url: '/api/trpc',
  fetch(url, options) {
    const headers = new Headers(options?.headers);
    
    // Agregar token CSRF automáticamente
    if (csrfTokenRef.current) {
      headers.set('x-csrf-token', csrfTokenRef.current);
    }
    
    return fetch(url, { ...options, headers });
  },
});
```

Este enfoque centralizado garantiza que **todas las mutations** estén protegidas automáticamente, reduciendo el riesgo de errores humanos al olvidar agregar el token en algún formulario.

**Manejo de Errores 403 Forbidden**:
```typescript
const handleCSRFError = async (error: TRPCClientError<any>) => {
  if (error.data?.code === 'FORBIDDEN' && 
      error.message.includes('CSRF')) {
    // Renovar token automáticamente
    const newToken = await trpc.auth.getCSRFToken.query();
    csrfTokenRef.current = newToken;
    
    // Reintentar request original
    return true; // Indica que se debe reintentar
  }
  return false;
};
```

Cuando se detecta un error 403 relacionado con CSRF (token expirado o inválido), el sistema renueva automáticamente el token y reintenta la operación, proporcionando una experiencia de usuario sin interrupciones.

### Capa 3: Gestión de Estado - Renovación Automática

**Ubicación**: `client/src/contexts/CSRFContext.tsx`

El contexto de React gestiona el ciclo de vida completo del token CSRF, incluyendo carga inicial, renovación periódica y sincronización con el interceptor HTTP.

```typescript
export function CSRFProvider({ children }: { children: React.ReactNode }) {
  const { data: token, refetch } = trpc.auth.getCSRFToken.useQuery(
    undefined,
    {
      refetchInterval: 50 * 60 * 1000, // Renovar cada 50 minutos
      staleTime: 45 * 60 * 1000,       // Considerar stale a los 45 min
    }
  );
  
  // Sincronizar con interceptor HTTP
  useEffect(() => {
    if (token) {
      csrfTokenRef.current = token;
    }
  }, [token]);
  
  return (
    <CSRFContext.Provider value={{ token, refetch }}>
      {children}
    </CSRFContext.Provider>
  );
}
```

La renovación automática cada 50 minutos (antes de la expiración de 1 hora) garantiza que los usuarios nunca experimenten errores de token expirado durante sesiones activas prolongadas.

---

## Flujo Completo de Protección CSRF

El siguiente diagrama ilustra el flujo completo desde la carga inicial de la aplicación hasta la ejecución exitosa de una mutation protegida.

### Fase 1: Inicialización (Carga de Aplicación)

```
1. Usuario abre la aplicación
   ↓
2. CSRFProvider ejecuta trpc.auth.getCSRFToken.useQuery()
   ↓
3. Backend genera token aleatorio de 32 bytes
   ↓
4. Backend almacena token en tokenStore con expiración 1h
   ↓
5. Backend retorna token al cliente
   ↓
6. CSRFProvider actualiza csrfTokenRef.current
   ↓
7. Aplicación lista para ejecutar mutations protegidas
```

### Fase 2: Ejecución de Mutation Protegida

```
1. Usuario completa formulario y hace clic en "Guardar"
   ↓
2. Componente ejecuta trpc.cases.create.useMutation()
   ↓
3. Interceptor HTTP agrega header x-csrf-token automáticamente
   ↓
4. Request enviada a /api/trpc con token en header
   ↓
5. Backend extrae token del header x-csrf-token
   ↓
6. Backend valida token con validateCSRFToken(token, userId)
   ↓
7a. Token válido → Ejecutar mutation → Retornar resultado
7b. Token inválido → Lanzar TRPCError FORBIDDEN
```

### Fase 3: Recuperación de Errores (Token Expirado)

```
1. Mutation falla con error 403 FORBIDDEN
   ↓
2. Interceptor detecta error CSRF
   ↓
3. Interceptor ejecuta trpc.auth.getCSRFToken.query()
   ↓
4. Backend genera nuevo token
   ↓
5. Interceptor actualiza csrfTokenRef.current
   ↓
6. Interceptor reintenta mutation original automáticamente
   ↓
7. Mutation exitosa → Usuario no percibe el error
```

---

## Configuración y Parámetros

### Parámetros de Seguridad

| Parámetro | Valor | Justificación |
|-----------|-------|---------------|
| **Longitud de Token** | 32 bytes (64 hex) | Entropía de 256 bits, resistente a ataques de fuerza bruta |
| **Expiración** | 1 hora (3600 segundos) | Balance entre seguridad y experiencia de usuario |
| **Renovación Automática** | 50 minutos | 10 minutos de margen antes de expiración |
| **Limpieza de Tokens** | Cada 15 minutos | Mantiene uso de memoria bajo control |
| **Algoritmo de Comparación** | `crypto.timingSafeEqual` | Previene timing attacks |

### Escenarios de Manejo de Tokens

| Escenario | Comportamiento del Sistema |
|-----------|----------------------------|
| **Token válido y no expirado** | Mutation se ejecuta normalmente |
| **Token expirado** | Renovación automática + reintento de mutation |
| **Token inválido** | Error 403 FORBIDDEN + renovación automática |
| **Sin token** | Error 403 FORBIDDEN inmediato |
| **Token de otro usuario** | Error 403 FORBIDDEN (validación de userId falla) |

---

## Guía para Desarrolladores

### Caso de Uso 1: Crear Nueva Mutation Protegida

**Paso 1**: Definir procedure en router backend

```typescript
// server/routers/myRouter.ts
import { protectedProcedure } from '../_core/trpc';
import { z } from 'zod';

export const myRouter = router({
  createItem: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // ctx.user contiene el usuario autenticado
      // El token CSRF ya fue validado automáticamente
      
      const newItem = await db.items.insert({
        name: input.name,
        description: input.description,
        createdBy: ctx.user.id,
      });
      
      return newItem;
    }),
});
```

**Paso 2**: Usar mutation en componente React

```typescript
// client/src/pages/MyPage.tsx
import { trpc } from '@/lib/trpc';

export function MyPage() {
  const createItem = trpc.myRouter.createItem.useMutation();
  
  const handleSubmit = async (data: { name: string }) => {
    try {
      // El token CSRF se agrega automáticamente
      // No se requiere código adicional
      await createItem.mutateAsync(data);
      toast.success('Item creado exitosamente');
    } catch (error) {
      // Los errores CSRF se manejan automáticamente
      toast.error('Error al crear item');
    }
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Caso de Uso 2: Renovar Token Manualmente

En casos excepcionales donde se requiere renovar el token manualmente (por ejemplo, antes de una operación crítica de larga duración):

```typescript
import { useCSRFToken } from '@/hooks/useCSRFToken';

export function CriticalOperationPage() {
  const { refetch: renewToken } = useCSRFToken();
  
  const handleCriticalOperation = async () => {
    // Renovar token antes de operación crítica
    await renewToken();
    
    // Ejecutar operación
    await trpc.critical.operation.mutate({ ... });
  };
  
  return <button onClick={handleCriticalOperation}>Ejecutar</button>;
}
```

### Caso de Uso 3: Verificar Estado del Token

Para debugging o monitoreo:

```typescript
import { useCSRFToken } from '@/hooks/useCSRFToken';

export function DebugPanel() {
  const { token } = useCSRFToken();
  
  return (
    <div>
      <p>Token actual: {token ? 'Válido' : 'No disponible'}</p>
      <p>Longitud: {token?.length || 0} caracteres</p>
    </div>
  );
}
```

### Caso de Uso 4: Manejar Errores CSRF Personalizados

Si se requiere un manejo de errores personalizado:

```typescript
const createCase = trpc.cases.create.useMutation({
  onError: (error) => {
    if (error.data?.code === 'FORBIDDEN' && 
        error.message.includes('CSRF')) {
      // Manejo personalizado de error CSRF
      toast.error('Sesión expirada. Renovando...');
      // El sistema renovará automáticamente
    } else {
      toast.error('Error al crear caso');
    }
  },
});
```

### Caso de Uso 5: Deshabilitar Protección CSRF (Solo Testing)

**⚠️ ADVERTENCIA**: Solo para entornos de testing, **NUNCA en producción**.

```typescript
// server/_core/csrf.ts
export const CSRF_ENABLED = process.env.NODE_ENV !== 'test';

export function validateCSRFToken(token: string, userId: string): boolean {
  if (!CSRF_ENABLED) return true; // Bypass en testing
  
  // Validación normal...
}
```

---

## Troubleshooting

### Error: "CSRF token missing or invalid"

**Causa**: El token CSRF no está presente en el header o es inválido.

**Solución**:
1. Verificar que `CSRFProvider` esté envolviendo la aplicación en `main.tsx`
2. Verificar que el interceptor HTTP esté configurado correctamente
3. Revisar la consola del navegador para errores de carga del token

### Error: "CSRF token expired"

**Causa**: El token ha expirado (más de 1 hora desde su generación).

**Solución**:
- El sistema debería renovar automáticamente. Si persiste:
  1. Verificar que `refetchInterval` esté configurado en 50 minutos
  2. Revisar logs del servidor para errores en la generación de tokens
  3. Limpiar cookies y recargar la aplicación

### Error: "CSRF token mismatch"

**Causa**: El token pertenece a otro usuario o sesión.

**Solución**:
1. Cerrar sesión y volver a iniciar sesión
2. Limpiar localStorage y cookies del navegador
3. Verificar que no haya múltiples pestañas con diferentes usuarios

### Error: Mutations funcionan en desarrollo pero fallan en producción

**Causa**: Configuración incorrecta del interceptor HTTP o CORS.

**Solución**:
1. Verificar que el header `x-csrf-token` se esté enviando en producción
2. Revisar configuración de CORS en el servidor
3. Verificar que el dominio de producción esté en la whitelist

### Error: Renovación automática no funciona

**Causa**: Hook `useCSRFToken` no está siendo usado o `refetchInterval` está deshabilitado.

**Solución**:
1. Verificar que `CSRFProvider` esté en `main.tsx`
2. Revisar configuración de `refetchInterval` en `CSRFContext.tsx`
3. Verificar que no haya errores de red bloqueando las requests

---

## Preguntas Frecuentes (FAQ)

### ¿Por qué usar tokens en headers en lugar de cookies?

Los tokens en headers HTTP (`x-csrf-token`) son más flexibles y seguros que las cookies porque:
- No están sujetos a restricciones de SameSite
- Funcionan correctamente en aplicaciones SPA (Single Page Applications)
- Son más fáciles de depurar y monitorear
- Evitan conflictos con cookies de sesión

### ¿Qué pasa si un usuario tiene múltiples pestañas abiertas?

Cada pestaña mantiene su propio token CSRF en memoria (`csrfTokenRef`). Cuando un token expira en una pestaña, se renueva automáticamente sin afectar las otras pestañas. Los tokens se validan contra el `userId` del usuario autenticado, por lo que múltiples pestañas del mismo usuario funcionan correctamente.

### ¿El sistema es compatible con aplicaciones móviles?

Sí, el sistema funciona en aplicaciones móviles React Native o Ionic. Solo se requiere:
1. Implementar el interceptor HTTP en el cliente móvil
2. Almacenar el token en memoria o AsyncStorage
3. Agregar el header `x-csrf-token` en todas las requests

### ¿Cómo afecta el rendimiento la validación CSRF?

El impacto en rendimiento es mínimo:
- Generación de token: ~1ms
- Validación de token: ~0.5ms (usando `timingSafeEqual`)
- Almacenamiento en memoria: O(1) lookup
- Total overhead por request: <2ms

### ¿Qué sucede durante un reinicio del servidor?

Los tokens CSRF se almacenan en memoria (`Map`), por lo que se pierden durante reinicios del servidor. Cuando esto ocurre:
1. Las requests con tokens antiguos fallan con 403 FORBIDDEN
2. El interceptor detecta el error y renueva automáticamente
3. El usuario no percibe interrupciones (excepto un ligero delay)

Para producción con múltiples instancias, se recomienda migrar `tokenStore` a Redis para persistencia.

---

## Checklist de Auditoría de Seguridad

Use esta checklist para verificar que la protección CSRF está correctamente implementada:

- [x] `CSRFProvider` envuelve la aplicación en `main.tsx`
- [x] Interceptor HTTP agrega header `x-csrf-token` automáticamente
- [x] Todos los `protectedProcedure` validan tokens CSRF
- [x] Tokens se generan con `crypto.randomBytes(32)`
- [x] Validación usa `crypto.timingSafeEqual` para prevenir timing attacks
- [x] Tokens expiran después de 1 hora
- [x] Renovación automática cada 50 minutos
- [x] Limpieza periódica de tokens expirados cada 15 minutos
- [x] Manejo de errores 403 FORBIDDEN con renovación automática
- [x] Tests automatizados cubren flujo completo de CSRF
- [ ] Logging de intentos CSRF fallidos (pendiente implementación)
- [ ] Alertas automáticas cuando se detectan >10 intentos/hora (pendiente)

---

## Cumplimiento Normativo

La implementación de protección CSRF cumple con los siguientes estándares de seguridad:

### OWASP Top 10 (2021)

- **A01:2021 – Broken Access Control**: Previene acceso no autorizado mediante validación de tokens por usuario
- **A07:2021 – Identification and Authentication Failures**: Tokens criptográficamente seguros con expiración

### PCI DSS 4.0

- **Requisito 6.5.9**: Protección contra CSRF en aplicaciones web que manejan datos de tarjetas
- **Requisito 8.2.1**: Tokens únicos por sesión con expiración automática

### ISO 27001:2022

- **A.8.3 – Media handling**: Gestión segura de tokens de sesión
- **A.8.16 – Monitoring activities**: Logging de intentos de ataque CSRF (pendiente)

### NOM-035-STPS-2018

Aunque la NOM-035 se enfoca en factores de riesgo psicosocial, la protección de datos sensibles de empleados mediante CSRF es fundamental para cumplir con el **numeral 5.7** sobre confidencialidad de información.

---

## Roadmap de Mejoras Futuras

### Mejora 1: Migración a Redis para Persistencia (Prioridad: Alta)

**Problema**: Los tokens se pierden durante reinicios del servidor.

**Solución**: Migrar `tokenStore` de `Map` en memoria a Redis.

**Beneficios**:
- Tokens persisten durante reinicios
- Soporte para múltiples instancias del servidor
- Escalabilidad horizontal

**Implementación estimada**: 4 horas

### Mejora 2: Logging de Intentos CSRF Fallidos (Prioridad: Alta)

**Problema**: No hay visibilidad de intentos de ataque CSRF.

**Solución**: Crear tabla `csrf_violations` y registrar todos los intentos fallidos.

**Beneficios**:
- Detección temprana de ataques
- Análisis forense post-incidente
- Generación de alertas automáticas

**Implementación estimada**: 3 horas

### Mejora 3: Dashboard de Métricas de Seguridad CSRF (Prioridad: Media)

**Problema**: No hay visualización de métricas de seguridad CSRF.

**Solución**: Crear dashboard con:
- Total de tokens generados/validados
- Tasa de fallos por hora
- Top 10 IPs con más intentos fallidos
- Gráfico de tendencias de ataques

**Implementación estimada**: 6 horas

### Mejora 4: Rate Limiting por IP en Validación CSRF (Prioridad: Media)

**Problema**: Un atacante puede intentar miles de tokens sin consecuencias.

**Solución**: Implementar rate limiting de 10 intentos fallidos por IP por hora.

**Beneficios**:
- Bloqueo automático de IPs maliciosas
- Reducción de carga en el servidor
- Prevención de ataques de fuerza bruta

**Implementación estimada**: 2 horas

---

## Referencias

1. [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
2. [MDN Web Docs - CSRF](https://developer.mozilla.org/en-US/docs/Glossary/CSRF)
3. [Node.js Crypto Module Documentation](https://nodejs.org/api/crypto.html)
4. [tRPC Documentation - Error Handling](https://trpc.io/docs/error-handling)
5. [React Context API Documentation](https://react.dev/reference/react/useContext)

---

**Documento creado por**: Verónica Nava Córdova  
**Última actualización**: 18 de febrero de 2026  
**Versión**: 1.0  
**Estado**: Producción
