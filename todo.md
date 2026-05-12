# TODO — Plataforma NOM-035 STPS 2018
> Última auditoría: 2026-04-15 | Checkpoint base: 9b181572

---

## ✅ MÓDULOS COMPLETAMENTE IMPLEMENTADOS (verificado en código)

### Infraestructura y Autenticación
- [x] Autenticación OAuth Manus con sesión cookie
- [x] Roles: admin / instructor / student / hr / manager
- [x] Control de acceso por rol en procedures (protectedProcedure / adminProcedure)
- [x] SMTP configuración desde panel de administración (SMTPConfig.tsx)
- [x] Configuración de empresa desde panel (Settings.tsx)

### Gestión de Empleados
- [x] Alta de empleado (EmployeeNew.tsx) — incluye CURP, RFC, NSS, cedulaProfesional, educationLevel
- [x] Edición de empleado (EmployeeEdit.tsx) — incluye CURP, RFC, NSS, cedulaProfesional, educationLevel, vencimientos de contratos 1/2/3
- [x] Perfil de empleado (EmployeeProfile.tsx) — tabs: Datos, Contratos+Firma, DNC, Expediente
- [x] Catálogo de empleados con búsqueda, filtros y paginación
- [x] Importación masiva desde Excel (MassiveImport.tsx)
- [x] Expediente electrónico con carga de documentos a S3 (tab en EmployeeProfile)
- [x] Firma digital en contratos con canvas HTML5 (tabla contract_signatures)
- [x] Exportación de expediente a PDF desde EmployeeProfile
- [x] Historial de cursos en perfil de empleado
- [x] Validación de CURP en tiempo real

### Gestión de Puestos y Perfiles
- [x] Catálogo de puestos (Positions.tsx) — incluye minimumEducation
- [x] Perfiles de puesto con competencias (JobProfiles.tsx)
- [x] Comparativa DNC automática perfil vs empleado (tab en EmployeeProfile)
- [x] Generación de DNC individual desde comparativa

### Reclutamiento
- [x] Gestión de vacantes con minimumEducation (RecruitmentManagement.tsx)
- [x] Filtro automático de candidatos por nivel de escolaridad (indicador meetsEducation)
- [x] Formulario público de postulación (JobApplication.tsx) — CURP, cláusulas ARCO, historial laboral, referencias
- [x] Tabla de candidatos con índice de contratación

### Contratos y Vencimientos
- [x] Campos de vencimiento de contratos 1/2/3 en perfil de empleado
- [x] Dashboard de vencimientos consolidado (ContractExpirationDashboard.tsx) — filtros 7/15/30 días
- [x] Semáforo de urgencia (crítico/alerta/normal) en dashboard de vencimientos
- [x] Exportación a Excel del dashboard de vencimientos (2 hojas: datos + resumen)
- [x] Job diario (8:00 AM) de alertas de vencimiento de contratos a RH por correo

### NOM-035 y Encuestas
- [x] Cuestionario NOM-035 completo (NOM035Questionnaire.tsx)
- [x] Análisis de resultados por empleado y departamento
- [x] Panel de administración NOM-035 (Nom035AdminPanel.tsx)
- [x] Gestión de periodos de encuesta (SurveyPeriodsManager.tsx)
- [x] Envío masivo de encuestas por correo (MassSurveyEmail.tsx)
- [x] Encuestas post-caso (PostCaseSurveysDashboard.tsx + router postCaseSurveys.ts)
- [x] Job automático de envío de encuestas post-caso (post-case-surveys-job.ts)
- [x] Tokens anónimos para encuestas (surveyAnonymousTokens.ts)

### Prevención de Riesgos Psicosociales
- [x] Gestión de casos (CasesManagement.tsx) — con departmentId, paginación, filtros
- [x] Métricas de casos con gráficos Chart.js (CasesMetrics.tsx)
- [x] Exportación de casos a Excel con filtros activos
- [x] Asignación automática de casos por balanceo de carga
- [x] Reportes PDF de casos (mensual/trimestral)
- [x] Análisis de causas raíz con IA (RootCauseAnalysis.tsx + LLM)
- [x] Job mensual de análisis de causas raíz (root-cause-analysis-job.ts)
- [x] Alertas tempranas de riesgo (EarlyWarnings.tsx)
- [x] Investigaciones (Investigations.tsx)
- [x] Protocolo de violencia laboral (WorkplaceViolenceProtocol.tsx)
- [x] Planes de intervención (InterventionPlans.tsx)

### Capacitación y Desarrollo
- [x] Gestión de cursos y sesiones (TrainingDashboard.tsx)
- [x] Evaluaciones de capacitación (TrainingEvaluationsDashboard.tsx)
- [x] Certificados de capacitación (TrainingCertificates.tsx)
- [x] Matriz de habilidades (SkillsMatrix.tsx) con exportación Excel
- [x] ROI de capacitación (TrainingROIDashboard.tsx)
- [x] Detección de Necesidades de Capacitación (DNC) individual y grupal

### Analítica Avanzada
- [x] Dashboard predictivo de riesgo (PredictiveAnalytics.tsx)
- [x] Análisis de rotación (TurnoverDashboard.tsx, TurnoverManagementPanel.tsx)
- [x] Análisis de sentimiento (SentimentAnalysisDashboard.tsx)
- [x] Nine Box Matrix (NineBoxMatrix.tsx)
- [x] Dashboard de talento ejecutivo (TalentDashboard.tsx)
- [x] Métricas NMX-025 (brecha salarial, distribución jerárquica, % mujeres directivas)
- [x] Tendencias departamentales (DepartmentalTrends.tsx)

