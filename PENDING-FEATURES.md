# Programación Faltante y Mejoras Pendientes

**Sistema de Gestión de Talento y Cumplimiento NOM-035 STPS 2018**

Fecha: 14 de Febrero de 2026

---

## 📊 Estado Actual del Sistema

### ✅ Funcionalidades Implementadas (Completadas)

El sistema actualmente cuenta con las siguientes funcionalidades operativas:

#### **Gestión de Talento**
- ✅ Catálogo de empleados con expediente digital
- ✅ Gestión de departamentos y puestos
- ✅ Matriz de habilidades con snapshots automáticos mensuales
- ✅ Nine Box Grid para evaluación de talento
- ✅ Evaluaciones de desempeño
- ✅ Alertas de retroceso de competencias (job diario)
- ✅ Importación masiva desde Excel

#### **Capacitación y Desarrollo**
- ✅ Catálogo de cursos con inscripciones
- ✅ Gestión de recursos didácticos
- ✅ Evaluaciones en línea con banco de preguntas
- ✅ Certificados de capacitación
- ✅ Dashboard de capacitación con métricas
- ✅ Notificaciones automáticas
- ✅ Detección de Necesidades de Capacitación (DNC)
- ✅ Catálogo de competencias organizacionales

#### **NOM-035 STPS 2018**
- ✅ Encuestas Guía I, II, III
- ✅ Tokens de acceso anónimo con QR
- ✅ Dashboard de resultados por nivel de riesgo
- ✅ Gestión de casos (acoso, violencia, estrés)
- ✅ Comité de seguridad y salud
- ✅ Minutas de comité con seguimiento
- ✅ Alertas predictivas de riesgo
- ✅ Reportes de cumplimiento

#### **Administración**
- ✅ Gestión financiera (facturas, órdenes de compra, gastos)
- ✅ Configuración SMTP para correos
- ✅ Historial de notificaciones
- ✅ Auditoría de documentos
- ✅ Roles y permisos personalizados
- ✅ Dashboard ejecutivo con KPIs

#### **Internacionalización**
- ✅ Sistema i18n implementado (ES/EN/FR)
- ✅ Selector de idioma en header
- ✅ Archivos de traducción creados
- ✅ Persistencia de idioma en localStorage

---

## 🚧 Programación Faltante por Categoría

### 1. **Niveles de Atención NOM-035** (Prioridad: P0 - CRÍTICA)

#### 1.1 Guía II - Análisis de Factores de Riesgo (16-50 trabajadores)

**Estado:** ❌ No implementado

**Descripción:** Sistema de análisis de factores de riesgo psicosocial para empresas de 16 a 50 trabajadores según NOM-035 numeral 7.

**Requerimientos:**
- [ ] Implementar cálculo de dominios y categorías según Guía II
- [ ] Clasificación de riesgo por dominio (nulo, bajo, medio, alto, muy alto)
- [ ] Dashboard de resultados por dominio
- [ ] Gráficos de radar por categorías
- [ ] Identificación de áreas de atención prioritaria
- [ ] Generación de reporte de resultados con interpretación
- [ ] Recomendaciones automáticas por dominio
- [ ] Exportación de resultados a PDF/Excel

**Dominios a evaluar:**
1. Ambiente de trabajo
2. Factores propios de la actividad
3. Organización del tiempo de trabajo
4. Liderazgo y relaciones en el trabajo
5. Entorno organizacional

**Complejidad:** Alta (40 horas de desarrollo)

---

#### 1.2 Guía III - Análisis Profundo (50+ trabajadores)

**Estado:** ❌ No implementado

**Descripción:** Sistema de análisis profundo de factores de riesgo psicosocial para empresas de 50 o más trabajadores según NOM-035 numeral 8.

