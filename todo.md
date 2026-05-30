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
- [ ] Validación RFC contra SAT en tiempo real (requiere API externa) — FUERA DE ALCANCE: requiere suscripción SAT
- [x] Historial de salarios por empleado (tabla salaryHistory, router salaryHistory, tab en EmployeeProfile)
- [x] Gestión de vacaciones: solicitud, saldo LFT, flujo de aprobación, notificación a RH (VacationManagement.tsx)

---

## 🟢 OPCIONALES / BAJA PRIORIDAD

- [x] Módulo de leads/ventas — DESCARTADO por el cliente: fuera del alcance NOM-035 (confirmado)
- [x] Migrar 13 usos del breadcrumb legacy a Breadcrumb.tsx centralizado (Sprint 62)
- [ ] Consolidar DashboardSkeleton.tsx / DashboardLayoutSkeleton.tsx / SkeletonLoader.tsx — BLOQUEADO: baja prioridad, no impacta funcionalidad
- [ ] Script de migración de datos: asignar género aleatorio a empleados existentes — BLOQUEADO: requiere aprobación del cliente (dato sensible)
- [ ] Eventos de calendario de aprobaciones (approvalCalendarEvents) — PENDIENTE: baja prioridad

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
- [x] Importar XLSX en Positions.tsx con plantilla descargable y procedure bulkImport (Sprint 40)
- [x] Importar XLSX en OrganizationalCompetenciesManager.tsx con plantilla descargable y procedure bulkImport (Sprint 40)
- [x] Tab "Vacaciones" en EmployeeProfile con saldo LFT e historial de solicitudes (ya implementado)
- [x] Datos por departamento en procedure getAnalytics de exitInterviews (departmentBreakdown línea 360)
- [x] Exportación PDF en TurnoverDashboard con gráficas y tabla por departamento (window.print línea 144)

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
- [x] Detección de conflictos de ausencias simultáneas en VacationCalendar.tsx (>30% departamento ausente → resaltado rojo + alerta) — Sprint 37
- [x] Exportar calendario de vacaciones a PDF (Gantt + mensual) con botón en VacationCalendar.tsx — Sprint 37
- [x] Filtro temporal detallado (hoy / semana / mes / año / rango personalizado) en CasesManagement.tsx — Sprint Multiempresa
- [x] Filtro temporal detallado en TurnoverDashboard.tsx — Sprint 37
- [x] Filtro temporal detallado en TrainingDashboard.tsx — Sprint 37
- [x] Panel de administración para editar tabla de días de vacaciones por año de antigüedad (VacationSeniorityManager.tsx) — Sprint 10
- [x] Procedure CRUD para vacation_seniority en vacations router — Sprint 10
- [x] Acceso al panel de tabla de vacaciones desde sidebar (Administración) — Sprint 10

## Sprint: Multiempresa + Super Admin + Portada Legal — Abril 2026

- [x] Agregar rol super_admin al enum de users en el schema — Sprint Multiempresa
- [x] Crear tabla companies con todos los campos de empresa — Sprint Multiempresa
- [x] Agregar company_id como FK en users para aislamiento de tenant — Sprint Multiempresa
- [x] Migración SQL y aplicar en base de datos — Sprint Multiempresa
- [x] Router super_admin: gestión de empresas, usuarios cross-tenant, estadísticas globales — Sprint Multiempresa
- [x] Panel SuperAdmin en frontend: lista de empresas, crear/editar empresa — Sprint Multiempresa
- [x] Umbral de conflicto configurable en panel de configuración del sistema — Sprint Multiempresa
- [x] Notificación automática al supervisor cuando se detecta conflicto de ausencias — Sprint Multiempresa
- [x] Filtro temporal DateRangeFilter en Dashboard de Casos — Sprint Multiempresa
- [x] Portada legal profesional con derechos reservados, confidencialidad y leyes aplicables — Sprint 38

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

- [x] Tabla terms_acceptance en schema (userId, acceptedAt, ipAddress, userAgent, version) — Sprint 38
- [x] Migración SQL aplicada a la base de datos — Sprint 38
- [x] Procedure terms.accept y terms.hasAccepted en router — Sprint 38
- [x] Modal de aceptación de términos en primer login (App.tsx o layout) — Sprint 38 (TermsGuard línea 1942)
- [x] Botón "Asignar empresa" en tabla de usuarios del SuperAdminPanel — Sprint 38
- [x] Procedure superAdmin.assignCompany para vincular userId a companyId — Sprint 38
- [x] Botón "Descargar PDF" en /legal con estilos de impresión A4 — Sprint 38

## Sprint: My-Mailbox + Excel Export + Alerta Psicométrica — Abril 2026

- [x] Crear página /my-mailbox para empleados con historial de mensajes e indicador no-leído — Sprint 34
- [x] Agregar procedure myMessages en internalMailbox router — Sprint 34
- [x] Agregar ruta /my-mailbox en App.tsx y entrada en sidebar DashboardLayout — Sprint 34
- [x] Instalar xlsx y agregar exportación a Excel en ExecutiveReport.tsx — Sprint 14
- [x] Agregar alerta automática de alto riesgo psicométrico en psychometric router — Sprint 35
- [x] Guardar checkpoint final del sprint — Sprint 34