### Documentos y Cumplimiento Legal
- [x] Generador de Dictamen NOM-035 con IA (LegalDocGenerator.tsx)
- [x] QR de verificación NOM-151 en PDF del Dictamen
- [x] Firma digital en documentos (SignatureAudit.tsx, signatures.ts)
- [x] Minutas de reunión (MeetingMinutes.tsx) con folio y control de versiones
- [x] Reportes STPS (STPSReports.tsx)
- [x] Reportes normativos (RegulatoryReports.tsx)
- [x] Verificación de reglas de operación del comité (VerifyOperatingRules.tsx)

### Notificaciones y Reportes
- [x] Sistema de notificaciones push (WebSocket + socket.io)
- [x] Historial de notificaciones (NotificationsHistory.tsx, NotificationHistory.tsx)
- [x] Panel de configuración de reportes automatizados (ReportConfigurationPanel.tsx)
- [x] Job de reportes ejecutivos (executive-reports-job.ts)
- [x] Alertas de casos críticos (stale-cases-alerts-job.ts)
- [x] Job de alertas de cumplimiento (compliance-reminders-job.ts)

### Entrevistas de Salida
- [x] Router exitInterviews.ts (486 líneas) con CRUD completo
- [x] Página ExitInterviews.tsx registrada en App.tsx y sidebar
- [x] Ruta /exit-interviews activa

---

## 🔴 PENDIENTES CRÍTICOS (genuinamente no implementados)

### P1 — Seed de preguntas predeterminadas para Entrevistas de Salida ✅
- [x] Procedure `initDefaultQuestions` en exitInterviews.ts con 15 preguntas estándar (ya existía)
- [x] Botón "Cargar preguntas predeterminadas (15)" en UI de ExitInterviews.tsx (ya existía, línea 1123)
- [x] Verificado: las preguntas se cargan correctamente en la BD

### P2 — Selector de responsable técnico en formulario del Dictamen ✅
- [x] Agregar selector de empleado (filtrado por `clinicalTitle`) en LegalDocGenerator.tsx
- [x] Auto-rellenar cédula profesional al seleccionar responsable desde catálogo

### P3 — Exportar Catálogo de Preguntas de Entrevistas de Salida a Excel ✅
- [x] Botón "Exportar a Excel" en la UI de catálogo de preguntas (ExitInterviews.tsx)
- [x] Usar xlsx (ya instalado) para generar el archivo sin dependencias extra

### P4 — Número de orden editable en Catálogo de Preguntas de Entrevistas de Salida ✅
- [x] Campo `sortOrder` editable inline en la tabla de preguntas de ExitInterviews.tsx

### P5 — Filtro por categoría en Catálogo de Preguntas de Entrevistas de Salida ✅
- [x] Agregar campo `category` a la tabla de preguntas de entrevistas de salida
- [x] Dropdown de filtro por categoría en la UI

### P6 — Mostrar QR de verificación NOM-151 en vista previa del Dictamen en pantalla ✅
- [x] Renderizar el QR visualmente en la vista previa HTML del Dictamen (ya existe en PDF, falta en preview)

### P7 — Validar cédula profesional automáticamente al seleccionar responsable clínico ✅
- [x] Mostrar badge de validación cuando se selecciona un empleado con cédula registrada (border-green-500 + texto "Auto-rellenada desde catálogo")

### P8 — RFC y NSS como columnas visibles en tabla catálogo de empleados ✅
- [x] Agregar columnas RFC y NSS como opcionales/toggle en la tabla de Employees.tsx (showRfcNss toggle en línea 48)

### P9 — Búsqueda por RFC y NSS en el catálogo de empleados ✅
- [x] Extender el campo de búsqueda de Employees.tsx para incluir RFC y NSS (db-employees.ts líneas 42-43)

---

## 🟡 PENDIENTES MEDIOS (mejoras de UX y completitud)

- [x] Accesos directos a módulos clave en el dashboard principal (Home.tsx)
- [x] Filtro temporal detallado en paneles de gestión (hoy / semana / mes / año / personalizado) — TurnoverDashboard + TrainingDashboard
- [x] Exportar Catálogo de Competencias a Excel desde OrganizationalCompetenciesManager.tsx
- [x] Exportar Catálogo de Puestos a Excel desde Positions.tsx
- [x] Preview de reporte ejecutivo antes de envío en ReportConfigurationPanel.tsx — Sprint 44: modal Eye con KPIs actuales
- [ ] Validación RFC contra SAT en tiempo real (requiere API externa)
- [x] Historial de salarios por empleado (tabla salaryHistory, router salaryHistory, tab en EmployeeProfile)
- [x] Gestión de vacaciones: solicitud, saldo LFT, flujo de aprobación, notificación a RH (VacationManagement.tsx)

---

## 🟢 OPCIONALES / BAJA PRIORIDAD

- [ ] Módulo de leads/ventas (LeadsPipeline, SalesComparativeDashboard) — evaluar si es relevante para NOM-035
- [ ] Migrar 6 usos de Breadcrumbs.tsx legacy a Breadcrumb.tsx (componente principal)
- [ ] Consolidar DashboardSkeleton.tsx / DashboardLayoutSkeleton.tsx / SkeletonLoader.tsx
- [ ] Script de migración de datos: asignar género aleatorio a empleados existentes
- [ ] Eventos de calendario de aprobaciones (approvalCalendarEvents)

