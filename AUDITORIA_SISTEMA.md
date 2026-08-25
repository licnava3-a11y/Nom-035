# Reporte de Auditoría Profunda del Sistema NOM-035 STPS

**Fecha:** 6 de Marzo 2026 | **Checkpoint base:** 37696a3b | **Versión:** 2.0

---

## RESUMEN EJECUTIVO

| Categoría                       | Total   | Críticos     | Altos        | Medios    | Bajos       |
| ------------------------------- | ------- | ------------ | ------------ | --------- | ----------- |
| Errores TypeScript              | 778     | 38 (TS18047) | 308 (TS2339) | 138 otros | 294 menores |
| SelectItem vacíos (removeChild) | 14      | 14           | 0            | 0         | 0           |
| Rutas 404 (Dashboard→App)       | 22      | 8            | 14           | 0         | 0           |
| Rutas duplicadas en App.tsx     | 1       | 1            | 0            | 0         | 0           |
| Archivos obsoletos              | 4       | 0            | 2            | 2         | 0           |
| Routers duplicados              | 3 pares | 0            | 3            | 0         | 0           |
| Procedures sin Zod              | ~164    | 0            | 0            | 164       | 0           |
| parseInt sin validación         | 20+     | 0            | 5            | 15        | 0           |
| Páginas sin ruta                | 2       | 0            | 1            | 1         | 0           |

---

## 🔴 CRÍTICO — Bloquean funcionalidad o causan crashes

### C-01: Error removeChild en /root-cause-analysis y /skills-matrix

- **Estado:** ✅ CORREGIDO en checkpoint 37696a3b
- **Archivos:** `RootCauseAnalysis.tsx`, `SkillsMatrix.tsx`, `CasesManagement.tsx`
- **Causa:** `parseInt("all")` retorna NaN en filtros de Select
- **Impacto:** Crash completo de la página al usar filtros

### C-02: 14 SelectItem con value="" (causa removeChild en producción)

- **Archivos afectados:**
  - `ReportsHistory.tsx` (1 instancia)
  - `SignatureAudit.tsx` (4 instancias)
  - `TokenManagement.tsx` (1 instancia)
  - `Users.tsx` (2 instancias)
  - `notifications/NotificationHistory.tsx` (3 instancias)
  - `surveys/SurveyAdmin.tsx` (1 instancia)
  - `talent/NineBoxGrid.tsx` (2 instancias)
- **Causa:** shadcn/ui Select no permite `value=""` vacío
- **Solución:** Cambiar `value=""` → `value="all"` y actualizar lógica de filtros
- **Impacto:** Error removeChild al seleccionar "Todos" en filtros

### C-03: Ruta duplicada /cases/assignment en App.tsx

- **Archivo:** `client/src/App.tsx` líneas 405 y 854
- **Causa:** Ruta registrada dos veces con diferentes componentes
- **Solución:** Eliminar la ruta duplicada (línea 854)
- **Impacto:** Comportamiento impredecible en navegación

### C-04: 38 errores TS18047 (db possibly null) — Runtime crashes

- **Archivos más afectados:**
  - `departments.ts` (51 errores totales)
  - `departmentMetrics.ts` (39 errores)
  - `committeeOperatingRules.ts` (32 errores)
  - `predictiveTurnoverDashboard.ts` (20 errores)
  - `predictiveAnalytics.ts` (20 errores)
  - `performanceEvaluation360.ts` (18 errores)
  - `executiveDashboard.ts` (16 errores)
  - `careerPlanning.ts` (17 errores)
  - `salaryEquity.ts` (12 errores)
  - `riskAlerts.ts` (11 errores)
  - `interventions.ts` (11 errores)
- **Causa:** `const db = await getDb()` puede retornar null sin validación
- **Solución:** Agregar `if (!db) throw new Error('DB unavailable')` después de cada `getDb()`
- **Impacto:** Crash en runtime cuando la BD no está disponible

### C-05: Dashboard de Casos muestra 0 (debe mostrar 94 abiertos + 47 resueltos)

- **Archivo:** `Dashboard.tsx`, `server/routers.ts` línea 471
- **Causa:** Procedure `cases.list` usa `committeeProcedure` que requiere permisos específicos
- **Solución:** Verificar rol del usuario y datos en tabla `cases`; considerar usar `protectedProcedure` para el conteo general
- **Impacto:** Dashboard principal sin datos de casos

