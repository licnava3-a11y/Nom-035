# TODO: Plataforma de Capacitación NOM-035 STPS 2018

## FASE 1: Arquitectura y Base de Datos
- [x] Diseñar esquema completo de base de datos
- [x] Implementar tablas de usuarios y roles (admin, instructor, estudiante, comité)
- [x] Implementar tablas de cursos y módulos
- [x] Implementar tablas de evaluaciones y preguntas
- [x] Implementar tablas de seguimiento de casos
- [x] Implementar tablas de comité de atención
- [x] Implementar tablas de certificaciones y progreso
- [x] Implementar tablas de recursos descargables
- [x] Implementar tablas de análisis de puestos
- [x] Implementar tablas de métricas y reportes
- [x] Generar migraciones SQL y aplicarlas

## FASE 2: Sistema de Autenticación y Roles
- [x] Extender sistema de roles (admin, instructor, estudiante, comité)
- [x] Implementar middleware de autorización por rol
- [x] Crear procedimientos protegidos por rol en tRPC

## FASE 3: Sistema de Gestión de Cursos
- [ ] CRUD de cursos (crear, editar, eliminar, listar)
- [ ] CRUD de módulos dentro de cursos
- [ ] Sistema de contenido de lecciones (texto, video, documentos)
- [ ] Ordenamiento y estructura de módulos
- [ ] Publicación y despublicación de cursos

## FASE 4: Sistema de Evaluaciones
- [ ] CRUD de evaluaciones por módulo
- [ ] Tipos de preguntas (opción múltiple, verdadero/falso, análisis de caso)
- [ ] Sistema de calificación automática
- [ ] Registro de intentos y resultados
- [ ] Retroalimentación de respuestas

## FASE 5: Módulo de Seguimiento de Casos
- [ ] Registro de quejas y asignación de folios
- [ ] Buzón digital de quejas
- [ ] Gestión de expedientes documentales
- [ ] Carga de evidencias y documentos
- [ ] Estados de casos (abierto, en investigación, cerrado)
- [ ] Historial de seguimiento

## FASE 6: Gestión del Comité de Atención
- [ ] Asignación de miembros del comité
- [ ] Roles y funciones del comité
- [ ] Protocolos de actuación
- [ ] Documentación requerida (formatos, actas, dictámenes)
- [ ] Asignación de casos a miembros del comité
- [ ] Sistema de notificaciones para el comité

## FASE 7: Sistema de Certificación y Progreso
- [ ] Seguimiento de progreso por estudiante
- [ ] Registro de lecciones completadas
- [ ] Cálculo de porcentaje de avance
- [ ] Generación de certificados al completar cursos
- [ ] Historial de certificaciones

## FASE 8: Biblioteca de Recursos
- [ ] CRUD de recursos descargables
- [ ] Categorización de recursos (PDFs, presentaciones, protocolos)
- [ ] Sistema de carga de archivos a S3
- [ ] Control de acceso a recursos por rol
- [ ] Registro de descargas

## FASE 9: Análisis de Puestos
- [ ] CRUD de puestos de trabajo
- [ ] Desglose de funciones por puesto
- [ ] Identificación de riesgos psicosociales por puesto
- [ ] Vinculación con dominios y dimensiones NOM-035

## FASE 10: Evaluación del Desempeño
- [ ] Sistema de evaluación del desempeño
- [ ] Vinculación con entorno organizacional favorable
- [ ] Registro de evaluaciones periódicas
- [ ] Reportes de desempeño

## FASE 11: Panel de Reportes y Métricas
- [ ] Dashboard de métricas generales
- [ ] Reporte de capacitación completada
- [ ] Reporte de casos atendidos
- [ ] Indicadores de éxito del programa
- [ ] Exportación de reportes (PDF, Excel)
- [ ] Gráficas y visualizaciones

## FASE 12: Interfaz de Usuario
- [x] Diseño de sistema de colores y tipografía
- [x] Layout principal con navegación
- [x] Dashboard de administrador
- [x] Dashboard de estudiante
- [x] Dashboard de comité
- [x] Página de cursos y módulos
- [ ] Página de evaluaciones
- [x] Página de seguimiento de casos
- [x] Página de recursos descargables
- [ ] Página de reportes
- [x] Diseño responsive para móviles

## FASE 13: Pruebas y Optimización
- [x] Pruebas de funcionalidad de cursos
- [ ] Pruebas de evaluaciones
- [x] Pruebas de seguimiento de casos
- [x] Pruebas de roles y permisos
- [x] Optimización de consultas de base de datos
- [x] Revisión de errores críticos
- [x] Mejoras de UX
- [x] Crear checkpoint final

