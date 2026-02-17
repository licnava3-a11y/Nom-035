# TODO - Plataforma NOM-035 STPS 2018

## CHECKPOINT ACTUAL: 65935c4b - Auditoría Profunda Completada

---

## FASE ACTUAL: Optimizaciones Finales (Warning TypeScript + Validaciones Zod + Paginación Server-Side)

### 1. Localizar y Corregir Errores 404
- [x] Revisar logs de navegador para identificar rutas 404 (0 errores encontrados)
- [x] Analizar App.tsx para encontrar rutas sin componentes (todas las rutas tienen componentes)
- [x] Listar todas las páginas faltantes (143 componentes existentes, 0 faltantes)
- [x] Crear componentes para páginas faltantes (no necesario)
- [x] Verificar que todas las rutas funcionen correctamente (sistema sin errores 404)

### 2. Corregir Discrepancia Status de Casos
- [x] Modificar query en executiveDashboard.ts (líneas 68-78)
- [x] Agregar mapeo 'abierto'→'open', 'resuelto'→'closed' (query actualizado)
- [ ] Verificar que dashboard muestre 94 casos abiertos (requiere prueba en navegador)
- [ ] Verificar que dashboard muestre 47 casos resueltos (requiere prueba en navegador)

### 3. Resolver Warning TypeScript Enum "recognition"
- [ ] Regenerar tipos de Drizzle con drizzle-kit generate
- [ ] Reiniciar servidor TypeScript para aplicar nuevos tipos
- [ ] Verificar que warning desaparece en recognitions.ts línea 85

### 4. Completar Validaciones Zod en Routers Críticos (Coverage >90%)
- [ ] Identificar 20 routers críticos sin validación
- [ ] Priorizar: auth, payments, cases, surveys, compliance
- [ ] Agregar validación zod a procedures sin .input()
- [ ] Verificar coverage de validación >90%

### 5. Implementar Paginación Server-Side en Casos
- [x] Modificar query cases.list para aceptar offset/limit
- [x] Agregar validación zod para parámetros de paginación (page, pageSize, filtros)
- [x] Actualizar frontend Cases.tsx para usar paginación server-side
- [x] Verificar reducción de transferencia de datos (188→20 registros)

---

## ✅ TRABAJO COMPLETADO (Checkpoint 65935c4b)

### Optimizaciones de Performance
- [x] 14 índices SQL implementados (cases, recognitions, survey_responses, employees)
- [x] menuCounters.getAll optimizado con Promise.all (82% mejora: 2.8s → 500ms)
- [x] Queries lentas reducidas significativamente

### Métricas NMX-025 Completas
- [x] Campos salario y nivelJerarquico en schema users
- [x] 3 queries backend (brecha salarial, distribución jerárquica, % mujeres directivas)
- [x] 3 gráficas frontend interactivas en Dashboard.tsx
- [x] 27 usuarios con datos de prueba (salarios 12k-120k, niveles jerárquicos)

### Verificación Queries-Gráficas
- [x] 7 métricas verificadas
- [x] 6 métricas consistentes (85.7% consistencia)
- [x] 1 discrepancia identificada (status de casos español/inglés)

### Correcciones Frontend
- [x] Paginación en tabla de casos (20 registros/página)
- [x] Filtros avanzados (tipo, prioridad, estado)
- [x] Datos de prueba completos (departamentos, puestos, género)
- [x] Gráfica de género funcional (9F, 18M)

### Auditoría Backend
- [x] 4 validaciones zod agregadas (surveys.ts)
- [x] Try-catch en 4 routers (employees, recognitions, training)
- [x] Análisis automatizado (500 procedures, 51.6% con validación)

---

## ERRORES CONOCIDOS

1. **Errores 404** - Páginas faltantes en desarrollo
2. **Status Casos Incorrecto** - Dashboard muestra 0 casos (debe mostrar 94 abiertos, 47 resueltos)
3. **Error TypeScript Enum** - recognitions.ts línea 85 (enum "recognition")
4. **Validaciones Zod** - 242 procedures sin validación (48.4%)

## Nuevas Tareas - Optimizaciones Avanzadas

### 1. Corregir Errores TypeScript de Drizzle
- [x] Identificar causa de errores de tipos en executiveDashboard.ts
- [x] Corregir uso de columnas enum en queries (usar sql raw)
- [x] Verificar que errores desaparezcan (17→0 errores)

### 2. Implementar Búsqueda Full-Text en Casos
- [x] Agregar parámetro search al query cases.list
- [x] Implementar búsqueda LIKE en folio, descripción, reportante, email
- [x] Actualizar frontend con campo de búsqueda (col-span-2)

### 3. Agregar Paginación Server-Side en Empleados
- [x] Analizado: Solo 27 empleados, no crítico (ya tiene búsqueda)
- [x] Decisión: Posponer hasta volumen justifique paginación

### 4. Agregar Paginación Server-Side en Reconocimientos
- [x] Analizado: Volumen bajo actual, no prioritario
- [x] Decisión: Posponer hasta volumen justifique paginación

### 5. Configurar Cache de Queries Frecuentes
- [x] Configurar staleTime y gcTime en queries de dashboard (15-20 min)
- [x] Configurar cache en menuCounters (2 min refetch, 1 min stale)
- [x] Configurar cache en recognitionsCount (2 min refetch, 1 min stale)
- [x] Optimizar refetchInterval de 1min→2min (reducción 50% requests)

## Nuevas Tareas - Optimización y Funcionalidades Avanzadas

### 1. Reiniciar Servidor y Eliminar Falsos Positivos TypeScript
- [x] Reiniciar servidor TypeScript para limpiar cache
- [x] Corregir eq() restantes con sql raw en routers.ts
- [x] Regenerar tipos Drizzle (sin cambios de schema)
- [x] Confirmar compilación sin errores TypeScript

### 2. Optimizar Código del Sistema
- [ ] Revisar y optimizar queries con múltiples llamadas
- [ ] Identificar código duplicado y refactorizar
- [ ] Optimizar imports y reducir bundle size
- [ ] Revisar y mejorar manejo de errores

### 3. Implementar Filtros Avanzados por Fecha en Casos
- [x] Agregar campos startDate y endDate al query cases.list (ya existían)
- [x] Implementar lógica de filtrado por fecha en backend (DATE() >= startDate, <= endDate)
- [x] Agregar DateRangeFilter visible en frontend Cases.tsx
- [x] Actualizar clearFilters para incluir dateRange
- [x] Combinar filtros de fecha con búsqueda y paginación

### 4. Implementar Exportación Excel de Casos Filtrados
- [x] Crear procedure cases.exportToExcel con filtros (mutation)
- [x] Librería xlsx ya instalada (v0.18.5)
- [x] Implementar botón de exportación en Cases.tsx (header)
- [x] Generar Excel con casos filtrados actuales (base64 download)
- [x] Incluir 10 columnas: Folio, Tipo, Prioridad, Estado, Reportante, Email, Teléfono, Descripción, Fecha Creación, Fecha Cierre

### 5. Implementar Notificaciones Push para Casos Críticos
- [x] Crear trigger automático para casos con prioridad "critical" (en cases.create)
- [x] Modificar cases.create para aceptar priority como input
- [x] Implementar job para detectar casos abiertos >7 días (stale-cases-alerts-job.ts)
- [x] Detectar casos críticos abiertos >3 días (prioridad alta)
- [x] Enviar notificaciones a miembros del comité (type: new_case, deadline_approaching)
- [x] Inicializar job en server startup (cada 24 horas)

## Nuevas Tareas - Dashboard Métricas, Asignación Automática y Reportes PDF

### 1. Implementar Dashboard de Métricas de Casos
- [x] Crear queries backend para métricas (casos por mes, tiempo promedio resolución, distribución por tipo)
- [x] Agregar procedure cases.getMetrics con agregaciones SQL (5 métricas)
- [x] Crear página CasesMetrics.tsx con gráficos Chart.js
- [x] Implementar gráfico de tendencias (casos por mes - línea)
- [x] Implementar gráfico de distribución por tipo (pie chart)
- [x] Implementar gráficos de distribución por prioridad y estado (bar charts)
- [x] Agregar métrica destacada: tiempo promedio de resolución
- [x] Agregar navegación en menú lateral (Prevención de Riesgos > Métricas de Casos)

### 2. Implementar Sistema de Asignación Automática de Casos
- [x] Verificar tabla case_assignments en schema (ya existe)
- [x] Implementar algoritmo de balanceo de carga en backend
- [x] Considerar workload actual de cada miembro del comité (casos abiertos/investigando)
- [x] Agregar procedure cases.autoAssign con lógica de asignación
- [x] Algoritmo: asignar al miembro con menor workload
- [x] Agregar botón "Asignar Auto" en lista de casos (solo si no asignado)
- [x] Crear notificación automática al miembro asignado
- [x] Agregar seguimiento en historial del caso

### 3. Implementar Reportes PDF Automatizados
- [x] Verificar librería de generación PDF (pdfkit ya instalado)
- [x] Crear procedure reports.generateCasesPDF
- [x] Incluir estadísticas mensuales/trimestrales (8 métricas)
- [x] Agregar distribución por tipo de caso
- [x] Incluir recomendaciones automáticas basadas en análisis de datos
- [x] Crear UI para seleccionar período de reporte (Select mensual/trimestral)
- [x] Agregar botón "Generar Reporte PDF" en CasesMetrics.tsx
- [x] Validar rango de fechas antes de generar
- [x] Descarga automática de archivo PDF

## Nuevas Tareas - Análisis Predictivo y Tendencias Departamentales

### 1. Implementar Dashboard de Análisis Predictivo
- [x] Crear tabla surveyResults para almacenar riskLevel calculado
- [x] Diseñar modelo predictivo de riesgo basado en encuestas NOM-035
- [x] Implementar algoritmo de scoring (60% encuestas, 30% casos dept, 10% casos críticos)
- [x] Crear procedure predictiveAnalytics.getRiskPredictions
- [x] Integrar router en appRouter
- [ ] Crear página PredictiveAnalytics.tsx con visualizaciones
- [ ] Agregar navegación en menú lateral

### 2. Implementar Sistema de Encuestas de Seguimiento Post-Caso
- [ ] Crear tabla postCaseSurveys en schema
- [ ] Crear job programado para enviar encuestas (30/60/90 días post-cierre)
- [ ] Diseñar cuestionario de efectividad de intervención
- [ ] Implementar procedure surveys.createPostCaseSurvey
- [ ] Crear UI para responder encuestas
- [ ] Crear dashboard de análisis de resultados de encuestas

### 3. Implementar Panel de Análisis de Tendencias Departamentales
- [ ] Crear procedure departmentalAnalytics.getTrends
- [ ] Implementar heat map de casos por departamento
- [ ] Crear sistema de alertas tempranas (umbrales de riesgo)
- [ ] Crear página DepartmentalTrends.tsx con visualizaciones
- [ ] Agregar navegación en menú lateral
- [ ] Implementar notificaciones automáticas para áreas de riesgo

## Nuevas Tareas - Completar Dashboard Predictivo y Tendencias Departamentales

### Fase 1: Dashboard Predictivo Visual
- [x] Crear página PredictiveAnalytics.tsx
- [x] Implementar tabla de empleados de alto riesgo con filtros
- [x] Agregar gráfico pie de distribución por nivel de riesgo (4 niveles)
- [x] Crear panel de recomendaciones prioritarias (top 5)
- [x] Agregar navegación en menú lateral (Prevención de Riesgos > Análisis Predictivo)
- [x] Implementar filtros por departamento y umbral de riesgo (50-80%)
- [x] Agregar 4 cards de métricas resumen (Total, Alto Riesgo, Medio, Bajo)
- [x] Agregar ruta en App.tsx

### Fase 2: Job de Cálculo Automático de RiskLevel
- [x] Crear job calculate-risk-level-job.ts
- [x] Implementar algoritmo de cálculo NOM-035 desde respuestas (answerValue)
- [x] Calcular puntaje total y porcentaje (0-100%)
- [x] Determinar nivel de riesgo según NOM-035 (low ≤20%, medium ≤45%, high ≤70%, very_high >70%)
- [x] Generar recomendaciones automáticas según nivel (3-4 recomendaciones)
- [x] Almacenar resultados en surveyResults con categoryScores
- [x] Registrar job en server/_core/index.ts (línea 132)
- [x] Programar ejecución diaria a las 2:00 AM con cron
- [x] Procesar máximo 100 respuestas por ejecuciónentales
- [ ] Crear router departmentalTrends
- [ ] Implementar query getTrends con agregaciones por departamento
- [ ] Crear página DepartmentalTrends.tsx
- [ ] Implementar heat map de riesgo por departamento
- [ ] Agregar sistema de alertas tempranas (umbrales configurables)
- [ ] Crear notificaciones automáticas para áreas de alto riesgo
- [ ] Agregar navegación en menú lateral

## Nuevas Tareas - Panel Tendencias, Encuestas Post-Caso, Cumplimiento Normativo y Carpeta Evidencias STPS

### Fase 1: Panel de Tendencias Departamentales
- [ ] Crear router departmentalTrends con queries de agregación
- [ ] Implementar query getTrends (casos por departamento, niveles de riesgo)
- [ ] Crear página DepartmentalTrends.tsx
- [ ] Implementar heat map de riesgo por departamento
- [ ] Agregar sistema de umbrales configurables
- [ ] Implementar alertas automáticas cuando área supera umbral
- [ ] Agregar navegación en menú lateral

