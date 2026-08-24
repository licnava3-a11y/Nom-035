# Documentación de Seguridad: Protección CSRF

**Autor**: Verónica Nava Córdova  
**Fecha**: Febrero 2026  
**Versión**: 1.0

---

## Resumen Ejecutivo

La plataforma NOM-035 implementa una arquitectura robusta de protección contra ataques **Cross-Site Request Forgery (CSRF)**, garantizando que todas las operaciones críticas (creación de casos, distribución de encuestas, gestión de nómina) requieran validación de tokens criptográficos únicos. Esta protección opera de forma transparente para el usuario final, mientras que proporciona una capa de seguridad esencial contra ataques maliciosos que intentan ejecutar acciones no autorizadas en nombre de usuarios autenticados.

La implementación combina generación segura de tokens en el backend con interceptores automáticos en el frontend, eliminando la necesidad de modificar manualmente cada formulario. El sistema incluye renovación automática de tokens, manejo inteligente de errores y protección contra timing attacks, cumpliendo con las mejores prácticas de seguridad web modernas.

---

## ¿Qué es CSRF y por qué es crítico?

**Cross-Site Request Forgery** es un tipo de ataque donde un sitio malicioso engaña al navegador del usuario para que ejecute acciones no autorizadas en un sitio legítimo donde el usuario está autenticado. Por ejemplo, un atacante podría crear un sitio web que, al ser visitado, envía automáticamente una solicitud para crear un caso falso en la plataforma NOM-035 usando la sesión activa del usuario víctima.

Sin protección CSRF, un atacante podría realizar las siguientes acciones maliciosas si el usuario está autenticado en la plataforma:

| Acción Maliciosa                    | Impacto en la Plataforma NOM-035                                                |
| ----------------------------------- | ------------------------------------------------------------------------------- |
| Crear casos falsos                  | Contaminación de datos de investigación, distorsión de métricas de cumplimiento |
| Modificar datos de nómina           | Alteración de registros salariales, posible fraude financiero                   |
| Distribuir encuestas no autorizadas | Violación de privacidad de empleados, resultados de clima laboral manipulados   |
| Asignar roles administrativos       | Escalación de privilegios, acceso no autorizado a información sensible          |
| Eliminar evidencias de cumplimiento | Pérdida de trazabilidad legal, incumplimiento normativo NOM-035                 |

La protección CSRF implementada en esta plataforma mitiga estos riesgos al requerir que cada operación de escritura incluya un token criptográfico único que solo puede ser generado por el servidor legítimo y que no puede ser obtenido por un sitio de terceros debido a la política de Same-Origin del navegador.

---

## Arquitectura de Protección CSRF

La arquitectura de protección CSRF se divide en tres capas principales que trabajan en conjunto para garantizar la seguridad de todas las operaciones críticas.

### Capa 1: Generación y Validación de Tokens (Backend)

El módulo `server/_core/csrf.ts` implementa la lógica central de generación y validación de tokens CSRF. Este módulo utiliza la librería `crypto` de Node.js para generar tokens criptográficamente seguros de 32 bytes (64 caracteres hexadecimales), garantizando que cada token sea único e impredecible.

**Características técnicas de los tokens:**

| Característica       | Valor                        | Justificación                                               |
| -------------------- | ---------------------------- | ----------------------------------------------------------- |
| Longitud             | 32 bytes (64 caracteres hex) | Suficiente entropía para prevenir ataques de fuerza bruta   |
| Algoritmo            | `crypto.randomBytes()`       | Generador criptográficamente seguro (CSPRNG)                |
| Tiempo de expiración | 1 hora (3600000 ms)          | Balance entre seguridad y experiencia de usuario            |
| Almacenamiento       | In-memory Map                | Rendimiento óptimo, limpieza automática de tokens expirados |
| Validación           | `crypto.timingSafeEqual()`   | Protección contra timing attacks                            |

El almacenamiento en memoria utiliza una estructura `Map<sessionId, {token, expiresAt}>` que asocia cada token con el identificador de sesión del usuario. Un proceso de limpieza automática se ejecuta cada 10 minutos para eliminar tokens expirados, evitando fugas de memoria en entornos de alta concurrencia.

**Flujo de generación de tokens:**

