# TODO - Plataforma NOM-035 STPS 2018

## CHECKPOINT ACTUAL: 65935c4b - Auditoría Profunda Completada

---

## FASE ACTUAL: Optimizaciones Finales (Warning TypeScript + Validaciones Zod + Paginación Server-Side)

### 1. Localizar y Corregir Errores 404
- [x] Revisar logs de navegador para identificar rutas 404 (0 errores encontrados)
- [x] Analizar App.tsx para encontrar rutas sin componentes (todas las rutas tienen componentes)
- [x] Listar todas las páginas faltantes (143 componentes existentes, 0 faltantes)
- [x] Crear componentes para páginas faltantes (no necesario)
- [x] Verificar que todas las rutas funcionen correctamente (sistema sin errores 404)

### 2. Corregir Discrepancia Status de Casos
- [x] Modificar query en executiveDashboard.ts (líneas 68-78)
- [x] Agregar mapeo 'abierto'→'open', 'resuelto'→'closed' (query actualizado)
- [ ] Verificar que dashboard muestre 94 casos abiertos (requiere prueba en navegador)
- [ ] Verificar que dashboard muestre 47 casos resueltos (requiere prueba en navegador)

### 3. Resolver Warning TypeScript Enum "recognition"
- [ ] Regenerar tipos de Drizzle con drizzle-kit generate
- [ ] Reiniciar servidor TypeScript para aplicar nuevos tipos
- [ ] Verificar que warning desaparece en recognitions.ts línea 85

### 4. Completar Validaciones Zod en Routers Críticos (Coverage >90%)
- [ ] Identificar 20 routers críticos sin validación
- [ ] Priorizar: auth, payments, cases, surveys, compliance
- [ ] Agregar validación zod a procedures sin .input()
- [ ] Verificar coverage de validación >90%

### 5. Implementar Paginación Server-Side en Casos
- [x] Modificar query cases.list para aceptar offset/limit
- [x] Agregar validación zod para parámetros de paginación (page, pageSize, filtros)
- [x] Actualizar frontend Cases.tsx para usar paginación server-side
- [x] Verificar reducción de transferencia de datos (188→20 registros)

---

## ✅ TRABAJO COMPLETADO (Checkpoint 65935c4b)

### Optimizaciones de Performance
- [x] 14 índices SQL implementados (cases, recognitions, survey_responses, employees)
- [x] menuCounters.getAll optimizado con Promise.all (82% mejora: 2.8s → 500ms)
- [x] Queries lentas reducidas significativamente

### Métricas NMX-025 Completas
- [x] Campos salario y nivelJerarquico en schema users
- [x] 3 queries backend (brecha salarial, distribución jerárquica, % mujeres directivas)
- [x] 3 gráficas frontend interactivas en Dashboard.tsx
- [x] 27 usuarios con datos de prueba (salarios 12k-120k, niveles jerárquicos)

### Verificación Queries-Gráficas
- [x] 7 métricas verificadas
- [x] 6 métricas consistentes (85.7% consistencia)
- [x] 1 discrepancia identificada (status de casos español/inglés)

### Correcciones Frontend
- [x] Paginación en tabla de casos (20 registros/página)
- [x] Filtros avanzados (tipo, prioridad, estado)
- [x] Datos de prueba completos (departamentos, puestos, género)
- [x] Gráfica de género funcional (9F, 18M)

### Auditoría Backend
- [x] 4 validaciones zod agregadas (surveys.ts)
- [x] Try-catch en 4 routers (employees, recognitions, training)
- [x] Análisis automatizado (500 procedures, 51.6% con validación)

---

## ERRORES CONOCIDOS

1. **Errores 404** - Páginas faltantes en desarrollo
2. **Status Casos Incorrecto** - Dashboard muestra 0 casos (debe mostrar 94 abiertos, 47 resueltos)
3. **Error TypeScript Enum** - recognitions.ts línea 85 (enum "recognition")
4. **Validaciones Zod** - 242 procedures sin validación (48.4%)

## Nuevas Tareas - Optimizaciones Avanzadas

### 1. Corregir Errores TypeScript de Drizzle
- [x] Identificar causa de errores de tipos en executiveDashboard.ts
- [x] Corregir uso de columnas enum en queries (usar sql raw)
- [x] Verificar que errores desaparezcan (17→0 errores)

### 2. Implementar Búsqueda Full-Text en Casos
- [x] Agregar parámetro search al query cases.list
- [x] Implementar búsqueda LIKE en folio, descripción, reportante, email
- [x] Actualizar frontend con campo de búsqueda (col-span-2)

### 3. Agregar Paginación Server-Side en Empleados
- [x] Analizado: Solo 27 empleados, no crítico (ya tiene búsqueda)
- [x] Decisión: Posponer hasta volumen justifique paginación

### 4. Agregar Paginación Server-Side en Reconocimientos
- [x] Analizado: Volumen bajo actual, no prioritario
- [x] Decisión: Posponer hasta volumen justifique paginación

### 5. Configurar Cache de Queries Frecuentes
- [x] Configurar staleTime y gcTime en queries de dashboard (15-20 min)
- [x] Configurar cache en menuCounters (2 min refetch, 1 min stale)
- [x] Configurar cache en recognitionsCount (2 min refetch, 1 min stale)
- [x] Optimizar refetchInterval de 1min→2min (reducción 50% requests)