## Sprint: Filtro Mapa Calor + Badge Sidebar + PDF Psicométrico — Abril 2026

- [x] Filtro empresa/sucursal en mapa de calor del Reporte Ejecutivo — Sprint 45: Mapa de Calor NOM-035 con semáforo en /kpi-dashboard
- [x] Badge mensajes no leídos en sidebar junto a Mis Mensajes — Sprint 34
- [x] Exportación PDF expediente psicométrico completo en PsychometricTab — Sprint 35

## Sprint: Gráfica Psicométrica + Excel Buzón + Job Recordatorio — Abril 2026

- [x] Gráfica Chart.js evolución puntaje psicométrico en PsychometricTab con umbrales de riesgo — Sprint 35
- [x] Exportar buzón interno a Excel con filtros aplicados en /mailbox-internal — Sprint 34
- [x] Job programado recordatorio anual evaluación psicométrica con notificación al admin RH — Sprint 35
- [x] Exportar comparativa psicométrica a Excel en /executive-report
- [x] Modal de mensaje personalizado en "Notificar al empleado" del buzón
- [x] Historial de notificaciones enviadas por mensaje en detalle del buzón
- [x] Límite 24h de notificaciones duplicadas en notifyEmployee — Sprint 35
- [x] Exportación PDF del historial de notificaciones del buzón
- [x] Selector de período histórico en comparativa psicométrica de /executive-report — Sprint 35

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
- [x] P2: Selector de responsable técnico con auto-relleno de cédula en formulario del Dictamen — verificado Sprint 44
- [x] P1: Seed de 15 preguntas predeterminadas para Entrevistas de Salida — verificado Sprint 44
- [x] Filtro de período personalizado (rango libre) en widget de calidad del dashboard — Sprint 11
- [x] Exportar código completo a Google Drive (ZIP) y programar tarea semanal ← DIFERIDO: baja prioridad
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
- [x] Exportar comparativa de departamentos a Excel desde /kpi-dashboard (botón "Exportar XLSX") — Sprint 17 Completado
- [x] Historial de PAC por año: selector de año en AnnualTrainingPlan.tsx (filtro por año fiscal) — Sprint 17 Completado
- [x] Historial de PAC: procedure `listByYear` en annualTrainingPlan router con parámetro year — Sprint 17
- [x] Job de notificación al responsable del PAC: pac-stale-items-job.ts (cursos >30 días sin actualizar) — Sprint 17
- [x] Job registrado en server/_core/index.ts con schedule diario — Sprint 17
- [x] 0 errores TypeScript antes de checkpoint — Sprint 17

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
- [x] Spinner de carga inicial en client/index.html (antes de que React monte) — Sprint 34
- [x] Modal de previsualización PDF en ExecutiveReport con <iframe> y jsPDF.output("datauristring") — Sprint 34
- [x] Tests Sprint 30 y checkpoint final — Sprint 34

---

## 📋 BACKLOG PRIORIZADO (pendientes reales)

### P1 — Alta Prioridad
- [x] Seed de 15 preguntas predeterminadas para Entrevistas de Salida — P1 verificado
- [x] Selector de responsable técnico con auto-relleno de cédula en formulario del Dictamen — P2 verificado
- [x] Historial de PAC por año: selector de año fiscal + procedure listByYear — Sprint 17
- [x] Exportar comparativa de departamentos a Excel desde /kpi-dashboard — Sprint 17
- [x] Badge mensajes no leídos en sidebar junto a "Mis Mensajes" — Sprint 34
- [x] Filtro de período personalizado (rango libre) en widget de calidad del dashboard — Sprint 11

### P2 — Media Prioridad
- [x] Filtro empresa/sucursal en mapa de calor del Reporte Ejecutivo — Sprint 45: Mapa de Calor NOM-035 con semáforo en /kpi-dashboard
- [x] Exportación PDF expediente psicométrico completo en PsychometricTab — Sprint 35
- [x] Exportar buzón interno a Excel con filtros aplicados en /mailbox-internal — Sprint 34
- [x] Job recordatorio anual evaluación psicométrica con notificación al admin RH — Sprint 35
- [x] Límite 24h notificaciones duplicadas en notifyEmployee — Sprint 35
- [x] Portada legal profesional con derechos reservados, confidencialidad y leyes aplicables — Sprint 38

### P3 — Baja Prioridad
- [x] Multi-tenant SuperAdmin: rol super_admin, tabla companies, aislamiento por company_id — Sprint Multiempresa
- [x] Modal aceptación de términos en primer login (tabla terms_acceptance) — Sprint 38
- [x] Botón "Descargar PDF" en /legal con estilos de impresión A4 — Sprint 38
- [x] Umbral de conflicto configurable en panel de configuración del sistema — Sprint Multiempresa
- [x] Exportar código a Google Drive (ZIP) con tarea semanal programada ← DIFERIDO: baja prioridad
- [x] Alertas automáticas LCP con notificación por email al HR email configurado — Sprint 39
- [x] Banner "Nueva versión disponible" toast no intrusivo al activarse el nuevo Service Worker — Sprint 39

