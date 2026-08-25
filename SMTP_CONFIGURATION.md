# Configuración SMTP para Envío de Correos

Este documento explica cómo configurar las variables de entorno SMTP necesarias para que el sistema pueda enviar correos electrónicos (recordatorios de encuestas, notificaciones, etc.).

## Variables de Entorno Requeridas

El sistema requiere las siguientes variables de entorno para funcionar correctamente:

```bash
SMTP_HOST=smtp.ejemplo.com          # Servidor SMTP de tu proveedor
SMTP_PORT=587                        # Puerto SMTP (587 para TLS, 465 para SSL)
SMTP_USER=tu-email@ejemplo.com      # Usuario/email para autenticación
SMTP_PASS=tu-contraseña-smtp        # Contraseña o token de aplicación
SMTP_FROM=noreply@ejemplo.com       # Email del remitente (opcional)
SMTP_SECURE=false                    # true para puerto 465, false para otros
```

## Proveedores SMTP Comunes

### Gmail

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-contraseña-de-aplicación
SMTP_SECURE=false
```

**Nota:** Para Gmail, necesitas generar una "Contraseña de aplicación" desde tu cuenta de Google:

1. Ve a tu cuenta de Google → Seguridad
2. Activa la verificación en dos pasos
3. Genera una contraseña de aplicación para "Correo"

### Outlook/Office 365

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=tu-email@outlook.com
SMTP_PASS=tu-contraseña
SMTP_SECURE=false
```

### SendGrid

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=tu-api-key-de-sendgrid
SMTP_SECURE=false
```

### Mailgun

```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@tu-dominio.mailgun.org
SMTP_PASS=tu-contraseña-de-mailgun
SMTP_SECURE=false
```

## Cómo Configurar en Manus

### Opción 1: Usar webdev_request_secrets (Recomendado)

El sistema puede solicitar estas variables automáticamente. Si ves errores de "Configuración SMTP incompleta", el sistema te pedirá que configures estos valores.

### Opción 2: Configuración Manual

1. Ve a la interfaz de Manus
2. Abre el panel de "Settings" → "Secrets"
3. Agrega cada variable de entorno con su valor correspondiente

## Verificación

Una vez configuradas las variables, el sistema podrá:

- ✅ Enviar recordatorios de encuestas a trabajadores pendientes
- ✅ Enviar notificaciones de acciones correctivas
- ✅ Enviar invitaciones a encuestas
- ✅ Enviar confirmaciones de respuestas

## Solución de Problemas

### Error: "Configuración SMTP incompleta"

**Causa:** Faltan una o más variables de entorno SMTP.

**Solución:** Verifica que todas las variables requeridas estén configuradas (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS).

### Error: "Authentication failed"

**Causa:** Credenciales incorrectas o permisos insuficientes.

**Solución:**

- Verifica que el usuario y contraseña sean correctos
- Para Gmail, asegúrate de usar una "Contraseña de aplicación"
- Verifica que la cuenta tenga permisos para enviar correos vía SMTP

### Error: "Connection timeout"

**Causa:** El servidor SMTP no es accesible o el puerto está bloqueado.

**Solución:**

- Verifica que el host y puerto sean correctos
- Asegúrate de que tu firewall permita conexiones salientes al puerto SMTP
- Intenta con un puerto alternativo (587 o 465)

### Los correos se envían pero no llegan

**Causa:** Los correos pueden estar siendo marcados como spam.

**Solución:**

- Configura registros SPF y DKIM en tu dominio
- Usa un proveedor SMTP profesional (SendGrid, Mailgun, etc.)
- Verifica que el email del remitente (SMTP_FROM) sea válido

## Prueba de Configuración

Para probar que la configuración SMTP funciona correctamente:

1. Ve a "Encuestas NOM-035" → "Seguimiento"
2. Haz clic en "Enviar Recordatorios"
3. El sistema mostrará cuántos correos se enviaron exitosamente

Si todos los correos se envían correctamente, la configuración está funcionando bien.

## Seguridad

⚠️ **Importante:**

- Nunca compartas tus credenciales SMTP públicamente
- Usa contraseñas de aplicación en lugar de tu contraseña principal
- Considera usar servicios SMTP profesionales para producción
- Revisa regularmente los logs de envío para detectar actividad sospechosa
