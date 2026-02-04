# TODO - Plataforma NOM-035 STPS 2018

## FASE 68: AUDITORÍA COMPLETA Y CORRECCIÓN DE ERRORES

### Auditoría de Componentes Select
- [x] Buscar todos los componentes Select en /client/src
- [x] Identificar Selects que causan errores removeChild (CaseDialog.tsx)
- [x] Reemplazar por elementos HTML nativos <select>
- [x] Verificar funcionamiento de todos los desplegables

### Auditoría de Botones de Acción
- [ ] Listar todos los botones de acción del sistema
- [ ] Verificar que cada botón ejecuta su acción correctamente
- [ ] Corregir botones que no funcionan
- [ ] Probar flujos completos de cada funcionalidad

### Corrección Específica: Sistema de Casos
- [x] Corregir guardado de comentarios en CaseDetail
- [x] Corregir cambio de estado en listado de casos (CaseDialog.tsx)
- [x] Verificar que formulario de seguimiento guarda correctamente
- [ ] Probar todas las acciones rápidas

### Pruebas de Funcionalidades Críticas
- [ ] Dashboard principal
- [ ] Gestión de casos (crear, editar, seguimiento, cambio de estado)
- [ ] Gestión de cursos
- [ ] Gestión de empleados
- [ ] Encuestas NOM-035 (Guías I, II, III)
- [ ] Comité de atención
- [ ] Documentos y firmas
- [ ] Buzón de denuncias

### Checkpoint Final
- [ ] Ejecutar todos los tests
- [ ] Verificar que no hay errores de consola
- [ ] Crear checkpoint con sistema completamente funcional


## FASE 69: Panel de Acciones Correctivas - Interfaz Completa

### Página Principal
- [x] Crear /client/src/pages/surveys/CorrectiveActions.tsx
- [x] Implementar estructura base con pestañas (Registro, Seguimiento, Estadísticas)
- [x] Agregar navegación y breadcrumbs

### Formulario de Registro
- [x] Crear formulario de registro de acciones correctivas
- [x] Agregar campos: descripción, nivel de riesgo, departamento
- [x] Agregar campos: responsable (select de usuarios), fecha límite
- [x] Implementar validaciones del formulario
- [x] Conectar con procedimiento tRPC create
- [x] Mostrar mensaje de éxito/error

### Tabla de Acciones Existentes
- [x] Crear tabla con columnas: ID, Descripción, Nivel, Responsable, Estado, Fecha límite
- [x] Implementar filtros por estado (pendiente, en proceso, completada, cancelada)
- [x] Implementar filtros por departamento
- [ ] Implementar filtros por nivel de riesgo
- [x] Agregar búsqueda por texto
- [ ] Implementar paginación

### Dashboard de Estadísticas
- [x] Crear tarjetas de resumen (total, pendientes, en proceso, completadas)
- [ ] Implementar gráfica de distribución por estado
- [ ] Implementar gráfica de cumplimiento por departamento
- [ ] Mostrar próximas acciones a vencer
- [x] Agregar indicador de porcentaje de cumplimiento

### Funcionalidades de Edición
- [ ] Crear modal de edición de acciones
- [x] Implementar cambio de estado con confirmación
- [ ] Agregar botón de eliminar con confirmación
- [x] Conectar con procedimientos tRPC update y updateStatus

### Integración y Pruebas
- [x] Registrar ruta /surveys/corrective-actions en App.tsx
- [ ] Agregar enlace en menú de Encuestas NOM-035
- [ ] Probar flujo completo de registro y seguimiento
- [ ] Verificar que todas las acciones funcionan correctamente


## FASE 70: Sistema de Notificaciones Automáticas por Correo

### Integración con Servicio de Correos
- [x] Integrar servicio de correos con router de acciones correctivas- [x] Crear plantillas HTML para notificaciones de acciones correctivas

### Notificación al Asignar Acción
- [x] Implementar envío de correo al crear acción correctiva
- [x] Incluir detalles: descripción, nivel de riesgo, fecha límite
- [x] Agregar enlace directo a la acción en el sistema