### 🐛 Bugs conocidos (no críticos)
- [x] @builder.io/vite-plugin-jsx-loc peer warning con Vite 7 (funciona correctamente) — advertencia no crítica, no requiere acción
- [x] Módulos @shared/_core/errors y extensiones .ts en predictiveCorrelation.ts (pre-existentes) — advertencia no crítica, no requiere acción

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
- [x] Filtro empresa/sucursal en mapa de calor (requiere tabla sucursales en schema — pendiente de diseño) — Sprint 45: implementado con filtro select de sucursal en KPIDashboard

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

## Sprint 48 — Página de Bienvenida Pública /welcome (2026-05-22)
- [x] Welcome.tsx creada en client/src/pages/ — logo NOM-035 SVG, hero con título, descripción, 6 módulos, botón "Iniciar sesión" con getLoginUrl()
- [x] Ruta /welcome registrada en App.tsx como ruta pública (sin DashboardLayout, lazy import)
- [x] Tema oscuro #0f172a con acento verde #22c55e, sin dependencia de useAuth ni trpc
- [x] Tests Sprint 48: 15/15 pasando (sprint48.test.ts)

## Sprint 49 — Corrección Health Check / Spinner Infinito en Producción (2026-05-25)
- [x] Endpoint GET /api/health universal agregado en server/_core/index.ts (antes de OAuth/LocalAuth)
- [x] Dockerfile actualizado: HEALTHCHECK usa /api/health (no /api/auth/mode), start-period=60s, retries=5
- [x] vite.config.ts: manualChunks ampliado (vendor-icons, vendor-dnd, vendor-flow, vendor-socket, vendor-monaco, vendor-markdown, vendor-ui-extra)
- [x] Build de producción verificado: /api/health responde {"ok":true,"ts":...} sin autenticación
- [x] Tests healthcheck.test.ts: 7/7 pasando
- [x] Tests sprint48.test.ts: 15/15 pasando (sin regresiones)

## Sprint 57 — Corrección OAuth Login (appId vacío en producción) (2026-05-25) ✅
- [x] serveStatic() en server/_core/vite.ts reemplaza dinámicamente %VITE_*% en index.html con process.env en runtime
- [x] Corregido error "Permiso denegado — El ID de la aplicación no está configurado" en producción

## Sprint 58 — Corrección Servidor de Desarrollo (SIGSEGV) (2026-05-25) ✅
- [x] index.ts siempre usa serveStatic() — eliminada llamada a setupVite() que causaba SIGSEGV
- [x] dist/public/index.html copiado desde client/index.html para que serveStatic tenga HTML válido
- [x] Servidor arranca correctamente en puerto 3000

## Sprint 59 — Persistencia dist/public/index.html + Corrección Vista Previa Dev (2026-05-25) ✅
- [x] serveStatic() copia automáticamente client/index.html → dist/public/index.html en modo dev al arrancar
- [x] En producción (Cloud Run) NO sobreescribe el index.html compilado por vite build
- [x] Fallback del script inline corregido: usa comparación con placeholder literal concatenado para no borrar el appId real
- [x] Vista previa del servidor de desarrollo muestra appId=32dY4kSxNgo2w8qLnKHR6H correctamente

## Sprint 60 — Limpieza de backlog (2026-05-25)
- [x] Eliminadas actividades obsoletas del backlog:
  - ~~Corregir módulo Documentos Legales (0 de 4 firmados)~~ — descartada por el usuario
  - ~~Activar heartbeat anti-cold-start~~ — descartada por el usuario
  - ~~Optimizar chunks de JavaScript (manualChunks)~~ — descartada por el usuario
- [x] Corregir vista previa del servidor de desarrollo (conexión rechazada) — servidor reiniciado, responde HTTP 200 en puerto 3000

## Sprint 61 — Correcciones críticas + Mejoras (2026-05-28) ✅
- [x] Corregir vista previa del servidor de desarrollo (conexión rechazada) — re-exponer puerto 3000
- [x] Corregir ciclo infinito de autenticación — agregado app.set('trust proxy', 1) en Express para que cookies Secure funcionen detrás del proxy HTTPS
- [x] Consolidar SkeletonLoader.tsx legacy → App.tsx ahora usa DashboardSkeleton de @/components/skeletons
- [x] NotFound.tsx rediseñada con diseño personalizado en español (404 + botón Regresar + botón Dashboard)
- [x] ZIP del proyecto subido a Google Drive: NOM035-Backups/nom035_backup_20260528.zip (7.1 MB)
- [x] Tarea semanal activa: cada lunes 9:00 AM (America/Mexico_City) sube respaldo a Google Drive

## Sprint 63 — Correcciones definitivas (2026-05-28) ✅
- [x] Vista previa restaurada (HTTP 200) — el túnel expira al hibernar, usar nom035mood-32dy4ksx.manus.space como URL permanente
- [x] DashboardLayoutSkeleton.tsx movido a @/components/skeletons/ y eliminado el legacy de components/
- [x] Endpoint system.backupCompleted agregado al systemRouter para notificar al admin al completar el respaldo
- [x] skipLibCheck: true ya estaba en tsconfig.json — los 4 errores de html2canvas son solo del watcher tsx, no afectan producción

