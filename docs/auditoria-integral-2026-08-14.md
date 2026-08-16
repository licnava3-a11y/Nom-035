# Auditoría integral de plataforma NOM-035

**Fecha de revisión:** 2026-08-14 y 2026-08-15.  
**Alcance analizado:** 267 páginas, 143 componentes, 164 routers, 97 archivos de prueba y 282 definiciones de ruta en `App.tsx`.

## Resumen ejecutivo

La auditoría confirmó una base funcional amplia, pero identificó problemas de integridad, verificabilidad y mantenibilidad que requieren una corrección priorizada. El riesgo más inmediato no está en la disponibilidad actual del servidor, sino en la capacidad de validar y actualizar el sistema sin regresiones: la verificación TypeScript agota el heap de 1.5 GB, la auditoría de dependencias reporta vulnerabilidades de severidad alta y crítica, y existen enlaces que llevan a rutas no registradas.

La mejora solicitada en **JobPositions** quedó aplicada: la página ya diferencia carga inicial, error recuperable, ausencia real de datos y resultados vacíos por filtros. Además, dejó de mostrar datos de ejemplo como si fueran datos productivos, calcula el indicador promedio desde los factores visibles y soporta el nivel **Muy Alto** en filtros y badges.

## Hallazgos priorizados

| Prioridad | Hallazgo | Evidencia | Impacto | Acción recomendada |
|---|---|---|---|---|
| P0 | Dependencias vulnerables | `pnpm audit --prod`: 210 vulnerabilidades, incluyendo 5 críticas y 97 altas | Riesgo de seguridad y cumplimiento | Actualizar por familias, validar lockfile y ejecutar regresión aislada por lote |
| P0 | Chequeo TypeScript no ejecutable con la memoria disponible | `tsc --noEmit` aborta por OOM con heap de 1.5 GB | Impide validar cambios y puede ocultar regresiones | Introducir `tsconfig` por referencias, límites de alcance y chequeos incrementales en CI |
| P0 | Rutas duplicadas y enlaces sin registro | `/cases/assignment` está duplicada; 8 enlaces internos no se encuentran en `App.tsx` | Navegación a contenido incorrecto o 404 | Mantener una única fuente de rutas y registrar, redirigir o retirar enlaces |
| P0 | Correlación frágil de puestos y empleados | `jobPositions.list` cruza `positions.title` con `jobPositions.positionName` | Conteos incorrectos si cambian o se duplican nombres | Agregar `positionId` a `job_positions` y migrar relaciones con clave foránea |
| P0 | Gráfica PDF de riesgo inconsistente | La UI usa niveles en español; la gráfica compara parte de los niveles en inglés | Distribución de riesgo incorrecta en auditorías | Unificar enum/capa de presentación y probar los cuatro niveles |
| P1 | Suite completa con fallos heredados | Validación previa: 14 fallos en 8 archivos; `sprint55.test.ts` contiene una expectativa obsoleta | Regresiones no detectadas con claridad | Clasificar, corregir y separar pruebas de infraestructura de pruebas de negocio |
| P1 | Datos simulados o métricas no implementadas | `JobPositions.tsx`, `Reports.tsx`, `ReportTemplates.tsx`, `dashboard.ts`, `training.ts` | Decisiones operativas sobre información no verificable | Eliminar fallbacks simulados en producción o sustituirlos por estado “sin datos” |
| P1 | Desplegable Radix inválido | `BuzonComunicacion.tsx:760` usa `<SelectItem value="">` | Posible error de ejecución del selector | Usar un valor centinela no vacío, por ejemplo `all` |
| P1 | Tipado evasivo y observabilidad dispersa | 1,235 `as any`; 795 `console.*`; 3 `catch {}` | Mayor riesgo de contratos rotos y fallos difíciles de diagnosticar | Establecer tipos de dominio, logger central y manejo explícito de errores |
| P2 | Archivos de gran tamaño y acoplamiento | `surveys.ts` 2,848 líneas; `App.tsx` 2,168; varios archivos >1,500 | Coste alto de mantenimiento, consumo de memoria y conflictos | Extraer routers, rutas, helpers, diálogos y subcomponentes por dominio |

**Remediación aplicada:** el reporte general y el reporte individual de puestos ya usan la normalización española de riesgos (`muy_alto`, `alto`, `medio`, `bajo`). La distribución PDF se cubrió con una prueba unitaria que verifica los cuatro niveles.