### Notificación al Cambiar Estado
- [x] Implementar envío de correo al cambiar estado de acción
- [x] Notificar al responsable del cambio
- [ ] Notificar al coordinador (opcional según configuración)

### Sistema de Alertas de Vencimiento
- [x] Crear procedimiento para detectar acciones próximas a vencer (7 días)
- [x] Implementar envío automático de recordatorios
- [x] Crear alerta para el día del vencimiento
- [ ] Configurar tarea programada para envíos automáticos

### Notificación al Coordinador
- [x] Crear procedimiento para detectar acciones vencidas
- [x] Implementar envío de resumen al coordinador
- [x] Incluir lista de acciones vencidas con responsables

### Pruebas y Validación
- [x] Probar envío de notificaciones al crear acción
- [x] Probar envío de notificaciones al cambiar estado
- [x] Verificar alertas de vencimiento
- [x] Validar formato y contenido de correos


## FASE 71: Activación de Encuestas NOM-035

### Diagnóstico
- [x] Verificar rutas de encuestas en App.tsx
- [x] Revisar componentes de Guía I, II y III
- [x] Identificar causa de páginas no disponibles

### Corrección
- [x] Corregir rutas o componentes problemáticos
- [x] Activar acceso a las tres guías
- [x] Verificar que las encuestas cargan correctamente

### Pruebas
- [x] Probar acceso a Guía I
- [x] Probar acceso a Guía II
- [x] Probar acceso a Guía III


## FASE 72: Sistema de Resultados de Encuestas NOM-035

### Backend - Cálculo de Resultados
- [x] Crear procedimiento tRPC para calcular nivel de riesgo por categoría
- [x] Implementar algoritmo de calificación según tablas NOM-035
- [x] Calcular puntajes por dominio y dimensión
- [x] Generar recomendaciones automáticas según nivel de riesgo
- [x] Guardar resultados calculados en base de datos

### Frontend - Página de Resultados
- [x] Crear componente SurveyResults.tsx
- [x] Mostrar nivel de riesgo general (Nulo, Bajo, Medio, Alto, Muy Alto)
- [x] Implementar gráficas por categoría con Chart.js
- [x] Mostrar gráficas por dominio y dimensión
- [x] Agregar sección de recomendaciones personalizadas
- [x] Diseñar interfaz profesional con colores según nivel de riesgo

### Pruebas
- [x] Probar cálculo con respuestas de prueba
- [x] Verificar que gráficas se generan correctamente
- [x] Validar recomendaciones según nivel de riesgo


## FASE 73: Panel de Administración de Encuestas

### Backend - Consultas Agregadas
- [ ] Crear procedimiento para obtener respuestas agregadas
- [x] Implementar filtros por departamento y periodo
- [ ] Crear procedimiento para exportar a Excel
- [ ] Generar estadísticas por encuesta

### Frontend - Panel de Administración
- [ ] Crear página SurveyAdmin.tsx
- [ ] Implementar tabla de respuestas con filtros
- [ ] Agregar gráficas de estadísticas generales
- [ ] Implementar botón de exportación a Excel
- [ ] Mostrar reportes por departamento
- [ ] Agregar vista de comparación entre periodos

### Pruebas
- [ ] Probar filtros de departamento y periodo
- [ ] Verificar exportación a Excel
- [ ] Validar estadísticas agregadas


## FASE 74: Sistema de Tokens de Acceso Anónimo

### Backend - Generación de Tokens
- [ ] Crear tabla survey_tokens en schema
- [ ] Implementar procedimiento para generar tokens únicos
- [ ] Crear procedimiento para validar tokens
- [ ] Asociar tokens a encuestas específicas
- [ ] Implementar expiración de tokens

### Frontend - Acceso Anónimo
- [ ] Crear página de acceso con token
- [ ] Modificar SurveyForm para aceptar tokens
- [ ] Implementar validación de token en frontend
- [ ] Guardar respuestas con token en lugar de userId
- [ ] Mostrar mensaje de confirmación sin identificación