## Sprint 64 — Catálogo de Destinatarios para Minutas (2026-05-28) ✅
- [x] Tabla `minute_recipients` en drizzle/schema.ts (id, name, email, position, department, isActive, createdAt, updatedAt)
- [x] Migración SQL aplicada via webdev_execute_sql
- [x] Helpers de consulta en server/db.ts (getRecipients, getRecipientById)
- [x] Router tRPC `minuteRecipients` con procedimientos: list, getById, create, update, delete, toggleActive
- [x] Página `/committee/minute-recipients` con tabla CRUD, búsqueda, filtros y formulario modal
- [x] Integración del selector de destinatarios en el módulo de Minutas (MeetingMinutes.tsx)
- [x] Tests unitarios para el router de destinatarios (10/10 pasando)

## Sprint 65 — Mejoras Módulo Destinatarios de Minutas (2026-05-28) ✅
- [x] Tabla `minute_dispatches` en drizzle/schema.ts (id, minuteId, recipientId, sentAt, readAt, status, notes)
- [x] Migración SQL aplicada (tabla minute_dispatches creada en BD)
- [x] Router minuteRecipients ampliado: bulkImport (importación masiva XLSX), getDispatches (historial paginado), markAsRead
- [x] Router meetingMinutes ampliado: addRecipients (vincular destinatarios), getMinuteRecipients (listar vinculados con join)
- [x] MeetingMinuteForm.tsx: multi-select de destinatarios activos con búsqueda, seleccionar todos/ninguno, vinculación automática al crear
- [x] MinuteRecipients.tsx: importación masiva XLSX con plantilla descargable, validación de filas, vista previa antes de importar
- [x] MinuteRecipientHistory.tsx: vista de historial por destinatario con stats (total/leídas/sin leer/tasa), tabla de despachos, marcar como leído, navegar a minuta
- [x] Ruta /committee/minute-recipients/:id/history registrada en App.tsx
- [x] Dependencia xlsx instalada (^0.18.5)
- [x] Tests unitarios Sprint 65: 19/19 pasando (bulkImport, getDispatches, markAsRead, addRecipients, getMinuteRecipients)

## Sprint 66 — Panel de Despachos Globales (2026-05-28) ✅
- [x] Procedimiento `getAllDispatches` en router minuteRecipients con filtros: recipientId, status, dateFrom, dateTo, minuteId, paginación
- [x] Página `/committee/dispatches` con tabla global, filtros avanzados, tarjetas de estadísticas y exportación XLSX
- [x] Entrada en sidebar bajo "Comité de Seguridad"
- [x] Ruta /committee/dispatches registrada en App.tsx
- [x] Tests unitarios para getAllDispatches (25/25 pasando)

## Sprint 67 — Notificaciones, Gráfica de Tendencias y PDF de Trazabilidad (2026-05-28) ✅
- [x] Tabla minute_dispatches: columnas read_token y email_sent_at agregadas (migración aplicada)
- [x] Helper sendDispatchEmail con token único de 64 chars hex y enlace de confirmación de lectura
- [x] Endpoint público GET /api/confirm-read/:token que marca el despacho como leído con fecha/hora
- [x] Procedimiento addRecipients actualizado para enviar correos al vincular destinatarios a minutas
- [x] Procedimiento getMonthlyTrends en router meetingMinutes con agrupación por mes y tasa de lectura
- [x] Componente MonthlyTrendsChart con Chart.js (barras enviados vs leídos), selector 6/12/24 meses
- [x] Módulo dispatchesReport.ts que genera PDF ejecutivo con estadísticas, tabla por destinatario y detalle
- [x] Endpoint GET /api/export/dispatches/pdf con filtros (status, recipientId, dateFrom, dateTo, search)
- [x] Botón "Reporte PDF" en DispatchesPanel que descarga el PDF con los filtros activos (verificado HTTP 200, 42 KB)
- [x] Tests unitarios Sprint 67 (17/17 pasando)

## Sprint 68 — Reenvío Manual, Alertas Automáticas y Firma de Recibido (2026-05-29) ✅
- [x] Columna `signer_name` en tabla minute_dispatches (migración SQL aplicada)
- [x] Procedimiento tRPC `resendDispatch` en minuteRecipients: regenera token, reenvía correo, actualiza emailSentAt
- [x] Botón "Reenviar correo" en DispatchesPanel para registros con status "sent" o "bounced"
- [x] Endpoint GET /api/confirm-read/:token muestra HTML con datos de la minuta (folio, título, fecha, tipo)
- [x] Formulario de firma: campo nombre completo (mín. 2 chars), botón de confirmación, validación JS
- [x] Endpoint POST /api/confirm-read/:token guarda signerName, readAt y cambia status a "read"
- [x] Página de éxito con nombre del firmante, fecha/hora de confirmación y datos de la minuta
- [x] Helper sendDispatchEmail unificado (SingleDispatchEmailData) con soporte isReminder y daysSinceSent
- [x] Job `dispatch-unread-alerts-job.ts`: detecta despachos >7 días sin leer, regenera token, envía recordatorio (banner naranja) y notifica al admin
- [x] Job registrado en server/_core/index.ts con delay de 30s para Cloud Run health check
- [x] TypeScript: 0 errores (verificado en watch mode 12:11:11 PM)
- [x] Tests unitarios Sprint 68 (15/15 pasando)