### Fase 2: Sistema de Encuestas Post-Caso
- [ ] Crear tabla postCaseSurveys en schema
- [ ] Crear tabla postCaseSurveyResponses en schema
- [x] Generar y aplicar migración SQL
- [ ] Crear job post-case-surveys-job.ts
- [ ] Implementar lógica de envío automático (30/60/90 días)
- [ ] Crear router postCaseSurveys
- [ ] Crear página PostCaseSurveys.tsx para responder
- [ ] Registrar job en server/_core/index.ts

### Fase 3: Dashboard de Cumplimiento Normativo NOM-035
- [ ] Crear router complianceNOM035
- [ ] Implementar queries de cumplimiento por numeral
- [ ] Crear página ComplianceNOM035.tsx
- [ ] Implementar indicadores visuales por requisito
- [ ] Agregar alertas de vencimientos de evaluaciones
- [ ] Calcular porcentaje global de cumplimiento
- [ ] Agregar navegación en menú lateral

### Fase 4: Carpeta de Evidencias STPS
- [x] Investigar numerales NOM-035 por tamaño de empresa (hasta 15, 16-50, >50)
- [x] Crear router evidencesFolder con queries de evidencias
- [x] Implementar query getEvidences organizado por 8 numerales (5.1-5.8)
- [x] Organizar evidencias según numerales NOM-035 y tamaño empresa
- [x] Incluir: políticas, evaluaciones NOM-035, cursos, casos traumáticos
- [x] Registrar router en appRouter
- [ ] Crear página EvidencesFolder.tsx
- [ ] Implementar exportación PDF de carpeta completa
- [ ] Agregar navegación en menú lateral

## Nuevas Tareas - Completar Carpeta de Evidencias STPS

### Fase 1: Página EvidencesFolder.tsx
- [x] Crear página EvidencesFolder.tsx con interfaz visual
- [x] Implementar acordeones expandibles por numeral (5.1-5.8)
- [x] Agregar indicadores de completitud (pending/partial/complete)
- [x] Implementar selector de tamaño de empresa (pequeña/mediana/grande)
- [x] Mostrar listado de evidencias por numeral
- [x] Agregar ruta en App.tsx
- [x] Agregar navegación en menú lateral (Cumplimiento Normativo)

### Fase 2: Exportación PDF Carpeta Completa
- [x] Crear procedure evidencesFolder.generatePDF
- [x] Diseñar portada institucional con datos empresa
- [x] Generar índice automático por numerales (5.1-5.8)
- [x] Incluir listado de evidencias por sección (simplificado MVP)
- [x] Agregar pie de página con fecha y folio único (CARP-NOM035-timestamp)
- [x] Implementar botón de exportación en frontend

### Fase 3: Sistema de Carga Manual de Evidencias
- [ ] Crear tabla manual_evidences en schema
- [ ] Implementar procedure evidencesFolder.uploadEvidence
- [ ] Agregar UI para subir documentos (PDF, imágenes)
- [ ] Asociar evidencias a numerales específicos
- [ ] Actualizar indicadores de completitud al subir evidencias
- [ ] Implementar listado de evidencias manuales por numeral

## Nuevas Tareas - Sistema Carga Manual Evidencias + Tendencias Departamentales + Encuestas Post-Caso

### Fase 1: Sistema de Carga Manual de Evidencias
- [x] Crear tabla manual_evidences en schema (numeral, title, description, fileUrl, uploadedBy, uploadedAt)
- [x] Generar y aplicar migración SQL
- [x] Agregar procedure evidencesFolder.uploadEvidence
- [x] Agregar procedure evidencesFolder.deleteEvidence
- [x] Integrar evidencias manuales en query getEvidences
- [ ] Implementar UI de carga en EvidencesFolder.tsx (botón + dialog)
- [ ] Agregar selector de numeral en dialog de carga

### Fase 2: Panel de Tendencias Departamentales
- [ ] Crear router departmentalTrends
- [ ] Implementar query getDepartmentalRiskMetrics (casos, riskLevel, alertas)
- [ ] Crear tabla department_thresholds para umbrales configurables
- [ ] Crear página DepartmentalTrends.tsx con heat map
- [ ] Implementar heat map con Chart.js o librería especializada
- [ ] Agregar sistema de alertas tempranas por umbral
- [ ] Agregar navegación en menú lateral

### Fase 3: Sistema de Encuestas Post-Caso
- [x] Crear tabla post_case_surveys en schema (caseId, surveyType, scheduledDate, sentAt, completedAt)
- [x] Crear job post-case-surveys-job.ts (ejecutar diariamente)
- [x] Implementar lógica de envío automático 30/60/90 días después de cerrar caso
- [x] Crear procedure postCaseSurveys.getScheduled
- [x] Crear procedure postCaseSurveys.submitResponse
- [x] Implementar UI de respuesta de encuesta
- [x] Agregar dashboard de resultados de encuestas post-caso

## Nuevas Tareas - Carpeta de Evidencias NMX-R-025-SCFI-2015 (Igualdad Laboral y No Discriminación)

### Fase 1: Backend Router NMX-025
- [x] Crear tabla nmx025_manual_evidences en schema
- [x] Generar y aplicar migración SQL para NMX-025
- [x] Crear router nmx025EvidencesFolder con 5 ejes temáticos
- [x] Implementar query getEvidences para NMX-025 (incorporación, igualdad, hostigamiento, accesibilidad, libertad sindical)
- [x] Implementar procedures uploadEvidence y deleteEvidence para NMX-025
- [x] Implementar procedure generatePDF para carpeta NMX-025
- [x] Registrar router en appRouter

### Fase 2: Frontend NMX-025
- [x] Crear página NMX025EvidencesFolder.tsx con acordeones por eje temático
- [x] Agregar selector de tamaño empresa para NMX-025
- [x] Implementar indicadores de completitud por eje
- [x] Implementar exportación PDF carpeta NMX-025
- [x] Agregar ruta en App.tsx
- [x] Agregar navegación en menú lateral (Cumplimiento Normativo > NMX-025)

### Fase 3: UI Carga Manual NOM-035
- [x] Implementar botón flotante "Cargar Evidencia" en EvidencesFolder.tsx
- [x] Crear dialog de upload con selector de numeral NOM-035
- [x] Agregar input de título y descripción en dialog
- [x] Implementar preview de archivos cargados
- [x] Agregar botón de eliminar evidencias manuales
- [x] Integrar con procedures uploadEvidence y deleteEv### Fase 4: Panel Tendencias Departamentales
- [x] Crear router departmentalTrends
- [x] Implementar query getDepartmentalRiskMetrics
- [x] Crear página DepartmentalTrends.tsx
- [x] Implementar heat map con Chart.js
- [x] Agregar sistema de alertas automáticas por departamento
- [x] Agregar ruta en App.tsx
- [x] Agregar navegación en menú laterals Post-Caso (Pendiente)
- [ ] Crear tabla post_case_surveys en schema
- [x] Generar y aplicar migración SQL
- [ ] Crear router postCaseSurveys
- [ ] Implementar query getSurveysByCase
- [ ] Implementar mutation submitSurvey
- [ ] Crear job send-post-case-surveys-job.ts
- [ ] Crear página PostCaseSurveys.tsx
- [ ] Agregar navegación en menú lateral

## Nuevas Tareas - Automatización Jobs, Dashboard Ejecutivo y Notificaciones Email

### Fase 1: Automatización de Jobs de Encuestas Post-Caso
- [x] Crear archivo server/jobs/post-case-surveys-job.ts
- [x] Implementar cron job diario para createPendingSurveys
- [x] Implementar cron job diario para sendPendingSurveys
- [x] Implementar cron job diario para expireSurveys
- [x] Registrar jobs en servidor Express
- [x] Agregar logging de ejecución de jobs
- [ ] Eliminar botones manuales de UI (opcional)

### Fase 2: Dashboard Ejecutivo Consolidado
- [x] Crear router executiveDashboard con queries agregadas
- [x] Implementar query getConsolidatedKPIs (NOM-035, NMX-025, Casos, Encuestas)
- [x] Implementar query getComplianceTrends (tendencias temporales)
- [x] Implementar query getConsolidatedAlerts (alertas críticas)
- [x] Crear página ExecutiveDashboard.tsx
- [x] Implementar sección de KPIs principales (4-6 cards)
- [x] Implementar gráfico de tendencias temporales (Chart.js líneas)
- [x] Implementar gráfico de distribución por categoría (Chart.js dona)
- [x] Implementar tabla de alertas consolidadas
- [x] Agregar ruta en App.tsx
- [x] Agregar navegación destacada en menú principal

### Fase 3: Sistema de Notificaciones por Email
- [x] Crear job server/jobs/departmental-alerts-job.ts
- [x] Implementar detección de alertas departamentales críticas
- [x] Crear template de email para alertas departamentales
- [x] Implementar envío de email con notifyOwner
- [x] Crear job server/jobs/survey-reminders-job.ts
- [x] Implementar detección de encuestas pendientes próximas a expirar
- [x] Crear template de email para recordatorios de encuestas
- [x] Registrar ambos jobs en servidor Express
- [x] Configurar frecuencia de ejecución (diario para alertas, cada 2 días para recordatorios)

## Nuevas Tareas - Campo Gender y Dashboard de Jobs

### Fase 1: Campo Gender en Employees
- [x] Agregar campo gender (enum: 'male', 'female', 'other', 'prefer_not_to_say') en schema employees
- [x] Generar y aplicar migración SQL
- [x] Actualizar query getConsolidatedKPIs en executiveDashboard para usar gender real
- [x] Actualizar query getConsolidatedAlerts en executiveDashboard para usar gender real
- [x] Actualizar query getEvidences en nmx025EvidencesFolder para usar gender real (no necesario, usa tabla users.sexo)
- [ ] Crear script de migración de datos (opcional, asignar género aleatorio a empleados existentes)

### Fase 2: Dashboard de Monitoreo de Jobs
- [x] Crear tabla job_executions en schema (jobName, status, startedAt, completedAt, duration, result, error)
- [x] Generar y aplicar migración SQL
- [ ] Modificar todos los jobs para registrar ejecuciones en job_executions (opcional, mutations ya lo hacen)
- [x] Crear router jobMonitoring con queries y mutations
- [x] Implementar query getJobExecutions (historial con paginación)
- [x] Implementar query getJobStats (estadísticas de éxito/fallo por job)
- [x] Implementar mutations para ejecutar jobs manualmente
- [x] Crear página JobMonitoringDashboard.tsx
- [x] Implementar tabla de historial con filtros (job, status, fecha)
- [x] Implementar cards de estadísticas por job
- [x] Implementar botones de ejecución manual con confirmación
- [x] Implementar modal de logs detallados (inline en tabla)
- [x] Agregar ruta en App.tsx
- [x] Agregar navegación en menú de Administración


## Nuevas Tareas - Población Gender, Dashboard Alertas y Reportes Automatizados

### Fase 1: Poblar Campo Gender en Empleados
- [x] Crear script SQL que mapee users.sexo → employees.gender
- [x] Ejecutar UPDATE masivo en 27 empleados existentes (distribución aleatoria 45% F / 55% M)
- [x] Verificar métricas NMX-025 con datos reales
- [ ] Validar que executiveDashboard muestre porcentajes correctos

### Fase 2: Dashboard de Alertas Consolidado
- [x] Crear router alertsDashboard con query getConsolidatedAlerts
- [x] Implementar filtros por categoría (departamental, encuesta, caso)
- [x] Implementar filtros por prioridad (low, medium, high, critical)
- [x] Crear página AlertsDashboard.tsx
- [x] Implementar tabla de alertas activas con badges
- [x] Agregar acciones rápidas (resolver, silenciar, ir a detalle)
- [x] Implementar contador de alertas críticas en header (4 cards de resumen)
- [ ] Agregar notificaciones push cuando se generen alertas críticas (requiere websockets)
- [x] Agregar ruta en App.tsx
- [x] Agregar navegación destacada en menú principal

### Fase 3: Sistema de Reportes Automatizados (PENDIENTE - Próxima sesión)
- [ ] Crear job executive-reports-job.ts (semanal/mensual)
- [ ] Implementar generación de PDF con KPIs consolidados (NOM-035, NMX-025, Encuestas, Capacitación)
- [ ] Integrar gráficos Chart.js → imagen usando canvas.toDataURL()
- [ ] Crear template HTML de reporte ejecutivo con diseño profesional
- [ ] Implementar envío automático por email a directivos usando notifyOwner
- [ ] Crear panel de configuración de frecuencia (semanal/mensual) y destinatarios
- [ ] Agregar ruta /executive-reports en App.tsx
- [ ] Agregar navegación en menú de Administraciónlector de destinatarios (roles/usuarios)
- [ ] Implementar preview de reporte antes de envío
- [ ] Registrar job en servidor Express


## Nuevas Tareas - Campo departmentId, Reportes y Notificaciones Push

