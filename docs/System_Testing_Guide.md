# Guía Completa de Configuración y Pruebas del Sistema NOM-035

**Versión:** 1.0  
**Fecha:** Febrero 2026  
**Plataforma:** Plataforma de Capacitación NOM-035 STPS 2018

---

## Tabla de Contenidos

1. [Configuración SMTP](#1-configuración-smtp)
2. [Pruebas de Encuestas Públicas con CURP](#2-pruebas-de-encuestas-públicas-con-curp)
3. [Validación de Notificaciones Automáticas](#3-validación-de-notificaciones-automáticas)
4. [Pruebas de Formatos del Comité](#4-pruebas-de-formatos-del-comité)
5. [Troubleshooting](#5-troubleshooting)
6. [Checklist de Validación Completa](#6-checklist-de-validación-completa)

---

## 1. Configuración SMTP

### 1.1 Acceso a la Configuración

1. Inicie sesión como **administrador** en la plataforma
2. Navegue a **Administrativo → Configuración SMTP** (`/administrative/smtp-config`)
3. Verá el formulario de configuración de correo electrónico

### 1.2 Configuración para Gmail

**Requisitos previos:**

- Cuenta de Gmail activa
- Autenticación de dos factores habilitada
- Contraseña de aplicación generada

**Pasos para generar contraseña de aplicación:**

1. Acceda a [myaccount.google.com](https://myaccount.google.com)
2. Vaya a **Seguridad → Verificación en dos pasos**
3. Desplácese hasta **Contraseñas de aplicaciones**
4. Seleccione **Correo** y **Otro (nombre personalizado)**
5. Nombre: "Plataforma NOM-035"
6. Copie la contraseña generada (16 caracteres)

**Configuración en la plataforma:**

```
Host SMTP: smtp.gmail.com
Puerto: 587
Usuario: su-correo@gmail.com
Contraseña: [contraseña de aplicación de 16 caracteres]
Remitente (From): su-correo@gmail.com
Nombre del Remitente: Plataforma NOM-035
Conexión Segura: TLS (activado)
```

### 1.3 Configuración para Office 365 / Outlook

**Configuración:**

```
Host SMTP: smtp.office365.com
Puerto: 587
Usuario: su-correo@empresa.com
Contraseña: [contraseña de la cuenta]
Remitente (From): su-correo@empresa.com
Nombre del Remitente: Plataforma NOM-035
Conexión Segura: TLS (activado)
```

**Nota:** Si su organización usa autenticación moderna (OAuth 2.0), contacte a su administrador de TI para configurar una cuenta de servicio SMTP.

### 1.4 Configuración para SendGrid

**Requisitos previos:**

- Cuenta de SendGrid activa
- API Key generada con permisos de envío de correo

**Pasos para generar API Key:**

1. Acceda a [app.sendgrid.com](https://app.sendgrid.com)
2. Vaya a **Settings → API Keys**
3. Clic en **Create API Key**
4. Nombre: "Plataforma NOM-035"
5. Permisos: **Full Access** o **Mail Send**
6. Copie la API Key (solo se muestra una vez)

**Configuración en la plataforma:**

```
Host SMTP: smtp.sendgrid.net
Puerto: 587
Usuario: apikey
Contraseña: [API Key de SendGrid]
Remitente (From): noreply@sudominio.com
Nombre del Remitente: Plataforma NOM-035
Conexión Segura: TLS (activado)
```

**Importante:** Debe verificar el dominio del remitente en SendGrid antes de enviar correos.

### 1.5 Configuración para Mailgun

**Requisitos previos:**

- Cuenta de Mailgun activa
- Dominio verificado
- Credenciales SMTP obtenidas

**Pasos para obtener credenciales:**

1. Acceda a [app.mailgun.com](https://app.mailgun.com)
2. Vaya a **Sending → Domain settings**
3. Seleccione su dominio
4. Copie las credenciales SMTP

**Configuración en la plataforma:**

```
Host SMTP: smtp.mailgun.org
Puerto: 587
Usuario: postmaster@mg.sudominio.com
Contraseña: [contraseña SMTP de Mailgun]
Remitente (From): noreply@sudominio.com
Nombre del Remitente: Plataforma NOM-035
Conexión Segura: TLS (activado)
```

### 1.6 Validación de Conexión

1. Complete el formulario de configuración SMTP
2. Clic en **Guardar Configuración**
3. Ingrese un correo electrónico de prueba en el campo correspondiente
4. Clic en **Enviar Email de Prueba**
5. Verifique la recepción del correo en su bandeja de entrada
6. Si no recibe el correo, revise la carpeta de spam

**Mensaje de éxito esperado:**

```
✓ Configuración guardada exitosamente
✓ Email de prueba enviado correctamente
```

---

## 2. Pruebas de Encuestas Públicas con CURP

### 2.1 Creación de Periodo de Encuesta

1. Navegue a **Encuestas → Gestión de Periodos** (`/survey-periods`)
2. Clic en **Nuevo Periodo**
3. Complete el formulario:
   - Nombre: "Evaluación NOM-035 - Prueba"
   - Fecha de Inicio: [fecha actual]
   - Fecha de Fin: [30 días después]
   - Tipo: Seleccione el tipo de encuesta
4. Clic en **Crear Periodo**

### 2.2 Generación de Tokens de Encuesta

1. En la lista de periodos, localice el periodo creado
2. Clic en **Enviar Invitaciones por Email**
3. Se abrirá un modal con información del envío:
   - Periodo de encuesta
   - Número de empleados activos
   - Fecha de expiración de tokens (30 días)
4. Clic en **Generar y Enviar Invitaciones**
5. El sistema generará tokens únicos para cada empleado

**Proceso automático:**

- Se crea un token UUID único por empleado
- Se asocia el token con el employeeId y CURP
- Se envía un email con el link personalizado
- Se registra la fecha de generación y expiración

### 2.3 Acceso Público a la Encuesta

**URL de acceso:**

```
https://[su-dominio]/survey/public/[token-uuid]
```

**Ejemplo:**

```
https://plataforma-nom035.manus.space/survey/public/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Flujo de autenticación:**

1. El empleado accede al link recibido por email
2. Se muestra la página de autenticación con CURP
3. El empleado ingresa su CURP (13 caracteres)
4. El sistema valida:
   - Token válido y no expirado
   - CURP coincide con el empleado asociado al token
   - Token no ha sido usado previamente
5. Si la validación es exitosa, se muestra la encuesta
6. El empleado completa la encuesta
7. Al enviar, el token se marca como usado

### 2.4 Prueba Manual del Flujo

**Datos de prueba necesarios:**

- Email de un empleado de prueba
- CURP del empleado de prueba
- Acceso al correo electrónico del empleado

**Pasos:**

1. **Crear empleado de prueba** (si no existe):
   - Navegue a **Empleados → Nuevo Empleado**
   - Complete: Nombre, CURP, Email
   - Guarde el empleado

2. **Generar invitación**:
   - Siga los pasos de la sección 2.2
   - Verifique que el empleado de prueba esté incluido

3. **Verificar recepción del email**:
   - Acceda al correo del empleado de prueba
   - Busque el email con asunto: "Invitación a Encuesta NOM-035"
   - Verifique que contenga el link personalizado

4. **Acceder a la encuesta**:
   - Clic en el link del email
   - Ingrese el CURP del empleado de prueba
   - Verifique que se muestre la encuesta

5. **Completar la encuesta**:
   - Responda todas las preguntas
   - Clic en **Enviar Respuestas**
   - Verifique mensaje de éxito

6. **Validar token usado**:
   - Intente acceder nuevamente al mismo link
   - Verifique que muestre: "Esta encuesta ya ha sido respondida"

### 2.5 Validación de Datos

**Verificar en base de datos:**

1. Navegue a **Panel de Administración → Base de Datos**
2. Consulte la tabla `survey_employee_tokens`:
   ```sql
   SELECT * FROM survey_employee_tokens
   WHERE surveyPeriodId = [id del periodo de prueba]
   ORDER BY createdAt DESC;
   ```
3. Verifique:
   - Token generado correctamente
   - Asociación con employeeId
   - Estado `used` = 1 después de completar la encuesta

4. Consulte las respuestas:
   ```sql
   SELECT * FROM survey_responses
   WHERE surveyPeriodId = [id del periodo de prueba];
   ```

---

## 3. Validación de Notificaciones Automáticas

### 3.1 Notificaciones de Casos Críticos

**Configuración:**

- Las notificaciones se envían automáticamente cuando se crea un caso con prioridad **Crítica** o **Alta**
- Destinatarios: Administradores y responsables NOM-035

**Prueba:**

1. Navegue a **Casos → Nuevo Caso**
2. Complete el formulario:
   - Tipo: "Acoso laboral"
   - Prioridad: **Crítica**
   - Descripción: "Caso de prueba para validar notificaciones"
3. Clic en **Crear Caso**
4. Verifique recepción de email en:
   - Correo de administradores
   - Correo de responsables NOM-035

**Email esperado:**

- Asunto: "🚨 Nuevo Caso Crítico Reportado - [Número de Caso]"
- Contenido: Detalles del caso, prioridad, reportante
- Link directo al caso en la plataforma

### 3.2 Notificaciones de Asignación de Casos

**Prueba:**

1. Abra un caso existente
2. Clic en **Asignar Responsable**
3. Seleccione un responsable
4. Guarde la asignación
5. Verifique recepción de email en el correo del responsable asignado

**Email esperado:**

- Asunto: "📋 Caso Asignado - [Número de Caso]"
- Contenido: Detalles del caso, fecha de asignación
- Link directo al caso

### 3.3 Notificaciones de Vencimiento de Contratos

**Configuración:**

- Job automático ejecutado diariamente a las 8:00 AM
- Envía notificaciones 7 días antes del vencimiento
- Consolida múltiples vencimientos del mismo día en un solo email

**Prueba manual:**

1. Navegue a **Empleados → Gestión de Contratos**
2. Cree o edite un contrato con fecha de vencimiento en 7 días
3. Espere la ejecución del job (siguiente día a las 8:00 AM)
4. Verifique recepción de email en el correo de Recursos Humanos

**Prueba inmediata (desarrollo):**

Ejecute manualmente el job desde la consola del servidor:

```bash
node server/jobs/contract-expiration-alerts-job.ts
```

**Email esperado:**

- Asunto: "⚠️ Alertas de Vencimiento de Contratos - [Fecha]"
- Contenido: Lista de contratos próximos a vencer
- Detalles por empleado: nombre, tipo de contrato, fecha de vencimiento

### 3.4 Notificaciones de Capacitación

**Recordatorios de capacitación pendiente:**

1. Navegue a **Capacitación → Asignar Capacitación**
2. Asigne una capacitación a un empleado con fecha límite en 8 días
3. Espere la ejecución del job (diario a las 9:00 AM)
4. Verifique recepción de email en el correo del empleado

**Email esperado:**

- Asunto: "📚 Recordatorio: Capacitación Pendiente"
- Contenido: Título de la capacitación, fecha límite
- Link directo a la capacitación

**Alertas de certificado próximo a vencer:**

1. Cree un certificado con fecha de vencimiento en 25 días
2. Espere la ejecución del job
3. Verifique recepción de email

**Email esperado:**

- Asunto: "⏰ Alerta: Certificado Próximo a Vencer"
- Contenido: Detalles del certificado, fecha de vencimiento
- Link para renovar

### 3.5 Notificaciones de Certificados Generados

**Prueba:**

1. Navegue a **Comité → Capacitaciones del Comité**
2. Complete una capacitación asignada
3. Clic en **Generar Certificado**
4. Verifique recepción de email en el correo del empleado

**Email esperado:**

- Asunto: "🎓 Certificado de Capacitación Generado"
- Contenido: Título de la capacitación, número de certificado
- Link de descarga del PDF

---

## 4. Pruebas de Formatos del Comité

### 4.1 Actas de Reunión

**Prueba de creación:**

1. Navegue a **Comité → Actas de Reunión** (`/committee-minutes`)
2. Clic en **Nueva Acta**
3. Complete el formulario:
   - Número de Sesión: "001"
   - Tipo de Reunión: "Reunión Ordinaria"
   - Fecha y Hora
   - Lugar: "Sala de Juntas"
   - Asistentes: Agregue al menos 3 miembros
   - Orden del Día: Agregue 2-3 temas
   - Acuerdos: Agregue 1-2 acuerdos
4. Agregue firmas digitales de asistentes
5. Suba foto grupal de validación
6. Clic en **Crear Acta**

**Validación:**

- Verificar numeración automática de folio
- Verificar generación de código QR
- Verificar formato profesional del PDF

**Prueba de generación de PDF:**

1. En la lista de actas, localice el acta creada
2. Clic en **Descargar PDF**
3. Verifique el PDF generado:
   - Logo de la empresa
   - Folio: [CÓDIGO]-[NÚMERO]/[AÑO]
   - Datos de la reunión
   - Lista de asistentes con firmas
   - Orden del día
   - Acuerdos
   - Foto grupal
   - Código QR de validación
   - Pie de página con versión del formato

### 4.2 Reportes Anuales

**Prueba de creación:**

1. Navegue a **Comité → Reportes Anuales** (`/committee-annual-reports`)
2. Clic en **Nuevo Reporte**
3. Complete el formulario:
   - Año del Reporte: 2026
   - Periodo: 01/01/2026 - 31/12/2026
   - Resumen Ejecutivo: [texto descriptivo]
   - Métricas:
     - Total de Reuniones: 20
     - Asistencia Promedio: 85%
     - Casos Atendidos: 15
     - Capacitaciones Impartidas: 8
     - Cumplimiento NOM-035: 92%
   - Actividades: Agregue 3-5 actividades realizadas
   - Capacitaciones: Agregue 2-3 capacitaciones impartidas
   - Casos Atendidos: Agregue 2-3 categorías de casos
   - Recomendaciones: [texto descriptivo]
   - Plan de Acción: [texto descriptivo]
   - Firmas: Agregue firmas de todos los miembros del comité
4. Clic en **Ver Gráficas** para visualizar las métricas
5. Clic en **Crear Reporte**

**Validación de visualizaciones:**

1. Clic en **Ver Gráficas**
2. Verifique las gráficas generadas:
   - Gráfica de barras: Reuniones por mes
   - Gráfica de dona: Casos atendidos por categoría
   - Gráfica de barras: Cumplimiento NOM-035

**Prueba de generación de PDF:**

1. En la lista de reportes, localice el reporte creado
2. Clic en **Descargar PDF**
3. Verifique el PDF generado:
   - Portada con año del reporte
   - Folio automático
   - Resumen ejecutivo
   - Métricas clave
   - Actividades realizadas
   - Capacitaciones impartidas
   - Casos atendidos
   - Recomendaciones
   - Plan de acción
   - Firmas de miembros del comité
   - Código QR de validación

### 4.3 Bases de Funcionamiento

**Prueba de creación:**

1. Navegue a **Comité → Bases de Funcionamiento** (`/committee/operating-rules`)
2. Clic en **Crear Bases de Funcionamiento**
3. Complete las secciones NOM-035:
   - Objetivos del comité
   - Integración y estructura
   - Funciones y responsabilidades
   - Periodicidad de reuniones
   - Quórum mínimo
   - Procedimiento de toma de decisiones
   - Mecanismos de comunicación
   - Procedimiento de atención de casos
   - Confidencialidad
   - Vigencia
4. Agregue firmas de aprobación de todos los miembros
5. Clic en **Generar Documento**

**Validación de versionado:**

1. Verifique que se asigne versión V1.0 al primer documento
2. Edite el documento y guarde cambios
3. Verifique que se genere versión V1.1
4. Cree un nuevo documento desde cero
5. Verifique que se asigne versión V2.0

---

## 5. Troubleshooting

### 5.1 Errores Comunes de SMTP

**Error: "Authentication failed"**

**Causas posibles:**

- Usuario o contraseña incorrectos
- Autenticación de dos factores no configurada (Gmail)
- Contraseña de aplicación no generada (Gmail)

**Solución:**

1. Verifique las credenciales
2. Para Gmail: genere una nueva contraseña de aplicación
3. Para Office 365: verifique que la cuenta tenga permisos SMTP

**Error: "Connection timeout"**

**Causas posibles:**

- Puerto SMTP bloqueado por firewall
- Host SMTP incorrecto
- Problemas de red

**Solución:**

1. Verifique el puerto (587 para TLS, 465 para SSL)
2. Verifique el host SMTP
3. Contacte a su administrador de red

**Error: "TLS/SSL handshake failed"**

**Causas posibles:**

- Configuración de seguridad incorrecta
- Certificado SSL inválido

**Solución:**

1. Verifique que TLS esté habilitado
2. Pruebe con puerto 465 (SSL) en lugar de 587 (TLS)

### 5.2 Errores de Encuestas Públicas

**Error: "Token inválido o expirado"**

**Causas posibles:**

- Token ya fue usado
- Token expiró (más de 30 días)
- Token no existe en la base de datos

**Solución:**

1. Verifique la fecha de generación del token
2. Genere un nuevo token para el empleado
3. Envíe nueva invitación por email

**Error: "CURP no coincide"**

**Causas posibles:**

- CURP ingresado incorrectamente
- CURP del empleado no coincide con el token

**Solución:**

1. Verifique el CURP del empleado en la base de datos
2. Solicite al empleado que verifique su CURP
3. Corrija el CURP en el perfil del empleado si es necesario

### 5.3 Errores de Generación de PDFs

**Error: "Failed to generate PDF"**

**Causas posibles:**

- Dependencias faltantes (pdfkit, qrcode)
- Datos incompletos en el formulario
- Error en el servicio de generación

**Solución:**

1. Verifique que todas las dependencias estén instaladas:
   ```bash
   pnpm install pdfkit qrcode
   ```
2. Verifique que todos los campos requeridos estén completos
3. Revise los logs del servidor para más detalles

**Error: "QR code generation failed"**

**Causas posibles:**

- Librería qrcode no instalada
- URL de validación incorrecta

**Solución:**

1. Instale la dependencia:
   ```bash
   pnpm install qrcode @types/qrcode
   ```
2. Verifique la configuración de la URL base del sistema

---

## 6. Checklist de Validación Completa

### 6.1 Configuración Inicial

- [ ] Configuración SMTP completada y validada
- [ ] Email de prueba recibido exitosamente
- [ ] Credenciales encriptadas en base de datos (AES-256)
- [ ] Configuración de remitente y nombre verificados

### 6.2 Encuestas Públicas

- [ ] Periodo de encuesta creado correctamente
- [ ] Tokens generados para todos los empleados activos
- [ ] Emails de invitación enviados exitosamente
- [ ] Link público accesible sin login
- [ ] Autenticación CURP funcionando correctamente
- [ ] Encuesta se muestra después de autenticación
- [ ] Respuestas guardadas en base de datos
- [ ] Token marcado como usado después de completar
- [ ] Mensaje de "ya respondida" al intentar acceder nuevamente

### 6.3 Notificaciones Automáticas

- [ ] Notificación de caso crítico enviada
- [ ] Notificación de asignación de caso enviada
- [ ] Notificación de vencimiento de contratos enviada
- [ ] Notificación de capacitación pendiente enviada
- [ ] Notificación de certificado próximo a vencer enviada
- [ ] Notificación de certificado generado enviada
- [ ] Todos los emails tienen formato HTML profesional
- [ ] Links en emails funcionan correctamente
- [ ] Retry logic funciona en caso de fallo temporal

### 6.4 Formatos del Comité

**Actas de Reunión:**

- [ ] Acta creada con todos los campos
- [ ] Numeración automática de folio
- [ ] Firmas digitales agregadas
- [ ] Foto grupal subida
- [ ] PDF generado correctamente
- [ ] Código QR de validación incluido
- [ ] Formato profesional y legible

**Reportes Anuales:**

- [ ] Reporte creado con todas las secciones
- [ ] Métricas clave capturadas
- [ ] Visualizaciones de datos (Chart.js) funcionando
- [ ] Gráficas de reuniones, casos y cumplimiento generadas
- [ ] PDF generado correctamente
- [ ] Firmas de miembros incluidas
- [ ] Formato profesional y legible

**Bases de Funcionamiento:**

- [ ] Documento creado con todas las secciones NOM-035
- [ ] Versionado automático funcionando (V1.0, V1.1, V2.0)
- [ ] Firmas de aprobación incluidas
- [ ] PDF generado correctamente
- [ ] Formato profesional y legible

### 6.5 Rendimiento y Optimización

- [ ] Índices SQL aplicados en tablas críticas
- [ ] Lazy loading implementado en componentes
- [ ] Queries optimizadas sin N+1 problems
- [ ] Bundle size del cliente optimizado
- [ ] Tiempos de carga aceptables (<3 segundos)

### 6.6 Seguridad

- [ ] Credenciales SMTP encriptadas con AES-256
- [ ] Tokens de encuesta con UUID seguro
- [ ] Autenticación CURP validada correctamente
- [ ] Acceso público limitado solo a encuestas
- [ ] Logs de auditoría funcionando

---

## Conclusión

Esta guía cubre todos los aspectos críticos de configuración y pruebas del sistema NOM-035. Se recomienda seguir cada sección en orden y completar el checklist de validación antes de poner el sistema en producción.

Para soporte adicional o reportar problemas, contacte al equipo de desarrollo o consulte la documentación técnica en `/docs`.

---

**Documento creado por:** Equipo de Desarrollo Plataforma NOM-035  
**Última actualización:** Febrero 2026  
**Versión del sistema:** 1.0
