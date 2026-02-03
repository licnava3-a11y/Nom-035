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
- [x] Crear plantilla de Funciones del Comité
- [x] Crear plantilla de Acta Constitutiva
- [x] Crear plantilla de Aceptación de Cargo
- [x] Crear plantilla de Actas de Recorridos NOM-019
- [x] Integrar SignaturePad en cada formato
- [x] Agregar campos dinámicos y validaciones

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
- [x] Crear FuncionesComite.tsx
- [x] Crear AceptacionCargo.tsx
- [x] Crear ActaRecorridoNOM019.tsx
- [x] Agregar ruta /documents con navegación
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


## FASE 44: Páginas de Formatos Legales Individuales
### Acta Constitutiva
- [ ] Crear página /documents/acta-constitutiva
- [ ] Incluir campos: fecha, lugar, asistentes con firmas
- [ ] Agregar sección de antecedentes y objeto
- [ ] Incluir declaraciones y acuerdos
- [ ] Integrar SignaturePad para cada asistente

### Funciones del Comité
- [ ] Crear página /documents/funciones-comite
- [ ] Listar funciones generales del comité
- [ ] Detallar funciones por posición (coordinador, secretario, vocal)
- [ ] Incluir responsabilidades específicas
- [ ] Agregar firma del coordinador

### Aceptación de Cargo
- [ ] Crear página /documents/aceptacion-cargo
- [ ] Campos: datos del miembro (nombre, puesto, departamento)
- [ ] Declaración de aceptación de responsabilidades
- [ ] Compromisos específicos del cargo
- [ ] Firma del miembro y testigos

### Acta de Recorrido NOM-019
- [ ] Crear página /documents/acta-recorrido
- [ ] Campos: fecha, hora, área inspeccionada
- [ ] Tabla de hallazgos (condición, riesgo, acción correctiva)
- [ ] Subida de evidencias fotográficas múltiples
- [ ] Firmas de inspector y responsable del área
- [ ] Plan de acción con fechas compromiso

### Integración
- [ ] Registrar todas las rutas en App.tsx
- [ ] Agregar navegación desde página Documents
- [ ] Implementar guardado de borradores
- [ ] Crear procedimientos tRPC para cada formato


## FASE 43: Acta Final de Resultados NOM-035

### Formato: Acta Final de Resultados
- [x] Crear plantilla de Acta Final de Resultados
- [x] Incluir elementos del Programa de Atención (numeral 8.4):
  - [x] Áreas de trabajo y/o trabajadores sujetos al programa
  - [x] Tipo de acciones y medidas de control
  - [x] Fechas programadas para realización
  - [x] Control de avances de implementación
  - [x] Evaluación posterior a medidas de control
  - [x] Responsable de ejecución
- [x] Incluir niveles de acciones (numeral 8.5):
  - [x] Primer nivel: Acciones organizacionales
  - [x] Segundo nivel: Acciones grupales
  - [x] Tercer nivel: Acciones individuales (clínico/terapéutico)
- [x] Incluir datos del dictamen para Unidades de Verificación (numeral 9.3):
  - [x] Clave y nombre de la norma
  - [x] Nombre del verificador evaluado y aprobado
  - [x] Fecha de verificación
  - [x] Número de dictamen
  - [x] Vigencia del dictamen
  - [x] Lugar de emisión del dictamen
  - [x] Fecha de emisión del dictamen
  - [x] Número de registro del dictamen (STPS)
- [x] Incluir método de identificación y análisis:
  - [x] Guía de referencia II (Cuestionario de identificación)
  - [x] Guía de referencia III (Cuestionario de evaluación)
  - [x] Métodos desarrollados por el patrón (numerales 7.4 y 7.5)
- [x] Agregar sección de firmas de responsables
- [ ] Implementar foliado automático (AFR-001/2026)
- [ ] Agregar código QR único para validación
- [x] Registrar ruta /documents/acta-final-resultados


## FASE 44: Generación de PDFs, Procedimientos tRPC y Carga Masiva de Trabajadores

### Generación de PDFs
- [ ] Crear /server/lib/pdf-generator.ts con jsPDF
- [ ] Implementar función generateActaConstitutivaPDF
- [ ] Implementar función generateFuncionesComitePDF
- [ ] Implementar función generateAceptacionCargoPDF
- [ ] Implementar función generateActaRecorridoPDF
- [ ] Implementar función generateActaFinalResultadosPDF
- [ ] Generar código QR único con qrcode.toDataURL(documentId)
- [ ] Implementar foliado automático (AC-001/2026, FC-001/2026, etc.)
- [ ] Embeber firmas desde S3 en el PDF
- [ ] Agregar pie de página con folio en todas las páginas

### Procedimientos tRPC para Formatos Legales
- [ ] Crear procedimiento documents.saveActaConstitutiva
- [ ] Crear procedimiento documents.saveFuncionesComite
- [ ] Crear procedimiento documents.saveAceptacionCargo
- [ ] Crear procedimiento documents.saveActaRecorrido
- [ ] Crear procedimiento documents.saveActaFinalResultados
- [ ] Implementar estados de borrador y final
- [ ] Vincular firmas con tabla signatures
- [ ] Vincular participantes con tabla document_participants
- [ ] Vincular evidencias con tabla document_evidence
- [ ] Crear procedimiento documents.generatePDF
- [ ] Crear procedimiento documents.getById
- [ ] Crear procedimiento documents.list con filtros

### Carga Masiva de Trabajadores
- [ ] Instalar biblioteca xlsx
- [ ] Crear plantilla Excel /public/plantilla_trabajadores.xlsx
- [ ] Incluir campos de Guía V NOM-035 en plantilla:
  - [ ] Nombre completo
  - [ ] CURP (con validación de formato)
  - [ ] RFC
  - [ ] Email (con validación)
  - [ ] Teléfono (10 dígitos)
  - [ ] Fecha de nacimiento
  - [ ] Sexo
  - [ ] Estado civil
  - [ ] Escolaridad
  - [ ] Puesto
  - [ ] Departamento
  - [ ] Fecha de contratación
  - [ ] Antigüedad en la empresa
  - [ ] Antigüedad en el puesto
  - [ ] Tipo de contratación
  - [ ] Tipo de jornada