**Requerimientos:**
- [ ] Implementar cálculo de 8 categorías y 5 dominios
- [ ] Clasificación de riesgo por categoría y dominio
- [ ] Dashboard multinivel (empresa, departamento, puesto)
- [ ] Análisis comparativo entre áreas
- [ ] Identificación de población vulnerable
- [ ] Correlación con casos reportados
- [ ] Plan de acción automático por nivel de riesgo
- [ ] Seguimiento de evolución temporal
- [ ] Generación de reporte ejecutivo con gráficos
- [ ] Exportación de resultados a PDF/Excel

**Categorías a evaluar:**
1. Condiciones en el ambiente de trabajo
2. Carga de trabajo
3. Falta de control sobre el trabajo
4. Jornada de trabajo
5. Interferencia en la relación trabajo-familia
6. Liderazgo
7. Relaciones en el trabajo
8. Violencia

**Complejidad:** Muy Alta (60 horas de desarrollo)

---

#### 1.3 Acciones Correctivas y Preventivas en 3 Niveles

**Estado:** ❌ No implementado (FASE 181 en todo.md - 48 tareas)

**Descripción:** Sistema de gestión de acciones correctivas y preventivas según nivel de riesgo identificado.

**Requerimientos:**

**Nivel 1 - Riesgo Nulo/Bajo:**
- [ ] Catálogo de acciones preventivas
- [ ] Asignación de responsables
- [ ] Calendario de actividades de bienestar
- [ ] Seguimiento de implementación
- [ ] Indicadores de clima laboral

**Nivel 2 - Riesgo Medio:**
- [ ] Plan de intervención por área
- [ ] Capacitación específica obligatoria
- [ ] Evaluación de efectividad
- [ ] Reuniones de seguimiento
- [ ] Ajustes organizacionales

**Nivel 3 - Riesgo Alto/Muy Alto:**
- [ ] Protocolo de atención inmediata
- [ ] Evaluación clínica especializada
- [ ] Reubicación temporal/permanente
- [ ] Seguimiento médico
- [ ] Auditoría de condiciones de trabajo
- [ ] Reestructuración organizacional

**Complejidad:** Muy Alta (80 horas de desarrollo)

---

### 2. **Mejoras de Experiencia de Usuario (UX)** (Prioridad: P1 - ALTA)

#### 2.1 Breadcrumbs (Migas de Pan)

**Estado:** ❌ No implementado

**Descripción:** Navegación contextual para páginas profundas del sistema.

**Requerimientos:**
- [ ] Componente Breadcrumb reutilizable
- [ ] Integración en todas las páginas de detalle
- [ ] Navegación dinámica basada en ruta
- [ ] Iconos contextuales por sección
- [ ] Responsive design

**Páginas prioritarias:**
- Detalle de empleado
- Detalle de caso NOM-035
- Detalle de curso
- Detalle de evaluación
- Detalle de minuta de comité

**Complejidad:** Media (8 horas de desarrollo)

---

#### 2.2 Tooltips Informativos

**Estado:** ⚠️ Parcialmente implementado

**Descripción:** Ayuda contextual en campos complejos y términos técnicos.

**Requerimientos:**
- [ ] Tooltips en formularios de encuestas NOM-035
- [ ] Tooltips en matriz de habilidades (niveles 1-5)
- [ ] Tooltips en Nine Box Grid (cuadrantes)
- [ ] Tooltips en dashboard (KPIs y métricas)
- [ ] Tooltips en configuración de alertas
- [ ] Glosario de términos NOM-035

**Complejidad:** Baja (6 horas de desarrollo)

---

#### 2.3 Validaciones de Formularios Mejoradas

**Estado:** ⚠️ Parcialmente implementado

**Descripción:** Validaciones en tiempo real con mensajes descriptivos.

**Requerimientos:**
- [ ] Validación de CURP con algoritmo oficial
- [ ] Validación de RFC con algoritmo oficial
- [ ] Validación de correo electrónico con verificación de dominio
- [ ] Validación de teléfono (10 dígitos México)
- [ ] Validación de fechas (no futuras para fecha de nacimiento)
- [ ] Validación de campos numéricos (rangos permitidos)
- [ ] Mensajes de error descriptivos y accionables
- [ ] Indicadores visuales de campo válido/inválido

