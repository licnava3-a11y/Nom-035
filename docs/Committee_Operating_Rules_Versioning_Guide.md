# Guía del Sistema de Versionado de Bases de Funcionamiento del Comité

## Descripción General

El sistema de versionado de bases de funcionamiento del comité NOM-035 permite mantener un historial completo de cambios, comparar versiones y restaurar versiones anteriores cuando sea necesario. Este sistema garantiza la trazabilidad y transparencia en la evolución del reglamento interno del comité.

## Características Principales

### 1. Versionado Automático
- **Creación de versiones**: Cada vez que se edita una base de funcionamiento, se crea automáticamente una nueva versión
- **Numeración secuencial**: Las versiones se numeran automáticamente (V1, V2, V3, etc.)
- **Snapshot completo**: Cada versión almacena una copia completa del contenido en ese momento

### 2. Historial de Versiones
- **Visualización cronológica**: Lista de todas las versiones ordenadas de más reciente a más antigua
- **Metadatos completos**: Fecha, autor, número de versión y descripción de cambios
- **Versión actual**: Indicador visual de la versión actualmente activa

### 3. Comparación de Versiones
- **Comparación lado a lado**: Visualización de dos versiones en paralelo
- **Detección de diferencias**: Highlighting automático de campos modificados
- **Resumen de cambios**: Lista de todos los campos que fueron modificados

### 4. Restauración de Versiones
- **Restauración con confirmación**: Proceso seguro con solicitud de confirmación
- **Nueva versión al restaurar**: La restauración crea una nueva versión (no sobrescribe)
- **Descripción obligatoria**: Documentación del motivo de la restauración

## Estructura de Datos

### Tabla Principal: `committee_operating_rules`
Almacena la versión actual de cada base de funcionamiento:

```sql
- id: Identificador único
- version: Etiqueta de versión (V1.0, V2.0, etc.)
- effectiveDate: Fecha de entrada en vigor
- reviewDate: Fecha de revisión
- nextReviewDate: Próxima revisión programada
- objectives: Objetivos del comité
- structure: Estructura organizacional
- roles: Funciones y responsabilidades
- meetingFrequency: Periodicidad de reuniones
- quorum: Quórum mínimo
- decisionMaking: Procedimiento de toma de decisiones
- communication: Mecanismos de comunicación
- caseHandling: Procedimiento de atención de casos
- confidentiality: Confidencialidad
- amendments: Procedimiento de modificación
- signatures: Firmas de aprobación (JSON)
- status: Estado (draft, active, superseded)
- createdBy: Usuario creador
- approvedBy: Usuario que aprobó
- approvedAt: Fecha de aprobación
```

### Tabla de Versiones: `committee_operating_rules_versions`
Almacena el historial completo de versiones:

```sql
- id: Identificador único de la versión
- operatingRuleId: Referencia a la base de funcionamiento principal
- versionNumber: Número secuencial de versión (1, 2, 3, etc.)
- version: Etiqueta de versión (V1.0, V2.0, etc.)
- [todos los campos de contenido]: Snapshot completo
- changeDescription: Descripción de los cambios realizados
- createdBy: Usuario que creó esta versión
- createdAt: Fecha de creación
```

## Flujo de Trabajo

### Crear Nueva Base de Funcionamiento

1. **Acceder al módulo**: Navegar a "Comité > Bases de Funcionamiento"
2. **Clic en "Nueva Base de Funcionamiento"**
3. **Completar formulario**:
   - Versión (ej: V1.0)
   - Fecha de vigencia
   - Próxima revisión
   - Objetivos del comité
   - Estructura organizacional
   - Funciones y responsabilidades
   - Periodicidad de reuniones
   - Quórum mínimo
   - Toma de decisiones
   - Mecanismos de comunicación
   - Procedimiento de atención de casos
   - Confidencialidad
   - Procedimiento de modificación
   - Firmas de aprobación (formato JSON)
4. **Guardar**: Se crea la base de funcionamiento y la versión 1 automáticamente

### Editar Base de Funcionamiento (Crear Nueva Versión)

