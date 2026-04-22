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

### P1 — Seed de preguntas predeterminadas para Entrevistas de Salida
- [ ] Agregar procedure `seedDefaultQuestions` en exitInterviews.ts con 15 preguntas estándar sobre causas de rotación
- [ ] Botón "Cargar preguntas predeterminadas" en UI de ExitInterviews.tsx
- [ ] Verificar que las preguntas se cargan correctamente en la BD

### P2 — Selector de responsable técnico en formulario del Dictamen
- [ ] Agregar selector de empleado (filtrado por `clinicalTitle`) en LegalDocGenerator.tsx
- [ ] Auto-rellenar cédula profesional al seleccionar responsable desde catálogo

### P3 — Exportar Catálogo de Preguntas de Entrevistas de Salida a Excel
- [ ] Botón "Exportar a Excel" en la UI de catálogo de preguntas (ExitInterviews.tsx)
- [ ] Usar xlsx (ya instalado) para generar el archivo sin dependencias extra

### P4 — Número de orden editable en Catálogo de Preguntas de Entrevistas de Salida
- [ ] Campo `sortOrder` editable inline en la tabla de preguntas de ExitInterviews.tsx

### P5 — Filtro por categoría en Catálogo de Preguntas de Entrevistas de Salida
- [ ] Agregar campo `category` a la tabla de preguntas de entrevistas de salida
- [ ] Dropdown de filtro por categoría en la UI

### P6 — Mostrar QR de verificación NOM-151 en vista previa del Dictamen en pantalla
- [ ] Renderizar el QR visualmente en la vista previa HTML del Dictamen (ya existe en PDF, falta en preview)

### P7 — Validar cédula profesional automáticamente al seleccionar responsable clínico
- [ ] Mostrar badge de validación cuando se selecciona un empleado con cédula registrada

### P8 — RFC y NSS como columnas visibles en tabla catálogo de empleados
- [ ] Agregar columnas RFC y NSS como opcionales/toggle en la tabla de Employees.tsx

### P9 — Búsqueda por RFC y NSS en el catálogo de empleados
- [ ] Extender el campo de búsqueda de Employees.tsx para incluir RFC y NSS

---

## 🟡 PENDIENTES MEDIOS (mejoras de UX y completitud)

- [x] Accesos directos a módulos clave en el dashboard principal (Home.tsx)
- [ ] Filtro temporal detallado en paneles de gestión (hoy / semana / mes / año / personalizado)
- [ ] Exportar Catálogo de Competencias a Excel desde OrganizationalCompetenciesManager.tsx
- [ ] Exportar Catálogo de Puestos a Excel desde Positions.tsx
- [ ] Preview de reporte ejecutivo antes de envío en ReportConfigurationPanel.tsx
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
