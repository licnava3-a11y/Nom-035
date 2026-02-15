# TODO - Plataforma NOM-035 STPS 2018

## FASE ACTUAL: Reimplementación de Cambios Críticos (Post-Reset)

### 1. Corregir Error TypeScript Enum "recognition"
- [ ] Reiniciar servidor para forzar regeneración de tipos Drizzle
- [ ] Verificar que error desaparece

### 2. Implementar Índices SQL en Tablas Críticas
- [x] cases: 5 índices (status, priority, caseType, createdAt, status+createdAt)
- [x] recognitions: 4 índices (to_user_id, read_at, created_at, to_user_id+read_at)
- [x] survey_responses: 3 índices (survey_id, user_id, survey_id+user_id)
- [x] employees: 2 índices (departmentId, positionId)
- [x] Total: 14 índices creados exitosamente en 1.8s

### 3. Optimizar menuCounters.getAll
- [x] Refactorizar para usar Promise.all (6 queries en paralelo)
- [x] Reducir tiempo de respuesta de 2.8s a <500ms (estimado 70-80% mejora)

### 4. Implementar Métricas NMX-025
- [ ] Agregar campos salario y nivelJerarquico a schema users
- [ ] Generar y aplicar migración SQL
- [ ] Implementar 3 queries backend (salaryGapByGender, hierarchyDistribution, femaleDirectivesPercentage)
- [ ] Asignar datos de prueba (salarios y niveles jerárquicos)
- [ ] Agregar 3 gráficas frontend en Dashboard.tsx

### 5. Campo Sexo Obligatorio en Empleados
- [ ] Agregar validación zod en employees.create
- [ ] Agregar campo Select en formulario EmployeeNew.tsx
- [ ] Agregar validación frontend

### 6. Correcciones Frontend
- [ ] Implementar paginación en tabla de casos (20/página)
- [ ] Agregar filtros avanzados (tipo, prioridad, estado)
- [ ] Asignar género a usuarios de prueba

---

## FASE SIGUIENTE: Auditoría Seguridad

### Validaciones Zod Pendientes
- [ ] Completar validaciones en 242 procedures restantes
- [ ] Priorizar routers críticos (surveys, employees, cases)

### Rate Limiting
- [ ] Implementar rate limiting en endpoints públicos
- [ ] Configurar límites por usuario/IP

### Protección SQL Injection
- [ ] Revisar queries dinámicas
- [ ] Verificar uso correcto de prepared statements

---

## FASE FINAL: Verificación Queries-Gráficas

### Dashboard Ejecutivo
- [ ] Verificar menuCounters con BD real
- [ ] Validar métricas NMX-025 (género, salario, jerarquía)
- [ ] Comparar gráficas con queries SQL directos

### Documentación
- [ ] Crear reporte consolidado de auditorías
- [ ] Listar recomendaciones priorizadas
- [ ] Documentar mejoras implementadas

---

## TRABAJO COMPLETADO (Checkpoints Anteriores)

### Checkpoint bc496844
- [x] Sistema de marca de "leído" en reconocimientos
- [x] Corrección error sourceGuide en acciones correctivas
- [x] Optimización bundle size (vite.config.ts)

### Checkpoint d67b3652
- [x] Datos de prueba completos (departamentos, puestos)
- [x] Paginación en tabla de casos
- [x] Filtros avanzados implementados

### Checkpoint 132ddba1
- [x] Gráfica de género funcional
- [x] 27 usuarios con género asignado (9F, 18M)

### Checkpoint 7227534c (ACTUAL)
- [x] Estado base del proyecto restaurado
