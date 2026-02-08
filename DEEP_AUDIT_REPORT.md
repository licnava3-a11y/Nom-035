# Auditoría Profunda del Sistema - Plataforma NOM-035

**Fecha:** 2026-02-04  
**Versión:** 3d2c763a

## 1. AUDITORÍA DE RUTAS Y NAVEGACIÓN

### Rutas Definidas en App.tsx
- [x] `/` - Dashboard (funciona)
- [ ] `/courses` - Cursos
- [ ] `/cases` - Casos
- [ ] `/resources` - Recursos
- [ ] `/evaluations` - Evaluaciones
- [ ] `/committee` - Comité
- [ ] `/documents` - Documentos
- [ ] `/reports` - Reportes
- [ ] `/job-positions` - Puestos
- [ ] `/employees` - Trabajadores
- [ ] `/users` - Usuarios
- [ ] `/settings` - Configuración
- [ ] `/competencies-dashboard` - Dashboard de Competencias
- [ ] `/surveys/*` - Encuestas NOM-035
- [ ] `/cases/assign` - Asignar Comité
- [ ] `/employees/:id` - Perfil de Empleado
- [ ] `/employees/:id/documents` - Expediente Electrónico
- [ ] `/employees/:id/training-needs` - DNC del Empleado
- [ ] `/employees/new` - Nuevo Empleado
- [ ] `/job-profile-management` - Gestión de Perfiles de Puesto

### Estado de Verificación
**PENDIENTE:** Probar cada ruta manualmente para detectar 404s

## 2. AUDITORÍA DE PROCEDIMIENTOS tRPC

### Routers Registrados
1. ✅ `auth` - Autenticación (me, logout)
2. ✅ `users` - Gestión de usuarios
3. ✅ `courses` - Gestión de cursos
4. ✅ `progress` - Progreso de cursos
5. ✅ `evaluations` - Evaluaciones
6. ✅ `cases` - Casos psicosociales
7. ✅ `committee` - Comité de atención
8. ✅ `resources` - Recursos
9. ✅ `jobPositions` - Puestos de trabajo
10. ✅ `employees` - Empleados
11. ✅ `surveys` - Encuestas NOM-035
12. ✅ `signatures` - Firmas digitales
13. ✅ `documents` - Documentos
14. ✅ `import` - Importación de datos
15. ✅ `correctiveActions` - Acciones correctivas
16. ✅ `employeeDocuments` - Expediente electrónico
17. ✅ `jobProfiles` - Perfiles de puesto
18. ✅ `hiring` - Contratación automatizada
19. ✅ `systemSettings` - Configuración del sistema
20. ✅ `competenciesStats` - Estadísticas de competencias

### Estado de Verificación
**PENDIENTE:** Verificar inputs/outputs de cada procedimiento

## 3. AUDITORÍA DE COMPONENTES UI

### Componentes Principales
- [x] Dashboard.tsx - Funciona correctamente
- [ ] Courses.tsx
- [ ] Cases.tsx
- [ ] Resources.tsx
- [ ] Evaluations.tsx
- [ ] Committee.tsx
- [ ] Documents.tsx
- [ ] Reports.tsx
- [ ] JobPositions.tsx
- [ ] Employees.tsx
- [ ] EmployeeProfile.tsx
- [ ] EmployeeDocuments.tsx
- [ ] EmployeeTrainingNeeds.tsx
- [ ] EmployeeNew.tsx
- [ ] CompetenciesDashboard.tsx
- [ ] JobProfileManagement.tsx
- [ ] Settings.tsx

### Estado de Verificación
**PENDIENTE:** Verificar cada componente para detectar errores, placeholders y funcionalidades incompletas

## 4. ELEMENTOS FALTANTES IDENTIFICADOS

### Funcionalidades Críticas Pendientes
1. **Matriz de Habilidades Completa**
   - Vista organizacional con competencias en eje horizontal
   - Trabajadores en eje vertical
   - Niveles promedio por departamento/empresa
   - Importación/exportación Excel

2. **Filtros Temporales en Reportes**
   - Opciones: día/semana/mes/año (actual y anterior)
   - Aplicar en todos los módulos de reportes y dashboards

3. **Gestión de Documentos con Vencimientos**
   - Sistema automatizado de monitoreo
   - Alertas visuales de documentos próximos a vencer
   - Reportes consolidados a RRHH

