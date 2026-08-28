# Checkpoint de Auditoría 10 — Tablero y Migración Gradual

## Tablero de métricas

Se intentó crear el proyecto **Seguridad y Remediación NOM-035** en GitHub Projects con la identidad autenticada. GitHub respondió `Resource not accessible by integration (createProjectV2)`, por lo que el tablero no puede crearse hasta que la autorización tenga permiso de Projects.

### Configuración propuesta

| Campo o vista | Propósito |
|---|---|
| Estado | Backlog, En análisis, En remediación, En validación, Cerrado, Excepción temporal. |
| Prioridad | Crítica, Alta, Media, Baja. |
| Componente | ExcelJS, PostCSS, Vitest, CI/CD, Autorización, Otro. |
| Riesgo residual | Alto, Medio, Bajo. |
| Evidencia | Enlace a auditoría, prueba o ejecución de CI. |
| Vista de métricas | Vulnerabilidades abiertas por prioridad, antigüedad, owner y fecha objetivo. |

## Migración gradual

- Se creó `scripts/prepare-export-migration.mjs`.
- El inventario detectó 20 usos de ExcelJS en servidor y cliente.
- Se creó un exportador CSV opt-in para migrar reportes tabulares sin modificar rutas de producción.
- La sustitución de ExcelJS sólo debe hacerse por caso de uso y con pruebas de archivo.