**Complejidad:** Media (12 horas de desarrollo)

---

#### 2.4 Estados de Carga (Skeletons)

**Estado:** ✅ Implementado en páginas críticas

**Páginas con skeletons:**
- ✅ Employees.tsx
- ✅ Courses.tsx
- ✅ Dashboard.tsx

**Páginas pendientes:**
- [ ] CaseDetail.tsx
- [ ] SkillsMatrix.tsx
- [ ] NineBoxGrid.tsx
- [ ] Reports.tsx
- [ ] Committee.tsx

**Complejidad:** Baja (4 horas de desarrollo)

---

#### 2.5 Actualizaciones Optimistas

**Estado:** ✅ Implementado en páginas críticas

**Páginas con optimistic updates:**
- ✅ Employees.tsx (desactivar/reactivar)
- ✅ CaseDetail.tsx (agregar comentarios)

**Páginas pendientes:**
- [ ] SkillsMatrix.tsx (actualizar niveles)
- [ ] Courses.tsx (inscribir/desinscribir)
- [ ] Committee.tsx (agregar miembros)
- [ ] TrainingProgram.tsx (agregar cursos)

**Complejidad:** Media (8 horas de desarrollo)

---

### 3. **Optimización de Código** (Prioridad: P1 - ALTA)

#### 3.1 Bundle Size Optimization

**Estado:** ⚠️ Crítico - Build timeout después de 120 segundos

**Problema identificado:**
- 4176 módulos transformados en build
- Tiempo de build excesivo (>2 minutos)
- Bundle inicial probablemente >2MB

**Requerimientos:**
- [ ] Análisis de dependencias con `pnpm why`
- [ ] Identificar duplicados de bibliotecas
- [ ] Lazy loading de Chart.js (solo cargar cuando se use)
- [ ] Lazy loading de D3.js (solo cargar cuando se use)
- [ ] Lazy loading de QRCode (solo cargar en TokenManagement)
- [ ] Lazy loading de XLSX (solo cargar en exportaciones)
- [ ] Lazy loading de jsPDF (solo cargar en generación de PDFs)
- [ ] Code splitting por ruta (ya implementado)
- [ ] Tree shaking de bibliotecas no utilizadas
- [ ] Minificación agresiva de producción

**Complejidad:** Alta (20 horas de análisis y optimización)

---

#### 3.2 Eliminación de Código Duplicado

**Estado:** ❌ No realizado

**Requerimientos:**
- [ ] Auditoría de componentes duplicados
- [ ] Refactorización de lógica repetida en routers
- [ ] Consolidación de funciones de validación
- [ ] Consolidación de funciones de formateo
- [ ] Extracción de constantes duplicadas
- [ ] Creación de hooks personalizados reutilizables

**Complejidad:** Alta (24 horas de refactorización)

---

#### 3.3 Optimización de Consultas a Base de Datos

**Estado:** ⚠️ Requiere análisis

**Requerimientos:**
- [ ] Análisis de queries lentas (>500ms)
- [ ] Agregar índices faltantes en tablas grandes
- [ ] Optimizar joins complejos
- [ ] Implementar paginación en todas las listas
- [ ] Caché de consultas frecuentes
- [ ] Lazy loading de relaciones en Drizzle ORM

**Complejidad:** Alta (16 horas de optimización)

---

### 4. **Internacionalización Completa** (Prioridad: P2 - MEDIA)

#### 4.1 Traducción de Componentes Faltantes

**Estado:** ⚠️ Parcialmente implementado (60% completado)

**Componentes con traducciones:**
- ✅ common (welcome, dashboard, actions, etc.)
- ✅ dashboard (KPIs y métricas)
- ✅ employees (gestión de empleados)
- ✅ cases (gestión de casos)
- ✅ surveys (encuestas NOM-035)
- ✅ language (selector de idioma)