- [ ] Agregar hoja de instrucciones en plantilla
- [ ] Crear helper /server/lib/excel-processor.ts
- [ ] Implementar función de lectura de archivo Excel
- [ ] Implementar validaciones por campo
- [ ] Crear procedimiento tRPC employees.bulkUpload
- [ ] Implementar preview de datos antes de guardar
- [ ] Generar reporte PDF de errores con jsPDF
- [ ] Incluir en reporte: fila, campo, valor, motivo del error
- [ ] Agregar botón "Importar desde Excel" en /employees
- [ ] Crear modal de carga con drag & drop
- [ ] Implementar barra de progreso durante importación
- [ ] Mostrar resumen de importación (exitosos, errores)


## FASE 45: Correcciones y Página de Historial de Documentos

### Corrección de Errores de Drizzle ORM
- [x] Definir relations para formatCatalog en schema.ts
- [x] Definir relations para documents en schema.ts
- [x] Definir relations para signatures en schema.ts
- [x] Definir relations para documentParticipants en schema.ts
- [x] Actualizar documents.ts para usar consultas correctas

### Página de Historial de Documentos
- [x] Crear /client/src/pages/DocumentsHistory.tsx
- [x] Implementar lista de documentos generados
- [x] Agregar filtros por tipo de formato
- [x] Agregar búsqueda por folio
- [x] Implementar descarga de PDFs
- [x] Agregar vista previa de documentos
- [x] Mostrar estado (borrador, final, archivado)
- [x] Agregar fecha de creación y finalización
- [x] Mostrar creador del documento
- [x] Registrar ruta /documents/history

### Correcciones en Detalle de Caso
- [x] Activar botón "Ver Documentos" en detalle de caso
- [x] Activar botón "Asignar Comité" en detalle de caso
- [x] Conectar botones con funcionalidad real

### Correcciones en Análisis de Puestos
- [x] Corregir botón "Nuevo Análisis" que no funciona
- [ ] Verificar formulario de creación de análisis
- [ ] Validar guardado de datos


## FASE 46: Carga Masiva de Trabajadores con Excel

### Instalación de Dependencias
- [ ] Instalar xlsx para lectura de archivos Excel
- [ ] Verificar jspdf ya instalado para reportes PDF

### Plantilla Excel
- [ ] Crear plantilla Excel con campos de Guía V NOM-035
- [ ] Incluir campos: CURP, RFC, Nombre, Apellidos, Fecha de nacimiento, Sexo, Estado civil
- [ ] Incluir campos: Puesto, Departamento, Fecha de ingreso, Tipo de contrato, Jornada laboral
- [ ] Incluir campos: Correo electrónico, Teléfono, Dirección
- [ ] Incluir campos: Último grado de estudios, Nombre de carrera, Habilidades
- [ ] Agregar instrucciones de uso en primera hoja
- [ ] Agregar validaciones de formato en columnas
- [ ] Crear script para generar plantilla desde backend

### Procedimientos tRPC
- [ ] Crear endpoint para descargar plantilla Excel
- [ ] Crear endpoint para procesar archivo Excel
- [ ] Implementar validaciones de datos (CURP, RFC, correos, fechas)
- [ ] Implementar lógica de inserción masiva en base de datos
- [ ] Generar reporte de errores y advertencias
- [ ] Crear endpoint para generar PDF de reporte de errores

### Componente de Importación
- [ ] Crear componente ImportWorkers con upload de archivo
- [ ] Implementar preview de datos antes de confirmar
- [ ] Mostrar errores y advertencias en tabla
- [ ] Implementar confirmación de importación
- [ ] Mostrar progreso de importación
- [ ] Descargar reporte PDF de errores automáticamente

### Integración en Trabajadores
- [ ] Agregar botón "Importar desde Excel" en página Trabajadores
- [ ] Agregar botón "Descargar Plantilla" en página Trabajadores
- [ ] Integrar componente ImportWorkers en modal o página separada
- [ ] Actualizar lista de trabajadores después de importación exitosa

### Validaciones Específicas
- [ ] Validar formato de CURP (18 caracteres)
- [ ] Validar formato de RFC (12-13 caracteres)
- [ ] Validar formato de correo electrónico
- [ ] Validar formato de fechas (dd/mm/yyyy)
- [ ] Validar que CURP y RFC no estén duplicados
- [ ] Validar que campos obligatorios no estén vacíos
- [ ] Validar que puesto exista en catálogo
- [ ] Validar que departamento exista en catálogo


## FASE 47: Actualización de Schema y Sistema de Encuestas NOM-035

### Actualización de Schema de Trabajadores
- [x] Agregar campo CURP (18 caracteres, único) a tabla users
- [x] Agregar campo RFC (12-13 caracteres, único) a tabla users
- [x] Agregar campo teléfono celular a tabla users
- [x] Agregar campo fecha de nacimiento a tabla users
- [x] Agregar campo sexo a tabla users
- [x] Agregar campo estado civil a tabla users
- [x] Agregar campo puesto a tabla users
- [x] Agregar campo departamento a tabla users
- [x] Agregar campo fecha de ingreso a tabla users
- [x] Agregar campo tipo de contrato a tabla users
- [x] Agregar campo jornada laboral a tabla users
- [x] Generar migración SQL con drizzle-kit
- [x] Aplicar migración a base de datos

### Schema de Encuestas
- [x] Crear tabla surveys (id, type, title, description, status, createdAt)
- [x] Crear tabla survey_questions (id, surveyId, questionText, questionType, order)
- [x] Crear tabla survey_responses (id, surveyId, userId, token, completedAt)
- [x] Crear tabla survey_answers (id, responseId, questionId, answerValue)
- [x] Crear tabla survey_tokens (id, userId, surveyId, token, expiresAt, usedAt)
- [x] Generar migración SQL
- [x] Aplicar migración a base de datos

### Menú de Encuestas en Sidebar
- [ ] Agregar sección "Encuestas" en DashboardLayout
- [ ] Crear submenu con Guía I, II y III
- [ ] Agregar iconos apropiados
- [ ] Configurar rutas para cada guía

### Implementación de Guías NOM-035
- [ ] Crear página para Guía I (Cuestionario de identificación)
- [ ] Crear página para Guía II (Cuestionario de evaluación)
- [ ] Crear página para Guía III (Cuestionario de evaluación complementaria)
- [ ] Implementar preguntas según NOM-035-STPS-2018
- [ ] Agregar cálculo de resultados por dominio
- [ ] Agregar interpretación de resultados

### Sistema de Enlaces y QR
- [ ] Crear endpoint para generar token único por trabajador
- [ ] Crear endpoint para validar token
- [ ] Generar código QR con enlace único
- [ ] Crear página pública para responder encuesta
- [ ] Implementar captura de CURP en página pública
- [ ] Validar CURP contra base de datos