---

## Sprint: Firma Digital, Filtro Escolaridad y Dashboard Vencimientos (2026-04-15)
- [x] Tabla contract_signatures creada en BD (SHA-256, S3 URL, signerName)
- [x] Procedures saveContractSignature y getContractSignatures en router hiring
- [x] Componente SignatureCanvas integrado en tab Contratos de EmployeeProfile
- [x] Campo minimumEducation agregado a tabla job_openings
- [x] Router recruitment actualizado con indicador meetsEducation por candidato
- [x] Página RecruitmentManagement con gestión de vacantes y filtro de escolaridad
- [x] Enlace "Reclutamiento" agregado al sidebar en Gestión de Talento
- [x] Página ContractExpirationDashboard con tabla consolidada 7/15/30 días
- [x] Exportación a Excel (XLSX) con hoja de datos y hoja de resumen ejecutivo
- [x] Enlace "Vencimientos de Contratos" agregado al sidebar en Gestión de Talento

## Sprint: Importación XLSX, Tab Vacaciones y Reporte de Rotación PDF (2026-04-16)
- [ ] Importar XLSX en Positions.tsx con plantilla descargable y procedure bulkImport
- [ ] Importar XLSX en OrganizationalCompetenciesManager.tsx con plantilla descargable y procedure bulkImport
- [ ] Tab "Vacaciones" en EmployeeProfile con saldo LFT e historial de solicitudes
- [ ] Datos por departamento en procedure getAnalytics de exitInterviews
- [ ] Exportación PDF en TurnoverDashboard con gráficas y tabla por departamento

## Sprint: Importación XLSX, Tab Vacaciones, Exportación PDF (2026-04-16)
- [x] Importar XLSX en Positions.tsx con plantilla descargable y procedure bulkImport
- [x] Importar XLSX en OrganizationalCompetenciesManager.tsx con plantilla descargable y procedure bulkImport
- [x] Tab "Vacaciones" en EmployeeProfile con saldo LFT (días ganados/usados/pendientes/disponibles) e historial de solicitudes
- [x] Botón "Exportar a PDF" en TurnoverDashboard usando window.print con estilos de impresión A4 landscape

## Sprint: Mejoras de Gestión de Vacaciones (2026-04-16)
- [x] Procedure `listByManager` en vacations router — lista solicitudes pendientes del equipo del supervisor/gerente/jefe_area filtradas por departamento
- [x] Procedure `getBalanceReport` en vacations router — saldo LFT por empleado agrupado por departamento, filtrable por departamento
- [x] Notificación por correo al empleado al aprobar/rechazar (sendEmail con HTML estilizado en updateStatus)
- [x] Tab "Aprobación de Equipo" en VacationManagement.tsx — visible para supervisor/gerente/jefe_area con botones Aprobar/Rechazar y campo de motivo de rechazo
- [x] Tab "Reporte de Saldo" en VacationManagement.tsx — tabla agrupada por departamento con saldo disponible por empleado y botón "Exportar XLSX" (2 hojas: detalle + resumen por departamento)
- [x] 0 errores TypeScript verificados (tsc --noEmit EXIT_CODE: 0)

## Sprint: Mejoras Avanzadas de Vacaciones — Notificaciones, Widget y Calendario (2026-04-16)
- [x] Notificación push WebSocket al supervisor al crear solicitud de vacaciones (emitNotificationToUser + insert notifications)
- [x] Widget de vacaciones en Home.tsx — saldo disponible (ganados/usados/pendientes/disponibles) para empleados
- [x] Widget de vacaciones en Home.tsx — contador de solicitudes pendientes de aprobación para supervisores
- [x] Procedure `getCalendar` en vacations router — filtro por año/mes/departamento, retorna períodos aprobados y pendientes
- [x] Página VacationCalendar.tsx — vista Gantt con barras por empleado y departamento + vista mensual tipo grid
- [x] Ruta /vacation-calendar registrada en App.tsx
- [x] Alias /vacations → VacationManagement registrado en App.tsx
- [x] Enlace "Calendario de Vacaciones" agregado al sidebar en Gestión de Talento
- [x] 0 errores TypeScript verificados

## Auditoría Profunda — Abril 2026

### Backend
- [x] Optimización N+1 en competenciesStats.ts: de ~200 queries por request a 4 queries en paralelo (Promise.all + mapas en memoria)
- [x] Notificación push WebSocket simétrica al empleado al aprobar/rechazar vacación (updateStatus)
- [x] Limpieza de import duplicado (notifications) y no usado (users) en vacations.ts
- [x] 0 errores TypeScript en watch mode

### Frontend
- [x] Eliminación de console.log/error/warn en 25 archivos de producción
- [x] ErrorBoundary con auto-recuperación de errores DOM (verificado)
- [x] EmptyState e InlineEmptyState reutilizables (verificado)
- [x] 0 errores en logs del servidor y browser console

### Hallazgos (sin cambios necesarios — ya implementados)
- [x] Todos los pendientes P1-P9 del todo.md ya estaban implementados
- [x] Bundle optimizado: vite.config.ts con manualChunks por vendor
- [x] 218 páginas con lazy loading en App.tsx
- [x] Servidor estable: 0 errores en runtime