**Componentes pendientes:**
- [ ] courses (gestión de cursos)
- [ ] competencies (competencias organizacionales)
- [ ] skillsMatrix (matriz de habilidades)
- [ ] nineBoxGrid (nine box grid)
- [ ] committee (comité de seguridad)
- [ ] reports (reportes y análisis)
- [ ] financial (gestión financiera)
- [ ] settings (configuración)
- [ ] notifications (notificaciones)
- [ ] alerts (alertas)

**Complejidad:** Media (16 horas de traducción)

---

#### 4.2 Traducción de Correos Electrónicos

**Estado:** ❌ No implementado

**Requerimientos:**
- [ ] Plantillas de correo en ES/EN/FR
- [ ] Detección de idioma preferido del usuario
- [ ] Envío de correos en idioma del destinatario
- [ ] Asunto y cuerpo traducidos
- [ ] Firma corporativa traducida

**Complejidad:** Media (8 horas de desarrollo)

---

#### 4.3 Traducción de Reportes PDF

**Estado:** ❌ No implementado

**Requerimientos:**
- [ ] Generación de PDFs en idioma seleccionado
- [ ] Encabezados y pies de página traducidos
- [ ] Etiquetas de gráficos traducidos
- [ ] Recomendaciones traducidas
- [ ] Formato de fechas según idioma

**Complejidad:** Media (10 horas de desarrollo)

---

### 5. **Integraciones con Otros Software** (Prioridad: P2 - MEDIA)

#### 5.1 Integración con IMSS (Instituto Mexicano del Seguro Social)

**Estado:** ❌ No implementado

**Descripción:** Validación de afiliación y consulta de datos de trabajadores.

**Requerimientos:**
- [ ] Investigar API pública del IMSS
- [ ] Implementar autenticación con IMSS
- [ ] Validación de NSS (Número de Seguridad Social)
- [ ] Consulta de vigencia de derechos
- [ ] Consulta de salario base de cotización
- [ ] Sincronización de datos de trabajadores
- [ ] Manejo de errores y reintentos

**Complejidad:** Muy Alta (40 horas de desarrollo)

**Nota:** Requiere acceso a API oficial del IMSS (puede requerir trámites administrativos)

---

#### 5.2 Integración con SAT (Servicio de Administración Tributaria)

**Estado:** ❌ No implementado

**Descripción:** Validación de RFC y consulta de situación fiscal.

**Requerimientos:**
- [ ] Investigar API pública del SAT
- [ ] Validación de RFC con algoritmo oficial
- [ ] Consulta de situación fiscal de proveedores
- [ ] Validación de CFDI (facturas electrónicas)
- [ ] Descarga de XML de facturas
- [ ] Conciliación automática de facturas

**Complejidad:** Muy Alta (40 horas de desarrollo)

**Nota:** Requiere e.firma o certificado digital para acceso a API

---

#### 5.3 Integración con RENAPO (Registro Nacional de Población)

**Estado:** ❌ No implementado

**Descripción:** Validación de CURP y consulta de datos de identidad.

**Requerimientos:**
- [ ] Investigar API pública de RENAPO
- [ ] Validación de CURP con algoritmo oficial
- [ ] Consulta de datos de identidad (nombre, fecha de nacimiento, sexo)
- [ ] Autocompletado de datos al ingresar CURP
- [ ] Detección de duplicados por CURP
- [ ] Manejo de errores y reintentos

**Complejidad:** Alta (24 horas de desarrollo)

**Nota:** Requiere acceso a API oficial de RENAPO (puede requerir trámites administrativos)

---

#### 5.4 Integración con CONOCER (Consejo Nacional de Normalización y Certificación de Competencias Laborales)

**Estado:** ❌ No implementado

**Descripción:** Gestión de certificaciones de competencias laborales.

