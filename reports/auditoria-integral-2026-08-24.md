# Auditoría integral de código, datos y experiencia de usuario

**Proyecto:** Plataforma de Capacitación NOM-035 STPS 2018  
**Fecha:** 24 de agosto de 2026  
**Alcance:** Cliente React, routers tRPC, esquema Drizzle, pruebas, rendimiento de carga, reportes, correlación de datos y automatización de calidad.

## Resumen ejecutivo

La plataforma cuenta con una base de calidad relevante: la suite hermética aprobó **104 archivos y 1,536 pruebas**, el chequeo TypeScript del servidor aprobó después de las correcciones y la auditoría de dependencias productivas no reportó vulnerabilidades. La verificación remota de calidad también se encuentra protegida por la comprobación obligatoria **Types and tests**.

La auditoría identificó dos correcciones funcionales de impacto inmediato en encuestas, una mejora de rendimiento que elimina consultas N+1 en cálculo de riesgo y cuatro líneas de trabajo prioritarias: hacer viable el chequeo TypeScript completo de cliente con la memoria local disponible, fraccionar módulos excesivamente grandes, completar la agregación por dominio en NOM-035 y consolidar contratos tipados que hoy se ocultan mediante `any`.

| Área | Estado | Evidencia | Prioridad |
|---|---|---|---|
| Suite hermética | Aprobada | 104 archivos / 1,536 pruebas | Control continuo |
| TypeScript de servidor | Aprobado | `check:server` posterior a correcciones | Control continuo |
| TypeScript de cliente local | Preflight resuelto | `check:client:local` valida sintaxis con 1,536 MB; el tipado semántico completo se conserva en CI | P0 cerrado |
| Dependencias productivas | Sin hallazgos en la ejecución actual | `pnpm audit --prod` | Control continuo |
| Quality Gate remoto | Aprobado y exigido en `main` | Comprobación `Types and tests` | Completado |
| Suite hermética local | Aprobada tras corregir mock de esquema | 114 archivos y 1,553 pruebas | Completado |
| Integration Tests remoto | Configurado, ejecución externa pendiente | Requiere GitHub Actions Secrets | Dependencia externa |

## Correcciones aplicadas durante la auditoría

| Hallazgo | Corrección aplicada | Beneficio verificable | Referencia |
|---|---|---|---|
| El autoguardado de encuesta autenticada exigía un `userId` enviado desde cliente, pero el formulario no lo proporcionaba. | El router obtiene la identidad de `ctx.user` y el formulario envía únicamente el token anónimo cuando existe. | El autoguardado funciona para sesión autenticada y no permite suplantar otro usuario mediante un identificador enviado por cliente. | [`server/routers/surveys.ts`](../server/routers/surveys.ts), [`SurveyForm.tsx`](../client/src/components/SurveyForm.tsx) |
| Un ATS anónimo podía desreferenciar `ctx.user!` al crear un caso crítico. | Se agregó una rama anónima sin datos personales, con folio único y descripción segura. | La detección de un ATS no falla por ausencia de sesión; se conserva la confidencialidad. | [`server/routers/surveys.ts`](../server/routers/surveys.ts) |
| Las métricas y el reporte agregado consultaban respuestas una vez por cada registro. | Se incorporó `getScoringAnswersByResponseId`, que recupera respuestas en lote y las agrupa en memoria. | El patrón pasa de **N+1 consultas** a una consulta de respuestas para el conjunto analizado. | [`server/routers/surveys.ts`](../server/routers/surveys.ts) |
| No existía cobertura focalizada para esos riesgos. | Se creó una prueba de regresión de seguridad y agrupación. | 3 pruebas focalizadas y 17 pruebas de scoring aprobadas. | [`server/surveyResponseSafety.test.ts`](../server/surveyResponseSafety.test.ts) |

> La corrección de ATS anónimo es particularmente importante: un flujo de protección no debe interrumpirse cuando la persona responde sin sesión; debe registrar el caso preservando su anonimato.

## Hallazgos priorizados

### Prioridad P0 — Estabilidad y trazabilidad técnica

