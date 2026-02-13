# Guía de Pruebas Manuales de Permisos - Fase 96

## Objetivo
Validar que el sistema de permisos funciona correctamente en todos los módulos, especialmente en los 6 routers críticos que recibieron validación backend en esta fase.

## Usuarios de Prueba

### 1. Gerente (Acceso Total)
- **Email:** gerente.test@example.com
- **Permisos:** view, create, edit, delete, export, approve (6/6)
- **Rol:** Gerente General
- **Expectativa:** Debe ver y ejecutar TODAS las acciones en TODAS las páginas

### 2. Instructor
- **Email:** instructor.test@example.com
- **Permisos:** view, create, edit, export (4/6)
- **Rol:** Instructor de Capacitación
- **Expectativa:** Puede crear, editar y exportar, pero NO puede eliminar ni aprobar

### 3. Administrador
- **Email:** admin.test@example.com
- **Permisos:** view, create, edit, export (4/6)
- **Rol:** Administrador del Sistema
- **Expectativa:** Puede crear, editar y exportar, pero NO puede eliminar ni aprobar

### 4. Comité
- **Email:** committee.test@example.com
- **Permisos:** view, create, approve (3/6)
- **Rol:** Miembro del Comité
- **Expectativa:** Puede ver, crear y aprobar, pero NO puede editar, eliminar ni exportar

### 5. Estudiante (Solo Lectura)
- **Email:** student.test@example.com
- **Permisos:** view (1/6)
- **Rol:** Estudiante/Trabajador
- **Expectativa:** Solo puede VER, NO puede ejecutar ninguna acción

---

## Módulos Críticos con Validación Backend (Fase 96)

### 1. Actas de Comité (committeeMinutes.ts)
**Ruta:** `/equality/committee-minutes`

**Procedures protegidos:**
- `create` → Requiere `can_create`
- `update` → Requiere `can_edit`
- `delete` → Requiere `can_delete`
- `publish` → Requiere `can_edit`

**Pruebas:**
| Usuario | Crear Acta | Editar Acta | Eliminar Acta | Publicar Acta |
|---------|------------|-------------|---------------|---------------|
| Gerente | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible |
| Instructor | ✅ Visible | ✅ Visible | ❌ Oculto | ✅ Visible |
| Admin | ✅ Visible | ✅ Visible | ❌ Oculto | ✅ Visible |
| Comité | ✅ Visible | ❌ Oculto | ❌ Oculto | ❌ Oculto |
| Estudiante | ❌ Oculto | ❌ Oculto | ❌ Oculto | ❌ Oculto |

---

### 2. Formatos de Documentos (documentFormats.ts)
**Ruta:** `/compliance/document-formats`

**Procedures protegidos:**
- `create` → Requiere `can_create`
- `update` → Requiere `can_edit`
- `delete` → Requiere `can_delete`

**Pruebas:**
| Usuario | Crear Formato | Editar Formato | Eliminar Formato |
|---------|---------------|----------------|------------------|
| Gerente | ✅ Visible | ✅ Visible | ✅ Visible |
| Instructor | ✅ Visible | ✅ Visible | ❌ Oculto |
| Admin | ✅ Visible | ✅ Visible | ❌ Oculto |
| Comité | ✅ Visible | ❌ Oculto | ❌ Oculto |
| Estudiante | ❌ Oculto | ❌ Oculto | ❌ Oculto |

---

### 3. Notificaciones (notifications.ts)
**Ruta:** `/notifications` (componente global)

**Procedures protegidos:**
- `markAsRead` → Requiere `can_edit`
- `markAllAsRead` → Requiere `can_edit`
- `delete` → Requiere `can_edit`

**Pruebas:**
| Usuario | Marcar como Leída | Marcar Todas | Eliminar Notificación |
|---------|-------------------|--------------|----------------------|
| Gerente | ✅ Visible | ✅ Visible | ✅ Visible |
| Instructor | ✅ Visible | ✅ Visible | ✅ Visible |
| Admin | ✅ Visible | ✅ Visible | ✅ Visible |
| Comité | ❌ Oculto | ❌ Oculto | ❌ Oculto |
| Estudiante | ❌ Oculto | ❌ Oculto | ❌ Oculto |

---

### 4. Encuestas NOM-035 (surveys.ts)
**Ruta:** `/surveys/admin-panel`