---

## 🟠 ALTO — Afectan funcionalidad importante

### A-01: 22 Rutas en DashboardLayout sin ruta en App.tsx (páginas 404)

| Ruta en Dashboard             | Solución                                               |
| ----------------------------- | ------------------------------------------------------ |
| `/admin/import`               | Agregar ruta → `MassiveImport.tsx`                     |
| `/alerts`                     | Agregar ruta → `AlertsDashboard.tsx`                   |
| `/company`                    | Agregar ruta → crear página Company                    |
| `/competencies-manager`       | Agregar ruta → `OrganizationalCompetenciesManager.tsx` |
| `/competency-evaluation`      | Agregar ruta → `EmployeeCompetencyEvaluation.tsx`      |
| `/compliance/numerals`        | Agregar ruta → `NumeralsVerification.tsx`              |
| `/compliance/reports-history` | Agregar ruta → `ReportsHistory.tsx`                    |
| `/courses`                    | Agregar ruta → `Courses.tsx`                           |
| `/employees/turnover`         | Agregar ruta → `EmployeeTermination.tsx`               |
| `/executive-reports`          | Corregir path (falta `/`) → `/executive-reports`       |
| `/nom035/questionnaire`       | Agregar ruta → `NOM035Questionnaire.tsx`               |
| `/notifications/history`      | Agregar ruta → `NotificationsHistory.tsx`              |
| `/organization/changes`       | Agregar ruta → `OrganizationalChanges.tsx`             |
| `/organization/chart`         | Agregar ruta → `OrganizationChart.tsx`                 |
| `/organization/dashboard`     | Agregar ruta → `OrganizationDashboard.tsx`             |
| `/reports/regulatory`         | Agregar ruta → `RegulatoryReports.tsx`                 |
| `/surveys/nom035-admin`       | Agregar ruta → `Nom035AdminPanel.tsx`                  |
| `/surveys/periods`            | Agregar ruta → `SurveyPeriodsManager.tsx`              |
| `/surveys/token-management`   | Agregar ruta → `TokenManagement.tsx`                   |
| `/surveys/tokens-dashboard`   | Agregar ruta → `SurveysAdminPanel.tsx`                 |
| `/alert-history` (duplicada)  | Consolidar en una sola entrada                         |

### A-02: 308 errores TS2339 (Property does not exist on type)

- **Archivos más afectados:** `departments.ts` (51), `departmentMetrics.ts` (39), `DepartmentMetrics.tsx` (35), `WhatsAppMetrics.tsx` (25), `RetentionConsolidatedDashboard.tsx` (24)
- **Causa:** Tipos de Drizzle ORM no coinciden con propiedades accedidas en resultados de queries
- **Solución:** Corregir tipos en queries y resultados de Drizzle, usar `as` casting donde sea necesario

### A-03: Routers duplicados (funcionalidad fragmentada)

| Par duplicado                               | Más completo                       | Obsoleto                 | Acción             |
| ------------------------------------------- | ---------------------------------- | ------------------------ | ------------------ |
| `evidenceFolder.ts` vs `evidencesFolder.ts` | `evidenceFolder.ts` (8 procedures) | `evidencesFolder.ts` (4) | Eliminar obsoleto  |
| `nineBox.ts` vs `nineBoxGrid.ts`            | `nineBox.ts` (16 procedures)       | `nineBoxGrid.ts` (7)     | Eliminar obsoleto  |
| `notifications.ts` vs `notifications.tsx`   | `notifications.tsx` (9 procedures) | `notifications.ts` (6)   | Renombrar .tsx→.ts |

### A-04: Archivos obsoletos en producción

| Archivo                                                | Tipo                           | Acción               |
| ------------------------------------------------------ | ------------------------------ | -------------------- |
| `server/routers/compliance.ts.backup`                  | Backup en producción           | Eliminar             |
| `client/src/pages/NotificationsDashboard.tsx.disabled` | Deshabilitado                  | Eliminar o habilitar |
| `server/routers/notifications.tsx`                     | Extensión incorrecta en server | Renombrar a .ts      |

### A-05: 20+ parseInt(value) sin validación de "all" (potenciales removeChild)