1. **Seleccionar base de funcionamiento** de la lista
2. **Clic en "Editar"**
3. **Modificar campos necesarios**
4. **Agregar descripción de cambios** (obligatorio):
   - Describir qué se modificó y por qué
   - Ejemplo: "Actualización de quórum mínimo de 50% a 60% según acuerdo de reunión del 15/01/2024"
5. **Guardar**: Se crea automáticamente una nueva versión (V2, V3, etc.)

### Ver Historial de Versiones

1. **Seleccionar base de funcionamiento**
2. **Clic en icono de "Historial"** (reloj)
3. **Visualizar lista de versiones**:
   - Versión actual marcada con badge "Actual"
   - Fecha y hora de creación
   - Autor
   - Descripción de cambios
4. **Acciones disponibles**:
   - **Ver**: Visualizar contenido completo de la versión
   - **Restaurar**: Restaurar esta versión (solo versiones anteriores)

### Comparar Versiones

1. **Acceder al historial de versiones**
2. **Clic en "Comparar Versiones"**
3. **Seleccionar dos versiones**:
   - Primera versión (versión anterior)
   - Segunda versión (versión más reciente)
4. **Clic en "Comparar"**
5. **Visualizar diferencias**:
   - Campos modificados resaltados en amarillo (versión 1) y verde (versión 2)
   - Resumen de cambios al final
   - Comparación lado a lado

### Restaurar Versión Anterior

1. **Acceder al historial de versiones**
2. **Seleccionar versión a restaurar**
3. **Clic en icono de "Restaurar"** (flecha circular)
4. **Confirmar restauración**:
   - Agregar descripción del motivo de restauración
   - Ejemplo: "Restauración de versión V2.0 debido a error en quórum de V3.0"
5. **Confirmar**: Se crea una nueva versión (V4) con el contenido de la versión restaurada

### Aprobar Base de Funcionamiento

1. **Seleccionar base de funcionamiento** en estado "Borrador"
2. **Revisar contenido completo**
3. **Clic en "Aprobar"**
4. **Estado cambia a "Activo"**
5. **Se registra usuario aprobador y fecha**

## API tRPC

### Procedures Disponibles

#### `committeeOperatingRules.create`
Crear nueva base de funcionamiento.

**Input:**
```typescript
{
  version: string,
  effectiveDate: string,
  reviewDate?: string,
  nextReviewDate?: string,
  objectives: string,
  structure: string,
  roles: string,
  meetingFrequency: string,
  quorum: string,
  decisionMaking: string,
  communication: string,
  caseHandling: string,
  confidentiality: string,
  amendments?: string,
  signatures: string
}
```

**Output:**
```typescript
{
  success: boolean,
  id: number
}
```

#### `committeeOperatingRules.update`
Actualizar base de funcionamiento (crea nueva versión automáticamente).

**Input:**
```typescript
{
  id: number,
  [todos los campos de contenido],
  changeDescription?: string
}
```

**Output:**
```typescript
{
  success: boolean,
  versionNumber: number
}
```

#### `committeeOperatingRules.list`
Listar todas las bases de funcionamiento.

**Output:**
```typescript
Array<{
  id: number,
  version: string,
  effectiveDate: string,
  reviewDate: string,
  nextReviewDate: string,
  status: string,
  createdBy: number,
  createdAt: Date,
  updatedAt: Date,
  creatorName: string
}>
```

#### `committeeOperatingRules.getById`
Obtener base de funcionamiento específica.

**Input:**
```typescript
{
  id: number
}
```

**Output:**
```typescript
CommitteeOperatingRules
```

#### `committeeOperatingRules.listVersions`
Listar historial de versiones.

**Input:**
```typescript
{
  operatingRuleId: number
}
```

**Output:**
```typescript
Array<{
  id: number,
  versionNumber: number,
  version: string,
  effectiveDate: string,
  changeDescription: string,
  createdBy: number,
  createdAt: Date,
  creatorName: string
}>
```

#### `committeeOperatingRules.getVersion`
Obtener versión específica.

**Input:**
```typescript
{
  versionId: number
}
```

**Output:**
```typescript
CommitteeOperatingRulesVersion
```

#### `committeeOperatingRules.restoreVersion`
Restaurar versión anterior.

