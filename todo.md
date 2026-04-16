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