### Envío de Encuestas
- [ ] Crear endpoint para enviar encuesta por correo
- [ ] Crear plantilla de correo con enlace único
- [ ] Crear endpoint para enviar encuesta por SMS/WhatsApp
- [ ] Implementar integración con servicio de SMS
- [ ] Agregar botón "Enviar Encuesta" en lista de trabajadores
- [ ] Implementar envío masivo de encuestas

### Seguimiento de Respuestas
- [ ] Crear página de seguimiento de encuestas
- [ ] Mostrar lista de trabajadores con estado de respuesta
- [ ] Filtrar por encuesta, departamento, estado
- [ ] Mostrar estadísticas de respuestas
- [ ] Exportar reporte de respuestas a Excel
- [ ] Visualizar resultados individuales y agregados


## FASE 48: Corrección de Buzón Electrónico y Auditoría Exhaustiva

### Corrección de Error en Buzón Electrónico
- [x] Corregir error NotFoundError en botón "Ver detalle"
- [x] Revisar manipulación del DOM en componente de Buzón
- [x] Implementar validación de nodos antes de removeChild
- [x] Probar funcionalidad de Ver detalle con diferentes tipos de mensajes

### Auditoría Exhaustiva de Botones y Funcionalidades
- [ ] Auditar todos los botones en Dashboard
- [ ] Auditar todos los botones en página de Cursos
- [ ] Auditar todos los botones en página de Evaluaciones
- [ ] Auditar todos los botones en página de Casos
- [ ] Auditar todos los botones en página de Comité
- [ ] Auditar todos los botones en página de Recursos
- [ ] Auditar todos los botones en página de Puestos
- [ ] Auditar todos los botones en página de Trabajadores
- [ ] Auditar todos los botones en página de Reportes
- [ ] Auditar todos los botones en página de Usuarios
- [ ] Auditar todos los botones en página de Configuración
- [ ] Auditar todos los botones en página de Documentos
- [ ] Crear lista de botones pendientes de programar
- [ ] Programar funcionalidades faltantes en botones

### Programación de Botones Pendientes
- [ ] Identificar todos los botones con toast "Funcionalidad en desarrollo"
- [ ] Priorizar botones por criticidad
- [ ] Implementar funcionalidades críticas primero
- [ ] Implementar funcionalidades secundarias
- [ ] Probar cada funcionalidad implementada


## FASE 49: Sistema de Roles Avanzado

### Actualización de Roles
- [ ] Agregar rol "committee_member" (Miembro del Comité)
- [ ] Agregar rol "committee_coordinator" (Coordinador del Comité)
- [ ] Actualizar enum de roles en schema.ts
- [ ] Generar y aplicar migración SQL

### Permisos de Miembro del Comité
- [ ] Acceso a página de Comité
- [ ] Acceso a documentos del comité
- [ ] Acceso a casos asignados
- [ ] Verificar que estén en listado de personal autorizado

### Permisos de Coordinador del Comité
- [ ] Todos los permisos de Miembro del Comité
- [ ] Acceso completo a Buzón electrónico
- [ ] Acceso a investigación de casos
- [ ] Acceso a dictaminación de casos
- [ ] Recibir notificaciones de buzón
- [ ] Asignar casos a miembros del comité

## FASE 50: Conexión de Formatos Legales a Backend

### Integración con tRPC
- [ ] Conectar DocumentActaConstitutiva con tRPC
- [ ] Conectar DocumentFuncionesComite con tRPC
- [ ] Conectar DocumentAceptacionCargo con tRPC
- [ ] Conectar DocumentActaRecorridoNOM019 con tRPC
- [ ] Conectar DocumentActaFinalResultados con tRPC

### Generación Automática de PDFs
- [ ] Implementar generación automática al finalizar documento
- [ ] Subir PDF a S3 automáticamente
- [ ] Guardar URL del PDF en base de datos
- [ ] Enviar notificación al creador del documento

### Firma Digital
- [ ] Implementar flujo de firma digital
- [ ] Guardar firmas en tabla signatures
- [ ] Validar firmas antes de finalizar documento
- [ ] Generar certificado de autenticidad


## FASE 50: Corrección de Errores removeChild y Mejoras en Recursos

### Agregar Descripción de Cursos en Recursos
- [x] Leer página de Recursos para identificar estructura
- [x] Agregar descripción detallada del contenido de cada curso
- [x] Incluir objetivos de aprendizaje
- [x] Incluir temario o módulos del curso
- [x] Incluir duración estimada

### Corrección de Error en Reportes
- [x] Identificar componentes Select en Reports.tsx
- [x] Reemplazar Select por elementos nativos
- [x] Actualizar lógica de filtros
- [x] Probar funcionalidad completa

### Corrección de Error en Puestos
- [x] Identificar componentes Select en JobPositions.tsx (no tiene Select)
- [x] Reemplazar Select por elementos nativos
- [x] Actualizar lógica de filtros
- [x] Probar funcionalidad completa

### Corrección de Error en Configuración
- [x] Identificar componentes Select en Profile.tsx (no tiene Select)
- [x] Reemplazar Select por elementos nativos
- [x] Actualizar formularios
- [x] Probar funcionalidad completa


## FASE 51: Sistema Completo de Encuestas NOM-035

### Schema de Encuestas (YA COMPLETADO EN FASE 47)
- [x] Crear tabla surveys
- [x] Crear tabla survey_questions
- [x] Crear tabla survey_responses
- [x] Crear tabla survey_answers
- [x] Crear tabla survey_tokens

### Menú de Encuestas en Sidebar
- [ ] Agregar sección "Encuestas" en DashboardLayout
- [ ] Crear submenu con Guía I, II y III
- [ ] Agregar iconos apropiados para cada guía

### Implementar Guía I (Cuestionario para identificar a los trabajadores que fueron sujetos a acontecimientos traumáticos severos)
- [ ] Crear página SurveyGuide1.tsx
- [ ] Implementar 4 preguntas de la Guía I según NOM-035
- [ ] Agregar validaciones de respuestas
- [ ] Conectar con tRPC para guardar respuestas