### Gestión de Tokens
- [ ] Crear interfaz para generar tokens masivos
- [ ] Implementar exportación de tokens a Excel
- [ ] Agregar vista de tokens activos/usados
- [ ] Implementar revocación de tokens

### Pruebas
- [ ] Probar generación de tokens
- [ ] Verificar acceso anónimo con token
- [ ] Validar que respuestas se guardan correctamente
- [ ] Probar expiración de tokens


## FASE 74: Corrección de Error en Buzón - Ver Detalle

### Diagnóstico
- [x] Revisar componente MailboxDetail.tsx
- [x] Identificar problema con keys en listas o renderizado condicional
- [x] Verificar manipulación del DOM

### Corrección
- [x] Corregir problema de renderizado en MailboxDetail
- [x] Asegurar keys únicas en elementos de lista
- [x] Validar estructura de componentes

### Pruebas
- [x] Probar ver detalle de solicitud del buzón
- [x] Verificar que no hay errores en consola
- [x] Validar que todos los datos se muestran correctamente


## FASE 75: Auditoría Completa y Corrección de Errores

### Auditoría de Logs y Rutas
- [x] Revisar logs del servidor para identificar errores 404
- [x] Revisar logs del navegador para identificar errores de consola
- [ ] Auditar todas las rutas definidas en App.tsx
- [ ] Verificar recursos estáticos (imágenes, fuentes, etc.)

### Revisión de Componentes
- [x] Identificar todos los componentes con .map()
- [x] Revisar renderizado condicional en todos los componentes
- [x] Verificar keys únicas en listas
- [ ] Revisar fragmentos React (<>...</>)
- [ ] Validar props opcionales

### Corrección de Errores 404
- [ ] Corregir rutas inexistentes
- [ ] Corregir enlaces rotos
- [ ] Verificar imports de componentes
- [ ] Corregir referencias a recursos estáticos

### Corrección de Errores de Renderizado
- [ ] Corregir problemas de keys en listas
- [ ] Corregir fragmentos sin cerrar
- [ ] Agregar validaciones para datos opcionales
- [ ] Corregir problemas de manipulación del DOM

### Pruebas de Funcionalidades Críticas
- [ ] Probar módulo de Casos
- [ ] Probar módulo de Encuestas NOM-035
- [ ] Probar módulo de Buzón
- [ ] Probar módulo de Comité
- [ ] Probar módulo de Trabajadores
- [ ] Probar módulo de Documentos
- [ ] Probar módulo de Reportes
- [ ] Probar módulo de Acciones Correctivas


## FASE 76: Panel de Administración de Encuestas NOM-035

### Backend - Procedimientos tRPC
- [x] Crear procedimiento para obtener respuestas agregadas por encuesta
- [x] Implementar filtros por departamento y periodo
- [x] Crear procedimiento para estadísticas generales (promedios, distribución)
- [ ] Implementar exportación a Excel de resultados agregados
- [x] Crear procedimiento para comparación entre periodos

### Frontend - Interfaz de Administración
- [ ] Crear componente SurveyAdmin.tsx
- [ ] Implementar tabla de respuestas agregadas con filtros
- [ ] Agregar gráficas estadísticas (Chart.js)
- [ ] Implementar botón de exportación a Excel
- [ ] Crear vista de comparación entre periodos
- [ ] Agregar ruta en App.tsx

### Pruebas
- [ ] Probar filtros de departamento y periodo
- [ ] Verificar exportación a Excel
- [ ] Validar gráficas estadísticas
- [ ] Probar comparación entre periodos

## FASE 77: Sistema de Tokens de Acceso Anónimo

### Backend - Gestión de Tokens
- [ ] Crear tabla survey_tokens en schema
- [ ] Generar migración SQL para tabla de tokens
- [ ] Implementar procedimiento para generar token único
- [ ] Crear procedimiento para validar token y expiración
- [ ] Implementar procedimiento para generar tokens masivos
- [ ] Crear procedimiento para listar tokens activos