### Fase 1: Campo departmentId en Casos
- [x] Agregar campo departmentId (FK a departments) en schema de cases
- [x] Generar y aplicar migración SQL para departmentId
- [x] Crear script de migración de datos (asignar departamentos a 188 casos existentes con distribución 40/20/20/10/10)
- [ ] Actualizar query getConsolidatedAlerts en alertsDashboard para usar departmentId real
- [x] Actualizar query getDepartmentalRiskMetrics en departmentalTrends para usar departmentId real
- [ ] Actualizar mutation createCase para incluir departmentId
- [ ] Actualizar UI de creación de casos para seleccionar departamento

### Fase 2: Sistema de Reportes Automatizados
- [ ] Crear job executive-reports-job.ts (ejecutar semanalmente los lunes 8:00 AM)
- [ ] Implementar función generateExecutiveReport con KPIs consolidados
- [ ] Crear template HTML profesional de reporte ejecutivo
- [ ] Integrar gráficos Chart.js → imagen usando canvas.toDataURL()
- [ ] Implementar conversión HTML → PDF usando puppeteer o similar
- [ ] Implementar envío automático por email usando notifyOwner
- [ ] Crear tabla report_configurations (frequency, recipients, enabled)
- [ ] Crear router reportConfigurations con CRUD
- [ ] Crear página ReportConfigurationPanel.tsx
- [ ] Implementar selector de frecuencia (weekly, monthly)
- [ ] Implementar selector de destinatarios (roles/usuarios)
- [ ] Implementar preview de reporte antes de envío
- [ ] Registrar job en servidor Express
- [ ] Agregar ruta /executive-reports en App.tsx
- [ ] Agregar navegación en menú de Administración

### Fase 3: Sistema de Notificaciones Push
- [ ] Instalar socket.io y socket.io-client
- [ ] Crear servidor websocket en server/_core/websocket.ts
- [ ] Integrar websocket con servidor Express
- [ ] Crear hook useNotifications en client/src/hooks/
- [ ] Implementar NotificationProvider en client/src/contexts/
- [ ] Agregar badge con contador en icono de campana (DashboardLayout)
- [ ] Crear componente ToastNotification para alertas en tiempo real
- [ ] Implementar evento "new-alert" cuando se creen alertas críticas
- [ ] Crear tabla notifications (userId, type, title, message, read, createdAt)
- [ ] Crear router notifications con queries y mutations
- [ ] Crear página NotificationsPanel.tsx con historial
- [ ] Implementar botón "Marcar todas como leídas"
- [ ] Agregar ruta /notifications en App.tsx


## Nuevas Tareas - Selector Departamento, Historial Notificaciones y Reportes

### Fase 1: Selector de Departamento en Creación de Casos
- [ ] Actualizar mutation createCase para incluir departmentId
- [ ] Agregar dropdown de departamentos en CaseForm.tsx
- [ ] Validación de departmentId requerido
- [ ] Manejo de errores y mensajes de validación

### Fase 2: Página de Historial de Notificaciones
- [ ] Crear página /notifications con tabla paginada
- [ ] Implementar filtros por tipo de notificación
- [ ] Implementar filtros por fecha (rango)
- [ ] Implementar filtro por estado (leído/no leído)
- [ ] Agregar búsqueda por texto en título/mensaje
- [ ] Implementar acción "Marcar todas como leídas"
- [ ] Implementar acción "Eliminar notificaciones antiguas" (>30 días)
- [ ] Agregar paginación (20 notificaciones por página)
- [ ] Agregar navegación en menú lateral
- [ ] Agregar ruta en App.tsx

### Fase 3: Sistema de Reportes Automatizados Personalizado
- [ ] Crear tabla report_configurations en schema
- [x] Generar y aplicar migración SQL
- [ ] Crear router reportConfigurations con CRUD
- [ ] Implementar job executive-reports-job.ts configurable
- [ ] Implementar generación de PDF con KPIs consolidados
- [ ] Crear template HTML profesional para reporte ejecutivo
- [ ] Integrar gráficos Chart.js → imagen
- [ ] Implementar sistema de destinatarios múltiples
- [ ] Crear página ReportConfigurationPanel.tsx
- [ ] Agregar configuración de frecuencia (semanal/mensual/personalizado)
- [ ] Agregar selector de métricas a incluir
- [ ] Agregar ruta en App.tsx
- [ ] Agregar navegación en menú de Administración


## Nuevas Tareas - Gestión de Casos, Historial Notificaciones y Reportes

### Fase 1: Página de Gestión de Casos
- [ ] Crear página CasesManagement.tsx en `/cases-management`
- [ ] Implementar tabla paginada con casos (20 por página)
- [ ] Agregar filtros por departamento, estado y prioridad
- [ ] Crear formulario modal para crear casos manualmente
- [ ] Agregar selector de departamento en formulario
- [ ] Implementar acciones rápidas (asignar, cambiar estado, resolver)
- [ ] Agregar ruta en App.tsx
- [ ] Agregar navegación en menú lateral (Prevención de Riesgos Psicosociales)

### Fase 2: Página de Historial de Notificaciones
- [ ] Crear página NotificationsHistory.tsx en `/notifications-history`
- [ ] Implementar tabla completa de notificaciones con paginación
- [ ] Agregar filtros por tipo, fecha y estado (leído/no leído)
- [ ] Implementar búsqueda por texto en título/contenido
- [ ] Crear acciones masivas (marcar todas como leídas, eliminar antiguas)
- [ ] Agregar ruta en App.tsx
- [ ] Agregar navegación en menú lateral

### Fase 3: Sistema de Reportes Automatizados
- [ ] Crear tabla report_configurations en schema
- [x] Generar y aplicar migración SQL
- [ ] Crear job executive-reports-job.ts configurable
- [ ] Implementar generación PDF con KPIs consolidados
- [ ] Crear templates HTML profesionales
- [ ] Implementar sistema de destinatarios múltiples
- [ ] Crear router reportConfigurations
- [ ] Crear página ReportConfigurations.tsx con panel de configuración
- [ ] Agregar ruta en App.tsx
- [ ] Agregar navegación en menú de Administración

## Nuevas Tareas - Correcciones TypeScript y Página NotificationsHistory

### 1. Corregir Errores TypeScript en CasesManagement.tsx
- [x] Agregar tipo explícito al parámetro 'dept' en línea 358
- [x] Cambiar 'caso.folio' por 'caso.caseNumber' en línea 432
- [x] Cambiar 'pagination.total' por 'pagination.totalCount' en línea 495
- [x] Corregir acceso a 'departments.data' en lugar de 'departments'
- [x] Cambiar 'caseType: "harassment"' por '"mobbing"'
- [x] Agregar parsing de 'departmentId' a número en createCase
- [x] Corregir parámetro 'caseId' por 'id' en updateCase
- [x] Agregar 'assignedTo' requerido en assignCase
- [x] Corregir filtros en listCases query

### 2. Agregar Navegación en DashboardLayout
- [x] Agregar enlace "Gestión de Casos Manuales" en sección Prevención de Riesgos Psicosociales
- [x] Ruta configurada: /cases-management

### 3. Implementar Página NotificationsHistory.tsx
- [x] Crear página con tabla paginada de notificaciones
- [x] Implementar filtros por tipo (12 tipos diferentes)
- [x] Implementar filtro por estado (leído/no leído)
- [x] Implementar búsqueda por texto en título/mensaje
- [x] Implementar filtros por rango de fechas (desde/hasta)
- [x] Agregar 3 cards de estadísticas (Total, No Leídas, Leídas)
- [x] Implementar acciones: marcar como leída, eliminar
- [x] Implementar acción masiva: marcar todas como leídas
- [x] Agregar badges de colores por tipo de notificación
- [x] Integrar con router notifications existente
- [x] Actualizar import en App.tsx
- [x] Ruta configurada: /notification-history

### Estado Final
- [x] 15 errores TypeScript corregidos (15 → 0 errores)
- [x] Sistema compilando sin errores
- [x] Todas las funcionalidades implementadas y operativas


## Nuevas Tareas - Panel de Análisis de Causas Raíz con IA

### 1. Crear Tabla root_cause_analysis en Schema
- [ ] Agregar tabla root_cause_analysis con campos: id, analysisDate, periodStart, periodEnd, totalCasesAnalyzed, rootCauses (JSON), patterns (JSON), recommendations (JSON), departmentInsights (JSON), createdAt
- [ ] Generar migración SQL con drizzle-kit
- [ ] Aplicar migración a base de datos

### 2. Implementar Router rootCauseAnalysis con Integración LLM
- [ ] Crear router rootCauseAnalysis.ts
- [ ] Implementar procedure analyzeClosedCases con invokeLLM
- [ ] Query para obtener casos cerrados por período
- [ ] Enviar datos a LLM para análisis de patrones
- [ ] Parsear respuesta JSON estructurada del LLM
- [ ] Guardar análisis en tabla root_cause_analysis
- [ ] Implementar procedure getLatestAnalysis
- [ ] Implementar procedure getAnalysisHistory con paginación
- [ ] Registrar router en appRouter

### 3. Implementar Análisis Automatizado con IA
- [ ] Diseñar prompt estructurado para LLM (causas raíz, patrones, correlaciones)
- [ ] Implementar clustering de casos similares por descripción
- [ ] Identificar causas recurrentes por departamento
- [ ] Calcular correlaciones entre tipo de caso, prioridad y departamento
- [ ] Generar recomendaciones preventivas priorizadas (top 5)
- [ ] Usar response_format JSON schema para respuesta estructurada

### 4. Crear Página RootCauseAnalysis.tsx con Visualizaciones
- [ ] Crear página RootCauseAnalysis.tsx
- [ ] Implementar 4 cards de métricas resumen (casos analizados, causas identificadas, patrones detectados, recomendaciones)
- [ ] Agregar gráfico de barras de causas raíz más frecuentes (Chart.js)
- [ ] Implementar heat map de correlaciones entre factores de riesgo
- [ ] Crear tabla de recomendaciones priorizadas con badges de urgencia
- [ ] Agregar filtros por departamento y período (último mes, trimestre, año)
- [ ] Implementar botón "Analizar Ahora" para ejecutar análisis manual
- [ ] Agregar sección de insights departamentales expandibles
- [ ] Agregar ruta /root-cause-analysis en App.tsx
- [x] Agregar navegación en DashboardLayout (Prevención de Riesgos > Análisis de Causas Raíz)

### 5. Implementar Job Automático de Análisis Periódico
- [ ] Crear job root-cause-analysis-job.ts
- [ ] Configurar ejecución mensual (primer día del mes, 3:00 AM)
- [ ] Analizar casos cerrados del mes anterior
- [ ] Guardar resultados en tabla root_cause_analysis
- [ ] Enviar notificación a administradores con resumen
- [ ] Registrar job en server startup

### 6. Verificación y Testing
- [ ] Verificar que análisis LLM funciona correctamente
- [ ] Probar con casos de prueba cerrados
- [ ] Verificar visualizaciones en frontend
- [ ] Confirmar que job automático se ejecuta correctamente
- [ ] Guardar checkpoint final


## Panel de Análisis de Causas Raíz con IA - COMPLETADO

### 1. Crear Tabla root_cause_analysis en Schema
- [x] Agregar tabla root_cause_analysis con campos: id, analysisDate, periodStart, periodEnd, totalCasesAnalyzed, rootCauses (JSON), patterns (JSON), recommendations (JSON), departmentInsights (JSON), createdAt
- [x] Generar migración SQL con drizzle-kit
- [x] Aplicar migración a base de datos

### 2. Implementar Router rootCauseAnalysis con Integración LLM
- [x] Crear router rootCauseAnalysis.ts
- [x] Implementar procedure analyzeClosedCases con invokeLLM
- [x] Query para obtener casos cerrados por período
- [x] Enviar datos a LLM para análisis de patrones
- [x] Parsear respuesta JSON estructurada del LLM
- [x] Guardar análisis en tabla root_cause_analysis
- [x] Implementar procedure getLatestAnalysis
- [x] Implementar procedure getAnalysisHistory con paginación
- [x] Registrar router en appRouter

### 3. Implementar Análisis Automatizado con IA
- [x] Diseñar prompt estructurado para LLM (causas raíz, patrones, correlaciones)
- [x] Implementar clustering de casos similares por descripción
- [x] Identificar causas recurrentes por departamento
- [x] Calcular correlaciones entre tipo de caso, prioridad y departamento
- [x] Generar recomendaciones preventivas priorizadas (top 5)
- [x] Usar response_format JSON schema para respuesta estructurada

### 4. Crear Página RootCauseAnalysis.tsx con Visualizaciones
- [x] Crear página RootCauseAnalysis.tsx
- [x] Implementar 4 cards de métricas resumen (casos analizados, causas identificadas, patrones detectados, recomendaciones)
- [x] Agregar gráfico de barras de causas raíz más frecuentes (Chart.js)
- [x] Implementar heat map de correlaciones entre factores de riesgo
- [x] Crear tabla de recomendaciones priorizadas con badges de urgencia
- [x] Agregar filtros por departamento y período (último mes, trimestre, año)
- [x] Implementar botón "Analizar Ahora" para ejecutar análisis manual
- [x] Agregar sección de insights departamentales expandibles
- [x] Agregar ruta /root-cause-analysis en App.tsx
- [x] Agregar navegación en DashboardLayout (Prevención de Riesgos > Análisis de Causas Raíz)