**Requerimientos:**
- [ ] Investigar API pública de CONOCER
- [ ] Consulta de estándares de competencia (EC)
- [ ] Registro de evaluadores certificados
- [ ] Generación de certificados oficiales EC0301 y EC0217.01
- [ ] Seguimiento de vigencia de certificaciones
- [ ] Renovación de certificaciones

**Complejidad:** Muy Alta (50 horas de desarrollo)

**Nota:** Requiere registro como entidad certificadora o convenio con organismo certificador

---

### 6. **Correlación de Campos y Autocompletado** (Prioridad: P1 - ALTA)

#### 6.1 Autocompletado de CURP

**Estado:** ❌ No implementado

**Descripción:** Autocompletado de datos personales al ingresar CURP.

**Requerimientos:**
- [ ] Validación de CURP con algoritmo oficial
- [ ] Extracción de datos de CURP (fecha de nacimiento, sexo, estado de nacimiento)
- [ ] Autocompletado de campos relacionados
- [ ] Integración con API de RENAPO (opcional)
- [ ] Detección de duplicados por CURP
- [ ] Validación de coherencia de datos

**Complejidad:** Media (12 horas de desarrollo)

---

#### 6.2 Autocompletado de RFC

**Estado:** ❌ No implementado

**Descripción:** Autocompletado de datos fiscales al ingresar RFC.

**Requerimientos:**
- [ ] Validación de RFC con algoritmo oficial
- [ ] Extracción de datos de RFC (fecha de nacimiento, homoclave)
- [ ] Autocompletado de campos relacionados
- [ ] Integración con API del SAT (opcional)
- [ ] Validación de coherencia con CURP
- [ ] Consulta de situación fiscal

**Complejidad:** Media (12 horas de desarrollo)

---

#### 6.3 Correlación Departamento-Puesto

**Estado:** ⚠️ Parcialmente implementado

**Descripción:** Filtrado de puestos disponibles según departamento seleccionado.

**Requerimientos:**
- [ ] Dropdown de puestos filtrado por departamento
- [ ] Actualización dinámica al cambiar departamento
- [ ] Validación de coherencia departamento-puesto
- [ ] Sugerencias de puestos similares
- [ ] Historial de asignaciones

**Complejidad:** Baja (6 horas de desarrollo)

---

#### 6.4 Correlación Puesto-Competencias

**Estado:** ⚠️ Parcialmente implementado

**Descripción:** Asignación automática de competencias requeridas según puesto.

**Requerimientos:**
- [ ] Perfil de competencias por puesto
- [ ] Asignación automática al crear empleado
- [ ] Detección de brechas de competencias
- [ ] Sugerencias de capacitación
- [ ] Actualización masiva de perfiles

**Complejidad:** Media (10 horas de desarrollo)

---

#### 6.5 Correlación Empleado-Evaluaciones

**Estado:** ⚠️ Parcialmente implementado

**Descripción:** Historial completo de evaluaciones por empleado.

**Requerimientos:**
- [ ] Timeline de evaluaciones
- [ ] Gráficos de evolución de desempeño
- [ ] Comparación con promedio del área
- [ ] Alertas de evaluaciones pendientes
- [ ] Exportación de historial

**Complejidad:** Media (8 horas de desarrollo)

---

#### 6.6 Correlación Curso-Instructor

**Estado:** ⚠️ Parcialmente implementado

**Descripción:** Asignación inteligente de instructores a cursos.

**Requerimientos:**
- [ ] Catálogo de instructores con especialidades
- [ ] Disponibilidad de instructores (calendario)
- [ ] Sugerencias de instructores por tema
- [ ] Historial de cursos impartidos
- [ ] Evaluación de instructores por participantes

**Complejidad:** Media (10 horas de desarrollo)

---

### 7. **Validación de Redacción y Ortografía** (Prioridad: P2 - MEDIA)

#### 7.1 Integración con API de Corrección Ortográfica

**Estado:** ❌ No implementado

**Descripción:** Validación automática de ortografía y gramática en campos de texto libre.