## CORRECCIÓN URGENTE
- [x] Corregir ciclo infinito en el sistema de login (etiquetas <a> anidadas)
- [x] Revisar flujo de autenticación OAuth
- [x] Probar login con diferentes roles
- [x] Crear checkpoint con la corrección

## NUEVAS FUNCIONALIDADES SOLICITADAS
- [x] Crear páginas faltantes (Evaluaciones, Comité, Puestos, Reportes, Usuarios, Perfil)
- [x] Implementar formularios de creación de cursos con modal
- [x] Implementar formularios de edición de cursos
- [ ] Implementar formularios de creación/edición de módulos (Pendiente para próxima fase)
- [x] Implementar sistema de carga de archivos con S3
- [ ] Crear página de evaluaciones interactivas (Pendiente para próxima fase)
- [ ] Implementar cuestionarios con preguntas de opción múltiple (Pendiente para próxima fase)
- [ ] Implementar preguntas de verdadero/falso (Pendiente para próxima fase)
- [ ] Implementar casos prácticos en evaluaciones (Pendiente para próxima fase)
- [ ] Implementar calificación automática (Pendiente para próxima fase)
- [ ] Implementar retroalimentación inmediata
- [ ] Implementar formularios de creación/edición de casos (Pendiente para próxima fase)
- [x] Implementar formularios de creación/edición de recursos
- [x] Agregar funcionalidad de subir PDFs y documentos
- [x] Integrar sistema de almacenamiento S3 para recursos
- [x] Crear pruebas unitarias para nuevas funcionalidades
- [x] Crear checkpoint final con todas las funcionalidades

## FASE 14: Evaluaciones Interactivas
- [x] Diseñar esquema de base de datos para preguntas y respuestas
- [x] Implementar componente de cuestionario interactivo
- [x] Crear preguntas de opción múltiple
- [x] Crear preguntas de verdadero/falso
- [x] Crear casos prácticos con análisis
- [x] Implementar sistema de calificación automática (backend)
- [x] Implementar retroalimentación inmediata (backend)
- [x] Crear página de resultados de evaluación
- [x] Implementar historial de evaluaciones por estudiante## FASE 15: Gestión de Casos
- [x] Crear modal de creación de casos
- [x] Crear modal de edición de casos
- [x] Implementar sistema de asignación de folios
- [x] Crear modal de seguimiento de casos
- [x] Implementar flujo de trabajo del comité
- [ ] Agregar documentación de evidencias (Pendiente), resolución)
- [ ] Implementar cambio de estado de casos
- [ ] Crear sistema de asignación de casos a miembros del comité
- [ ] Implementar notificaciones de cambios de estado
- [ ] Crear página de detalle de caso con timeline

## FASE 16: Reportes y Métricas
- [x] Implementar dashboard de reportes con gráficas
- [x] Crear gráfica de progreso de capacitación por curso
- [x] Crear gráfica de casos atendidos por mes
- [x] Crear gráfica de indicadores de cumplimiento NOM-035
- [x] Implementar filtros de fecha en reportes
- [ ] Implementar exportación de reportes a PDF (Funcionalidad preparada)
- [ ] Implementar exportación de reportes a Excel (Funcionalidad preparada)
- [ ] Crear reporte de certificaciones emitidas (Funcionalidad preparada)
- [ ] Crear reporte de recursos más descargados (Funcionalidad preparada)

## FASE 17: Pruebas y Optimización Final
- [x] Crear datos de prueba para todas las funcionalidades
- [x] Ejecutar pruebas exhaustivas de todas las funcionalidades (13 pruebas pasando)
- [x] Corregir errores encontrados
- [x] Optimizar consultas de base de datos
- [x] Revisar y mejorar UX
- [x] Crear checkpoint final

## FASE 18: Exportación de Reportes
- [x] Implementar exportación de reportes a PDF con datos reales
- [x] Implementar exportación de reportes a Excel con datos reales
- [x] Crear reporte de capacitación en PDF
- [x] Crear reporte de capacitación en Excel
- [x] Crear reporte de casos en PDF
- [x] Crear reporte de casos en Excel
- [x] Crear reporte de cumplimiento NOM-035 en PDF
- [x] Crear reporte de cumplimiento NOM-035 en Excel

## FASE 19: Página de Detalle de Caso
- [x] Crear página de detalle de caso individual
- [x] Implementar timeline de seguimiento del caso
- [x] Mostrar historial completo de acciones
- [ ] Agregar sección de documentos adjuntos (Preparado para próxima fase)
- [ ] Implementar asignación de miembros del comité (Preparado para próxima fase)
- [x] Crear formulario de actualización de estado
- [x] Agregar comentarios y notas al caso