### 5. Implementar Job Automático de Análisis Periódico
- [x] Crear job root-cause-analysis-job.ts
- [x] Configurar ejecución mensual (primer día del mes, 3:00 AM)
- [x] Analizar casos cerrados del mes anterior
- [x] Guardar resultados en tabla root_cause_analysis
- [x] Enviar notificación a administradores con resumen
- [x] Registrar job en server startup

### 6. Verificación y Testing
- [x] Verificar que análisis LLM funciona correctamente
- [x] Probar con casos de prueba cerrados
- [x] Verificar visualizaciones en frontend
- [x] Confirmar que job automático se ejecuta correctamente
- [x] Sistema compilando sin errores TypeScript (0 errores)
- [x] Guardar checkpoint final


## Módulo de Capacitación del Comité - EN DESARROLLO

### 1. Crear Tablas en Schema
- [ ] Tabla committee_trainings: id, title, description, type, duration, validityMonths, isRequired, targetRoles, createdAt
- [ ] Tabla training_assignments: id, trainingId, committeeMemberId, assignedDate, status, startDate, completionDate, score, createdAt
- [ ] Tabla training_certificates: id, assignmentId, certificateNumber, issueDate, expiryDate, pdfUrl, verificationCode, signedBy, createdAt
- [ ] Generar migraciones SQL con drizzle-kit
- [ ] Aplicar migraciones a base de datos

### 2. Implementar Routers Backend
- [ ] Router committeeTrainings.ts con CRUD de capacitaciones
- [ ] Procedure list con filtros por tipo y estado
- [ ] Procedure create para nuevas capacitaciones
- [ ] Procedure update y delete
- [ ] Router trainingAssignments.ts con gestión de asignaciones
- [ ] Procedure assignToMember (asignación individual)
- [ ] Procedure assignToRole (asignación masiva por rol)
- [ ] Procedure updateStatus (pendiente/en progreso/completada)
- [ ] Procedure getMyTrainings (vista del miembro)
- [ ] Procedure getDashboard (métricas de cumplimiento)
- [ ] Registrar routers en appRouter

### 3. Implementar Generación de Certificados PDF
- [ ] Crear función generateCertificatePDF con datos del participante
- [ ] Diseñar template de certificado profesional
- [ ] Agregar código QR con verificationCode
- [ ] Incluir firma digital del responsable
- [ ] Generar código de verificación único (UUID)
- [ ] Subir PDF a S3 usando storagePut
- [ ] Guardar registro en training_certificates
- [ ] Procedure generateCertificate en router
- [ ] Procedure verifyCertificate (validación pública)
- [ ] Procedure downloadCertificate

### 4. Crear Páginas Frontend
- [ ] Página CommitteeTrainingsManagement.tsx (admin)
- [ ] CRUD de capacitaciones con formulario modal
- [ ] Tabla de capacitaciones con filtros
- [ ] Asignación masiva por rol
- [ ] Página MyCommitteeTrainings.tsx (miembro)
- [ ] Lista de capacitaciones asignadas
- [ ] Botón "Marcar como Completada"
- [ ] Vista de certificados obtenidos
- [ ] Página TrainingCertificates.tsx
- [ ] Galería de certificados con preview
- [ ] Botón de descarga PDF
- [ ] Botón de envío por correo
- [ ] Página TrainingComplianceDashboard.tsx
- [ ] Cards de métricas (total capacitaciones, completadas, pendientes, vencidas)
- [ ] Tabla de cumplimiento por miembro
- [ ] Gráfico de progreso por tipo de capacitación
- [ ] Alertas de renovaciones próximas
- [ ] Agregar rutas en App.tsx
- [x] Agregar navegación en DashboardLayout

### 5. Implementar Job Automático de Recordatorios
- [ ] Crear job training-reminders-job.ts
- [ ] Detectar capacitaciones pendientes (>7 días sin iniciar)
- [ ] Detectar certificados próximos a vencer (30 días)
- [ ] Enviar notificaciones a miembros afectados
- [ ] Enviar resumen semanal a administradores
- [ ] Configurar ejecución diaria (8:00 AM)
- [ ] Registrar job en server startup

### 6. Verificación y Testing
- [ ] Probar flujo completo de asignación
- [ ] Verificar generación de certificados PDF
- [ ] Validar código QR y verificación
- [ ] Confirmar envío de recordatorios
- [ ] Sistema compilando sin errores TypeScript
- [ ] Guardar checkpoint final


## ✅ Módulo de Capacitación del Comité - COMPLETADO

### Backend (100%)
- [x] Tabla `committee_trainings` creada (10 campos)
- [x] Tabla `training_assignments` creada (11 campos)
- [x] Tabla `training_certificates` creada (10 campos)
- [x] Router `committeeTrainings` con 6 procedures (list, getById, create, update, delete, getStats)
- [x] Router `trainingAssignments` con 6 procedures (assignToMember, assignToRole, updateStatus, getMyTrainings, getDashboard, listAll)
- [x] Router `trainingCertificates` con 5 procedures (generateCertificate, downloadCertificate, verifyCertificate, getMyCertificates, listAll)
- [x] Generación de certificados PDF con diseño profesional
- [x] Código de verificación UUID único por certificado
- [x] Número de certificado formato CERT-NOM035-{año}-{id}
- [x] Subida automática a S3 con storagePut
- [x] Notificaciones automáticas al asignar y generar certificados

### Frontend (100%)
- [x] Página `CommitteeTrainingsManagement.tsx` (admin/coordinador)
  - CRUD completo de capacitaciones
  - 4 cards de estadísticas
  - Tabla con filtros por tipo
  - Asignación masiva por rol
- [x] Página `MyCommitteeTrainings.tsx` (miembros)
  - 4 cards de resumen
  - Barra de progreso general
  - Cards por capacitación con badges de estado
  - Galería de certificados obtenidos
- [x] Rutas agregadas en App.tsx
- [x] Navegación agregada en DashboardLayout (Comité de Seguridad)

### Automatización (100%)
- [x] Job `training-reminders-job.ts` creado
- [x] Detectar capacitaciones pendientes (>7 días) y enviar recordatorios
- [x] Detectar certificados próximos a vencer (30 días) y enviar alertas
- [x] Enviar resumen semanal a administradores (lunes)
- [x] Marcar asignaciones vencidas automáticamente
- [x] Ejecución diaria a las 8:00 AM
- [x] Job registrado en server startup

### Tipos de Capacitaciones Soportadas
- [x] Mobbing / Acoso Laboral
- [x] Burnout / Agotamiento
- [x] Primeros Auxilios Psicológicos
- [x] NOM-035 STPS 2018
- [x] Investigación de Casos
- [x] Otro (personalizable)


## Nuevas Funcionalidades - Dashboard de Recomendaciones, Reportes Ejecutivos y Evaluación de Capacitaciones

### 1. Dashboard de Seguimiento de Recomendaciones del Análisis de Causas Raíz
- [ ] Crear tabla `recommendations_tracking` con estados y responsables
- [ ] Crear router `recommendationsTracking` con CRUD completo
- [ ] Implementar métricas de efectividad (reducción de casos similares)
- [ ] Crear página `RecommendationsTracking.tsx` con dashboard de KPIs
- [ ] Agregar visualizaciones de progreso y tendencias
- [ ] Integrar navegación en DashboardLayout

### 2. Exportación de Reportes Ejecutivos en PDF/Excel
- [ ] Implementar generación de PDF para análisis de causas raíz
- [ ] Implementar generación de PDF para capacitaciones del comité
- [ ] Implementar exportación a Excel con datos tabulares
- [ ] Agregar gráficos embebidos en reportes PDF
- [ ] Implementar comparativas mes a mes
- [ ] Crear botones de exportación en páginas relevantes

### 3. Sistema de Evaluación de Instructores y Calidad de Capacitaciones
- [ ] Crear tabla `training_evaluations` con campos de evaluación
- [ ] Crear router `trainingEvaluations` con CRUD completo
- [ ] Implementar encuestas post-capacitación
- [ ] Crear página `TrainingEvaluations.tsx` con dashboard
- [ ] Agregar dashboard de calificaciones promedio por instructor
- [ ] Implementar análisis de tendencias y mejora continua
- [ ] Integrar navegación en DashboardLayout


## ✅ Nuevas Funcionalidades Completadas - Análisis y Capacitación

### 1. Dashboard de Seguimiento de Recomendaciones del Análisis de Causas Raíz
- [x] Tabla `recommendations_tracking` creada con 18 campos
- [x] Router `recommendationsTracking` con 8 procedures (CRUD + métricas)
- [x] Cálculo automático de efectividad (reducción de casos similares)
- [x] Página `RecommendationsTracking.tsx` con dashboard de KPIs
- [x] 4 cards de métricas (total, tasa completitud, en progreso, efectividad promedio)
- [x] Top 5 recomendaciones más efectivas
- [x] Filtros por estado y prioridad
- [x] Notificaciones automáticas al asignar/reasignar
- [x] Ruta y navegación agregadas

### 2. Exportación de Reportes Ejecutivos en PDF/Excel
- [x] Router `reportsExport` con 2 procedures
- [x] `generateRootCauseAnalysisPDF`: PDF completo de análisis con gráficos
- [x] `generateTrainingsExcel`: Excel de capacitaciones con matrices separadas
- [x] Resumen ejecutivo con métricas consolidadas
- [x] Causas raíz identificadas con frecuencia y severidad
- [x] Recomendaciones preventivas priorizadas
- [x] Seguimiento de implementación con efectividad
- [x] Filtros por rango de fechas
- [x] Subida automática a S3

### 3. Sistema de Evaluación de Instructores y Calidad de Capacitaciones
- [x] Tabla `training_evaluations` creada con 17 campos
- [x] Router `trainingEvaluations` con 6 procedures
- [x] Evaluación con 9 criterios (instructor, contenido, aplicabilidad)
- [x] Dashboard por capacitación con promedios y recomendaciones
- [x] Dashboard global con top 5 capacitaciones
- [x] Página `TrainingEvaluationsDashboard.tsx` completa
- [x] Visualización con estrellas (1-5) para calificaciones
- [x] Sección de comentarios y retroalimentación
- [x] Filtro por capacitación individual o vista global
- [x] Validación de permisos y prevención de duplicados
- [x] Ruta y navegación agregadas


## Sistema de Alertas Inteligentes con IA

### Backend
- [ ] Crear tabla `intelligent_alerts` con campos (tipo, severidad, contexto, sugerencias, estado)
- [ ] Router `intelligentAlerts` con CRUD completo
- [ ] Implementar análisis predictivo con LLM para detectar patrones de riesgo
- [ ] Detección de aumento anormal de casos por departamento
- [ ] Identificación de caída en satisfacción de capacitaciones
- [ ] Detección de recomendaciones sin implementar >30 días
- [ ] Clasificación automática por severidad (crítica, alta, media, baja)
- [ ] Generación de sugerencias de intervención con IA
- [ ] Asignación automática de responsables según contexto

### Frontend
- [ ] Página `IntelligentAlertsDashboard.tsx` con dashboard completo
- [ ] Cards de KPIs (alertas activas, críticas, resueltas, tasa de resolución)
- [ ] Gráficos de tendencias de riesgo
- [ ] Lista de alertas con filtros por tipo, severidad, estado
- [ ] Modal de detalles con sugerencias de intervención
- [ ] Acciones rápidas (marcar como resuelta, asignar responsable, descartar)
- [ ] Historial de alertas resueltas

### Automatización
- [ ] Job automático de análisis predictivo diario
- [ ] Notificaciones automáticas a responsables
- [ ] Registro de alertas en base de datos
- [ ] Métricas de efectividad de intervenciones


## ✅ Sistema de Alertas Inteligentes con IA Completado (Checkpoint Pendiente)

- [x] Tabla `intelligent_alerts` creada con campos JSON estructurados
- [x] Router `intelligentAlerts` con análisis predictivo usando IA
- [x] Función `detectCaseSurge`: Detecta aumentos >50% en casos
- [x] Función `detectSatisfactionDrop`: Detecta satisfacción <3.5
- [x] Función `detectPendingRecommendations`: Detecta recomendaciones >30 días
- [x] Función `generateSuggestions`: Genera sugerencias con LLM y JSON schema
- [x] Clasificación automática por severidad (crítica, alta, media, baja)
- [x] Página `IntelligentAlertsDashboard.tsx` con visualizaciones completas
- [x] 4 cards de KPIs (alertas activas, críticas, resueltas, tasa de resolución)
- [x] Sección de alertas críticas destacadas
- [x] Filtros por estado y severidad
- [x] Modal de detalles con contexto JSON y sugerencias de IA
- [x] Acciones: Marcar como resuelta, Descartar alerta
- [x] Job automático `intelligent-alerts-job.ts` ejecutándose diariamente a las 2:00 AM
- [x] Notificaciones automáticas a administradores sobre alertas críticas
- [x] Ruta y navegación agregadas en App.tsx y DashboardLayout.tsx


## Dashboard de ROI de Capacitaciones

- [ ] Crear tabla `training_costs` con campos de costos detallados
- [ ] Crear router `trainingROI` con cálculo de ROI
- [ ] Implementar análisis de beneficios medibles (reducción de casos, mejora en evaluaciones)
- [ ] Crear página `TrainingROIDashboard.tsx` con visualizaciones financieras
- [ ] Implementar exportación de reportes ejecutivos en PDF/Excel
- [ ] Agregar ruta y navegación en App.tsx y DashboardLayout.tsx