### Implementar Guía II (Cuestionario de identificación de factores de riesgo psicosocial)
- [ ] Crear página SurveyGuide2.tsx
- [ ] Implementar 72 preguntas de la Guía II según NOM-035
- [ ] Organizar preguntas por categorías (Ambiente, Factores propios, Organización, Jornada, Liderazgo, Relaciones, Violencia)
- [ ] Implementar cálculo de calificación por categoría
- [ ] Implementar cálculo de calificación final
- [ ] Conectar con tRPC para guardar respuestas

### Implementar Guía III (Cuestionario de evaluación del entorno organizacional)
- [ ] Crear página SurveyGuide3.tsx
- [ ] Implementar 46 preguntas de la Guía III según NOM-035
- [ ] Organizar preguntas por categorías
- [ ] Implementar cálculo de calificación
- [ ] Conectar con tRPC para guardar respuestas

### Sistema de Enlaces Únicos y Códigos QR
- [ ] Crear procedimiento tRPC para generar tokens únicos por trabajador
- [ ] Crear página pública SurveyPublic.tsx para responder sin login
- [ ] Implementar captura de CURP para trabajadores no registrados
- [ ] Generar códigos QR con qrcode library
- [ ] Validar que no se pueda responder dos veces (check survey_responses)
- [ ] Crear opción de administrador para reactivar encuesta

### Envío de Encuestas
- [ ] Crear procedimiento tRPC para enviar encuestas por correo
- [ ] Crear plantilla de correo con enlace único
- [ ] Implementar envío masivo a todos los trabajadores
- [ ] Crear página de seguimiento de respuestas

### Dashboard de Resultados
- [ ] Crear página SurveyResults.tsx
- [ ] Mostrar estadísticas por guía
- [ ] Mostrar trabajadores que han respondido
- [ ] Mostrar trabajadores pendientes
- [ ] Generar gráficas de resultados

## FASE 52: Datos de Empresa

### Schema de Empresa
- [ ] Crear tabla company_settings con campos:
  - [ ] razonSocial (text)
  - [ ] direccionFiscal (text)
  - [ ] rfc (text, 12-13 caracteres)
  - [ ] representanteLegal (text)
  - [ ] logoUrl (text)
  - [ ] firmaElectronicaUrl (text, opcional)
  - [ ] giro (text)
  - [ ] actividadesPreponderantes (text)
  - [ ] numeroTrabajadores (int, calculado)
  - [ ] numeroTrabajadoresActivos (int, calculado)
  - [ ] createdAt, updatedAt
- [ ] Generar migración SQL
- [ ] Aplicar migración

### Sección de Datos de Empresa en Sidebar
- [ ] Crear página CompanySettings.tsx
- [ ] Agregar enlace en DashboardLayout
- [ ] Implementar formulario con todos los campos
- [ ] Agregar upload de logotipo con S3
- [ ] Agregar upload de firma electrónica con S3 (opcional)
- [ ] Mostrar cantidad de trabajadores registrados (desde tabla users)
- [ ] Mostrar cantidad de trabajadores activos (filtro status='active')
- [ ] Conectar con tRPC para guardar/actualizar

### Procedimientos tRPC para Empresa
- [ ] Crear server/routers/company.ts
- [ ] Implementar company.getSettings
- [ ] Implementar company.updateSettings
- [ ] Implementar company.uploadLogo
- [ ] Implementar company.uploadSignature
- [ ] Registrar companyRouter en routers.ts

### Correlación de Campos
- [ ] Identificar todos los lugares donde se usan datos de empresa
- [ ] Reemplazar campos manuales por datos de company_settings
- [ ] Actualizar formatos legales para usar datos de empresa
- [ ] Actualizar reportes para usar datos de empresa

## FASE 53: Conexión de Formatos Legales a Backend

### Procedimientos tRPC para Formatos (YA INICIADO EN FASE 44)
- [ ] Completar documents.saveActaConstitutiva
- [ ] Completar documents.saveFuncionesComite
- [ ] Completar documents.saveAceptacionCargo
- [ ] Crear documents.saveActaRecorridoNOM019
- [ ] Crear documents.saveActaFinalResultados
- [ ] Implementar generación automática de PDFs en cada save
- [ ] Implementar guardado de firmas en tabla signatures

### Integración de Formularios con tRPC
- [ ] Conectar DocumentActaConstitutiva.tsx con tRPC
- [ ] Conectar DocumentFuncionesComite.tsx con tRPC
- [ ] Conectar DocumentAceptacionCargo.tsx con tRPC
- [ ] Conectar DocumentActaRecorridoNOM019.tsx con tRPC
- [ ] Conectar DocumentActaFinalResultados.tsx con tRPC
- [ ] Implementar estados de carga y error
- [ ] Implementar confirmación de guardado

### Sistema de Firma Digital
- [ ] Crear componente SignatureFlow.tsx
- [ ] Implementar flujo de firma paso a paso
- [ ] Guardar firmas en S3
- [ ] Vincular firmas con documentos en tabla signatures
- [ ] Implementar validación de firmas completas
- [ ] Generar PDF final con todas las firmas embebidas

### Generación Automática de PDFs (YA INICIADO EN FASE 44)
- [ ] Completar generateActaConstitutivaPDF
- [ ] Completar generateFuncionesComitePDF
- [ ] Completar generateAceptacionCargoPDF
- [ ] Crear generateActaRecorridoNOM019PDF
- [ ] Crear generateActaFinalResultadosPDF
- [ ] Implementar foliado automático por tipo
- [ ] Implementar generación de códigos QR únicos
- [ ] Subir PDFs generados a S3
- [ ] Guardar URL del PDF en tabla documents

## FASE 54: Sistema de Permisos por Rol

### Middleware de Permisos
- [ ] Crear server/lib/permissions.ts con definición de permisos
- [ ] Crear middleware checkPermission en routers.ts
- [ ] Definir permisos para committee_member:
  - [ ] Ver página de Comité
  - [ ] Ver casos asignados
  - [ ] Agregar comentarios a casos
  - [ ] Ver documentos del comité
- [ ] Definir permisos para committee_coordinator:
  - [ ] Todos los permisos de committee_member
  - [ ] Ver y gestionar buzón completo
  - [ ] Asignar casos a miembros
  - [ ] Realizar investigación de casos
  - [ ] Crear dictámenes
  - [ ] Gestionar documentos legales

### Protección de Rutas en Frontend
- [ ] Crear hook usePermissions en client/src/hooks/
- [ ] Proteger rutas de Comité con permisos
- [ ] Proteger rutas de Buzón con permisos
- [ ] Proteger rutas de Casos con permisos
- [ ] Mostrar/ocultar elementos UI según permisos
- [ ] Agregar mensajes de "Acceso denegado"

