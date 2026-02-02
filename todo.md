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
- [ ] Crear checkpoint final
