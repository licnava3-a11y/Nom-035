# Guía de Implementación: Validación de Permisos en Backend (tRPC Procedures)

## 📋 Índice

1. [Introducción](#introducción)
2. [Middleware de Permisos](#middleware-de-permisos)
3. [Cómo Aplicar Validación](#cómo-aplicar-validación)
4. [Routers Implementados](#routers-implementados)
5. [Routers Pendientes](#routers-pendientes)
6. [Ejemplos de Implementación](#ejemplos-de-implementación)
7. [Tests Unitarios](#tests-unitarios)
8. [Troubleshooting](#troubleshooting)

---

## Introducción

Este documento describe cómo implementar la validación de permisos en el backend (tRPC procedures) para asegurar que las acciones protegidas se validan en el servidor, complementando la protección del frontend con una capa de seguridad robusta.

### Objetivos

- **Seguridad en el servidor**: Validar permisos antes de ejecutar operaciones sensibles
- **Prevenir bypass**: Evitar que usuarios manipulen requests para ejecutar acciones no autorizadas
- **Consistencia**: Mantener la misma matriz de permisos que el frontend
- **Auditoría**: Facilitar el registro de intentos de acceso no autorizados

### Matriz de Permisos

| Rol                | can_view | can_create | can_edit | can_delete | can_approve | can_export |
| ------------------ | -------- | ---------- | -------- | ---------- | ----------- | ---------- |
| **gerente**        | ✅       | ✅         | ✅       | ✅         | ✅          | ✅         |
| **instructor**     | ✅       | ✅         | ✅       | ❌         | ❌          | ✅         |
| **administrativo** | ✅       | ✅         | ✅       | ❌         | ❌          | ✅         |
| **committee**      | ✅       | ✅         | ❌       | ❌         | ✅          | ❌         |
| **student**        | ✅       | ❌         | ❌       | ❌         | ❌          | ❌         |

---

## Middleware de Permisos

### Archivo: `server/permissions.ts`

El sistema de permisos está implementado en `server/permissions.ts` y proporciona:

#### Funciones Helper

```typescript
// Verificar un permiso específico
hasPermission(userRole: string, requiredPermission: Permission): boolean

// Verificar si tiene al menos uno de los permisos (OR lógico)
hasAnyPermission(userRole: string, requiredPermissions: Permission[]): boolean

// Verificar si tiene todos los permisos (AND lógico)
hasAllPermissions(userRole: string, requiredPermissions: Permission[]): boolean

// Obtener lista de permisos de un rol
getUserPermissions(userRole: string): Permission[]

// Validar si un rol existe
isValidRole(role: string): boolean
```

#### Middlewares de tRPC

```typescript
// Middleware genérico para un permiso específico
requirePermission(requiredPermission: Permission)

// Middleware para al menos uno de los permisos
requireAnyPermission(requiredPermissions: Permission[])

// Middleware para todos los permisos
requireAllPermissions(requiredPermissions: Permission[])

// Middlewares especializados
requireDelete()    // Solo gerente
requireApprove()   // Gerente y committee
requireExport()    // Gerente, instructor y administrativo
```

---

## Cómo Aplicar Validación

### Paso 1: Importar Middlewares

Agregar el import al inicio del archivo del router:

```typescript
import {
  requirePermission,
  requireDelete,
  requireApprove,
  requireExport,
  requireAnyPermission,
} from "../permissions";
```

### Paso 2: Aplicar Middleware en Procedures

Usar `.use()` para aplicar el middleware **antes** de `.input()`:

```typescript
// ❌ INCORRECTO - middleware después de input
create: protectedProcedure
  .input(z.object({ ... }))
  .use(requirePermission('can_create'))  // ← Muy tarde
  .mutation(async ({ input, ctx }) => { ... })

// ✅ CORRECTO - middleware antes de input
create: protectedProcedure
  .use(requirePermission('can_create'))  // ← Correcto
  .input(z.object({ ... }))
  .mutation(async ({ input, ctx }) => { ... })
```

### Paso 3: Eliminar Validaciones Redundantes

Los middlewares ya validan autenticación y permisos, por lo que las validaciones manuales de rol son redundantes:

```typescript
// ❌ INCORRECTO - validación redundante
create: protectedProcedure
  .use(requirePermission('can_create'))
  .input(z.object({ ... }))
  .mutation(async ({ input, ctx }) => {
    // Esta validación es redundante
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "..." });
    }
    // ...
  })

// ✅ CORRECTO - sin validación redundante
create: protectedProcedure
  .use(requirePermission('can_create'))
  .input(z.object({ ... }))
  .mutation(async ({ input, ctx }) => {
    // El middleware ya validó el permiso
    // Proceder directamente con la lógica
    return await db.insert(...);
  })
```

### Paso 4: Agregar Assertion de ctx.user (si es necesario)

Si TypeScript reporta que `ctx.user` puede ser null, agregar assertion al inicio:

```typescript
.mutation(async ({ input, ctx }) => {
  if (!ctx.user) throw new Error('User not authenticated');

  // Ahora TypeScript sabe que ctx.user no es null
  const userId = ctx.user.id;
  // ...
})
```

---

## Routers Implementados

### ✅ Completados

| Router                 | Procedures Protegidos                     | Estado                     |
| ---------------------- | ----------------------------------------- | -------------------------- |
| **employees.ts**       | create, update, deactivate                | ✅ Implementado y testeado |
| **documentFormats.ts** | create, update, delete                    | ✅ Implementado            |
| **notifications.ts**   | create, markAsRead, markAllAsRead, delete | ✅ Implementado            |

---

## Routers Pendientes

### 📋 Routers Críticos (Prioridad Alta)

Estos routers corresponden a las páginas protegidas identificadas en la guía de validación:

| Router                   | Procedures a Proteger              | Permisos Requeridos                           |
| ------------------------ | ---------------------------------- | --------------------------------------------- |
| **committeeMinutes.ts**  | create, update, delete, publish    | can_create, can_edit, can_delete, can_approve |
| **surveys.ts**           | create, update, delete, distribute | can_create, can_edit, can_delete              |
| **surveysAdmin.ts**      | export, generateReport             | can_export                                    |
| **investigations.ts**    | create, update, delete, close      | can_create, can_edit, can_delete, can_approve |
| **correctiveActions.ts** | create, update, delete, approve    | can_create, can_edit, can_delete, can_approve |
| **training.ts**          | create, update, delete, publish    | can_create, can_edit, can_delete, can_approve |

### 📋 Routers Secundarios (Prioridad Media)

| Router             | Procedures a Proteger           | Permisos Requeridos                           |
| ------------------ | ------------------------------- | --------------------------------------------- |
| **documents.ts**   | create, update, delete          | can_create, can_edit, can_delete              |
| **signatures.ts**  | create, update, delete          | can_create, can_edit, can_delete              |
| **hiring.ts**      | create, update, delete, approve | can_create, can_edit, can_delete, can_approve |
| **jobProfiles.ts** | create, update, delete          | can_create, can_edit, can_delete              |
| **departments.ts** | create, update, delete          | can_create, can_edit, can_delete              |
| **positions.ts**   | create, update, delete          | can_create, can_edit, can_delete              |

---

## Ejemplos de Implementación

### Ejemplo 1: Procedure de Creación Simple

```typescript
// employees.ts
import { requirePermission } from "../permissions";

export const employeesRouter = router({
  create: protectedProcedure
    .use(requirePermission("can_create"))
    .input(
      z.object({
        firstName: z.string(),
        lastName: z.string(),
        email: z.string().email(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("User not authenticated");

      return await employeesDb.createEmployee({
        ...input,
        createdBy: ctx.user.id,
      });
    }),
});
```

### Ejemplo 2: Procedure de Actualización

```typescript
// documentFormats.ts
import { requirePermission } from "../permissions";

export const documentFormatsRouter = router({
  update: protectedProcedure
    .use(requirePermission("can_edit"))
    .input(
      z.object({
        id: z.number(),
        codigo: z.string().optional(),
        nombre: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...updateData } = input;

      const existing = await db
        .select()
        .from(documentFormats)
        .where(eq(documentFormats.id, id))
        .limit(1);

      if (!existing[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Formato no encontrado",
        });
      }

      await db
        .update(documentFormats)
        .set(updateData)
        .where(eq(documentFormats.id, id));

      return { success: true };
    }),
});
```

### Ejemplo 3: Procedure de Eliminación

```typescript
// employees.ts
import { requireDelete } from "../permissions";

export const employeesRouter = router({
  deactivate: protectedProcedure
    .use(requireDelete())
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("User not authenticated");

      const employee = await employeesDb.getEmployeeById(input.id);
      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }

      await employeesDb.deactivateEmployee(input.id);

      return {
        success: true,
        message: "Empleado desactivado exitosamente",
      };
    }),
});
```

### Ejemplo 4: Procedure de Aprobación

```typescript
// committeeMinutes.ts
import { requireApprove } from "../permissions";

export const committeeMinutesRouter = router({
  publish: protectedProcedure
    .use(requireApprove())
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("User not authenticated");

      await db
        .update(committeeMinutes)
        .set({
          status: "finalizada",
          approvedBy: ctx.user.id,
          approvedAt: new Date(),
        })
        .where(eq(committeeMinutes.id, input.id));

      return { success: true };
    }),
});
```

### Ejemplo 5: Procedure con Permisos Múltiples (OR)

```typescript
// training.ts
import { requireAnyPermission } from "../permissions";

export const trainingRouter = router({
  saveDraft: protectedProcedure
    .use(requireAnyPermission(["can_create", "can_edit"]))
    .input(
      z.object({
        id: z.number().optional(),
        title: z.string(),
        content: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("User not authenticated");

      if (input.id) {
        // Actualizar borrador existente (requiere can_edit)
        return await db
          .update(trainingDrafts)
          .set({ title: input.title, content: input.content })
          .where(eq(trainingDrafts.id, input.id));
      } else {
        // Crear nuevo borrador (requiere can_create)
        return await db.insert(trainingDrafts).values({
          title: input.title,
          content: input.content,
          createdBy: ctx.user.id,
        });
      }
    }),
});
```

### Ejemplo 6: Procedure de Exportación

```typescript
// surveysAdmin.ts
import { requireExport } from "../permissions";

export const surveysAdminRouter = router({
  exportToExcel: protectedProcedure
    .use(requireExport())
    .input(
      z.object({
        surveyId: z.number(),
        format: z.enum(["xlsx", "csv"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const data = await db
        .select()
        .from(surveyResponses)
        .where(eq(surveyResponses.surveyId, input.surveyId));

      const excelBuffer = await generateExcel(data, input.format);

      return {
        success: true,
        downloadUrl: `/api/downloads/${excelBuffer.filename}`,
      };
    }),
});
```

---

## Tests Unitarios

### Archivo: `server/permissions.test.ts`

El sistema incluye 24 tests unitarios que validan:

1. **Permisos individuales por rol** (6 tests)
   - Gerente tiene todos los permisos
   - Student solo tiene can_view
   - Instructor tiene view, create, edit, export
   - Committee tiene view, create, approve
   - Administrativo tiene view, create, edit, export

2. **Funciones helper** (6 tests)
   - hasPermission()
   - hasAnyPermission()
   - hasAllPermissions()

3. **Utilidades** (4 tests)
   - getUserPermissions()
   - isValidRole()

4. **Matriz completa** (2 tests)
   - Todos los roles definidos
   - Matriz coincide con documentación

5. **Casos de uso reales** (6 tests)
   - Crear empleado
   - Eliminar empleado
   - Aprobar minuta
   - Exportar a Excel
   - Guardar borrador

### Ejecutar Tests

```bash
# Ejecutar solo tests de permisos
pnpm test server/permissions.test.ts

# Ejecutar todos los tests
pnpm test

# Ejecutar tests en modo watch
pnpm test --watch
```

### Resultado Esperado

```
✓ server/permissions.test.ts (24 tests) 13ms
 Test Files  1 passed (1)
      Tests  24 passed (24)
```

---

## Troubleshooting

### Error: "ctx.user is possibly null"

**Causa**: TypeScript no detecta que el middleware ya validó la autenticación.

**Solución**: Agregar assertion al inicio del mutation:

```typescript
.mutation(async ({ input, ctx }) => {
  if (!ctx.user) throw new Error('User not authenticated');
  // Ahora TypeScript sabe que ctx.user no es null
})
```

### Error: "Transform failed with 1 error"

**Causa**: Error de sintaxis en el código (paréntesis, llaves, etc.).

**Solución**: Revisar la sintaxis del código, especialmente:

- Paréntesis de cierre de `.use()`
- Llaves de cierre de objetos
- Comas entre propiedades

### Error: "FORBIDDEN: No tienes permisos..."

**Causa**: El usuario no tiene el permiso requerido para la acción.

**Solución**: Verificar que:

1. El usuario tiene el rol correcto
2. El rol tiene el permiso en `rolePermissions`
3. El middleware correcto está aplicado

### Middleware no se ejecuta

**Causa**: El middleware está aplicado después de `.input()`.

**Solución**: Mover `.use()` antes de `.input()`:

```typescript
// ❌ INCORRECTO
.input(z.object({ ... }))
.use(requirePermission('can_create'))

// ✅ CORRECTO
.use(requirePermission('can_create'))
.input(z.object({ ... }))
```

### Validación redundante causa conflictos

**Causa**: Validación manual de rol después del middleware.

**Solución**: Eliminar la validación manual:

```typescript
// ❌ INCORRECTO - validación redundante
.mutation(async ({ input, ctx }) => {
  if (ctx.user.role !== "admin") {  // ← Eliminar esto
    throw new TRPCError({ code: "FORBIDDEN", ... });
  }
  // ...
})

// ✅ CORRECTO - confiar en el middleware
.mutation(async ({ input, ctx }) => {
  // El middleware ya validó el permiso
  // ...
})
```

---

## Checklist de Implementación

Para cada router que se implemente, verificar:

- [ ] Import de middlewares agregado al inicio del archivo
- [ ] Middlewares aplicados **antes** de `.input()` en cada procedure
- [ ] Validaciones redundantes de rol eliminadas
- [ ] Assertions de `ctx.user` agregadas si es necesario
- [ ] Compilación TypeScript sin errores (`pnpm tsc`)
- [ ] Tests unitarios pasando (`pnpm test`)
- [ ] Servidor funcionando correctamente
- [ ] Documentación actualizada en este archivo

---

## Próximos Pasos

1. **Aplicar validación en routers críticos** siguiendo los ejemplos de este documento
2. **Ejecutar tests** después de cada implementación para verificar que no se rompió nada
3. **Actualizar todo.md** marcando routers completados
4. **Crear checkpoint** una vez completados todos los routers críticos

---

## Referencias

- **Middleware de permisos**: `server/permissions.ts`
- **Tests unitarios**: `server/permissions.test.ts`
- **Guía de validación frontend**: `GUIA_VALIDACION_PERMISOS_DETALLADA.md`
- **Patrón de protección de botones**: `PATRON_PROTECCION_BOTONES.md`
- **Matriz de permisos**: Documentada en todos los archivos de guías

---

**Última actualización**: 2026-02-12  
**Autor**: Sistema de Validación de Permisos NOM-035
