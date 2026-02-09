import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router, protectedProcedure } from "./trpc";
import nodemailer from 'nodemailer';

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  /**
   * Prueba la conexión SMTP con las credenciales proporcionadas
   */
  testSmtpConnection: protectedProcedure
    .input(z.object({
      host: z.string().min(1, 'El servidor SMTP es requerido'),
      port: z.number().int().min(1).max(65535, 'Puerto inválido'),
      user: z.string().email('Usuario debe ser un email válido'),
      password: z.string().min(1, 'La contraseña es requerida'),
      fromEmail: z.string().email().optional(),
      fromName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        // Crear transporter con las credenciales proporcionadas
        const transporter = nodemailer.createTransport({
          host: input.host,
          port: input.port,
          secure: input.port === 465, // true para puerto 465, false para otros
          auth: {
            user: input.user,
            pass: input.password,
          },
          // Timeout de 10 segundos para evitar esperas largas
          connectionTimeout: 10000,
          greetingTimeout: 10000,
        });

        // Verificar la conexión
        await transporter.verify();

        // Intentar enviar un correo de prueba
        const fromEmail = input.fromEmail || input.user;
        const fromName = input.fromName || 'Sistema NOM-035';

        await transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to: input.user, // Enviar al mismo usuario como prueba
          subject: '✅ Prueba de Conexión SMTP - Sistema NOM-035',
          html: `
            <!DOCTYPE html>
            <html lang="es">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Prueba SMTP</title>
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #1E3A8A 0%, #3B82F6 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">✅ Conexión SMTP Exitosa</h1>
              </div>
              <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                <p>La configuración SMTP ha sido probada exitosamente.</p>
                <div style="background-color: #DBEAFE; border-left: 4px solid #3B82F6; padding: 16px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #1E40AF;"><strong>Detalles de la conexión:</strong></p>
                  <ul style="margin: 10px 0 0 0; color: #1E40AF;">
                    <li><strong>Servidor:</strong> ${input.host}</li>
                    <li><strong>Puerto:</strong> ${input.port}</li>
                    <li><strong>Usuario:</strong> ${input.user}</li>
                    <li><strong>Encriptación:</strong> ${input.port === 465 ? 'SSL' : 'TLS'}</li>
                  </ul>
                </div>
                <p>El sistema está listo para enviar notificaciones por correo electrónico.</p>
                <p style="font-size: 12px; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  Este es un correo automático generado por el Sistema de Gestión NOM-035.<br>
                  &copy; ${new Date().getFullYear()} Plataforma de Capacitación NOM-035
                </p>
              </div>
            </body>
            </html>
          `,
          text: `Conexión SMTP exitosa. Servidor: ${input.host}, Puerto: ${input.port}, Usuario: ${input.user}`,
        });

        return {
          success: true,
          message: `Conexión exitosa. Se envió un correo de prueba a ${input.user}`,
        };
      } catch (error: any) {
        console.error('Error al probar conexión SMTP:', error);
        
        // Mensajes de error más descriptivos
        let errorMessage = 'Error desconocido al conectar con el servidor SMTP';
        
        if (error.code === 'EAUTH') {
          errorMessage = 'Error de autenticación. Verifica el usuario y contraseña.';
        } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
          errorMessage = 'No se pudo conectar al servidor SMTP. Verifica el host y puerto.';
        } else if (error.code === 'ENOTFOUND') {
          errorMessage = 'Servidor SMTP no encontrado. Verifica la dirección del servidor.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        return {
          success: false,
          message: errorMessage,
        };
      }
    }),

  /**
   * Obtiene el estado actual de la configuración SMTP
   */
  getSmtpStatus: protectedProcedure
    .query(async () => {
      const hasHost = !!process.env.SMTP_HOST;
      const hasPort = !!process.env.SMTP_PORT;
      const hasUser = !!process.env.SMTP_USER;
      const hasPassword = !!process.env.SMTP_PASSWORD;

      const isConfigured = hasHost && hasPort && hasUser && hasPassword;

      return {
        isConfigured,
        host: hasHost ? process.env.SMTP_HOST : null,
        port: hasPort ? parseInt(process.env.SMTP_PORT || '587') : 587,
        user: hasUser ? process.env.SMTP_USER : null,
        fromEmail: process.env.SMTP_FROM_EMAIL || null,
        fromName: process.env.SMTP_FROM_NAME || 'Sistema NOM-035',
        // No retornamos la contraseña por seguridad
      };
    }),
});