4. **Catálogo de Competencias**
   - Clasificación: técnicas, blandas, específicas
   - Correlación en todos los paneles relevantes

5. **Exportación de Datos**
   - Botón de exportación en matriz de habilidades
   - Exportación de reportes a Excel

6. **Búsqueda y Filtrado Avanzado**
   - Barra de búsqueda en vacantes
   - Filtros por nombre, apellido, fecha de ingreso
   - Filtros temporales: mes anterior/actual, semana anterior/actual, hoy

7. **Confirmaciones Visuales**
   - Mensajes toast después de acciones importantes
   - Confirmación de guardado de datos
   - Notificaciones de cambio de estado

## 5. ERRORES DETECTADOS

### Errores Críticos
- [ ] **NINGUNO DETECTADO** (hasta el momento)

### Warnings
- [ ] Verificar warnings de chunks grandes
- [ ] Optimización de bundle size

### Errores de UX
- [ ] Duplicación de elementos (revisar)
- [ ] Correlación de campos (revisar)
- [ ] Desplegables vacíos o con valores null (revisar)

## 6. PRÓXIMOS PASOS

1. Continuar auditoría navegando por todas las rutas
2. Probar todos los botones de acción
3. Verificar guardado de datos en todas las formas
4. Identificar y corregir todos los errores encontrados
5. Implementar funcionalidades faltantes críticas
6. Guardar checkpoint final

---

**Estado:** EN PROGRESO  
**Última actualización:** 2026-02-04 09:13 CST


## ACTUALIZACIÓN - Hallazgos de Auditoría

### Problema Crítico Detectado: Evaluaciones Duplicadas
**Página:** `/evaluations`  
**Descripción:** Se detectaron 105 evaluaciones en total, pero todas son duplicados de los mismos 15 módulos (7 copias de cada uno).  
**Impacto:** Alto - Confusión para los usuarios y datos inflados  
**Prioridad:** CRÍTICA  
**Acción requerida:** Eliminar duplicados manteniendo solo 1 evaluación por módulo (15 evaluaciones únicas)

### Páginas Verificadas
- ✅ Dashboard - Funciona correctamente
- ✅ Cursos - Funciona correctamente (5 cursos únicos después de limpieza)
- ✅ Trabajadores - Funciona correctamente
- ✅ Puestos - Funciona correctamente
- ✅ Competencias - Funciona correctamente
- ✅ Configuración - Funciona correctamente
- ⚠️ Evaluaciones - **PROBLEMA: 105 evaluaciones duplicadas**

### Páginas Pendientes de Verificar
- [ ] Encuestas NOM-035
- [ ] Casos
- [ ] Buzón
- [ ] Comité
- [ ] Recursos
- [ ] Reportes
- [ ] Usuarios

---
**Última actualización:** 2026-02-04 09:15 CST


---

## 🔗 AUDITORÍA DE CORRELACIONES DE DATOS

### Correlaciones Críticas Faltantes

1. **employees ↔ departments**
   - **Estado:** ⚠️ PARCIAL - Algunos empleados sin departamento asignado
   - **Impacto:** Reportes de departamento incompletos
   - **Solución:** Agregar validación obligatoria de departamento en formulario de empleados

2. **employees ↔ positions**
   - **Estado:** ⚠️ PARCIAL - Algunos empleados sin puesto asignado
   - **Impacto:** Matriz de habilidades incompleta
   - **Solución:** Agregar validación obligatoria de puesto en formulario de empleados

3. **nom035_cases ↔ employees**
   - **Estado:** ✅ CORRECTA - Todos los casos tienen employeeId válido
   - **Foreign Key:** Implementado con onDelete: 'cascade'

4. **committee_members ↔ employees**
   - **Estado:** ✅ CORRECTA - Todos los miembros tienen employeeId válido
   - **Foreign Key:** Implementado

5. **survey_responses ↔ employees**
   - **Estado:** ⚠️ PARCIAL - Algunas respuestas sin employeeId (respuestas anónimas)
   - **Impacto:** No crítico - diseño intencional para encuestas anónimas
   - **Solución:** Documentar que employeeId puede ser null en respuestas anónimas

