# Plan de Remediación: ExcelJS y PostCSS

**Rama:** `audit/correcciones-20260824`  
**Objetivo:** Reducir vulnerabilidades transitivas sin interrumpir la exportación de reportes ni el proceso de compilación.

## Resumen de rutas afectadas

| Área | Cadena vulnerable observada | Riesgo | Prioridad |
|---|---|---|---|
| Exportación Excel | `exceljs → archiver → glob/minimatch/brace-expansion` y `tmp` | Paquetes archivadores obsoletos y dependencias transitorias con avisos altos. | P1 |
| Herramientas de estilos | `vite / @tailwindcss/vite / autoprefixer → postcss → nanoid` | Dependencia de build con avisos altos; afecta pipeline, no procesamiento de solicitudes en producción. | P1 |

## Estrategia para ExcelJS

| Paso | Acción | Criterio de aceptación |
|---|---|---|
| 1 | Mantener ExcelJS en la versión más reciente disponible y revisar su grafo con `pnpm why exceljs archiver tmp`. | No existe actualización de parche pendiente. |
| 2 | Inventariar cada importación de `exceljs` y clasificar: exportación de tablas, reportes o importación. | Inventario versionado; rutas sin uso eliminadas. |
| 3 | Migrar gradualmente exportaciones simples a `xlsx` o a CSV cuando no se requiera formato avanzado. | Exportaciones elegidas preservan encabezados, tipos de fecha y validación. |
| 4 | Aislar ExcelJS con importación dinámica para evitar su carga en rutas no exportadoras. | Bundle inicial no contiene ExcelJS. |
| 5 | Añadir pruebas de exportación por cada formato migrado. | Archivo válido, encabezados y filas verificadas. |
| 6 | Si ExcelJS continúa arrastrando avisos sin corrección publicada, documentar excepción temporal y revisar semanalmente Dependabot. | Excepción aprobada con fecha de vencimiento y owner. |

## Estrategia para PostCSS

| Paso | Acción | Criterio de aceptación |
|---|---|---|
| 1 | Mantener `vite`, `@tailwindcss/vite`, `autoprefixer` y `postcss` en versiones compatibles más recientes. | `pnpm why postcss nanoid` sin versiones duplicadas evitables. |
| 2 | Eliminar la cadena heredada `vitest 2 → vite 5`; ya se actualizó Vitest a la rama 4. | Lockfile no conserva Vite 5 para pruebas. |
| 3 | Ejecutar `pnpm build` y revisión visual de rutas críticas tras cada actualización. | Build exitoso sin regresiones visuales. |
| 4 | Usar overrides de pnpm únicamente si la versión segura es compatible y no hay actualización del padre. | Pruebas, build y auditoría aprobados. |
| 5 | Convertir las excepciones inevitables en incidencias de seguridad con fecha de revisión. | No hay supresiones indefinidas. |

## Orden de ejecución

1. Ejecutar `pnpm why` para distinguir dependencias directas de transitorias.
2. Resolver actualizaciones de parche compatibles y validar TypeScript, pruebas y build.
3. Migrar las exportaciones simples fuera de ExcelJS; conservar ExcelJS sólo para formatos complejos.
4. Evaluar overrides de PostCSS/NanoID en una rama aislada.
5. Repetir `pnpm audit --audit-level=high` y cerrar únicamente las vulnerabilidades cuya cadena se elimine.

## Riesgo residual y gobierno

No se debe forzar una actualización mayor de ExcelJS ni suplantar paquetes de exportación sin pruebas de archivos reales. Las vulnerabilidades de herramientas de compilación se priorizan antes de publicar, aunque no formen parte de la superficie de ejecución de una solicitud en producción. Cada excepción debe tener propietario, evidencia y fecha de expiración.

## Referencias

[1] [ExcelJS](https://github.com/exceljs/exceljs)  
[2] [PostCSS](https://github.com/postcss/postcss)  
[3] [pnpm audit](https://pnpm.io/cli/audit)
