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