**Opciones de API:**
1. **LanguageTool** (Open Source, gratis)
   - Soporte para español, inglés, francés
   - API REST disponible
   - Sugerencias de corrección
   - Detección de errores gramaticales

2. **Grammarly API** (Comercial, pago)
   - Alta precisión
   - Sugerencias avanzadas
   - Requiere suscripción

**Requerimientos:**
- [ ] Investigar y seleccionar API
- [ ] Implementar cliente de API
- [ ] Validación en tiempo real (debounce 500ms)
- [ ] Subrayado de errores en texto
- [ ] Panel de sugerencias
- [ ] Aplicación de correcciones con un clic
- [ ] Diccionario personalizado (términos técnicos NOM-035)

**Campos prioritarios:**
- Comentarios de casos NOM-035
- Minutas de comité
- Observaciones de evaluaciones
- Descripciones de cursos
- Políticas y procedimientos

**Complejidad:** Alta (24 horas de desarrollo)

---

#### 7.2 Validación de Estilo de Redacción

**Estado:** ❌ No implementado

**Descripción:** Sugerencias de mejora de estilo y claridad.

**Requerimientos:**
- [ ] Detección de oraciones muy largas (>30 palabras)
- [ ] Detección de voz pasiva excesiva
- [ ] Sugerencias de sinónimos
- [ ] Detección de redundancias
- [ ] Índice de legibilidad (Flesch-Kincaid)
- [ ] Sugerencias de simplificación

**Complejidad:** Alta (20 horas de desarrollo)

---

### 8. **Funcionalidades de Reclutamiento** (Prioridad: P2 - MEDIA)

#### 8.1 Portal de Postulación en Línea

**Estado:** ❌ No implementado

**Descripción:** Formulario público para que candidatos se postulen a vacantes.

**Requerimientos:**
- [ ] Página pública de vacantes activas
- [ ] Formulario de postulación con campos requeridos
- [ ] Carga de CV (PDF, máximo 5MB)
- [ ] Carga de carta de presentación (opcional)
- [ ] Historial de empleos con referencias
- [ ] Test de integridad en línea
- [ ] Test de juicio situacional en línea
- [ ] Leyenda de veracidad de información
- [ ] Autorización para verificación de datos
- [ ] Confirmación por correo electrónico
- [ ] Seguimiento de estatus de postulación

**Complejidad:** Alta (32 horas de desarrollo)

---

#### 8.2 Sistema de Evaluación de Candidatos

**Estado:** ❌ No implementado

**Descripción:** Evaluación estructurada de candidatos con puntuación.

**Requerimientos:**
- [ ] Matriz de evaluación por puesto
- [ ] Criterios de evaluación ponderados
- [ ] Calificación de CV (automática)
- [ ] Calificación de entrevista (manual)
- [ ] Calificación de pruebas técnicas
- [ ] Calificación de referencias
- [ ] Puntuación total y ranking
- [ ] Comparación entre candidatos
- [ ] Recomendación de contratación

**Complejidad:** Alta (28 horas de desarrollo)

---

#### 8.3 Flujo de Contratación

**Estado:** ❌ No implementado

**Descripción:** Proceso completo desde candidato hasta empleado.

**Requerimientos:**
- [ ] Estados del proceso (postulado, revisión, entrevista, oferta, contratado, rechazado)
- [ ] Notificaciones automáticas por cambio de estado
- [ ] Generación de carta oferta
- [ ] Firma digital de contrato
- [ ] Checklist de onboarding
- [ ] Conversión de candidato a empleado
- [ ] Asignación automática de credenciales
- [ ] Bienvenida y capacitación inicial

**Complejidad:** Muy Alta (40 horas de desarrollo)

---

### 9. **Panel de Salida de Personal** (Prioridad: P2 - MEDIA)

#### 9.1 Entrevista de Salida Estructurada

**Estado:** ❌ No implementado

**Descripción:** Cuestionario de 15 preguntas sobre causas de rotación.

