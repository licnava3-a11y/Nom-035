# Carga diferida de gráficos

Las visualizaciones de puestos y las cinco gráficas principales del dashboard ya no incluyen Chart.js en el módulo inicial de cada página. `LazyDashboardChart` descarga `chart.js` y `react-chartjs-2` solo al montarse una gráfica; `EmployeesBarChart` y `HistoryTrendChart` hacen lo propio mediante importación dinámica.

Durante la descarga se muestra `DeferredChartFrame`, que reutiliza `ChartSkeleton`, anuncia el estado mediante `aria-busy` y conserva el espacio visual para evitar saltos de contenido.

La prueba `server/lazyCharts.test.ts` valida la importación dinámica y la semántica accesible. La comprobación sintáctica de los cinco módulos modificados mediante esbuild aprobó. El build completo en este sandbox se interrumpió al renderizar chunks por el límite de memoria del entorno, no por un error de sintaxis de los módulos; el presupuesto de bundle y la canalización CI mantienen la validación de publicación.
