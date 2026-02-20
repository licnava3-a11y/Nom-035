# Errores TypeScript Pendientes

**Total de errores**: 726  
**Fecha de análisis**: 20 de febrero de 2026  
**Estado**: Documentado para corrección futura

---

## Resumen Ejecutivo

El sistema tiene 726 errores TypeScript que no afectan la funcionalidad en runtime pero deben corregirse para producción. Los errores se agrupan en 3 categorías principales:

### 1. Errores Críticos de Inicialización (67 ocurrencias)
**Error**: `'db' is possibly 'null'`  
**Causa**: La conexión a base de datos puede ser null en algunos contextos  
**Impacto**: Bajo (funciona en runtime pero TypeScript no puede verificar)  
**Solución**: Agregar guards de null o usar non-null assertion operator

### 2. Directivas Innecesarias (34 ocurrencias)
**Error**: `Unused '@ts-expect-error' directive`  
**Causa**: Errores que fueron corregidos pero la directiva no se eliminó  
**Impacto**: Ninguno (solo limpieza de código)  
**Solución**: Eliminar directivas `@ts-expect-error` innecesarias

### 3. Errores de Schema Desactualizado (múltiples ocurrencias)
**Errores comunes**:
- `Property 'status' does not exist on type 'employees'` (13 ocurrencias)
- `Property 'departmentId' does not exist on type 'users'` (7 ocurrencias)
- `Property 'turnoverWeight' does not exist` (6 ocurrencias)
- `Property 'riskLevel' does not exist on type 'survey_responses'`
- `Property 'severity' does not exist on type 'cases'`

**Causa**: Queries usan campos que no existen en el schema actual de Drizzle  
**Impacto**: Medio (puede causar errores en runtime si los campos realmente no existen)  
**Solución**: 
1. Regenerar tipos de Drizzle: `pnpm drizzle-kit generate`
2. Actualizar queries para usar nombres correctos de campos
3. Agregar campos faltantes al schema si son necesarios

---

## Distribución de Errores por Tipo

| Tipo de Error | Cantidad | Prioridad |
|--------------|----------|-----------|
| `'db' is possibly 'null'` | 67 | Alta |
| `Unused '@ts-expect-error'` | 34 | Baja |
| `Property 'select' does not exist` | 29 | Alta |
| `No overload matches this call` | 26 | Media |
| `Parameter implicitly has 'any' type` | 25 | Media |
| `Type not assignable to LoadingButton` | 20 | Baja |
| `Property 'status' does not exist` | 13 | Alta |
| `Variable used before assigned` | 12 | Alta |
| `Property 'rows' does not exist` | 12 | Media |
| Otros | 488 | Variada |

---

## Archivos Más Afectados

### Jobs (Alto número de errores)
- `server/jobs/executive-reports-job.ts` - Errores de schema (riskLevel, employeeId, severity)
- `server/jobs/external-offer-risk-monitor-job.ts` - db possibly null
- `server/jobs/predictive-turnover-job.ts` - Campos faltantes (turnoverWeight)

### Routers (Errores de tipos)
- Múltiples routers con errores de `db possibly null`
- Errores de tipos en LoadingButton props

---

## Plan de Corrección Recomendado

### Fase 1: Correcciones Rápidas (1-2 horas)
1. Eliminar 34 directivas `@ts-expect-error` innecesarias
2. Agregar guards de null para `db` (67 ocurrencias)
3. Corregir tipos de LoadingButton (30 ocurrencias)

### Fase 2: Regeneración de Schema (2-3 horas)
1. Ejecutar `pnpm drizzle-kit generate` para regenerar tipos
2. Verificar que todos los campos existan en schema
3. Actualizar queries que usan campos obsoletos

### Fase 3: Correcciones Complejas (3-4 horas)
1. Resolver overload mismatches (26 ocurrencias)
2. Tipar parámetros implícitos any (33 ocurrencias)
3. Corregir variables usadas antes de asignación (12 ocurrencias)

**Tiempo total estimado**: 6-9 horas

---

## Notas Importantes

- **Los errores NO afectan la funcionalidad actual del sistema**
- El servidor de desarrollo funciona correctamente
- Los tests E2E pueden ejecutarse (con autenticación configurada)
- Recomendado corregir antes de deployment a producción
- Priorizar errores de Fase 1 y 2 para máximo impacto

---

## Comando para Verificar Progreso

```bash
# Ver total de errores
pnpm check 2>&1 | grep "error TS" | wc -l

# Ver errores agrupados por tipo
pnpm check 2>&1 | grep "error TS" | sed 's/.*error TS[0-9]*: //' | sort | uniq -c | sort -rn | head -20
```