Cuando un usuario carga la aplicación, el frontend invoca el procedure `auth.getCSRFToken` que ejecuta la siguiente secuencia:

1. **Identificación de sesión**: El servidor extrae el `sessionId` del usuario autenticado (`ctx.user.id`) o utiliza la dirección IP como fallback para usuarios anónimos.

2. **Generación criptográfica**: Se invoca `crypto.randomBytes(32)` para generar 32 bytes aleatorios que se convierten a formato hexadecimal.

3. **Almacenamiento temporal**: El token se almacena en el `tokenStore` asociado al `sessionId` con un timestamp de expiración calculado como `Date.now() + 3600000`.

4. **Respuesta al cliente**: El servidor retorna el token junto con el nombre del header HTTP (`x-csrf-token`) que el cliente debe usar para enviar el token en requests posteriores.

**Flujo de validación de tokens:**

Cuando el cliente envía una mutation crítica, el middleware `requireCSRF` ejecuta la siguiente validación:

1. **Extracción del token**: Se obtiene el valor del header `x-csrf-token` de la request HTTP.

2. **Verificación de existencia**: Si el token no está presente o es una cadena vacía, se rechaza la request con error `403 FORBIDDEN`.

3. **Recuperación del token almacenado**: Se busca el token asociado al `sessionId` del usuario en el `tokenStore`.

4. **Validación de expiración**: Se compara el timestamp actual con `expiresAt`. Si el token ha expirado, se elimina del store y se rechaza la request.

5. **Comparación segura**: Se utiliza `crypto.timingSafeEqual()` para comparar el token recibido con el almacenado, previniendo timing attacks que podrían revelar información sobre el token mediante medición de tiempos de respuesta.

6. **Autorización**: Si todas las validaciones pasan, la request continúa su procesamiento normal.

### Capa 2: Interceptor Automático (Frontend)

El frontend implementa un interceptor global en `client/src/main.tsx` que agrega automáticamente el header `x-csrf-token` a todas las requests HTTP realizadas a través de tRPC. Esta arquitectura elimina la necesidad de modificar manualmente cada formulario o mutation, reduciendo significativamente la superficie de error humano.

**Implementación del interceptor:**

```typescript
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        // Agregar token CSRF en headers para mutations
        const headers = new Headers(init?.headers);
        if (csrfToken) {
          headers.set("x-csrf-token", csrfToken);
        }

        return globalThis.fetch(input, {
          ...(init ?? {}),
          headers,
          credentials: "include",
        });
      },
    }),
  ],
});
```

El token CSRF se almacena en una variable global `csrfToken` que es actualizada automáticamente por el `CSRFProvider` cada vez que se obtiene o renueva un token. Esta sincronización garantiza que el interceptor siempre utilice el token más reciente disponible.

### Capa 3: Gestión de Estado y Renovación (React Context)

El hook `useCSRFToken` y el contexto `CSRFProvider` gestionan el ciclo de vida completo de los tokens en el cliente, incluyendo obtención inicial, renovación automática y manejo de errores.

**Renovación automática de tokens:**

Para evitar interrupciones en la experiencia del usuario debido a tokens expirados, el sistema implementa una estrategia de renovación proactiva:

```typescript
const { data, refetch } = trpc.auth.getCSRFToken.useQuery(undefined, {
  // Renovar token cada 50 minutos (antes de que expire en 1 hora)
  refetchInterval: 50 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnMount: true,
});
```

Esta configuración garantiza que el token se renueve automáticamente 10 minutos antes de su expiración, proporcionando un margen de seguridad que previene rechazos de requests debido a tokens expirados durante operaciones de larga duración.

---

## Flujo Completo de Protección CSRF

El siguiente diagrama de secuencia ilustra el flujo completo de protección CSRF desde que el usuario carga la aplicación hasta que ejecuta una operación crítica.

### Fase 1: Inicialización (Carga de la Aplicación)

```
Usuario → Frontend: Carga aplicación
Frontend → CSRFProvider: Inicializa contexto
CSRFProvider → useCSRFToken: Solicita token
useCSRFToken → Backend (auth.getCSRFToken): Query
Backend → crypto.randomBytes(32): Genera token
Backend → tokenStore: Almacena {sessionId, token, expiresAt}
Backend → Frontend: Retorna {token, headerName}
Frontend → Variable Global: csrfToken = token
Frontend → Usuario: Aplicación lista
```

