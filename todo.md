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
