# Patrón de Implementación: Protección de Botones por Rol

Este documento describe el patrón implementado para proteger botones de acción según el rol del usuario.

## Componentes Disponibles

### 1. Hook `usePermissions()`

Ubicación: `client/src/hooks/usePermissions.ts`

Proporciona funciones para verificar permisos del usuario actual:

```typescript
import { usePermissions } from "@/hooks/usePermissions";

const { 
  hasPermission,      // Verifica un permiso específico
  hasAllPermissions,  // Verifica que tenga TODOS los permisos
  hasAnyPermission,   // Verifica que tenga AL MENOS UNO
  isAdmin,            // Verifica si es administrador
  // Atajos
  canCreate,
  canEdit,
  canDelete,
  canView,
  canExport,
  canApprove
} = usePermissions();
```

### 2. Componente `ProtectedButton`

Ubicación: `client/src/components/ProtectedButton.tsx`

Botón que verifica permisos antes de mostrarse o habilitarse.

**Props:**
- `requiredPermission`: Permiso único requerido
- `requiredPermissions`: Array de permisos requeridos
- `requireAll`: Si es true, requiere TODOS los permisos (por defecto false)
- `fallbackMessage`: Mensaje en tooltip cuando no tiene permisos
- `hideIfNoPermission`: Si es true, oculta el botón. Si es false, lo deshabilita (por defecto false)

## Permisos Disponibles

```typescript
type Permission = 
  | 'can_create'      // Crear nuevos registros
  | 'can_edit'        // Editar registros existentes
  | 'can_delete'      // Eliminar registros
  | 'can_view'        // Ver detalles de registros
  | 'can_export'      // Exportar datos
  | 'can_approve';    // Aprobar/rechazar solicitudes
```

## Matriz de Permisos por Rol

| Permiso | admin | user | instructor | committee |
|---------|-------|------|------------|-----------|
| can_create | ✅ | ❌ | ✅ | ❌ |
| can_edit | ✅ | ❌ | ✅ | ❌ |
| can_delete | ✅ | ❌ | ❌ | ❌ |
| can_view | ✅ | ✅ | ✅ | ✅ |
| can_export | ✅ | ✅ | ✅ | ❌ |
| can_approve | ✅ | ❌ | ❌ | ✅ |

## Ejemplos de Implementación

### Ejemplo 1: Botón de Crear (Ocultar si no tiene permisos)

**Antes:**
```tsx
<Link href="/employees/new">
  <Button>
    <Plus className="mr-2 h-4 w-4" />
    Agregar Trabajador
  </Button>
</Link>
```

**Después:**
```tsx
import ProtectedButton from "@/components/ProtectedButton";

<Link href="/employees/new">
  <ProtectedButton
    requiredPermission="can_create"
    fallbackMessage="Solo los administradores pueden agregar trabajadores"
    hideIfNoPermission
  >
    <Plus className="mr-2 h-4 w-4" />
    Agregar Trabajador
  </ProtectedButton>
</Link>
```

### Ejemplo 2: Botón de Editar/Eliminar (Deshabilitar si no tiene permisos)

**Antes:**
```tsx
<Button
  variant="ghost"
  size="sm"
  onClick={() => handleDeactivate(employee.id, employee.name)}
  disabled={deactivateMutation.isPending}
>
  Desactivar
</Button>
```

**Después:**
```tsx
import ProtectedButton from "@/components/ProtectedButton";

<ProtectedButton
  variant="ghost"
  size="sm"
  onClick={() => handleDeactivate(employee.id, employee.name)}
  disabled={deactivateMutation.isPending}
  requiredPermission="can_edit"
  fallbackMessage="Solo los administradores pueden desactivar trabajadores"
  hideIfNoPermission
>
  Desactivar
</ProtectedButton>
```

### Ejemplo 3: Botón de Generar Reporte

**Antes:**
```tsx
<Button
  type="submit"
  className="w-full"
  disabled={generateReport.isPending}
>
  {generateReport.isPending ? "Generando..." : "Generar Reporte"}
</Button>
```

**Después:**
```tsx
import ProtectedButton from "@/components/ProtectedButton";

<ProtectedButton
  type="submit"
  className="w-full"
  disabled={generateReport.isPending}
  requiredPermission="can_create"
  fallbackMessage="Solo los administradores pueden generar reportes STPS"
>
  {generateReport.isPending ? "Generando..." : "Generar Reporte"}
</ProtectedButton>
```

### Ejemplo 4: Botón con Múltiples Permisos (AL MENOS UNO)

```tsx
<ProtectedButton
  requiredPermissions={["can_edit", "can_delete"]}
  requireAll={false}  // AL MENOS UNO (por defecto)
  onClick={handleAction}
>
  Modificar
</ProtectedButton>
```

### Ejemplo 5: Botón con Múltiples Permisos (TODOS)

```tsx
<ProtectedButton
  requiredPermissions={["can_edit", "can_approve"]}
  requireAll={true}  // TODOS los permisos
  onClick={handleApprove}
>
  Aprobar y Publicar
</ProtectedButton>
```

### 3. Componente `ProtectedAction`

Ubicación: `client/src/components/ProtectedAction.tsx`

Protege enlaces, acciones y elementos que no son botones.

**Props:** (mismas que ProtectedButton)

**Ejemplo:**
```tsx
import ProtectedAction from "@/components/ProtectedAction";
import { Link } from "wouter";

// Ocultar enlace si no tiene permisos
<ProtectedAction
  requiredPermission="can_create"
  fallbackMessage="Solo administradores pueden crear"
  hideIfNoPermission
>
  <Link href="/create">Crear Nuevo</Link>
</ProtectedAction>

// Deshabilitar enlace con tooltip
<ProtectedAction
  requiredPermission="can_edit"
  fallbackMessage="No tienes permisos para editar"
>
  <a href="/edit" className="text-blue-500">Editar</a>
</ProtectedAction>
```

