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
- [ ] Crear checkpoint final
