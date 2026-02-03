# TODO - Plataforma NOM-035 STPS 2018

## FASE 68: AUDITORÍA COMPLETA Y CORRECCIÓN DE ERRORES

### Auditoría de Componentes Select
- [x] Buscar todos los componentes Select en /client/src
- [x] Identificar Selects que causan errores removeChild (CaseDialog.tsx)
- [x] Reemplazar por elementos HTML nativos <select>
- [x] Verificar funcionamiento de todos los desplegables

### Auditoría de Botones de Acción
- [ ] Listar todos los botones de acción del sistema
- [ ] Verificar que cada botón ejecuta su acción correctamente
- [ ] Corregir botones que no funcionan
- [ ] Probar flujos completos de cada funcionalidad

### Corrección Específica: Sistema de Casos
- [x] Corregir guardado de comentarios en CaseDetail
- [x] Corregir cambio de estado en listado de casos (CaseDialog.tsx)
- [x] Verificar que formulario de seguimiento guarda correctamente
- [ ] Probar todas las acciones rápidas

### Pruebas de Funcionalidades Críticas
- [ ] Dashboard principal
- [ ] Gestión de casos (crear, editar, seguimiento, cambio de estado)
- [ ] Gestión de cursos
- [ ] Gestión de empleados
- [ ] Encuestas NOM-035 (Guías I, II, III)
- [ ] Comité de atención
- [ ] Documentos y firmas
- [ ] Buzón de denuncias

### Checkpoint Final
- [ ] Ejecutar todos los tests
- [ ] Verificar que no hay errores de consola
- [ ] Crear checkpoint con sistema completamente funcional