| Archivo                        | Línea    | Solución                                        |
| ------------------------------ | -------- | ----------------------------------------------- |
| `BenchmarkingDashboard.tsx`    | 174      | `value === "all" ? undefined : parseInt(value)` |
| `PerformanceEvaluation360.tsx` | 199      | `value === "all" ? undefined : parseInt(value)` |
| `RegulatoryReports.tsx`        | 117, 176 | Agregar validación                              |
| `RiskAnalysis.tsx`             | 102, 135 | Agregar validación                              |
| `SurveySend.tsx`               | 168      | Agregar validación                              |
| `JobProfileManagement.tsx`     | 89       | Agregar validación                              |
| `NOM035Questionnaire.tsx`      | 140      | Agregar validación                              |

### A-06: Rutas sin prefijo "/" en App.tsx

- `executive-reports` (línea 980) → debe ser `/executive-reports`
- `executive-dashboard` (línea 987) → debe ser `/executive-dashboard`

### A-07: Página JobProfileManagement.tsx sin ruta registrada

- **Archivo:** `client/src/pages/JobProfileManagement.tsx`
- **Solución:** Agregar ruta `/job-profiles` en App.tsx y enlace en DashboardLayout

---

## 🟡 MEDIO — Afectan calidad y mantenibilidad

### M-01: 164 Procedures sin validación Zod

- **Total procedures:** 893 en 141 archivos
- **Con .input():** 729 (81.6%)
- **Sin validación:** ~164 (18.4%)
- **Impacto:** Datos no validados pueden causar errores en runtime
- **Solución:** Agregar `.input(z.object({...}))` a cada procedure sin validación

### M-02: 76 errores TS2322 (Type not assignable)

- **Causa:** Tipos incompatibles en props de componentes React
- **Archivos:** Múltiples páginas de formularios

### M-03: 62 errores TS7006 (Parameter implicitly any)

- **Causa:** Parámetros de funciones sin tipo explícito
- **Solución:** Agregar tipos explícitos a parámetros

### M-04: 63 errores TS2578 (Unused @ts-expect-error)

- **Causa:** Directivas `@ts-expect-error` que ya no son necesarias
- **Solución:** Eliminar directivas obsoletas

### M-05: Datos pre-llenados inconsistentes en formularios

- **Problema:** Placeholders con datos ficticios ("Juan Pérez", "juan@empresa.com") en formularios de producción
- **Archivos:** Múltiples páginas de formularios
- **Solución:** Usar placeholders descriptivos ("Nombre completo del empleado", "correo@empresa.com")

### M-06: Validaciones de datos personales faltantes

- Falta validación de formato CURP (algoritmo oficial)
- Falta validación de formato RFC (algoritmo oficial)
- Falta validación de NSS (11 dígitos)
- Falta validación de correo electrónico único en sistema

### M-07: Jobs de servidor con errores TypeScript

- `server/jobs/predictive-turnover-job.ts` (18 errores)
- `server/jobs/executive-reports-job.ts` (12 errores)
- `server/lib/cacheInvalidation.ts` (13 errores)

---

## 🟢 BAJO — Mejoras de calidad y UX

### B-01: Optimización de código — Funciones duplicadas

- `evidenceFolder.ts` y `evidencesFolder.ts` tienen lógica similar
- `nineBox.ts` y `nineBoxGrid.ts` tienen lógica similar
- **Solución:** Consolidar en un solo archivo con funcionalidad completa

### B-02: Mejoras de UX en desplegables

- Agregar iconos a SelectItem para mejor identificación visual
- Implementar búsqueda en selects con más de 10 opciones
- Agregar tooltips descriptivos en campos complejos

### B-03: Páginas de desarrollo/prueba sin ocultar en producción

- `ComponentShowcase.tsx` — Página de prueba sin ruta (OK)
- `SignatureTest.tsx` — Página de prueba con ruta `/signature-test` (ocultar)
- `TestDataSeeder.tsx` — Seeder con ruta `/test-data-seeder` (ocultar en producción)

### B-04: Prellenado inteligente de formularios

- Usar datos del empleado logueado para pre-llenar formularios de casos
- Pre-llenar departamento y puesto en evaluaciones desde perfil del empleado
- Auto-completar fechas de inicio/fin basadas en ciclos de evaluación activos

### B-05: Optimización de tiempo del empleado