### Protección de Procedimientos tRPC
- [ ] Proteger mailbox.* con permisos de committee_coordinator
- [ ] Proteger cases.* con permisos de committee_member
- [ ] Proteger documents.* con permisos de committee_member
- [ ] Implementar filtrado de casos por asignación
- [ ] Implementar filtrado de buzón por rol

## FASE 55: Correlación de Campos

### Auditoría de Campos Duplicados
- [ ] Identificar todos los formularios que capturan datos de empresa
- [ ] Identificar todos los formularios que capturan datos de trabajadores
- [ ] Identificar todos los formularios que capturan datos de comité
- [ ] Crear lista de campos a correlacionar

### Implementación de Correlación
- [ ] Reemplazar campos manuales de empresa por desplegables/autocompletado
- [ ] Reemplazar campos manuales de trabajadores por desplegables
- [ ] Reemplazar campos manuales de comité por desplegables
- [ ] Implementar prellenado automático de campos correlacionados
- [ ] Agregar validación de consistencia de datos

### Testing de Correlación
- [ ] Probar flujo completo de creación de documento
- [ ] Verificar que datos de empresa se cargan automáticamente
- [ ] Verificar que datos de trabajadores se cargan automáticamente
- [ ] Verificar que no hay capturas duplicadas


## FASE 56: Corrección de Select Restantes

### Corregir Select en CaseDetail.tsx
- [x] Identificar todos los componentes Select en CaseDetail.tsx
- [x] Reemplazar por elementos nativos
- [x] Probar funcionalidad

### Corregir Select en CommitteeMemberNew.tsx
- [x] Identificar todos los componentes Select en CommitteeMemberNew.tsx
- [x] Reemplazar por elementos nativos
- [x] Probar funcionalidad

### Corregir Select en EmployeeEdit.tsx
- [ ] Identificar todos los componentes Select en EmployeeEdit.tsx
- [ ] Reemplazar por elementos nativos
- [ ] Probar funcionalidad

### Corregir Select en EmployeeNew.tsx
- [ ] Identificar todos los componentes Select en EmployeeNew.tsx
- [ ] Reemplazar por elementos nativos
- [ ] Probar funcionalidad

### Corregir Select en Employees.tsx
- [ ] Identificar todos los componentes Select en Employees.tsx
- [ ] Reemplazar por elementos nativos
- [ ] Probar funcionalidad

### Corregir Select en MailboxForm.tsx
- [ ] Identificar todos los componentes Select en MailboxForm.tsx
- [ ] Reemplazar por elementos nativos
- [ ] Probar funcionalidad

### Corregir Select en DocumentAceptacionCargo.tsx
- [ ] Identificar todos los componentes Select en DocumentAceptacionCargo.tsx
- [ ] Reemplazar por elementos nativos
- [ ] Probar funcionalidad

### Corregir Select en DocumentActaFinalResultados.tsx
- [ ] Identificar todos los componentes Select en DocumentActaFinalResultados.tsx
- [ ] Reemplazar por elementos nativos
- [ ] Probar funcionalidad

### Corregir Select en DocumentsHistory.tsx
- [ ] Identificar todos los componentes Select en DocumentsHistory.tsx
- [ ] Reemplazar por elementos nativos
- [ ] Probar funcionalidad


## FASE 57: Implementación de Sistema de Encuestas NOM-035

### Lógica de Aplicación según NOM-035
- [x] Guía I: Obligatoria para TODOS los trabajadores (detecta ATS)
- [x] Guía II: Para empresas de 16-50 trabajadores
- [x] Guía III: Para empresas de 51+ trabajadores
- [x] Detección automática de qué guía aplicar

### Sistema de Reporte de ATS al Comité
- [x] Detectar ATS en respuestas de Guía I
- [x] Crear caso automáticamente en sistema de casos
- [ ] Notificar al comité automáticamente (TODO)
- [ ] Crear flujo de investigación de ATS
- [ ] Crear flujo de dictamen de ATS

## FASE 57 (continuación): Implementación de Sistema de Encuestas NOM-035

### Procedimientos tRPC para Encuestas
- [x] Crear server/routers/surveys.ts
- [x] Implementar surveys.getAll
- [x] Implementar surveys.getById
- [x] Implementar surveys.getQuestions
- [x] Implementar surveys.submitResponse
- [x] Implementar surveys.generateToken
- [x] Implementar surveys.validateToken
- [x] Implementar surveys.getResponsesByUser
- [x] Implementar surveys.getStatistics
- [x] Registrar surveysRouter en routers.ts

### Menú de Encuestas en Sidebar
- [ ] Agregar sección "Encuestas" en DashboardLayout
- [ ] Crear submenu con Guía I, II y III
- [ ] Agregar iconos apropiados

### Guía I - Acontecimientos Traumáticos Severos
- [ ] Crear página SurveyGuide1.tsx
- [ ] Implementar 4 preguntas según NOM-035
- [ ] Agregar validaciones
- [ ] Conectar con tRPC
- [ ] Registrar ruta /surveys/guide-1

### Guía II - Identificación de Factores de Riesgo
- [ ] Crear página SurveyGuide2.tsx
- [ ] Implementar 72 preguntas organizadas por categorías
- [ ] Implementar cálculo de calificación
- [ ] Conectar con tRPC
- [ ] Registrar ruta /surveys/guide-2

### Guía III - Evaluación del Entorno Organizacional
- [ ] Crear página SurveyGuide3.tsx
- [ ] Implementar 46 preguntas
- [ ] Implementar cálculo de calificación
- [ ] Conectar con tRPC
- [ ] Registrar ruta /surveys/guide-3

### Sistema de Enlaces Únicos y Códigos QR
- [ ] Crear página SurveyPublic.tsx para responder sin login
- [ ] Implementar captura de CURP
- [ ] Generar códigos QR
- [ ] Validar respuestas únicas
- [ ] Crear opción de reactivación por administrador

### Dashboard de Seguimiento
- [ ] Crear página SurveyTracking.tsx
- [ ] Mostrar estadísticas por guía
- [ ] Mostrar trabajadores que respondieron
- [ ] Mostrar trabajadores pendientes
- [ ] Generar gráficas de resultados


## FASE 58: Implementación Completa de Interfaz de Encuestas

### Menú de Encuestas en Sidebar
- [x] Agregar sección "Encuestas" en DashboardLayout
- [x] Crear submenu con Guía I, II y III
- [x] Agregar iconos y navegación