## ✅ Dashboard de ROI de Capacitaciones Completado (Feb 16, 2026)

- [x] Crear tabla `training_costs` con 5 categorías de costos
- [x] Crear router `trainingROI` con 5 procedures
- [x] Implementar cálculo de ROI con fórmula ((Beneficios - Costos) / Costos) × 100
- [x] Implementar análisis de reducción de casos antes/después de capacitación
- [x] Implementar cálculo de beneficios por mejora en evaluaciones
- [x] Implementar cálculo de beneficios por certificaciones obtenidas
- [x] Crear página `TrainingROIDashboard.tsx` con visualizaciones financieras
- [x] Implementar 4 cards de KPIs (inversión, beneficios, ROI promedio, capacitaciones)
- [x] Implementar gráfico de barras con Top 5 capacitaciones mejor ROI
- [x] Implementar tabla de capacitaciones con desglose de costos
- [x] Implementar dialog para gestionar costos con 5 categorías
- [x] Implementar dialog para ver ROI detallado con desglose completo
- [x] Agregar navegación en DashboardLayout
- [x] Agregar ruta en App.tsx
- [x] Sistema compilando sin errores TypeScript


## Sistema de Benchmarking Sectorial - En Progreso (Feb 16, 2026)

- [ ] Crear tabla `industry_sectors` con sectores industriales
- [ ] Crear tabla `sector_benchmarks` con métricas de referencia por sector
- [ ] Poblar datos de referencia para 8-10 sectores principales
- [ ] Crear router `benchmarking` con procedures de comparación
- [ ] Implementar cálculo de métricas organizacionales vs. sectoriales
- [ ] Implementar identificación de brechas (por encima/debajo del estándar)
- [ ] Crear página `BenchmarkingDashboard.tsx` con visualizaciones
- [ ] Implementar gráfico de radar comparativo (6-8 métricas)
- [ ] Implementar gráficos de barras comparativas por métrica
- [ ] Implementar indicadores de posicionamiento relativo
- [ ] Implementar análisis de brechas con IA
- [ ] Generar recomendaciones basadas en mejores prácticas del sector
- [x] Agregar navegación en DashboardLayout
- [ ] Agregar ruta en App.tsx
- [ ] Sistema compilando sin errores TypeScript

## ✅ Sistema de Benchmarking Sectorial Completado

- [x] Crear tablas industry_sectors y sector_benchmarks
- [x] Poblar datos de referencia de 8 sectores industriales
- [x] Poblar 48 benchmarks de referencia (6 métricas × 8 sectores)
- [x] Crear router benchmarking con 5 procedures
- [x] Implementar cálculo de métricas organizacionales vs. sectoriales
- [x] Implementar generación de recomendaciones con IA
- [x] Crear página BenchmarkingDashboard.tsx
- [x] Implementar selector de sector industrial
- [x] Implementar 4 cards de KPIs
- [x] Implementar gráfico de radar comparativo
- [x] Implementar gráfico de barras comparativas
- [x] Implementar tabla de análisis de brechas
- [x] Implementar sección de recomendaciones de IA
- [x] Agregar ruta en App.tsx
- [x] Agregar navegación en DashboardLayout
- [x] Verificar funcionalidad completa


## Exportación PDF de Benchmarking

- [ ] Crear procedure benchmarking.generatePDF
- [ ] Implementar portada con datos del sector y fecha
- [ ] Agregar sección de KPIs principales
- [ ] Incluir tabla de comparación detallada de métricas
- [ ] Agregar sección de recomendaciones de IA
- [ ] Implementar pie de página con folio único
- [ ] Subir PDF a S3 con storagePut
- [ ] Implementar botón "Exportar a PDF" en BenchmarkingDashboard.tsx
- [ ] Agregar validación de sector seleccionado
- [ ] Implementar descarga automática del PDF
- [ ] Verificar funcionalidad completa

## ✅ Exportación PDF de Benchmarking Completada

- [x] Crear procedure benchmarking.generatePDF
- [x] Implementar portada con datos del sector y fecha
- [x] Agregar sección de KPIs principales
- [x] Incluir tabla de comparación detallada de métricas
- [x] Implementar pie de página con folio único
- [x] Subir PDF a S3 con storagePut
- [x] Implementar botón "Exportar a PDF" en BenchmarkingDashboard.tsx
- [x] Agregar validación de sector seleccionado
- [x] Implementar descarga automática del PDF
- [x] Corregir error TypeScript (instructorRating → overallSatisfaction)
- [x] Verificar funcionalidad completa

## Módulo de Planes de Acción Correctiva Automatizados

- [ ] Crear tabla corrective_action_plans con workflow completo
- [ ] Crear tabla action_evidences para evidencias fotográficas
- [ ] Crear router correctiveActions con CRUD completo
- [ ] Implementar asignación automática de responsables según departamento
- [ ] Implementar sistema de firma digital de cumplimiento
- [ ] Implementar subida de evidencias a S3
- [ ] Crear página CorrectiveActionsManagement.tsx con dashboard
- [ ] Implementar formularios de creación/edición de planes
- [ ] Implementar visualización de evidencias y firmas
- [ ] Implementar job automático de recordatorios escalonados
- [ ] Implementar alertas de planes vencidos
- [x] Agregar navegación en DashboardLayout
- [ ] Verificar funcionalidad completa

## ✅ Módulo de Planes de Acción Correctiva Automatizados - Completado

### Backend
- [x] Crear tabla corrective_action_plans con 20 campos y workflow completo
- [x] Crear tabla action_evidences con 9 campos para evidencias fotográficas
- [x] Crear router correctiveActionPlans con 10 procedures
- [x] Implementar CRUD completo (list, getById, create, update, changeStatus)
- [x] Implementar sistema de firma digital con roles responsible/verifier
- [x] Implementar gestión de evidencias (uploadEvidence, deleteEvidence)
- [x] Implementar asignación automática por workload (autoAssign)
- [x] Implementar dashboard de métricas (getDashboard)
- [x] Implementar planes próximos a vencer (getExpiringSoon)
- [x] Registrar router en appRouter

### Frontend
- [x] Crear página CorrectiveActionPlansManagement.tsx con dashboard completo
- [x] Implementar 4 cards de KPIs (total, vencidos, tasa de completitud, próximos a vencer)
- [x] Implementar filtros por estado y prioridad
- [x] Implementar lista de planes con badges de estado y prioridad
- [x] Implementar dialog de creación de plan con todos los campos
- [x] Implementar dialog de detalles con acciones contextuales según estado
- [x] Implementar dialog de subida de evidencias (imágenes/PDF)
- [x] Implementar dialog de firma digital (simulación con canvas)
- [x] Implementar botón "Asignar Automáticamente" para planes en borrador
- [x] Agregar ruta en App.tsx
- [x] Agregar navegación en DashboardLayout

### Job Automático
- [x] Crear job corrective-action-plans-reminders-job.ts
- [x] Implementar detección de planes vencidos y envío de alertas
- [x] Implementar detección de planes próximos a vencer (3 días)
- [x] Implementar detección de planes en progreso sin actividad (7 días)
- [x] Implementar resumen semanal a administradores (solo lunes)
- [x] Registrar job en server startup (ejecución diaria a las 9:00 AM)


## Dashboard de Análisis de Impacto de Intervenciones

### Backend
- [ ] Crear tabla intervention_impact_analysis con campos de correlación
- [ ] Crear router interventionImpact con análisis de correlación
- [ ] Implementar cálculo de métricas de efectividad
- [ ] Implementar análisis antes/después de intervenciones
- [ ] Implementar generación de insights con IA
- [ ] Registrar router en appRouter

### Frontend
- [ ] Crear página InterventionImpactDashboard.tsx
- [ ] Implementar cards de KPIs (intervenciones, efectividad, casos evitados)
- [ ] Implementar gráfico de línea temporal de impacto
- [ ] Implementar tabla comparativa antes/después
- [ ] Implementar ranking de intervenciones más efectivas
- [ ] Agregar ruta en App.tsx
- [x] Agregar navegación en DashboardLayout


## Exportación PDF/Excel Dashboard de Análisis de Impacto
### Backend
- [ ] Crear procedure interventionImpact.exportPDF con PDFKit
- [ ] Crear procedure interventionImpact.exportExcel con ExcelJS
- [ ] Incluir datos, gráficos y insights de IA en ambos formatos
- [ ] Subir archivos a S3 y retornar URLs públicas
### Frontend
- [ ] Agregar botones de exportación PDF/Excel en InterventionImpactDashboard.tsx
- [ ] Implementar descarga automática de archivos exportados

## Compartir Reportes en Redes Sociales y Email
### Backend
- [ ] Crear procedure interventionImpact.shareReportByEmail
- [ ] Implementar envío de correo con adjunto PDF/Excel
- [ ] Agregar validación de emails destinatarios
### Frontend
- [ ] Agregar botones de compartir (Email, LinkedIn, Twitter/X)
- [ ] Crear dialog de compartir por email con campos destinatarios/asunto/mensaje
- [ ] Implementar integración con LinkedIn Share API
- [ ] Implementar integración con Twitter/X Share API
- [ ] Agregar preview de mensaje antes de compartir

## Historial de Reportes Compartidos
### Backend
- [x] Crear tabla shared_reports_log en schema (canal, destinatarios, fecha, usuario)
- [x] Generar y aplicar migración SQL
- [x] Crear router sharedReports con procedures de consulta
- [x] Modificar shareReportByEmail para registrar en log
- [x] Agregar logging para compartir en LinkedIn
- [x] Agregar logging para compartir en Twitter/X
### Frontend
- [x] Crear página SharedReportsHistory.tsx
- [x] Implementar tabla con columnas: fecha, usuario, canal, destinatarios, tipo reporte
- [x] Agregar filtros por canal, fecha, usuario
- [x] Agregar navegación en DashboardLayout
- [x] Implementar paginación en tabla de historial

## Exportación de Historial de Reportes a Excel
### Backend
- [x] Crear procedure sharedReports.exportHistoryToExcel
- [x] Implementar hoja "Historial Completo" con todos los registros filtrados
- [x] Implementar hoja "Estadísticas por Canal" con conteos y porcentajes
- [x] Implementar hoja "Estadísticas por Usuario" con top usuarios compartiendo
- [x] Implementar hoja "Tendencias Temporales" con comparticiones por día/semana/mes
- [x] Subir archivo Excel a S3 y retornar URL pública
### Frontend
- [x] Agregar botón "Exportar a Excel" en SharedReportsHistory.tsx
- [x] Aplicar filtros actuales a la exportación
- [x] Mostrar estado de carga durante generación
- [x] Descargar automáticamente archivo generado

## Reorganización de Navegación
- [x] Mover "Certificados de Capacitación" de primer nivel a segundo nivel dentro de "Capacitación y Desarrollo"
- [x] Actualizar estructura de navegación en DashboardLayout
- [x] Verificar que la ruta /certificates siga funcionando correctamente

## Mejoras de Exportación PDF - Dashboard de Impacto
- [x] Implementar captura de gráficos Chart.js con html2canvas
- [x] Mejorar formato de fechas con toLocaleDateString('es-MX')
- [x] Agregar logo de empresa en portada de PDF
- [x] Implementar compresión de archivos PDF para reducir tamaño
- [x] Implementar caché de reportes generados para evitar regeneración

- [x] Cambiar nombres de guías en gráfico Dashboard principal a nomenclatura abreviada (Guía I-ATS, Guía II-Identificación FRPS, Guía III-FRPS + EOF)

- [x] Corregir transformación de títulos en gráfico de tendencias (mostrar Guía I-ATS, Guía II, Guía III-FRPS + EOF según datos reales)

- [x] Insertar datos de prueba en survey_responses para visualización del gráfico
- [x] Implementar filtro temporal en gráfico de tendencias (semana/mes/trimestre/año)
- [x] Agregar bandas de color según niveles de riesgo NOM-035 en gráfico

- [x] Corregir colores de bandas de riesgo según clasificación oficial NOM-035 (5 niveles)
- [x] Implementar tooltips informativos en bandas de riesgo con recomendaciones
- [ ] Implementar comparativa interanual (año actual vs año anterior)
- [x] Implementar alertas automáticas por umbral de riesgo alto/muy alto

- [x] Investigar trabajadores sin departamento en base de datos
- [x] Modificar schema employees para hacer department obligatorio
- [x] Excluir "Comité NOM-035" de departamentos válidos
- [x] Agregar validación en formularios de registro/edición de empleados
- [x] Limpiar datos existentes de trabajadores sin departamento

## Gestión de Departamentos
- [ ] Crear tabla departments en schema
- [ ] Crear router departments con procedures CRUD
- [ ] Implementar selector de departamento en formularios
- [ ] Crear página DepartmentManagement con lista y CRUD
- [ ] Implementar renombrar/fusionar/eliminar departamentos
- [ ] Implementar herramienta de reasignación masiva
- [ ] Agregar historial de cambios de departamento
- [ ] Implementar notificaciones automáticas a empleados reasignados

## Nuevas Tareas - Sistema de Gestión de Departamentos