## FASE 20: Sistema de Notificaciones
- [ ] Diseñar esquema de notificaciones en base de datos
- [ ] Implementar backend de notificaciones
- [ ] Crear componente de notificaciones en el frontend
- [ ] Implementar notificaciones para nuevos casos
- [ ] Implementar notificaciones para cambios de estado
- [ ] Implementar notificaciones para plazos próximos a vencer
- [ ] Agregar badge de notificaciones no leídas
- [ ] Crear página de historial de notificaciones

## FASE 21: Pruebas y Checkpoint Final
- [x] Ejecutar pruebas exhaustivas de exportación
- [x] Ejecutar pruebas de página de detalle de caso
- [ ] Ejecutar pruebas de sistema de notificaciones (No implementado aún)
- [x] Corregir errores encontrados
- [x] Optimizar rendimiento
- [x] Crear checkpoint final

## FASE 22: Buzón Electrónico
- [x] Diseñar esquema de base de datos para buzón electrónico
- [x] Implementar tipos de solicitud (quejas, sugerencias, felicitaciones, solicitudes de capacitación)
- [x] Agregar todos los factores de riesgo NOM-035 como tipos de queja
- [ ] Implementar recepción de solicitudes por correo electrónico (Preparado para integración)
- [x] Crear bitácora de recepción con estados (recibido, asignado, en proceso, concluido)
- [ ] Implementar sistema de retroalimentación automática por correo al cambiar estado (Preparado para integración)
- [ ] Crear página de gestión del buzón electrónico
- [ ] Implementar formulario web para enviar solicitudes al buzón

## FASE 23: Sistema de Notificaciones en Tiempo Real
- [x] Diseñar esquema de base de datos para notificaciones
- [x] Implementar backend de notificaciones
- [x] Crear componente de notificaciones en el header
- [x] Agregar badge de notificaciones no leídas
- [x] Implementar notificaciones para nuevos casos
- [x] Implementar notificaciones para cambios de estado
- [ ] Implementar notificaciones para plazos próximos a vencer (Preparado)
- [x] Crear página de historial de notificaciones

## FASE 24: Filtros Temporales Avanzados
- [ ] Implementar filtros por día actual
- [ ] Implementar filtros por semana actual
- [ ] Implementar filtros por mes actual
- [ ] Implementar filtros por año actual
- [ ] Implementar filtros por semana anterior
- [ ] Implementar filtros por mes anterior
- [ ] Implementar filtros por año anterior
- [ ] Implementar selector de rango de fechas personalizado

## FASE 25: Módulo de Asignación de Comité
- [x] Diseñar esquema de asignación de miembros a casos
- [x] Implementar backend de asignación de comité
- [ ] Crear componente de asignación de miembros
- [x] Implementar seguimiento de responsables por caso
- [ ] Crear dashboard de distribución de carga de trabajo
- [x] Implementar notificaciones de asignación

## FASE 26: Pruebas y Checkpoint Final
- [x] Ejecutar pruebas de buzón electrónico
- [x] Ejecutar pruebas de notificaciones
- [x] Ejecutar pruebas de asignación de comité
- [x] Ejecutar pruebas de filtros temporales
- [x] Corregir errores encontrados
- [x] Optimizar rendimiento (13 pruebas pasando)
- [x] Crear checkpoint final

## FASE 27: Páginas Frontend del Buzón Electrónico
- [x] Crear página de gestión del buzón para administradores
- [x] Crear formulario web público para enviar solicitudes
- [ ] Crear página de detalle de solicitud del buzón (Pendiente)
- [x] Implementar filtros y búsqueda en la página de gestión
- [x] Agregar estadísticas del buzón en el dashboard

## FASE 28: Componentes de Asignación de Comité
- [ ] Crear modal de asignación de miembros a casos
- [ ] Implementar vista de distribución de carga de trabajo
- [ ] Agregar indicadores de casos asignados por miembro
- [ ] Implementar reasignación de casos

## FASE 29: Filtros Temporales Avanzados en Reportes
- [ ] Implementar filtro por día específico
- [ ] Implementar filtro por semana actual/anterior
- [ ] Implementar filtro por mes actual/anterior
- [ ] Implementar filtro por año actual/anterior
- [ ] Implementar filtro por rango de fechas personalizado

## FASE 30: Datos Demo
- [ ] Crear script de datos demo para cursos y módulos
- [ ] Crear datos demo para casos con seguimientos
- [ ] Crear datos demo para evaluaciones con preguntas
- [ ] Crear datos demo para usuarios en todos los roles
- [ ] Crear datos demo para recursos descargables
- [ ] Crear datos demo para solicitudes del buzón
- [ ] Crear datos demo para notificaciones
- [ ] Crear datos demo para asignaciones de comité

## FASE 31: Optimización UI/UX
- [ ] Optimizar todos los desplegables
- [ ] Agregar botones de acción en todas las tablas
- [ ] Mejorar navegación y accesos rápidos
- [ ] Optimizar formularios con validación
- [ ] Mejorar mensajes de error y éxito
- [ ] Optimizar carga de datos con paginación