**Input:**
```typescript
{
  operatingRuleId: number,
  versionId: number,
  changeDescription?: string
}
```

**Output:**
```typescript
{
  success: boolean,
  versionNumber: number
}
```

#### `committeeOperatingRules.compareVersions`
Comparar dos versiones.

**Input:**
```typescript
{
  versionId1: number,
  versionId2: number
}
```

**Output:**
```typescript
{
  version1: CommitteeOperatingRulesVersion,
  version2: CommitteeOperatingRulesVersion,
  differences: {
    [fieldName: string]: boolean
  }
}
```

#### `committeeOperatingRules.approve`
Aprobar base de funcionamiento.

**Input:**
```typescript
{
  id: number
}
```

**Output:**
```typescript
{
  success: boolean
}
```

## Mejores Prácticas

### 1. Descripciones de Cambios
- **Siempre agregar descripción**: Documentar el motivo de cada cambio
- **Ser específico**: Indicar qué se modificó y por qué
- **Incluir referencias**: Mencionar acuerdos de reunión o documentos relacionados

**Ejemplos:**
- ✅ "Actualización de quórum mínimo de 50% a 60% según acuerdo de reunión del 15/01/2024"
- ✅ "Modificación de procedimiento de atención de casos para incluir seguimiento post-cierre"
- ❌ "Actualización" (muy vago)
- ❌ "Cambios varios" (no específico)

### 2. Revisiones Periódicas
- **Establecer calendario**: Definir fechas de revisión periódica
- **Usar campo nextReviewDate**: Programar próxima revisión
- **Revisar antes de aprobar**: Validar contenido completo antes de activar

### 3. Restauraciones
- **Usar con precaución**: Solo restaurar cuando sea absolutamente necesario
- **Documentar motivo**: Explicar claramente por qué se restaura
- **Notificar al comité**: Informar a todos los miembros sobre la restauración

### 4. Comparaciones
- **Antes de aprobar**: Comparar con versión anterior para validar cambios
- **Documentación de cambios**: Usar comparación para generar resumen de cambios
- **Auditorías**: Facilita revisiones de auditoría y cumplimiento

## Troubleshooting

### Problema: No se puede crear nueva versión
**Causa**: Falta descripción de cambios o campos obligatorios vacíos
**Solución**: Completar todos los campos obligatorios y agregar descripción de cambios

### Problema: No aparece botón de "Comparar Versiones"
**Causa**: Solo existe una versión
**Solución**: Se requieren al menos 2 versiones para comparar

### Problema: Error al restaurar versión
**Causa**: Versión no encontrada o permisos insuficientes
**Solución**: Verificar que la versión existe y que el usuario tiene permisos de edición

### Problema: No se puede aprobar base de funcionamiento
**Causa**: Usuario sin permisos de aprobación
**Solución**: Solo administradores y miembros del comité pueden aprobar

## Seguridad y Permisos

- **Creación**: Requiere autenticación (protectedProcedure)
- **Edición**: Requiere autenticación
- **Aprobación**: Requiere autenticación (idealmente rol de administrador)
- **Visualización**: Requiere autenticación
- **Restauración**: Requiere autenticación

## Integración con Otros Módulos

### Generación de PDFs
- Las bases de funcionamiento pueden exportarse a PDF
- El PDF incluye la versión actual y fecha de vigencia
- Se puede generar PDF de versiones históricas para archivo

### Actas de Reunión
- Las modificaciones a las bases de funcionamiento pueden referenciarse en actas
- Las actas pueden incluir aprobación de nuevas versiones

### Auditoría
- Todas las operaciones quedan registradas con usuario y fecha
- El historial de versiones sirve como evidencia de cumplimiento
- Las comparaciones facilitan auditorías de cambios

## Conclusión

El sistema de versionado de bases de funcionamiento del comité proporciona una solución robusta para mantener la trazabilidad y transparencia en la evolución del reglamento interno. Con funcionalidades de historial, comparación y restauración, garantiza que todos los cambios estén documentados y puedan ser auditados en cualquier momento.

Para soporte adicional, consultar la documentación técnica del proyecto o contactar al equipo de desarrollo.
