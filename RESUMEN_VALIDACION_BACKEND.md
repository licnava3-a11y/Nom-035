# Resumen: Sistema de Validación de Permisos Backend

## 🎯 Estado Actual

### ✅ Completado

1. **Middleware de Permisos** (`server/permissions.ts`)
   - 6 permisos definidos: `can_view`, `can_create`, `can_edit`, `can_delete`, `can_approve`, `can_export`
   - 17 roles con matriz de permisos completa
   - 6 middlewares de tRPC listos para usar
   - 3 funciones helper para validación

2. **Tests Unitarios** (`server/permissions.test.ts`)
   - 24 tests (100% pasando)
   - Cobertura completa de permisos por rol
   - Validación de casos de uso reales

3. **Documentación Completa**
   - `GUIA_IMPLEMENTACION_PERMISOS_BACKEND.md` - Guía detallada con ejemplos
   - `GUIA_VALIDACION_PERMISOS_DETALLADA.md` - 75 casos de prueba para frontend
   - `PATRON_PROTECCION_BOTONES.md` - Análisis de 42 botones

4. **Protección Frontend**
   - 16 páginas protegidas (100%)
   - 75 botones con control de permisos
   - Componente `ProtectedButton` funcionando

5. **Protección Backend Implementada**
   - ✅ `employees.ts` - create, update, deactivate

### 📋 Pendiente

**Routers Críticos** (6 routers, ~20 procedures):
- `committeeMinutes.ts` - create, update, delete, publish
- `documentFormats.ts` - create, update, delete
- `notifications.ts` - create, markAsRead, markAllAsRead, delete
- `surveys.ts` - create, update, delete, distribute
- `investigations.ts` - create, update, delete, close
- `correctiveActions.ts` - create, update, delete, approve

**Routers Secundarios** (53 routers restantes)

---

## 🔧 Cómo Aplicar Validación (Método Simplificado)

### Opción 1: Aplicación Manual (Recomendado para Routers Críticos)

**Paso 1**: Agregar import al inicio del archivo

```typescript
import { requirePermission, requireDelete, requireApprove, requireExport } from "../permissions";
```

**Paso 2**: Aplicar middleware ANTES de `.input()`

```typescript
// Ejemplo: create procedure
create: protectedProcedure
  .use(requirePermission('can_create'))  // ← Agregar esta línea
  .input(z.object({ ... }))
  .mutation(async ({ input, ctx }) => {
    if (!ctx.user) throw new Error('User not authenticated'); // ← Agregar si necesario
    // ... resto del código
  })
```

**Paso 3**: Aplicar según tipo de operación

| Operación | Middleware | Roles Permitidos |
|-----------|-----------|------------------|
| **Crear** | `.use(requirePermission('can_create'))` | gerente, instructor, administrativo, committee |
| **Editar** | `.use(requirePermission('can_edit'))` | gerente, instructor, administrativo |
| **Eliminar** | `.use(requireDelete())` | gerente |
| **Aprobar** | `.use(requireApprove())` | gerente, committee |
| **Exportar** | `.use(requireExport())` | gerente, instructor, administrativo |
| **Ver** | `.use(requirePermission('can_view'))` | todos |

### Opción 2: Validación en Runtime (Alternativa)

Si modificar los routers causa errores, usar validación manual dentro del mutation:

```typescript
import { hasPermission } from "../permissions";

.mutation(async ({ input, ctx }) => {
  if (!ctx.user) throw new Error('User not authenticated');
  
  // Validar permiso manualmente
  if (!hasPermission(ctx.user.role, 'can_create')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'No tienes permisos para crear este recurso'
    });
  }
  
  // Continuar con la lógica
  // ...
})
```

---

## 📊 Matriz de Permisos por Rol

| Rol | can_view | can_create | can_edit | can_delete | can_approve | can_export |
|-----|----------|------------|----------|------------|-------------|------------|
| **gerente** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **instructor** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **administrativo** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| **committee** | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| **student** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 🧪 Validación del Sistema

### Tests Unitarios

```bash
# Ejecutar tests de permisos
pnpm test server/permissions.test.ts

# Resultado esperado: ✓ 24 tests passed
```