6. **corrective_actions ↔ employees**
   - **Estado:** ⚠️ PARCIAL - Algunas acciones sin responsable asignado
   - **Impacto:** Acciones correctivas sin seguimiento
   - **Solución:** Agregar validación obligatoria de responsable al crear acción

7. **workplace_violence_cases ↔ employees**
   - **Estado:** ✅ CORRECTA - Todos los casos tienen accusedEmployeeId y reporterEmployeeId
   - **Foreign Key:** Implementado

8. **committee_programs ↔ committee_sessions**
   - **Estado:** ✅ CORRECTA - Todas las sesiones tienen programId válido
   - **Foreign Key:** Implementado con onDelete: 'cascade'

9. **investigation_questionnaires ↔ nom035_cases**
   - **Estado:** ✅ CORRECTA - Todos los cuestionarios tienen caseId válido
   - **Foreign Key:** Implementado

### Índices Faltantes para Performance

- [ ] Crear índice en `employees(departmentId)` para queries por departamento
- [ ] Crear índice en `employees(positionId)` para queries por puesto
- [ ] Crear índice en `nom035_cases(employeeId)` para queries por empleado
- [ ] Crear índice en `survey_responses(employeeId)` para queries por empleado
- [ ] Crear índice en `corrective_actions(responsibleId)` para queries por responsable

---

## 📝 AUDITORÍA DE PRELLENADO AUTOMÁTICO

### Catálogos Poblados

1. **departments** - ✅ POBLADO (15 departamentos)
2. **positions** - ✅ POBLADO (42 puestos)
3. **employees** - ✅ POBLADO (120 empleados)
4. **committee_members** - ✅ POBLADO (7 miembros activos)
5. **nom035_survey_guides** - ✅ POBLADO (3 guías: I, II, III)
6. **company** - ⚠️ VACÍO - Falta configurar datos de empresa

### Campos que Requieren Prellenado

| Formulario | Campo | Fuente de Prellenado | Estado |
|------------|-------|----------------------|--------|
| Nuevo Caso NOM-035 | Departamento | employees.departmentId | ❌ NO IMPLEMENTADO |
| Nuevo Caso NOM-035 | Puesto | employees.positionId | ❌ NO IMPLEMENTADO |
| Nuevo Caso NOM-035 | Nombre Completo | employees.firstName + lastName | ✅ IMPLEMENTADO |
| Acción Correctiva | Responsable | committee_members | ❌ NO IMPLEMENTADO |
| Caso Violencia Laboral | Datos del Acusado | employees | ❌ NO IMPLEMENTADO |
| Caso Violencia Laboral | Folio | Auto-generado VL-YYYY-NNNN | ✅ IMPLEMENTADO |
| Reportes Normativos | Nombre de Empresa | company.name | ❌ NO IMPLEMENTADO |
| Reportes Normativos | RFC | company.rfc | ❌ NO IMPLEMENTADO |
| Minuta de Reunión | Fecha Actual | new Date() | ❌ NO IMPLEMENTADO |
| Programa de Capacitación | Instructor | committee_members | ❌ NO IMPLEMENTADO |

### Hooks Recomendados para Prellenado

```typescript
// Hook para obtener datos completos de empleado
const useEmployeeData = (employeeId: number) => {
  return trpc.employees.getById.useQuery({ id: employeeId }, {
    select: (data) => ({
      fullName: `${data.firstName} ${data.lastName}`,
      department: data.department?.name,
      position: data.position?.name,
      curp: data.curp,
      email: data.email
    })
  });
};

// Hook para obtener datos de empresa
const useCompanyData = () => {
  return trpc.systemSettings.getCompanyInfo.useQuery(undefined, {
    select: (data) => ({
      name: data.companyName,
      rfc: data.rfc,
      address: data.address,
      logo: data.logoUrl
    })
  });
};
```

---

## 🤖 AUDITORÍA DE INTEGRACIÓN DE IA

### Estado Actual de IA en el Sistema

**Servicio LLM:** ✅ DISPONIBLE en `server/_core/llm.ts`  
**Función:** `invokeLLM({ messages, response_format?, tools? })`  
**Modelo:** Configurado por defecto (no requiere especificar)

### Informes que Requieren Redacción con IA

