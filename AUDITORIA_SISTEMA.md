# Auditoría Completa del Sistema NOM-035

**Fecha:** 5 de febrero de 2026  
**Objetivo:** Identificar oportunidades de mejora en prellenado de datos, conexiones entre módulos y evitar recaptura de información.

---

## 1. FORMULARIOS DE EMPLEADOS

### EmployeeNew.tsx / EmployeeEdit.tsx
**Hallazgos:**
- ✅ Formulario completo con datos personales y laborales
- ⚠️ **Oportunidad:** Prellenar departamento y puesto desde catálogos existentes
- ⚠️ **Oportunidad:** Autocompletar dirección con código postal (API de SEPOMEX)
- ⚠️ **Oportunidad:** Validar CURP y RFC automáticamente

**Recomendaciones:**
1. Implementar selector de departamento con búsqueda
2. Implementar selector de puesto filtrado por departamento
3. Agregar validación de CURP/RFC con algoritmo oficial
4. Autocompletar colonia, municipio y estado desde código postal

---

## 2. FORMULARIOS DE CURSOS Y EVALUACIONES

### Courses.tsx / TakeEvaluation.tsx
**Hallazgos:**
- ✅ Sistema de cursos funcional
- ✅ Sistema de evaluaciones funcional
- ⚠️ **Oportunidad:** Prellenar instructor desde catálogo de empleados
- ⚠️ **Oportunidad:** Sugerir participantes basados en departamento/puesto

**Recomendaciones:**
1. Implementar selector de instructor con filtro por competencias
2. Sugerir participantes automáticamente según curso
3. Prellenar fechas de próximas sesiones basadas en calendario

---

## 3. CONEXIONES ENTRE TABLAS

### Empleados ↔ Departamentos ↔ Puestos
**Hallazgos:**
- ✅ Relaciones correctamente establecidas en schema
- ✅ Foreign keys configuradas
- ⚠️ **Oportunidad:** Sincronización automática al cambiar departamento
- ⚠️ **Oportunidad:** Historial de cambios de puesto

**Recomendaciones:**
1. Al cambiar departamento de empleado, sugerir puestos disponibles en ese departamento
2. Mantener historial de cambios de puesto con fechas
3. Validar que el puesto seleccionado pertenezca al departamento

### Empleados ↔ Competencias ↔ Matriz de Habilidades
**Hallazgos:**
- ✅ Tabla employeeCompetencies correctamente relacionada
- ✅ Sistema de evaluación de competencias funcional
- ⚠️ **Oportunidad:** Prellenar competencias requeridas desde perfil de puesto

**Recomendaciones:**
1. Al asignar puesto, prellenar competencias requeridas automáticamente
2. Mostrar brecha de competencias al asignar puesto nuevo
3. Sugerir capacitaciones basadas en brechas detectadas

---

## 4. CAMPOS DUPLICADOS O REDUNDANTES

### Encuestas NOM-035
**Hallazgos:**
- ✅ Sistema de tokens único por CURP funcional
- ✅ Guardado automático de respuestas
- ✅ Sin duplicación de respuestas
- ✅ Validación de token usado

**Estado:** ✅ **SIN PROBLEMAS DETECTADOS**

### Minutas de Reunión
**Hallazgos:**
- ✅ Sistema de firmas digitales funcional
- ✅ Generación de PDF con QR NOM-151
- ⚠️ **Oportunidad:** Prellenar participantes desde comité o departamento

**Recomendaciones:**
1. Sugerir participantes basados en tipo de reunión
2. Prellenar participantes desde comité si es reunión de comité
3. Guardar plantillas de participantes frecuentes

---

## 5. PRELLENADO DE DATOS

### Casos de Riesgo Psicosocial
**Hallazgos:**
- ✅ Creación automática de casos desde encuestas con ATS
- ✅ Asignación de responsables funcional
- ⚠️ **Oportunidad:** Prellenar datos del empleado desde encuesta

**Recomendaciones:**
1. Al crear caso desde encuesta, prellenar todos los datos del empleado
2. Sugerir acciones correctivas basadas en tipo de riesgo detectado
3. Prellenar fecha de seguimiento (30 días después de creación)

### Evaluaciones de Desempeño
**Hallazgos:**
- ✅ Sistema de evaluaciones funcional
- ⚠️ **Oportunidad:** Prellenar competencias desde matriz de habilidades
- ⚠️ **Oportunidad:** Mostrar evaluación anterior para comparación