**Requerimientos:**
- [ ] Formulario de entrevista de salida
- [ ] 15 preguntas de opción múltiple sobre causas comunes de rotación:
  1. Salario y prestaciones
  2. Oportunidades de crecimiento
  3. Ambiente laboral
  4. Relación con jefe inmediato
  5. Carga de trabajo
  6. Reconocimiento y valoración
  7. Balance vida-trabajo
  8. Capacitación y desarrollo
  9. Comunicación organizacional
  10. Condiciones físicas de trabajo
  11. Herramientas y recursos
  12. Cultura organizacional
  13. Estabilidad laboral
  14. Ubicación y traslados
  15. Otra oferta laboral
- [ ] Campo de texto libre para observaciones
- [ ] Confidencialidad garantizada
- [ ] Almacenamiento seguro de respuestas

**Complejidad:** Media (12 horas de desarrollo)

---

#### 9.2 Dashboard de Análisis de Rotación

**Estado:** ❌ No implementado

**Descripción:** Visualización de causas de rotación y tendencias.

**Requerimientos:**
- [ ] Gráfico de barras con causas principales de rotación
- [ ] Filtros por período (mes, trimestre, año)
- [ ] Filtros por departamento
- [ ] Filtros por puesto
- [ ] Tasa de rotación por área
- [ ] Comparación con períodos anteriores
- [ ] Identificación de patrones
- [ ] Alertas de rotación alta (>15% mensual)

**Complejidad:** Alta (16 horas de desarrollo)

---

#### 9.3 Plan de Acción de Retención

**Estado:** ❌ No implementado

**Descripción:** Generación automática de plan de acción basado en causas de rotación.

**Requerimientos:**
- [ ] Análisis de causas principales (top 5)
- [ ] Generación de recomendaciones por causa
- [ ] Asignación de responsables
- [ ] Calendario de implementación
- [ ] Indicadores de éxito
- [ ] Seguimiento de avance
- [ ] Evaluación de efectividad
- [ ] Ajuste de estrategias

**Complejidad:** Alta (20 horas de desarrollo)

---

### 10. **Matriz de Eisenhower** (Prioridad: P3 - BAJA)

#### 10.1 Gestión de Tareas con Matriz de Eisenhower

**Estado:** ❌ No implementado

**Descripción:** Priorización de tareas según urgencia e importancia.

**Requerimientos:**
- [ ] Cuadrante 1: Urgente e Importante (hacer ahora)
- [ ] Cuadrante 2: No urgente pero Importante (planificar)
- [ ] Cuadrante 3: Urgente pero no Importante (delegar)
- [ ] Cuadrante 4: No urgente ni Importante (eliminar)
- [ ] Drag & drop entre cuadrantes
- [ ] Asignación de responsables
- [ ] Fechas límite
- [ ] Estados de tarea (pendiente, en progreso, completada)
- [ ] Notificaciones de vencimiento
- [ ] Dashboard de productividad

**Complejidad:** Alta (24 horas de desarrollo)

---

## 📈 Estimación de Esfuerzo Total

| Categoría | Prioridad | Horas Estimadas | Semanas (40h) |
|-----------|-----------|-----------------|---------------|
| Niveles de Atención NOM-035 | P0 | 180 horas | 4.5 semanas |
| Mejoras de UX | P1 | 46 horas | 1.2 semanas |
| Optimización de Código | P1 | 60 horas | 1.5 semanas |
| Internacionalización Completa | P2 | 34 horas | 0.9 semanas |
| Integraciones con Otros Software | P2 | 154 horas | 3.9 semanas |
| Correlación de Campos | P1 | 58 horas | 1.5 semanas |
| Validación de Redacción | P2 | 44 horas | 1.1 semanas |
| Funcionalidades de Reclutamiento | P2 | 100 horas | 2.5 semanas |
| Panel de Salida de Personal | P2 | 48 horas | 1.2 semanas |
| Matriz de Eisenhower | P3 | 24 horas | 0.6 semanas |
| **TOTAL** | | **748 horas** | **18.9 semanas** |