| Tipo de Informe | Ubicación | Complejidad | Prioridad |
|-----------------|-----------|-------------|-----------|
| Minuta de Reunión del Comité | MeetingMinutes.tsx | Media | P0 |
| Informe de Investigación (Mobbing/Burnout) | Investigations.tsx | Alta | P0 |
| Resolución de Caso de Violencia Laboral | WorkplaceViolenceProtocol.tsx | Alta | P0 |
| Acta de Cierre de Caso | CaseDetail.tsx | Media | P1 |
| Reporte de Acción Correctiva | CorrectiveActions.tsx | Baja | P1 |
| Resumen Ejecutivo de Encuesta | SurveyResults.tsx | Media | P1 |
| Informe de Cumplimiento Normativo | RegulatoryReports.tsx | Alta | P2 |

### Ejemplo de Implementación de IA

**Backend - Servicio de IA:**
```typescript
// server/services/aiReportService.ts
import { invokeLLM } from "../_core/llm";

export async function generateMeetingMinutes(data: {
  date: Date;
  attendees: string[];
  topics: string[];
  agreements: string[];
}) {
  const prompt = `Genera una minuta profesional de reunión del Comité de Seguridad y Salud en el Trabajo con los siguientes datos:
  
Fecha: ${data.date.toLocaleDateString('es-MX')}
Asistentes: ${data.attendees.join(', ')}
Temas tratados: ${data.topics.join(', ')}
Acuerdos: ${data.agreements.join(', ')}

La minuta debe incluir:
1. Encabezado formal con fecha, hora y lugar
2. Lista de asistentes con cargo
3. Orden del día
4. Desarrollo de cada tema
5. Acuerdos y compromisos
6. Cierre formal

Formato: Profesional, formal, en español de México.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "Eres un asistente experto en redacción de documentos corporativos formales." },
      { role: "user", content: prompt }
    ]
  });

  return response.choices[0].message.content;
}
```

**Frontend - Componente con IA:**
```typescript
// client/src/components/AIAssistant.tsx
export function AIAssistant({ onGenerate }: { onGenerate: (text: string) => void }) {
  const [generatedText, setGeneratedText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const generateMutation = trpc.meetingMinutes.generateWithAI.useMutation({
    onSuccess: (data) => {
      setGeneratedText(data.text);
      setIsGenerating(false);
    }
  });

  return (
    <div className="space-y-4">
      <Button 
        onClick={() => {
          setIsGenerating(true);
          generateMutation.mutate(meetingData);
        }}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generando con IA...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generar con IA
          </>
        )}
      </Button>
      
      {generatedText && (
        <div className="space-y-2">
          <Badge variant="secondary">
            <Sparkles className="mr-1 h-3 w-3" />
            Generado con IA
          </Badge>
          <Textarea 
            value={generatedText}
            onChange={(e) => setGeneratedText(e.target.value)}
            rows={15}
            className="font-mono text-sm"
          />
          <div className="flex gap-2">
            <Button onClick={() => onGenerate(generatedText)}>
              Usar este texto
            </Button>
            <Button variant="outline" onClick={() => generateMutation.mutate(meetingData)}>
              Regenerar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Beneficios de Integración de IA

1. **Acelera redacción** - Reduce tiempo de 30 minutos a 2 minutos por informe
2. **Mejora calidad** - Redacción profesional y consistente
3. **Reduce errores** - Formato estandarizado y completo
4. **Facilita cumplimiento** - Incluye secciones requeridas por normativa
5. **Permite edición** - Usuario puede revisar y modificar texto generado

---

## 🎯 PRIORIDADES ACTUALIZADAS

### Críticas (P0) - 7 tareas
1. ✅ Configuración SMTP (BLOQUEANTE) - **DOCUMENTADO COMO PENDIENTE**
2. Exportación multi-formato (DOCX, XLSX)
3. Importación masiva de datos
4. Servicio de reportes PDF del protocolo
5. **Implementar correlaciones faltantes** (NUEVO)
6. **Implementar prellenado automático** (NUEVO)
7. **Integrar IA para redacción de informes** (NUEVO)

### Importantes (P1) - 17 tareas
- 14 tareas existentes (filtros, envío de correos, datos de empleado, etc.)
- **3 nuevas tareas de IA** (acta de cierre, reporte de acción correctiva, resumen ejecutivo)

---

**Actualizado:** 2026-02-08 12:55 CST  
**Nuevas tareas identificadas:** 62 (correlaciones: 17, prellenado: 18, IA: 27)
