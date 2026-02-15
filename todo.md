# TODO - Plataforma NOM-035 STPS 2018

## TAREAS ACTUALES (Auditoría Profunda)

### Corrección Error TypeScript Enum
- [x] Verificar enum notification_type en schema.ts (incluye "recognition" en línea 444)
- [x] Regenerar tipos de Drizzle (no necesario, schema correcto)
- [x] Reiniciar servidor para sincronizar tipos
- [x] Verificar que error desaparece en recognitions.ts línea 86 (resuelto)

### Filtros Avanzados en Tabla de Casos
- [x] Agregar filtro por tipo de caso (mobbing, burnout, violence, stress, other)
- [x] Agregar filtro por prioridad (baja, media, alta, crítica)
- [x] Agregar filtro por estado (abierto, investigación, resuelto, cerrado)
- [x] Implementar lógica de filtrado combinado con paginación (useMemo)
- [x] Agregar botón "Limpiar filtros" (resetea todos los filtros y página)

### Auditoría Backend
- [x] Revisar todos los routers en server/routers/*.ts (71 routers, 500 procedures)
- [x] Verificar validaciones de entrada (258/500 con zod, 242 sin validación)
- [x] Identificar queries N+1 y optimizar (2 archivos: compliance.ts, documentFormats.ts)
- [x] Revisar manejo de errores y mensajes (agregado try-catch en 4 routers)
- [x] Verificar permisos y autorización en procedures (usa protectedProcedure correctamente)

### Correcciones Backend Implementadas
- [x] Agregar validación zod a 4 procedures en surveys.ts (getAll, getApplicableGuide, getDepartments, getRecommendedGuides)
- [x] Agregar try-catch en employees.ts (create, update, deactivate)
- [x] Agregar try-catch en recognitions.ts (create con manejo no bloqueante de notificaciones)
- [x] Agregar try-catch en training.ts (3 procedures)
- [x] Agregar import TRPCError en training.ts

### Auditoría Performance
- [ ] Analizar queries lentas en logs
- [ ] Optimizar queries con joins innecesarios
- [ ] Implementar índices faltantes en base de datos
- [ ] Revisar re-renders innecesarios en componentes
- [ ] Optimizar imágenes y assets

### Auditoría Seguridad
- [ ] Verificar validación de entrada en todos los endpoints
- [ ] Revisar protección contra SQL injection
- [ ] Verificar protección contra XSS
- [ ] Revisar manejo de sesiones y tokens
- [ ] Verificar permisos de acceso a recursos

### Auditoría Bugs
- [ ] Probar todos los flujos principales
- [ ] Verificar estados vacíos y errores
- [ ] Probar formularios con datos inválidos
- [ ] Verificar responsividad en móvil
- [ ] Probar navegación entre páginas

---

## FASE 134-136: Mejoras Prioritarias de Optimización y UX (COMPLETADAS)

### FASE 134: Sistema de Marca de "Leído" en Reconocimientos
- [x] Agregar campo `readAt` (timestamp nullable) en tabla recognitions
- [x] Modificar query getUnreadCount para filtrar solo readAt IS NULL
- [x] Crear procedimiento markAsRead(recognitionId)
- [x] Agregar botón "Marcar como leído" en cards de reconocimientos
- [x] Implementar auto-marcado al abrir detalle de reconocimiento (useEffect con límite 5)
- [x] Actualizar badge automáticamente después de marcar como leído

### FASE 135: Corrección Error sourceGuide en Acciones Correctivas
- [x] Modificar schema correctiveActions: cambiar sourceGuide a source_guide (snake_case)
- [x] Regenerar migración con pnpm drizzle-kit generate
- [x] Aplicar migración SQL con webdev_execute_sql
- [x] Verificar que job de recordatorios funcione sin errores

### FASE 136: Optimización Bundle Size
- [x] Analizar dependencias pesadas con pnpm why recharts chart.js d3 xlsx
- [x] Optimizar vite.config.ts con manualChunks separados por vendor
- [x] Separar recharts en vendor-charts-recharts
- [x] Separar chart.js en vendor-charts-chartjs
- [x] Agregar vendor-i18n para i18next
- [x] Verificar que xlsx ya tiene lazy loading (dynamic import en ImportMassiveData.tsx)
- [ ] Medir bundle size antes y después (requiere build completo)
- [x] Verificar que todas las páginas carguen correctamente

### Correcciones Auditoría Frontend
- [x] Asignar departamentos y puestos a 19 empleados de prueba
- [x] Implementar paginación en tabla de casos (20 registros por página)
- [x] Agregar controles de navegación (Anterior/Siguiente)
- [x] Optimizar imports de Recharts para tree-shaking

---

## FASE 96: Corrección de Errores TypeScript y Mejoras al Dashboard Financiero

### Corrección de Errores TypeScript
- [x] Corregir 10 errores TypeScript en investigations.ts y surveys.ts
- [x] Agregar tipos explícitos para parámetros 'input' en investigations.ts
- [x] Corregir error 'publicProcedure is not defined' en investigations.ts
- [x] Agregar non-null assertion para ctx.user en surveys.ts línea 302

### Dashboard Financiero - Filtros Avanzados
- [x] Agregar filtro por departamento en DashboardAdministrativo.tsx
- [x] Agregar filtro por categoría (facturas, órdenes, solicitudes)
- [x] Implementar selector de rango de fechas personalizado
- [x] Actualizar gráfico Chart.js con datos filtrados

### Dashboard Financiero - Exportación
- [x] Implementar exportación a Excel del dashboard financiero
- [x] Implementar exportación a PDF del dashboard financiero
- [x] Agregar botones de exportación en la interfaz
- [x] Incluir datos de KPIs y gráfico en exportación


## BUG REPORTADO: Distribución de Género Sin Datos

### Investigación y Corrección
- [x] Verificar si existe campo `gender` o `genero` en tabla `users` (campo `sexo` existe)
- [x] Verificar si empleados de prueba tienen género asignado (todos tenían NULL)
- [x] Revisar query del componente de gráfica de género (query correcto)
- [x] Verificar correlación con otras gráficas del dashboard (no correlacionada)
- [x] Corregir datos de prueba (asignado 9 Femenino, 18 Masculino)
- [x] Verificar gráfica funcionando correctamente (RESUELTO)


## NUEVAS TAREAS: Validación Sexo, Métricas NMX-025 y Auditoría Completa

### Tarea 1: Campo Sexo Obligatorio
- [x] Agregar validación zod en procedure employees.create (sexo obligatorio)
- [x] Agregar campo sexo en procedure employees.update (opcional)
- [x] Marcar campo sexo como requerido en formulario EmployeeNew.tsx
- [x] Agregar validación en frontend antes de enviar (validateForm)
- [x] Agregar Select con opciones Masculino/Femenino/Otro
- [ ] Probar creación de empleado sin sexo (debe fallar con error)

### Tarea 2: Métricas NMX-025 Adicionales
- [x] Agregar campos salario y nivelJerarquico a schema users
- [x] Generar y aplicar migración SQL
- [x] Implementar query de brecha salarial por género (salaryGapByGender)
- [x] Implementar query de distribución por nivel jerárquico (hierarchyDistribution)
- [x] Implementar query de porcentaje de mujeres en puestos directivos (femaleDirectivesPercentage)
- [x] Asignar datos de prueba (salarios y niveles jerárquicos)
- [x] Agregar gráficas en dashboard ejecutivo frontend (3 gráficas nuevas)
- [x] Gráfica de brecha salarial por género con cálculo de porcentaje
- [x] Gráfica de distribución por nivel jerárquico (Masculino vs Femenino)
- [x] Indicador de porcentaje de mujeres en puestos directivos
- [ ] Verificar datos con base de datos real

### Tarea 3: Auditoría Performance
- [ ] Analizar queries lentas en logs (.manus-logs/)
- [ ] Identificar índices faltantes en base de datos
- [ ] Revisar re-renders innecesarios con React DevTools
- [ ] Optimizar imágenes y assets pesados
- [ ] Implementar lazy loading adicional si necesario

### Tarea 4: Auditoría Seguridad
- [ ] Verificar validación de entrada en 242 procedures sin zod
- [ ] Revisar protección contra SQL injection en queries dinámicas
- [ ] Implementar rate limiting en endpoints públicos
- [ ] Validar permisos en procedures críticos
- [ ] Probar XSS en campos de texto

### Tarea 5: Auditoría Queries y Gráficas
- [ ] Verificar query de "Total Empleados" (debe ser 27)
- [ ] Verificar query de "Casos Abiertos" (debe ser 185)
- [ ] Verificar query de "Distribución por Departamento"
- [ ] Verificar query de "Distribución de Género" (9F, 18M)
- [ ] Verificar query de "Tendencia de Factores de Riesgo"
- [ ] Verificar query de "Cobertura Encuestas" (debe ser 100%)
- [ ] Comparar todas las métricas con base de datos real
- [ ] Documentar discrepancias encontradas
- [ ] Corregir queries incorrectos