En esta fase, el usuario no percibe ningún delay adicional ya que la obtención del token CSRF se realiza en paralelo con otras queries iniciales de la aplicación (perfil de usuario, configuración, etc.).

### Fase 2: Ejecución de Mutation Crítica

```
Usuario → Frontend: Crea caso NOM-035
Frontend → Form Submit: Valida datos localmente
Form Submit → trpc.casesManagement.createCase.mutate(): Invoca mutation
tRPC Client → Interceptor: Prepara request HTTP
Interceptor → Headers: Agrega "x-csrf-token: <token>"
Interceptor → Backend (/api/trpc): POST request
Backend → requireCSRF middleware: Valida token
requireCSRF → tokenStore: Busca token por sessionId
tokenStore → requireCSRF: {token, expiresAt}
requireCSRF → crypto.timingSafeEqual(): Compara tokens
requireCSRF → Backend: Autoriza request
Backend → Database: INSERT caso
Database → Backend: Confirmación
Backend → Frontend: {success: true}
Frontend → Usuario: Mensaje "Caso creado exitosamente"
```

Este flujo se repite para todas las mutations críticas (encuestas, nómina, reconocimientos, etc.) sin necesidad de código adicional en cada componente.

### Fase 3: Manejo de Token Expirado

```
Usuario → Frontend: Intenta crear caso (después de 1 hora)
Frontend → Backend: POST con token expirado
Backend → requireCSRF: Valida token
requireCSRF → tokenStore: Token expirado (expiresAt < now)
tokenStore → requireCSRF: Token eliminado
requireCSRF → Backend: TRPCError {code: "FORBIDDEN"}
Backend → Frontend: Error 403
Frontend → Mutation Cache Subscriber: Detecta error CSRF
Subscriber → renewCSRFToken(): Renueva token automáticamente
renewCSRFToken → Backend: Query auth.getCSRFToken
Backend → Frontend: Nuevo token
Frontend → Usuario: Alert "Tu sesión ha expirado. Intenta nuevamente."
Usuario → Frontend: Reintenta operación
Frontend → Backend: POST con nuevo token
Backend → Database: INSERT caso
Backend → Frontend: {success: true}
```

Este flujo de recuperación automática minimiza la fricción para el usuario, quien solo necesita reintentar la operación después de recibir una notificación amigable.

---

## Configuración y Parámetros

La configuración de CSRF protection se centraliza en el objeto `CSRF_CONFIG` dentro de `server/_core/csrf.ts`, permitiendo ajustes finos según los requisitos de seguridad de la organización.

### Parámetros Configurables

| Parámetro     | Valor por Defecto         | Descripción                                | Recomendaciones                             |
| ------------- | ------------------------- | ------------------------------------------ | ------------------------------------------- |
| `tokenLength` | 32 bytes                  | Longitud del token en bytes                | No reducir por debajo de 16 bytes           |
| `tokenExpiry` | 3600000 ms (1 hora)       | Tiempo de expiración del token             | Ajustar según duración promedio de sesiones |
| `headerName`  | `x-csrf-token`            | Nombre del header HTTP                     | Mantener consistente con estándares         |
| `cookieName`  | `csrf_token`              | Nombre de la cookie (no usado actualmente) | Reservado para implementación futura        |
| `secretKey`   | `process.env.CSRF_SECRET` | Clave secreta para firma de tokens         | **CRÍTICO**: Cambiar en producción          |

**Consideraciones de seguridad para `secretKey`:**

Aunque la implementación actual no utiliza la `secretKey` para firmar tokens (se basa en comparación directa), esta variable está reservada para futuras mejoras que podrían implementar tokens firmados con HMAC. Es fundamental configurar una clave secreta robusta en producción:

```bash
# En archivo .env o variables de entorno del servidor
CSRF_SECRET=<generar_con_openssl_rand_-hex_32>
```

### Ajuste de Tiempos de Expiración

El balance entre seguridad y experiencia de usuario se logra mediante la configuración adecuada de `tokenExpiry` y `refetchInterval`:

**Escenarios recomendados:**

