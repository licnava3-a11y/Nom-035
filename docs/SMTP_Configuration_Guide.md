# Guía de Configuración SMTP - Plataforma NOM-035

## Introducción

Esta guía proporciona instrucciones detalladas para configurar el servidor SMTP en la Plataforma NOM-035 STPS 2018, habilitando el envío automático de notificaciones por correo electrónico para casos críticos, recordatorios de capacitación, alertas de vencimiento de contratos, certificados generados e invitaciones a encuestas.

## Acceso a la Configuración

1. Inicie sesión como **Administrador**
2. Navegue al menú lateral → **Configuración** → **SMTP**
3. Ruta directa: `/administrative/smtp-config`

---

## Configuración por Proveedor

### 1. Gmail (Google Workspace)

**Requisitos previos:**
- Cuenta de Gmail o Google Workspace
- Habilitar autenticación de dos factores
- Generar contraseña de aplicación

**Pasos para generar contraseña de aplicación:**

1. Acceda a su cuenta de Google: https://myaccount.google.com/
2. Navegue a **Seguridad** → **Verificación en dos pasos**
3. Habilite la verificación en dos pasos si no está activa
4. Regrese a **Seguridad** → **Contraseñas de aplicaciones**
5. Seleccione **Correo** y **Otro (nombre personalizado)**
6. Ingrese "Plataforma NOM-035" como nombre
7. Copie la contraseña de 16 caracteres generada

**Configuración en la plataforma:**

```
Host SMTP: smtp.gmail.com
Puerto: 587
Usuario: su-correo@gmail.com
Contraseña: [contraseña de aplicación de 16 caracteres]
Correo remitente: su-correo@gmail.com
Usar TLS/SSL: ✓ Activado
```

**Límites de envío:**
- Gmail gratuito: 500 correos/día
- Google Workspace: 2,000 correos/día por usuario

---

### 2. Microsoft Office 365 / Outlook

**Requisitos previos:**
- Cuenta de Office 365 o Outlook.com
- Autenticación moderna habilitada

**Configuración en la plataforma:**

```
Host SMTP: smtp.office365.com
Puerto: 587
Usuario: su-correo@empresa.com
Contraseña: [contraseña de su cuenta]
Correo remitente: su-correo@empresa.com
Usar TLS/SSL: ✓ Activado
```

**Notas importantes:**
- Si tiene autenticación multifactor (MFA) habilitada, genere una contraseña de aplicación
- Para Office 365, asegúrese de que SMTP AUTH esté habilitado en su organización

**Límites de envío:**
- Office 365: 10,000 correos/día por buzón

---

### 3. SendGrid (Recomendado para alto volumen)

**Requisitos previos:**
- Cuenta de SendGrid (gratuita o de pago)
- API Key generada

**Pasos para generar API Key:**

1. Inicie sesión en SendGrid: https://app.sendgrid.com/
2. Navegue a **Settings** → **API Keys**
3. Haga clic en **Create API Key**
4. Nombre: "Plataforma NOM-035"
5. Permisos: **Full Access** o **Mail Send**
6. Copie la API Key generada (solo se muestra una vez)

**Configuración en la plataforma:**

```
Host SMTP: smtp.sendgrid.net
Puerto: 587
Usuario: apikey
Contraseña: [API Key copiada]
Correo remitente: noreply@suempresa.com
Usar TLS/SSL: ✓ Activado
```

**Límites de envío:**
- Plan gratuito: 100 correos/día
- Plan Essentials: 40,000-100,000 correos/mes
- Plan Pro: 1,500,000+ correos/mes

---

### 4. Mailgun

**Requisitos previos:**
- Cuenta de Mailgun
- Dominio verificado

**Pasos para obtener credenciales:**

1. Inicie sesión en Mailgun: https://app.mailgun.com/
2. Navegue a **Sending** → **Domain settings**
3. Seleccione su dominio
4. Copie las credenciales SMTP

**Configuración en la plataforma:**

```
Host SMTP: smtp.mailgun.org
Puerto: 587
Usuario: postmaster@mg.sudominio.com
Contraseña: [contraseña SMTP de Mailgun]
Correo remitente: noreply@sudominio.com
Usar TLS/SSL: ✓ Activado
```

**Límites de envío:**
- Plan gratuito: 5,000 correos/mes (primeros 3 meses)
- Planes de pago: desde 50,000 correos/mes

