# Simulación Local de CI — Dependencias y PostCSS

## Alcance

Se ejecutó una simulación local de los controles centrales del pipeline sobre la rama de auditoría. La simulación incluyó pruebas de autorización, pruebas del adaptador CSV, seguridad de tipos, inspección del grafo de PostCSS y `pnpm audit --audit-level=high`.

## Resultados verificables

| Control | Resultado | Evidencia |
|---|---|---|
| Pruebas de autorización | Aprobado | 7 de 7 escenarios superados. |
| Pruebas del adaptador CSV | Aprobado | 2 de 2 pruebas superadas; incluye 10 registros, nulos y caracteres especiales. |
| Seguridad de tipos | Aprobado | `pnpm check:type-safety` concluyó antes de la auditoría de dependencias. |
| Grafo de PostCSS | Aislado en herramientas de build | `postcss@8.5.6` se resuelve desde Vite/Tailwind/autoprefixer, no desde rutas de servidor. |
| Auditoría de dependencias | Bloqueante | `pnpm audit --audit-level=high` detecta vulnerabilidades altas restantes. |

## Interpretación

La simulación no puede declararse aprobada en su totalidad porque el gate de dependencias continúa fallando. El aislamiento de PostCSS limita su impacto a la etapa de compilación, pero no elimina el hallazgo de `pnpm audit`. Además, la auditoría identifica rutas altas adicionales en SheetJS, Rollup, Undici, path-to-regexp, Picomatch, Happy DOM, Lodash y ws.

## Acción requerida

1. Mantener el pipeline bloqueante para severidades alta y crítica.
2. Separar las dependencias de desarrollo de las productivas en el tablero de seguridad.
3. Priorizar la actualización o sustitución de SheetJS y los paquetes usados en ejecución productiva.
4. Tratar PostCSS como dependencia de build y aplicar actualizaciones únicamente con `pnpm build` y revisión visual aprobadas.
5. No cerrar el ítem PostCSS hasta que `pnpm audit --audit-level=high` apruebe o exista una excepción temporal trazable y aprobada.