**Migración aplicada:** `jobPositions.catalogPositionId` ahora referencia opcionalmente a `positions.id`. La consulta de puestos cuenta empleados mediante esa llave y conserva el conteo analizado para registros históricos aún no vinculados. La inspección previa detectó cinco análisis históricos sin puesto equivalente; se crearon sus cinco puestos canónicos únicamente cuando coincidieron exactamente el nombre y el departamento existente. La verificación posterior confirmó 5 de 5 análisis vinculados y 0 sin vínculo.

## Remediación inicial de dependencias

Se actualizaron las dependencias directas `jspdf` a `4.2.1` y `handlebars` a `4.7.9`, ambas versiones corregidas. La auditoría posterior redujo las vulnerabilidades críticas de cinco a tres y las altas de 97 a 87. Permanecen `basic-ftp`, `fast-xml-parser` y `tar` como dependencias transitivas de Puppeteer, AWS SDK/Tailwind, respectivamente. No se forzó una sustitución mayor de esos árboles para evitar romper el flujo de generación PDF, almacenamiento o compilación; su actualización queda planificada y aislada como siguiente acción P0.

## Revisión de formularios y desplegables

La revisión estática detectó un uso incompatible de `SelectItem` con valor vacío en el Buzón de Comunicación. Los `<option value="">` nativos encontrados se usan, en general, como placeholder y no comparten la restricción de Radix UI. Se recomienda normalizar los valores de “Todos” y “Sin seleccionar” como centinelas explícitos (`all`, `none`, `unassigned`) y centralizar los contratos de filtros.

**Remediación aplicada:** el filtro de estado del Buzón usa ahora el centinela no vacío `ALL` y convierte este valor a `undefined` solo al construir la consulta. La sintaxis del componente se validó mediante compilación aislada.

## Rutas que requieren acción

Los siguientes enlaces internos están presentes en el frontend y no cuentan con una ruta textual equivalente en `App.tsx`: `/administrative/expenses`, `/compliance/checklist`, `/documents/history`, `/nom035-admin-panel`, `/survey-send`, `/training/calendar`, `/training/my-courses` y `/trends-charts`.

La ruta `/cases/assignment` aparece dos veces: una versión renderiza `Cases` y otra `CaseAssignment`. La primera coincidencia puede ocultar la segunda según el orden de evaluación del router.

**Remediación aplicada:** se consolidó `/cases/assignment` para renderizar únicamente `CaseAssignment`. También se añadieron aliases de compatibilidad para los nueve enlaces heredados detectados, redirigiéndolos a su ruta canónica y evitando respuestas 404 en navegación interna.

## Validación realizada

| Verificación | Resultado |
|---|---|
| Endpoint local `/api/health` | HTTP 200 |
| Compilación aislada de `JobPositions.tsx` con esbuild | Exitosa en 194 ms |
| Chequeo TypeScript completo | No concluye: OOM con heap de 1.5 GB |
| Auditoría de dependencias de producción | 210 hallazgos: 17 bajos, 91 moderados, 97 altos y 5 críticos |
| Prueba aislada del contrato `jobPositions.update` (checkpoint anterior) | 2/2 aprobadas |

## Actualización de pruebas heredadas

La ejecución secuencial de la suite completa identificó 13 aserciones heredadas que ya no reflejaban la arquitectura activa: redirect OAuth basado en host real, servidor estático ESM centralizado, jobs no críticos deshabilitados y arranque dinámico de jobs con espera de 15 segundos. Se actualizaron dichas pruebas sin reducir la cobertura de comportamiento. La nueva ejecución completa finalizó correctamente con **99 archivos y 1,620 pruebas aprobadas**.

## Validación TypeScript segmentada

Se sustituyó el chequeo monolítico por `check:server` y `check:client`, con proyectos TypeScript independientes y archivos incrementales separados. El servidor valida con 1.5 GB y el cliente con 2 GB, evitando el agotamiento de memoria del proceso global. Esta validación expuso y permitió corregir imports React duplicados en `JobPositions` y `JobEditDialog`, además de incorporar una declaración local para la importación dinámica de `html-pdf-node`. Ambos chequeos terminan actualmente sin errores.

## Remediación de dependencias críticas

