# Presupuesto de bundle — primera medición

El build de medición produjo un total de **24,535.2 KB** sin comprimir y **3,665.1 KB** gzip. El presupuesto configurado es de **900 KB por asset sin comprimir**. El reporte generado por `pnpm report:bundle` queda disponible en `reports/bundle-budget.json` y `reports/bundle-budget.md` después de cada compilación de publicación.

| Asset | Tamaño sin comprimir | Gzip | Resultado |
|---|---:|---:|---|
| `vendor-graph-layout` | 3,234.3 KB | 555.7 KB | Excede |
| `vendor-export` | 1,390.1 KB | 326.2 KB | Excede |
| `vendor-charts` | 1,315.4 KB | 255.2 KB | Excede |
| `vendor-misc` | 1,313.0 KB | 279.8 KB | Excede |
| `vendor-react` | 1,023.1 KB | 180.6 KB | Excede |

Los assets que exceden el umbral permanecen aislados en chunks propios. ELK ya se carga dinámicamente al generar el organigrama. La siguiente optimización debe priorizar la separación adicional de exportación, gráficas y utilidades misceláneas sin introducir cambios funcionales.