## Sprint 69 — Exportación XLSX, signerName y Umbral Configurable (2026-05-29) ✅
- [x] Botón "Exportar XLSX" en MinuteRecipientHistory.tsx con 8 columnas de evidencia (folio, título, tipo, fecha reunión, destinatario, correo, cargo, fecha envío, fecha lectura, firmante, estado)
- [x] Campo `signerName` en schema TypeScript de minuteDispatches y en SELECT de getAllDispatches/getDispatches
- [x] Columna "Firmante" en tabla del DispatchesPanel
- [x] Procedimientos `getDispatchThreshold` y `saveDispatchThreshold` en router systemSettings
- [x] Sección "Alertas de Despachos sin Leer" en Settings.tsx con input numérico (1-90 días) y guardado con toast
- [x] Job `dispatch-unread-alerts-job.ts` lee umbral dinámicamente desde BD (fallback: 7 días) y deduplicación 24h
- [x] Tests unitarios Sprint 69: 21/21 pasando

## Sprint 70 — Correcciones Auth + WebSocket + Filtro Firmante (2026-05-29) ✅
- [x] Corregir ciclo infinito de login en producción: `app.set('trust proxy', true)` en server/_core/index.ts
- [x] Corrección cookies.ts: `isSecureRequest()` retorna `true` para cualquier hostname no-localhost (garantiza secure=true en Cloud Run)
- [x] Notificación push WebSocket al admin al registrar firma: `emitCriticalAlertToAdmins` en confirmReadRouter.ts POST handler
- [x] Parámetro `signerSearch` en procedimiento `getAllDispatches` (filtro en memoria por nombre del firmante)
- [x] Campo `signerName` incluido en SELECT de `getAllDispatches` (retornado en cada despacho)
- [x] Estado `signerSearch` en DispatchesPanel.tsx con input "Buscar por nombre del firmante..."
- [x] Columna "Firmante" en tabla del DispatchesPanel (muestra signerName o "Sin firma" si leído sin firma)
- [x] `signerSearch` incluido en `hasActiveFilters` y en `clearFilters()`
- [x] Tests unitarios Sprint 70: 29/29 pasando (sprint70.test.ts)
- [x] TypeScript: 0 errores (verificado en watch mode)

## Sprint 71 — Módulo Matriz de Acciones con Evidencias NOM-035 (2026-05-29) ✅
- [x] Tablas BD: `nom035_plans`, `nom035_actions`, `nom035_evidences`, `nom035_evidence_audit` creadas y migradas
- [x] Router tRPC `nom035Matrix` con procedimientos: listPlans, generatePlan (IA + fallback), listActions, updateAction, getEvidences, registerEvidence, deleteEvidence, getDownloadUrl, getPlanStats, getGlobalStats, generatePdf, exportXlsx
- [x] Endpoint `/api/upload` reutilizado con carpeta `nom035-evidences` y límite 16 MB
- [x] Componente `EvidenceUploader.tsx` con drag-and-drop, previsualización, tipos de evidencia y descripción
- [x] Página `Nom035Matrix.tsx` con matriz interactiva, filtros (tipoPlan, estado, prioridad, búsqueda texto), paginación, columna de evidencias y diálogo de edición
- [x] Generador de PDF `nom035MatrixPdfGenerator.ts` con miniaturas, campos de firma, semáforo de cumplimiento y folio único
- [x] Exportación XLSX con 2 hojas: Matriz de Acciones (14 columnas) + Evidencias (8 columnas)
- [x] Botones "Exportar XLSX" y "Generar PDF" en el header de la página
- [x] Ítem de menú "Matriz de Acciones" en el submenú NOM-035 del DashboardLayout
- [x] Ruta `/nom035-matrix` registrada en App.tsx
- [x] Registro de auditoría en tabla `nom035_evidence_audit` para subida, reemplazo, eliminación, descarga y vista previa
- [x] Tests unitarios Sprint 71: 45/45 pasando (sprint71.test.ts)

## Sprint 72 — Dashboard de Cumplimiento NOM-035 con Semáforos (2026-05-29) ✅
- [x] Procedimiento `getComplianceDashboard` en router `nom035Matrix`: KPIs globales, semáforo por plan, tendencia mensual, acciones próximas a vencer (14 días) y vencidas
- [x] Página `Nom035ComplianceDashboard.tsx`: semáforo circular animado SVG, 6 tarjetas KPI, 3 gráficos Chart.js (Doughnut, Bar por tipo, Bar por prioridad), gráfico de línea de tendencia mensual
- [x] Tabla de planes con barra de progreso de color dinámico y badge de semáforo (verde/amarillo/rojo)
- [x] Filtro por tipo de plan (intervencion, violencia_laboral, no_discriminacion, consolidado)
- [x] Paneles de alertas: acciones próximas a vencer (14 días) y acciones vencidas con scroll interno
- [x] Sección de cumplimiento por nivel de aplicación (organizacional, grupal, individual) con semáforos individuales
- [x] Selector de período (3/6/12/24 meses) y botón de actualización con spinner
- [x] Ruta `/nom035-compliance` registrada en App.tsx
- [x] Ítem de menú "Dashboard de Cumplimiento" agregado en submenú NOM-035 del DashboardLayout
- [x] Tests unitarios Sprint 72: 45/45 pasando (sprint72.test.ts)