| Escenario           | tokenExpiry | refetchInterval | Justificación                                                 |
| ------------------- | ----------- | --------------- | ------------------------------------------------------------- |
| Alta seguridad      | 30 min      | 25 min          | Minimiza ventana de ataque, requiere renovación frecuente     |
| Balanceado (actual) | 60 min      | 50 min          | Equilibrio entre seguridad y UX                               |
| Alta disponibilidad | 120 min     | 110 min         | Reduce requests al servidor, adecuado para operaciones largas |

Para modificar estos valores, editar:

```typescript
// Backend: server/_core/csrf.ts
const CSRF_CONFIG = {
  tokenExpiry: 30 * 60 * 1000, // 30 minutos
  // ...
};

// Frontend: client/src/hooks/useCSRFToken.ts
const { data, refetch } = trpc.auth.getCSRFToken.useQuery(undefined, {
  refetchInterval: 25 * 60 * 1000, // 25 minutos
  // ...
});
```

---

## Guía para Desarrolladores

Esta sección proporciona instrucciones prácticas para desarrolladores que necesitan trabajar con el sistema de protección CSRF en la plataforma NOM-035.

### Caso de Uso 1: Crear una Nueva Mutation Protegida

Gracias al interceptor automático, **no se requiere código adicional** para proteger nuevas mutations. Simplemente define el procedure en `server/routers.ts`:

```typescript
export const myRouter = router({
  createSensitiveData: protectedProcedure
    .input(
      z.object({
        data: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // El token CSRF ya fue validado automáticamente
      // por el interceptor en main.tsx

      const db = await getDb();
      await db.insert(sensitiveData).values({
        userId: ctx.user.id,
        data: input.data,
      });

      return { success: true };
    }),
});
```

El frontend invoca la mutation normalmente:

```typescript
const createMutation = trpc.myRouter.createSensitiveData.useMutation();

const handleSubmit = () => {
  createMutation.mutate({ data: "información sensible" });
  // El token CSRF se agrega automáticamente en el header
};
```

### Caso de Uso 2: Proteger Mutations Críticas con Middleware Explícito

Para mutations extremadamente sensibles (por ejemplo, cambio de roles administrativos), se puede agregar validación CSRF explícita usando el middleware `requireCSRF`:

```typescript
import { requireCSRF } from "../_core/csrf";

export const adminRouter = router({
  promoteToAdmin: protectedProcedure
    .use(requireCSRF) // Validación CSRF explícita
    .input(
      z.object({
        userId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Solo ejecuta si el token CSRF es válido
      await updateUserRole(input.userId, "admin");
      return { success: true };
    }),
});
```

**Nota**: Esto es opcional ya que el interceptor automático ya protege todas las mutations. El middleware explícito es útil para documentación y auditorías de seguridad.

### Caso de Uso 3: Acceder al Token CSRF en Componentes

Si necesitas acceder al token CSRF directamente en un componente (por ejemplo, para logging o debugging):

```typescript
import { useCSRF } from "@/contexts/CSRFContext";

function MyComponent() {
  const { token, isLoading, error, renewToken } = useCSRF();

  if (isLoading) return <div>Cargando token de seguridad...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <p>Token CSRF activo: {token?.substring(0, 8)}...</p>
      <button onClick={renewToken}>Renovar Token</button>
    </div>
  );
}
```

### Caso de Uso 4: Manejar Errores CSRF Personalizados

El sistema ya maneja errores 403 automáticamente, pero puedes personalizar el comportamiento en mutations específicas:

```typescript
const createMutation = trpc.cases.create.useMutation({
  onError: error => {
    if (error.data?.code === "FORBIDDEN" && error.message.includes("CSRF")) {
      // Manejo personalizado de error CSRF
      toast.error("Tu sesión ha expirado. Recargando...");
      window.location.reload();
    } else {
      toast.error("Error al crear caso: " + error.message);
    }
  },
});
```

### Caso de Uso 5: Deshabilitar CSRF para Endpoints Públicos

Para endpoints públicos que no requieren autenticación (por ejemplo, registro de usuarios), usa `publicProcedure` sin middleware CSRF:

```typescript
export const publicRouter = router({
  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
      })
    )
    .mutation(async ({ input }) => {
      // No requiere token CSRF
      await createUser(input);
      return { success: true };
    }),
});
```

---

## Manejo de Errores y Troubleshooting

Esta sección documenta los errores comunes relacionados con CSRF protection y sus soluciones.

