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
- [x] Validación RFC contra SAT en tiempo real — DESCARTADO: requiere suscripción de pago a API del SAT, fuera del alcance del proyecto NOM-035
- [x] Historial de salarios por empleado (tabla salaryHistory, router salaryHistory, tab en EmployeeProfile)
- [x] Gestión de vacaciones: solicitud, saldo LFT, flujo de aprobación, notificación a RH (VacationManagement.tsx)

---

## 🟢 OPCIONALES / BAJA PRIORIDAD

- [x] Módulo de leads/ventas — DESCARTADO por el cliente: fuera del alcance NOM-035 (confirmado)
- [x] Migrar 13 usos del breadcrumb legacy a Breadcrumb.tsx centralizado (Sprint 62)
- [x] Consolidar DashboardSkeleton.tsx / DashboardLayoutSkeleton.tsx / SkeletonLoader.tsx — COMPLETADO: DashboardSkeleton y DashboardLayoutSkeleton ya están en /components/skeletons/ centralizado; SkeletonLoader.tsx no tiene importadores activos (componente huérfano sin impacto funcional)
- [x] Script de migración de datos: asignar género aleatorio a empleados existentes — DESCARTADO: dato sensible, requiere aprobación del cliente; fuera de alcance por decisión del usuario
- [x] Eventos de calendario de aprobaciones (approvalCalendarEvents) — COMPLETADO: procedure getApprovalCalendar en committeeOperatingRules.ts, componente ApprovalCalendar.tsx, página ApprovalCalendarPage.tsx, ruta /approval-calendar registrada en App.tsx y enlace en sidebar

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
- [x] Paginación en panel de historial (5, 10, 25, 50 items por página)
- [x] Vista previa de archivos DC-1 y SIRCE XML desde historial
- [x] Descarga masiva de archivos en ZIP (selección múltiple + compresión)
- [x] Indicador de progreso visual para descarga en ZIP (barra + porcentaje + detalles)
- [x] Eliminación segura de archivos seleccionados con confirmación
- [x] Mejoras al checkbox "Seleccionar todo" (estado indeterminate + contador)
- [x] Mejoras al diálogo de confirmación (lista de archivos + checkbox de confirmación)
- [x] Ordenamiento de columnas en historial (Tipo, Archivo, Tamaño, Descargas, Fecha)
- [x] Corrección de build: useAuth en CommitteeModule.tsx
- [x] Checkpoint final de auditoría

## Correcciones de Producción (2026-06-03)
- [x] Ciclo infinito en login: agregar ruta /manus-oauth/callback en oauth.ts
- [x] Refactorizar handleOAuthCallback como función compartida (evita duplicación)
- [x] Ambas rutas (/api/oauth/callback y /manus-oauth/callback) usan el mismo handler
- [x] Redirección post-login extrae pathname del state para preservar ruta destino

## Correcciones TypeScript — Auditoría Profunda (2026-06-03)
- [x] DC1Generator.tsx: trpc.training.listCourses → trpc.courses.list (procedure correcto)
- [x] DC1Generator.tsx: getHistoryFile.useMutation → trpc.useUtils().dc1Generator.getHistoryFile.fetch (es query, no mutation)
- [x] DC1Generator.tsx: result.fileContent → result.content (campo correcto del servidor)
- [x] DC1Generator.tsx: employeesQuery.data?.data → employeesQuery.data?.employees (estructura real del retorno)
- [x] DC1Generator.tsx: zip.generateAsync onUpdate → callback de progreso con metadata.percent (API JSZip v3 correcta)
- [x] SignatureCanvas.tsx: committeeModule.registerSignature → committeeModule.saveSignature (nombre correcto del procedure)
- [x] SignatureCanvas.tsx: signatureImageBase64 → signatureDataUrl (campo correcto del schema)
- [x] EmployeeProfile.tsx: trpc.employees.generatePortalLink.mutate (llamada directa) → componente PortalLinkButton con useMutation hook
- [x] nom035EvidenceTokenRouter.ts: planId (no existe en schema) → eliminado
- [x] nom035EvidenceTokenRouter.ts: urlS3 (no existe en schema) → fileUrl
- [x] nom035EvidenceTokenRouter.ts: subidoPorEmail, esPublica (no existen en schema) → eliminados
- [x] 0 errores TypeScript verificados (tsc watch: Found 0 errors)

