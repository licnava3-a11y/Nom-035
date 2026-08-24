# Checkpoint de Auditoría 03 — Identidad en Entrevistas y Carga Diferida de Exportación

**Fecha:** 2026-08-24  
**Estado:** Validado localmente  
**Prioridades atendidas:** P0/P1 — Confidencialidad de entrevistas; P2 — Rendimiento de carga

## Hallazgos y correcciones

| Hallazgo | Riesgo | Corrección aplicada |
|---|---|---|
| `exitInterviews` comparaba `exitInterviews.employeeId` con `ctx.user.id`, aunque la tabla relaciona el campo con `employees.id`. | Un colaborador podía no ver su propia entrevista o la confidencialidad podía evaluarse contra una identidad equivocada. | Se resuelve el perfil de colaborador mediante `employees.userId = ctx.user.id` en los flujos `list`, `getById` y `submitResponses`. |
| `RecognitionsCard` importaba `jspdf` y `jspdf-autotable` al cargar el dashboard. | Descarga y análisis innecesario de dependencias de PDF cuando el usuario no solicita exportar. | Se sustituyeron por importaciones dinámicas que se cargan solo al pulsar el botón de exportación. |
| La exportación tomaba el primer elemento `canvas` del documento. | El PDF podía capturar un gráfico ajeno si coexistían varios canvases en la página. | El selector queda acotado al contenedor `#recognitions-category-chart`. |

## Validación

| Verificación | Resultado |
|---|---|
| TypeScript — servidor | Aprobado. |
| TypeScript — cliente | Aprobado. |
| Build de cliente | Aprobado con carga diferida del exportador PDF. |
| Suite unitaria de CI | **93 archivos aprobados; 1,463 pruebas aprobadas.** |

## Observación de rendimiento

El build conserva advertencias para dependencias grandes de uso especializado, entre ellas el motor ELK de organigramas. La página de organigrama y ELK ya se cargan de manera diferida; la advertencia corresponde al peso del recurso al utilizar esa funcionalidad, no a una descarga inicial del dashboard.

## Pendientes priorizados

1. Ejecutar las pruebas de integración contra MySQL configurado para validar persistencia real.
2. Auditar y reducir los usos de `as any` que participen en flujos críticos de colaboradores, cursos, evaluaciones, matriz de habilidades e incidencias.
3. Revisar los módulos restantes que usan el patrón `employeeId` para confirmar de forma explícita si almacenan `employees.id` o `users.id`.

> **Principio de rendimiento:** Una dependencia pesada debe cargarse cuando la funcionalidad que la necesita se utiliza, no antes.