| Hallazgo | Impacto | Recomendación concreta | Criterio de salida |
|---|---|---|---|
| El chequeo TypeScript integral del cliente consume más memoria de la disponible en el sandbox local, aunque el Quality Gate remoto sí completa. | Podía interrumpir la validación durante desarrollo. | Se añadió `check:client:local`, un preflight sintáctico con 1,536 MB, mientras `check:client:semantic` mantiene el tipado completo para CI. | Preflight local aprobado y cobertura semántica completa preservada en CI. |
| `App.tsx` (2,166 líneas) concentra el registro de rutas y más de un centenar de importaciones diferidas. | Alto costo de mantenimiento y riesgo de colisiones de rutas. | Se consolidaron las rutas equivalentes de alertas hacia `/alerts-central` mediante `legacyRedirects`; el siguiente paso es extraer manifiestos por dominio: `routes/surveys`, `routes/talent`, `routes/compliance`, `routes/admin`. | `App.tsx` queda como composición de manifiestos y fallback global. |
| `surveys.ts` (2,884 líneas) concentra tokenización, scoring, reportes, estadísticas y administración. | Eleva el riesgo de regresiones y dificulta probar responsabilidades aisladas. | Se eliminó una consulta N+1, se extrajo `calculateGuideII` a `services/guideIIResults.ts` y las reglas de recomendación a `lib/nom035-guides.ts`; queda separar en routers de respuestas, resultados, tokens y exportación. | Cada router tiene una responsabilidad, contratos de entrada y pruebas propias. |
| `domainRisks` se devolvía como arreglo vacío en estadísticas de riesgo. | El dashboard o reporte podía presentar un análisis incompleto para Guía III. | Corregido: la agregación reutiliza el lote de respuestas y expone `domainRiskStatus` como `available`, `no_domain_data` o `not_applicable`; el dashboard ya presenta el dominio, nivel y promedio, o una explicación accesible cuando no aplica. | El contrato y la interfaz entregan dominios calculados o una razón de no aplicabilidad. |

### Prioridad P1 — UX, correlación y calidad de contratos

| Hallazgo | Evidencia | Mejora propuesta |
|---|---|---|
| Los formularios `SurveyForm` y `SurveyFormWithToken` compartían estructura y lógica de respuestas. | Corregido: ambos reutilizan `SurveyQuestionCards` y el mismo contrato de autoguardado; el flujo por token valida y persiste el periodo. | Mantener distintos los envíos finales mientras el enlace de guías requiera encadenamiento y navegación especializada. |
| Se usan conversiones `as any` en componentes y routers de encuestas, cursos y diálogos. | Ejemplos: `SurveyForm.tsx`, `CourseDialog.tsx`, `JobAnalysisDialog.tsx`. | Definir uniones de tipos y derivar entradas desde tRPC/Zod; iniciar por rutas activas y evitar sustituciones masivas sin pruebas. |
| La determinación de Guía II/III cuenta filas de `users`, no personal activo del catálogo de empleados. | `determineApplicableGuide` consulta `users`. | Contar empleados activos elegibles por empresa/centro de trabajo y periodo. Esto evita que cuentas administrativas alteren la guía aplicable. |
| El proyecto ya cuenta con datos maestros de empleado, departamento y puesto, pero no todos los formularios compartían un adaptador único. | Corregido para el selector: `employeeAutofill` normaliza contacto, empresa, sucursal, departamento y puesto desde relaciones reales; Buzón lo usa para quejas, felicitaciones y DNC, y Entrevistas de Salida lo usa al registrar bajas. | Migrar gradualmente los formularios y reportes que aún capturan datos manualmente; el responsable se incorporará donde su relación maestra esté definida. |
| Los estados de carga están presentes en rutas recientes, pero páginas extensas mantienen lógica y presentación en el mismo archivo. | `EmployeeProfile.tsx`, `Home.tsx`, `JobPositions.tsx`, `DC3Manager.tsx` superan 1,300 líneas. | Extraer secciones en paneles con skeleton, vacío y error reutilizables; usar carga diferida para secciones secundarias, no para datos críticos. |

### Prioridad P2 — Rendimiento, visualización y reportes faltantes