---

## 🎯 Roadmap Sugerido

### **Fase 1: Cumplimiento Crítico NOM-035** (Prioridad P0)
**Duración:** 6 semanas

1. Guía II - Análisis de Factores de Riesgo (2 semanas)
2. Guía III - Análisis Profundo (3 semanas)
3. Acciones Correctivas en 3 Niveles (1 semana inicial)

**Entregables:**
- Sistema completo de análisis de riesgos psicosociales
- Dashboard de resultados por dominio y categoría
- Reportes de cumplimiento NOM-035
- Plan de acción automático

---

### **Fase 2: Optimización y UX** (Prioridad P1)
**Duración:** 4 semanas

1. Optimización de Bundle Size (1 semana)
2. Eliminación de Código Duplicado (1 semana)
3. Mejoras de UX (breadcrumbs, tooltips, validaciones) (1 semana)
4. Correlación de Campos y Autocompletado (1 semana)

**Entregables:**
- Bundle optimizado (<1MB inicial)
- Código refactorizado y limpio
- Experiencia de usuario mejorada
- Validaciones robustas

---

### **Fase 3: Integraciones Externas** (Prioridad P2)
**Duración:** 5 semanas

1. Integración con RENAPO (CURP) (1 semana)
2. Integración con SAT (RFC) (1.5 semanas)
3. Integración con IMSS (NSS) (1.5 semanas)
4. Integración con CONOCER (certificaciones) (1 semana)

**Entregables:**
- Validación automática de CURP/RFC/NSS
- Autocompletado de datos de identidad
- Consulta de situación fiscal
- Gestión de certificaciones oficiales

---

### **Fase 4: Funcionalidades Avanzadas** (Prioridad P2)
**Duración:** 4 semanas

1. Portal de Reclutamiento (1.5 semanas)
2. Panel de Salida de Personal (1 semana)
3. Validación de Redacción y Ortografía (1 semana)
4. Internacionalización Completa (0.5 semanas)

**Entregables:**
- Sistema completo de reclutamiento
- Análisis de rotación de personal
- Corrección ortográfica automática
- Sistema 100% traducido a ES/EN/FR

---

## 🔧 Recomendaciones Técnicas

### **Prioridades Inmediatas (Esta Semana)**

1. **Optimizar Bundle Size** - El build está tomando >2 minutos, lo cual es crítico para productividad.
2. **Implementar Guía II** - Cumplimiento normativo prioritario para empresas 16-50 trabajadores.
3. **Completar Validaciones de CURP/RFC** - Mejora significativa de calidad de datos.

### **Mejoras de Arquitectura**

1. **Separar Frontend y Backend** - Considerar arquitectura de microservicios para escalar mejor.
2. **Implementar Caché** - Redis para consultas frecuentes y sesiones.
3. **Implementar CDN** - Para assets estáticos y reducir latencia.
4. **Implementar Queue** - Bull/BullMQ para jobs pesados (envío de correos, generación de reportes).

### **Mejoras de Seguridad**

1. **Auditoría de Seguridad** - Revisar vulnerabilidades con herramientas automatizadas.
2. **Implementar Rate Limiting** - Proteger APIs de abuso.
3. **Implementar CORS Estricto** - Limitar orígenes permitidos.
4. **Encriptar Datos Sensibles** - CURP, NSS, datos médicos.

---

## 📞 Contacto y Soporte

Para preguntas sobre este documento o priorización de funcionalidades, contactar a:

**Equipo de Desarrollo**
- Email: desarrollo@empresa.com
- Slack: #nom035-dev

**Product Owner**
- Email: productowner@empresa.com

---

**Última actualización:** 14 de Febrero de 2026
**Versión:** 1.0
**Autor:** Sistema de Gestión de Talento - Equipo de Desarrollo