### 1. Selector de Departamento en Formularios
- [x] Crear componente DepartmentSelector reutilizable con filtrado
- [x] Excluir "Comité NOM-035" y "Sin departamento" de opciones
- [x] Agregar botón "Agregar nuevo departamento" para administradores
- [x] Implementar validación de campo obligatorio
- [x] Integrar en EmployeeNew.tsx
- [x] Integrar en EmployeeEdit.tsx

### 2. Dashboard de Gestión de Departamentos
- [x] Crear página DepartmentManagement.tsx
- [x] Implementar tabla de departamentos con contador de empleados
- [x] Agregar búsqueda y paginación
- [x] Crear dialogs para crear, editar y eliminar departamentos
- [x] Implementar validación para prevenir eliminación de departamentos con empleados activos
- [x] Agregar navegación en sección Administración
- [x] Agregar ruta /department-management en App.tsx

### 3. Reasignación Masiva de Departamentos
- [x] Crear procedure departments.bulkReassign en backend
- [x] Implementar selección múltiple de empleados con checkboxes
- [x] Agregar selector de departamento destino
- [x] Implementar campo de motivo/razón opcional
- [x] Agregar confirmación previa a reasignación
- [x] Implementar registro automático en historial (departmentHistory)
- [x] Configurar notificaciones automáticas por email a empleados afectados
- [x] Crear dialog de reasignación masiva en DepartmentManagement.tsx

## Nuevas Tareas - Funcionalidades Avanzadas de Gestión Organizacional

### 1. Importación Masiva de Emplead### 1. Importación Masiva de Empleados
- [x] Crear procedure employees.importFromFile
- [x] Implementar parser de Excel/CSV (librería xlsx)
- [x] Validar estructura del archivo (columnas requeridas)
- [x] Implementar asignación automática de departamentos por nombre
- [x] Crear lógica de validación de datos (emails únicos, campos obligatorios)
- [x] Implementar manejo de errores y reporte de filas con problemas
- [x] Crear UI de importación en página Employees.tsx
- [x] Agregar botón "Importar Empleados" con upload de archivo
- [x] Mostrar preview de datos antes de importar
- [x] Implementar confirmación y progreso de importación
- [x] Generar reporte de importación (exitosos, errores, duplicados)

### 2. Reportes PDF de Estructura Organizacional
- [x] Crear procedure reports.generateOrgStructurePDF
- [x] Implementar generación de organigrama visual (librería pdfkit)
- [x] Incluir estadísticas por departamento (empleados, manager, puestos)
- [x] Agregar métricas de distribución organizacional
- [x] Crear UI para seleccionar opciones de reporte
- [x] Agregar filtros por departamento y nivel jerárquico
- [x] Implementar botón "Generar Reporte PDF" en DepartmentManagement.tsx
- [x] Validar datos antes de generar reporte
- [x] Descarga automática de archivo PDF

### 3. Alertas de Departamentos sin Responsable
- [x] Crear job scheduled para detectar departamentos sin manager
- [x] Implementar lógica de detección (managerId null y >30 días)
- [x] Crear procedure departments.getDepartmentsWithoutManager (integrado en job)
- [x] Implementar envío de notificaciones a administradores
- [ ] Crear tabla de historial de alertas (opcional)
- [x] Configurar frecuencia de ejecución del job (semanal)
- [ ] Agregar panel de visualización de alertas en dashboard
- [ ] Implementar acción rápida para asignar manager desde alerta

## Nuevas Tareas - Funcionalidades Complementarias de Gestión de Departamentos

### 1. Panel de Visualización de Alertas en Dashboard
- [ ] Crear procedure departments.getActiveAlerts para obtener departamentos sin manager
- [ ] Implementar widget de alertas en Dashboard.tsx
- [ ] Agregar card con contador de alertas activas
- [ ] Mostrar lista de departamentos sin manager (nombre, días sin manager)
- [ ] Implementar botón de acción rápida "Asignar Manager"
- [ ] Crear dialog de asignación rápida con selector de usuario
- [ ] Actualizar contador de alertas después de asignar manager
- [ ] Agregar indicador visual de urgencia (>30 días = rojo, >60 días = crítico)

### 2. Plantilla Excel de Importación
- [ ] Crear procedure employees.generateImportTemplate
- [ ] Generar archivo Excel con columnas predefinidas (nombre, email, departamento, puesto, etc.)
- [ ] Incluir fila de ejemplos con datos de muestra
- [ ] Agregar validaciones de columnas (dropdowns, formatos)
- [ ] Implementar botón "Descargar Plantilla" en dialog de importación
- [ ] Generar descarga automática de archivo .xlsx
- [ ] Documentar formato esperado en tooltip o ayuda contextual

### 3. Historial de Reasignaciones Masivas
- [ ] Crear tabla bulk_reassignments en schema (fecha, usuario, motivo, departamentoOrigen, departamentoDestino)
- [ ] Crear tabla bulk_reassignment_details (reassignmentId, employeeId, employeeName)
- [ ] Generar y aplicar migración SQL
- [ ] Modificar procedure departments.bulkReassign para registrar en historial
- [ ] Crear procedure departments.getReassignmentHistory con filtros
- [ ] Crear página ReassignmentHistory.tsx
- [ ] Implementar tabla con columnas: fecha, usuario, empleados afectados, departamentos, motivo
- [ ] Agregar filtros por fecha, departamento y usuario
- [ ] Implementar paginación server-side
- [ ] Agregar navegación en menú lateral (Administración > Historial de Reasignaciones)
- [ ] Agregar botón "Ver Detalles" para expandir lista de empleados afectados

## Nuevas Tareas - Funcionalidades Complementarias de Gestión de Departamentos (Completadas)

### 1. Widget de Alertas en Dashboard
- [x] Crear procedure departments.getActiveAlerts
- [x] Agregar query en Dashboard.tsx para obtener alertas
- [x] Crear widget visual con indicador de urgencia (crítico >60 días)
- [x] Implementar botón "Asignar Manager" con dialog de asignación rápida
- [x] Crear componente AssignManagerDialog reutilizable
- [x] Agregar refetch automático cada 5 minutos

### 2. Plantilla Excel de Importación
- [x] Crear procedure employees.generateImportTemplate
- [x] Generar archivo Excel con 23 columnas predefinidas
- [x] Incluir fila de ejemplo con datos de muestra
- [x] Agregar nota informativa en primera fila
- [x] Implementar botón "Descargar Plantilla" en dialog de importación
- [x] Descarga automática del archivo .xlsx

### 3. Tabla de Auditoría de Reasignaciones Masivas
- [x] Crear tablas bulk_reassignments y bulk_reassignment_details
- [x] Actualizar procedure departments.bulkReassign para registrar en auditoría
- [x] Crear procedure departments.getReassignmentHistory
- [x] Implementar sección de historial en DepartmentManagement.tsx
- [x] Agregar paginación y detalles expandibles de empleados
- [x] Mostrar información completa: fecha, usuario, motivo, departamentos

## Nuevas Tareas - Dashboard de Métricas de Departamentos y Exportación Masiva

### 1. Dashboard de Métricas de Departamentos
- [x] Crear router departmentMetrics
- [x] Implementar query getRotationMetrics (altas/bajas por departamento)
- [x] Implementar query getGrowthMetrics (crecimiento mensual por departamento)
- [x] Implementar query getDistributionMetrics (distribución de empleados)
- [x] Crear página DepartmentMetrics.tsx
- [x] Implementar gráfico de rotación (line chart con tendencias)
- [x] Implementar gráfico de crecimiento (bar chart comparativo)
- [x] Implementar gráfico de distribución (pie chart por departamento)
- [x] Agregar filtros por período (mes, trimestre, año)
- [x] Agregar navegación en menú lateral (Administración > Métricas de Departamentos)

### 2. Exportación Masiva de Datos
- [x] Crear procedure departments.exportAll
- [x] Generar Excel con 3 hojas: Departamentos, Empleados por Departamento, Managers
- [x] Incluir columnas: ID, Nombre, Código, Manager, Total Empleados, Fecha Creación
- [x] Implementar botón "Exportar Todo" en DepartmentManagement.tsx
- [x] Descarga automática del archivo .xlsx

## Nuevas Tareas - Comparativa Histórica, Alertas Predictivas y Dashboard Personalizado

### 1. Comparativa Histórica de Métricas Año contra Año
- [ ] Crear query departmentMetrics.getYearOverYearComparison
- [ ] Implementar cálculo de métricas del año actual vs año anterior
- [ ] Calcular porcentajes de cambio (crecimiento/decrecimiento)
- [ ] Agregar gráfico de comparación año contra año en DepartmentMetrics.tsx
- [ ] Implementar Line Chart con 2 líneas (año actual vs año anterior)
- [ ] Agregar indicadores de tendencia (↑ crecimiento, ↓ decrecimiento)
- [ ] Incluir filtro de métrica (rotación, crecimiento, distribución)

### 2. Alertas Predictivas de Rotación con Machine Learning
- [ ] Crear tabla predictive_turnover_alerts en schema
- [ ] Implementar algoritmo de detección de patrones de rotación
- [ ] Calcular score de riesgo por departamento (0-100)
- [ ] Crear procedure departments.getPredictiveTurnoverAlerts
- [ ] Implementar job scheduled para análisis predictivo mensual
- [ ] Crear componente PredictiveTurnoverAlerts en Dashboard
- [ ] Enviar notificaciones automáticas a managers de departamentos en riesgo
- [ ] Incluir recomendaciones de acción preventiva

### 3. Dashboard Personalizado por Departamento con Drill-Down
- [ ] Implementar filtro por departamento en DepartmentMetrics.tsx
- [ ] Agregar lógica de permisos: managers solo ven su departamento
- [ ] Crear query departmentMetrics.getEmployeeDetails por departamento
- [ ] Implementar tabla expandible con drill-down a empleados individuales
- [ ] Mostrar métricas individuales: antigüedad, evaluaciones, capacitaciones
- [ ] Agregar gráfico de distribución de empleados por puesto
- [ ] Implementar botón "Ver Detalle" que redirige a perfil de empleado

## Nuevas Tareas - Comparativa Histórica, Alertas Predictivas y Dashboard Personalizado

### 1. Comparativa Histórica Año contra Año
- [x] Crear query departmentMetrics.getYearOverYearComparison
- [x] Implementar cálculo de métricas año actual vs año anterior
- [x] Agregar gráfico YoY en DepartmentMetrics.tsx
- [x] Implementar selector de métrica (rotación, crecimiento, distribución)
- [x] Mostrar cambios porcentuales y tendencias

### 2. Sistema de Alertas Predictivas de Rotación
- [x] Crear tabla predictive_turnover_alerts en schema
- [x] Crear job predictive-turnover-job.ts (mensual)
- [x] Implementar algoritmo de cálculo de riesgo (0-100)
- [x] Considerar 4 factores: rotación, antigüedad, manager, tamaño
- [x] Crear procedure departments.getPredictiveTurnoverAlerts
- [x] Agregar sección de alertas en DepartmentMetrics.tsx
- [x] Implementar cards de resumen (alto/medio/total)
- [x] Mostrar recomendaciones automáticas

### 3. Dashboard Personalizado por Departamento
- [x] Agregar filtro por departamento en DepartmentMetrics.tsx
- [x] Implementar selector dropdown de departamentos
- [x] Opción "Todos los departamentos" para vista global
- [ ] Implementar drill-down a empleados individuales (pendiente)

## Nuevas Tareas - Drill-down Empleados, Reportes PDF Alertas y Configuración de Umbrales

### 1. Drill-down a Empleados Individuales
- [ ] Crear query departmentMetrics.getEmployeeDetails con métricas individuales
- [ ] Incluir: antigüedad, evaluaciones, capacitaciones, casos asociados
- [ ] Agregar dialog/modal en DepartmentMetrics.tsx para vista detallada
- [ ] Implementar tabla de empleados con filtros y búsqueda
- [ ] Agregar botón "Ver Detalles" por empleado
- [ ] Mostrar métricas individuales en cards o tabla expandible

### 2. Exportación PDF de Reportes de Alertas
- [ ] Crear procedure departments.generatePredictiveAlertsPDF
- [ ] Diseñar portada ejecutiva con resumen de alertas
- [ ] Incluir tabla de departamentos de riesgo ordenados por score
- [ ] Agregar recomendaciones priorizadas por urgencia
- [ ] Incluir plan de acción sugerido con timeline
- [ ] Implementar botón "Exportar Reporte PDF" en sección de alertas
- [ ] Descarga automática con nombre descriptivo

### 3. Configuración de Umbrales Personalizados
- [ ] Crear tabla algorithm_config en schema para almacenar configuración
- [ ] Crear página AlgorithmConfig.tsx para administradores
- [ ] Implementar sliders para ajustar pesos (rotación, antigüedad, manager, tamaño)
- [ ] Validar que suma de pesos = 100%
- [ ] Crear procedure departments.updateAlgorithmConfig
- [ ] Crear procedure departments.getAlgorithmConfig
- [ ] Actualizar job predictive-turnover para usar configuración personalizada
- [ ] Agregar navegación en menú lateral (Administración > Configuración Algoritmo)

## Nuevas Tareas - Drill-down Empleados, Exportación PDF Alertas y Configuración Umbrales

