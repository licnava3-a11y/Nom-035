import { sendEmail } from './survey-email-service';

/**
 * Servicio de envío de correos electrónicos para acciones correctivas NOM-035
 */

/**
 * Plantilla HTML base para correos de acciones correctivas
 */
const getEmailTemplate = (content: string, title: string): string => {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
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
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
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
    .content p {
      margin: 0 0 15px 0;
      font-size: 15px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #dc2626;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      background-color: #b91c1c;
    }
    .info-box {
      background-color: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .success-box {
      background-color: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .risk-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      margin: 5px 0;
    }
    .risk-nulo { background-color: #dbeafe; color: #1e40af; }
    .risk-bajo { background-color: #d1fae5; color: #047857; }
    .risk-medio { background-color: #fef3c7; color: #92400e; }
    .risk-alto { background-color: #fed7aa; color: #9a3412; }
    .risk-muy-alto { background-color: #fecaca; color: #991b1b; }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 13px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 5px 0;
    }
    .footer a {
      color: #ef4444;
      text-decoration: none;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    table td {
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    table td:first-child {
      font-weight: 600;
      color: #6b7280;
      width: 40%;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
      }
      .content {
        padding: 20px 15px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>Plataforma de Capacitación NOM-035 STPS 2018</strong></p>
      <p>Este correo es confidencial y está dirigido únicamente al destinatario.</p>
      <p>Si recibió este correo por error, por favor elimínelo.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Obtener badge HTML para nivel de riesgo
 */
const getRiskBadge = (riskLevel: string): string => {
  const levelMap: Record<string, string> = {
    'nulo': 'Nulo',
    'bajo': 'Bajo',
    'medio': 'Medio',
    'alto': 'Alto',
    'muy alto': 'Muy Alto',
  };
  
  const levelClass = `risk-${riskLevel.replace(' ', '-')}`;
  const levelText = levelMap[riskLevel] || riskLevel;
  
  return `<span class="risk-badge ${levelClass}">${levelText}</span>`;
};

/**
 * Plantilla para notificación de asignación de acción correctiva
 */
export const getActionAssignmentTemplate = (data: {
  responsibleName: string;
  actionId: number;
  description: string;
  riskLevel: string;
  department: string;
  dueDate: string;
  actionUrl: string;
}): string => {
  const content = `
    <p>Estimado(a) <strong>${data.responsibleName}</strong>,</p>
    
    <p>Se le ha asignado una nueva <strong>acción correctiva</strong> como parte del cumplimiento de la <strong>NOM-035-STPS-2018</strong>:</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #dc2626;">Acción Correctiva #${data.actionId}</h3>
      <p style="margin: 10px 0;"><strong>Descripción:</strong><br>${data.description}</p>
      <p style="margin: 10px 0;"><strong>Nivel de Riesgo:</strong> ${getRiskBadge(data.riskLevel)}</p>
      <table>
        <tr>
          <td>Departamento:</td>
          <td>${data.department}</td>
        </tr>
        <tr>
          <td>Fecha límite:</td>
          <td><strong>${data.dueDate}</strong></td>
        </tr>
      </table>
    </div>
    
    <p>Es importante que atienda esta acción correctiva dentro del plazo establecido para cumplir con la normativa vigente.</p>
    
    <div style="text-align: center;">
      <a href="${data.actionUrl}" class="button">Ver Acción Correctiva</a>
    </div>
    
    <p style="font-size: 13px; color: #6b7280; margin-top: 30px;">
      Si tiene alguna duda sobre esta asignación, por favor contacte al coordinador de NOM-035.
    </p>
  `;
  
  return getEmailTemplate(content, 'Nueva Acción Correctiva Asignada');
};

/**
 * Plantilla para notificación de cambio de estado
 */
export const getActionStatusChangeTemplate = (data: {
  recipientName: string;
  actionId: number;
  description: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  actionUrl: string;
}): string => {
  const statusMap: Record<string, string> = {
    'pendiente': 'Pendiente',
    'en_proceso': 'En Proceso',
    'completada': 'Completada',
    'cancelada': 'Cancelada',
  };
  
  const oldStatusText = statusMap[data.oldStatus] || data.oldStatus;
  const newStatusText = statusMap[data.newStatus] || data.newStatus;
  
  const content = `
    <p>Estimado(a) <strong>${data.recipientName}</strong>,</p>
    
    <p>Se ha actualizado el estado de una acción correctiva:</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #dc2626;">Acción Correctiva #${data.actionId}</h3>
      <p style="margin: 10px 0;">${data.description}</p>
      <table>
        <tr>
          <td>Estado anterior:</td>
          <td>${oldStatusText}</td>
        </tr>
        <tr>
          <td>Estado nuevo:</td>
          <td><strong>${newStatusText}</strong></td>
        </tr>
        <tr>
          <td>Actualizado por:</td>
          <td>${data.changedBy}</td>
        </tr>
      </table>
    </div>
    
    ${data.newStatus === 'completada' ? `
    <div class="success-box">
      <p style="margin: 0;">✅ <strong>¡Acción completada exitosamente!</strong> Gracias por su compromiso con el cumplimiento de la NOM-035.</p>
    </div>
    ` : ''}
    
    <div style="text-align: center;">
      <a href="${data.actionUrl}" class="button">Ver Detalles</a>
    </div>
    
    <p style="font-size: 13px; color: #6b7280; margin-top: 30px;">
      Esta es una notificación automática del sistema de gestión NOM-035.
    </p>
  `;
  
  return getEmailTemplate(content, 'Cambio de Estado: Acción Correctiva');
};

/**
 * Plantilla para recordatorio de acción próxima a vencer
 */
export const getActionDueReminderTemplate = (data: {
  responsibleName: string;
  actionId: number;
  description: string;
  riskLevel: string;
  dueDate: string;
  daysRemaining: number;
  actionUrl: string;
}): string => {
  const content = `
    <p>Estimado(a) <strong>${data.responsibleName}</strong>,</p>
    
    <p>Le recordamos que tiene una <strong>acción correctiva pendiente</strong> que está próxima a vencer:</p>
    
    <div class="warning-box">
      <h3 style="margin-top: 0; color: #f59e0b;">⚠️ Acción Correctiva #${data.actionId}</h3>
      <p style="margin: 10px 0;">${data.description}</p>
      <p style="margin: 10px 0;"><strong>Nivel de Riesgo:</strong> ${getRiskBadge(data.riskLevel)}</p>
      <table>
        <tr>
          <td>Fecha límite:</td>
          <td><strong>${data.dueDate}</strong></td>
        </tr>
        <tr>
          <td>Días restantes:</td>
          <td><strong style="color: #f59e0b;">${data.daysRemaining} ${data.daysRemaining === 1 ? 'día' : 'días'}</strong></td>
        </tr>
      </table>
    </div>
    
    <p>Es importante que complete esta acción dentro del plazo establecido para cumplir con la <strong>NOM-035-STPS-2018</strong>.</p>
    
    <div style="text-align: center;">
      <a href="${data.actionUrl}" class="button">Actualizar Estado</a>
    </div>
    
    <p style="font-size: 13px; color: #6b7280; margin-top: 30px;">
      Si ya completó esta acción, por favor actualice su estado en el sistema.
    </p>
  `;
  
  return getEmailTemplate(content, 'Recordatorio: Acción Correctiva Próxima a Vencer');
};

/**
 * Plantilla para notificación de acción vencida
 */
export const getActionOverdueTemplate = (data: {
  responsibleName: string;
  actionId: number;
  description: string;
  riskLevel: string;
  dueDate: string;
  daysOverdue: number;
  actionUrl: string;
}): string => {
  const content = `
    <p>Estimado(a) <strong>${data.responsibleName}</strong>,</p>
    
    <p>La siguiente <strong>acción correctiva</strong> ha <strong style="color: #dc2626;">vencido</strong> y requiere atención inmediata:</p>
    
    <div class="info-box" style="border-left-color: #dc2626;">
      <h3 style="margin-top: 0; color: #dc2626;">🚨 Acción Correctiva #${data.actionId} - VENCIDA</h3>
      <p style="margin: 10px 0;">${data.description}</p>
      <p style="margin: 10px 0;"><strong>Nivel de Riesgo:</strong> ${getRiskBadge(data.riskLevel)}</p>
      <table>
        <tr>
          <td>Fecha límite:</td>
          <td>${data.dueDate}</td>
        </tr>
        <tr>
          <td>Días de retraso:</td>
          <td><strong style="color: #dc2626;">${data.daysOverdue} ${data.daysOverdue === 1 ? 'día' : 'días'}</strong></td>
        </tr>
      </table>
    </div>
    
    <p><strong>Acción requerida:</strong> Por favor complete esta acción correctiva lo antes posible y actualice su estado en el sistema.</p>
    
    <div style="text-align: center;">
      <a href="${data.actionUrl}" class="button">Actualizar Ahora</a>
    </div>
    
    <p style="font-size: 13px; color: #6b7280; margin-top: 30px;">
      El incumplimiento de las acciones correctivas puede afectar el cumplimiento de la NOM-035-STPS-2018.
    </p>
  `;
  
  return getEmailTemplate(content, '🚨 URGENTE: Acción Correctiva Vencida');
};

/**
 * Plantilla para resumen de acciones vencidas al coordinador
 */
export const getOverdueActionsSummaryTemplate = (data: {
  coordinatorName: string;
  overdueActions: Array<{
    id: number;
    description: string;
    responsibleName: string;
    department: string;
    dueDate: string;
    daysOverdue: number;
  }>;
  dashboardUrl: string;
}): string => {
  const actionsHtml = data.overdueActions.map(action => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 12px 8px; font-weight: 600;">#${action.id}</td>
      <td style="padding: 12px 8px;">${action.description.substring(0, 60)}${action.description.length > 60 ? '...' : ''}</td>
      <td style="padding: 12px 8px;">${action.responsibleName}</td>
      <td style="padding: 12px 8px;">${action.department}</td>
      <td style="padding: 12px 8px; color: #dc2626; font-weight: 600;">${action.daysOverdue} ${action.daysOverdue === 1 ? 'día' : 'días'}</td>
    </tr>
  `).join('');
  
  const content = `
    <p>Estimado(a) <strong>${data.coordinatorName}</strong>,</p>
    
    <p>Como coordinador de NOM-035, le informamos que existen <strong style="color: #dc2626;">${data.overdueActions.length} ${data.overdueActions.length === 1 ? 'acción correctiva vencida' : 'acciones correctivas vencidas'}</strong> que requieren seguimiento:</p>
    
    <div class="info-box" style="border-left-color: #dc2626;">
      <h3 style="margin-top: 0; color: #dc2626;">Acciones Vencidas</h3>
      <table style="width: 100%; font-size: 13px;">
        <thead>
          <tr style="background-color: #f9fafb;">
            <th style="padding: 8px; text-align: left;">ID</th>
            <th style="padding: 8px; text-align: left;">Descripción</th>
            <th style="padding: 8px; text-align: left;">Responsable</th>
            <th style="padding: 8px; text-align: left;">Departamento</th>
            <th style="padding: 8px; text-align: left;">Retraso</th>
          </tr>
        </thead>
        <tbody>
          ${actionsHtml}
        </tbody>
      </table>
    </div>
    
    <p>Se recomienda dar seguimiento a estas acciones para asegurar el cumplimiento de la <strong>NOM-035-STPS-2018</strong>.</p>
    
    <div style="text-align: center;">
      <a href="${data.dashboardUrl}" class="button">Ver Dashboard</a>
    </div>
    
    <p style="font-size: 13px; color: #6b7280; margin-top: 30px;">
      Este es un resumen automático generado por el sistema de gestión NOM-035.
    </p>
  `;
  
  return getEmailTemplate(content, 'Resumen: Acciones Correctivas Vencidas');
};

/**
 * Enviar notificación de asignación de acción correctiva
 */
export async function sendActionAssignmentNotification(data: {
  to: string;
  responsibleName: string;
  actionId: number;
  description: string;
  riskLevel: string;
  department: string;
  dueDate: string;
  actionUrl: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = getActionAssignmentTemplate(data);
  
  return sendEmail({
    to: data.to,
    subject: `Nueva Acción Correctiva Asignada #${data.actionId}`,
    html,
  });
}

/**
 * Enviar notificación de cambio de estado
 */
export async function sendActionStatusChangeNotification(data: {
  to: string | string[];
  recipientName: string;
  actionId: number;
  description: string;
  oldStatus: string;
  newStatus: string;
  changedBy: string;
  actionUrl: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = getActionStatusChangeTemplate(data);
  
  return sendEmail({
    to: data.to,
    subject: `Actualización: Acción Correctiva #${data.actionId}`,
    html,
  });
}

/**
 * Enviar recordatorio de acción próxima a vencer
 */
export async function sendActionDueReminder(data: {
  to: string;
  responsibleName: string;
  actionId: number;
  description: string;
  riskLevel: string;
  dueDate: string;
  daysRemaining: number;
  actionUrl: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = getActionDueReminderTemplate(data);
  
  return sendEmail({
    to: data.to,
    subject: `⚠️ Recordatorio: Acción Correctiva #${data.actionId} próxima a vencer`,
    html,
  });
}

/**
 * Enviar notificación de acción vencida
 */
export async function sendActionOverdueNotification(data: {
  to: string;
  responsibleName: string;
  actionId: number;
  description: string;
  riskLevel: string;
  dueDate: string;
  daysOverdue: number;
  actionUrl: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = getActionOverdueTemplate(data);
  
  return sendEmail({
    to: data.to,
    subject: `🚨 URGENTE: Acción Correctiva #${data.actionId} vencida`,
    html,
  });
}

/**
 * Enviar resumen de acciones vencidas al coordinador
 */
export async function sendOverdueActionsSummary(data: {
  to: string;
  coordinatorName: string;
  overdueActions: Array<{
    id: number;
    description: string;
    responsibleName: string;
    department: string;
    dueDate: string;
    daysOverdue: number;
  }>;
  dashboardUrl: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = getOverdueActionsSummaryTemplate(data);
  
  return sendEmail({
    to: data.to,
    subject: `Resumen: ${data.overdueActions.length} ${data.overdueActions.length === 1 ? 'Acción Vencida' : 'Acciones Vencidas'}`,
    html,
  });
}