**Procedures protegidos:**
- `generateToken` → Requiere `can_create`
- `submitResponse` → Público (sin autenticación)
- `generateGuideIPDF` → Requiere `can_export`
- `generateGuideIIPDF` → Requiere `can_export`
- `generateGuideIIIPDF` → Requiere `can_export`
- `generateGuideIIIExtendedPDF` → Requiere `can_export`
- `generateGuideIIIResultsPDF` → Requiere `can_export`

**Pruebas:**
| Usuario | Generar Token | Exportar PDF Guía I | Exportar PDF Guía II | Exportar PDF Guía III |
|---------|---------------|---------------------|----------------------|----------------------|
| Gerente | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible |
| Instructor | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible |
| Admin | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible |
| Comité | ✅ Visible | ❌ Oculto | ❌ Oculto | ❌ Oculto |
| Estudiante | ❌ Oculto | ❌ Oculto | ❌ Oculto | ❌ Oculto |

---

### 5. Investigaciones (investigations.ts)
**Ruta:** `/surveys/investigations`

**Procedures protegidos:**
- `sendQuestionnaire` → Requiere `can_create`

**Pruebas:**
| Usuario | Enviar Cuestionario |
|---------|---------------------|
| Gerente | ✅ Visible |
| Instructor | ✅ Visible |
| Admin | ✅ Visible |
| Comité | ✅ Visible |
| Estudiante | ❌ Oculto |

---

### 6. Acciones Correctivas (correctiveActions.ts)
**Ruta:** `/surveys/corrective-actions`

**Procedures protegidos:**
- `create` → Requiere `can_create`
- `update` → Requiere `can_edit`
- `updateStatus` → Requiere `can_edit`
- `delete` → Requiere `can_delete`

**Pruebas:**
| Usuario | Crear Acción | Editar Acción | Cambiar Estado | Eliminar Acción |
|---------|--------------|---------------|----------------|-----------------|
| Gerente | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible |
| Instructor | ✅ Visible | ✅ Visible | ✅ Visible | ❌ Oculto |
| Admin | ✅ Visible | ✅ Visible | ✅ Visible | ❌ Oculto |
| Comité | ✅ Visible | ❌ Oculto | ❌ Oculto | ❌ Oculto |
| Estudiante | ❌ Oculto | ❌ Oculto | ❌ Oculto | ❌ Oculto |

---

## Módulos Financieros (Nuevos en Fase 96)

### 7. Dashboard Administrativo Financiero
**Ruta:** `/administrative`

**Características:**
- Filtros avanzados (departamento, categoría, fechas)
- Exportación Excel/PDF
- Gráfico de tendencias Chart.js

**Pruebas:**
| Usuario | Ver Dashboard | Filtrar Datos | Exportar Excel | Exportar PDF |
|---------|---------------|---------------|----------------|--------------|
| Gerente | ✅ Visible | ✅ Funcional | ✅ Funcional | ✅ Funcional |
| Instructor | ✅ Visible | ✅ Funcional | ✅ Funcional | ✅ Funcional |
| Admin | ✅ Visible | ✅ Funcional | ✅ Funcional | ✅ Funcional |
| Comité | ✅ Visible | ✅ Funcional | ❌ Oculto | ❌ Oculto |
| Estudiante | ✅ Visible | ✅ Funcional | ❌ Oculto | ❌ Oculto |

---

### 8. Facturas (Payments)
**Ruta:** `/administrative/payments`

**Pruebas:**
| Usuario | Crear Factura | Editar Factura | Eliminar Factura |
|---------|---------------|----------------|------------------|
| Gerente | ✅ Visible | ✅ Visible | ✅ Visible |
| Instructor | ✅ Visible | ✅ Visible | ❌ Oculto |
| Admin | ✅ Visible | ✅ Visible | ❌ Oculto |
| Comité | ✅ Visible | ❌ Oculto | ❌ Oculto |
| Estudiante | ❌ Oculto | ❌ Oculto | ❌ Oculto |

---

### 9. Órdenes de Compra (PurchaseOrders)
**Ruta:** `/administrative/purchase-orders`

**Pruebas:**
| Usuario | Crear Orden | Editar Orden | Eliminar Orden |
|---------|-------------|--------------|----------------|
| Gerente | ✅ Visible | ✅ Visible | ✅ Visible |
| Instructor | ✅ Visible | ✅ Visible | ❌ Oculto |
| Admin | ✅ Visible | ✅ Visible | ❌ Oculto |
| Comité | ✅ Visible | ❌ Oculto | ❌ Oculto |
| Estudiante | ❌ Oculto | ❌ Oculto | ❌ Oculto |