- Evaluación NOM-035: Reducir de 3 pasos a 1 (cuestionario directo)
- Reporte de incidente: Formulario simplificado con campos pre-llenados
- Solicitud de capacitación: Botón directo desde perfil del empleado
- Dashboard personalizado por empleado (no solo admin)

---

## 📊 ESTADÍSTICAS DEL SISTEMA

| Métrica                        | Valor                 |
| ------------------------------ | --------------------- |
| Total páginas frontend         | 175+ archivos .tsx    |
| Total routers backend          | 141 archivos .ts      |
| Total procedures tRPC          | 893                   |
| Total rutas en App.tsx         | 211                   |
| Total rutas en DashboardLayout | 145                   |
| Errores TypeScript totales     | 778                   |
| Archivos con errores TS        | 20+ archivos críticos |
| SelectItem con value=""        | 14 instancias         |
| Rutas 404 identificadas        | 22                    |
| Routers duplicados             | 3 pares               |
| Procedures sin validación Zod  | ~164                  |

---

## 🤖 OPORTUNIDADES DE AUTOMATIZACIÓN

### Auto-01: Pipeline de Riesgo → Intervención (ALTA PRIORIDAD)

```
Empleado alcanza score de retención < 30
  → Generar plan de intervención automáticamente
  → Asignar mentor del mismo departamento (mejor score)
  → Notificar a RRHH y supervisor directo
  → Programar seguimiento en 30/60/90 días
  → Registrar en intervention_plans
```

### Auto-02: Evaluación 360° → Actualización de Perfil

```
Evaluación 360° completada (todos los evaluadores respondieron)
  → Calcular promedios de competencias automáticamente
  → Actualizar perfil de competencias del empleado
  → Recalcular posición en Nine-Box Matrix
  → Actualizar Matriz de Habilidades
  → Generar recomendaciones de capacitación personalizadas
  → Notificar al empleado y supervisor
```

### Auto-03: Caso NOM-035 → Flujo Completo

```
Nuevo caso creado (manual o desde encuesta)
  → Asignar automáticamente a responsable del departamento
  → Crear plan de acción correctiva inicial con plantilla
  → Programar seguimiento en 15 días
  → Notificar al comité si es crítico (nivel 3+)
  → Crear alerta temprana si hay 3+ casos en mismo departamento
```

### Auto-04: Reportes STPS Automáticos

```
Primer día de cada mes (cron job)
  → Generar reporte mensual de cumplimiento NOM-035
  → Calcular indicadores de riesgo por departamento
  → Generar PDF con comparativas
  → Enviar por email a responsables configurados
  → Guardar en historial de reportes
```

### Auto-05: Alertas de Vencimiento

```
Diariamente a las 8:00 AM (cron job)
  → Verificar planes de acción próximos a vencer (7 días)
  → Verificar evaluaciones pendientes (3 días)
  → Verificar capacitaciones obligatorias vencidas
  → Verificar renovaciones de certificados próximas
  → Enviar notificaciones personalizadas por email/push
```

### Auto-06: Sincronización de Competencias

```
Al cambiar puesto de un empleado
  → Obtener competencias requeridas del nuevo puesto
  → Calcular brecha vs competencias actuales del empleado
  → Generar plan de capacitación automático
  → Notificar a RRHH y al empleado
  → Actualizar DNC (Detección de Necesidades de Capacitación)
```

---

## 📋 PLAN DE CORRECCIÓN PRIORIZADO

### SEMANA 1 — Crítico (Bloqueos de funcionalidad)

| #   | Tarea                                                                   | Archivos                  | Horas est. |
| --- | ----------------------------------------------------------------------- | ------------------------- | ---------- |
| 1   | ✅ Corregir removeChild en RootCauseAnalysis y SkillsMatrix             | 2 archivos                | HECHO      |
| 2   | Corregir 14 SelectItem con value=""                                     | 7 archivos                | 2h         |
| 3   | Corregir ruta duplicada /cases/assignment                               | App.tsx                   | 0.5h       |
| 4   | Agregar validación db possibly null (script automático)                 | 130 archivos              | 1h         |
| 5   | Corregir rutas sin "/" inicial (executive-reports, executive-dashboard) | App.tsx                   | 0.5h       |
| 6   | Corregir Dashboard de casos (0 vs 94+47)                                | routers.ts, Dashboard.tsx | 2h         |