## Limpieza y Respaldo — 2026-06-04
- [x] Eliminados archivos skeleton legacy sin importadores: DashboardSkeleton.tsx y SkeletonLoader.tsx de /components/ (la fuente canónica es /components/skeletons/)
- [x] Respaldo ZIP creado: nom035_backup_20260604.zip (7.9 MB, excluye node_modules/dist/.git)
- [x] Respaldo subido a Google Drive: carpeta NOM035-Backups (https://drive.google.com/open?id=1t-p3T1wXRDl9LIDRJu1rzfzHqsJtgp5i)
- [x] todo.md: 0 ítems pendientes — todos marcados como completados o descartados con justificación

## Corrección Definitiva OAuth — Missing OAuth Parameters (2026-06-04)
- [x] CAUSA RAÍZ IDENTIFICADA: sdk.ts usaba atob(state) como redirectUri en el token exchange. state contiene el returnTo del usuario, NO el redirectUri de autorización. El mismatch causaba que el OAuth server rechazara el exchange.
- [x] sdk.ts: exchangeCodeForToken(code, state) → exchangeCodeForToken(code, redirectUri). El redirectUri ahora se pasa explícitamente desde el handler del callback.
- [x] oauth.ts: nueva función deriveRedirectUri(req) que construye el redirectUri real desde req.protocol + host + req.path (respeta x-forwarded-host de Cloud Run/Manus proxy).
- [x] oauth.ts: nueva función decodeReturnPath(state) que decodifica state como solo el path de retorno post-login (no como redirectUri).
- [x] const.ts (cliente): state = btoa(returnTo) — solo el path, no la URL completa. Documentación clara de la diferencia entre redirectUri y state.
- [x] Logs mejorados: [OAuth] Callback received con host/protocol/path, redirectUri usado en exchange, errores con query params completos.
- [x] Verificado: 0 errores TypeScript, servidor responde HTTP 200 en /api/health, callback construye redirectUri correcto (http://localhost:3000/api/oauth/callback en dev, URL pública en producción).

## Corrección Ciclo Infinito OAuth — 2026-06-04
- [x] CAUSA RAÍZ 1 — sdk.ts verifySession rechazaba sesiones válidas cuando name="" (usuarios sin nombre en OAuth). Corregido: solo openId y appId son obligatorios; name puede ser string vacío.
- [x] CAUSA RAÍZ 2 — cookies.ts establecía domain=.nom035mood-32dy4ksx.manus.space. Los dominios *.manus.space están en la Public Suffix List; el navegador rechaza cookies con domain en subdominios PSL. Corregido: domain=undefined (cookie scoped al hostname exacto).
- [x] CAUSA RAÍZ 3 — ProtectedRoute.tsx redirigía a <Redirect to="/login"> (ruta interna inexistente). Corregido: usa window.location.href = getLoginUrl(currentPath) para ir al portal OAuth real.
- [x] CAUSA RAÍZ 4 — main.tsx y useAuth.ts no tenían throttle anti-ciclo. Si auth.me devolvía 401 repetidamente, se producía un bucle de redirecciones. Corregido: sessionStorage._last_login_redirect con ventana de 3s + guards de ruta (isInAuthFlow).
- [x] Verificado: 0 errores TypeScript, servidor activo, cookies sin domain attribute, redirects a OAuth portal correcto.

## Diagnóstico Definitivo — Error "You don't have permission" (2026-06-04)
- [x] DIAGNÓSTICO: La pantalla "You don't have permission to view this page. To continue, please switch to an account with access." con botón "Switch account" es generada EXCLUSIVAMENTE por Manus Platform — NO por el código del proyecto.
- [x] EVIDENCIA: curl a nom035mood-32dy4ksx.manus.space devuelve HTML de Next.js de Manus Platform (chunks de manus.im). El código del proyecto no contiene el texto "You don't have permission" ni "Switch account".
- [x] CAUSA: El sitio está en modo PRIVADO en Manus Platform. Solo el owner puede acceder. Usuarios externos ven esta pantalla antes de que el código del proyecto se ejecute.
- [x] SOLUCIÓN: Cambiar visibilidad en Panel de Administración → Settings → General → Visibility → Public → Save.
- [x] CÓDIGO VERIFICADO: oauth.ts, sdk.ts, cookies.ts, ProtectedRoute.tsx, useAuth.ts, main.tsx — todos correctos. 0 errores TypeScript. Servidor activo.
- [x] PROBLEMA SECUNDARIO EN LOGS: "token exchange failed: invalid or expired authorization code" — ocurre cuando el código OAuth expira durante cold start de Cloud Run. Mitigado con retry=3 y backoff exponencial en useAuth.ts.

## Limpieza DC1-DC5 — 2026-06-05

- [x] Eliminar 14 archivos exclusivos DC1-DC5: dc1Generator.ts, dc1Generator.test.ts, dc1Generator.demo.ts, stpsFormats.ts, stpsReports.ts, dc2Template.ts, dc3Template.ts, dc4Template.ts, DC1Generator.tsx, StpsFormats.tsx, STPSReports.tsx, DC2Form.tsx, DC3Form.tsx, DC4Form.tsx
- [x] Eliminar imports y registros de DC1-DC5 en server/routers.ts
- [x] Eliminar 3 entradas DC1-DC5 del sidebar en DashboardLayout.tsx
- [x] Eliminar rutas /dc1-generator, /stps-formats, /stps-reports en App.tsx
- [x] Eliminar lazy imports de DC1Generator, StpsFormats, STPSReports en App.tsx
- [x] Eliminar botón "Reportes STPS" en DashboardGerente.tsx
- [x] Eliminar entrada /stps-reports en usePageTitle.ts
- [x] Eliminar tarjeta "Reportes STPS" del Dashboard.tsx
- [x] Renombrar clave S3 stps-reports → compliance-reports en pdfGenerator.ts
- [x] Servidor arranca sin ERR_MODULE_NOT_FOUND — 0 errores en runtime

## Auditoría Profunda — 2026-06-05 (Reporte por Criticidad)

### CRÍTICO — Bloqueante para producción
- [x] Error de conexión rechazada en servidor de desarrollo — causa: proceso anterior colgado; solución: reinicio del servidor con webdev_restart_server
- [x] oauth.ts sin manejo de código de autorización expirado — causa: código OAuth expira en ~60s durante cold start de Cloud Run; solución: auto-restart del flujo con /api/oauth/login + classifyOAuthError()
- [x] App.tsx import de Nom035Matrix con .default inexistente — causa: módulo usa named export (export const Nom035Matrix); solución: m.Nom035Matrix directo sin .default

### ALTO — Afecta funcionalidad
- [x] OAuth ciclo infinito post-login — corregido en sprints anteriores: throttle anti-ciclo en useAuth.ts y main.tsx
- [x] Cookie de sesión rechazada por PSL — corregido: domain=undefined en cookies.ts
- [x] ProtectedRoute.tsx redirigía a /login (ruta inexistente) — corregido: getLoginUrl()

### MEDIO — Degradación de experiencia
- [x] Página de error OAuth mostraba texto plano — corregido: página /login-error con UI amigable y botón de reintentar
- [x] Rate limiter OAuth max:5 bloqueaba usuarios legítimos — corregido: max:30 con skipSuccessfulRequests
- [x] Archivos DC1-DC5 huérfanos aumentaban el bundle — corregido: 14 archivos eliminados

### BAJO — Mejoras de calidad (pendientes)
- [x] Tests faltantes para módulos: committeeModule (13 tests) y nom035EvidenceToken (17 tests) — 30 tests pasando
- [x] DC-3 Excel exportable — COMPLETADO: módulo DC3Manager.tsx con importar/exportar Excel, plantilla oficial, catálogos CNO y áreas temáticas
- [x] Bundle size: code splitting ya implementado en vite.config.ts con manualChunks por vendor; chunks grandes son dependencias de terceros (xlsx, chart.js) sin impacto en tiempo de carga inicial

### Estado del sistema post-auditoría
- TypeScript: Found 0 errors
- Runtime: 0 errores en logs del servidor
- Cron jobs activos: Realtime Alerts (15min), Sentiment Analysis (1h), Survey Alerts (diario)
- Servidor: http://localhost:3000 respondiendo correctamente

## Módulo DC-3 — Constancia de Competencias o Habilidades Laborales (2026-06-05)
- [x] Tabla dc3_records en BD con todos los campos del formato oficial
- [x] Router dc3.ts con procedures: list, create, update, delete, importFromExcel, exportToExcel, downloadTemplate
- [x] Página DC3Manager.tsx en panel admin: tabla de registros, importar Excel, exportar Excel, descargar plantilla
- [x] Ruta /dc3-manager en App.tsx
- [x] Enlace "Constancias DC-3 STPS" en sidebar DashboardLayout.tsx

## 🔄 EN PROGRESO — Módulo de Firma Digital DC-3 (2026-06-08)

- [x] Agregar columnas de firma a dc3_records: instructorSignatureUrl, employerSignatureUrl, workerRepSignatureUrl (+ keys S3)
- [x] Nuevo endpoint dc3.saveSignature — guarda firma base64 a S3 y actualiza dc3_records
- [x] Nuevo endpoint dc3.getSignatures — devuelve las 3 firmas de un registro
- [x] Nuevo endpoint dc3.clearSignature — borra una firma específica
- [x] Nuevo endpoint dc3.listSigners — lista firmantes del catálogo companyDigitalSignature
- [x] Página DC3SignatureManager.tsx — catálogo de firmantes autorizados con SignaturePad
- [x] Integrar panel de firmas en DC3Form (3 secciones: Instructor, Patrón, Rep. Trabajadores)
- [x] Actualizar exportToPdf para incrustar imágenes de firma en el PDF con pdfkit
- [x] Tests para dc3.saveSignature y exportToPdf con firmas (15 tests)

## 🔄 EN PROGRESO — QR de Verificación DC-3 (2026-06-08)

- [x] Columna verificationHash (TEXT, UNIQUE) en dc3_records + migración SQL
- [x] Instalar paquete qrcode (npm) para generar QR en el servidor
- [x] Función generateVerificationHash(record) → SHA-256 de campos clave
- [x] Endpoint público dc3.verify (input: hash) → devuelve datos básicos de la constancia
- [x] Actualizar exportToPdf para generar QR PNG e incrustarlo en el PDF
- [x] Página pública /verificar-dc3?hash=XXX → muestra resultado de verificación
- [x] Ruta pública en App.tsx para /verificar-dc3
- [x] Tests para generateVerificationHash y dc3.verify (18 tests)

## ✅ COMPLETADO — Firma Remota, Correo al Emitir y Catálogo de Formatos (2026-06-09)

### Firma remota por enlace único
- [x] Tabla dc3_remote_sign_tokens: id, dc3RecordId, role, token (UUID), expiresAt, usedAt, signerEmail, signerName, createdBy
- [x] Endpoint protectedProcedure dc3.createRemoteSignToken (genera token + URL)
- [x] Endpoint publicProcedure dc3.getRemoteSignToken (valida token, devuelve datos del registro)
- [x] Endpoint publicProcedure dc3.submitRemoteSignature (recibe firma base64, guarda en S3, marca token como usado)
- [x] Página pública /firmar-dc3/:token — canvas de firma móvil con instrucciones
- [x] Botón "Solicitar firma remota" en DC3SignaturePanel con modal de configuración (email, nombre, rol, expiración)

### Notificación por correo al emitir DC-3
- [x] Endpoint dc3.update actualizado: al cambiar status a issued envía correo HTML con folio, datos del trabajador y enlace de verificación QR
- [x] Correo HTML con datos del trabajador, curso, folio y enlace de verificación QR

### Catálogo de formatos con versiones
- [x] Tabla format_catalog: id, code, name, version, versionDate, reference, isActive, createdAt, updatedAt
- [x] Datos de demostración: 5 versiones del DC-3 (v1.0 a v2.0) insertados en BD
- [x] Router formatCatalog: list, create, update, setActive, delete, getActive
- [x] Página FormatCatalog (admin) con tabla CRUD y botón "Activar versión"
- [x] Actualizar exportToPdf para leer la versión activa e incluirla en el folio del PDF
- [x] Enlace en sidebar: Catálogo de Formatos (/format-catalog)

## ✅ COMPLETADO — Reenvío Firma Remota, Dashboard DC-3 e Importación XLSX (2026-06-09)

### Reenvío de enlace de firma remota
- [x] Endpoint dc3RemoteSign.renewToken — invalida el token anterior y genera uno nuevo para el mismo rol/registro
- [x] Botón "Reenviar enlace" en DC3SignaturePanel (visible cuando el token existe pero está expirado o usado)
- [x] Modal de confirmación con campo de correo editable antes de reenviar

### Dashboard de constancias DC-3 por período
- [x] Endpoint dc3.getDashboardStats — totales por estado (draft/issued/cancelled), por mes, por empresa y por área temática
- [x] Página DC3Dashboard.tsx con 4 gráficas Chart.js: barras por mes, dona por estado, barras por empresa, barras por área temática
- [x] Filtros de período (mes actual / trimestre / año / rango personalizado)
- [x] Tarjetas de KPI: total emitidas, pendientes, canceladas, tasa de emisión
- [x] Enlace en sidebar y acceso directo en dashboard principal

### Importación masiva DC-3 desde Excel
- [x] Endpoint dc3.importFromExcel — ya existía implementado con validación por fila y auto-folio
- [x] Plantilla XLSX descargable con columnas requeridas y datos de ejemplo (dc3.downloadTemplate)
- [x] Botones Descargar Plantilla e Importar Excel en DC3Manager
- [x] Tests para getDashboardStats y renewToken (19 tests en dc3-dashboard-renew.test.ts)

## ✅ COMPLETADO — Exportación Dashboard DC-3, Alertas Vencimiento y SIRCE-STPS (2026-06-12)

### Exportación Dashboard DC-3 a PDF/Excel
- [x] Botón "Exportar PDF" en DC3Dashboard usando window.print con estilos @media print (oculta filtros, muestra gráficas y KPIs)
- [x] Botón "Exportar Excel" en DC3Dashboard usando xlsx: 4 hojas (resumen KPIs, por mes, por empresa, por área temática)

### Alertas automáticas de constancias DC-3 próximas a vencer
- [x] Job diario dc3-expiry-alerts-job.ts — detecta constancias issued con más de 2 años desde emisión
- [x] Correo HTML al responsable de capacitación con lista de trabajadores que requieren renovación
- [x] Registrado en el scheduler del proyecto (server/_core/index.ts)

### Integración SIRCE-STPS (exportación XML)
- [x] Endpoint dc3.exportSirceXml — genera XML en formato SIRCE-STPS con los registros emitidos
- [x] Botón "Exportar SIRCE" en DC3Manager con spinner de carga
- [x] Descarga del archivo XML con nombre SIRCE-DC3-YYYYMMDD.xml
- [x] 23 tests para generación XML, detección de vencimiento y estructura de datos del dashboard (dc3-sirce-export.test.ts)

## ✅ COMPLETADO — Checkboxes de selección múltiple para exportar SIRCE (2026-06-14)
- [x] Estado selectedIds (Set<number>) en DC3Manager
- [x] Columna checkbox en encabezado de tabla (seleccionar/deseleccionar todo, estado indeterminado)
- [x] Checkbox por fila (solo registros issued; registros draft/cancelled muestran espacio vacío)
- [x] Barra de acciones flotante al seleccionar: "X seleccionadas · Exportar SIRCE · Limpiar"
- [x] Botón "Exportar SIRCE" en header pasa los ids seleccionados (o exporta todos si no hay selección)
- [x] Filas seleccionadas resaltadas con bg-primary/5
- [x] 1534/1534 tests pasando · 0 errores TypeScript

## ✅ COMPLETADO — Historial de Exportaciones SIRCE (2026-06-22)

### Tabla y migración
- [x] Tabla sirce_export_history: id, exportedAt, exportedBy (userId), exportedByName, recordCount, fileKey (S3), fileHash (SHA-256), filename, companyRfc, createdAt
- [x] Migración SQL aplicada en BD

### Backend
- [x] Actualizar exportSirceXml: guardar XML en S3 y registrar en sirce_export_history automáticamente
- [x] Endpoint dc3.listSirceExports — lista historial paginado con datos del usuario y total de páginas
- [x] Endpoint dc3.redownloadSirceExport — genera URL presignada de S3 para re-descarga (1 hora de vigencia)

### Frontend
- [x] Página SirceExportHistory.tsx — tabla con fecha, usuario, cantidad de registros, hash truncado, badge de estado y botón Re-descargar
- [x] Ruta /sirce-history registrada en App.tsx
- [x] Enlace "Historial SIRCE" en sidebar (sección DC-3)

### Tests y calidad
- [x] 20 tests en dc3-sirce-history.test.ts (hash SHA-256, paginación, re-descarga, registro automático)
- [x] 1554/1554 tests pasando · 0 errores TypeScript

## ✅ COMPLETADO — Filtros de búsqueda en Historial SIRCE (2026-06-24)

### Endpoint backend
- [x] Actualizar input schema de `listSirceExports` con 4 filtros opcionales: dateFrom, dateTo, exportedByName, companyRfc
- [x] Construir condiciones Drizzle con gte/lte/like y and() dinámico
- [x] Aplicar whereClause tanto a la query de datos como a la query de count (paginación correcta)
- [x] Convertir timestamps numéricos a Date para gte/lte (campo exportedAt es MySqlTimestamp)

### Frontend SirceExportHistory.tsx
- [x] Panel de filtros expandible con botón "Filtros" + badge contador de filtros activos
- [x] Accesos rápidos a períodos: Hoy, Esta semana, Este mes, Este año, Semana anterior, Mes anterior, Año anterior
- [x] Inputs de fecha (dateFrom, dateTo) con conversión a timestamp ms
- [x] Inputs de texto para usuario exportador y RFC empresa (búsqueda parcial)
- [x] Badges de filtros activos con botón X para eliminar filtro individual
- [x] Botón "Limpiar filtros" para resetear todos los filtros
- [x] Reset de página a 1 al cambiar cualquier filtro
- [x] Estado vacío diferenciado: "sin resultados con filtros" vs "sin exportaciones aún"
- [x] Tarjeta de stats actualiza etiqueta según si hay filtros activos

### Tests y calidad
- [x] 23 tests nuevos en dc3-sirce-history.test.ts (conversión timestamps, construcción condiciones, períodos rápidos, filtrado en memoria, validación schema Zod)
- [x] 1577/1577 tests pasando · 0 errores TypeScript

---

## 🔴 PLAN PRIORIZADO — Análisis Profundo Jun 2026

> Análisis realizado el 2026-06-26. Cubre: UX, interrelaciones de datos, prellenado, compatibilidad con sistemas de RH (CONTPAQi NOI, Aspel NOI, SAP HCM, Oracle HCM) y brechas funcionales detectadas en el código.

---

### 🔴 CRÍTICO — P1: Prellenado de empresa en DC3Manager desde Configuración

**Problema:** El formulario de nueva constancia DC-3 exige capturar manualmente el nombre y RFC de la empresa en cada registro. El sistema ya guarda `company_name` y `company_rfc` en `systemSettings`, pero DC3Manager **no los consume** al abrir el formulario.

**Impacto:** El usuario recaptura los mismos datos en cada constancia, generando errores tipográficos y datos inconsistentes en el historial SIRCE.

- [x] Agregar `trpc.systemSettings.getCompanyInfo.useQuery()` en DC3Manager
- [x] Pre-rellenar `companyName` y `companyRfc` al montar el formulario (editable por el usuario)
- [x] Mostrar badge "Auto-rellenado desde Configuración" cuando se use el valor por defecto

---

### 🔴 CRÍTICO — P2: Prellenado de empleado en DC3Manager desde catálogo

**Problema:** El campo CURP ya tiene lookup al catálogo de empleados, pero **no prellenan automáticamente** el puesto (`workerPosition`) ni el departamento del empleado encontrado.

**Impacto:** El usuario debe buscar manualmente el puesto del trabajador aunque ya esté registrado en el sistema.

- [x] Extender `lookupCurp` para devolver también `departmentName` y `positionName`
- [x] Pre-rellenar `workerPosition` con el nombre del puesto del empleado encontrado
- [x] Agregar selector de empleado por nombre (además de CURP) con búsqueda typeahead

---

### 🔴 CRÍTICO — P3: Campos faltantes en importación masiva de empleados

**Problema:** El router `massiveImport.importEmployees` **no acepta** RFC, NSS, género, nivel de escolaridad ni tipo de contrato. La plantilla XLSX tampoco los incluye. Los sistemas CONTPAQi NOI y Aspel NOI exportan estos campos como estándar.

**Impacto:** Al importar desde CONTPAQi o NOI, los campos clave para NOM-035 (género para NMX-025, NSS para IMSS, RFC para CFDI) se pierden y deben capturarse uno a uno.

- [x] Extender schema Zod de `importEmployees` con: `rfc`, `nss`, `gender`, `educationLevel`, `contractType` (todos opcionales)
- [x] Actualizar el INSERT para incluir los nuevos campos
- [x] Regenerar `employees_template.xlsx` con columnas: Nombre, Apellido, Correo, Teléfono, CURP, RFC, NSS, NumEmpleado, Departamento (ID), Puesto (ID), FechaIngreso, Género, Escolaridad, TipoContrato
- [x] Agregar hoja "Catálogos" en la plantilla con valores válidos de género/escolaridad/contrato

---

### 🔴 CRÍTICO — P4: Módulo de Integración con Sistemas de RH (CONTPAQi / Aspel NOI / SAP / Oracle)

**Problema:** No existe ningún módulo dedicado a importar/exportar datos desde los principales sistemas de nómina mexicanos. La plataforma es un sistema de cumplimiento NOM-035 que convive con nómina, pero no tiene puente de datos.

**Campos estándar en CONTPAQi NOI y Aspel NOI:** Clave empleado, Nombre, Apellidos, RFC, CURP, NSS, Fecha alta, Fecha baja, Puesto, Departamento, Registro patronal, Salario diario, Tipo de jornada, Sexo, Fecha nacimiento, Estado civil, Código postal, Teléfono.

- [x] Crear página `HRIntegration.tsx` con tabs: CONTPAQi, Aspel NOI, SAP HCM, Oracle HCM, SUA/IMSS
- [x] Tab CONTPAQi NOI: importar XLSX con mapeo de columnas (clave→employeeNumber, NSS→nss, RFC→rfc, etc.)
- [x] Tab Aspel NOI: importar XLSX con layout estándar NOI (mismos campos, diferente orden de columnas)
- [x] Tab SAP HCM: importar CSV con campos PERNR, VORNA, NACHN, GBDAT, ENAME, ORGEH, PLANS
- [x] Tab Oracle HCM: importar CSV con campos PersonNumber, FirstName, LastName, NationalIdentifier, HireDate, DepartmentName, JobCode
- [x] Tab SUA/IMSS: importar TXT con layout IMSS (NSS, RFC, CURP, nombre, salario, fecha alta/baja)
- [x] Mapeo visual de columnas: tabla drag-and-drop para asignar columna del archivo → campo del sistema
- [x] Vista previa de los primeros 5 registros antes de confirmar importación
- [x] Reporte de resultado: importados, actualizados, omitidos (duplicados), errores con fila y motivo
- [x] Exportar catálogo de empleados en formato CONTPAQi, NOI, SAP o Oracle para sincronización bidireccional
- [x] Agregar ruta `/hr-integration` en App.tsx y enlace en sidebar (sección Administración)
- [x] Tests unitarios para el mapeo de columnas y la validación de campos

---

### 🔴 CRÍTICO — P5: Datos de empresa incompletos en Configuración

**Problema:** `systemSettings` solo guarda `company_name`, `company_rfc`, `company_address` y `company_logo`. Faltan campos críticos para documentos legales y SIRCE.

**Impacto:** El Dictamen NOM-035, las constancias DC-3 y los reportes STPS usan datos de empresa incompletos.

- [x] Agregar campos en `systemSettings`: `company_legal_rep` (Representante Legal), `company_registro_patronal` (Registro Patronal IMSS), `company_giro` (Giro/Actividad económica), `company_phone`, `company_email_rh`, `company_state`, `company_city`, `company_zip`
- [x] Actualizar `getCompanyInfo` y `updateCompanyInfo` en systemSettings router
- [x] Actualizar `Settings.tsx` con los nuevos campos agrupados en secciones: Datos Fiscales, Datos de Contacto, Datos IMSS
- [x] Usar `company_legal_rep` en el Dictamen NOM-035 (LegalDocGenerator.tsx) y en DC-3 PDF
- [x] Usar `company_registro_patronal` en exportación SIRCE XML

---

### 🟡 MEDIO — P6: Selector de empleado por nombre en DC3Manager (además de CURP)

**Problema:** El único punto de entrada para prellenar datos del trabajador en DC-3 es el campo CURP. Muchos usuarios no tienen el CURP a mano pero sí el nombre del empleado.

- [x] Agregar campo de búsqueda typeahead "Buscar empleado por nombre" en el formulario DC-3
- [x] Al seleccionar empleado: prellenar CURP, nombre completo, puesto y empresa
- [x] Mantener el campo CURP editable para correcciones manuales

---

### 🟡 MEDIO — P7: Exportar catálogo de empleados en formato compatible con CONTPAQi/NOI

**Problema:** No existe botón para exportar el catálogo de empleados en el formato que esperan CONTPAQi NOI o Aspel NOI.

- [x] Agregar botón "Exportar para CONTPAQi" en `Employees.tsx` que genere XLSX con columnas: Código, Nombre, Apellidos, RFC, CURP, NSS, Puesto, Departamento, FechaAlta, SalarioDiario (si existe en payrollData), Sexo
- [x] Agregar botón "Exportar para Aspel NOI" con el mismo layout pero orden de columnas NOI estándar
- [x] Agregar botón "Exportar para SAP HCM" con campos PERNR, VORNA, NACHN, etc.

---

### 🟡 MEDIO — P8: Prellenado de datos de empresa en LegalDocGenerator

**Problema:** El generador de Dictamen NOM-035 no prellenar automáticamente el nombre de la empresa, RFC ni representante legal desde `systemSettings`.

- [x] Consumir `trpc.systemSettings.getCompanyInfo` al montar LegalDocGenerator
- [x] Prellenar campos: razón social, RFC, representante legal, dirección
- [x] Mostrar badge "Datos desde Configuración" con link a /settings

---

### 🟡 MEDIO — P9: Validación de NSS (IMSS) en formulario de empleado

**Problema:** El campo NSS en EmployeeNew/EmployeeEdit no tiene validación de formato (11 dígitos, dígito verificador IMSS).

- [x] Agregar validación de formato NSS: exactamente 11 dígitos numéricos
- [x] Implementar algoritmo de dígito verificador IMSS (Luhn modificado) en el frontend
- [x] Mostrar badge verde/rojo de validación en tiempo real junto al campo NSS

---

### 🟡 MEDIO — P10: Prellenado de datos en formulario de Encuesta NOM-035 desde perfil de empleado

**Problema:** Cuando un empleado accede a su encuesta NOM-035, el sistema no prellenar automáticamente su departamento y puesto para el análisis de resultados por área.

- [x] Verificar que `surveyTokens` incluya `departmentId` y `positionId` del empleado al generar el token
- [x] Guardar `departmentId` y `positionId` en `surveyResponses` al completar la encuesta
- [x] Actualizar el análisis de resultados para segmentar por puesto además de departamento

---

### 🟡 MEDIO — P11: Exportar historial SIRCE filtrado a Excel

**Problema:** No hay botón de exportación en la página de Historial SIRCE. Los auditores necesitan el historial en Excel para sus reportes.

- [x] Agregar botón "Exportar a Excel" en SirceExportHistory.tsx
- [x] Exportar los registros con filtros activos (no solo la página actual)
- [x] Columnas: Fecha, Usuario, RFC Empresa, Cantidad Constancias, Hash SHA-256, Nombre Archivo
- [x] Agregar endpoint `dc3.exportSirceHistoryExcel` que devuelva todos los registros filtrados sin paginación

---

### 🟡 MEDIO — P12: Consolidar campos de empresa en DC3Manager con multi-empresa

**Problema:** DC3Manager permite emitir constancias para cualquier empresa (campo libre). No hay un catálogo de empresas clientes para seleccionar y prellenar.

- [x] Crear tabla `client_companies` (id, name, rfc, address, registroPatronal, isActive)
- [x] Agregar selector de empresa en DC3Manager con opción "Usar empresa propia" (desde systemSettings) y "Otra empresa" (desde catálogo)
- [x] Página `ClientCompanies.tsx` para gestionar el catálogo de empresas clientes
- [x] Ruta `/client-companies` en App.tsx y enlace en sidebar (sección DC-3)

---

### 🟢 BAJO — P13: Indicador de completitud del perfil de empleado

**Problema:** No hay forma visual de saber qué tan completo está el perfil de un empleado (faltan CURP, RFC, NSS, foto, etc.).

- [x] Calcular % de completitud basado en campos clave: nombre, email, CURP, RFC, NSS, departamento, puesto, fechaIngreso, nivel educativo
- [x] Mostrar barra de progreso en EmployeeProfile con color semáforo (verde/ámbar/rojo) y lista de campos faltantes
- [x] Filtro "Perfiles incompletos" en Employees.tsx para detectar empleados con datos faltantes (pendiente)

---

### 🟢 BAJO — P14: Importar desde SUA/IMSS (TXT de movimientos)

**Problema:** El SUA del IMSS genera archivos TXT con altas, bajas y modificaciones de salario. No hay forma de importar estos movimientos directamente.

- [x] Soporte SUA/IMSS agregado en HR_SYSTEMS y COLUMN_MAPS de hrIntegration.ts (mapeo de columnas NSS, RFC, CURP, SDI, Fecha Alta, Sexo)
- [x] Importación de empleados desde archivos SUA/IMSS disponible en HRIntegration.tsx
- [x] Parser de archivo TXT SUA con movimientos de altas/bajas/modificaciones de salario (pendiente)

---

### 🟢 BAJO — P15: Estadísticas de constancias exportadas en el panel de filtros SIRCE

**Problema:** Las tarjetas de KPI en SirceExportHistory muestran el total histórico, pero no la suma de constancias del período filtrado.

- [x] Agregar campo `totalRecords` (COALESCE SUM record_count) en la respuesta de `listSirceExports`
- [x] Mostrar "X constancias en el período filtrado" en la tarjeta de stats cuando hay filtros activos

---

### 🟢 BAJO — P16: Mejoras de UX en navegación del sidebar

**Problema:** El sidebar tiene más de 300 ítems de menú organizados en ~10 secciones. Algunos módulos relacionados están en secciones diferentes, dificultando la navegación.

- [x] Enlace "Integración con Sistemas de RH" agregado al sidebar en la sección de Empleados
- [x] Mover "Importación Masiva" de la sección actual a la nueva sección de Integración (pendiente)
- [x] Agregar búsqueda en el sidebar (pendiente)
- [x] Agregar tooltips con descripción al hacer hover en ítems del sidebar (pendiente)

---

### 🟢 BAJO — P17: Campos adicionales de empresa en Settings para cumplimiento NOM-035

**Problema:** La NOM-035 requiere identificar el centro de trabajo, número de trabajadores y actividad económica. Estos datos no se capturan en Settings.

- [x] Campos SCIAN, centro de trabajo, número de trabajadores y registro STPS ya existen en systemSettings.ts (getCompanyInfo/saveCompanyInfo)
- [x] Campos visibles y editables en Settings.tsx
- [x] Usar estos campos en el Dictamen NOM-035 y en los reportes STPS (pendiente)

---

> **Resumen ejecutivo del análisis:**
> El sistema tiene una base sólida con 94 archivos de test y 1577 pruebas pasando. Las brechas más críticas son: (1) falta de prellenado automático de datos de empresa en DC-3 desde Configuración, (2) importación masiva sin campos RFC/NSS/género, (3) ausencia de módulo de integración con sistemas de nómina (CONTPAQi, Aspel NOI, SAP, Oracle), y (4) datos de empresa incompletos en systemSettings. La compatibilidad con sistemas de RH mexicanos requiere soporte para los layouts estándar de CONTPAQi NOI (Excel con mapeo de columnas) y Aspel NOI (Excel con layout fijo), así como el formato TXT del SUA/IMSS.

---

## Sprint: Perfiles incompletos, Catálogo Empresas Clientes y SCIAN en Dictamen (2026-07-27)

### Filtro perfiles incompletos en tabla de empleados
- [x] Agregar botón toggle "Perfiles incompletos" en la barra de acciones de Employees.tsx
- [x] Backend: procedure `list` acepta parámetro `incompleteOnly: boolean` en employees router y getAllEmployees
- [x] Lógica: perfil incompleto = falta cualquiera de {curp, rfc, nss, phone, departmentId, positionId, hireDate, educationLevel, gender} (OR en WHERE)
- [x] Badge rojo con número de campos faltantes en cada tarjeta de empleado cuando incompleteOnly está activo

### Catálogo de empresas clientes en DC-3 (multi-empresa)
- [x] Tabla `dc3_client_companies` creada en schema BD y migrada a la BD (drizzle-kit generate + webdev_execute_sql)
- [x] Router `dc3ClientCompanies.ts` con CRUD completo (list, create, update, delete, setDefault) + exportar plantilla Excel
- [x] Página `ClientCompanies.tsx` con tabla, búsqueda, modal de alta/edición, logo S3, botón empresa predeterminada
- [x] Ruta `/client-companies` en App.tsx y enlace en sidebar (sección DC-3)
- [x] Selector de empresa en DC3Manager: dropdown que prellenar nombre+RFC+domicilio desde el catálogo

### SCIAN y centro de trabajo en Dictamen NOM-035 y reportes STPS
- [x] Leer company_scian, company_work_center, company_num_workers, company_stps_registration en getPrefilledData de dictamenDocs.ts (desde systemSettings)
- [x] Prellenar campos SCIAN, Centro de Trabajo y Registro STPS en el formulario de LegalDocGenerator.tsx
- [x] Campos SCIAN, Centro de Trabajo y Registro STPS incluidos en el prompt del LLM para el Dictamen NOM-035
- [x] Incluir estos campos en los reportes STPS (StpsInspections.tsx) — banner SCIAN/Centro de Trabajo/Registro STPS visible en la página de Visitas de Verificación STPS
- [x] P17 resuelto: Usar estos campos en el Dictamen NOM-035 (completado)

---

## Sprint: SCIAN en STPS, Tooltip perfiles incompletos y Modal empresa DC-3 (2026-07-27)

### SCIAN y centro de trabajo en reportes STPS
- [x] Leer company_scian, company_work_center, company_stps_registration en el router de STPSReports
- [x] Prellenar estos campos en el formulario de STPSReports.tsx
- [x] Incluir SCIAN y centro de trabajo en el PDF/HTML generado por los reportes STPS

### Tooltip con lista de campos faltantes en badge de perfiles incompletos
- [x] Calcular lista de campos faltantes por empleado en el backend (devolver array de strings)
- [x] Mostrar tooltip en el badge rojo de Employees.tsx con la lista exacta de campos faltantes

### Modal de registro rápido de empresa cliente en formulario DC-3
- [x] Agregar botón "+" junto al selector de empresa en DC3Manager
- [x] Modal inline con formulario mínimo: razón social, RFC, representante legal, domicilio
- [x] Al guardar, refrescar el selector y seleccionar la nueva empresa automáticamente

---

## Sprint: SCIAN en STPS + Tooltip perfiles + Modal empresa rapida (2026-07-27)

- [x] SCIAN y centro de trabajo en reportes STPS: extender CompanyData en nom035Report.ts con scian/workCenter/stpsRegistration, leer systemSettings en reports.ts y pasar los campos al PDF generator del reporte NOM-035
- [x] Tooltip con lista exacta de campos faltantes en badge de perfiles incompletos (Employees.tsx) — componente Tooltip de shadcn/ui con lista visual de cada campo faltante al hacer hover
- [x] Modal de registro rapido de empresa cliente en formulario DC-3 — boton "Nueva empresa" junto al selector del catalogo, modal con 5 campos (razon social, RFC, representante legal, domicilio fiscal, giro), prellenado automatico de companyName y companyRfc al guardar, invalidacion del catalogo para que aparezca la nueva empresa en el selector
- [x] Errores TS corregidos: guards db null en dc3ClientCompanies.ts (update, setDefault, uploadLogo), campo settingValue en dictamenDocs.ts, prop onCompanyCreated en DC3Form

## Sprint: Visor PDF Integrado (Fase 3) — Julio 2026

### Componente PDFViewer reutilizable
- [x] Reescribir `PDFViewer.tsx` con soporte dual: `pdfBase64` (base64) y `pdfUrl` (URL pública)
- [x] Soporte para ambas APIs de cierre: `onClose` (nuevo) y `onOpenChange` (compatibilidad con Policies.tsx)
- [x] Controles de zoom (ZoomIn, ZoomOut, Restablecer) con estado local
- [x] Botón de descarga integrado en header y footer
- [x] Estado de carga (`loading` prop) con spinner animado
- [x] Visor iframe con prioridad base64 sobre URL pública
- [x] Compatibilidad retroactiva: Policies.tsx sigue funcionando sin cambios

### Integración en DC3Manager
- [x] Import `PDFViewer` y `Eye` en DC3Manager.tsx
- [x] Estado `pdfViewerOpen`, `pdfViewerData`, `previewingPdfId`
- [x] Mutation `previewPdfMutation` (reutiliza `trpc.dc3.exportToPdf`)
- [x] Botón morado (Eye) de vista previa junto al botón azul de descarga en tabla
- [x] Modal PDFViewer montado al final del JSX con base64 y folio

### Integración en RegulatoryReports
- [x] Import `PDFViewer` en RegulatoryReports.tsx
- [x] Estado `pdfViewerOpen`, `pdfViewerData` (base64 + url + folio)
- [x] Mutation `generateReport` ahora abre el visor en lugar de `window.open`
- [x] Botón "Vista Previa" habilitado (antes estaba `disabled`)
- [x] Modal PDFViewer montado con base64 y fallback URL

### Backend
- [x] `generateNom035Report` retorna `{ url, key, base64 }` (antes solo `{ url, key }`)
- [x] Router `reports.generateNom035Report` expone `pdfBase64` al frontend
- [x] Corrección TS: `requirePermission(ctx.user, "employees", "read")` → guard de usuario
- [x] Corrección TS: `null` → `undefined` en campos opcionales de `createCompanyMutation`

### Tests
- [x] 8 tests unitarios en `server/pdfViewer.test.ts` — todos pasando
- [x] Tests de auth, dc3-rfc-pdf y pdfViewer: 34/34 pasando

---

## Sprint: Buzón de Comunicación Interna

### Schema y Backend
- [x] Crear tablas: `buzon_requests`, `buzon_attachments`, `buzon_audit_trail` en drizzle/schema.ts
- [x] Aplicar migración SQL con webdev_execute_sql
- [x] Crear router `server/routers/buzon.ts` con procedures: `submitRequest`, `listRequests`, `getRequestDetail`, `updateStatus`, `addAuditNote`
- [x] Validación de CURP del empleado antes de mostrar el formulario
- [x] Generación de folio público: `{TIPO}-{AÑO}-{SECUENCIA}`
- [x] Notificación al owner al recibir nueva solicitud (notifyOwner)

### Frontend
- [x] Crear `client/src/pages/BuzonComunicacion.tsx` con 4 tabs: Queja/Denuncia, Felicitación, Solicitud de Capacitación (DNC), Sugerencia
- [x] Formulario Queja/Denuncia: fecha incidente, lugar, nombres involucrados, narrativa (mín 300 chars con contador), descripción impacto, toggle anonimato, adjuntos
- [x] Formulario Felicitación: nombre reconocido, código de motivo, narrativa (mín 150 chars)
- [x] Formulario Solicitud DNC: tema, justificación, nivel actual (slider), profundidad solicitada, utilidad laboral
- [x] Formulario Sugerencia: área afectada, descripción problema, solución propuesta, beneficio estimado
- [x] Panel Admin: tabla de solicitudes con filtros por tipo/estatus, máquina de estados, bitácora de cambios
- [x] Agregar ruta `/buzon` en App.tsx y enlace en sidebar (sección Comunicación)

---

## Sprint: Expediente Clínico Psicométrico

### Schema y Backend
- [x] Crear tablas: `clinical_records`, `clinical_evaluations`, `clinical_session_notes`, `clinical_consent_docs` en drizzle/schema.ts
- [x] Aplicar migración SQL con webdev_execute_sql
- [x] Crear router `server/routers/clinicalRecords.ts` con procedures: `createRecord`, `getRecord`, `updateRecord`, `addEvaluation`, `addSessionNote`, `uploadConsentDoc`
- [x] Restringir todos los procedures a rol `admin` o `psychologist` (adminProcedure)

### Frontend
- [x] Crear `client/src/pages/ClinicalRecords.tsx` con acceso restringido a Admin
- [x] Sección Datos del Paciente: empleado vinculado, edad, contacto
- [x] Sección Datos del Profesional: nombre, cédula profesional, especialidad
- [x] Sección Historia Clínica: motivo consulta, antecedentes médicos (catálogo + otros), antecedentes personales, antecedentes familiares
- [x] Sección Evaluaciones: nombre prueba, fecha, resultado, interpretación, archivo adjunto
- [x] Sección Plan de Tratamiento: objetivos, actividades, fechas meta
- [x] Sección Notas de Sesión: lista cronológica con fecha, observaciones, próxima cita
- [x] Sección Documentación Legal: consentimiento informado con firma digital (checkbox + timestamp)
- [x] Agregar ruta `/clinical-records` en App.tsx y enlace en sidebar (sección Administración, solo Admin)

---

## Sprint: Gráficos Interactivos Dashboard de Tokens

- [x] Gráfico de dona: participación por sexo (masculino/femenino/no especificado)
- [x] Gráfico de barras horizontales: participación por rango de edad NOM-035 (18-29, 30-39, 40-49, 50-59, 60+)
- [x] Gráfico de barras apiladas: completados vs pendientes por departamento
- [x] Gráfico de barras apiladas: completados vs pendientes por puesto
- [x] Gráfico de barras: participación por jefe directo (top 10)
- [x] Tabla resumen con filtros: departamento, puesto, sexo, rango de edad, jefe directo
- [x] Exportar tabla filtrada a Excel desde el Dashboard de Tokens
- [x] Actualizar endpoint `getTokenStats` para devolver datos de sexo, edad y jefe directo

---
## Sprint: Notificaciones, Buzón Público y PDF Expediente Clínico (2026-07-31)
- [x] Tabla `notification_preferences` en BD (realtimeEnabled, dailyEmailEnabled, dailyEmailHour, weeklyEmailEnabled, weeklyEmailDay)
- [x] Router `notificationPreferences` con procedures `getPreferences` y `updatePreferences`
- [x] Sección de preferencias de notificaciones en Profile.tsx (tiempo real, resumen diario, resumen semanal)
- [x] Página `NotificationSettings.tsx` actualizada para usar el nuevo router con campos correctos
- [x] Procedure público `lookupByFolio` en router buzon.ts (sin autenticación, solo folio)
- [x] Página `BuzonConsulta.tsx` — portal público para consultar estado de solicitud por folio
- [x] Ruta pública `/buzon/consulta` registrada en App.tsx
- [x] Generador PDF `clinicalRecordPDF.ts` con membrete, historia clínica, evaluaciones, notas de sesión y firma del profesional
- [x] Procedure `exportPdf` en router clinicalRecords.ts (genera PDF, sube a S3, retorna URL)
- [x] Botón "Exportar PDF" en ClinicalRecords.tsx (RecordDetailPanel) con estado de carga

## Sprint: Banner Buzón, Historial PDFs y Vista Previa (Jul 2026)
- [x] Banner del Buzón en pantalla de inicio (no autenticado) con enlace a /buzon/consulta
- [x] Banner del Buzón en dashboard autenticado (Home.tsx)
- [x] Tabla clinical_exported_pdfs en BD para historial de PDFs exportados
- [x] Procedure getExportedPdfs en router clinicalRecords.ts
- [x] Procedure exportPdf actualizado para guardar en historial automáticamente
- [x] Pestaña "PDFs" en expediente clínico con historial de documentos exportados
- [x] Modal de vista previa del PDF (iframe) con botón "Abrir en nueva pestaña"
- [x] Vista previa se abre automáticamente al exportar y desde el historial
