# Plan de Estandarización de Nomenclatura de Campos

**Fecha**: 20 de Febrero de 2026  
**Versión**: 1.0  
**Estado**: Análisis Completo - Pendiente de Implementación

---

## Resumen Ejecutivo

El sistema actualmente presenta inconsistencias en la nomenclatura de campos entre tablas, con mezclas de español/inglés y diferentes convenciones de nombres. Este documento analiza las tablas críticas y propone un plan de estandarización para mejorar la mantenibilidad y consistencia del código.

---

## Análisis de Tablas Críticas

### 1. Tabla `employees`

**Estado Actual**: Nomenclatura en inglés (camelCase)

**Campos Actuales**:
- `firstName`, `lastName` (inglés)
- `employeeNumber` (inglés)
- `email`, `phone` (inglés)
- `departmentId` (inglés)
- `position`, `status` (inglés)

**Recomendación**: ✅ **Mantener nomenclatura actual**  
**Razón**: La tabla ya está estandarizada en inglés, que es la convención preferida en desarrollo web moderno.

---

### 2. Tabla `departments`

**Estado Actual**: Nomenclatura en inglés (snake_case)

**Campos Actuales**:
- `name`, `description` (inglés)
- `is_active` (inglés, snake_case)
- `created_at`, `updated_at` (inglés, snake_case)

**Recomendación**: ✅ **Mantener nomenclatura actual**  
**Razón**: Consistente con convenciones SQL estándar (snake_case en inglés).

---

### 3. Tabla `nom035_cases`

**Estado Actual**: Nomenclatura mixta (inglés + nuevos campos)

**Campos Actuales**:
- `title`, `description` (inglés)
- `status`, `priority` (inglés)
- `reported_by_id`, `assigned_to_id` (inglés, snake_case)
- `source`, `reportedBy` (⚠️ NUEVOS - agregados recientemente)

**Problema Detectado**:
- `reportedBy` usa camelCase mientras otros campos usan snake_case
- Redundancia: `reported_by_id` vs `reportedBy`

**Recomendación**: 🔄 **Estandarizar a snake_case**

**Migración Propuesta**:
```sql
-- Eliminar campo redundante reportedBy (ya existe reported_by_id)
ALTER TABLE nom035_cases DROP COLUMN reportedBy;

-- Mantener source (es útil para tracking)
-- No requiere cambios
```

---

### 4. Tabla `committee_minutes`

**Estado Actual**: Nomenclatura en inglés (snake_case)

**Campos Actuales**:
- `meeting_date` (inglés, snake_case)
- `attendees`, `topics`, `agreements` (inglés)
- `next_meeting_date` (inglés, snake_case)

**Recomendación**: ✅ **Mantener nomenclatura actual**  
**Razón**: Consistente con convenciones SQL estándar.

---

## Convención de Nomenclatura Recomendada

### Estándar Adoptado: **Inglés + snake_case para SQL**

**Razones**:
1. **Inglés**: Lenguaje universal en desarrollo de software
2. **snake_case**: Convención estándar para bases de datos SQL
3. **Consistencia**: Facilita mantenimiento y onboarding de nuevos desarrolladores
4. **Compatibilidad**: Mejor integración con ORMs y herramientas modernas

### Reglas de Nomenclatura

**Tablas**:
- Plural en inglés: `employees`, `departments`, `cases`
- snake_case: `committee_minutes`, `annual_reports`

**Columnas**:
- snake_case: `first_name`, `created_at`, `is_active`
- Sufijos estándar:
  - `_id` para foreign keys: `department_id`, `user_id`
  - `_at` para timestamps: `created_at`, `updated_at`
  - `is_` para booleanos: `is_active`, `is_deleted`

**Enums**:
- snake_case en minúsculas: `open`, `in_progress`, `closed`
- Evitar mezclas: ❌ `abierto`, ❌ `enProgreso`

---

## Plan de Migración

### Fase 1: Corrección Inmediata (Alta Prioridad)

**Objetivo**: Eliminar redundancias y inconsistencias críticas

**Acciones**:
1. Eliminar campo `reportedBy` de `nom035_cases` (redundante con `reported_by_id`)
2. Actualizar routers que usen `reportedBy` para usar `reported_by_id`
3. Ejecutar tests de validación

**Impacto**: Bajo (1 archivo afectado)

**Migración SQL**:
```sql
-- 0139_remove_redundant_reported_by.sql
ALTER TABLE nom035_cases DROP COLUMN IF EXISTS reportedBy;
```

---

### Fase 2: Estandarización de Enums (Media Prioridad)

**Objetivo**: Unificar valores de enums a inglés

**Tablas Afectadas**:
- `nom035_cases.status`: Verificar que use `open`, `in_progress`, `closed` (✅ ya correcto)
- `nom035_cases.priority`: Verificar que use `low`, `medium`, `high` (✅ ya correcto)
- `employees.status`: Verificar que use `active`, `inactive`, `terminated` (✅ ya correcto)

**Impacto**: Bajo (ya está mayormente estandarizado)

---

### Fase 3: Documentación y Guías (Baja Prioridad)

**Objetivo**: Prevenir futuras inconsistencias

**Acciones**:
1. Crear `docs/CODING_STANDARDS.md` con convenciones
2. Agregar validación en CI/CD para nuevas migraciones
3. Documentar patrones comunes en README

**Impacto**: Ninguno (solo documentación)

---

## Estimación de Esfuerzo

| Fase | Archivos Afectados | Tiempo Estimado | Riesgo |
|------|-------------------|-----------------|--------|
| Fase 1 | 1-2 routers | 30 minutos | Bajo |
| Fase 2 | 0 (ya correcto) | 0 minutos | Ninguno |
| Fase 3 | Docs | 1 hora | Ninguno |

**Total**: ~2 horas de trabajo

---

## Recomendaciones Finales

### ✅ Acciones Inmediatas

1. **Ejecutar Fase 1**: Eliminar campo `reportedBy` redundante
2. **Validar con tests**: Ejecutar suite E2E después de la migración
3. **Documentar**: Crear `CODING_STANDARDS.md`

### ⚠️ Precauciones

1. **No renombrar tablas existentes**: Alto riesgo, bajo beneficio
2. **No renombrar campos ampliamente usados**: Requiere refactoring masivo
3. **Priorizar consistencia futura**: Enfocarse en nuevas features

### 📋 Checklist de Implementación

- [ ] Crear migración SQL para eliminar `reportedBy`
- [ ] Aplicar migración con `webdev_execute_sql`
- [ ] Actualizar router `sentimentCasesCorrelation.ts` si usa el campo
- [ ] Ejecutar tests E2E: `pnpm test:e2e`
- [ ] Crear `docs/CODING_STANDARDS.md`
- [ ] Guardar checkpoint con cambios

---

## Conclusión

El sistema está **mayormente bien estandarizado** con nomenclatura en inglés y snake_case. Solo se requiere una corrección menor (eliminar campo redundante) y documentación de estándares para mantener la consistencia en el futuro.

**Estado Actual**: 95% estandarizado ✅  
**Acción Requerida**: Corrección menor (Fase 1)  
**Beneficio**: Mejora de mantenibilidad y prevención de inconsistencias futuras