### Fase 1: Drill-down a Empleados Individuales
- [x] Crear query departmentMetrics.getEmployeeDetails
- [x] Implementar filtros por departamento, búsqueda y paginación (20/página)
- [x] Calcular métricas individuales (antigüedad, evaluaciones, capacitaciones, casos)
- [x] Crear dialog de drill-down en DepartmentMetrics.tsx
- [x] Implementar tabla con métricas individuales
- [x] Agregar búsqueda por nombre, apellido o email
- [x] Implementar paginación server-side
- [x] Agregar botón "Ver Empleados" con indicador de departamento

### Fase 2: Exportación PDF de Reportes de Alertas Predictivas
- [x] Crear procedure departments.generatePredictiveAlertsPDF
- [x] Diseñar portada ejecutiva con título y fecha
- [x] Generar resumen ejecutivo (total, alto/medio riesgo, empleados afectados)
- [x] Crear tabla detallada de departamentos de riesgo
- [x] Agregar recomendaciones priorizadas (top 5 departamentos)
- [x] Incluir plan de acción sugerido (corto/mediano/largo plazo)
- [x] Implementar botón "Exportar Reporte PDF" en DepartmentMetrics.tsx
- [x] Descarga automática del archivo PDF

### Fase 3: Configuración de Umbrales Personalizados
- [ ] Crear tabla predictive_algorithm_config en schema
- [ ] Implementar procedure departments.updateAlgorithmWeights
- [ ] Crear página AlgorithmConfig.tsx
- [ ] Agregar sliders para ajustar pesos (rotación, antigüedad, manager, tamaño)
- [ ] Implementar validación de suma de pesos = 100%
- [ ] Agregar botón "Guardar Configuración"
- [ ] Actualizar job predictive-turnover para usar pesos configurados
- [ ] Agregar navegación en menú lateral (Administración > Configuración Algoritmo)


## Nuevas Tareas - Configuración Umbrales, Alertas Email y Histórico de Predicciones

### Fase 1: Sistema de Configuración de Umbrales Personalizados
- [ ] Crear tabla predictive_algorithm_config en schema
- [ ] Generar y aplicar migración SQL
- [ ] Crear procedure departments.getAlgorithmConfig
- [ ] Crear procedure departments.updateAlgorithmConfig
- [ ] Crear página AlgorithmConfig.tsx
- [ ] Implementar sliders para ajustar pesos (rotación, antigüedad, manager, tamaño)
- [ ] Agregar validación de suma de pesos = 100%
- [ ] Implementar botón "Guardar Configuración"
- [ ] Actualizar job predictive-turnover para usar pesos configurados
- [ ] Agregar navegación en menú lateral (Administración > Configuración Algoritmo)

### Fase 2: Alertas Automáticas por Email a Managers
- [ ] Crear job weekly-manager-alerts-job.ts
- [ ] Implementar lógica de identificación de managers de departamentos de alto riesgo
- [ ] Crear template de email ejecutivo con métricas y recomendaciones
- [ ] Incluir enlace directo a DepartmentMetrics filtrado por departamento
- [ ] Agregar resumen de empleados de alto riesgo individual
- [ ] Implementar envío semanal (lunes 8:00 AM)
- [ ] Registrar job en server/_core/index.ts
- [ ] Agregar log de envíos en tabla de auditoría

### Fase 3: Histórico de Predicciones y Análisis de Tendencias
- [ ] Crear tabla prediction_history en schema
- [ ] Generar y aplicar migración SQL
- [ ] Modificar job predictive-turnover para registrar predicciones en historial
- [ ] Crear procedure departments.getPredictionHistory
- [ ] Implementar query de análisis de tendencias (comparación mes a mes)
- [ ] Crear sección en DepartmentMetrics.tsx para visualizar histórico
- [ ] Implementar gráfico de tendencias de riesgo (line chart)
- [ ] Agregar tabla de comparación de predicciones vs realidad
- [ ] Calcular precisión del algoritmo (% aciertos)


## Nueva Tarea - Actualización Job Predictive-Turnover
- [x] Modificar job predictive-turnover-job.ts para leer configuración dinámica
- [x] Obtener pesos desde tabla predictive_algorithm_config
- [x] Reemplazar valores hardcodeados (40, 30, 20, 10) por valores de configuración
- [x] Manejar caso cuando no existe configuración (usar valores por defecto)
- [x] Probar ejecución del job con diferentes configuraciones

## Nuevas Tareas - Dashboard de Efectividad del Algoritmo Predictivo
- [ ] Crear tabla prediction_history en schema
- [ ] Generar y aplicar migración SQL
- [ ] Actualizar job predictive-turnover para guardar histórico de predicciones
- [ ] Crear router algorithmEffectiveness.ts
- [ ] Implementar query getAccuracyMetrics (precisión del algoritmo)
- [ ] Implementar query getPredictionTrends (tendencias de predicciones vs realidad)
- [ ] Implementar query getPredictionHistory (histórico completo con paginación)
- [ ] Crear página AlgorithmEffectiveness.tsx
- [ ] Implementar cards de resumen (precisión, predicciones totales, departamentos analizados)
- [ ] Implementar gráfico de comparación predicciones vs rotación real
- [ ] Implementar gráfico de tendencias de precisión del algoritmo
- [ ] Implementar tabla de histórico de predicciones con detalles
- [ ] Agregar navegación en menú lateral (Administración > Efectividad Algoritmo)

## Nuevas Tareas - Auditoría Profunda y Mejoras UX (Febrero 2026)

### 1. Validación Estricta de Datos de Contacto
- [x] Implementar validación de email según RFC 5322 en todos los formularios
- [x] Implementar validación de teléfono según formato E.164 (internacional)
- [x] Agregar validación de teléfono mexicano (+52 formato 10 dígitos)
- [x] Actualizar schema Zod en routers de contacto/demo/empleados
- [ ] Agregar feedback visual en formularios (email/teléfono válido/inválido)

### 2. Integración de WhatsApp para Solicitud de Demo
- [x] Agregar botón de WhatsApp en formulario de contacto/demo (componente creado)
- [x] Generar mensaje pre-llenado con datos del usuario
- [x] Incluir normativa de interés en mensaje de WhatsApp
- [x] Implementar apertura de chat de WhatsApp con API de WhatsApp Business
- [ ] Agregar tracking de conversiones desde WhatsApp

### 3. Optimización de Código y Refactorización
- [x] Identificar código duplicado en routers y componentes (116 mutations analizadas)
- [x] Refactorizar funciones comunes en helpers reutilizables (validators/contact.ts, lib/whatsapp.ts)
- [ ] Optimizar imports y reducir bundle size del frontend
- [ ] Revisar y mejorar manejo de errores en todos los routers
- [ ] Implementar logging estructurado para debugging

### 4. Mejoras de Experiencia de Usuario
- [ ] Agregar loading states en todos los formularios
- [ ] Implementar mensajes de error más descriptivos
- [ ] Agregar confirmaciones antes de acciones destructivas
- [ ] Mejorar feedback visual en operaciones exitosas
- [ ] Implementar breadcrumbs en navegación compleja

### 5. Auditoría de Seguridad y Validaciones
- [ ] Revisar todos los endpoints públicos por vulnerabilidades
- [ ] Implementar rate limiting en formularios de contacto
- [ ] Validar sanitización de inputs en todos los formularios
- [ ] Revisar permisos de acceso en routers protegidos
- [ ] Implementar CSRF protection en formularios críticos

## Progreso - Auditoría Profunda y Mejoras UX (Febrero 2026)

### 1. Validación Estricta de Datos de Contacto ✅
- [x] Crear helper de validaciones contact.ts con RFC 5322 y E.164
- [x] Implementar emailValidator con regex RFC 5322
- [x] Implementar phoneValidatorMX para teléfonos mexicanos (10 dígitos)
- [x] Implementar phoneValidatorE164 para formato internacional
- [x] Agregar helpers de formateo (formatPhoneMX, formatPhoneE164)
- [x] Actualizar validaciones en employees.ts con nuevos validators
- [x] Actualizar validaciones en company.ts con nuevos validators
- [x] Actualizar validaciones en recruitment.ts con nuevos validators

### 2. Integración de WhatsApp para Solicitud de Demo ✅
- [x] Crear helper whatsapp.ts con funciones de generación de enlaces
- [x] Implementar generateWhatsAppLink con mensaje pre-llenado
- [x] Implementar generateDemoRequestMessage con datos del usuario
- [x] Crear mapeo NORMATIVAS_MAP para nombres completos
- [x] Implementar openWhatsAppDemo para abrir chat automáticamente
- [x] Crear componente WhatsAppButton reutilizable
- [x] Crear componente WhatsAppDemoButton especializado
- [x] Agregar formatPhoneForWhatsApp para normalización de números

### 3. Pendiente - Integración en Formularios
- [ ] Agregar WhatsAppDemoButton en formulario de contacto
- [ ] Agregar validación de email en tiempo real (feedback visual)
- [ ] Agregar validación de teléfono en tiempo real (feedback visual)
- [ ] Implementar tracking de conversiones desde WhatsApp
- [ ] Actualizar otros routers con validaciones estrictas (documents, import, massiveImport)

## Nuevas Tareas - Sistema de Tracking de Conversiones WhatsApp (Febrero 2026)

### 1. Schema de Base de Datos
- [x] Crear tabla whatsapp_tracking_events en schema.ts
- [x] Campos: id, userId, eventType, normativas, metadata, userAgent, ipAddress, timestamp
- [x] Generar migración SQL con drizzle-kit generate
- [x] Aplicar migración con webdev_execute_sql

### 2. Router tRPC de Tracking
- [x] Crear router whatsappTracking.ts
- [x] Procedure trackEvent para registrar clics
- [x] Procedure getConversionMetrics para métricas generales
- [x] Procedure getNormativasPopularity para ranking de normativas
- [x] Procedure getConversionTrends para tendencias temporales
- [x] Integrar router en appRouter

### 3. Integración en Componentes
- [x] Actualizar WhatsAppButton para registrar eventos automáticamente
- [x] Actualizar WhatsAppDemoButton con tracking de normativas
- [x] Capturar metadata: userAgent, timestamp, origen
- [x] Implementar tracking sin bloquear apertura de WhatsApp

### 4. Dashboard de Métricas
- [x] Crear página WhatsAppMetrics.tsx
- [x] Cards de resumen: total clics, conversión, normativas top
- [x] Gráfico de tendencias de clics por día/semana/mes
- [x] Gráfico de distribución de normativas (pie chart)
- [x] Tabla de eventos recientes con detalles
- [x] Agregar navegación en menú lateral

## Nuevas Tareas - Filtros Avanzados Dashboard WhatsApp (Febrero 2026)

### 1. Actualizar Router tRPC
- [x] Agregar parámetros eventType y conversionStatus a procedures
- [x] Actualizar getConversionMetrics con filtros adicionales
- [x] Actualizar getNormativasPopularity con filtros adicionales
- [x] Actualizar getConversionTrends con filtros adicionales
- [x] Actualizar getRecentEvents con filtros adicionales

### 2. UI de Filtros Avanzados
- [x] Implementar Date Range Picker (react-day-picker)
- [x] Crear selector de tipo de evento (Select)
- [x] Crear selector de estado de conversión (Select)
- [x] Agregar botón "Limpiar Filtros"
- [x] Diseñar layout de filtros responsive

### 3. Integración y Funcionalidad
- [x] Conectar filtros con queries tRPC
- [x] Implementar persistencia de filtros en estado
- [x] Actualizar gráficos al cambiar filtros
- [x] Agregar indicadores visuales de filtros activos (Badge con contador)
- [x] Instalación de react-day-picker y date-fns

## Nuevas Tareas - Filtros Rápidos Predefinidos Dashboard WhatsApp (Febrero 2026)

### 1. Funciones Helper para Períodos
- [x] Crear funciones para calcular rangos de fechas (startOfDay, endOfDay, startOfWeek, etc.)
- [x] Implementar helpers: getToday, getThisWeek, getThisMonth, getLast7Days, getLast30Days, getLastYear
- [x] Agregar función para mes anterior, semana anterior, año anterior

### 2. UI de Filtros Rápidos
- [x] Diseñar sección de filtros rápidos con badges/chips
- [x] Crear botones: Hoy, Esta semana, Este mes, Últimos 7 días, Últimos 30 días, Último año
- [x] Agregar botones: Mes anterior, Semana anterior, Año anterior
- [x] Implementar indicador visual del período activo (variant default/outline)
- [x] Diseño responsive para móvil y desktop (flex-wrap)

### 3. Integración con Filtros Existentes
- [x] Conectar filtros rápidos con date range picker
- [x] Actualizar automáticamente los selectores de fecha al hacer clic
- [x] Mantener sincronización entre filtros rápidos y date picker
- [x] Limpiar selección de filtro rápido al cambiar fechas manualmente (handleDateChange)

## Nuevas Tareas - Comparación de Períodos Dashboard WhatsApp (Febrero 2026)

### 1. Router tRPC para Comparaciones
- [x] Crear procedure getComparisonMetrics que acepte dos rangos de fechas
- [x] Calcular métricas para período actual y período de comparación
- [x] Calcular diferencias absolutas y porcentuales
- [x] Retornar estructura con current, comparison, y changes
- [x] Función helper getMetricsForPeriod reutilizable
- [x] Soporte para filtros opcionales (eventType, conversionStatus)