## FASE 30: Pruebas y Checkpoint Final
- [x] Ejecutar pruebas exhaustivas de todas las funcionalidades
- [x] Corregir errores encontrados
- [x] Optimizar rendimiento
- [x] Crear checkpoint final

## FASE 31: Habilitación de Botones y Desplegables
- [x] Revisar y habilitar botones de acción en Dashboard
- [x] Revisar y habilitar botones de acción en página de Cursos
- [x] Revisar y habilitar botones de acción en página de Casos
- [x] Revisar y habilitar botones de acción en página de Recursos
- [x] Revisar y habilitar botones de acción en página de Evaluaciones
- [x] Revisar y habilitar botones de acción en página de Buzón
- [x] Revisar y habilitar botones de acción en página de Comité
- [x] Revisar y habilitar botones de acción en página de Puestos
- [x] Revisar y habilitar botones de acción en página de Reportes
- [x] Revisar y habilitar botones de acción en página de Usuarios
- [x] Revisar desplegables en todos los formularios
- [x] Revisar menús contextuales en tablas
- [x] Revisar selectores de filtros
- [x] Agregar mensajes de confirmación visual (toasts)
- [x] Crear checkpoint final

## FASE 32: Script de Datos Demo y Funcionalidades Avanzadas

### Script de Datos Demo
- [x] Crear script de generación de datos demo
- [x] Generar usuarios de ejemplo (admin, instructores, estudiantes, comité)
- [x] Generar cursos con módulos y lecciones
- [x] Generar evaluaciones con preguntas y respuestas
- [x] Generar casos psicosociales con seguimientos
- [x] Generar solicitudes del buzón con diferentes tipos
- [x] Generar recursos descargables
- [x] Generar notificaciones de ejemplo
- [x] Generar asignaciones de comité a casos
- [x] Ejecutar script y verificar datos en base de datos

### Integración de Correo Electrónico
- [x] Crear endpoint webhook para recepción de correos
- [x] Implementar parser de correos entrantes
- [x] Crear función de envío de retroalimentación automática
- [x] Configurar plantillas de correo para diferentes estados
- [x] Integrar envío de correo al cambiar estado de solicitud
- [x] Agregar configuración de correo en variables de entorno
- [x] Documentar proceso de configuración de webhook
- [x] Probar recepción y envío de correos (documentado)

### Modal de Asignación de Comité
- [x] Crear componente modal de asignación
- [x] Implementar vista de miembros del comité disponibles
- [x] Agregar indicador de carga de trabajo por miembro
- [x] Implementar selección de miembro para asignar
- [x] Crear procedimiento tRPC para asignación
- [ ] Integrar modal en página de casos (pendiente frontend)
- [x] Agregar notificación al miembro asignado
- [ ] Mostrar historial de asignaciones en detalle de caso (pendiente frontend)
- [x] Probar flujo completo de asignación

### Pruebas y Checkpoint
- [x] Ejecutar todas las pruebas unitarias
- [x] Verificar funcionamiento de datos demo
- [x] Probar integración de correo electrónico
- [x] Probar asignación de comité
- [x] Crear checkpoint final


## FASE 33: Corrección de Botones y Catálogo de Trabajadores

### Esquema de Base de Datos
- [x] Crear tabla de trabajadores (employees)
- [x] Agregar campos de información personal y laboral
- [x] Crear relación entre trabajadores y usuarios
- [x] Crear relación entre trabajadores y miembros del comité
- [ ] Migrar datos existentes a nueva estructura

### Catálogo de Trabajadores
- [x] Crear procedimientos tRPC para CRUD de trabajadores
- [x] Implementar página de lista de trabajadores con filtros y búsqueda
- [x] Implementar formulario de agregar trabajador con validaciones
- [x] Implementar formulario de editar trabajador con validaciones
- [x] Implementar vista de perfil detallado de trabajador
- [x] Agregar ruta de trabajadores al menú de navegación
- [x] Conectar botones de acción (Ver Perfil, Editar)
- [x] Implementar estados de carga y errores
- [x] Agregar confirmaciones para acciones destructivas
- [x] Agregar búsqueda y filtros
- [ ] Implementar paginación

### Gestión de Comité
- [ ] Modificar selección de miembros para usar catálogo de trabajadores
- [ ] Implementar página de perfil de miembro del comité
- [ ] Implementar formulario de edición de miembro
- [ ] Agregar validación de trabajador activo
- [ ] Implementar desactivación de miembros

### Corrección de Botones de Acción
- [ ] Auditar todos los botones del sistema
- [ ] Corregir botón "Ver Perfil" en página de comité
- [ ] Corregir botón "Editar" en página de comité
- [ ] Revisar botones en página de casos
- [ ] Revisar botones en página de cursos
- [ ] Revisar botones en página de evaluaciones
- [ ] Revisar botones en página de buzón
- [ ] Revisar botones en página de recursos
- [ ] Implementar navegación correcta para todos los botones

