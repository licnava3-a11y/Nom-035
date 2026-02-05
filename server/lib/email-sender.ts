import nodemailer from 'nodemailer';

/**
 * Helper para envío de correos electrónicos usando SMTP
 * 
 * Configuración mediante variables de entorno:
 * - SMTP_HOST: Servidor SMTP
 * - SMTP_PORT: Puerto SMTP
 * - SMTP_USER: Usuario para autenticación
 * - SMTP_PASSWORD: Contraseña para autenticación
 * - SMTP_FROM_EMAIL: Email del remitente
 * - SMTP_FROM_NAME: Nombre del remitente
 */

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Crea transporter de nodemailer con configuración SMTP
 */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  if (!host || !user || !password) {
    throw new Error('Configuración SMTP incompleta. Verifica las variables de entorno SMTP_*');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true para puerto 465, false para otros
    auth: {
      user,
      pass: password,
    },
  });
}

/**
 * Envía un correo electrónico
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    const transporter = createTransporter();
    
    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    const fromName = process.env.SMTP_FROM_NAME || 'Sistema NOM-035';

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return true;
  } catch (error) {
    console.error('Error al enviar correo:', error);
    return false;
  }
}

/**
 * Template HTML base para correos
 */
function getEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Notificación NOM-035</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background-color: #1E3A8A;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .alert {
      padding: 16px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .alert-warning {
      background-color: #FEF3C7;
      border-left: 4px solid #F59E0B;
      color: #92400E;
    }
    .alert-danger {
      background-color: #FEE2E2;
      border-left: 4px solid #EF4444;
      color: #991B1B;
    }
    .alert-info {
      background-color: #DBEAFE;
      border-left: 4px solid #3B82F6;
      color: #1E40AF;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏢 Sistema NOM-035 STPS 2018</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>Este es un correo automático generado por el Sistema de Gestión NOM-035.</p>
      <p>Por favor, no responda a este mensaje.</p>
      <p>&copy; ${new Date().getFullYear()} Plataforma de Capacitación NOM-035</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Envía notificación de brechas críticas detectadas
 */
export async function sendCriticalGapsNotification(
  to: string | string[],
  gaps: Array<{ competency: string; avgGap: number; affectedEmployees: number }>
): Promise<boolean> {
  const gapsList = gaps.map(g => `
    <li>
      <strong>${g.competency}</strong>: 
      Brecha promedio de ${g.avgGap.toFixed(1)}%, 
      afecta a ${g.affectedEmployees} empleados
    </li>
  `).join('');

  const content = `
    <h2>⚠️ Brechas Críticas Detectadas</h2>
    <div class="alert alert-danger">
      <p><strong>Se han detectado brechas críticas en competencias organizacionales.</strong></p>
      <p>Es necesario tomar acción inmediata para cerrar estas brechas mediante capacitación y desarrollo.</p>
    </div>
    
    <h3>Competencias con Mayor Brecha:</h3>
    <ul>
      ${gapsList}
    </ul>
    
    <p>Accede al sistema para ver el análisis completo y generar el plan de acción:</p>
    <a href="${process.env.VITE_APP_URL || 'https://app.example.com'}/competencies-dashboard" class="button">
      Ver Dashboard de Competencias
    </a>
    
    <p><strong>Recomendaciones:</strong></p>
    <ul>
      <li>Revisar el plan de capacitación actual</li>
      <li>Identificar necesidades de capacitación específicas</li>
      <li>Asignar recursos para cerrar las brechas detectadas</li>
      <li>Establecer metas de mejora por competencia</li>
    </ul>
  `;

  return sendEmail({
    to,
    subject: '⚠️ Alerta: Brechas Críticas Detectadas en Competencias',
    html: getEmailTemplate(content),
    text: `Se han detectado brechas críticas en ${gaps.length} competencias. Accede al sistema para más detalles.`,
  });
}

/**
 * Envía notificación de tokens de encuesta generados
 */
export async function sendSurveyTokensNotification(
  to: string | string[],
  surveyName: string,
  tokensGenerated: number,
  expirationDate: Date
): Promise<boolean> {
  const content = `
    <h2>📋 Tokens de Encuesta Generados</h2>
    <div class="alert alert-info">
      <p><strong>Se han generado tokens de acceso para la encuesta "${surveyName}".</strong></p>
    </div>
    
    <h3>Detalles:</h3>
    <ul>
      <li><strong>Encuesta:</strong> ${surveyName}</li>
      <li><strong>Tokens generados:</strong> ${tokensGenerated}</li>
      <li><strong>Fecha de expiración:</strong> ${expirationDate.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}</li>
    </ul>
    
    <p>Los tokens han sido generados y están listos para ser enviados a los empleados.</p>
    
    <a href="${process.env.VITE_APP_URL || 'https://app.example.com'}/surveys" class="button">
      Ver Encuestas
    </a>
    
    <p><strong>Próximos pasos:</strong></p>
    <ul>
      <li>Exportar lista de tokens con URLs únicas</li>
      <li>Enviar tokens a empleados por correo o comunicación interna</li>
      <li>Monitorear el progreso de respuestas</li>
      <li>Recordar a empleados antes de la fecha de expiración</li>
    </ul>
  `;

  return sendEmail({
    to,
    subject: `📋 Tokens Generados: ${surveyName} (${tokensGenerated} empleados)`,
    html: getEmailTemplate(content),
    text: `Se han generado ${tokensGenerated} tokens para la encuesta "${surveyName}". Expiran el ${expirationDate.toLocaleDateString('es-MX')}.`,
  });
}

/**
 * Envía token de encuesta individual a un empleado
 */
export async function sendSurveyTokenToEmployee(
  to: string,
  employeeName: string,
  surveyName: string,
  token: string,
  expirationDate: Date
): Promise<boolean> {
  const surveyUrl = `${process.env.VITE_APP_URL || 'https://app.example.com'}/survey/public/${token}`;
  
  const content = `
    <h2>Hola ${employeeName},</h2>
    <p>Has sido seleccionado para participar en la encuesta <strong>"${surveyName}"</strong> como parte del programa de evaluación del entorno organizacional según la NOM-035-STPS-2018.</p>
    
    <div class="alert alert-info">
      <p><strong>Tu participación es muy importante</strong> para identificar áreas de mejora en nuestro entorno laboral.</p>
    </div>
    
    <p>La encuesta es <strong>confidencial y anónima</strong>. Tus respuestas serán utilizadas únicamente para fines estadísticos y de mejora organizacional.</p>
    
    <a href="${surveyUrl}" class="button">
      Responder Encuesta
    </a>
    
    <p><strong>Información importante:</strong></p>
    <ul>
      <li><strong>Fecha límite:</strong> ${expirationDate.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })}</li>
      <li><strong>Tiempo estimado:</strong> 15-20 minutos</li>
      <li><strong>Guardado automático:</strong> Puedes pausar y continuar después</li>
    </ul>
    
    <p>Si tienes alguna duda sobre la encuesta, contacta al área de Recursos Humanos.</p>
    
    <p style="font-size: 12px; color: #6b7280; margin-top: 30px;">
      <strong>Enlace directo:</strong><br>
      <a href="${surveyUrl}" style="color: #3B82F6;">${surveyUrl}</a>
    </p>
  `;

  return sendEmail({
    to,
    subject: `📋 Invitación: ${surveyName} - NOM-035`,
    html: getEmailTemplate(content),
    text: `Hola ${employeeName}, has sido invitado a responder la encuesta "${surveyName}". Accede con tu token: ${surveyUrl}`,
  });
}