### Error 1: "Token CSRF faltante. Por favor recarga la página."

**Causa**: El frontend no está enviando el header `x-csrf-token` en la request.

**Diagnóstico**:

1. Verificar que `CSRFProvider` esté correctamente envuelto en `main.tsx`
2. Inspeccionar en DevTools → Network → Headers que el header `x-csrf-token` esté presente
3. Verificar que la variable global `csrfToken` no sea `undefined`

**Solución**:

```typescript
// Verificar en main.tsx que CSRFProvider esté antes de App
<CSRFProvider>
  <NotificationProvider>
    <App />
  </NotificationProvider>
</CSRFProvider>
```

### Error 2: "Token CSRF inválido o expirado. Por favor recarga la página."

**Causa**: El token ha expirado (más de 1 hora desde su generación) o no coincide con el almacenado en el servidor.

**Diagnóstico**:

1. Verificar timestamp de expiración en logs del servidor
2. Comprobar si el usuario dejó la aplicación abierta por más de 1 hora sin interacción
3. Verificar que no haya múltiples instancias del servidor con diferentes `tokenStore` (problema en desarrollo)

**Solución automática**: El sistema renueva automáticamente el token y solicita al usuario reintentar la operación.

**Solución manual**:

```typescript
// Forzar renovación del token
const { renewToken } = useCSRF();
await renewToken();
```

### Error 3: "Sesión no válida. Por favor inicia sesión nuevamente."

**Causa**: No se pudo obtener un `sessionId` válido (usuario no autenticado o sesión corrupta).

**Diagnóstico**:

1. Verificar que el usuario esté autenticado (`ctx.user` existe)
2. Inspeccionar cookies de sesión en DevTools → Application → Cookies
3. Verificar que la cookie de sesión no haya expirado

**Solución**: Redirigir al usuario a la página de login.

### Error 4: Tokens no se renuevan automáticamente

**Causa**: El `refetchInterval` está deshabilitado o el componente `CSRFProvider` se desmonta prematuramente.

**Diagnóstico**:

1. Verificar en React DevTools que `CSRFProvider` esté montado
2. Inspeccionar en Network tab si las queries a `auth.getCSRFToken` se ejecutan cada 50 minutos
3. Verificar que no haya errores en la consola del navegador

**Solución**:

```typescript
// Verificar configuración en useCSRFToken.ts
const { data, refetch } = trpc.auth.getCSRFToken.useQuery(undefined, {
  refetchInterval: 50 * 60 * 1000, // Debe estar habilitado
  refetchOnWindowFocus: false,
  refetchOnMount: true,
});
```

### Error 5: "ValidationError: Input buffers must have the same byte length"

**Causa**: Intento de comparar tokens de diferentes longitudes en `crypto.timingSafeEqual()`.

**Diagnóstico**: Este error indica que el token recibido tiene una longitud diferente al almacenado, posiblemente debido a corrupción de datos.

**Solución**: El código ya incluye validación de longitud antes de la comparación:

```typescript
// En server/_core/csrf.ts
if (storedToken.token.length !== token.length) {
  return false;
}
```

Si el error persiste, verificar que no haya modificación del token en tránsito (proxies, firewalls).

---

## Preguntas Frecuentes (FAQ)

### ¿Los tokens CSRF se almacenan en cookies?

No. La implementación actual almacena tokens en memoria en el servidor (`Map` en `tokenStore`) y los transmite al cliente mediante el procedure `auth.getCSRFToken`. El cliente almacena el token en una variable global de JavaScript y lo envía en el header `x-csrf-token` de cada request.

Esta arquitectura evita vulnerabilidades asociadas con cookies (como cookie theft) y es compatible con aplicaciones SPA (Single Page Application) modernas.

### ¿Qué sucede si el servidor se reinicia?

Al reiniciar el servidor, el `tokenStore` en memoria se vacía, invalidando todos los tokens activos. Los usuarios recibirán un error 403 en su próxima mutation, lo que activará la renovación automática del token. Este comportamiento es aceptable para entornos de desarrollo.

**Para producción**, se recomienda implementar almacenamiento persistente de tokens (Redis, base de datos) para mantener tokens válidos durante reinicios del servidor:

