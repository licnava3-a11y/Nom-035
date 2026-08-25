# Informe de Riesgos Mitigados — Checkpoint de Autorización

**Sistema:** Plataforma NOM-035 STPS 2018  
**Repositorio:** [`licnava3-a11y/Nom-035`](https://github.com/licnava3-a11y/Nom-035)  
**Checkpoint principal:** [`f2fac5b`](https://github.com/licnava3-a11y/Nom-035/commit/f2fac5b)  
**Solicitud de extracción:** [PR #2](https://github.com/licnava3-a11y/Nom-035/pull/2)  
**Fecha del análisis:** 2026-08-24

## Resumen ejecutivo

El checkpoint de autorización corrige una brecha de **control de acceso horizontal** en el módulo de evaluaciones. Antes de la corrección, el cliente podía enviar el identificador de un colaborador al iniciar un examen y la interfaz utilizaba un valor fijo. Las operaciones posteriores no verificaban de manera uniforme que el intento perteneciera a la persona autenticada.

La solución desplaza la decisión de identidad y permiso al servidor. El cliente expresa la acción solicitada; el servidor obtiene el perfil de colaborador vinculado a la sesión y autoriza o rechaza el acceso según la propiedad del intento y el rol del usuario.

> **Conclusión:** Se mitigó el riesgo de atribución incorrecta, consulta indebida de resultados, envío no autorizado de respuestas y enumeración de historiales ajenos dentro del flujo de evaluaciones.

## Riesgos mitigados

| ID | Riesgo antes de la corrección | Severidad inicial | Control implementado | Estado residual |
|---|---|---:|---|---|
| R-01 | Inicio de examen en nombre de otro colaborador mediante un `employeeId` controlado por el cliente. | Crítica | Se eliminó `employeeId` de la entrada pública de `startAttempt`; el servidor lo deriva de `employees.userId = ctx.user.id`. | Bajo, sujeto a la integridad de la sesión. |
| R-02 | Registro o modificación de respuestas de un intento ajeno. | Alta | `submitAnswers` valida que el intento pertenezca al colaborador autenticado antes de persistir respuestas. | Bajo. |
| R-03 | Consulta de calificación, respuestas o retroalimentación de otro colaborador mediante `attemptId`. | Alta | `getAttemptResults` verifica propiedad del intento para roles no gestores. | Bajo. |
| R-04 | Enumeración del historial de evaluaciones de otro colaborador mediante `employeeId`. | Alta | `listEmployeeAttempts` bloquea identificadores ajenos para roles no gestores. | Bajo. |
| R-05 | Fallo de confidencialidad por mezclar `users.id` y `employees.id` en entrevistas de salida. | Alta | Checkpoint posterior `13dbc0a` resuelve el colaborador a partir de `employees.userId`. | Bajo, requiere revisión transversal de módulos equivalentes. |

## Detalle de los controles implementados

### 1. Resolución de identidad del lado del servidor

El router de evaluaciones incorpora un resolvedor de colaborador autenticado. Este control busca un registro en `employees` cuya clave `userId` coincide con la sesión actual. Si el vínculo no existe, el procedimiento termina con `FORBIDDEN`.

La decisión elimina la dependencia de datos de identidad enviados por el navegador. El campo `employeeId` ya no forma parte de la entrada de `startAttempt`, y `TakeExam.tsx` envía únicamente el identificador de la evaluación.

### 2. Autorización por propiedad del recurso

Antes de enviar respuestas o devolver resultados, el router consulta el intento solicitado y compara el `employeeId` del registro con el colaborador derivado de la sesión. La operación se rechaza si no hay coincidencia.

Este patrón es fundamental porque conocer un identificador numérico no equivale a tener permiso para acceder al recurso. El control se conserva también al solicitar el historial de intentos.

### 3. Separación explícita de privilegios

Los roles `super_admin`, `admin`, `instructor`, `rh` y `recursos_humanos` pueden administrar evaluaciones conforme a la política definida en el router. Los demás roles requieren que la propiedad del recurso coincida con el colaborador autenticado.

### 4. Cobertura automatizada

Se añadieron tres pruebas unitarias que validan: derivación segura del colaborador al iniciar un examen; bloqueo de resultados ajenos; y bloqueo de historial ajeno. La suite local posterior al cambio aprobó **93 archivos y 1,463 pruebas**.

## Evidencia de validación

| Control | Evidencia | Resultado |
|---|---|---|
| Tipado de servidor | `tsc --noEmit -p tsconfig.server.json` | Aprobado. |
| Tipado de cliente | `tsc --noEmit -p tsconfig.client.json` | Aprobado. |
| Pruebas específicas | `server/assessments.authorization.test.ts` | 3 de 3 aprobadas. |
| Suite unitaria | `pnpm test:ci` | 93 archivos; 1,463 pruebas aprobadas. |
| Revisión de flujo | PR #2 y checkpoint `f2fac5b` | Controles versionados y revisables. |

## Riesgos residuales y acciones recomendadas

| Riesgo residual | Impacto | Acción recomendada | Prioridad |
|---|---|---|---:|
| Cobertura de integración con MySQL pendiente | Podría ocultar diferencias entre mocks y persistencia real. | Ejecutar `pnpm test:integration` en CI con una base de datos efímera y migraciones aplicadas. | Alta |
| Patrón de identidad en módulos heredados | Podrían existir comparaciones entre `users.id` y `employees.id` fuera de evaluaciones y entrevistas. | Crear un resolvedor reutilizable y auditar todos los módulos que usan `employeeId`. | Alta |
| Roles de gestión definidos localmente | Podría haber divergencia con la política corporativa de permisos. | Centralizar permisos de evaluación en una política o servicio de autorización tipado. | Media |
| Auditoría de eventos de autorización | Reduce capacidad de investigación posterior ante un intento indebido. | Registrar rechazos `FORBIDDEN` relevantes sin almacenar respuestas sensibles. | Media |

## Recomendación de operación

La corrección debe integrarse mediante la solicitud de extracción después de que los flujos de GitHub Actions concluyan satisfactoriamente. La protección de `main` debe requerir el estado **Types and tests** y la revisión humana de los cambios de autorización.

> **Principio de seguridad aplicado:** El cliente solicita una acción; el servidor determina la identidad y decide el permiso.

## Referencias

[1] [Checkpoint de autorización `f2fac5b`](https://github.com/licnava3-a11y/Nom-035/commit/f2fac5b)  
[2] [Solicitud de extracción #2](https://github.com/licnava3-a11y/Nom-035/pull/2)  
[3] [OWASP: Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