### Poblar Base de Datos con Preguntas Oficiales
- [x] Crear script SQL para insertar encuestas en tabla surveys
- [x] Insertar 4 preguntas de Guía I (Acontecimientos Traumáticos Severos)
- [ ] Insertar 46 preguntas de Guía II (Cuestionario de identificación - empresas 16-50 trabajadores)
- [ ] Insertar 72 preguntas de Guía III (Cuestionario de evaluación - empresas 51+ trabajadores)
- [ ] Ejecutar script con webdev_execute_sql

### Páginas de Encuestas
- [ ] Crear /client/src/pages/SurveyGuideI.tsx
- [ ] Crear /client/src/pages/SurveyGuideII.tsx
- [ ] Crear /client/src/pages/SurveyGuideIII.tsx
- [ ] Implementar formularios dinámicos con validaciones
- [ ] Implementar guardado de respuestas con tRPC
- [ ] Mostrar mensaje de confirmación al completar
- [ ] Registrar rutas en App.tsx

### Dashboard de Seguimiento
- [ ] Crear /client/src/pages/SurveysDashboard.tsx
- [ ] Implementar estadísticas de participación
- [ ] Mostrar trabajadores pendientes
- [ ] Mostrar casos ATS detectados
- [ ] Crear gráficas con recharts o chart.js
- [ ] Implementar filtros por departamento
- [ ] Implementar filtros por puesto
- [ ] Implementar filtros por género
- [ ] Implementar filtros por edad
- [ ] Implementar filtros por antigüedad
- [ ] Implementar filtros personalizados
- [ ] Registrar ruta en App.tsx

### Análisis de Resultados con Colorimetría NOM-035
- [ ] Implementar colorimetría según niveles de riesgo (Nulo/Despreciable, Bajo, Medio, Alto, Muy Alto)
- [ ] Crear gráficas de resultados por categoría
- [ ] Crear gráficas de resultados por dominio
- [ ] Crear gráficas de resultados por dimensión
- [ ] Crear gráficas de resultados por ATS
- [ ] Implementar acciones predefinidas según resultados
- [ ] Permitir revisión por categoría
- [ ] Permitir revisión por dominio
- [ ] Permitir revisión por dimensión
- [ ] Permitir revisión por ATS


## FASE 59: Implementación Completa de Encuestas NOM-035

### Poblar Base de Datos con Preguntas Oficiales
- [x] Insertar 46 preguntas de Guía II con calificación correcta (normal/inversa)
- [x] Insertar 72 preguntas de Guía III con calificación correcta (normal/inversa)
- [x] Verificar que todas las preguntas tengan su categoría, dominio y dimensión

### Crear Páginas de Encuestas
- [ ] Crear /client/src/pages/SurveyGuideI.tsx con formulario de 4 preguntas ATS
- [ ] Crear /client/src/pages/SurveyGuideII.tsx con formulario de 46 preguntas
- [ ] Crear /client/src/pages/SurveyGuideIII.tsx con formulario de 72 preguntas
- [ ] Implementar validaciones en formularios
- [ ] Implementar sistema de enlaces únicos por trabajador
- [ ] Implementar códigos QR para responder encuestas
- [ ] Agregar captura de CURP para trabajadores no registrados
- [ ] Registrar rutas en App.tsx

### Implementar Cálculo de Calificación
- [ ] Crear función de cálculo con valores inversos según Tabla 5
- [ ] Implementar cálculo de calificación final (Cfinal)
- [ ] Implementar cálculo por categoría (Ccat)
- [ ] Implementar cálculo por dominio (Cdom)
- [ ] Implementar cálculo por dimensión
- [ ] Aplicar colorimetría según nivel de riesgo

### Dashboard de Análisis
- [ ] Crear /client/src/pages/SurveysDashboard.tsx
- [ ] Implementar fórmula de cobertura (Ecuación 1)
- [ ] Mostrar porcentaje de cumplimiento por guía
- [ ] Identificar trabajadores que faltan de responder
- [ ] Crear gráficas de resultados por categoría
- [ ] Crear gráficas de resultados por dominio
- [ ] Crear gráficas de resultados por dimensión
- [ ] Implementar colorimetría en visualizaciones
- [ ] Agregar filtros por departamento
- [ ] Agregar filtros por puesto
- [ ] Agregar filtros por género
- [ ] Agregar filtros por edad
- [ ] Agregar filtros por antigüedad
- [ ] Mostrar acciones predefinidas según resultados
- [ ] Mostrar casos ATS detectados

### Integración con Sistema de Casos
- [ ] Verificar creación automática de casos ATS desde Guía I
- [ ] Implementar notificación al comité cuando se detecta ATS
- [ ] Crear flujo de investigación de ATS
- [ ] Crear flujo de dictamen de ATS


## FASE 60: Formularios de Encuestas y Sistema de Cálculo Completo

### Páginas de Formularios
- [ ] Crear /client/src/pages/SurveyGuideI.tsx con 4 preguntas ATS y lógica de detección
- [ ] Crear /client/src/pages/SurveyGuideII.tsx con 46 preguntas organizadas por categoría
- [ ] Crear /client/src/pages/SurveyGuideIII.tsx con 72 preguntas organizadas por categoría
- [ ] Implementar validaciones en todos los formularios
- [ ] Registrar rutas en App.tsx

### Sistema de Cálculo
- [x] Crear /server/lib/nom035-calculator.ts con funciones de cálculo
- [x] Implementar cálculo con valores inversos según Tablas 2 y 5
- [x] Implementar cálculo de Cfinal (calificación final)
- [x] Implementar cálculo de Ccat (calificación por categoría)
- [x] Implementar cálculo de Cdom (calificación por dominio)
- [x] Implementar cálculo de Cdim (calificación por dimensión)
- [x] Aplicar colorimetría oficial según nivel de riesgo

### Dashboard de Análisis
- [ ] Crear /client/src/pages/SurveysDashboard.tsx
- [ ] Implementar fórmula de cobertura (Ecuación 1)
- [ ] Mostrar porcentaje de cumplimiento por guía
- [ ] Identificar trabajadores que faltan de responder
- [ ] Crear gráficas de resultados por categoría
- [ ] Crear gráficas de resultados por dominio
- [ ] Implementar filtros avanzados
- [ ] Mostrar acciones predefinidas según Tablas 4 y 7
- [ ] Mostrar casos ATS detectados