---

## Proceso de Configuración en la Plataforma

### Paso 1: Ingresar Credenciales

1. Complete todos los campos del formulario:
   - **Host SMTP**: Servidor SMTP del proveedor
   - **Puerto**: Generalmente 587 (TLS) o 465 (SSL)
   - **Usuario**: Correo electrónico o nombre de usuario
   - **Contraseña**: Contraseña o API Key
   - **Correo remitente**: Dirección que aparecerá como remitente
   - **Usar TLS/SSL**: Activar para conexión segura

2. Haga clic en **Guardar Configuración**

### Paso 2: Probar Conexión

1. Ingrese un correo electrónico de prueba en el campo **Correo de prueba**
2. Haga clic en **Enviar Email de Prueba**
3. Verifique que el correo llegue correctamente
4. Si hay errores, revise los logs en la consola del navegador

### Paso 3: Activar Notificaciones Automáticas

Una vez configurado y probado el SMTP, las siguientes notificaciones se enviarán automáticamente:

- ✅ **Casos críticos**: Notificación inmediata a administradores
- ✅ **Asignación de casos**: Notificación al responsable asignado
- ✅ **Vencimiento de contratos**: 7 días antes del vencimiento
- ✅ **Recordatorios de capacitación**: Capacitaciones pendientes >7 días
- ✅ **Certificados generados**: Notificación al empleado certificado
- ✅ **Invitaciones a encuestas**: Envío masivo con links personalizados

---

## Solución de Problemas

### Error: "Autenticación fallida"

**Causas comunes:**
- Contraseña incorrecta
- Autenticación de dos factores no configurada (Gmail)
- SMTP AUTH deshabilitado (Office 365)

**Solución:**
- Verifique que la contraseña sea correcta
- Para Gmail, use contraseña de aplicación, no la contraseña de su cuenta
- Para Office 365, habilite SMTP AUTH en el centro de administración

### Error: "Conexión rechazada"

**Causas comunes:**
- Puerto incorrecto
- Firewall bloqueando la conexión
- Host SMTP incorrecto

**Solución:**
- Verifique que el puerto sea 587 (TLS) o 465 (SSL)
- Contacte al administrador de red para verificar reglas de firewall
- Confirme el host SMTP con su proveedor

### Error: "Certificado SSL inválido"

**Causas comunes:**
- Configuración TLS/SSL incorrecta
- Certificado expirado del proveedor

**Solución:**
- Intente cambiar entre puerto 587 (TLS) y 465 (SSL)
- Verifique el estado del servicio del proveedor

### Correos no llegan a la bandeja de entrada

**Causas comunes:**
- Correos marcados como spam
- Dominio remitente no verificado
- Límite de envío excedido

**Solución:**
- Verifique la carpeta de spam del destinatario
- Configure SPF, DKIM y DMARC para su dominio
- Revise los límites de envío de su proveedor

---

## Mejores Prácticas

### Seguridad

1. **No comparta credenciales SMTP**: Solo administradores deben tener acceso
2. **Use contraseñas de aplicación**: Nunca use su contraseña principal
3. **Habilite TLS/SSL**: Siempre active la conexión segura
4. **Rote credenciales periódicamente**: Cambie contraseñas cada 90 días

### Deliverability (Entregabilidad)

1. **Verifique su dominio**: Configure SPF, DKIM y DMARC
2. **Use un dominio profesional**: Evite correos gratuitos como remitente
3. **Monitoree la reputación**: Revise regularmente los reportes de spam
4. **Implemente doble opt-in**: Para listas de correo (si aplica)

### Monitoreo

1. **Revise logs regularmente**: Identifique patrones de errores
2. **Configure alertas**: Notificaciones cuando el envío falle
3. **Monitoree límites**: Evite exceder cuotas de envío
4. **Pruebe periódicamente**: Envíe correos de prueba mensualmente

---

## Soporte Técnico

Para asistencia adicional:

- **Documentación técnica**: Consulte la documentación de su proveedor SMTP
- **Soporte de la plataforma**: Contacte al equipo de desarrollo
- **Logs del sistema**: Revise `.manus-logs/devserver.log` para errores detallados

---

**Última actualización**: Febrero 2026  
**Versión del documento**: 1.0
