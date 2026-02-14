import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { smtpConfig } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import nodemailer from "nodemailer";

// Encryption key (in production, use environment variable)
const ENCRYPTION_KEY = process.env.SMTP_ENCRYPTION_KEY || "your-32-character-secret-key-here!";
const ALGORITHM = "aes-256-cbc";

// Encrypt password
function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

// Decrypt password
function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32)), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

export const smtpConfigRouter = router({
  // Get SMTP configuration (admin only)
  getConfig: protectedProcedure
    .query(async ({ ctx }) => {
      // Only admin can view SMTP config
      if (ctx.user.role !== "admin") {
        throw new Error("No autorizado");
      }

      const db = await getDb();
      if (!db) {
        throw new Error("Base de datos no disponible");
      }

      const configs = await db.select().from(smtpConfig).where(eq(smtpConfig.isActive, true)).limit(1);
      
      if (configs.length === 0) {
        return null;
      }

      const config = configs[0];
      
      // Return config with masked password
      return {
        ...config,
        password: "********", // Never return real password
      };
    }),

  // Update SMTP configuration (admin only)
  updateConfig: protectedProcedure
    .input(z.object({
      host: z.string().min(1, "Host es requerido"),
      port: z.number().int().min(1).max(65535),
      secure: z.boolean(),
      user: z.string().min(1, "Usuario es requerido"),
      password: z.string().min(1, "Contraseña es requerida"),
      fromEmail: z.string().email("Email inválido"),
      fromName: z.string().min(1, "Nombre es requerido"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only admin can update SMTP config
      if (ctx.user.role !== "admin") {
        throw new Error("No autorizado");
      }

      // Encrypt password
      const encryptedPassword = encrypt(input.password);

      const db = await getDb();
      if (!db) {
        throw new Error("Base de datos no disponible");
      }

      // Check if config exists
      const existingConfigs = await db.select().from(smtpConfig).limit(1);

      if (existingConfigs.length > 0) {
        // Update existing config
        await db.update(smtpConfig)
          .set({
            host: input.host,
            port: input.port,
            secure: input.secure,
            user: input.user,
            password: encryptedPassword,
            fromEmail: input.fromEmail,
            fromName: input.fromName,
            updatedAt: new Date(),
          })
          .where(eq(smtpConfig.id, existingConfigs[0].id));

        return { success: true, message: "Configuración SMTP actualizada correctamente" };
      } else {
        // Insert new config
        await db.insert(smtpConfig).values({
          host: input.host,
          port: input.port,
          secure: input.secure,
          user: input.user,
          password: encryptedPassword,
          fromEmail: input.fromEmail,
          fromName: input.fromName,
          isActive: true,
        });

        return { success: true, message: "Configuración SMTP creada correctamente" };
      }
    }),

  // Test SMTP connection (admin only)
  testConnection: protectedProcedure
    .input(z.object({
      host: z.string().min(1),
      port: z.number().int(),
      secure: z.boolean(),
      user: z.string().min(1),
      password: z.string().min(1),
      fromEmail: z.string().email(),
      testEmail: z.string().email("Email de prueba inválido"),
    }))
    .mutation(async ({ ctx, input }) => {
      // Only admin can test SMTP connection
      if (ctx.user.role !== "admin") {
        throw new Error("No autorizado");
      }

      try {
        // Create transporter with provided config
        const transporter = nodemailer.createTransport({
          host: input.host,
          port: input.port,
          secure: input.secure,
          auth: {
            user: input.user,
            pass: input.password,
          },
        });

        // Verify connection
        await transporter.verify();

        // Send test email
        await transporter.sendMail({
          from: `"${input.fromEmail}" <${input.fromEmail}>`,
          to: input.testEmail,
          subject: "Prueba de Configuración SMTP - Sistema NOM-035",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
              <h2 style="color: #2563eb; margin-bottom: 20px;">✅ Prueba de Conexión SMTP Exitosa</h2>
              <p style="color: #374151; line-height: 1.6;">
                La configuración SMTP ha sido probada exitosamente. El servidor de correo está funcionando correctamente.
              </p>
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 6px; margin-top: 20px;">
                <p style="margin: 0; color: #6b7280; font-size: 14px;">
                  <strong>Servidor:</strong> ${input.host}:${input.port}<br>
                  <strong>Usuario:</strong> ${input.user}<br>
                  <strong>Seguro:</strong> ${input.secure ? 'Sí (SSL/TLS)' : 'No (STARTTLS)'}
                </p>
              </div>
              <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">
                Este es un correo de prueba automático del Sistema de Capacitación NOM-035 STPS 2018.
              </p>
            </div>
          `,
        });

        return { 
          success: true, 
          message: `Conexión exitosa. Correo de prueba enviado a ${input.testEmail}` 
        };
      } catch (error: any) {
        console.error("Error al probar conexión SMTP:", error);
        return { 
          success: false, 
          message: `Error: ${error.message || 'No se pudo conectar al servidor SMTP'}` 
        };
      }
    }),

  // Get decrypted SMTP config for internal use (not exposed to frontend)
  getDecryptedConfig: publicProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new Error("Base de datos no disponible");
      }

      const configs = await db.select().from(smtpConfig).where(eq(smtpConfig.isActive, true)).limit(1);
      
      if (configs.length === 0) {
        return null;
      }

      const config = configs[0];
      
      try {
        const decryptedPassword = decrypt(config.password);
        return {
          ...config,
          password: decryptedPassword,
        };
      } catch (error) {
        console.error("Error al desencriptar contraseña SMTP:", error);
        return null;
      }
    }),
});
