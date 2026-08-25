# Páginas con Confirmaciones Pendientes

## Estado Actual: 10/28 páginas (36%)

### ✅ Páginas con Confirmaciones Implementadas (10)

1. ✅ CommitteeMinutesManagement - Confirmación antes de eliminar minuta
2. ✅ DepartmentManagement - Confirmación antes de eliminar departamento
3. ✅ AssessmentsManagement - Confirmación antes de eliminar evaluación
4. ✅ ExpenseRequests - Confirmación antes de eliminar solicitud de gasto
5. ✅ EfirmaSAT - Confirmación antes de eliminar certificado digital
6. ✅ CommitteeTrainingsManagement - Confirmación antes de eliminar capacitación
7. ✅ DocumentFormats - Confirmación antes de eliminar formato
8. ✅ EmployeeDocuments - Confirmación antes de eliminar documento
9. ✅ CommitteeAnnualReports - Confirmación antes de eliminar reporte anual
10. ✅ Departments - Confirmación antes de eliminar departamento (AlertDialog ya existía)

---

## 📋 Páginas Pendientes con Acciones Destructivas (18)

### Prioridad Alta 🔴 (6 páginas)

1. **BudgetPlannerDashboard** - Eliminar escenario presupuestal
   - Función: `deleteScenario.mutate({ scenarioId })`
   - Impacto: Elimina escenario completo con proyecciones

2. **EvidencesFolder** - Eliminar evidencia
   - Función: `handleDeleteEvidence(evidenceId)`
   - Impacto: Elimina archivo de evidencia legal

3. **JobProfileManagement** - Eliminar perfil de puesto
   - Función: `handleDelete(id)`
   - Impacto: Elimina perfil de puesto completo

4. **Cases** (NOM-035) - Eliminar caso (si existe)
   - Verificar si tiene función de eliminación
   - Impacto: Elimina caso de riesgo psicosocial

5. **Employees** - Eliminar empleado (si existe)
   - Verificar si tiene función de eliminación
   - Impacto: Elimina registro de empleado

6. **Surveys** - Eliminar encuesta (si existe)
   - Verificar si tiene función de eliminación
   - Impacto: Elimina encuesta completa con respuestas

### Prioridad Media 🟡 (7 páginas)

7. **JobApplication** - Remover entradas de historial laboral y referencias
   - Funciones: `removeWorkHistoryEntry(index)`, `removeReference(index)`
   - Impacto: Elimina datos de solicitud de empleo

8. **MeetingMinuteForm** - Remover participantes y adjuntos
   - Funciones: `removeParticipant(index)`, `removeAttachment(index)`
   - Impacto: Elimina datos de minuta en edición

9. **CommitteeOperatingRules** - Eliminar versión de bases (si existe)
   - Verificar si tiene función de eliminación
   - Impacto: Elimina versión histórica de bases

10. **Courses** - Eliminar curso (si existe)
    - Verificar si tiene función de eliminación
    - Impacto: Elimina curso completo con módulos

11. **Modules** - Eliminar módulo (si existe)
    - Verificar si tiene función de eliminación
    - Impacto: Elimina módulo de curso

12. **Evaluations** - Eliminar evaluación (si existe)
    - Verificar si tiene función de eliminación
    - Impacto: Elimina evaluación con respuestas

13. **Positions** - Eliminar puesto (si existe)
    - Verificar si tiene función de eliminación
    - Impacto: Elimina puesto organizacional

### Prioridad Baja 🟢 (5 páginas)

14. **CommitteeMinutesManagement** - Remover asistentes, agenda, acuerdos
    - Funciones: `removeAttendee`, `removeAgendaItem`, `removeAgreement`
    - Impacto: Elimina elementos individuales de minuta (ya tiene confirmación para eliminar minuta completa)

15. **Cases** - Exportar CSV (no destructivo)
    - `document.body.removeChild(a)` - Solo limpieza DOM
    - No requiere confirmación

16. **CasesMetrics** - Exportar CSV (no destructivo)
    - `document.body.removeChild(a)` - Solo limpieza DOM
    - No requiere confirmación

17. **DocumentGallery** - Exportar documento (no destructivo)
    - `document.body.removeChild(link)` - Solo limpieza DOM
    - No requiere confirmación

18. **MassiveImport** - Exportar plantilla (no destructivo)
    - `document.body.removeChild(link)` - Solo limpieza DOM
    - No requiere confirmación

---

## 🎯 Plan de Implementación

### Fase 1: Prioridad Alta (6 páginas)

Implementar confirmaciones en páginas críticas con acciones destructivas irreversibles.

### Fase 2: Prioridad Media (7 páginas)

Implementar confirmaciones en páginas con acciones destructivas moderadas.

### Fase 3: Prioridad Baja (5 páginas)

Evaluar si requieren confirmaciones o solo son acciones de limpieza DOM.

---

## 📝 Notas

- **Acciones no destructivas** (exportar CSV, descargar PDF): No requieren confirmación
- **Limpieza DOM** (`removeChild`): No requiere confirmación
- **Eliminar elementos temporales** en formularios: Confirmación opcional
- **Eliminar registros permanentes**: Confirmación obligatoria

---

**Total Real de Páginas que Requieren Confirmaciones**: ~13 páginas (excluyendo acciones no destructivas)
**Cobertura Objetivo**: 23/23 páginas (100%)
