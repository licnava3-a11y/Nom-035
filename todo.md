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
- [ ] Crear checkpoint final