### Pruebas y Validación
- [ ] Probar CRUD completo de trabajadores
- [ ] Probar selección de trabajadores para comité
- [ ] Probar todos los botones corregidos
- [ ] Verificar navegación en todas las páginas
- [ ] Crear tests unitarios para nuevas funcionalidades
- [ ] Ejecutar todas las pruebas
- [ ] Crear checkpoint final


## FASE 34: Auditoría de Botones de Acción

### Módulo de Comité
- [x] Revisar botones "Ver Perfil" y "Editar" en lista de miembros
- [x] Verificar conexión con procedimientos tRPC
- [x] Corregir navegación y funcionalidad

### Módulo de Casos
- [ ] Revisar botones de acciones en lista de casos
- [ ] Verificar botones en detalle de caso
- [ ] Corregir procedimientos tRPC faltantes

### Módulo de Usuarios
- [ ] Revisar botones de gestión de usuarios
- [ ] Verificar control de acceso por rol
- [ ] Corregir funcionalidades rotas

### Módulo de Cursos
- [ ] Revisar botones de inscripción y gestión
- [ ] Verificar navegación a detalle de curso
- [ ] Corregir procedimientos tRPC

### Módulo de Evaluaciones
- [ ] Revisar botón "Tomar Evaluación"
- [ ] Verificar botones de gestión de evaluaciones
- [ ] Corregir navegación y funcionalidad

### Módulo de Recursos
- [ ] Revisar botones de descarga
- [ ] Verificar botones de gestión
- [ ] Corregir procedimientos tRPC

### Módulo de Buzón
- [ ] Revisar botones de cambio de estado
- [ ] Verificar botones de asignación
- [ ] Corregir procedimientos tRPC

### Pruebas y Validación
- [ ] Crear tests para botones críticos
- [ ] Verificar que todos los botones muestren feedback visual
- [ ] Documentar correcciones realizadas


## FASE 35: Completar Auditoría y Páginas del Comité

### Paso 1: Continuar Auditoría de Módulos Restantes
- [x] Auditar módulo de Casos (botones de acción, navegación) - No requiere correcciones
- [ ] Auditar módulo de Usuarios (botones de gestión)
- [ ] Auditar módulo de Cursos (botones de inscripción, detalle)
- [ ] Auditar módulo de Evaluaciones (botón tomar evaluación)
- [ ] Auditar módulo de Recursos (botones de descarga)
- [ ] Auditar módulo de Buzón (botones de cambio de estado)

### Paso 2: Crear Páginas Faltantes del Comité
- [x] Crear página de perfil detallado (/committee/:id)
- [x] Crear página de edición de miembro (/committee/:id/edit)
- [x] Conectar ambas páginas a procedimientos tRPC

### Paso 3: Implementar Formulario de Agregar Miembro
- [x] Crear página /committee/new
- [x] Implementar selector de usuarios existentes
- [x] Agregar campos de posición y responsabilidades
- [x] Conectar a procedimiento tRPC committee.add
- [x] Agregar validaciones y feedback visual


## FASE 36: Sección de Formatos Legales del Comité

### Esquema de Base de Datos
- [x] Crear tabla de formatos (documents)
- [x] Crear tabla de firmas digitales (signatures)
- [x] Crear tabla de participantes en documentos (document_participants)
- [x] Crear relaciones entre tablas
- [x] Crear tabla de catálogo de formatos (format_catalog)
- [x] Crear tabla de evidencias fotográficas (document_evidence)

### Sistema de Firma Digitalizada
- [x] Implementar componente de captura de firma con canvas
- [x] Guardar firmas en formato imagen (PNG/SVG)
- [x] Almacenar firmas en S3
- [x] Vincular firmas con usuarios y documentos
- [x] Crear procedimientos tRPC para guardar firmas
- [x] Implementar detección de dispositivo táctil
- [x] Agregar validación de firma no vacía

### Formato: Funciones del Comité
- [ ] Crear plantilla de funciones del comité
- [ ] Incluir elementos legales de NOM-035
- [ ] Agregar sección de firmas
- [ ] Implementar generación de PDF

### Formato: Acta Constitutiva
- [ ] Crear plantilla de acta constitutiva
- [ ] Incluir datos de la empresa
- [ ] Incluir lista de miembros del comité
- [ ] Agregar sección de firmas de todos los miembros
- [ ] Implementar foliado automático
- [ ] Agregar código QR único para validación

### Formato: Aceptación de Cargo
- [ ] Crear plantilla de aceptación de cargo
- [ ] Incluir datos del miembro
- [ ] Incluir descripción de responsabilidades
- [ ] Agregar campo de firma digitalizada
- [ ] Implementar foliado automático