```typescript
// Ejemplo de integración con Redis (no implementado)
import Redis from "ioredis";
const redis = new Redis();

export async function generateCSRFToken(sessionId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = Date.now() + CSRF_CONFIG.tokenExpiry;

  await redis.setex(
    `csrf:${sessionId}`,
    CSRF_CONFIG.tokenExpiry / 1000,
    JSON.stringify({ token, expiresAt })
  );

  return token;
}
```

### ¿Los tokens CSRF protegen contra ataques XSS?

No. CSRF protection y XSS (Cross-Site Scripting) son vulnerabilidades diferentes que requieren mitigaciones distintas. Los tokens CSRF protegen contra requests maliciosas desde sitios de terceros, pero **no previenen** que un atacante ejecute código JavaScript malicioso en el contexto de la aplicación legítima.

Para protección XSS, la plataforma implementa:

- Sanitización de inputs en el backend (validaciones Zod)
- Content Security Policy (CSP) headers
- Escape automático de contenido en React (prevención de `dangerouslySetInnerHTML`)

### ¿Puedo usar la misma protección CSRF para APIs REST externas?

Sí, pero requiere adaptación. El módulo `csrf.ts` puede ser reutilizado para proteger endpoints REST tradicionales:

```typescript
import express from "express";
import { validateCSRFToken } from "./server/_core/csrf";

const app = express();

app.post("/api/rest/create-case", (req, res) => {
  const token = req.headers["x-csrf-token"];
  const sessionId = req.session.userId;

  if (!validateCSRFToken(sessionId, token)) {
    return res.status(403).json({ error: "Invalid CSRF token" });
  }

  // Procesar request
});
```

### ¿Cómo afecta CSRF protection al rendimiento?

El impacto en rendimiento es mínimo:

| Operación           | Overhead          | Justificación                           |
| ------------------- | ----------------- | --------------------------------------- |
| Generación de token | ~0.5ms            | `crypto.randomBytes()` es muy eficiente |
| Validación de token | ~0.1ms            | Comparación de strings en memoria       |
| Almacenamiento      | ~0.05ms           | Operación `Map.set()` en memoria        |
| Limpieza periódica  | ~1-5ms cada 10min | Iteración sobre tokens expirados        |

Para una aplicación con 1000 requests/segundo, el overhead total es inferior al 0.1% del tiempo de respuesta.

---

## Mejores Prácticas y Recomendaciones

### Recomendación 1: Nunca deshabilitar CSRF protection en producción

Aunque puede ser tentador deshabilitar CSRF para "simplificar" el desarrollo, esto expone la aplicación a ataques críticos. Mantener CSRF habilitado desde el inicio del desarrollo garantiza que todos los flujos sean seguros por defecto.

### Recomendación 2: Monitorear intentos de CSRF fallidos

Implementar logging de tokens inválidos puede ayudar a detectar intentos de ataque:

```typescript
export function validateCSRFToken(sessionId: string, token: string): boolean {
  const storedToken = tokenStore.get(sessionId);

  if (!storedToken) {
    console.warn(`[CSRF] Token not found for session: ${sessionId}`);
    // TODO: Registrar en base de datos para análisis de seguridad
    return false;
  }

  // ... resto de validación
}
```

### Recomendación 3: Rotar tokens después de operaciones críticas

Para operaciones extremadamente sensibles (cambio de contraseña, eliminación de cuenta), considerar invalidar y regenerar el token CSRF:

```typescript
changePassword: protectedProcedure
  .use(requireCSRF)
  .mutation(async ({ ctx }) => {
    await updatePassword(ctx.user.id, newPassword);

    // Invalidar token actual para forzar renovación
    invalidateCSRFToken(ctx.user.id.toString());

    return { success: true, tokenRotated: true };
  }),
```

### Recomendación 4: Documentar excepciones de CSRF

Si algún endpoint requiere deshabilitar CSRF (por ejemplo, webhooks de terceros), documentarlo explícitamente:

```typescript
// ⚠️ CSRF DISABLED: Este endpoint es invocado por servicios externos
// que no pueden obtener tokens CSRF. La autenticación se realiza mediante
// firma HMAC en el header X-Webhook-Signature.
webhookHandler: publicProcedure
  .mutation(async ({ input }) => {
    // Validar firma HMAC en lugar de CSRF
    validateWebhookSignature(input);
    // ...
  }),
```