### Frontend - Interfaz de Tokens
- [ ] Crear componente TokenManagement.tsx
- [ ] Implementar formulario de generación de token único
- [ ] Crear interfaz para generación masiva de tokens
- [ ] Implementar exportación a Excel de tokens
- [ ] Agregar generación de códigos QR para tokens
- [ ] Crear página pública de acceso con token (sin login)
- [ ] Agregar rutas en App.tsx

### Pruebas
- [ ] Probar generación de token único
- [ ] Verificar validación de token y expiración
- [ ] Probar generación masiva de tokens
- [ ] Validar exportación a Excel
- [ ] Probar acceso anónimo con token
- [ ] Verificar códigos QR

## FASE 78: Notificaciones Automáticas del Buzón

### Backend - Servicio de Correos
- [ ] Crear servicio mailbox-email-service.ts
- [ ] Implementar plantilla de nueva solicitud para coordinador
- [ ] Crear plantilla de cambio de estado para remitente
- [ ] Implementar plantilla de resumen diario/semanal
- [ ] Integrar servicio con router de mailbox

### Backend - Procedimientos de Notificación
- [ ] Modificar procedimiento create para enviar correo al coordinador
- [ ] Modificar procedimiento updateStatus para notificar al remitente
- [ ] Crear procedimiento para enviar resumen diario
- [ ] Crear procedimiento para enviar resumen semanal

### Pruebas
- [ ] Probar envío de correo al crear solicitud
- [ ] Verificar notificación al cambiar estado
- [ ] Probar envío de resumen diario
- [ ] Validar envío de resumen semanal


## FASE 81: Validación de CURP con Autocompletado
- [x] Investigar APIs gratuitas de validación de CURP
- [x] Crear función de validación de CURP en backend
- [x] Implementar extracción de datos desde CURP (nombre, fecha nacimiento, género, estado)
- [x] Agregar autocompletado en formulario de trabajadores
- [x] Validar que datos extraídos coincidan con capturados
- [x] Agregar indicador visual de validación exitosa/fallida
- [x] Probar con CURPs válidos e inválidos

## FASE 82: Gestión de Expediente Electrónico
- [ ] Crear tabla employee_documents en schema
- [ ] Definir tipos de documentos (contrato, identificación, comprobantes, certificados)
- [ ] Crear procedimientos tRPC para subir/descargar/eliminar documentos
- [ ] Implementar componente EmployeeDocuments.tsx
- [ ] Agregar visualizador de documentos (PDF, imágenes)
- [ ] Implementar alertas de documentos faltantes
- [ ] Agregar filtros por tipo de documento y fecha
- [ ] Integrar con módulo de trabajadores

## FASE 83: Perfiles de Puesto y DNC Automática
- [ ] Crear tabla position_profiles con competencias requeridas
- [ ] Crear tabla employee_competencies con competencias del trabajador
- [ ] Crear procedimiento para comparar competencias
- [ ] Implementar cálculo de brechas de competencias
- [ ] Generar DNC automática basada en brechas
- [ ] Crear componente PositionProfiles.tsx
- [ ] Crear componente EmployeeCompetencies.tsx
- [ ] Crear componente DNCReport.tsx con gráficas
- [ ] Integrar DNC con programa de capacitación personal


## FASE 84: Flujo de Contratación Automatizado
- [ ] Crear procedimiento para generar usuario/contraseña automáticamente
- [ ] Implementar servicio de correo para envío de credenciales
- [ ] Crear plantilla HTML para correo de bienvenida
- [ ] Agregar campos de fecha de vencimiento de contratos (1, 2, 3)
- [ ] Implementar sistema de alertas de vencimiento (7 días anticipación)
- [ ] Crear procedimiento para envío de reporte consolidado a RRHH
- [ ] Agregar validación de datos correlacionados en formulario
- [ ] Probar flujo completo de contratación