La actualización controlada de `puppeteer`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` y `@tailwindcss/vite` eliminó las cinco vulnerabilidades críticas iniciales. También se retiró `html-pdf-node`, que arrastraba una versión obsoleta de Puppeteer y de `node-fetch`; el generador de PDF usa ahora Puppeteer 25 mediante importación dinámica y el Chromium configurado para el entorno. La auditoría actual reporta **0 vulnerabilidades críticas** y 54 altas. Las altas restantes se mantienen como trabajo P1, ya que incluyen cadenas de herramientas y librerías cuya actualización mayor requiere revisión funcional específica.

### Actualización de superficie de dependencias

Las actualizaciones de tRPC, Axios, Drizzle, Multer, `express-rate-limit` y Vite, junto con la separación de las herramientas Vite del runtime de producción, redujeron los hallazgos altos de 54 a **24** y mantuvieron el conteo crítico en **0**. Los hallazgos restantes se concentran en `xlsx`, cuya versión actual no tiene corrección publicada, y en cadenas transitivas con recomendaciones de versión no disponibles para sus paquetes padres. Como control compensatorio, la importación XLSX quedó limitada a 10 MB, extensiones XLSX/CSV y lectura sin fórmulas, HTML de celda ni VBA; las dependencias de build ya no se incluyen en el contenedor de producción.

## Métricas verificables

Se eliminaron las series demostrativas del router de dashboard y de la página de reportes. Las tarjetas y gráficas consumen ahora conteos persistidos de empleados activos, respuestas NOM-035 concluidas, asignaciones de capacitación, casos y cursos publicados. Cuando aún no existen registros suficientes, la interfaz muestra un estado explícito de ausencia; no presenta porcentajes, tendencias ni valores de referencia simulados.

El dashboard de instructor tampoco genera fechas, confirmaciones o calificaciones ficticias. Mientras el modelo no almacene sesiones programadas, inscripciones y evaluaciones de curso, los procedimientos retornan colecciones vacías o “N/D”, y la interfaz comunica esa ausencia de datos.

## Observabilidad inicial

Se incorporó `server/_core/logger.ts` para emitir eventos JSON sin datos sensibles. Los primeros flujos migrados son la cola y envío SMTP, las notificaciones posteriores a exportaciones clínicas y el cierre de Chromium en generación PDF. Los fallos no bloqueantes ya no se descartan silenciosamente y quedan identificados por un nombre de evento estable.

## Contratos de dominio reforzados

La importación masiva de empleados ahora procesa celdas mediante un contrato explícito, valida identificadores opcionales y utiliza los nombres canónicos de departamento y puesto. En los reportes agregados de encuestas NOM-035 se reemplazaron conversiones `any` por arreglos numéricos y una unión explícita de las guías II y III. Estas modificaciones se validaron con los chequeos TypeScript segmentados y 16 pruebas focalizadas aprobadas.

La persistencia de respuestas de encuesta ahora usa una conexión Drizzle no nullable y resultados serializables explícitos; además, los tokens anónimos y autenticados se actualizan sin coerciones de tipo. La validación posterior de servidor y cliente concluyó sin errores.

## Modularización priorizada, UX y rendimiento

La primera fase de modularización extrajo las visualizaciones de distribución y tendencia de `JobPositions` a componentes tipados en `client/src/components/job-positions/`, y concentró los aliases heredados de navegación en `client/src/routes/legacyRedirects.ts`. Esta reducción mantiene los contratos tRPC y de rutas sin cambios de comportamiento. Los controles de JobPositions ahora exponen nombres accesibles, grupos semánticos y estado `aria-pressed`.

El motor ELK del organigrama se importa solo cuando el usuario solicita calcular la vista, y Vite incorpora un presupuesto visible de 900 KB por chunk para alertar en compilación sobre regresiones de tamaño. La siguiente separación de routers o páginas extensas debe realizarse junto con cambios funcionales del dominio correspondiente para evitar refactors masivos sin cobertura de flujo.

## Secuencia de cierre de todo.md

1. Resolver P0 de seguridad, validación TypeScript, navegación e integridad de datos.
2. Recuperar una suite de pruebas confiable y sustituir datos simulados por fuentes reales o estados de ausencia explícitos.
3. Corregir contratos de desplegables, observabilidad y tipado de los dominios de mayor tráfico.
4. Modularizar archivos extensos y establecer presupuestos de bundle, memoria y cobertura antes de nuevas funcionalidades.