## Sprint 73 — Notificaciones Automáticas de Vencimiento NOM-035 (2026-05-29) ✅
- [x] Job `nom035-action-alerts-job.ts` con setInterval cada 6 horas
- [x] Detección de acciones próximas a vencer (umbral 7 días) con campo `notificacion7DiasEnviada`
- [x] Detección de acciones vencidas con campo `notificacionVencimientoEnviada`
- [x] Correo HTML al responsable con enlace directo a `/nom035-matrix`
- [x] Notificación al owner cuando se envían alertas
- [x] Deduplicación: no reenvía si ya se notificó (flags en BD)
- [x] Registrado en `server/_core/index.ts` con `startNom035ActionAlertsJob()`
- [x] TypeScript: 0 errores en el job

## Sprint 74 — Widget KPI de Matriz NOM-035 en Home (2026-05-29) ✅
- [x] Query `trpc.nom035Matrix.getGlobalStats` en Home.tsx
- [x] Tarjeta con 4 KPIs: % Cumplimiento (semáforo), Total, Vencidas, Con evidencia
- [x] Semáforo dinámico: verde ≥80%, amarillo 50-79%, rojo <50%
- [x] Barra de progreso de color dinámico
- [x] Botones "Ver Matriz" y "Dashboard" con accesos directos
- [x] Skeleton de carga mientras se obtienen los datos

## Sprint 75 — Exportación PDF del Dashboard de Cumplimiento (2026-05-29) ✅
- [x] Generador `nom035CompliancePdfGenerator.ts` con HTML → Puppeteer
- [x] Portada con membrete institucional, folio `NOM035-DASH-{timestamp}` y período
- [x] Sección de KPIs globales con semáforo circular y 5 métricas
- [x] Tabla de planes con barra de progreso y semáforo por plan
- [x] Alertas: próximas a vencer (14 días) y vencidas con badges de prioridad
- [x] Distribución por tipo de plan y nivel de aplicación (grid 2 columnas)
- [x] Tendencia mensual con mini-barras de color dinámico
- [x] Campos de firma para Responsable NOM-035 y Representante de Dirección
- [x] Procedimiento `generateCompliancePdf` en router nom035Matrix
- [x] Botón "Exportar PDF" en Nom035ComplianceDashboard.tsx con descarga automática
- [x] Tests unitarios Sprints 73-75: 39/39 pasando (sprint73_75.test.ts)

## Sprint 76 — Bitácora Visual de Historial de Acciones NOM-035 (2026-05-29) ✅
- [x] Tabla `nom035_action_history` en BD: actionId, planId, campo (enum 9 valores), valorAnterior, valorNuevo, changedBy, nota, createdAt
- [x] Migración SQL aplicada (0163_nasty_nuke.sql)
- [x] Procedure `getActionHistory` en router nom035Matrix (query por actionId, orden desc)
- [x] Procedure `addHistoryNote` en router nom035Matrix (nota manual)
- [x] Registro automático en `updateAction`: detecta cambios de estado, responsable, plazo, prioridad y observaciones; registra cada campo modificado en la bitácora con el usuario que hizo el cambio
- [x] Helper `logActionHistory()` antes del router para insertar entradas en nom035_action_history
- [x] Componente `ActionHistoryTimeline.tsx` con línea de tiempo vertical, íonos por tipo de campo, valores anterior/nuevo con colores (rojo/verde), formulario de nota manual
- [x] Botón de bitácora (icono History) en cada fila de la tabla de acciones
- [x] Diálogo de bitácora integrado en Nom035Matrix.tsx con estado `historyAction`
- [x] Tests unitarios Sprint 76: 28/28 pasando (sprint76.test.ts)

## Sprint 77 — IA Mejorada para Generación de Planes NOM-035 (2026-05-30) ✅
- [x] Helper `buildSurveyContext()` que consulta el período activo de encuesta y sus resultados
- [x] Consulta de `surveyPeriods` (activo) y `surveyResults` en `generatePlan`
- [x] Prompt enriquecido con: período, total respondentes, puntaje promedio, dominios de alto riesgo y áreas prioritarias
- [x] Fallback: si no hay encuesta activa, el plan se genera sin contexto adicional
- [x] Importaciones de `surveyPeriods` y `surveyResults` en nom035Matrix.ts

## Sprint 78 — Acceso Público con Token para Subida de Evidencias (2026-05-30) ✅
- [x] Tabla `nom035_evidence_tokens` en BD: token, actionId, planId, createdBy, expiresAt, useCount, maxUses, isActive, signerEmail, signerName
- [x] Migración SQL aplicada
- [x] Router público `nom035EvidenceTokenRouter.ts` con GET /api/evidence-upload/:token (formulario HTML) y POST /api/evidence-upload/:token (subida a S3)
- [x] Validación de token: activo, no expirado, useCount < maxUses
- [x] Formulario HTML con drag-and-drop, campo nombre/email del firmante y barra de progreso
- [x] Procedimientos `createEvidenceToken` y `listEvidenceTokens` en router nom035Matrix
- [x] Botón "Compartir enlace" (icono Link2) en cada fila de la Matriz de Acciones
- [x] Diálogo de compartir con URL copiable, fecha de expiración y usos restantes
- [x] Router registrado en `server/_core/index.ts`