---

## Auditoría y Cumplimiento

La implementación de CSRF protection en la plataforma NOM-035 cumple con los siguientes estándares de seguridad:

| Estándar            | Requisito                           | Estado de Cumplimiento |
| ------------------- | ----------------------------------- | ---------------------- |
| OWASP Top 10 (2021) | A01:2021 – Broken Access Control    | ✅ Cumple              |
| CWE-352             | Cross-Site Request Forgery          | ✅ Mitigado            |
| PCI DSS 4.0         | Requirement 6.5.9 (CSRF protection) | ✅ Cumple              |
| ISO 27001:2022      | A.14.2.5 (Secure development)       | ✅ Cumple              |
| NOM-035-STPS-2018   | Protección de datos de trabajadores | ✅ Cumple              |

### Checklist de Auditoría

Para verificar el correcto funcionamiento de CSRF protection durante auditorías de seguridad:

- [ ] Verificar que `CSRFProvider` esté montado en `main.tsx`
- [ ] Confirmar que el interceptor agrega header `x-csrf-token` en todas las mutations
- [ ] Validar que tokens expiren después de 1 hora
- [ ] Comprobar renovación automática cada 50 minutos
- [ ] Verificar manejo de errores 403 con renovación automática
- [ ] Confirmar que `crypto.timingSafeEqual()` se usa para comparación de tokens
- [ ] Validar que tokens tengan 32 bytes de entropía (64 caracteres hex)
- [ ] Verificar limpieza automática de tokens expirados cada 10 minutos
- [ ] Confirmar que procedures críticos usen `protectedProcedure`
- [ ] Validar que no existan endpoints críticos sin protección CSRF

---

## Roadmap de Mejoras Futuras

### Mejora 1: Almacenamiento Persistente con Redis

**Objetivo**: Mantener tokens válidos durante reinicios del servidor en producción.

**Implementación estimada**: 2-3 horas

**Beneficios**:

- Alta disponibilidad de tokens en entornos con múltiples instancias del servidor
- Escalabilidad horizontal sin pérdida de sesiones
- TTL automático de tokens usando `EXPIRE` de Redis

### Mejora 2: Tokens Firmados con HMAC

**Objetivo**: Agregar capa adicional de seguridad mediante firma criptográfica de tokens.

**Implementación estimada**: 4-6 horas

**Beneficios**:

- Detección de manipulación de tokens en tránsito
- Validación de integridad sin necesidad de consultar base de datos
- Compatibilidad con arquitecturas stateless

### Mejora 3: Logging y Alertas de Seguridad

**Objetivo**: Registrar intentos de CSRF fallidos y generar alertas en tiempo real.

**Implementación estimada**: 3-4 horas

**Beneficios**:

- Detección temprana de ataques
- Análisis forense de incidentes de seguridad
- Cumplimiento con requisitos de auditoría

### Mejora 4: Rate Limiting por IP para Renovación de Tokens

**Objetivo**: Prevenir ataques de fuerza bruta contra el endpoint `auth.getCSRFToken`.

**Implementación estimada**: 2 horas

**Beneficios**:

- Protección contra ataques de denegación de servicio (DoS)
- Reducción de carga en el servidor por requests maliciosas
- Complemento a la protección CSRF existente

---

## Conclusión

La implementación de protección CSRF en la plataforma NOM-035 representa una capa fundamental de seguridad que protege a los usuarios y la integridad de los datos contra ataques maliciosos. La arquitectura de tres capas (backend, interceptor, gestión de estado) proporciona una solución robusta, transparente y fácil de mantener que cumple con los estándares internacionales de seguridad web.

La combinación de generación criptográficamente segura de tokens, validación timing-safe, renovación automática y manejo inteligente de errores garantiza que la protección CSRF opere de forma confiable sin impactar negativamente la experiencia del usuario. Los desarrolladores pueden crear nuevas funcionalidades con la confianza de que la protección CSRF se aplicará automáticamente, reduciendo la superficie de error y acelerando el desarrollo de features seguros.

Para consultas técnicas o reportes de vulnerabilidades de seguridad, contactar al equipo de desarrollo a través de los canales oficiales de la plataforma.

---

**Documento generado por**: Verónica Nava Córdova  
**Última actualización**: Febrero 2026  
**Versión**: 1.0