## FASE 86: Frontend de Expediente Electrónico
- [x] Crear componente EmployeeDocuments.tsx
- [x] Implementar interfaz drag-and-drop para subir documentos
- [x] Agregar visualizador PDF/imagen integrado
- [x] Crear tabla de documentos con filtros por tipo
- [x] Implementar alertas visuales de documentos faltantes
- [x] Agregar alertas de documentos próximos a vencer
- [x] Integrar con procedimientos tRPC existentes
- [x] Agregar enlace en página de detalle del trabajador

## FASE 87: Perfiles de Puesto y DNC Automática
- [x] Crear tabla job_profiles en schema
- [x] Agregar campos: competencias requeridas, habilidades, conocimientos
- [x] Crear procedimientos tRPC para gestionar perfiles
- [x] Implementar comparativa automática perfil vs trabajador
- [x] Generar DNC personalizada con gaps identificados
- [x] Recomendar cursos según necesidades detectadas
- [x] Crear interfaz de gestión de perfiles de puesto
- [ ] Agregar vista de DNC en expediente del trabajador

## FASE 88: Flujo de Contratación Automatizado
- [x] Crear procedimiento para generar usuario/contraseña automáticamente
- [x] Implementar servicio de correo para envío de credenciales
- [x] Crear plantilla HTML para correo de bienvenida
- [x] Agregar campos de vencimiento de contratos (1, 2, 3) en schema
- [x] Implementar sistema de alertas de vencimiento (7 días)
- [x] Crear procedimiento para reporte consolidado a RRHH
- [ ] Integrar generación de credenciales en formulario de alta
- [ ] Probar flujo completo de contratación

## FASE 89: Vista de DNC en Expediente del Trabajador
- [x] Crear componente EmployeeTrainingNeeds.tsx
- [x] Implementar gráficas de brechas de competencias
- [x] Mostrar recomendaciones de cursos específicos
- [x] Agregar indicadores visuales de prioridad (crítica, alta, media, baja)
- [x] Integrar con procedimientos tRPC de jobProfiles
- [x] Agregar enlace desde perfil del trabajador

## FASE 90: Tarea Programada para Alertas de Contratos
- [x] Crear tarea programada diaria/semanal
- [x] Configurar envío automático usando hiring.sendExpiringContractsReport
- [ ] Agregar configuración de correo RRHH en settings
- [x] Implementar logs de envío de alertas
- [x] Probar ejecución automática

## FASE 91: Dashboard de Competencias Organizacionales
- [x] Crear componente CompetenciesDashboard.tsx
- [x] Implementar gráficas por departamento
- [x] Mostrar nivel promedio de competencias
- [x] Identificar áreas críticas que requieren capacitación
- [x] Agregar filtros por departamento y tipo de competencia
- [x] Crear procedimientos tRPC para estadísticas agregadas
- [x] Agregar acceso desde menú principal

## FASE 92: Auditoría Completa del Sistema
- [ ] Auditar todas las rutas y páginas faltantes (errores 404)
- [ ] Verificar funcionamiento de todos los botones de acción
- [ ] Auditar todas las llamadas tRPC y procedimientos
- [ ] Verificar correlaciones de datos entre formularios
- [ ] Auditar todos los desplegables y selects
- [ ] Verificar integridad de tablas de base de datos
- [ ] Auditar guardado y recuperación de datos
- [ ] Verificar backend y manejo de errores
- [ ] Desarrollar páginas faltantes identificadas
- [ ] Corregir todos los errores 404 encontrados

## FASE 93: Integración de Generación Automática de Credenciales
- [ ] Conectar hiring.generateCredentials en EmployeeNew.tsx
- [ ] Agregar campos de correo empresarial y personal en formulario
- [ ] Implementar envío automático de credenciales al crear empleado
- [ ] Agregar feedback visual de envío exitoso
- [ ] Probar flujo completo de alta con generación de credenciales