## Sprint: Calendario Conflictos, PDF, Filtros Temporales y Tabla de Vacaciones (2026-04-16)
- [ ] Detección de conflictos de ausencias simultáneas en VacationCalendar.tsx (>30% departamento ausente → resaltado rojo + alerta)
- [ ] Exportar calendario de vacaciones a PDF (Gantt + mensual) con botón en VacationCalendar.tsx
- [ ] Filtro temporal detallado (hoy / semana / mes / año / rango personalizado) en CasesManagement.tsx
- [ ] Filtro temporal detallado en TurnoverDashboard.tsx
- [ ] Filtro temporal detallado en TrainingDashboard.tsx
- [ ] Panel de administración para editar tabla de días de vacaciones por año de antigüedad (VacationSeniorityManager.tsx)
- [ ] Procedure CRUD para vacation_seniority en vacations router
- [ ] Acceso al panel de tabla de vacaciones desde sidebar (Administración)

## Sprint: Multiempresa + Super Admin + Portada Legal — Abril 2026

- [ ] Agregar rol super_admin al enum de users en el schema
- [ ] Crear tabla companies con todos los campos de empresa
- [ ] Agregar company_id como FK en users para aislamiento de tenant
- [ ] Migración SQL y aplicar en base de datos
- [ ] Router super_admin: gestión de empresas, usuarios cross-tenant, estadísticas globales
- [ ] Panel SuperAdmin en frontend: lista de empresas, crear/editar empresa
- [ ] Umbral de conflicto configurable en panel de configuración del sistema
- [ ] Notificación automática al supervisor cuando se detecta conflicto de ausencias
- [ ] Filtro temporal DateRangeFilter en Dashboard de Casos
- [ ] Portada legal profesional con derechos reservados, confidencialidad y leyes aplicables

## Sprint: Multiempresa + Super Admin + Portada Legal — Abril 2026

- [x] Tabla companies en schema (name, rfc, address, phone, email, logo, plan, isActive, conflictThreshold)
- [x] Rol super_admin agregado al enum de roles en users
- [x] Campo company_id (FK nullable) agregado a tabla users
- [x] Migración SQL aplicada a la base de datos (companies + company_id + super_admin)
- [x] Router superAdmin.ts con CRUD de empresas, estadísticas globales y gestión cross-tenant
- [x] Página SuperAdminPanel.tsx con tabs: Empresas, Usuarios, Estadísticas globales
- [x] Ruta /super-admin registrada en App.tsx
- [x] Enlace "Super Administrador" en sidebar (visible solo para rol super_admin)
- [x] Campo conflict_threshold agregado a company_general_data (migración aplicada)
- [x] Detección de conflictos de ausencias simultáneas en procedure create de vacaciones (umbral dinámico desde BD)
- [x] Notificación push WebSocket + correo al supervisor cuando se detecta conflicto de ausencias
- [x] Filtro temporal en CasesManagement.tsx (DateRangeFilter conectado a listPaginated con dateFrom/dateTo)
- [x] Portada legal profesional /legal con 8 secciones colapsables:
  - Derechos Reservados y Propiedad Intelectual (LFDA, LPI, T-MEC)
  - Aviso de Privacidad LFPDPPP con Derechos ARCO
  - Marco Legal NOM-035-STPS-2018 con obligaciones del patrón
  - Confidencialidad y Uso de la Información
  - Términos y Condiciones de Uso
  - Seguridad de la Información (ISO 27001, OWASP, NIST)
  - Responsabilidad y Limitación de Garantías
  - Contacto del Responsable y Autoridades (INAI, STPS, IMSS)
- [x] Footer del DashboardLayout actualizado con enlaces a /legal (Aviso Legal y Privacidad | Términos de Uso | NOM-035-STPS-2018 • LFPDPPP)
- [x] Portada legal lee datos dinámicos de company.getGeneralData (razón social, RFC, representante legal, email, teléfono)

## Sprint: Términos LFPDPPP + Asignación Empresa + PDF Legal — Pendiente

- [ ] Tabla terms_acceptance en schema (userId, acceptedAt, ipAddress, userAgent, version)
- [ ] Migración SQL aplicada a la base de datos
- [ ] Procedure terms.accept y terms.hasAccepted en router
- [ ] Modal de aceptación de términos en primer login (App.tsx o layout)
- [ ] Botón "Asignar empresa" en tabla de usuarios del SuperAdminPanel
- [ ] Procedure superAdmin.assignCompany para vincular userId a companyId
- [ ] Botón "Descargar PDF" en /legal con estilos de impresión A4

## Sprint: My-Mailbox + Excel Export + Alerta Psicométrica — Abril 2026

- [ ] Crear página /my-mailbox para empleados con historial de mensajes e indicador no-leído
- [ ] Agregar procedure myMessages en internalMailbox router
- [ ] Agregar ruta /my-mailbox en App.tsx y entrada en sidebar DashboardLayout
- [ ] Instalar xlsx y agregar exportación a Excel en ExecutiveReport.tsx
- [ ] Agregar alerta automática de alto riesgo psicométrico en psychometric router
- [ ] Guardar checkpoint final del sprint

## Sprint: Filtro Mapa Calor + Badge Sidebar + PDF Psicométrico — Abril 2026

- [ ] Filtro empresa/sucursal en mapa de calor del Reporte Ejecutivo
- [ ] Badge mensajes no leídos en sidebar junto a Mis Mensajes
- [ ] Exportación PDF expediente psicométrico completo en PsychometricTab

## Sprint: Gráfica Psicométrica + Excel Buzón + Job Recordatorio — Abril 2026

