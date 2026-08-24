# Checkpoint de Auditoría 02 — Autorización del Módulo de Evaluaciones

**Fecha:** 2026-08-24  
**Estado:** Validado localmente  
**Prioridad atendida:** P0 — Control de acceso y vinculación usuario-colaborador

## Hallazgo

El flujo de evaluaciones confiaba en un `employeeId` enviado por el cliente y la pantalla de examen usaba un valor fijo (`employeeId = 1`). Además, las operaciones de envío de respuestas, consulta de resultados e historial de intentos no verificaban de forma consistente que el intento perteneciera al colaborador autenticado.

El defecto podía provocar atribución incorrecta de intentos y permitir que una cuenta autenticada consultara, enviara o enumerara intentos de otro colaborador mediante identificadores manipulados.

## Corrección aplicada

| Área | Cambio |
|---|---|
| Inicio de examen | Se eliminó `employeeId` de la entrada pública. El servidor deriva el colaborador desde `employees.userId = ctx.user.id`. |
| Interfaz `TakeExam` | Se eliminó el valor fijo del colaborador; el cliente solo envía el identificador de evaluación. |
| Envío de respuestas | Se valida la propiedad del intento para roles no gestores antes de persistir respuestas. |
| Consulta de resultados | Se valida la propiedad del intento para roles no gestores antes de devolver respuestas y calificación. |
| Historial de intentos | Se bloquea la consulta de un `employeeId` ajeno para roles no gestores. |
| Roles gestores | Se definieron roles autorizados para administrar evaluaciones: `super_admin`, `admin`, `instructor`, `rh` y `recursos_humanos`. |
| Cobertura | Se añadieron tres pruebas unitarias: derivación segura de colaborador, bloqueo de resultados ajenos y bloqueo de historial ajeno. |

## Validación

| Verificación | Resultado |
|---|---|
| TypeScript — servidor | Aprobado con `tsc --noEmit -p tsconfig.server.json` y límite de memoria controlado. |
| TypeScript — cliente | Aprobado con `tsc --noEmit -p tsconfig.client.json` y límite de memoria controlado. |
| Pruebas de autorización | 3 pruebas aprobadas. |
| Suite unitaria de CI | **93 archivos aprobados; 1,463 pruebas aprobadas.** |

## Próximo bloque

1. Ejecutar pruebas de integración de base de datos en un entorno MySQL para completar validación de extremo a extremo.
2. Corregir la misma confusión de identidad usuario-colaborador en módulos con patrones equivalentes, empezando por entrevistas de salida y NOM-035.
3. Reducir los chunks de build de alto peso mediante carga diferida de exportadores, gráficos y layout especializados.

> **Principio de seguridad:** El cliente expresa una intención; el servidor determina la identidad y decide el permiso.