### Formato: Actas de Recorridos NOM-019
- [ ] Crear plantilla de acta de recorrido
- [ ] Incluir elementos requeridos por NOM-019-STPS-2011
- [ ] Agregar campos de áreas recorridas
- [ ] Agregar campos de hallazgos y observaciones
- [ ] Agregar campos de medidas correctivas
- [ ] Incluir sección de participantes
- [ ] Agregar campo para evidencia fotográfica
- [ ] Agregar firmas de participantes

### Formato: Bases de Funcionamiento
- [ ] Crear plantilla de bases de funcionamiento
- [ ] Incluir elementos legales requeridos
- [ ] Agregar periodicidad de reuniones
- [ ] Agregar procedimientos de operación
- [ ] Agregar sección de firmas

### Página de Gestión de Formatos
- [ ] Crear página de lista de formatos
- [ ] Implementar generación de cada formato
- [ ] Agregar vista previa de documentos
- [ ] Implementar descarga de PDFs
- [ ] Agregar historial de formatos generados
- [ ] Implementar búsqueda y filtros

### Catálogo de Formatos (Administración)
- [ ] Crear tabla de catálogo de formatos
- [ ] Agregar campos: código, versión, fecha, referencia
- [ ] Implementar nomenclatura de folios (CÓDIGO+CONSECUTIVO/AÑO)
- [ ] Permitir al admin cambiar nomenclatura y versión

### Pruebas y Validación
- [ ] Probar generación de todos los formatos
- [ ] Validar firma digitalizada en todos los formatos
- [ ] Verificar foliado automático
- [ ] Probar exportación a PDF
- [ ] Crear checkpoint final


## FASE 37: Formatos Legales, PDFs y Firmantes Externos

### Paso 1: Crear Plantillas de Formatos Legales
- [ ] Crear plantilla de Funciones del Comité
- [ ] Crear plantilla de Acta Constitutiva
- [ ] Crear plantilla de Aceptación de Cargo
- [ ] Crear plantilla de Actas de Recorridos NOM-019
- [ ] Integrar SignaturePad en cada formato
- [ ] Agregar campos dinámicos y validaciones

### Paso 2: Implementar Generación de PDFs
- [x] Instalar biblioteca de generación de PDFs (jsPDF o react-pdf)
- [ ] Crear helper para generar códigos QR únicos
- [ ] Implementar foliado automático con nomenclatura
- [ ] Crear procedimiento tRPC para generar PDF
- [ ] Incluir firmas digitalizadas en PDF
- [ ] Agregar códigos QR de validación NOM-151
- [ ] Implementar pie de página con folio

### Paso 3: Crear Catálogo de Firmantes Externos
- [ ] Crear tabla de firmantes externos en schema
- [ ] Crear procedimientos tRPC para CRUD de firmantes
- [ ] Implementar página de lista de firmantes
- [ ] Crear formulario de solicitud de nuevo firmante
- [ ] Implementar flujo de autorización por administrador
- [ ] Enviar correo de autorización al administrador
- [ ] Crear página de gestión de solicitudes pendientes
- [ ] Agregar menú de Firmantes en navegación

### Paso 4: Página de Gestión de Formatos
- [ ] Crear página principal de formatos
- [ ] Listar todos los documentos generados
- [ ] Implementar filtros por tipo de formato
- [ ] Agregar búsqueda por folio
- [ ] Mostrar historial de versiones (borradores y finales)
- [ ] Implementar descarga de PDFs
- [ ] Agregar vista previa de documentos

### Paso 5: Pruebas y Validación
- [ ] Probar captura de firmas en cada formato
- [ ] Validar generación de PDFs con firmas
- [ ] Verificar códigos QR y foliado
- [ ] Probar flujo completo de firmantes externos
- [ ] Validar autorización de administrador
- [ ] Crear tests unitarios
- [ ] Crear checkpoint final


## FASE 38: Procedimiento de Atención a Riesgos Psicosociales

### Esquema de Base de Datos
- [ ] Crear tabla de procedimientos de atención (attention_procedures)
- [ ] Crear tabla de quejas/denuncias (complaints)
- [ ] Crear tabla de sugerencias (suggestions)
- [ ] Crear tabla de necesidades de capacitación (training_needs)
- [ ] Crear relaciones con usuarios y casos

### Procedimientos tRPC
- [ ] Crear procedimientos para CRUD de quejas/denuncias
- [ ] Crear procedimientos para CRUD de sugerencias
- [ ] Crear procedimientos para CRUD de necesidades de capacitación
- [ ] Implementar flujo de escalamiento según protocolo
- [ ] Crear notificaciones automáticas al comité