- [ ] Gráfica Chart.js evolución puntaje psicométrico en PsychometricTab con umbrales de riesgo
- [ ] Exportar buzón interno a Excel con filtros aplicados en /mailbox-internal
- [ ] Job programado recordatorio anual evaluación psicométrica con notificación al admin RH
- [x] Exportar comparativa psicométrica a Excel en /executive-report
- [x] Modal de mensaje personalizado en "Notificar al empleado" del buzón
- [x] Historial de notificaciones enviadas por mensaje en detalle del buzón
- [ ] Límite 24h de notificaciones duplicadas en notifyEmployee
- [x] Exportación PDF del historial de notificaciones del buzón
- [ ] Selector de período histórico en comparativa psicométrica de /executive-report

## Sprint 9: Folio Configurable + Dashboard Calidad + PDF NOM-151 + Badges Cumplimiento — Abril 2026
- [x] Panel de configuración de folio con prefijo configurable (NOM035-DICT-) y consecutivo en LegalDocGenerator.tsx
- [x] Widget de calidad en Home.tsx — resumen Bug Reports (pendientes/corregidos) y Feature Requests (% implementadas)
- [x] Exportar dictamen a PDF con hash NOM-151, folio configurable, QR de verificación y firma del responsable
- [x] Badges de cumplimiento normativo en portada pública: NOM-151, LGPD/LFPDPPP, GDPR, ISO 27001, ISO 27002
- [x] Badges de cumplimiento normativo en header del dashboard autenticado
## Sprint 10: Portada Profesional + QR en Pantalla + Filtro Histórico + VacationSeniorityManager — Abril 2026
- [x] Rediseño completo de portada pública: dark, hero asimétrico con glow, grid de 6 features, stats bar, compliance strip, footer
- [x] Badges de cumplimiento NOM-151/LGPD/GDPR/ISO27001/ISO27002 en portada y dashboard
- [x] QR NOM-151 en vista previa del Dictamen en pantalla (no solo en PDF)
- [x] Filtro histórico en widget de calidad: Todo / 30 días / 90 días / 365 días
- [x] Backend bugReports.getStats acepta parámetro days opcional
- [x] Backend featureRequests.getStats acepta parámetro days opcional
- [x] Página VacationSeniorityManager.tsx: tabla editable de días por antigüedad con validación LFT
- [x] Ruta /vacation-seniority registrada en App.tsx
- [x] Enlace "Tabla de Antigüedad" en sidebar DashboardLayout
- [x] 487 pruebas unitarias pasando, 0 errores TypeScript
## Sprint 11: Selector Responsable Técnico + Seed Preguntas Salida + Filtro Período Libre + Backup Drive — Abril 2026
- [ ] P2: Selector de responsable técnico con auto-relleno de cédula en formulario del Dictamen
- [ ] P1: Seed de 15 preguntas predeterminadas para Entrevistas de Salida
- [ ] Filtro de período personalizado (rango libre) en widget de calidad del dashboard
- [ ] Exportar código completo a Google Drive (ZIP) y programar tarea semanal
- [x] P2: Selector de responsable técnico con auto-relleno de cédula (ya estaba implementado, verificado)
- [x] P1: Seed de 15 preguntas predeterminadas para Entrevistas de Salida (ya estaba implementado, verificado)
- [x] Filtro de período personalizado (rango libre) en widget de calidad: botón "Rango libre" + inputs fecha inicio/fin
- [x] Backend bugReports.getStats acepta dateFrom/dateTo (rango libre)
- [x] Backend featureRequests.getStats acepta dateFrom/dateTo (rango libre)

## Sprint 13: Auditoría Profunda + Gráfica NOM-035 + Seguimiento Acuerdos
- [x] Auditoría TypeScript: 4 errores corregidos en Home.tsx (propiedades widget de calidad)
- [x] Gráfica de barras Recharts en NOM035DetailedReport.tsx (colores por nivel de riesgo)
- [x] Módulo Seguimiento de Acuerdos del Comité: AgreementsDashboard.tsx verificado y completo
- [x] Campo email obligatorio en EmployeeNew.tsx y EmployeeEdit.tsx verificado y completo
- [x] Comparativa Q1/Q2 en widget de calidad: botón toggle + panel período B
- [x] Pruebas unitarias Sprint 13: 10/10 passed

## Sprint 14: Exportación Excel, KPIs Ejecutivos, CURP Autocompletado
- [x] Exportación Excel en NOM035DetailedReport.tsx (xlsx con hojas: Resumen, Categorías, Dominios, Dimensiones, Plan de Acción)
- [x] Panel KPIs ejecutivos /kpi-dashboard con métricas de personal, capacitación, bienestar y gráficas de tendencia
- [x] Enlace "Panel KPIs Ejecutivos" agregado al sidebar en sección de Reportes y Análisis
- [x] Autocompletado CURP verificado: decodifica fecha, sexo y estado de nacimiento localmente
- [x] Corrección TypeScript: propiedades de getTrends (labels/cases/trainingCompletions/employeeExits)
- [x] Pruebas unitarias Sprint 14: 18 tests (Excel, KPIs, CURP, tendencias)