## Páginas Implementadas

✅ **Employees.tsx** - Gestión de Trabajadores
- Botón "Agregar Trabajador" (can_create, oculto)
- Botón "Desactivar" (can_edit, oculto)
- Botón "Reactivar" (can_edit, oculto)

✅ **DC2Form.tsx** - Generación de Reporte DC-2
- Botón "Generar DC-2" (can_create, deshabilitado con tooltip)

✅ **Departments.tsx** - Gestión de Departamentos
- Botón "Nuevo Departamento" (can_create, oculto)
- Botones "Editar" y "Eliminar" (can_edit, can_delete, ocultos)

✅ **Positions.tsx** - Gestión de Puestos
- Botón "Nuevo Puesto" (can_create, oculto)
- Botones "Editar" y "Eliminar" (can_edit, can_delete, ocultos)

✅ **Courses.tsx** - Gestión de Cursos
- Botón "Crear Curso" (can_create O can_edit, oculto)
- Botón "Editar" (can_create O can_edit, oculto)

✅ **Cases.tsx** - Gestión de Casos
- Botón "Registrar Caso" (can_create, oculto)
- Botones "Editar" y "Seguimiento" (can_edit, ocultos)

## Páginas Pendientes de Implementación

Aplicar el mismo patrón en las siguientes páginas:

### Gestión de Talento
- [ ] **EmployeeProfile.tsx** - Botones: Editar, Desactivar

### Capacitación y Desarrollo
- [ ] **AssessmentsManagement.tsx** - Botones: Crear, Editar, Eliminar
- [ ] **TrainingCertificates.tsx** - Botones: Generar, Descargar

### Casos y Comité
- [ ] **CaseDetail.tsx** - Botones: Agregar Seguimiento, Cambiar Estado
- [ ] **Committee.tsx** - Botones: Agregar Miembro, Editar, Eliminar
- [ ] **CommitteeMinutesManagement.tsx** - Botones: Crear, Editar, Finalizar

### Documentos
- [ ] **Documents.tsx** - Botones: Generar, Descargar, Eliminar
- [ ] **DocumentFormats.tsx** - Botones: Crear, Editar, Eliminar

### Encuestas NOM-035
- [ ] **SurveysAdminPanel.tsx** - Botones: Crear Periodo, Enviar Encuestas
- [ ] **Nom035AdminPanel.tsx** - Botones: Generar Reporte, Exportar

### Reportes y Notificaciones
- [ ] **STPSReports.tsx** - Botones: Generar DC-3, DC-4 (pendientes)
- [ ] **NotificationsDashboard.tsx** - Botones: Enviar, Eliminar
- [ ] **Mailbox.tsx** - Botones: Responder, Archivar, Eliminar

### Otros Módulos
- [ ] **CompanySettings.tsx** - Botones: Guardar Cambios
- [ ] **EarlyWarnings.tsx** - Botones: Crear Alerta, Resolver
- [ ] **SecurityAlerts.tsx** - Botones: Marcar como Revisado
- [ ] **AgreementsDashboard.tsx** - Botones: Crear, Editar, Completar

## Pasos para Implementar en una Nueva Página

1. **Importar el componente:**
```tsx
import ProtectedButton from "@/components/ProtectedButton";
```

2. **Reemplazar `Button` con `ProtectedButton`:**
```tsx
// Antes
<Button onClick={handleAction}>Acción</Button>

// Después
<ProtectedButton
  requiredPermission="can_create"
  fallbackMessage="No tienes permisos para esta acción"
  hideIfNoPermission  // Opcional: ocultar en lugar de deshabilitar
  onClick={handleAction}
>
  Acción
</ProtectedButton>
```

3. **Elegir el permiso apropiado:**
- `can_create` para botones de crear/agregar
- `can_edit` para botones de editar/modificar/activar/desactivar
- `can_delete` para botones de eliminar
- `can_approve` para botones de aprobar/rechazar
- `can_export` para botones de exportar/descargar

4. **Decidir comportamiento:**
- `hideIfNoPermission={true}` - Oculta el botón completamente
- `hideIfNoPermission={false}` (por defecto) - Deshabilita el botón y muestra tooltip

## Notas Importantes

- **Seguridad en Backend:** La protección de botones en frontend es solo UX. SIEMPRE valida permisos en el backend usando `protectedProcedure` o `adminProcedure` en tRPC.

- **Consistencia:** Usa el mismo permiso para acciones similares en todo el sistema.

- **Mensajes Claros:** Proporciona mensajes de fallback descriptivos que expliquen por qué el usuario no puede realizar la acción.

- **Testing:** Prueba con diferentes roles (admin, user) para verificar que los botones se muestran/ocultan correctamente.

## Extender la Matriz de Permisos

Si necesitas agregar más roles o permisos, edita:

1. **Hook usePermissions.ts:**
```typescript
const PERMISSIONS_MATRIX: Record<string, Permission[]> = {
  admin: [...],
  user: [...],
  nuevo_rol: ['can_view', 'can_export'],  // Agregar aquí
};
```

2. **Actualizar el schema de base de datos** si es necesario agregar nuevos roles en la tabla `user`.

## Soporte

Para dudas o problemas con la implementación, consulta:
- Hook: `client/src/hooks/usePermissions.ts`
- Componente: `client/src/components/ProtectedButton.tsx`
- Ejemplos: `client/src/pages/Employees.tsx`, `client/src/components/stps/DC2Form.tsx`
