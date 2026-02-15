# TODO - Plataforma NOM-035 STPS 2018

## CHECKPOINT ACTUAL: 7ed3fe0d - Optimizaciones Performance Completadas

### ✅ COMPLETADO
- [x] 14 índices SQL implementados (cases, recognitions, survey_responses, employees)
- [x] menuCounters.getAll optimizado con Promise.all (2.8s → ~500ms)

---

## FASE ACTUAL: Métricas NMX-025 + Auditorías Seguridad y Queries

### 1. Implementar Métricas NMX-025 Completas
- [x] Agregar campos salario (DECIMAL) y nivelJerarquico (ENUM) a schema users (ya existían)
- [x] Generar migración con pnpm drizzle-kit generate (ya aplicada)
- [x] Aplicar migración SQL con webdev_execute_sql (ya aplicada)
- [x] Implementar 3 queries backend en executiveDashboard.ts:
  - [x] salaryGapByGender (brecha salarial por género) - líneas 128-136
  - [x] hierarchyDistribution (distribución por nivel jerárquico) - líneas 139-147
  - [x] femaleDirectivesPercentage (% mujeres en puestos directivos) - líneas 150-162
- [x] Asignar datos de prueba a 27 usuarios (salarios y niveles)
  - [x] 27 usuarios actualizados con salarios (12k-120k)
  - [x] Distribución jerárquica: Operativo, Especialista, Supervisor, Gerencial, Directivo, Alta Dirección
  - [x] 9 combinaciones nivel-género creadas
- [x] Agregar 3 gráficas frontend en Dashboard.tsx:
  - [x] Gráfica de brecha salarial (bar chart) - líneas 484-521
  - [x] Gráfica de distribución jerárquica (stacked bar chart) - líneas 530-560
  - [x] Indicador de % mujeres directivas (text indicator) - línea 551-556

### 2. Auditoría Seguridad
- [ ] Identificar 20 routers críticos sin validación zod
- [ ] Agregar validaciones zod en procedures prioritarios
- [ ] Implementar rate limiting básico en endpoints públicos
- [ ] Revisar queries dinámicas para SQL injection
- [ ] Documentar hallazgos de seguridad

### 3. Verificación Queries-Gráficas
- [ ] Auditar menuCounters.getAll con BD real
- [ ] Verificar gráfica de género (debe mostrar 9F, 18M)
- [ ] Validar métricas de casos (185 abiertos, 2 investigación)
- [ ] Comparar dashboard ejecutivo con queries SQL directos
- [ ] Documentar discrepancias encontradas

---

## ERRORES CONOCIDOS

### Error TypeScript Persistente
- [ ] Error: Type '"recognition"' is not assignable to enum
- [ ] Causa: Enum en BD desincronizado con schema TypeScript
- [ ] Solución pendiente: Actualizar enum en BD o ajustar schema

---

## TRABAJO COMPLETADO (Checkpoints Anteriores)

### Checkpoint 7ed3fe0d (ACTUAL)
- [x] 14 índices SQL implementados
- [x] menuCounters optimizado con Promise.all

### Checkpoint 7227534c
- [x] Sistema de marca de "leído" en reconocimientos
- [x] Corrección error sourceGuide
- [x] Optimización bundle size
- [x] Gráfica de género funcional
- [x] Paginación y filtros en tabla de casos