## Sprint 15: Filtro Departamento KPIs, PAC, Alerta Dictamen (2026-04-24)
- [x] Selector de departamento en /kpi-dashboard: filtra todas las métricas (rotación, % capacitado, NOM-035) por área organizacional
- [x] Módulo PAC: tablas annual_training_plans + annual_training_plan_items en schema + migración SQL aplicada
- [x] Router annualTrainingPlan.ts con procedures: list, getById, create, update, delete, addItem, updateItem, deleteItem, updateProgress
- [x] Página AnnualTrainingPlan.tsx con formulario, tabla de items, seguimiento de avance y exportación PDF (jsPDF)
- [x] Ruta /training/annual-plan registrada en App.tsx + enlace en sidebar DashboardLayout
- [x] Job dictamen-expiry-alert-job.ts: alerta 30 días antes de vencimiento de Dictamen NOM-035 (12 meses vigencia)
- [x] Job registrado en _core/index.ts: corre diariamente a las 08:00
- [x] Notificación interna + notifyOwner + email al responsable técnico cuando dictamen próximo a vencer
- [x] Pruebas unitarias Sprint 15: 13/13 passed (job dictamen, módulo PAC, filtro departamento)

## Sprint 16: PAC-DNC, Widget Dictamen, Comparativa Departamentos
- [x] PAC-DNC: campo dncId en annual_training_plan_items (schema + migración SQL)
- [x] PAC-DNC: procedure listDncNeeds en annualTrainingPlan router
- [x] PAC-DNC: selector DNC en formulario de items del PAC
- [x] Widget Dictamen: procedure getVigencia en dictamenDocs router
- [x] Widget Dictamen: semaforo verde/amarillo/rojo en Home.tsx dashboard
- [x] Comparativa Depts: procedure getComparativaDepts en executiveReport router
- [x] Comparativa Depts: tabla comparativa en /kpi-dashboard con rotacion, % capacitado, NOM-035

## Sprint 16: PAC-DNC, Widget Dictamen, Comparativa Departamentos (2026-04-24)
- [x] PAC-DNC: campo dncId en annual_training_plan_items (schema + migración SQL)
- [x] PAC-DNC: procedure listDncNeeds en annualTrainingPlan router
- [x] PAC-DNC: selector DNC en formulario de items del PAC
- [x] Widget Dictamen: procedure getVigencia en dictamenDocs router
- [x] Widget Dictamen: semáforo verde/amarillo/rojo en Home.tsx dashboard
- [x] Comparativa Depts: procedure getComparativaDepts en executiveReport router
- [x] Comparativa Depts: tabla comparativa en /kpi-dashboard con rotación, % capacitado, NOM-035

## Sprint 17: Exportar XLSX comparativa, Historial PAC por año, Notificación responsable PAC (2026-04-24)
- [ ] Exportar comparativa de departamentos a Excel desde /kpi-dashboard (botón "Exportar XLSX")
- [ ] Historial de PAC por año: selector de año en AnnualTrainingPlan.tsx (filtro por año fiscal)
- [ ] Historial de PAC: procedure `listByYear` en annualTrainingPlan router con parámetro year
- [ ] Job de notificación al responsable del PAC: pac-stale-items-job.ts (cursos >30 días sin actualizar)
- [ ] Job registrado en server/_core/index.ts con schedule diario
- [ ] 0 errores TypeScript antes de checkpoint

## Sprint 17 — Completado (2026-04-24)
- [x] Exportar comparativa de departamentos a XLSX en /kpi-dashboard (botón "Exportar XLSX" con librería xlsx)
- [x] Historial de PAC por año: procedure getAvailableYears, selector de pills y filtro dinámico en AnnualTrainingPlan
- [x] Job pac-stale-items-job: notificación diaria (09:00) al responsable del PAC cuando un curso lleva >30 días sin actualizar
- [x] Tests del job pac-stale-items-job (2 casos: BD no disponible, sin items estancados)

## Sprint 21: Notificaciones WebSocket, Dashboard Alertas y Exportación Multi-formato

- [x] Job de notificaciones en tiempo real (realtime-alerts-job.ts): tareas vencidas y contratos próximos a vencer vía WebSocket cada 15 min
- [x] Dashboard de Administración de Alertas (/alert-admin-dashboard): umbrales, frecuencia de resumen, destinatarios de email e intervalo WebSocket
- [x] Exportación multi-formato (XLSX, PDF, Word) en ModelPerformanceAlerts con botones en encabezado y en tab Historial

## Sprint 27: Service Worker, Core Web Vitals, SMTP UI, Paginación y Portada PDF ✅
- [x] Service Worker PWA con estrategia NetworkFirst para JS (skipWaiting + clientsClaim)
- [x] Métricas Core Web Vitals (LCP, CLS, INP, FCP, TTFB) recolectadas en cliente via web-vitals
- [x] Formulario de configuración SMTP en /alert-admin-dashboard (SMTP_HOST, SMTP_USER, SMTP_PASS, SMTP_FROM)
- [x] Paginación 20/página en /alert-history con controles Anterior/Siguiente y contador total
- [x] Portada institucional en PDF del Reporte Ejecutivo (fondo slate-900, logo, empresa, RFC, fecha)

## Sprint 28: Datos Empresa en PDF, Exportación Completa Alertas, Dashboard Web Vitals ✅
- [x] Formulario en /settings para capturar Razón Social, RFC y Domicilio Fiscal (system_settings)
- [x] Logo de empresa: upload a S3 (PNG/JPG/SVG máx 2MB), preview, eliminar
- [x] Portada PDF usa datos de empresa dinámicos (company_name, company_rfc, company_address, company_logo)
- [x] Botón "Exportar todo" en /alert-history: descarga todos los registros sin límite de página
- [x] Procedure getAllAlertsForExport en systemSettings router
- [x] Dashboard Core Web Vitals (/web-vitals): gráficas de tendencia, distribución good/needs-improvement/poor
- [x] Tabla web_vitals_metrics en BD con migración aplicada
- [x] Router webVitals.ts con procedures saveMetric y getMetrics
- [x] Enlace "Core Web Vitals" en sidebar (solo admins, ícono Zap)

