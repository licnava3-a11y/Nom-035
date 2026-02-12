# Guía de Validación Detallada del Sistema de Permisos

**Plataforma de Capacitación NOM-035 STPS 2018**  
**Fecha de creación:** 12 de febrero de 2026  
**Versión:** 1.0

---

## 📋 Índice

1. [Introducción](#introducción)
2. [Usuarios de Prueba](#usuarios-de-prueba)
3. [Matriz de Permisos por Rol](#matriz-de-permisos-por-rol)
4. [Metodología de Pruebas](#metodología-de-pruebas)
5. [Casos de Prueba por Página](#casos-de-prueba-por-página)
6. [Plantillas de Registro](#plantillas-de-registro)
7. [Criterios de Aceptación](#criterios-de-aceptación)

---

## 1. Introducción

### Objetivo

Validar que el sistema de permisos basado en roles funciona correctamente en las **16 páginas protegidas** de la plataforma, asegurando que:

- Los botones se **ocultan** o **deshabilitan** según los permisos del usuario
- Los mensajes de error son **claros y apropiados**
- La experiencia de usuario es **consistente** en todas las páginas
- No existen **fugas de permisos** que permitan acciones no autorizadas

### Alcance

Esta guía cubre la validación de **75 botones protegidos** distribuidos en **16 páginas**:

- **7 páginas de gestión**: Workers, Courses, Cases, Instructors, Training, Surveys, CommitteeMinutesManagement
- **9 páginas de reportes y alertas**: Documents, DocumentFormats, SurveysAdminPanel, Nom035AdminPanel, Mailbox, NotificationsDashboard, AgreementsDashboard, EarlyWarnings, más 1 página adicional

### Componentes del Sistema de Permisos

1. **Hook `usePermissions()`**: Proporciona acceso a los permisos del usuario actual
2. **Componente `ProtectedButton`**: Envuelve botones con lógica de protección
3. **Componente `ProtectedAction`**: Protege acciones sin renderizar UI
4. **Componente `ProtectedRoute`**: Protege rutas completas (no cubierto en esta guía)

---

## 2. Usuarios de Prueba

### Credenciales de Acceso

Los siguientes usuarios han sido creados en la base de datos para pruebas:

| Usuario | Email | Rol | Departamento | Permisos Esperados |
|---------|-------|-----|--------------|-------------------|
| **Gerente Test** | gerente.test@example.com | `gerente` | Recursos Humanos | ✅ Todos los permisos (6/6) |
| **Instructor Test** | instructor.test@example.com | `instructor` | Capacitación | ✅ 4 permisos: view, create, edit, export |
| **Admin Test** | admin.test@example.com | `administrativo` | Administración | ✅ 4 permisos: view, create, edit, export |
| **Committee Test** | committee.test@example.com | `committee` | Comité NOM-035 | ✅ 3 permisos: view, create, approve |
| **Student Test** | student.test@example.com | `student` | Operaciones | ✅ 1 permiso: view |

### Contraseñas

**Nota:** Las contraseñas deben ser configuradas mediante el flujo de autenticación OAuth de Manus. Si los usuarios no existen en el sistema OAuth, deberán ser creados manualmente o mediante invitación.

### Proceso de Autenticación

1. Acceder a la plataforma en el navegador
2. Hacer clic en "Iniciar Sesión"
3. Ingresar el email del usuario de prueba
4. Completar el flujo de autenticación OAuth
5. Verificar que el dashboard muestre el rol correcto en la esquina superior derecha

---

## 3. Matriz de Permisos por Rol

### Tabla de Permisos

| Permiso | Gerente | Instructor | Administrativo | Committee | Student | Descripción |
|---------|---------|------------|----------------|-----------|---------|-------------|
| **can_view** | ✅ | ✅ | ✅ | ✅ | ✅ | Ver información y reportes |
| **can_create** | ✅ | ✅ | ✅ | ✅ | ❌ | Crear nuevos registros |
| **can_edit** | ✅ | ✅ | ✅ | ❌ | ❌ | Modificar registros existentes |
| **can_delete** | ✅ | ❌ | ❌ | ❌ | ❌ | Eliminar registros |
| **can_approve** | ✅ | ❌ | ❌ | ✅ | ❌ | Aprobar/finalizar documentos |
| **can_export** | ✅ | ✅ | ✅ | ❌ | ❌ | Exportar datos a Excel/PDF |

### Implementación en Código

```typescript
// client/src/hooks/usePermissions.ts
const rolePermissions: Record<string, Permission[]> = {
  gerente: ['can_view', 'can_create', 'can_edit', 'can_delete', 'can_approve', 'can_export'],
  instructor: ['can_view', 'can_create', 'can_edit', 'can_export'],
  administrativo: ['can_view', 'can_create', 'can_edit', 'can_export'],
  committee: ['can_view', 'can_create', 'can_approve'],
  student: ['can_view'],
};
```

---

## 4. Metodología de Pruebas

### Proceso General

Para cada página protegida, seguir estos pasos:

1. **Autenticarse** con cada uno de los 5 usuarios de prueba
2. **Navegar** a la página específica
3. **Identificar** todos los botones protegidos en la página
4. **Verificar** el comportamiento esperado según la matriz de permisos
5. **Registrar** los resultados en la plantilla correspondiente

### Comportamientos Esperados

#### Botón con `hideIfNoPermission={true}`

- **Con permiso**: Botón visible y funcional
- **Sin permiso**: Botón **completamente oculto** (no aparece en el DOM)

#### Botón sin `hideIfNoPermission` (comportamiento por defecto)

- **Con permiso**: Botón visible y funcional
- **Sin permiso**: Botón visible pero **deshabilitado** con tooltip explicativo

### Verificación de Tooltips

Al pasar el mouse sobre un botón deshabilitado, debe aparecer un tooltip con el mensaje configurado en `fallbackMessage`. Ejemplo:

```typescript
<ProtectedButton
  requiredPermission="can_create"
  fallbackMessage="No tienes permisos para crear trabajadores"
>
  Nuevo Trabajador
</ProtectedButton>
```

**Resultado esperado sin permiso**: Botón deshabilitado con tooltip "No tienes permisos para crear trabajadores"

### Verificación de Funcionalidad

Para botones habilitados, hacer clic y verificar que:

1. La acción se ejecuta correctamente
2. No aparecen errores en la consola del navegador
3. Los datos se guardan/modifican según corresponda

---

## 5. Casos de Prueba por Página

### 5.1. Workers.tsx (Gestión de Trabajadores)

**Ruta:** `/workers`  
**Total de botones protegidos:** 5

#### Tabla de Casos de Prueba

| # | Botón | Permiso Requerido | Comportamiento | Gerente | Instructor | Admin | Committee | Student |
|---|-------|-------------------|----------------|---------|------------|-------|-----------|---------|
| 1 | "Nuevo Trabajador" | `can_create` | Oculto si no tiene permiso | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | ❌ Oculto |
| 2 | "Editar" (trabajador) | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 3 | "Eliminar" (trabajador) | `can_delete` | Deshabilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 4 | "Exportar a Excel" | `can_export` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 5 | "Guardar" (formulario) | `can_create` O `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado |

#### Instrucciones Específicas

1. **Botón "Nuevo Trabajador"**: Verificar que desaparece completamente para el rol `student`
2. **Botón "Eliminar"**: Solo el gerente debe poder eliminar trabajadores
3. **Botón "Guardar"**: Verificar que funciona tanto para crear como para editar

---

### 5.2. Courses.tsx (Gestión de Cursos)

**Ruta:** `/courses`  
**Total de botones protegidos:** 5

#### Tabla de Casos de Prueba

| # | Botón | Permiso Requerido | Comportamiento | Gerente | Instructor | Admin | Committee | Student |
|---|-------|-------------------|----------------|---------|------------|-------|-----------|---------|
| 1 | "Nuevo Curso" | `can_create` | Oculto si no tiene permiso | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | ❌ Oculto |
| 2 | "Editar" (curso) | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 3 | "Eliminar" (curso) | `can_delete` | Deshabilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 4 | "Exportar a Excel" | `can_export` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 5 | "Guardar" (formulario) | `can_create` O `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado |

#### Instrucciones Específicas

1. **Botón "Nuevo Curso"**: Verificar que desaparece completamente para el rol `student`
2. **Botón "Exportar a Excel"**: Verificar que genera un archivo Excel válido
3. **Formulario de curso**: Verificar que los campos se validan correctamente antes de guardar

---

### 5.3. Cases.tsx (Gestión de Casos)

**Ruta:** `/cases`  
**Total de botones protegidos:** 5

#### Tabla de Casos de Prueba

| # | Botón | Permiso Requerido | Comportamiento | Gerente | Instructor | Admin | Committee | Student |
|---|-------|-------------------|----------------|---------|------------|-------|-----------|---------|
| 1 | "Nuevo Caso" | `can_create` | Oculto si no tiene permiso | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | ❌ Oculto |
| 2 | "Editar" (caso) | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 3 | "Eliminar" (caso) | `can_delete` | Deshabilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 4 | "Exportar a Excel" | `can_export` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 5 | "Guardar" (formulario) | `can_create` O `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado |

#### Instrucciones Específicas

1. **Botón "Nuevo Caso"**: Verificar que desaparece completamente para el rol `student`
2. **Botón "Eliminar"**: Solo el gerente debe poder eliminar casos
3. **Estados del caso**: Verificar que los cambios de estado se reflejan correctamente

---

### 5.4. Instructors.tsx (Gestión de Instructores)

**Ruta:** `/instructors`  
**Total de botones protegidos:** 5

#### Tabla de Casos de Prueba

| # | Botón | Permiso Requerido | Comportamiento | Gerente | Instructor | Admin | Committee | Student |
|---|-------|-------------------|----------------|---------|------------|-------|-----------|---------|
| 1 | "Nuevo Instructor" | `can_create` | Oculto si no tiene permiso | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | ❌ Oculto |
| 2 | "Editar" (instructor) | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 3 | "Eliminar" (instructor) | `can_delete` | Deshabilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 4 | "Exportar a Excel" | `can_export` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 5 | "Guardar" (formulario) | `can_create` O `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado |

#### Instrucciones Específicas

1. **Botón "Nuevo Instructor"**: Verificar que desaparece completamente para el rol `student`
2. **Certificaciones**: Verificar que se pueden agregar/editar certificaciones según permisos
3. **Documentación**: Verificar que la carga de documentos respeta los permisos

---

### 5.5. Training.tsx (Gestión de Capacitaciones)

**Ruta:** `/training`  
**Total de botones protegidos:** 5

#### Tabla de Casos de Prueba

| # | Botón | Permiso Requerido | Comportamiento | Gerente | Instructor | Admin | Committee | Student |
|---|-------|-------------------|----------------|---------|------------|-------|-----------|---------|
| 1 | "Nueva Capacitación" | `can_create` | Oculto si no tiene permiso | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | ❌ Oculto |
| 2 | "Editar" (capacitación) | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 3 | "Eliminar" (capacitación) | `can_delete` | Deshabilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 4 | "Exportar a Excel" | `can_export` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 5 | "Guardar" (formulario) | `can_create` O `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado |

#### Instrucciones Específicas

1. **Botón "Nueva Capacitación"**: Verificar que desaparece completamente para el rol `student`
2. **Asignación de participantes**: Verificar que se pueden asignar trabajadores según permisos
3. **Registro de asistencia**: Verificar que solo usuarios con `can_edit` pueden registrar asistencia

---

### 5.6. Surveys.tsx (Gestión de Encuestas)

**Ruta:** `/surveys`  
**Total de botones protegidos:** 5

#### Tabla de Casos de Prueba

| # | Botón | Permiso Requerido | Comportamiento | Gerente | Instructor | Admin | Committee | Student |
|---|-------|-------------------|----------------|---------|------------|-------|-----------|---------|
| 1 | "Nueva Encuesta" | `can_create` | Oculto si no tiene permiso | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | ❌ Oculto |
| 2 | "Editar" (encuesta) | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 3 | "Eliminar" (encuesta) | `can_delete` | Deshabilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 4 | "Exportar a Excel" | `can_export` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 5 | "Guardar" (formulario) | `can_create` O `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado |

#### Instrucciones Específicas

1. **Botón "Nueva Encuesta"**: Verificar que desaparece completamente para el rol `student`
2. **Tipos de encuesta**: Verificar que se pueden crear encuestas Guía I, II y III
3. **Asignación de trabajadores**: Verificar que se pueden asignar encuestas según permisos

---

### 5.7. CommitteeMinutesManagement.tsx (Gestión de Minutas)

**Ruta:** `/committee-minutes`  
**Total de botones protegidos:** 17

#### Tabla de Casos de Prueba

| # | Botón | Permiso Requerido | Comportamiento | Gerente | Instructor | Admin | Committee | Student |
|---|-------|-------------------|----------------|---------|------------|-------|-----------|---------|
| 1 | "Nueva Minuta" | `can_create` | Oculto si no tiene permiso | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | ❌ Oculto |
| 2 | "Agregar Asistente" | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 3 | "Eliminar Asistente" | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 4 | "Agregar Tema" | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 5 | "Eliminar Tema" | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 6 | "Agregar Acuerdo" | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 7 | "Eliminar Acuerdo" | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 8 | "Capturar Firma" | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 9 | "Guardar Borrador" | `can_create` O `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado |
| 10 | "Editar" (minuta) | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 11 | "Publicar/Finalizar" | `can_approve` | Deshabilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado | ✅ Habilitado | ❌ Deshabilitado |
| 12 | "Descargar PDF" | `can_export` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 13 | "Eliminar" (minuta) | `can_delete` | Deshabilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado |

#### Instrucciones Específicas

1. **Botón "Nueva Minuta"**: Verificar que desaparece completamente para el rol `student`
2. **Botón "Publicar/Finalizar"**: Solo gerente y committee pueden finalizar minutas
3. **Flujo completo**: Crear minuta → Agregar asistentes → Agregar temas → Agregar acuerdos → Capturar firmas → Publicar
4. **Descargar PDF**: Verificar que el PDF se genera correctamente con todos los datos

---

### 5.8. Documents.tsx (Documentos y Formatos)

**Ruta:** `/documents`  
**Total de botones protegidos:** 1

#### Tabla de Casos de Prueba

| # | Botón | Permiso Requerido | Comportamiento | Gerente | Instructor | Admin | Committee | Student |
|---|-------|-------------------|----------------|---------|------------|-------|-----------|---------|
| 1 | "Ver Historial" | `can_view` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado |

#### Instrucciones Específicas

1. **Botón "Ver Historial"**: Todos los roles deben poder ver el historial
2. **Tarjetas de documentos**: Verificar que todos los tipos de documentos son accesibles

---

### 5.9. DocumentFormats.tsx (Formatos de Documentos)

**Ruta:** `/document-formats`  
**Total de botones protegidos:** 4

#### Tabla de Casos de Prueba

| # | Botón | Permiso Requerido | Comportamiento | Gerente | Instructor | Admin | Committee | Student |
|---|-------|-------------------|----------------|---------|------------|-------|-----------|---------|
| 1 | "Nuevo Formato" | `can_create` | Oculto si no tiene permiso | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible | ❌ Oculto |
| 2 | "Editar" (formato) | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 3 | "Eliminar" (formato) | `can_delete` | Deshabilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 4 | "Guardar Formato" | `can_create` O `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado |

#### Instrucciones Específicas

1. **Botón "Nuevo Formato"**: Verificar que desaparece completamente para el rol `student`
2. **Nomenclatura de folios**: Verificar que el código del formato se genera correctamente
3. **Vista previa**: Verificar que la vista previa del folio se actualiza en tiempo real

---

### 5.10. SurveysAdminPanel.tsx (Panel Administrativo de Encuestas)

**Ruta:** `/surveys/admin`  
**Total de botones protegidos:** 1

#### Tabla de Casos de Prueba

| # | Botón | Permiso Requerido | Comportamiento | Gerente | Instructor | Admin | Committee | Student |
|---|-------|-------------------|----------------|---------|------------|-------|-----------|---------|
| 1 | "Exportar a Excel" | `can_export` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |

#### Instrucciones Específicas

1. **Botón "Exportar a Excel"**: Verificar que genera un archivo Excel con todas las respuestas
2. **Filtros**: Verificar que los filtros funcionan correctamente (tipo de encuesta, estado, departamento, período)
3. **Estadísticas**: Verificar que las tarjetas de estadísticas muestran datos correctos

---

### 5.11. Nom035AdminPanel.tsx (Panel Administrativo NOM-035)

**Ruta:** `/nom035/admin`  
**Total de botones protegidos:** 2

#### Tabla de Casos de Prueba

| # | Botón | Permiso Requerido | Comportamiento | Gerente | Instructor | Admin | Committee | Student |
|---|-------|-------------------|----------------|---------|------------|-------|-----------|---------|
| 1 | "Exportar a Excel" | `can_export` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 2 | "Exportar a PDF" | `can_export` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |

#### Instrucciones Específicas

1. **Botón "Exportar a Excel"**: Verificar que genera un archivo Excel con análisis completo
2. **Botón "Exportar a PDF"**: Verificar que genera un PDF con gráficas y análisis
3. **Gráficas**: Verificar que las gráficas se renderizan correctamente
4. **Comparación de períodos**: Verificar que se pueden comparar múltiples períodos

---

### 5.12. Mailbox.tsx (Buzón de Mensajes)

**Ruta:** `/mailbox`  
**Total de botones protegidos:** 1

#### Tabla de Casos de Prueba

| # | Botón | Permiso Requerido | Comportamiento | Gerente | Instructor | Admin | Committee | Student |
|---|-------|-------------------|----------------|---------|------------|-------|-----------|---------|
| 1 | "Ver Detalle" | `can_view` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado |

#### Instrucciones Específicas

1. **Botón "Ver Detalle"**: Todos los roles deben poder ver detalles de mensajes
2. **Filtros**: Verificar que los filtros por estado y tipo funcionan correctamente
3. **Búsqueda**: Verificar que la búsqueda encuentra mensajes por título y descripción

---

### 5.13. NotificationsDashboard.tsx (Panel de Notificaciones)

**Ruta:** `/notifications`  
**Total de botones protegidos:** 3

#### Tabla de Casos de Prueba

| # | Botón | Permiso Requerido | Comportamiento | Gerente | Instructor | Admin | Committee | Student |
|---|-------|-------------------|----------------|---------|------------|-------|-----------|---------|
| 1 | "Marcar todas como leídas" | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 2 | "Marcar como leída" (individual) | `can_edit` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado |
| 3 | "Eliminar" (notificación) | `can_delete` | Deshabilitado | ✅ Habilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado | ❌ Deshabilitado |

#### Instrucciones Específicas

1. **Botón "Marcar todas como leídas"**: Verificar que marca todas las notificaciones no leídas
2. **Botón "Marcar como leída"**: Verificar que marca solo la notificación seleccionada
3. **Botón "Eliminar"**: Solo el gerente debe poder eliminar notificaciones
4. **Contador de no leídas**: Verificar que el badge muestra el número correcto

---

### 5.14. AgreementsDashboard.tsx (Panel de Acuerdos)

**Ruta:** `/agreements`  
**Total de botones protegidos:** 0

#### Instrucciones Específicas

1. **Verificación**: Confirmar que la página no tiene botones que requieran protección
2. **Visualización**: Verificar que todos los roles pueden ver los acuerdos
3. **Filtros**: Verificar que los filtros funcionan correctamente

---

### 5.15. EarlyWarnings.tsx (Alertas Tempranas)

**Ruta:** `/early-warnings`  
**Total de botones protegidos:** 4

#### Tabla de Casos de Prueba

| # | Botón | Permiso Requerido | Comportamiento | Gerente | Instructor | Admin | Committee | Student |
|---|-------|-------------------|----------------|---------|------------|-------|-----------|---------|
| 1 | "Ver Detalle" (casos) | `can_view` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado |
| 2 | "Ver Detalle" (encuestas) | `can_view` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado |
| 3 | "Ver Detalle" (acciones) | `can_view` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado |
| 4 | "Ver Encuesta" (alertas) | `can_view` | Deshabilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado | ✅ Habilitado |

#### Instrucciones Específicas

1. **Todos los botones**: Todos los roles deben poder ver detalles (permiso `can_view`)
2. **Pestañas**: Verificar que las 4 pestañas funcionan correctamente
3. **Filtros**: Verificar que los filtros por departamento, prioridad y fecha funcionan
4. **Indicadores de prioridad**: Verificar que los badges de prioridad se muestran correctamente

---

## 6. Plantillas de Registro

### 6.1. Plantilla de Registro por Página

Usar esta plantilla para cada página evaluada:

```markdown
## Página: [Nombre de la Página]

**Fecha de prueba:** [DD/MM/YYYY]  
**Evaluador:** [Nombre]  
**Usuario de prueba:** [Email del usuario]  
**Rol:** [Rol del usuario]

### Resultados

| # | Botón | Esperado | Resultado | ✅/❌ | Observaciones |
|---|-------|----------|-----------|------|---------------|
| 1 | [Nombre del botón] | [Visible/Oculto/Deshabilitado] | [Resultado real] | ✅ | [Comentarios] |
| 2 | [Nombre del botón] | [Visible/Oculto/Deshabilitado] | [Resultado real] | ❌ | [Descripción del error] |

### Errores Encontrados

1. **[Descripción del error]**
   - **Severidad:** Alta/Media/Baja
   - **Pasos para reproducir:** [Pasos]
   - **Comportamiento esperado:** [Descripción]
   - **Comportamiento actual:** [Descripción]

### Capturas de Pantalla

[Adjuntar capturas de pantalla de errores o comportamientos inesperados]
```

### 6.2. Plantilla de Resumen por Usuario

Usar esta plantilla para consolidar resultados por usuario:

```markdown
## Usuario: [Email] - Rol: [Rol]

**Fecha de evaluación:** [DD/MM/YYYY]  
**Páginas evaluadas:** [Número] de 16  
**Botones evaluados:** [Número] de 75

### Resumen de Resultados

| Página | Botones Evaluados | Exitosos | Fallidos | % Éxito |
|--------|-------------------|----------|----------|---------|
| Workers | 5 | 5 | 0 | 100% |
| Courses | 5 | 4 | 1 | 80% |
| ... | ... | ... | ... | ... |
| **TOTAL** | **75** | **70** | **5** | **93%** |

### Errores Críticos

1. [Descripción del error crítico]
2. [Descripción del error crítico]

### Errores No Críticos

1. [Descripción del error no crítico]
2. [Descripción del error no crítico]
```

### 6.3. Plantilla de Reporte Final

Usar esta plantilla para el reporte consolidado final:

```markdown
# Reporte Final de Validación de Permisos

**Fecha de reporte:** [DD/MM/YYYY]  
**Evaluadores:** [Lista de evaluadores]  
**Período de evaluación:** [Fecha inicio] - [Fecha fin]

## Resumen Ejecutivo

- **Páginas evaluadas:** 16/16 (100%)
- **Botones evaluados:** 75/75 (100%)
- **Usuarios de prueba:** 5/5 (100%)
- **Casos de prueba ejecutados:** [Número]
- **Casos exitosos:** [Número] ([Porcentaje]%)
- **Casos fallidos:** [Número] ([Porcentaje]%)

## Resultados por Rol

| Rol | Páginas | Botones | Exitosos | Fallidos | % Éxito |
|-----|---------|---------|----------|----------|---------|
| Gerente | 16 | 75 | [N] | [N] | [%] |
| Instructor | 16 | 75 | [N] | [N] | [%] |
| Administrativo | 16 | 75 | [N] | [N] | [%] |
| Committee | 16 | 75 | [N] | [N] | [%] |
| Student | 16 | 75 | [N] | [N] | [%] |

## Errores Encontrados

### Errores Críticos (Bloquean funcionalidad)

1. **[Título del error]**
   - **Página:** [Nombre]
   - **Botón:** [Nombre]
   - **Roles afectados:** [Lista]
   - **Descripción:** [Detalle]
   - **Impacto:** [Descripción del impacto]

### Errores No Críticos (No bloquean funcionalidad)

1. **[Título del error]**
   - **Página:** [Nombre]
   - **Botón:** [Nombre]
   - **Roles afectados:** [Lista]
   - **Descripción:** [Detalle]

## Recomendaciones

1. [Recomendación prioritaria]
2. [Recomendación secundaria]
3. [Mejora sugerida]

## Conclusión

[Resumen de la validación y estado general del sistema de permisos]
```

---

## 7. Criterios de Aceptación

### 7.1. Criterios Generales

El sistema de permisos se considera **aprobado** si cumple con los siguientes criterios:

1. **Tasa de éxito ≥ 95%**: Al menos el 95% de los casos de prueba deben ser exitosos
2. **Cero errores críticos**: No deben existir errores que permitan acciones no autorizadas
3. **Consistencia**: El comportamiento debe ser consistente en todas las páginas
4. **Usabilidad**: Los mensajes de error deben ser claros y útiles

### 7.2. Criterios Específicos por Permiso

#### can_view (Ver)
- ✅ Todos los roles deben poder ver información básica
- ✅ Los botones de visualización deben estar habilitados para todos

#### can_create (Crear)
- ✅ Botones de creación deben ocultarse para roles sin permiso
- ✅ Formularios de creación deben ser accesibles solo con permiso
- ✅ El rol `student` NO debe poder crear ningún registro

#### can_edit (Editar)
- ✅ Botones de edición deben deshabilitarse para roles sin permiso
- ✅ Formularios de edición deben validar permisos antes de guardar
- ✅ Los roles `committee` y `student` NO deben poder editar

#### can_delete (Eliminar)
- ✅ Solo el rol `gerente` debe poder eliminar registros
- ✅ Debe aparecer confirmación antes de eliminar
- ✅ Todos los demás roles deben ver el botón deshabilitado

#### can_approve (Aprobar)
- ✅ Solo los roles `gerente` y `committee` deben poder aprobar
- ✅ La aprobación debe cambiar el estado del documento
- ✅ Los roles `instructor`, `administrativo` y `student` NO deben poder aprobar

#### can_export (Exportar)
- ✅ Los roles `gerente`, `instructor` y `administrativo` deben poder exportar
- ✅ Los archivos exportados deben contener todos los datos visibles
- ✅ Los roles `committee` y `student` NO deben poder exportar

### 7.3. Criterios de Seguridad

1. **No bypass de permisos**: No debe ser posible ejecutar acciones mediante URL directas o manipulación del DOM
2. **Validación backend**: Todas las acciones deben validarse en el servidor (tRPC procedures)
3. **Mensajes de error apropiados**: Los errores de permisos deben mostrar mensajes claros sin revelar información sensible
4. **Logs de auditoría**: Las acciones denegadas deben registrarse en logs (si está implementado)

### 7.4. Criterios de Usabilidad

1. **Tooltips informativos**: Los botones deshabilitados deben mostrar tooltips explicativos
2. **Feedback visual**: Los botones deben tener estados visuales claros (habilitado/deshabilitado)
3. **Consistencia de mensajes**: Los mensajes de error deben seguir el mismo formato en toda la aplicación
4. **Accesibilidad**: Los botones deshabilitados deben ser accesibles mediante teclado y lectores de pantalla

---

## 8. Checklist de Validación

### Antes de Iniciar las Pruebas

- [ ] Verificar que los 5 usuarios de prueba existen en la base de datos
- [ ] Confirmar que el servidor de desarrollo está corriendo sin errores
- [ ] Abrir las herramientas de desarrollo del navegador (F12)
- [ ] Limpiar caché y cookies del navegador
- [ ] Preparar herramienta de captura de pantalla

### Durante las Pruebas

- [ ] Autenticarse con cada usuario de prueba
- [ ] Verificar que el rol se muestra correctamente en el dashboard
- [ ] Navegar a cada una de las 16 páginas
- [ ] Probar cada botón según la matriz de permisos
- [ ] Verificar tooltips en botones deshabilitados
- [ ] Intentar ejecutar acciones no permitidas
- [ ] Revisar la consola del navegador en busca de errores
- [ ] Capturar pantallas de errores encontrados
- [ ] Registrar resultados en las plantillas

### Después de las Pruebas

- [ ] Consolidar resultados en el reporte final
- [ ] Clasificar errores por severidad
- [ ] Documentar pasos para reproducir errores
- [ ] Generar recomendaciones de mejora
- [ ] Compartir reporte con el equipo de desarrollo

---

## 9. Contacto y Soporte

Para preguntas o aclaraciones sobre esta guía de validación:

- **Documentación técnica:** Revisar `PATRON_PROTECCION_BOTONES.md`
- **Código fuente:** Revisar `client/src/hooks/usePermissions.ts` y `client/src/components/ProtectedButton.tsx`
- **Base de datos:** Revisar tabla `user` en el schema de Drizzle

---

## 10. Historial de Versiones

| Versión | Fecha | Autor | Cambios |
|---------|-------|-------|---------|
| 1.0 | 12/02/2026 | Sistema | Versión inicial de la guía |

---

**Fin de la Guía de Validación Detallada**