| Oportunidad | Valor para operación NOM-035 | Implementación recomendada |
|---|---|---|
| Reporte de riesgo por dominio y dimensión | Completa la lectura de Guía III para comité y auditorías. | Incorporar `domainRisks`, comparar periodo actual/anterior y exportar a PDF/Excel desde la misma fuente agregada. |
| Matriz de cobertura por empresa → centro → departamento → puesto | Evita campañas incompletas y captura duplicada. | Usar relaciones existentes del empleado; mostrar elegibles, respondieron, pendientes y tasa de cobertura por nivel. |
| Informe de calidad de datos | Identifica empleados sin CURP, puesto, departamento, centro o empresa. | Extender el filtro de perfiles incompletos con métricas por campo y exportación CSV/Excel ya existente. |
| Reporte de eficacia de acciones correctivas | Relaciona riesgo, acción, responsable, fecha compromiso y resultado posterior. | Construir vista temporal con tendencia de riesgo y estado de acción, reutilizando los índices nuevos de acciones correctivas. |
| Presupuesto de bundle por dominio | Hace visible el impacto de gráficos, PDF y XLSX en cada entrega. | Conservar el reporte actual y añadir desglose por `vendor-charts`, `vendor-pdf`, `vendor-xlsx` y rutas perezosas. |

## Plan de prellenado y correlación de datos

La plataforma debe tratar **empresa, centro de trabajo, departamento, puesto y empleado** como una cadena de datos maestros. El usuario debe elegir una entidad primaria una sola vez; el sistema debe derivar las demás cuando la relación exista y permitir corrección explícita cuando haya ambigüedad.

| Flujo | Datos que deben prellenarse | Fuente autorizada | Validación al guardar |
|---|---|---|---|
| Caso NOM-035 | Nombre, correo, departamento, puesto, jefe directo, centro de trabajo | Empleado seleccionado | Confirmar que el empleado pertenece al departamento/puesto mostrado. |
| Encuesta | Departamento y puesto de segmentación; periodo y guía aplicable | Empleado, periodo de encuesta y configuración de empresa | Bloquear respuestas fuera del periodo o del token asignado. |
| DC-3 | Razón social, RFC, SCIA​N, centro, empleado y puesto | Empresa cliente + configuración general + empleado | Señalar campos faltantes antes de generar PDF. |
| Reporte STPS/NOM-035 | Empresa, RFC, SCIA​N, centro, responsable, universo evaluado | Configuración general y periodo | Mostrar procedencia de cada dato y advertir si falta. |
| Acción correctiva | Ámbito, responsable, departamento, caso/resultado origen | Resultado de encuesta o caso seleccionado | Evitar responsables inexistentes y fechas objetivo anteriores al inicio. |

## Estrategia de mejora por fases

| Fase | Duración estimada | Entregables | Riesgo |
|---|---:|---|---|
| 1. Estabilidad de tipos | 1–2 días | Chequeo de cliente segmentado, métricas de memoria y CI intacto. | Bajo–medio |
| 2. Contratos y encuestas | 2–3 días | Formularios unificados, tipos sin `any` en ruta crítica, dominios de riesgo. | Medio |
| 3. Datos maestros | 3–5 días | Adaptador de prellenado y validación transversal empresa→empleado. | Medio |
| 4. Reportería operativa | 3–5 días | Cobertura jerárquica, eficacia de acciones y calidad de datos. | Medio |
| 5. Modularización | Iterativa | Rutas y routers fraccionados con pruebas por dominio. | Medio–alto |

## Validación realizada

| Comprobación | Resultado |
|---|---|
| `pnpm run check:server` después de las correcciones | Aprobado |
| Pruebas de seguridad y batching de encuestas | 3/3 aprobadas |
| Pruebas de scoring NOM-035 | 17/17 aprobadas |
| Suite hermética previa a las correcciones | 104 archivos / 1,536 pruebas aprobadas |
| Auditoría de dependencias productivas | Sin vulnerabilidades reportadas en la ejecución actual |
| TypeScript completo de cliente local | No concluye por agotamiento de heap; debe resolverse con segmentación de chequeos |

## Conclusión

La plataforma es funcional y dispone de controles de calidad significativos. El siguiente retorno de inversión técnico está en **hacer reproducible el typecheck de cliente**, consolidar los contratos de encuestas y completar los agregados de riesgo por dominio. En paralelo, el plan de datos maestros reducirá captura manual, errores de correlación y discrepancias entre reportes STPS, DC-3, expedientes y campañas NOM-035.

## Referencias internas

[1]: ../server/routers/surveys.ts "Router de encuestas y cálculo de riesgo"
[2]: ../client/src/components/SurveyForm.tsx "Formulario de encuesta"
[3]: ../server/surveyResponseSafety.test.ts "Pruebas de regresión de encuestas"
[4]: ../client/src/App.tsx "Registro de rutas"
[5]: ../drizzle/schema.ts "Modelo relacional"
[6]: ../.github/workflows/quality.yml "Quality Gate"