## Sprint 29: Sidebar Web Vitals, Alertas LCP, Logo Empresa en PDF ✅
- [x] Enlace ⚡ Core Web Vitals en sidebar bajo sección Administración (solo admins)
- [x] Job performance-lcp-alerts: detecta LCP P75 > 4000ms por 3 días consecutivos → alerta warning en /alert-history
- [x] Enum alertType extendido con `performance_lcp`
- [x] Logo de empresa renderizado en portada PDF (reemplaza círculo NOM-035)
- [x] Tests Sprint 29: 11/11 pasados

## Sprint 30: Corrección Pantalla Blanca, Spinner, Modal PDF ← EN PROGRESO
- [x] Corrección definitiva pantalla en blanco: vite y plugins movidos de devDependencies a dependencies
- [x] Fallback Vite dev server cuando dist/public no existe en producción
- [x] Tests de integración del servidor: 10/10 pasados
- [x] todo.md reorganizado: duplicados eliminados, sprints completados marcados, backlog priorizado
- [ ] Spinner de carga inicial en client/index.html (antes de que React monte)
- [ ] Modal de previsualización PDF en ExecutiveReport con <iframe> y jsPDF.output("datauristring")
- [ ] Tests Sprint 30 y checkpoint final

---

## 📋 BACKLOG PRIORIZADO (pendientes reales)

### P1 — Alta Prioridad
- [ ] Seed de 15 preguntas predeterminadas para Entrevistas de Salida
- [ ] Selector de responsable técnico con auto-relleno de cédula en formulario del Dictamen
- [ ] Historial de PAC por año: selector de año fiscal + procedure listByYear
- [ ] Exportar comparativa de departamentos a Excel desde /kpi-dashboard
- [ ] Badge mensajes no leídos en sidebar junto a "Mis Mensajes"
- [ ] Filtro de período personalizado (rango libre) en widget de calidad del dashboard

### P2 — Media Prioridad
- [ ] Filtro empresa/sucursal en mapa de calor del Reporte Ejecutivo
- [ ] Exportación PDF expediente psicométrico completo en PsychometricTab
- [ ] Exportar buzón interno a Excel con filtros aplicados en /mailbox-internal
- [ ] Job recordatorio anual evaluación psicométrica con notificación al admin RH
- [ ] Límite 24h notificaciones duplicadas en notifyEmployee
- [ ] Selector de período histórico en comparativa psicométrica de /executive-report
- [ ] Portada legal profesional con derechos reservados, confidencialidad y leyes aplicables

### P3 — Baja Prioridad
- [ ] Multi-tenant SuperAdmin: rol super_admin, tabla companies, aislamiento por company_id
- [ ] Modal aceptación de términos en primer login (tabla terms_acceptance)
- [ ] Botón "Descargar PDF" en /legal con estilos de impresión A4
- [ ] Umbral de conflicto configurable en panel de configuración del sistema
- [ ] Exportar código a Google Drive (ZIP) con tarea semanal programada
- [ ] Alertas automáticas LCP con notificación por email al HR email configurado
- [ ] Banner "Nueva versión disponible" toast no intrusivo al activarse el nuevo Service Worker

### 🐛 Bugs conocidos (no críticos)
- [ ] @builder.io/vite-plugin-jsx-loc peer warning con Vite 7 (funciona correctamente)
- [ ] Módulos @shared/_core/errors y extensiones .ts en predictiveCorrelation.ts (pre-existentes)

---