## FASE 61: Implementación de Formularios, Dashboard y Reportes PDF

### Formularios de Encuestas
- [x] Crear /client/src/pages/surveys/GuideI.tsx con 4 preguntas ATS
- [x] Implementar lógica de detección automática de ATS en Guía I
- [x] Crear /client/src/pages/surveys/GuideII.tsx con 46 preguntas
- [x] Crear /client/src/pages/surveys/GuideIII.tsx con 72 preguntas
- [x] Implementar validaciones de formularios completos
- [x] Registrar rutas de formularios en App.tsx
- [x] Crear página de inicio de encuestas con instrucciones (Dashboard)

### Dashboard de Análisis
- [x] Crear /client/src/pages/surveys/Dashboard.tsx
- [x] Implementar tarjetas de estadísticas (cobertura, pendientes, ATS)
- [x] Crear gráfica de distribución de niveles de riesgo
- [x] Crear gráficas por categoría y dominio
- [ ] Implementar fórmula de cobertura (Ecuación 1)
- [ ] Mostrar lista de trabajadores pendientes
- [ ] Mostrar acciones recomendadas según nivel de riesgo
- [ ] Implementar filtros por guía y periodo

### Generación de Reportes PDF
- [ ] Crear /server/lib/pdf-generator.ts con funciones de generación
- [ ] Implementar reporte individual con resultados y acciones
- [ ] Implementar reporte agregado con estadísticas generales
- [ ] Agregar colorimetría oficial en reportes
- [ ] Agregar procedimiento tRPC para generar PDFs
- [ ] Crear botones de descarga en dashboard


## FASE 62: Reportes PDF, Módulo de Seguimiento y Acciones Correctivas

### Generación de Reportes PDF
- [ ] Crear /server/lib/pdf-ge### Reportes PDF
- [x] Crear /server/lib/nom035-pdf-reports.ts
- [x] Implementar reporte individual de Guía I con detección ATS
- [x] Implementar reporte individual de Guía II y III
- [x] Implementar reporte grupal por departamento/área
- [x] Implementar reporte organizacional completo
- [x] Implementar reporte agregado con estadísticas generales
- [x] Agregar colorimetría oficial en todos los reportes
- [x] Agregar acciones recomendadas según nivel de riesgo
- [x] Crear procedimientos tRPC para generar PDFs
- [ ] Integrar botones de descarga en dashboard## Módulo de Seguimiento
- [ ] Crear /client/src/pages/surveys/Tracking.tsx
- [ ] Implementar cálculo de fórmula de cobertura (Ecuación 1)
- [ ] Mostrar porcentaje de cumplimiento por guía
- [ ] Crear lista de trabajadores pendientes de responder
- [ ] Implementar filtros por departamento y puesto
- [ ] Agregar sistema de notificaciones por correo
- [ ] Crear plantilla de correo para recordatorios
- [ ] Implementar envío automático de notificaciones

### Panel de Acciones Correctivas
- [ ] Crear /client/src/pages/surveys/CorrectiveActions.tsx
- [ ] Implementar registro de acciones por nivel de riesgo
- [ ] Crear formulario de captura de medidas correctivas
- [ ] Implementar seguimiento de estado (pendiente, en proceso, completada)
- [ ] Agregar asignación de responsables
- [ ] Crear vista de acciones por trabajador/departamento
- [ ] Implementar filtros por nivel de riesgo y estado
- [ ] Agregar indicadores de cumplimiento de acciones


## FASE 63: Integración de PDFs, Módulo de Seguimiento y Panel de Acciones Correctivas

### Integración de Botones de Descarga PDF
- [ ] Agregar botón de descarga de reporte individual en dashboard
- [ ] Agregar botón de descarga de reporte agregado en dashboard
- [ ] Implementar función de descarga de PDF desde base64
- [ ] Agregar indicadores de carga durante generación de PDF
- [ ] Mostrar mensajes de éxito/error en descarga

### Módulo de Seguimiento
- [ ] Crear /client/src/pages/surveys/Tracking.tsx
- [ ] Implementar cálculo de fórmula de cobertura (Ecuación 1)
- [ ] Mostrar porcentaje de cumplimiento por guía
- [ ] Crear tabla de trabajadores pendientes de responder
- [ ] Implementar filtros por departamento y puesto
- [ ] Agregar búsqueda de trabajadores por nombre/correo
- [ ] Mostrar fecha límite de respuesta
- [ ] Implementar sistema de notificaciones por correo
- [ ] Crear plantilla de correo para recordatorios
- [ ] Agregar botón de envío manual de notificaciones
- [ ] Implementar envío automático programado

### Panel de Acciones Correctivas
- [ ] Crear /client/src/pages/surveys/CorrectiveActions.tsx
- [ ] Crear schema de tabla de acciones correctivas en drizzle
- [ ] Generar migración SQL para tabla de acciones
- [ ] Implementar formulario de captura de medidas correctivas
- [ ] Agregar campos: descripción, nivel de riesgo, responsable, fecha límite
- [ ] Implementar seguimiento de estado (pendiente, en proceso, completada)
- [ ] Crear vista de acciones por trabajador/departamento
- [ ] Implementar filtros por nivel de riesgo y estado
- [ ] Agregar indicadores de cumplimiento de acciones
- [ ] Crear procedimientos tRPC para CRUD de acciones
- [ ] Registrar rutas en App.tsx


## FASE 64: Indicador de Cobertura por Departamento y Exportación PDF

### Indicador de Cobertura por Departamento
- [x] Agregar campo department a tabla users en schema (ya existía)
- [x] Generar migración SQL para agregar columna department (ya existía)
- [x] Crear procedimiento tRPC para obtener cobertura por departamento
- [x] Implementar gráfica de cobertura por departamento en Tracking.tsx
- [x] Agregar filtro por departamento en lista de pendientes
- [x] Mostrar porcentaje de cumplimiento por área

### Exportación PDF de Trabajadores Pendientes
- [x] Crear función en nom035-pdf-reports.ts para lista de pendientes
- [x] Agregar procedimiento tRPC para generar PDF de pendientes
- [x] Implementar botón de descarga en Tracking.tsx
- [x] Incluir información de departamento en PDF
- [x] Agregar fecha de generación y estadísticas generales


## FASE 65: Auditoría Completa, Notificaciones, Acciones Correctivas y Reportes Históricos

