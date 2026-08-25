# Checkpoint de Auditoría 01 — Aislamiento de Pruebas de Integración

**Fecha:** 2026-08-24  
**Estado:** Validado localmente  
**Prioridad atendida:** P1 — Confiabilidad de la canalización de pruebas

## Hallazgo

La suite `pnpm test:ci` intentaba ejecutar pruebas que requieren una base de datos MySQL configurada. En un entorno de auditoría o CI sin ese servicio, el resultado era inconsistente: **11 archivos de prueba fallaban por `Database not available`**, aunque la mayor parte de las pruebas unitarias sí era correcta.

Esta situación mezclaba pruebas unitarias e integración en una misma ejecución, dificultaba interpretar fallos reales y volvía la validación local dependiente de una infraestructura externa.

## Corrección aplicada

| Archivo                    | Cambio                                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vitest.config.ts`         | Se definió una lista explícita de pruebas dependientes de base de datos. Se excluyen por defecto y se habilitan únicamente con `RUN_DB_INTEGRATION_TESTS=true`. |
| `package.json`             | `test:ci` quedó como suite unitaria reproducible. `test:integration` activa explícitamente las pruebas que requieren MySQL.                                     |
| `server/ciQuality.test.ts` | Se actualizó la prueba de calidad para validar la separación explícita y evitar que la lista de exclusiones quede desincronizada.                               |

## Validación

| Verificación                     | Resultado                                                                |
| -------------------------------- | ------------------------------------------------------------------------ |
| TypeScript — servidor            | Aprobado mediante comprobación segmentada.                               |
| TypeScript — cliente             | Aprobado mediante comprobación segmentada.                               |
| Analizador de seguridad de tipos | Aprobado.                                                                |
| Build del cliente                | Aprobado. Se detectaron oportunidades P2 de reducción de chunks grandes. |
| Suite unitaria de CI             | **92 archivos aprobados; 1,460 pruebas aprobadas.**                      |

## Nota operativa

Las pruebas de integración no se eliminaron ni se ignoraron: ahora se ejecutan de forma explícita en un entorno con MySQL disponible mediante:

```bash
RUN_DB_INTEGRATION_TESTS=true pnpm test:integration
```

## Siguiente bloque de auditoría

1. Revisar y priorizar los chunks grandes generados en el build.
2. Revisar duplicidades y `as any` de alto impacto, empezando por flujos de colaborador, evaluación, competencias y capacitación.
3. Ejecutar pruebas de integración en un entorno MySQL antes de marcar el cierre final.

> **Principio de calidad:** Una suite confiable distingue entre el defecto del producto y la dependencia del ambiente que necesita para probarlo.