## Sprint 34 — UX Crítica + Buzón (2026-04-27)
- [x] Badge mensajes no leídos en sidebar junto a "Mis Mensajes" (ya implementado: MenuBadge en DashboardLayout línea 686)
- [x] Spinner de carga inicial en client/index.html (ya implementado: #app-loading con animación CSS)
- [x] Modal de previsualización PDF en ExecutiveReport con <iframe> y jsPDF (ya implementado: línea 452+)
- [x] Exportar buzón interno a Excel con filtros aplicados en /mailbox-internal (ya implementado: exportToExcel línea 364)

## Sprint 35 — Módulo Psicométrico Completo (2026-04-27)
- [x] Gráfica Chart.js evolución puntaje psicométrico con umbrales de riesgo en PsychometricTab (ya implementado: PsychometricChart con thresholds línea 103)
- [x] Selector de período histórico en comparativa psicométrica de /executive-report (ya implementado: compareMonthsAgo línea 169)
- [x] Exportación PDF expediente psicométrico completo en PsychometricTab (ya implementado: exportPDF línea 184)
- [x] Job recordatorio anual evaluación psicométrica con notificación al admin RH (ya implementado: psychometric-reminder-job.ts registrado en index.ts línea 309)
- [x] Límite 24h de notificaciones duplicadas en notifyEmployee (ya implementado: validación cutoff línea 297)

## Sprint 36 — KPI Dashboard + Planes de Acción (2026-04-27)
- [x] Indicador variación % en KPI de rotación (▲/▼ vs año anterior) (badge rojo/verde/gris en KPIDashboard)
- [x] Vista de seguimiento de Planes de Acción en AnalyticsDashboard de Entrevistas de Salida (ActionPlansTracker)
- [x] Notificación automática al completar un Plan de Acción (notifyOwner en updateActionPlanStatus)
- [ ] Filtro empresa/sucursal en mapa de calor (requiere tabla sucursales en schema — pendiente de diseño)

## Sprint 37 — Vacaciones: Conflictos Visuales + PDF + Filtros (2026-04-27)
- [x] Resaltado visual rojo + alerta en VacationCalendar cuando >X% departamento ausente (ya implementado: bg-red-100/60 + AlertTriangle línea 389)
- [x] Exportar calendario de vacaciones a PDF (ya implementado: window.print() + botón línea 189)
- [x] Filtro temporal detallado en TurnoverDashboard.tsx (ya implementado: hoy/semana/mes/año con startDate/endDate)
- [x] Filtro temporal detallado en TrainingDashboard.tsx (ya implementado: getPeriodDates() línea 10)

## Sprint 38 — Legal y Compliance (2026-04-27)
- [x] Tabla terms_acceptance en schema + migración SQL (ya existía)
- [x] Procedures terms.accept y terms.hasAccepted en router (ya existían)
- [x] Modal de aceptación de términos en primer login (App.tsx) (TermsGuard integrado)
- [x] Botón "Asignar empresa" en SuperAdminPanel (assignUserToCompany ya existía)
- [x] Botón "Descargar PDF" en /legal (LegalPortada.tsx con window.print() ya existía)

## Sprint 39 — Deuda Técnica y PWA (2026-04-27)
- [x] Banner "Nueva versión disponible" toast al activarse nuevo Service Worker (PWAUpdateBanner.tsx + useRegisterSW integrado en App.tsx)
- [x] Alertas LCP con notificación por email al HR email configurado (performance-lcp-alerts-job.ts actualizado con sendEmail + getHrEmail)
- [x] Migrar Breadcrumbs legacy (no había usos de Breadcrumbs.tsx legacy en el proyecto)
- [x] Consolidar Skeletons (directorio /skeletons/ ya consolidado con DashboardSkeleton, TableSkeleton, ChartSkeleton, CalendarSkeleton)

## Sprint 40 — Branches, Excel Catálogos, Importar Preguntas XLSX (2026-04-27) ✅
- [x] Tabla branches en schema + migración SQL (id, name, address, city, state, phone, isActive)
- [x] Procedure branches.list, branches.listAll, branches.create, branches.update, branches.delete
- [x] Campo branchId en employees + migración SQL aplicada
- [x] Filtro empresa/sucursal en DepartmentalTrends.tsx (mapa de calor departamental)
- [x] Botón "Exportar Excel" en Positions.tsx (ya implementado, verificado)
- [x] Botón "Exportar Excel" en OrganizationalCompetenciesManager.tsx (ya implementado, verificado)
- [x] Botón "Importar XLSX" en catálogo de preguntas de ExitInterviews.tsx con import dinámico
- [x] Procedure exitInterviews.importQuestions en el router con replaceAll y conteo inserted/skipped
- [x] Tests Sprint 40: 13/13 passed

## Sprint 41 — Fix LandingPage + Branches CRUD + XLSX Template + KPI Branch Filter (2026-04-27) ✅
- [x] Corregir spinner infinito: timeout de seguridad de 2s en main.tsx + selfDestroying SW en vite.config.ts
- [x] Página /branches con tabla CRUD (alta, edición, activar/desactivar con AlertDialog de confirmación)
- [x] Enlace a /branches en sidebar de DashboardLayout (sección Administración)
- [x] Botón "Plantilla" en ExitInterviews.tsx — descarga CSV con 5 filas de ejemplo y BOM UTF-8
- [x] Selector de sucursal en KPI Dashboard con badge verde y filtro en getKPIs
- [x] Procedure getKPIs acepta branchId + filtro combinado departmentId+branchId
- [x] Tests Sprint 41: 22/22 passed | TypeScript: 0 errores

## Sprint 42 — Fix Spinner Definitivo (PWA eliminado) + Selector Sucursal en EmployeeEdit (2026-04-27) ✅
- [x] VitePWA eliminado completamente de vite.config.ts (import comentado + bloque eliminado del array de plugins)
- [x] PWAUpdateBanner reemplazado por stub vacío sin import de virtual:pwa-register/react
- [x] Script inline en index.html para desregistrar todos los SWs y limpiar cachés antes de que React cargue
- [x] Selector de sucursal en EmployeeEdit.tsx con query branches.listAll y campo branchId en formData
- [x] branchId incluido en dataToSubmit del handleSubmit
- [x] Tests Sprint 41 actualizados: 24/24 passed | TypeScript: 0 errores

## Sprint 43 — Reporte Comparativo por Sucursal exportable a Excel (2026-05-05) ✅
- [x] Procedure executiveReport.getBranchComparative con dateFrom/dateTo opcionales
- [x] Métricas por sucursal: rotationRate, trainingRate, nom035Score, highRiskCount, totalEmployees, activeEmployees
- [x] Página BranchComparativeReport.tsx con tabla comparativa ordenable, KPI cards, gráficas recharts
- [x] Filtros de fecha (dateFrom/dateTo) con inputs tipo date en el header
- [x] Exportación a Excel con xlsx (sucursal, ciudad, estado, empleados, rotación, capacitación, NOM-035, riesgo)
- [x] Ruta /branch-comparative registrada en App.tsx con lazy import
- [x] Enlace en sidebar de DashboardLayout bajo sección Reportes y Análisis
- [x] Fix spinner definitivo: VitePWA eliminado, useAuth timeout 8s, LandingPage auto-redirect
- [x] Tests Sprint 43: 24/24 passed | TypeScript: 0 errores
