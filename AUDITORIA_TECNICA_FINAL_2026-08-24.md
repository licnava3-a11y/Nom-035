# Auditoría Técnica Final — Plataforma NOM-035

**Fecha:** 2026-08-24  
**Repositorio:** `licnava3-a11y/Nom-035`  
**Alcance:** corrección priorizada, pruebas, TypeScript, controles de acceso, experiencia de usuario y rendimiento de carga.

## Resumen ejecutivo

Se realizaron tres checkpoints de corrección validados localmente. El resultado principal es una suite unitaria reproducible, el cierre de vulnerabilidades de autorización en evaluaciones, la corrección de identidad usuario-colaborador en entrevistas de salida y una mejora puntual de carga diferida para exportaciones de reconocimientos.

| Métrica de validación | Resultado |
|---|---|
| Suite unitaria CI | **93 archivos aprobados; 1,463 pruebas aprobadas** |
| TypeScript de servidor | Aprobado con ejecución segmentada |
| TypeScript de cliente | Aprobado con ejecución segmentada |
| Analizador de seguridad de tipos | Aprobado |
| Build de cliente | Aprobado |
| Checkpoints Git creados | 3 |

## Hallazgos corregidos

| Prioridad | Hallazgo | Acción aplicada | Checkpoint |
|---|---|---|---|
| P0 | El inicio de examen recibía un `employeeId` controlado por el cliente; la pantalla usaba el valor fijo `1`. | El servidor deriva el colaborador de la sesión autenticada. Se retiró el dato público del contrato y se añadieron pruebas de propiedad. | `f2fac5b` |
| P0 | Envío, resultados e historial de intentos podían usar IDs de intento o colaborador ajenos. | Se validó propiedad de intento e historial para roles no gestores. | `f2fac5b` |
| P0/P1 | Entrevistas de salida comparaban `employees.id` contra `users.id`. | Se resolvió el colaborador desde `employees.userId` en listado, detalle y envío de respuestas. | `13dbc0a` |
| P1 | La suite CI mezclaba pruebas unitarias con pruebas que exigen MySQL. | Se separaron explícitamente las pruebas de integración mediante `RUN_DB_INTEGRATION_TESTS=true`. | `b5a60c0` |
| P2 | El dashboard de reconocimientos cargaba `jspdf` y `jspdf-autotable` aunque no se exportara un PDF. | Se aplicó importación dinámica al pulsar exportar y se acotó el canvas exportado al componente correcto. | `13dbc0a` |

## Checkpoints creados

| Commit | Descripción |
|---|---|
| `b5a60c0` | `test: separate database integration suite from unit CI` |
| `f2fac5b` | `fix: enforce assessment attempt ownership` |
| `13dbc0a` | `fix: align employee ownership and defer recognition exports` |

## Validación ejecutada

La validación se realizó con controles independientes para evitar que un fallo de infraestructura se confundiera con un defecto del producto. Las verificaciones de TypeScript se ejecutaron por cliente y servidor con memoria controlada; el comando monolítico requiere más memoria de la disponible en este entorno.

| Comando o control | Resultado | Observación |
|---|---|---|
| `pnpm check:server` equivalente | Aprobado | Ejecución segmentada con `tsc --noEmit -p tsconfig.server.json`. |
| `pnpm check:client` equivalente | Aprobado | Ejecución segmentada con `tsc --noEmit -p tsconfig.client.json`. |
| `pnpm check:type-safety` | Aprobado | Sin hallazgos en los archivos incluidos por el analizador interno. |
| `pnpm test:ci` | Aprobado | 93 archivos y 1,463 pruebas. |
| `pnpm exec vite build` | Aprobado | Persisten advertencias de chunks especializados de gran tamaño. |
| `pnpm test:integration` | Pendiente | Requiere MySQL activo y migraciones aplicadas. |

## Oportunidades de mejora priorizadas

| Prioridad | Oportunidad | Recomendación |
|---|---|---|
| P1 | Pruebas de integración MySQL | Ejecutarlas en GitHub Actions o entorno Docker con `DATABASE_URL` de pruebas; cargar al menos 10 perfiles de prueba anonimizados y validar los flujos críticos. |
| P1 | Modelo de identidad transversal | Revisar todos los módulos que usan `employeeId` para confirmar si representan `employees.id` o `users.id`; reutilizar un único resolvedor de identidad de colaborador. |
| P2 | Deuda de tipos | El escaneo detectó 1,232 usos de `as any`. No se recomienda reemplazo masivo. Priorizar flujos de colaboradores, cursos, evaluaciones, matriz de habilidades e incidencias. |
| P2 | Bundle especializado | El motor ELK, gráficos y exportadores conservan chunks pesados. Ya son diferidos por ruta o interacción en los flujos revisados; medir carga real antes de rediseñar el chunking. |
| P2 | Carga de datos y filtros | Consolidar consultas repetidas, cachear catálogos y hacer que filtros de nombre, apellido, fechas y periodos compartan un esquema de parámetros tipado. |
| P3 | Pendientes funcionales | Los comentarios `TODO` de correo, S3, vistas previas y datos dinámicos deben convertirse en historias de producto con responsable, criterio de aceptación y prueba asociada. |

## Criterio de cierre

El código modificado está validado localmente y registrado en checkpoints. El cierre definitivo de la auditoría requiere ejecutar la suite de integración contra MySQL y una prueba de aceptación con perfiles de datos de demostración, sin datos personales reales.

> **Principio de mantenimiento:** Corregir primero el control de acceso y la integridad; optimizar después lo que la medición demuestre que retrasa la experiencia.