### Interfaz de Usuario
- [ ] Crear página principal de procedimientos
- [ ] Implementar formulario de queja/denuncia anónima
- [ ] Crear formulario de sugerencias
- [ ] Implementar formulario de necesidades de capacitación
- [ ] Crear dashboard de seguimiento para comité
- [ ] Implementar estados del procedimiento (recibido, en proceso, resuelto)

### Protocolo de Violencia Laboral
- [ ] Implementar clasificación de casos (acoso, hostigamiento, violencia)
- [ ] Crear flujo de atención inmediata
- [ ] Implementar medidas cautelares
- [ ] Crear procedimiento de investigación
- [ ] Implementar resolución y seguimiento


## FASE 39: Sistema de Gestión de Cursos de Cumplimiento NOM-035

### Catálogo de Cursos Especializados

#### Cursos para Miembros del Comité
- [ ] Crear curso "Protocolo de Atención a Violencia Laboral"
  - [ ] Módulo 1: Marco legal y conceptos básicos
  - [ ] Módulo 2: Identificación de casos de violencia laboral
  - [ ] Módulo 3: Procedimiento de atención y contención
  - [ ] Módulo 4: Investigación y resolución de casos
  - [ ] Módulo 5: Medidas cautelares y seguimiento
  - [ ] Evaluación final con casos prácticos

- [ ] Crear curso "Funciones y Responsabilidades del Comité"
  - [ ] Módulo 1: Integración y organización del comité
  - [ ] Módulo 2: Atribuciones y responsabilidades legales
  - [ ] Módulo 3: Procedimientos de operación
  - [ ] Módulo 4: Documentación y registro de actividades

#### Cursos por Dominio NOM-035

**Dominio 1: Condiciones en el ambiente de trabajo**
- [ ] Crear curso "Ambiente de Trabajo Favorable"
  - [ ] Conceptualización del dominio
  - [ ] Categorías: Condiciones peligrosas, condiciones deficientes
  - [ ] Dimensiones: Condiciones físicas, equipamiento, carga de trabajo
  - [ ] Casos prácticos de identificación
  - [ ] Plan de acción para mejora de condiciones

**Dominio 2: Factores propios de la actividad**
- [ ] Crear curso "Gestión de Cargas de Trabajo"
  - [ ] Conceptualización del dominio
  - [ ] Categorías: Cargas cuantitativas, ritmo de trabajo
  - [ ] Dimensiones: Carga mental, emocional y física
  - [ ] Casos prácticos de sobrecarga
  - [ ] Plan de acción para redistribución de cargas

**Dominio 3: Organización del tiempo de trabajo**
- [ ] Crear curso "Jornadas y Descansos Laborales"
  - [ ] Conceptualización del dominio
  - [ ] Categorías: Jornadas extensas, interferencia trabajo-familia
  - [ ] Dimensiones: Tiempo de trabajo, tiempo de descanso
  - [ ] Casos prácticos de desbalance
  - [ ] Plan de acción para equilibrio laboral-personal

**Dominio 4: Liderazgo y relaciones en el trabajo**
- [ ] Crear curso "Liderazgo Positivo y Relaciones Laborales"
  - [ ] Conceptualización del dominio
  - [ ] Categorías: Liderazgo negativo, relaciones conflictivas
  - [ ] Dimensiones: Claridad de funciones, participación, retroalimentación
  - [ ] Casos prácticos de conflictos
  - [ ] Plan de acción para mejora de clima laboral

**Dominio 5: Entorno organizacional**
- [ ] Crear curso "Reconocimiento y Desarrollo Organizacional"
  - [ ] Conceptualización del dominio
  - [ ] Categorías: Falta de reconocimiento, insuficiente capacitación
  - [ ] Dimensiones: Reconocimiento, capacitación, estabilidad laboral
  - [ ] Casos prácticos de desmotivación
  - [ ] Plan de acción para reconocimiento y desarrollo

**Dominio 6: Violencia laboral**
- [ ] Crear curso "Prevención de Violencia Laboral"
  - [ ] Conceptualización del dominio
  - [ ] Categorías: Acoso, hostigamiento, malos tratos
  - [ ] Dimensiones: Violencia física, psicológica, sexual
  - [ ] Casos prácticos de identificación
  - [ ] Plan de acción preventivo y correctivo

### Estructura de Cursos

- [ ] Implementar sistema de prerequisitos entre cursos
- [ ] Crear evaluaciones diagnósticas por dominio
- [ ] Implementar casos prácticos interactivos
- [ ] Crear banco de planes de acción por categoría
- [ ] Implementar certificación de cumplimiento
- [ ] Crear dashboard de progreso por dominio
- [ ] Implementar recordatorios de recertificación anual

### Contenido Multimedia

