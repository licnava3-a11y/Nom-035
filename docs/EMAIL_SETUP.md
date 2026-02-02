# Configuración de Correo Electrónico para el Buzón NOM-035

Este documento explica cómo configurar la integración de correo electrónico para el buzón de la plataforma NOM-035.

## Características

- ✅ Recepción de solicitudes por correo electrónico
- ✅ Confirmación automática de recepción
- ✅ Notificaciones de cambio de estado
- ✅ Plantillas de correo profesionales
- ✅ Clasificación automática de solicitudes

## Opciones de Configuración

### Opción 1: SendGrid (Recomendado)

SendGrid es un servicio confiable y fácil de configurar.

#### 1. Crear cuenta en SendGrid

1. Regístrate en [SendGrid](https://sendgrid.com/)
2. Verifica tu dominio
3. Obtén tu API Key

#### 2. Configurar Inbound Parse

1. Ve a Settings → Inbound Parse
2. Agrega un nuevo hostname: `buzon.tudominio.com`
3. Configura la URL del webhook: `https://tudominio.com/api/mailbox-webhook`
4. Guarda la configuración

#### 3. Configurar variables de entorno

```bash
SENDGRID_API_KEY=tu_api_key_aqui
MAILBOX_EMAIL_FROM=buzon@tudominio.com
```

#### 4. Instalar dependencia

```bash
pnpm add @sendgrid/mail
```

#### 5. Actualizar código

En `server/lib/email-service.ts`, descomenta y configura el código de SendGrid:

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function sendEmail(config: EmailConfig): Promise<boolean> {
  try {
    await sgMail.send(config);
    return true;
  } catch (error) {
    console.error('Error enviando correo:', error);
    return false;
  }
}
```

### Opción 2: AWS SES

AWS SES es económico y escalable.

#### 1. Configurar SES

1. Ve a AWS Console → SES
2. Verifica tu dominio
3. Configura reglas de recepción
4. Crea una función Lambda para procesar correos

#### 2. Configurar variables de entorno

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=tu_access_key
AWS_SECRET_ACCESS_KEY=tu_secret_key
MAILBOX_EMAIL_FROM=buzon@tudominio.com
```

#### 3. Instalar dependencias

```bash
pnpm add @aws-sdk/client-ses
```

### Opción 3: Mailgun

Mailgun ofrece una API simple y potente.

#### 1. Crear cuenta en Mailgun

1. Regístrate en [Mailgun](https://www.mailgun.com/)
2. Verifica tu dominio
3. Obtén tu API Key

#### 2. Configurar Routes

1. Ve a Receiving → Routes
2. Crea una ruta para `buzon@tudominio.com`
3. Configura la acción: Forward to URL
4. URL: `https://tudominio.com/api/mailbox-webhook`

#### 3. Configurar variables de entorno

```bash
MAILGUN_API_KEY=tu_api_key_aqui
MAILGUN_DOMAIN=tudominio.com
MAILBOX_EMAIL_FROM=buzon@tudominio.com
```

### Opción 4: SMTP Personalizado

Si tienes un servidor SMTP propio.

#### 1. Instalar Nodemailer

```bash
pnpm add nodemailer
pnpm add -D @types/nodemailer
```

#### 2. Configurar variables de entorno

```bash
SMTP_HOST=smtp.tudominio.com
SMTP_PORT=587
SMTP_USER=buzon@tudominio.com
SMTP_PASS=tu_contraseña
MAILBOX_EMAIL_FROM=buzon@tudominio.com
```

#### 3. Actualizar código

En `server/lib/email-service.ts`:

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(config: EmailConfig): Promise<boolean> {
  try {
    await transporter.sendMail(config);
    return true;
  } catch (error) {
    console.error('Error enviando correo:', error);
    return false;
  }
}
```

## Configuración DNS

Para cualquier opción que elijas, necesitarás configurar registros DNS:

### Registros MX (para recibir correos)

```
Tipo: MX
Nombre: buzon.tudominio.com
Valor: (proporcionado por tu servicio de correo)
Prioridad: 10
```

### Registros SPF y DKIM (para enviar correos)

```
Tipo: TXT
Nombre: @
Valor: v=spf1 include:_spf.tuservicio.com ~all
```

```
Tipo: TXT
Nombre: _domainkey.tudominio.com
Valor: (proporcionado por tu servicio de correo)
```

## Pruebas

### 1. Probar el webhook

```bash
curl -X GET https://tudominio.com/api/mailbox-webhook/test
```

Deberías recibir:

```json
{
  "success": true,
  "message": "Webhook del buzón funcionando correctamente",
  "timestamp": "2024-03-20T10:00:00.000Z"
}
```

### 2. Enviar correo de prueba

Envía un correo a `buzon@tudominio.com` con:

- **Asunto**: Queja por acoso laboral
- **Cuerpo**: Descripción de la situación

Deberías recibir:
1. Confirmación de recepción automática
2. La solicitud aparecerá en el buzón de la plataforma

### 3. Probar cambio de estado

1. Ve al buzón en la plataforma
2. Cambia el estado de una solicitud
3. Verifica que se envíe el correo de notificación

## Integración con el Sistema

El webhook ya está integrado con el sistema. Para usarlo:

1. Registra el webhook en `server/_core/index.ts`:

```typescript
import mailboxWebhookRouter from './routes/mailbox-webhook';

// Agregar después de las otras rutas
app.use('/api', mailboxWebhookRouter);
```

2. Actualiza el procedimiento de cambio de estado en `server/routers.ts` para enviar notificaciones:

```typescript
import { sendStatusChangeNotification } from './lib/email-service';

// En el procedimiento updateMailboxStatus
await sendStatusChangeNotification(
  mailboxEntry.senderEmail,
  mailboxEntry.folio,
  mailboxEntry.subject,
  input.status,
  assignedToName,
  input.response
);
```

## Solución de Problemas

### El webhook no recibe correos

1. Verifica la configuración DNS
2. Revisa los logs del servicio de correo
3. Comprueba que la URL del webhook sea accesible públicamente
4. Verifica que el webhook esté registrado correctamente

### Los correos no se envían

1. Verifica las credenciales del servicio de correo
2. Revisa los logs de la aplicación
3. Comprueba los límites de envío de tu plan
4. Verifica que el dominio esté verificado

### Correos marcados como spam

1. Configura registros SPF, DKIM y DMARC
2. Usa un dominio verificado
3. Evita palabras spam en el asunto
4. Mantén una buena reputación de envío

## Seguridad

### Validar webhooks

Agrega validación de firma en el webhook:

```typescript
// Para SendGrid
const signature = req.headers['x-twilio-email-event-webhook-signature'];
// Validar firma...

// Para Mailgun
const signature = req.headers['x-mailgun-signature'];
// Validar firma...
```

### Limitar tasa de solicitudes

Implementa rate limiting para prevenir abuso:

```typescript
import rateLimit from 'express-rate-limit';

const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 solicitudes
});

router.post('/mailbox-webhook', webhookLimiter, async (req, res) => {
  // ...
});
```

## Monitoreo

### Métricas a monitorear

- Correos recibidos por día
- Correos enviados por día
- Tasa de entrega
- Tasa de rebote
- Tiempo de respuesta del webhook

### Logs

Los logs se encuentran en:
- Consola de la aplicación
- Dashboard del servicio de correo
- Logs de la base de datos (tabla `mailbox`)

## Costos Estimados

### SendGrid
- Gratis: 100 correos/día
- Essentials: $19.95/mes - 50,000 correos/mes
- Pro: $89.95/mes - 100,000 correos/mes

### AWS SES
- $0.10 por 1,000 correos enviados
- $0.12 por 1,000 correos recibidos

### Mailgun
- Gratis: 5,000 correos/mes (primeros 3 meses)
- Foundation: $35/mes - 50,000 correos/mes
- Growth: $80/mes - 100,000 correos/mes

## Soporte

Para más ayuda:
- Documentación de SendGrid: https://docs.sendgrid.com/
- Documentación de AWS SES: https://docs.aws.amazon.com/ses/
- Documentación de Mailgun: https://documentation.mailgun.com/
