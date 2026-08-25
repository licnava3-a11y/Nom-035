# Guía de Pruebas Manuales - Sistema de Permisos por Rol

Este documento describe cómo validar manualmente que el sistema de protección de botones funciona correctamente según el rol del usuario.

## Usuarios de Prueba Creados

| Email                          | Rol            | Permisos Esperados                                      |
| ------------------------------ | -------------- | ------------------------------------------------------- |
| gerente.prueba@test.com        | gerente        | can_create, can_edit, can_view, can_export, can_approve |
| instructor.prueba@test.com     | instructor     | can_create, can_edit, can_view, can_export              |
| administrativo.prueba@test.com | administrativo | can_view, can_export                                    |
| committee.prueba@test.com      | committee      | can_view, can_approve                                   |
| student.prueba@test.com        | student        | can_view, can_export                                    |

## Matriz de Permisos por Rol

| Permiso     | admin | gerente | instructor | administrativo | committee | student |
| ----------- | ----- | ------- | ---------- | -------------- | --------- | ------- |
| can_create  | ✅    | ✅      | ✅         | ❌             | ❌        | ❌      |
| can_edit    | ✅    | ✅      | ✅         | ❌             | ❌        | ❌      |
| can_delete  | ✅    | ✅      | ❌         | ❌             | ❌        | ❌      |
| can_view    | ✅    | ✅      | ✅         | ✅             | ✅        | ✅      |
| can_export  | ✅    | ✅      | ✅         | ✅             | ❌        | ✅      |
| can_approve | ✅    | ✅      | ❌         | ❌             | ✅        | ❌      |

## Páginas con Protección Implementada (7/16)

### 1. Employees.tsx (Trabajadores)

**Botones protegidos:**

- "Agregar Trabajador" → `can_create`, oculto si no tiene permisos
- "Desactivar" → `can_delete`, deshabilitado si no tiene permisos
- "Reactivar" → `can_edit`, deshabilitado si no tiene permisos

**Pruebas esperadas:**
| Rol | Agregar | Desactivar | Reactivar |
|-----|---------|------------|-----------|
| admin | ✅ Visible | ✅ Habilitado | ✅ Habilitado |
| gerente | ✅ Visible | ✅ Habilitado | ✅ Habilitado |
| instructor | ✅ Visible | ❌ Deshabilitado | ✅ Habilitado |
| administrativo | ❌ Oculto | ❌ Deshabilitado | ❌ Deshabilitado |
| committee | ❌ Oculto | ❌ Deshabilitado | ❌ Deshabilitado |
| student | ❌ Oculto | ❌ Deshabilitado | ❌ Deshabilitado |

### 2. Departments.tsx (Departamentos)

**Botones protegidos:**

- "Crear Departamento" → `can_create`, oculto
- "Editar" → `can_edit`, deshabilitado
- "Eliminar" → `can_delete`, deshabilitado

**Pruebas esperadas:**
| Rol | Crear | Editar | Eliminar |
|-----|-------|--------|----------|
| admin | ✅ | ✅ | ✅ |
| gerente | ✅ | ✅ | ✅ |
| instructor | ✅ | ✅ | ❌ |
| administrativo | ❌ | ❌ | ❌ |
| committee | ❌ | ❌ | ❌ |
| student | ❌ | ❌ | ❌ |

### 3. Positions.tsx (Puestos)

**Botones protegidos:**

- "Crear Puesto" → `can_create`, oculto
- "Editar" → `can_edit`, deshabilitado
- "Eliminar" → `can_delete`, deshabilitado

**Pruebas esperadas:** (Igual que Departments)

### 4. Courses.tsx (Cursos)

**Botones protegidos:**

- "Crear Curso" → `can_create O can_edit`, oculto
- "Editar" → `can_create O can_edit`, deshabilitado

**Pruebas esperadas:**
| Rol | Crear | Editar |
|-----|-------|--------|
| admin | ✅ | ✅ |
| gerente | ✅ | ✅ |
| instructor | ✅ | ✅ |
| administrativo | ❌ | ❌ |
| committee | ❌ | ❌ |
| student | ❌ | ❌ |

### 5. Cases.tsx (Casos)

**Botones protegidos:**

- "Crear Caso" → `can_create`, oculto
- "Editar" → `can_edit`, deshabilitado
- "Cerrar" → `can_approve`, deshabilitado

**Pruebas esperadas:**
| Rol | Crear | Editar | Cerrar |
|-----|-------|--------|--------|
| admin | ✅ | ✅ | ✅ |
| gerente | ✅ | ✅ | ✅ |
| instructor | ✅ | ✅ | ❌ |
| administrativo | ❌ | ❌ | ❌ |
| committee | ❌ | ❌ | ✅ |
| student | ❌ | ❌ | ❌ |

### 6. Committee.tsx (Comité)

**Botones protegidos:**

- "Agregar Miembro" → `can_create`, oculto
- "Editar" → `can_edit`, oculto
- "Ver Perfil" → Visible para todos

