import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import {
  notificationTemplates,
  notificationQueue,
  notificationLogs,
  employees,
  users,
  compliance_reports,
} from '../../drizzle/schema';
import { eq, and, desc, sql, lt, gte } from 'drizzle-orm';
import nodemailer from 'nodemailer';

// Configuración SMTP
const createTransporter = () => {
  const config = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  if (!config.auth.user || !config.auth.pass) {
    throw new Error('Configuración SMTP incompleta. Configure SMTP_USER y SMTP_PASS');
  }

  return nodemailer.createTransporter(config);
};

// Función para enviar correo
const sendEmail = async (to: string, subject: string, html: string) => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  };

  return await transporter.sendMail(mailOptions);
};

// Función para procesar plantillas
const processTemplate = (template: string, variables: Record<string, any>) => {
  let processed = template;
  for (const [key, value] of Object.entries(variables)) {
    processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  return processed;
};

export const notificationsRouter = router({
  // Crear plantilla de notificación
  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        subject: z.string(),
        body: z.string(),
        type: z.enum(['email', 'sms', 'both']),
        category: z.enum(['certificate_expiry', 'training_reminder', 'course_available', 'exam_reminder', 'general']),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const [template] = await db.insert(notificationTemplates).values(input).returning();
      return template;
    }),

  // Listar plantillas
  listTemplates: protectedProcedure
    .input(
      z.object({
        category: z.enum(['certificate_expiry', 'training_reminder', 'course_available', 'exam_reminder', 'general']).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      
      if (input.category) {
        conditions.push(eq(notificationTemplates.category, input.category));
      }

      return await db
        .select()
        .from(notificationTemplates)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(notificationTemplates.createdAt));
    }),

  // Actualizar plantilla
  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        subject: z.string().optional(),
        body: z.string().optional(),
        type: z.enum(['email', 'sms', 'both']).optional(),
        category: z.enum(['certificate_expiry', 'training_reminder', 'course_available', 'exam_reminder', 'general']).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      const [updated] = await db
        .update(notificationTemplates)
        .set(data)
        .where(eq(notificationTemplates.id, id))
        .returning();
      return updated;
    }),

  // Eliminar plantilla
  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(notificationTemplates).where(eq(notificationTemplates.id, input.id));
      return { success: true };
    }),

  // Enviar notificación individual
  sendNotification: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        recipientEmail: z.string().email(),
        recipientPhone: z.string().optional(),
        variables: z.record(z.any()),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Obtener plantilla
      const [template] = await db
        .select()
        .from(notificationTemplates)
        .where(eq(notificationTemplates.id, input.templateId));

      if (!template || !template.isActive) {
        throw new Error('Plantilla no encontrada o inactiva');
      }

      // Procesar plantilla
      const subject = processTemplate(template.subject, input.variables);
      const body = processTemplate(template.body, input.variables);

      let emailSent = false;
      let smsSent = false;
      let error = null;

      // Enviar correo
      if (template.type === 'email' || template.type === 'both') {
        try {
          await sendEmail(input.recipientEmail, subject, body);
          emailSent = true;
        } catch (err: any) {
          error = err.message;
        }
      }

      // Enviar SMS (placeholder - requiere integración con Twilio u otro servicio)
      if (template.type === 'sms' || template.type === 'both') {
        if (input.recipientPhone) {
          // TODO: Implementar envío de SMS con Twilio
          smsSent = false;
        }
      }

      // Registrar en logs
      await db.insert(notificationLogs).values({
        templateId: template.id,
        recipientEmail: input.recipientEmail,
        recipientPhone: input.recipientPhone,
        subject,
        body,
        status: emailSent || smsSent ? 'sent' : 'failed',
        sentAt: emailSent || smsSent ? new Date() : null,
        error,
      });

      return {
        success: emailSent || smsSent,
        emailSent,
        smsSent,
        error,
      };
    }),

  // Verificar certificados próximos a vencer
  checkExpiringCertificates: protectedProcedure
    .input(
      z.object({
        daysThreshold: z.number().default(30),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Calcular fecha límite
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + input.daysThreshold);

      // Buscar certificados próximos a vencer
      // TODO: Implementar lógica de búsqueda de certificados con fecha de expiración
      // Por ahora, retornamos un placeholder
      const expiringCertificates: any[] = [];

      // Enviar notificaciones
      let notificationsSent = 0;
      for (const cert of expiringCertificates) {
        try {
          // TODO: Enviar notificación usando plantilla de certificate_expiry
          notificationsSent++;
        } catch (err) {
          console.error('Error al enviar notificación:', err);
        }
      }

      return {
        checked: expiringCertificates.length,
        notificationsSent,
      };
    }),

  // Obtener historial de notificaciones
  getNotificationLogs: protectedProcedure
    .input(
      z.object({
        status: z.enum(['sent', 'failed', 'pending']).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      if (input.status) {
        conditions.push(eq(notificationLogs.status, input.status));
      }

      const logs = await db
        .select({
          id: notificationLogs.id,
          templateId: notificationLogs.templateId,
          recipientEmail: notificationLogs.recipientEmail,
          recipientPhone: notificationLogs.recipientPhone,
          subject: notificationLogs.subject,
          status: notificationLogs.status,
          sentAt: notificationLogs.sentAt,
          error: notificationLogs.error,
          createdAt: notificationLogs.createdAt,
          templateName: notificationTemplates.name,
        })
        .from(notificationLogs)
        .leftJoin(notificationTemplates, eq(notificationLogs.templateId, notificationTemplates.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(notificationLogs.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(notificationLogs)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        logs,
        total: count,
      };
    }),

  // Obtener estadísticas de notificaciones
  getNotificationStats: protectedProcedure.query(async () => {
    const db = getDb();

    const [stats] = await db
      .select({
        totalSent: sql<number>`count(case when status = 'sent' then 1 end)`,
        totalFailed: sql<number>`count(case when status = 'failed' then 1 end)`,
        totalPending: sql<number>`count(case when status = 'pending' then 1 end)`,
        last24h: sql<number>`count(case when created_at >= datetime('now', '-1 day') then 1 end)`,
        last7days: sql<number>`count(case when created_at >= datetime('now', '-7 days') then 1 end)`,
        last30days: sql<number>`count(case when created_at >= datetime('now', '-30 days') then 1 end)`,
      })
      .from(notificationLogs);

    return stats;
  }),

  // Reenviar notificación fallida
  retryNotification: protectedProcedure
    .input(z.object({ logId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const [log] = await db
        .select()
        .from(notificationLogs)
        .where(eq(notificationLogs.id, input.logId));

      if (!log) {
        throw new Error('Notificación no encontrada');
      }

      if (log.status === 'sent') {
        throw new Error('Esta notificación ya fue enviada exitosamente');
      }

      try {
        await sendEmail(log.recipientEmail, log.subject, log.body);

        await db
          .update(notificationLogs)
          .set({
            status: 'sent',
            sentAt: new Date(),
            error: null,
          })
          .where(eq(notificationLogs.id, input.logId));

        return { success: true };
      } catch (err: any) {
        await db
          .update(notificationLogs)
          .set({
            error: err.message,
          })
          .where(eq(notificationLogs.id, input.logId));

        throw new Error(`Error al reenviar: ${err.message}`);
      }
    }),
});