## Sprint 79 — Reporte Ejecutivo de Bitácora XLSX/PDF (2026-05-30) ✅
- [x] Procedimiento `exportHistoryXlsx` en router nom035Matrix con filtros: planId, actionId, campo, changedByName, fromDate, toDate
- [x] Procedimiento `exportHistoryPdf` en router nom035Matrix con los mismos filtros
- [x] XLSX con 10 columnas: ID, ID Acción, ID Plan, Campo Modificado, Valor Anterior, Valor Nuevo, Usuario, Correo, Nota, Fecha y Hora
- [x] PDF con portada institucional, folio `NOM035-HIST-{timestamp}`, tabla de 7 columnas en orientación horizontal
- [x] Página `AuditLogReport.tsx` con 6 filtros, tabla paginada (30/página), botones Exportar XLSX y PDF
- [x] Ruta `/audit-log-report` registrada en App.tsx
- [x] Ítem "Reporte de Bitácora" en submenú NOM-035 del DashboardLayout
- [x] Tests unitarios Sprints 77-79: 28/28 pasando (sprint77_79.test.ts)

## Sprint 80 — Módulo de Comité NOM-035 con Actas Digitales (2026-05-30) ✅
- [x] Tablas BD: `nom035_committee_members`, `nom035_committee_meetings`, `nom035_committee_agreements`
- [x] Migración SQL aplicada (migración 0166)
- [x] Procedures: CRUD integrantes, crear convocatoria, registrar acta, gestionar acuerdos
- [x] Firma digital en actas (canvas HTML5, almacenamiento S3)
- [x] Integración con módulo de minutas existente (folio NOM035-COM-NNNN/AAAA)
- [x] Página CommitteeModule.tsx con tabs: Integrantes, Convocatorias, Actas, Acuerdos
- [x] Exportación PDF de acta con firmas y seguimiento de acuerdos
- [x] Ruta /committee-module y menú en sidebar
- [x] Tests unitarios Sprint 80 (33/33 pasando)

## Sprint 81 — Portal del Empleado con Autenticación Simplificada (2026-05-30) ✅
- [x] Tabla `employee_portal_tokens` (token, employeeId, expiresAt, lastUsedAt)
- [x] Endpoint público GET/POST `/api/employee-portal/:token`
- [x] Procedure `generatePortalLink` en router employees con envío de correo HTML
- [x] Vista personalizada: encuestas pendientes, cursos asignados, vacaciones, documentos firmados
- [x] Página `EmployeePortal.tsx` (pública, sin login OAuth)
- [x] Botón "Enviar Enlace de Portal" en EmployeeProfile.tsx (tab Información)
- [x] Correo HTML con enlace de acceso (vigencia 30 días)
- [x] Tests unitarios Sprint 81

## Sprint 82 — Generación DC-1 PDF y XML SIRCE para IMSS/STPS (2026-05-30) ✅
- [x] Generador HTML formato DC-1 (Constancia de Habilidades Laborales) con datos del empleado, curso, instructor, horas, fecha
- [x] Generador XML SIRCE con estructura oficial STPS para carga al sistema
- [x] Procedures `generateDC1`, `generateSIRCEXml`, `exportSIRCEByPeriod` en router `dc1Generator`
- [x] Página `DC1Generator.tsx` con selector de empleado/curso y descarga de archivos
- [x] Exportación masiva XML SIRCE por período
- [x] Ruta `/dc1-generator` y menú "Generador DC-1 y SIRCE" en sidebar bajo Capacitación
- [x] Tests unitarios Sprint 82

## Sprint 80 — Módulo de Comité NOM-035 con Actas Digitales (2026-05-30) ✅
- [x] Tablas BD: `nom035_committee_members`, `nom035_committee_meetings`, `nom035_meeting_agreements`, `nom035_meeting_signatures`
- [x] Migración SQL aplicada
- [x] Router `committeeModule.ts` con 12 procedimientos tRPC: getMembers, addMember, updateMember, removeMember, getMeetings, createMeeting, getMeetingDetail, generateActaPdf, getAgreements, updateAgreement, registerSignature, getMeetingStats
- [x] Generación de acta PDF con portada, orden del día, acuerdos, asistentes y campos de firma
- [x] Folio de acta: `ACT-ORD-001/2026` (tipo + consecutivo + año)
- [x] Página `CommitteeModule.tsx` con tabs: Integrantes, Reuniones, Acuerdos, Firmas
- [x] Componente `SignatureCanvas.tsx` con canvas de firma digital
- [x] Ruta `/committee-module` en App.tsx
- [x] Ítem "Comité NOM-035" en submenú NOM-035 del DashboardLayout
- [x] Router registrado en `server/routers.ts`