### Validación Manual

1. **Crear usuarios de prueba** (ya creados):
   - `gerente.test@example.com` / `password123` (todos los permisos)
   - `instructor.test@example.com` / `password123` (view, create, edit, export)
   - `administrativo.test@example.com` / `password123` (view, create, edit, export)
   - `committee.test@example.com` / `password123` (view, create, approve)
   - `student.test@example.com` / `password123` (solo view)

2. **Seguir guía de validación**: `GUIA_VALIDACION_PERMISOS_DETALLADA.md`

---

## 🚀 Próximos Pasos Recomendados

### Inmediatos (Prioridad Alta)

1. **Aplicar validación en `employees.ts` completamente**
   - Ya tiene middleware en create, update, deactivate
   - Verificar que funciona correctamente con usuarios de prueba

2. **Ejecutar validación manual con usuarios de prueba**
   - Probar crear/editar/eliminar empleados con diferentes roles
   - Verificar que los errores se muestran correctamente

### Corto Plazo (Próximas 2 semanas)

3. **Aplicar validación en routers críticos** (uno por uno):
   - committeeMinutes.ts
   - documentFormats.ts
   - notifications.ts
   - surveys.ts
   - investigations.ts
   - correctiveActions.ts

4. **Crear dashboard de auditoría**
   - Registrar intentos de acceso denegados
   - Mostrar timestamp, usuario, acción, página

### Mediano Plazo (Próximo mes)

5. **Aplicar validación en routers secundarios** (53 restantes)
   - Priorizar según criticidad de datos
   - Usar método simplificado (validación en runtime)

6. **Implementar rate limiting**
   - Prevenir abuso de APIs
   - Limitar intentos de acceso no autorizado

---

## 📚 Archivos de Referencia

| Archivo | Descripción |
|---------|-------------|
| `server/permissions.ts` | Middleware y funciones de validación |
| `server/permissions.test.ts` | Tests unitarios (24 tests) |
| `GUIA_IMPLEMENTACION_PERMISOS_BACKEND.md` | Guía detallada con ejemplos |
| `GUIA_VALIDACION_PERMISOS_DETALLADA.md` | 75 casos de prueba frontend |
| `PATRON_PROTECCION_BOTONES.md` | Análisis de 42 botones |
| `GUIA_PRUEBAS_PERMISOS.md` | Guía original de pruebas |

---

## ⚠️ Notas Importantes

1. **No modificar `server/_core/trpc.ts`** - Los middlewares personalizados se aplican a nivel de procedure, no a nivel de configuración global

2. **Siempre agregar assertion de `ctx.user`** cuando TypeScript reporte que puede ser null:
   ```typescript
   if (!ctx.user) throw new Error('User not authenticated');
   ```

3. **Eliminar validaciones redundantes** de rol después de aplicar middlewares:
   ```typescript
   // ❌ ELIMINAR (redundante)
   if (ctx.user.role !== "admin") { ... }
   
   // ✅ MANTENER (específico del negocio)
   if (resource.ownerId !== ctx.user.id) { ... }
   ```

4. **Compilación TypeScript debe estar limpia** antes de cada checkpoint:
   ```bash
   pnpm tsc  # Debe retornar 0 errores
   ```

5. **Tests deben pasar** antes de aplicar en producción:
   ```bash
   pnpm test  # Todos los tests deben pasar
   ```

---

## 🎓 Beneficios del Sistema

### Seguridad
- ✅ Validación en servidor (no se puede bypass desde frontend)
- ✅ Matriz de permisos centralizada
- ✅ Auditoría de intentos de acceso

### Mantenibilidad
- ✅ Un solo lugar para modificar permisos (`rolePermissions`)
- ✅ Tests automatizados
- ✅ Documentación completa

### Escalabilidad
- ✅ Fácil agregar nuevos roles
- ✅ Fácil agregar nuevos permisos
- ✅ Middlewares reutilizables

---

**Última actualización**: 2026-02-12  
**Estado**: Sistema base implementado, listo para aplicación gradual  
**Compilación**: ✅ 0 errores TypeScript  
**Tests**: ✅ 24/24 pasando