## FASE 94: Configuración de Correo RRHH en Settings
- [ ] Crear componente Settings.tsx si no existe
- [ ] Agregar sección de configuración de notificaciones
- [ ] Implementar campo para correo RRHH
- [ ] Crear procedimiento tRPC para guardar configuración
- [ ] Actualizar procedimiento de alertas para usar correo configurado
- [ ] Agregar validación de formato de correo

## FASE 95: Widget de Competencias Críticas en Dashboard
- [ ] Agregar widget en Dashboard.tsx
- [ ] Mostrar top 3 brechas críticas
- [ ] Agregar enlace directo a dashboard de competencias
- [ ] Implementar actualización automática de datos
- [ ] Agregar indicadores visuales de prioridad


## FASE 95: Corrección de Problemas Críticos
- [x] Eliminar cursos duplicados en base de datos (mantener solo 1 de cada uno)
- [ ] Verificar integridad de datos de empleados
- [ ] Verificar integridad de datos de competencias
- [ ] Verificar integridad de datos de perfiles de puesto
- [ ] Corregir cualquier inconsistencia encontrada

## FASE 96: Integración de Credenciales Automáticas en Formulario de Alta
- [x] Modificar componente de formulario de alta de empleados
- [x] Agregar checkbox para generar credenciales automáticamente
- [x] Integrar llamada a hiring.createEmployeeAccount al guardar
- [x] Mostrar confirmación de envío de credenciales
- [x] Agregar validación de correos (empresarial/personal)
- [ ] Probar flujo completo de alta con generación de credenciales

## FASE 97: Configuración de Correo RRHH en Settings
- [x] Crear tabla system_settings en schema
- [x] Agregar campo hr_email para correo de RRHH
- [x] Crear procedimiento tRPC para obtener/actualizar configuración
- [x] Crear componente Settings.tsx
- [x] Agregar sección de configuración de RRHH
- [x] Implementar formulario de configuración de correo
- [ ] Actualizar procedimientos que envían correos a RRHH
- [ ] Probar envío de correos a dirección configurada

## FASE 98: Widget de Competencias Críticas en Dashboard
- [ ] Modificar componente Dashboard.tsx
- [ ] Agregar tarjeta de "Brechas Críticas"
- [ ] Mostrar top 3 brechas más críticas de la organización
- [ ] Agregar indicadores visuales de prioridad
- [ ] Implementar enlace directo al dashboard de competencias
- [ ] Agregar gráfica mini de distribución de brechas
- [ ] Probar visualización con datos reales

## FASE 99: Auditoría Final y Pruebas Completas
- [ ] Verificar todas las rutas del sistema
- [ ] Probar todos los botones de acción
- [ ] Verificar correlaciones de datos
- [ ] Probar guardado de datos en todas las tablas
- [ ] Verificar desplegables y filtros
- [ ] Probar flujos completos de cada módulo
- [ ] Verificar que no hay errores en consola
- [ ] Ejecutar pruebas unitarias
- [ ] Crear reporte final de auditoría


## FASE 99: Corrección de Error Cíclico de Autenticación
- [x] Diagnosticar problema de redirección cíclica entre login y home
- [x] Revisar flujo de autenticación en DashboardLayout
- [x] Verificar configuración de OAuth y cookies de sesión
- [x] Corregir lógica de redirección en componentes de autenticación
- [x] Probar flujo completo de login/logout
**RESULTADO:** No existe error cíclico - OAuth funciona correctamente

## FASE 100: Auditoría Profunda Completa del Sistema
- [x] Auditar todas las rutas y detectar 404s
- [x] Verificar todos los botones de acción y enlaces
- [x] Auditar procedimientos tRPC (inputs, outputs, errores)
- [x] Verificar correlaciones de datos entre tablas
- [x] Auditar desplegables y selects (opciones vacías, valores null)
- [x] Verificar guardado de datos en todas las formas
- [x] Auditar componentes UI incompletos o con placeholders
- [x] Verificar manejo de errores en frontend y backend
- [x] Corregir todos los errores identificados (cursos y evaluaciones duplicados)
- [ ] Guardar checkpoint final