**Recomendaciones:**
1. Prellenar competencias a evaluar desde perfil de puesto
2. Mostrar evaluación anterior del empleado para referencia
3. Sugerir objetivos basados en resultados anteriores

---

## 6. VALIDACIONES Y CONSISTENCIA

### Datos Personales
**Hallazgos:**
- ⚠️ **Falta:** Validación de formato de CURP
- ⚠️ **Falta:** Validación de formato de RFC
- ⚠️ **Falta:** Validación de formato de NSS
- ⚠️ **Falta:** Validación de correo electrónico único

**Recomendaciones:**
1. Implementar validación de CURP con algoritmo oficial
2. Implementar validación de RFC con algoritmo oficial
3. Validar que correo electrónico sea único en el sistema
4. Validar que CURP sea único en el sistema

### Fechas y Periodos
**Hallazgos:**
- ✅ Fechas almacenadas correctamente en UTC
- ⚠️ **Oportunidad:** Validar que fecha de ingreso no sea futura
- ⚠️ **Oportunidad:** Validar que fecha de nacimiento sea coherente (18+ años)

**Recomendaciones:**
1. Validar que fecha de ingreso <= fecha actual
2. Validar que edad del empleado >= 18 años
3. Validar que fecha de fin de curso > fecha de inicio

---

## 7. EXPERIENCIA DE USUARIO

### Formularios Largos
**Hallazgos:**
- ✅ Formularios bien organizados
- ⚠️ **Oportunidad:** Dividir formularios largos en pasos (wizard)
- ⚠️ **Oportunidad:** Guardar progreso automáticamente

**Recomendaciones:**
1. Convertir EmployeeNew en wizard de 3 pasos:
   - Paso 1: Datos personales
   - Paso 2: Datos laborales
   - Paso 3: Documentos y firmas
2. Implementar auto-guardado en formularios largos
3. Mostrar progreso visual en formularios multi-paso

### Búsqueda y Filtros
**Hallazgos:**
- ✅ Búsqueda implementada en la mayoría de listados
- ⚠️ **Oportunidad:** Filtros avanzados en listados grandes
- ⚠️ **Oportunidad:** Exportación a Excel de resultados filtrados

**Recomendaciones:**
1. Agregar filtros avanzados en Employees (departamento, puesto, status)
2. Agregar filtros avanzados en Courses (tipo, instructor, fecha)
3. Implementar exportación a Excel en todos los listados principales

---

## 8. RESUMEN DE PRIORIDADES

### 🔴 ALTA PRIORIDAD
1. ✅ Validación de CURP, RFC y NSS con algoritmos oficiales
2. ✅ Prellenado de competencias desde perfil de puesto
3. ✅ Sincronización automática departamento ↔ puesto
4. ✅ Validación de correo electrónico único

### 🟡 MEDIA PRIORIDAD
1. Autocompletar dirección desde código postal
2. Sugerir participantes en minutas según tipo de reunión
3. Historial de cambios de puesto
4. Filtros avanzados en listados principales

### 🟢 BAJA PRIORIDAD
1. Convertir formularios largos en wizards
2. Auto-guardado en formularios largos
3. Exportación a Excel de listados filtrados
4. Plantillas de participantes frecuentes en minutas

---

## 9. ACCIONES CORRECTIVAS IMPLEMENTADAS

### ✅ Completadas
- Sistema de tokens único por CURP (evita duplicación de encuestas)
- Guardado automático de respuestas en encuestas
- Validación de token usado (evita respuestas duplicadas)
- Creación automática de casos desde encuestas con ATS

### 🔄 En Progreso
- Mejora de TokensDashboard con listado de trabajadores pendientes

### 📋 Pendientes
- Validaciones de CURP, RFC y NSS
- Prellenado de competencias desde perfil de puesto
- Sincronización departamento ↔ puesto
- Autocompletar dirección desde código postal

---

## 10. CONCLUSIONES

El sistema presenta una arquitectura sólida con relaciones correctamente establecidas entre tablas. Las principales oportunidades de mejora se encuentran en:

1. **Validaciones de datos personales** (CURP, RFC, NSS)
2. **Prellenado inteligente** de formularios basado en datos existentes
3. **Sincronización automática** entre módulos relacionados
4. **Experiencia de usuario** en formularios largos

**Estado general:** ✅ **BUENO** - El sistema es funcional y robusto, con oportunidades de optimización identificadas.

**Próximos pasos:**
1. Implementar validaciones de alta prioridad
2. Mejorar TokensDashboard con listado de pendientes
3. Implementar prellenado inteligente en formularios principales
