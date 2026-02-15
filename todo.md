# TODO - Plataforma NOM-035 STPS 2018

## CHECKPOINT ACTUAL: 65935c4b - Auditoría Profunda Completada

---

## FASE ACTUAL: Corrección Errores 404 + Validaciones Críticas

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

### 3. Resolver Error TypeScript Enum "recognition"
- [ ] Verificar enum actual en base de datos MySQL
- [ ] Ejecutar ALTER TABLE para agregar 'recognition' al enum
- [ ] Regenerar tipos de Drizzle
- [ ] Verificar que error desaparece en recognitions.ts línea 85

### 4. Completar Validaciones Zod en 20 Routers Críticos
- [ ] Identificar 20 routers críticos sin validación
- [ ] Priorizar: auth, payments, cases, surveys
- [ ] Agregar validación zod a procedures sin .input()
- [ ] Verificar coverage de validación >80%

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
