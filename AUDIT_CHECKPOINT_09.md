# Checkpoint de Auditoría 09 — Automatización Semanal y Plan de Remediación

**Fecha:** 2026-08-24

## Automatización configurada

- Dependabot revisa dependencias npm cada lunes a las 09:00 UTC.
- `weekly-dependency-audit.yml` ejecuta `pnpm audit` cada lunes a las 09:00 UTC.
- El resultado se conserva como artefacto durante 90 días.
- Cuando existen hallazgos, el workflow crea o actualiza una única incidencia etiquetada `security` y `dependencies`.

## Plan documentado

Se versionó un plan de remediación para las rutas transitivas de ExcelJS y PostCSS, con migración gradual, pruebas de exportación, actualización de herramientas y gobierno de excepciones.