**Pruebas esperadas:**
| Rol | Agregar | Editar | Ver Perfil |
|-----|---------|--------|------------|
| admin | ✅ | ✅ | ✅ |
| gerente | ✅ | ✅ | ✅ |
| instructor | ✅ | ✅ | ✅ |
| administrativo | ❌ | ❌ | ✅ |
| committee | ❌ | ❌ | ✅ |
| student | ❌ | ❌ | ✅ |

### 7. DC2Form.tsx (Reportes STPS)

**Botones protegidos:**

- "Generar Reporte DC-2" → `can_create`, oculto

**Pruebas esperadas:**
| Rol | Generar |
|-----|---------|
| admin | ✅ |
| gerente | ✅ |
| instructor | ✅ |
| administrativo | ❌ |
| committee | ❌ |
| student | ❌ |

## Procedimiento de Prueba

Para cada página listada arriba:

1. **Iniciar sesión** con uno de los usuarios de prueba
2. **Navegar** a la página correspondiente
3. **Verificar** que los botones se comportan según la tabla de pruebas esperadas:
   - ✅ = Botón visible y habilitado
   - ❌ Oculto = Botón no aparece en la interfaz
   - ❌ Deshabilitado = Botón aparece pero está deshabilitado (gris) con tooltip informativo
4. **Documentar** cualquier discrepancia en la tabla de resultados

## Resultados de Pruebas

### Employees.tsx

| Rol            | Agregar | Desactivar | Reactivar | Estado       |
| -------------- | ------- | ---------- | --------- | ------------ |
| admin          |         |            |           | ⏳ Pendiente |
| gerente        |         |            |           | ⏳ Pendiente |
| instructor     |         |            |           | ⏳ Pendiente |
| administrativo |         |            |           | ⏳ Pendiente |
| committee      |         |            |           | ⏳ Pendiente |
| student        |         |            |           | ⏳ Pendiente |

### Departments.tsx

| Rol            | Crear | Editar | Eliminar | Estado       |
| -------------- | ----- | ------ | -------- | ------------ |
| admin          |       |        |          | ⏳ Pendiente |
| gerente        |       |        |          | ⏳ Pendiente |
| instructor     |       |        |          | ⏳ Pendiente |
| administrativo |       |        |          | ⏳ Pendiente |
| committee      |       |        |          | ⏳ Pendiente |
| student        |       |        |          | ⏳ Pendiente |

### Positions.tsx

| Rol            | Crear | Editar | Eliminar | Estado       |
| -------------- | ----- | ------ | -------- | ------------ |
| admin          |       |        |          | ⏳ Pendiente |
| gerente        |       |        |          | ⏳ Pendiente |
| instructor     |       |        |          | ⏳ Pendiente |
| administrativo |       |        |          | ⏳ Pendiente |
| committee      |       |        |          | ⏳ Pendiente |
| student        |       |        |          | ⏳ Pendiente |

### Courses.tsx

| Rol            | Crear | Editar | Estado       |
| -------------- | ----- | ------ | ------------ |
| admin          |       |        | ⏳ Pendiente |
| gerente        |       |        | ⏳ Pendiente |
| instructor     |       |        | ⏳ Pendiente |
| administrativo |       |        | ⏳ Pendiente |
| committee      |       |        | ⏳ Pendiente |
| student        |       |        | ⏳ Pendiente |

### Cases.tsx

| Rol            | Crear | Editar | Cerrar | Estado       |
| -------------- | ----- | ------ | ------ | ------------ |
| admin          |       |        |        | ⏳ Pendiente |
| gerente        |       |        |        | ⏳ Pendiente |
| instructor     |       |        |        | ⏳ Pendiente |
| administrativo |       |        |        | ⏳ Pendiente |
| committee      |       |        |        | ⏳ Pendiente |
| student        |       |        |        | ⏳ Pendiente |

### Committee.tsx

| Rol            | Agregar | Editar | Ver Perfil | Estado       |
| -------------- | ------- | ------ | ---------- | ------------ |
| admin          |         |        |            | ⏳ Pendiente |
| gerente        |         |        |            | ⏳ Pendiente |
| instructor     |         |        |            | ⏳ Pendiente |
| administrativo |         |        |            | ⏳ Pendiente |
| committee      |         |        |            | ⏳ Pendiente |
| student        |         |        |            | ⏳ Pendiente |

### DC2Form.tsx

| Rol            | Generar | Estado       |
| -------------- | ------- | ------------ |
| admin          |         | ⏳ Pendiente |
| gerente        |         | ⏳ Pendiente |
| instructor     |         | ⏳ Pendiente |
| administrativo |         | ⏳ Pendiente |
| committee      |         | ⏳ Pendiente |
| student        |         | ⏳ Pendiente |

## Notas

- Los usuarios de prueba fueron creados en la base de datos pero requieren autenticación OAuth de Manus para iniciar sesión
- Para realizar las pruebas, necesitarás crear usuarios OAuth válidos o modificar temporalmente el sistema de autenticación
- Cualquier discrepancia encontrada debe documentarse en la sección de resultados con detalles específicos