---

### 10. Solicitudes de Gasto (ExpenseRequests)
**Ruta:** `/administrative/expenses`

**Pruebas:**
| Usuario | Crear Solicitud | Editar Solicitud | Aprobar Solicitud | Eliminar Solicitud |
|---------|-----------------|------------------|-------------------|-------------------|
| Gerente | ✅ Visible | ✅ Visible | ✅ Visible | ✅ Visible |
| Instructor | ✅ Visible | ✅ Visible | ❌ Oculto | ❌ Oculto |
| Admin | ✅ Visible | ✅ Visible | ❌ Oculto | ❌ Oculto |
| Comité | ✅ Visible | ❌ Oculto | ✅ Visible | ❌ Oculto |
| Estudiante | ❌ Oculto | ❌ Oculto | ❌ Oculto | ❌ Oculto |

---

## Instrucciones de Prueba

### Paso 1: Login con cada usuario
1. Abrir navegador en modo incógnito
2. Navegar a la URL del proyecto
3. Hacer clic en "Iniciar Sesión"
4. Ingresar credenciales del usuario de prueba
5. Verificar que el login sea exitoso

### Paso 2: Validar visibilidad de botones
1. Navegar a cada página listada arriba
2. Verificar que los botones de acción coincidan con la tabla de permisos
3. **Botones que deben estar OCULTOS:** No deben aparecer en la interfaz
4. **Botones que deben estar VISIBLES:** Deben aparecer y ser clickeables

### Paso 3: Validar ejecución de acciones
1. Hacer clic en cada botón visible
2. Verificar que la acción se ejecute correctamente
3. Si el usuario NO tiene permiso, debe aparecer un error 403 (Forbidden)
4. Si el usuario SÍ tiene permiso, la acción debe completarse exitosamente

### Paso 4: Validar filtros y exportación (Dashboard Financiero)
1. Navegar a `/administrative`
2. Probar cada filtro (periodo, departamento, categoría, fechas)
3. Verificar que el gráfico se actualice correctamente
4. Hacer clic en "Exportar Excel" y verificar descarga
5. Hacer clic en "Exportar PDF" y verificar ventana de impresión

### Paso 5: Documentar resultados
1. Crear tabla de resultados con formato:
   - Usuario | Página | Acción | Resultado Esperado | Resultado Real | ✅/❌
2. Reportar cualquier discrepancia encontrada
3. Tomar capturas de pantalla de errores

---

## Checklist de Validación

### Validación Backend (6 routers críticos)
- [ ] committeeMinutes.ts: 4 procedures protegidos
- [ ] documentFormats.ts: 3 procedures protegidos
- [ ] notifications.ts: 3 procedures protegidos
- [ ] surveys.ts: 8 procedures protegidos
- [ ] investigations.ts: 1 procedure protegido
- [ ] correctiveActions.ts: 4 procedures protegidos

### Validación Frontend (10 páginas)
- [ ] Actas de Comité
- [ ] Formatos de Documentos
- [ ] Notificaciones
- [ ] Encuestas NOM-035
- [ ] Investigaciones
- [ ] Acciones Correctivas
- [ ] Dashboard Administrativo Financiero
- [ ] Facturas
- [ ] Órdenes de Compra
- [ ] Solicitudes de Gasto

### Validación de Usuarios (5 usuarios)
- [ ] Gerente (6/6 permisos)
- [ ] Instructor (4/6 permisos)
- [ ] Admin (4/6 permisos)
- [ ] Comité (3/6 permisos)
- [ ] Estudiante (1/6 permisos)

---

## Notas Importantes

1. **Errores TypeScript:** Todos corregidos (0 errores en compilación)
2. **Compilación:** Limpia y sin warnings críticos
3. **Servidor:** Funcionando correctamente en puerto 3000
4. **Tests:** 36/36 pasando (100%)

## Próximos Pasos

1. Ejecutar pruebas manuales con los 5 usuarios
2. Documentar resultados en tabla de validación
3. Reportar discrepancias encontradas
4. Corregir errores detectados en pruebas
5. Guardar checkpoint final con sistema validado