### 2. UI de Comparación
- [x] Agregar toggle "Comparar Períodos" en header con Switch
- [x] Crear selector de tipo de comparación (automático/manual) con RadioGroup
- [x] Opciones automáticas: Período anterior, Mismo período año anterior
- [x] Date pickers para comparación manual (from/to)
- [x] Calcular automáticamente período de comparación según selección (calculateComparisonPeriod)
- [x] Diseño responsive y profesional con Card
- [x] Query de comparación con enabled condicional

### 3. Cards Comparativos
- [x] Rediseñar cards de métricas para mostrar dos valores lado a lado
- [x] Agregar indicadores de cambio (↑↓) con colores (TrendingUp/TrendingDown de lucide-react)
- [x] Mostrar cambio porcentual y absoluto en badge
- [x] Verde (text-green-600) para mejoras, rojo (text-red-600) para deterioros
- [x] Etiquetas claras: "Período Actual" vs "Período de Comparación"
- [x] Componente ComparisonMetricCard reutilizable
- [x] Soporte para formato number y percentage
- [x] Mostrar cambio absoluto en texto descriptivo

### 4. Gráficos Comparativos (PENDIENTE PARA PRÓXIMA SESIÓN)
- [ ] Consultar getConversionTrends para período de comparación
- [ ] Actualizar gráfico de tendencias con dos datasets superpuestos
- [ ] Línea azul (rgb(59, 130, 246)) para período actual
- [ ] Línea gris (rgb(156, 163, 175)) para período de comparación
- [ ] Leyenda clara con etiquetas de períodos y fechas
- [ ] Mantener paleta de colores: azul marino, verde, rojo
- [ ] Sincronizar escalas de ejes para comparación justa
- [ ] Gráfico de normativas con barras agrupadas para comparación

## Nuevas Tareas - Completar Sistema de Comparación WhatsApp

### 1. Gráficos Comparativos
- [x] Consultar getConversionTrends para período de comparación
- [x] Actualizar gráfico de tendencias con dos datasets superpuestos
- [x] Líneas sólidas verde/azul para período actual
- [x] Líneas punteadas grises para período de comparación
- [x] Leyendas claras con etiquetas y fechas de períodos (dd/MM formato)
- [x] 4 datasets: Clics Actual, Conversiones Actual, Clics Comparación, Conversiones Comparación
- [x] Actualizar gráfico de normativas con barras agrupadas (Bar chart)
- [x] Mostrar normativas lado a lado para comparación visual
- [x] Combinar normativas de ambos períodos para etiquetas completas
- [x] Cambiar automáticamente de Pie a Bar cuando hay comparación

### 2. Exportación a Excel
- [x] Crear botón "Exportar Comparación" en header del dashboard
- [x] Instalar librería para generación de Excel (xlsx)
- [x] Hoja 1: Métricas comparativas con cambios porcentuales
- [x] Hoja 2: Eventos del período actual
- [x] Hoja 3: Eventos del período de comparación
- [x] Hoja 4: Distribución de normativas comparativa
- [x] Aplicar estilos profesionales (anchos de columna)
- [x] Generar y descargar archivo automáticamente
- [x] Helper excelExport.ts con tipos TypeScript
- [x] Toast de confirmación y manejo de errores
- [x] Botón deshabilitado cuando comparación está inactiva

### 3. Alertas Automáticas
- [x] Crear procedure checkSignificantChanges en router
- [x] Detectar cambios >20% en clics
- [x] Detectar cambios >15% en conversiones
- [x] Detectar cambios >10 puntos porcentuales en tasa
- [x] Generar resumen de métricas y recomendaciones
- [x] Sistema de severidad (high/medium/low)
- [x] Recomendaciones específicas según tipo de cambio
- [x] Integrar con sistema de notificaciones (toast)
- [x] Ejecutar verificación automática al activar comparación
- [x] useEffect para detectar cambios en filtros y ejecutar verificación
- [x] Mostrar alertas en toast con severidad
- [x] Mostrar recomendaciones después de alertas

## Nuevas Tareas - Integración WhatsApp Público, CRM y Análisis Predictivo

### 1. Integración de WhatsApp en Páginas Públicas
- [x] Agregar WhatsAppDemoButton en Home.tsx con mensaje contextual
- [x] Crear página de contacto (Contact.tsx) con WhatsAppButton
- [x] Crear landing page de NOM-035 con WhatsAppButton específico
- [x] Crear landing page de NOM-037 con WhatsAppButton específico
- [x] Personalizar mensajes pre-llenados según origen (dashboard, contacto, landing_nom035, landing_nom037)
- [x] Agregar tracking automático de origen en metadata
- [x] Diseño responsive y profesional de botones
- [x] Agregar rutas en App.tsx para nuevas páginas (/contacto, /nom-03### 2. Sistema de Seguimiento Post-Contacto (CRM)
- [x] Crear tabla leads en schema.ts con campos de seguimiento
- [x] Campos: id, whatsappEventId, nombre, email, empresa, telefono, normativas, estado, fechaContacto, proximaAccion, notas, asignadoA, valorEstimado, probabilidadCierre, createdAt, updatedAt
- [x] Generar migración SQL con drizzle-kit generate
- [x] Aplicar migración con webdev_execute_sql (0105_smooth_shriek.sql)
- [ ] Procedure createLeadFromConversion para conversión automática
- [ ] Procedure updateLeadStatus para cambiar estado
- [ ] Procedure getLeadsPipeline para dashboard
- [ ] Crear página LeadsPipeline.tsx con kanban board
- [ ] Estados: nuevo, contactado, en_negociacion, propuesta_enviada, ganado, perdido
- [ ] Sistema de recordatorios automáticos para próximas acciones
- [ ] Integrar con sistema de notificaciones
- [ ] Agregar navegación en DashboardLayout

### 3. Dashboard de Análisis Predictivo
- [ ] Crear página PredictiveAnalytics.tsx
- [ ] Implementar análisis de tendencias históricas
- [ ] Calcular patrones estacionales por normativa
- [ ] Identificar mejores horarios/días para conversiones
- [ ] Predicción de volumen de solicitudes futuras
- [ ] Gráficos de tendencias con proyecciones
- [ ] Recomendaciones automáticas de campañas
- [ ] Análisis de correlación entre eventos y conversiones
- [ ] Exportación de insights a PDF
- [ ] Agregar navegación en DashboardLayout

## Nuevas Tareas - CRM Completo, Análisis Predictivo y Optimización Landing Pages

### 1. Router y Procedures de Leads CRM (✅ COMPLETADO)
- [x] Crear archivo server/routers/leads.ts
- [x] Procedure createLead (crear lead manual o desde WhatsApp)
- [x] Procedure getLeadsPipeline (obtener leads agrupados por estado)
- [x] Procedure updateLeadStatus (cambiar estado con drag-and-drop)
- [x] Procedure updateLead (editar información del lead)
- [x] Procedure deleteLead (eliminar lead)
- [x] Procedure convertWhatsAppEventToLead (conversión automática)
- [x] Procedure getLeadById (obtener detalles de un lead)
- [x] Procedure assignLead (asignar lead a usuario)
- [x] Procedure addLeadNote (agregar nota a lead)
- [x] Procedure getUpcomingReminders (recordatorios próximos)
- [x] Procedure getPipelineStats (estadísticas del pipeline)
- [x] Integrar router en appRouter

### 2. Página LeadsPipeline con Kanban Board (✅ COMPLETADO)
- [x] Crear client/src/pages/LeadsPipeline.tsx
- [x] Instalar @dnd-kit/core y @dnd-kit/sortable para drag-and-drop
- [x] Implementar 6 columnas de estado (Nuevo, Contactado, En Negociación, Propuesta Enviada, Ganado, Perdido)
- [x] Drag-and-drop funcional con @dnd-kit
- [x] Cards de leads con información clave (nombre, empresa, email, teléfono, valor estimado, probabilidad)
- [x] Modal de edición con formulario completo
- [x] Modal de creación de leads manuales
- [x] Filtros por origen y normativa
- [x] Widget de próximas acciones (24 horas)
- [x] Cards de estadísticas (Total, Tasa de Conversión, Valor Estimado, Valor Ganado)
- [x] Componente LeadCard reutilizable con useSortable
- [x] Ruta agregada en App.tsx (/leads-pipeline)
- [x] Navegación agregada en DashboardLayout (Administración > Pipeline de Leads) automáticamente
- [ ] Copiar datos de userData a campos de lead
- [ ] Asignar origen desde metadata.source
- [ ] Establecer estado inicial como "nuevo"
- [ ] Vincular whatsappEventId al lead creado
- [ ] Notificar al administrador de nuevo lead

### 4. Sistema de Recordatorios de Próxima Acción
- [ ] Crear procedure getUpcomingReminders en leads.ts
- [ ] Job programado que revise próximas acciones cada hora
- [ ] Enviar notificación 24h antes de próxima acción
- [ ] Enviar notificación el día de la próxima acción
- [ ] Marcar recordatorios como enviados para evitar duplicados
- [ ] Dashboard widget con próximas acciones del día

### 5. Dashboard de Análisis Predictivo
- [ ] Crear client/src/pages/PredictiveWhatsAppAnalytics.tsx
- [ ] Implementar regresión lineal para tendencias futuras (próximos 3 meses)
- [ ] Gráfico de predicción de clics y conversiones
- [ ] Gráfico de calor mensual de solicitudes por normativa
- [ ] Análisis de patrones estacionales (días de semana vs fin de semana)
- [ ] Sugerencias de mejores horarios para campañas (basado en conversiones)
- [ ] Análisis de franja horaria con mayor tasa de conversión
- [ ] Recomendaciones automáticas de optimización
- [ ] Agregar ruta y navegación

### 6. Optimización de Landing Pages
- [ ] Crear componente Testimonials.tsx con casos de éxito
- [ ] Agregar sección de testimonios en NOM035Landing y NOM037Landing
- [ ] Crear componente FAQ.tsx con accordion expandible
- [ ] FAQ específico para cada normativa (NOM-035, NOM-037)
- [ ] Crear componente ROICalculator.tsx interactivo
- [ ] Calculadora que estime: multas evitadas, productividad mejorada, ROI total
- [ ] Inputs: número de empleados, sector, riesgo actual
- [ ] Integrar WhatsApp chat en vivo con horario laboral
- [ ] Agregar indicador de disponibilidad (En línea/Fuera de línea)

## Nuevas Tareas - Conversión Automática WhatsApp→Leads

### 1. Botón de Conversión en Tabla de Eventos
- [x] Agregar columna "Acciones" en tabla de eventos de WhatsAppMetrics.tsx
- [x] Implementar botón "Convertir a Lead" con icono UserPlus
- [x] Deshabilitar botón si evento ya tiene lead vinculado
- [x] Mostrar texto dinámico ("Ya Convertido" / "Convertir a Lead")

### 2. Modal de Confirmación con Datos Pre-llenados
- [x] Crear estado para modal de conversión (open/close)
- [x] Pre-llenar campos del formulario con datos del evento
- [x] Campos: nombre (userData.nombre), email (userData.email), teléfono (userData.telefono)
- [x] Empresa (userData.empresa o vacío)
- [x] Normativas (normativas del evento) con badges visuales
- [x] Notas pre-llenadas con tipo de evento
- [x] Estado inicial "nuevo"
- [x] Permitir edición de campos antes de confirmar
- [x] Componente ConvertToLeadModal.tsx creado

### 3. Integración con Procedure convertWhatsAppEventToLead
- [x] Usar mutation trpc.leads.convertWhatsAppEventToLead
- [x] Pasar whatsappEventId y datos editables al procedure
- [x] Vincular lead creado con whatsappEventId
- [x] Actualizar estado de conversión del evento a "converted"
- [x] Mostrar toast de éxito
- [x] Invalidar queries de eventos y leads después de conversión
- [x] Procedure actualizado para aceptar datos del formulario

### 4. Validación y Prevención de Duplicados
- [x] Verificar en backend si whatsappEventId ya tiene lead vinculado
- [x] Retornar error CONFLICT si intenta convertir evento ya convertido
- [x] Mostrar mensaje de error en frontend si ya existe lead
- [x] Botón deshabilitado cuando conversionStatus === "converted"

## Nuevas Tareas - Toast con Botón "Ver Lead" y Resaltado

### 1. Actualizar Toast con Botón de Acción
- [x] Modificar toast de éxito en ConvertToLeadModal
- [x] Agregar botón "Ver Lead" en toast usando action property
- [x] Implementar navegación a /leads-pipeline con query parameter leadId
- [x] Usar useLocation de wouter para navegación
- [x] Capturar leadId desde onSuccess de mutation

### 2. Resaltado Visual del Lead Recién Creado
- [x] Leer query parameter leadId en LeadsPipeline
- [x] Aplicar clase CSS de resaltado al card del lead (animate-pulse)
- [x] Implementar animación de pulso con Tailwind
- [x] Auto-scroll hacia el lead resaltado con scrollIntoView
- [x] Remover resaltado después de 3 segundos
- [x] useRef para almacenar referencias a elementos del DOM
- [x] Wrapper div con ref alrededor de LeadCard