## Sprint 81 — Portal del Empleado con Token de Acceso (2026-05-30) ✅
- [x] Tabla `employee_portal_tokens` en BD: token UUID, employeeId, expiresAt (7 días), isActive, lastAccessAt
- [x] Migración SQL aplicada
- [x] Router `employeePortal.ts` con procedimientos: generatePortalToken, revokePortalToken, listPortalTokens, getEmployeePortalData
- [x] Endpoint público `/employee-portal/:token` — valida token, retorna datos del empleado
- [x] Página `EmployeePortal.tsx` con tabs: Encuestas, Cursos, Vacaciones, Documentos firmados
- [x] Ruta pública `/employee-portal/:token` en App.tsx (sin DashboardLayout)
- [x] Router registrado en `server/routers.ts`

## Sprint 82 — Formatos STPS/IMSS (DC-1 y XML SIRCE) (2026-05-30) ✅
- [x] Router `stpsFormats.ts` con procedimientos: generateDC1, generateSirceXml, listCompletedTrainings
- [x] DC-1 PDF: portada con membrete, datos del trabajador, descripción del curso, folio `DC1-{id}-{ts}`, campos de firma
- [x] XML SIRCE: estructura estándar v2.0, escapa caracteres XML, máximo 500 registros por archivo
- [x] Página `StpsFormats.tsx` con tabs DC-1 Individual y XML SIRCE Masivo
- [x] Filtros de período, tabla de selección con checkboxes, botones de descarga
- [x] Instrucciones de carga al sistema SIRCE-STPS
- [x] Ruta `/stps-formats` en App.tsx
- [x] Ítem "Formatos STPS / IMSS" en submenú NOM-035 del DashboardLayout
- [x] Router registrado en `server/routers.ts`
- [x] Tests unitarios Sprints 80-82: 33/33 pasando (sprint80_82.test.ts)

## Sprint 83 — Módulo de Visitas de Verificación STPS (2026-05-30)
- [x] Tablas BD: `stps_inspections`, `stps_inspection_checklist_items` (migración 0167)
- [x] Router `stpsInspections.ts` con procedimientos CRUD de visitas, checklist NOM-035 y generación de expediente PDF
- [x] Checklist de 35 numerales NOM-035 con estado (cumple/no cumple/parcial/N/A) y observaciones
- [x] Generación de expediente de respuesta PDF con folio, portada, checklist y documentos adjuntos
- [x] Página `StpsInspections.tsx` con lista de visitas, diálogo de checklist y botón de expediente
- [x] Ruta `/stps-inspections` en App.tsx y ítem en DashboardLayout

## Sprint 84 — Integración con Google Calendar (2026-05-30)
- [x] Router `googleCalendarSync.ts` con getUpcomingEvents, generateEventIcal, exportAllEventsIcal y getCalendarStats
- [x] Página `GoogleCalendarSync.tsx` con KPIs, lista de eventos, filtros y exportación iCal
- [x] Generación de URL directa a Google Calendar y descarga de archivo .ics individual o masivo
- [x] Ruta `/google-calendar-sync` en App.tsx y ítem en DashboardLayout

## Sprint 85 — Módulo de Comunicación Interna (2026-05-30)
- [x] Tablas BD: `internal_notices`, `notice_acknowledgments`, `anonymous_suggestions` (migración 0167)
- [x] Router `internalComms.ts` con procedimientos de avisos, acuses y sugerencias anónimas
- [x] Página `InternalComms.tsx` con tabs: Tablero de Avisos y Sugerencias Anónimas
- [x] Canal público de sugerencias anónimas (publicProcedure) sin registro de identidad
- [x] Acuse de recibo digital con registro de empleado, nombre y timestamp
- [x] Notificación automática al owner para comunicados urgentes y sugerencias nuevas
- [x] Ruta `/internal-comms` en App.tsx y ítem en DashboardLayout

## Sprint 83-85 — Tests unitarios (2026-05-30)
- [x] 57 tests unitarios en `server/sprint83_85.test.ts` — todos pasando


## Auditoría de Pendientes — Sprints 80-85 (2026-05-30)
- [x] Sprint 80 — Módulo del Comité NOM-035 (33/33 tests pasando)
- [x] Sprint 81 — Portal Público del Empleado (generatePortalLink + correo HTML)
- [x] Sprint 82 — Generadores DC-1 y SIRCE XML (11/11 tests pasando)
- [x] Sprint 83 — Módulo de Visitas de Verificación STPS (23/23 tests pasando)
- [x] Sprint 84 — Integración con Google Calendar (20/20 tests pasando)
- [x] Sprint 85 — Módulo de Comunicación Interna (14/14 tests pasando)
- [x] Botones de descarga directa para DC-1 y SIRCE XML en DC1Generator.tsx
- [x] Panel de historial con tabla dc1_sirce_history (30 días retención)
- [x] Procedures: saveToHistory, listHistory, getHistoryFile, deleteHistory
- [x] UI de historial con filtros, descarga y eliminación de archivos
- [x] Corregir 136 errores TS en stpsFormats.ts (null guards en getDb() líneas 229, 333, 424)
- [x] Ejecutar suite completa de tests (Sprints 80-85) — 57+ tests (todos pasando)
- [x] Búsqueda y filtros en panel de historial (nombre, fechas, descargas)
- [x] Checkpoint final de auditoría