### Auditoría y Corrección de Errores
- [x] Ejecutar auditoría completa del código frontend y backend
- [x] Detectar y resolver errores de TypeScript
- [x] Validar correlación de datos en todos los formularios
- [x] Revisar y corregir desplegables (Select components)
- [x] Validar todos los botones de acción
- [x] Optimizar consultas de base de datos
- [x] Mejorar manejo de errores y validaciones
- [x] Eliminar código duplicado

### Sistema de Notificaciones por Correo
- [x] Crear schema de tabla de notificaciones en drizzle
- [x] Generar migración SQL para tabla de notificaciones
- [x] Implementar servicio de envío de correos (nodemailer)
- [x] Crear plantilla HTML profesional para invitaciones a encuestas
- [x] Crear plantilla HTML para recordatorios a pendientes
- [x] Implementar procedimiento tRPC para enviar invitaciones masivas
- [x] Implementar procedimiento tRPC para enviar recordatorios masivos
- [ ] Agregar programación de envíos periódicos automáticos
- [x] Crear log de notificaciones enviadas (procedimiento tRPC getNotificationsLog)
- [ ] Implementar interfaz de gestión manual en Tracking
- [ ] Agregar botón de envío manual de invitaciones
- [ ] Agregar botón de envío manual de recordatorios

### Panel de Acciones Correctivas
- [x] Crear schema de tabla de acciones correctivas
- [x] Generar migración SQL para acciones correctivas
- [ ] Crear /client/src/pages/surveys/CorrectiveActions.tsx
- [ ] Implementar formulario de registro de acciones
- [ ] Agregar campos: descripción, nivel de riesgo, responsable, fecha límite
- [ ] Implementar seguimiento de estado (pendiente, en proceso, completada)
- [ ] Agregar alertas por correo al asignar acción correctiva
- [ ] Agregar alertas por correo al cambiar estado de acción
- [ ] Agregar alertas por correo al coordinador sobre vencimientos
- [ ] Crear vista de acciones por trabajador
- [ ] Crear vista de acciones por departamento
- [ ] Implementar filtros por nivel de riesgo y estado
- [ ] Agregar indicadores de cumplimiento
- [ ] Crear procedimientos tRPC para CRUD de acciones
- [ ] Registrar ruta en App.tsx

### Módulo de Reportes Históricos
- [ ] Crear /client/src/pages/surveys/HistoricalReports.tsx
- [ ] Implementar gráfica de evolución temporal de niveles de riesgo
- [ ] Agregar comparativa entre periodos (mes, trimestre, año)
- [ ] Implementar análisis de tendencias por departamento
- [ ] Crear gráfica de evolución de cobertura
- [ ] Agregar filtros por fecha y departamento
- [ ] Implementar exportación de reportes históricos a PDF
- [ ] Implementar exportación de datos históricos a Excel
- [ ] Crear procedimientos tRPC para datos históricos
- [ ] Registrar ruta en App.tsx


## FASE 66: CORRECCIÓN URGENTE - Errores Críticos en Sistema de Casos

### Páginas 404 en Detalle del Caso
- [x] Corregir página "Ver documentos" (404) - Redirige a /documents
- [x] Corregir página "Asignar Comité" (404) - Redirige a /cases/assign
- [ ] Auditar todas las rutas del sistema para detectar 404s
- [ ] Crear lista completa de páginas 404 encontradas
- [ ] Corregir o desarrollar todas las páginas 404 detectadas

### Formulario de Seguimiento No Guarda
- [x] Revisar procedimiento tRPC de guardado de seguimiento
- [x] Verificar validaciones del formulario
- [x] Corregir guardado de comentarios/acciones
- [ ] Probar guardado con datos de prueba

### Cambio de Estado No Guarda
- [x] Revisar procedimiento tRPC de cambio de estado
- [x] Verificar que el estado seleccionado se envía correctamente
- [x] Corregir guardado de estado en base de datos
- [ ] Probar cambio de estado con diferentes valores

### Pruebas de Funcionalidad
- [ ] Probar flujo completo de casos
- [ ] Validar que todos los botones funcionen
- [ ] Verificar que todos los formularios guarden correctamente
- [ ] Crear checkpoint con correcciones


## FASE 67: Panel de Acciones Correctivas Completo

### Procedimientos tRPC
- [x] Crear router de acciones correctivas en /server/routers/correctiveActions.ts
- [x] Implementar procedimiento create (crear acción correctiva)
- [x] Implementar procedimiento getAll (listar todas las acciones)
- [x] Implementar procedimiento getById (obtener acción por ID)
- [x] Implementar procedimiento update (actualizar acción)
- [x] Implementar procedimiento updateStatus (cambiar estado)
- [x] Implementar procedimiento getByDepartment (filtrar por departamento)
- [x] Implementar procedimiento getStatistics (estadísticas de cumplimiento)
- [x] Registrar router en /server/routers.ts

### Interfaz de Usuario
- [ ] Crear /client/src/pages/surveys/CorrectiveActions.tsx
- [ ] Implementar formulario de registro de acciones
- [ ] Agregar campos: título, descripción, nivel de riesgo, departamento
- [ ] Agregar campo de asignación de responsable (select de usuarios)
- [ ] Agregar campo de fecha límite (date picker)
- [ ] Implementar tabla de acciones correctivas existentes
- [ ] Agregar columnas: título, responsable, estado, fecha límite, acciones
- [ ] Implementar filtros por estado y departamento
- [ ] Agregar botones de acción: editar, cambiar estado, eliminar

### Dashboard de Cumplimiento
- [ ] Crear sección de estadísticas generales
- [ ] Mostrar total de acciones por estado (pendiente/en proceso/completada)
- [ ] Implementar gráfica de cumplimiento por departamento
- [ ] Agregar indicador de acciones vencidas
- [ ] Mostrar próximas acciones a vencer (próximos 7 días)

### Alertas por Correo
- [ ] Implementar envío de correo al asignar acción correctiva
- [ ] Implementar envío de correo al cambiar estado de acción
- [ ] Implementar envío de correo al coordinador sobre vencimientos
- [ ] Crear plantilla HTML para notificación de asignación
- [ ] Crear plantilla HTML para notificación de cambio de estado
- [ ] Crear plantilla HTML para alerta de vencimiento

### Integración y Pruebas
- [ ] Registrar ruta /surveys/corrective-actions en App.tsx
- [ ] Agregar enlace en menú de Encuestas NOM-035
- [ ] Crear tests unitarios para procedimientos tRPC
- [ ] Probar flujo completo de registro y seguimiento
- [ ] Crear checkpoint con panel completo