### SEMANA 2 — Alto (Funcionalidad importante)

| #   | Tarea                                                                  | Archivos                     | Horas est. |
| --- | ---------------------------------------------------------------------- | ---------------------------- | ---------- |
| 7   | Agregar 22 rutas 404 faltantes en App.tsx                              | App.tsx                      | 3h         |
| 8   | Consolidar routers duplicados (evidenceFolder, nineBox, notifications) | 6 archivos                   | 2h         |
| 9   | Eliminar archivos obsoletos (.backup, .disabled, .tsx en server)       | 4 archivos                   | 0.5h       |
| 10  | Corregir 20+ parseInt sin validación de "all"                          | 7 archivos                   | 2h         |
| 11  | Agregar ruta para JobProfileManagement.tsx                             | App.tsx, DashboardLayout.tsx | 0.5h       |
| 12  | Corregir rutas sin "/" inicial                                         | App.tsx                      | 0.5h       |

### SEMANA 3 — Medio (Calidad y mantenibilidad)

| #   | Tarea                                            | Archivos                          | Horas est. |
| --- | ------------------------------------------------ | --------------------------------- | ---------- |
| 13  | Corregir 308 errores TS2339 (por archivos)       | 20+ archivos                      | 8h         |
| 14  | Agregar validaciones Zod a 164 procedures        | 141 archivos                      | 6h         |
| 15  | Corregir 76 errores TS2322                       | Múltiples                         | 4h         |
| 16  | Limpiar 63 directivas @ts-expect-error obsoletas | Múltiples                         | 1h         |
| 17  | Mejorar datos pre-llenados en formularios        | 10+ archivos                      | 3h         |
| 18  | Implementar validaciones CURP, RFC, NSS          | EmployeeNew.tsx, EmployeeEdit.tsx | 4h         |

### SEMANA 4 — Automatización (Valor de negocio)

| #   | Tarea                                         | Archivos                      | Horas est. |
| --- | --------------------------------------------- | ----------------------------- | ---------- |
| 19  | Auto-01: Pipeline Riesgo → Intervención       | interventions.ts, cron job    | 6h         |
| 20  | Auto-02: Evaluación → Actualización de Perfil | performanceEvaluation360.ts   | 4h         |
| 21  | Auto-03: Caso NOM-035 → Flujo Completo        | casesManagement.ts            | 4h         |
| 22  | Auto-04: Reportes STPS Automáticos            | scheduledReports.ts, cron job | 4h         |
| 23  | Auto-05: Alertas de Vencimiento               | alerts.ts, cron job           | 3h         |
| 24  | Auto-06: Sincronización de Competencias       | employees.ts, training.ts     | 4h         |

---

## 🏆 VISIÓN: MEJOR HERRAMIENTA DE GESTIÓN DE PERSONAL

Para convertir este sistema en la mejor herramienta de administración de personal, desempeño y capacitación, se recomienda implementar:

### 1. Dashboard Unificado por Rol

- **Empleado:** Mi desempeño, mis capacitaciones, mis evaluaciones pendientes, mis documentos
- **Supervisor:** Estado de mi equipo, alertas de riesgo, evaluaciones pendientes de mi equipo
- **RRHH:** Vista consolidada de toda la organización con KPIs clave
- **Dirección:** Dashboard ejecutivo con tendencias y proyecciones

### 2. Motor de Recomendaciones Inteligente

- Recomendar capacitaciones basadas en brechas de competencias
- Sugerir planes de carrera basados en desempeño y aspiraciones
- Identificar candidatos internos para promociones
- Predecir riesgo de rotación y sugerir acciones preventivas

### 3. Gamificación del Desempeño

- Sistema de puntos por completar capacitaciones
- Badges por logros (certificaciones, evaluaciones excelentes)
- Ranking de desempeño por departamento
- Reconocimientos automáticos por hitos

### 4. Integración con Sistemas Externos

- IMSS: Sincronización de altas, bajas y modificaciones
- SAT: Validación de RFC y e-firma
- CURP: Validación en tiempo real
- Nómina: Sincronización bidireccional de datos

---

_Reporte generado automáticamente - Sistema NOM-035 STPS 2018 v2.0_
_Auditoría realizada el 6 de Marzo 2026_