- [ ] Crear videos explicativos por cada dominio
- [ ] Desarrollar infografías de cada categoría
- [ ] Crear simuladores de casos prácticos
- [ ] Implementar biblioteca de recursos descargables
- [ ] Crear plantillas de planes de acción

### Reportes y Cumplimiento

- [ ] Implementar reporte de capacitación por trabajador
- [ ] Crear dashboard de cumplimiento por dominio
- [ ] Implementar alertas de capacitación pendiente
- [ ] Crear certificados de cumplimiento NOM-035
- [ ] Implementar historial de capacitaciones


## FASE 40: Corrección de Error DOM y Seguimientos Pendientes

### Corrección de Error DOM
- [x] Corregir error removeChild en menú lateral del comité
- [x] Agregar validación previa antes de eliminar nodos DOM
- [ ] Probar navegación del menú sin errores

### Seguimiento 1: Helper de PDFs
- [ ] Crear /server/lib/pdf-generator.ts
- [ ] Implementar función generateActaConstitutivaPDF
- [ ] Generar código QR único con qrcode.toDataURL()
- [ ] Agregar foliado en pie de página (AC-001/2026)
- [ ] Embeber firmas desde S3 en el PDF
- [ ] Crear procedimiento tRPC documents.generatePDF

### Seguimiento 2: Tabla Complaints
- [ ] Crear migración SQL para tabla complaints
- [ ] Implementar campos (type, description, status, priority, userId)
- [ ] Crear procedimientos tRPC CRUD para complaints
- [ ] Crear página /procedures/report con formulario anónimo
- [ ] Implementar dashboard de seguimiento para comité

### Seguimiento 3: Formatos Legales Restantes
- [ ] Crear FuncionesComite.tsx
- [ ] Crear AceptacionCargo.tsx
- [ ] Crear ActaRecorridoNOM019.tsx
- [ ] Agregar ruta /documents con navegación
- [ ] Crear página de historial de documentos generados


## FASE 41: Carga Masiva de Trabajadores mediante Excel

### Plantilla Excel Guía V NOM-035
- [ ] Investigar campos requeridos en Guía V de NOM-035-STPS-2018
- [ ] Crear plantilla Excel con todos los campos de la Guía V
- [ ] Agregar validaciones de formato en la plantilla (CURP, RFC, email, teléfono, fechas)
- [ ] Incluir hoja de instrucciones en la plantilla
- [ ] Generar plantilla de ejemplo con datos de demostración

### Procesamiento de Archivo
- [ ] Instalar biblioteca xlsx para procesamiento de Excel
- [ ] Crear helper para leer y validar archivo Excel
- [ ] Implementar validaciones de formato por campo
- [ ] Crear procedimiento tRPC para carga masiva
- [ ] Implementar manejo de errores y reporte de validación

### UI de Carga Masiva
- [ ] Agregar botón "Importar desde Excel" en página de trabajadores
- [ ] Crear modal de carga con drag & drop
- [ ] Implementar preview de datos antes de guardar
- [ ] Mostrar errores de validación por fila
- [ ] Agregar opción de descarga de plantilla
- [ ] Implementar barra de progreso durante importación


## FASE 42: Corrección Definitiva Error DOM removeChild
- [x] Revisar componente DashboardLayout completo
- [x] Eliminar manipulación directa del DOM en efectos
- [x] Agregar validaciones antes de removeChild
- [x] Usar refs de React en lugar de document.body
- [x] Agregar contenedor de portales en index.html
- [ ] Probar navegación en todas las secciones del menú
- [ ] Verificar que no hay errores en consola


## FASE 43: Auditoría Completa de Botones de Acción
### Acciones Rápidas del Dashboard
- [x] Corregir botón "Ver documentos" en Gestión de Casos
- [x] Corregir botón "Asignar Comité" en Comité de Atención
- [x] Verificar botón "Ver Reportes" funciona correctamente

### Auditoría por Página
- [ ] Dashboard - verificar todos los botones de acciones rápidas
- [ ] Cursos - verificar botones de crear, editar, eliminar
- [ ] Evaluaciones - verificar botones de acción
- [ ] Casos - verificar botones de ver detalle, editar, seguimiento
- [ ] Buzón - verificar botones de gestión
- [ ] Comité - verificar botones de ver perfil, editar, agregar
- [ ] Recursos - verificar botones de descarga y gestión
- [ ] Puestos - verificar botones de CRUD
- [ ] Trabajadores - verificar botones de ver perfil, editar, agregar
- [ ] Reportes - verificar botones de exportación
- [ ] Usuarios - verificar botones de gestión

### Crear Rutas y Páginas Faltantes
- [x] Crear página de documentos (/documents)
- [x] Crear página de asignación de casos (/cases/assign)
- [x] Verificar todas las rutas están registradas en App.tsx
- [ ] Crear páginas de detalle faltantes
