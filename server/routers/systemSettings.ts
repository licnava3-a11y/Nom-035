import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { systemSettings } from "../../drizzle/schema";
import { eq, inArray, and, gte, lte, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { restartAlertSummaryCronJob } from "../jobs/alertSummaryCronJob";
import { sendEmail } from "../_core/email";

export const systemSettingsRouter = router({
  /**
   * Get a system setting by key
   */
  getSetting: protectedProcedure
    .input(
      z.object({
        key: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, input.key))
        .limit(1);

      return setting || null;
    }),

  /**
   * Get all system settings
   */
  getAllSettings: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database connection failed",
      });
    }

    const settings = await db.select().from(systemSettings);
    return settings;
  }),

  /**
   * Update or create a system setting
   */
  updateSetting: adminProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.string(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Check if setting exists
      const [existing] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, input.key))
        .limit(1);

      if (existing) {
        // Update existing setting
        await db
          .update(systemSettings)
          .set({
            settingValue: input.value,
            description: input.description,
            updatedBy: ctx.user.id,
          } as any)
          .where(eq(systemSettings.settingKey, input.key));
      } else {
        // Create new setting
        await (db.insert(systemSettings) as any).values({
          settingKey: input.key,
          settingValue: input.value,
          description: input.description,
          updatedBy: ctx.user.id,
        });
      }

      return { success: true };
    }),

  /**
   * Delete a system setting
   */
  deleteSetting: adminProcedure
    .input(
      z.object({
        key: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      await db.delete(systemSettings).where(eq(systemSettings.settingKey, input.key));

      return { success: true };
    }),

  /**
   * Update alert summary frequency and restart cron job
   */
  updateAlertSummaryFrequency: adminProcedure
    .input(
      z.object({
        frequency: z.enum(["weekly", "monthly", "disabled"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Check if setting exists
      const [existing] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.settingKey, "alert_summary_frequency"))
        .limit(1);

      if (existing) {
        // Update existing setting
        await db
          .update(systemSettings)
          .set({
            settingValue: input.frequency,
            updatedBy: ctx.user.id,
          } as any)
          .where(eq(systemSettings.settingKey, "alert_summary_frequency"));
      } else {
        // Create new setting
        await (db.insert(systemSettings) as any).values({
          settingKey: "alert_summary_frequency",
          settingValue: input.frequency,
          description: "Frecuencia de envío de resumen de alertas (weekly/monthly/disabled)",
          updatedBy: ctx.user.id,
        });
      }

      // Restart cron job with new configuration
      await restartAlertSummaryCronJob();

      return { success: true, message: `Frecuencia actualizada a: ${input.frequency}` };
    }),

  /**
   * Probar conexión SMTP enviando un correo de prueba
   */
  /**
   * Obtener la configuración SMTP guardada en systemSettings
   */
  getSMTPConfig: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { host: "", port: 587, user: "", pass: "", from: "", secure: false };
    const keys = ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from", "smtp_secure"];
    const rows = await db.select().from(systemSettings).where(inArray(systemSettings.settingKey, keys));
    const map = Object.fromEntries(rows.map((r) => [r.settingKey, r.settingValue ?? ""]));
    return {
      host: map["smtp_host"] ?? "",
      port: Number(map["smtp_port"] ?? 587),
      user: map["smtp_user"] ?? "",
      pass: map["smtp_pass"] ? "*".repeat(8) : "",
      from: map["smtp_from"] ?? "",
      secure: map["smtp_secure"] === "true",
    };
  }),
  /**
   * Guardar la configuración SMTP en systemSettings
   */
  saveSMTPConfig: adminProcedure
    .input(
      z.object({
        host: z.string().min(1),
        port: z.number().int().min(1).max(65535),
        user: z.string(),
        pass: z.string(),
        from: z.string(),
        secure: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });
      const entries: Array<{ key: string; value: string }> = [
        { key: "smtp_host", value: input.host },
        { key: "smtp_port", value: String(input.port) },
        { key: "smtp_user", value: input.user },
        { key: "smtp_from", value: input.from },
        { key: "smtp_secure", value: String(input.secure) },
      ];
      if (input.pass && !input.pass.match(/^\*+$/)) {
        entries.push({ key: "smtp_pass", value: input.pass });
      }
      for (const { key, value } of entries) {
        const [existing] = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, key)).limit(1);
        if (existing) {
          await db.update(systemSettings).set({ settingValue: value } as any).where(eq(systemSettings.settingKey, key));
        } else {
          await (db.insert(systemSettings) as any).values({ settingKey: key, settingValue: value, description: `SMTP config: ${key}` });
        }
      }
      return { success: true };
    }),
  testSMTP: protectedProcedure
    .input(z.object({ toEmail: z.string().email() }))
    .mutation(async ({ input, ctx }) => {
      const sent = await sendEmail({
        to: input.toEmail,
        subject: "\u2705 Prueba de conexi\u00f3n SMTP \u2014 NOM-035 STPS",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:8px">
            <h2 style="color:#0f172a;margin-top:0">Prueba de conexi\u00f3n SMTP</h2>
            <p style="color:#475569">Este correo confirma que la configuraci\u00f3n SMTP del sistema <strong>NOM-035 STPS</strong> est\u00e1 funcionando correctamente.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <tr><td style="padding:8px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold">Enviado por</td><td style="padding:8px;border:1px solid #e2e8f0">${ctx.user.name}</td></tr>
              <tr><td style="padding:8px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold">Destinatario</td><td style="padding:8px;border:1px solid #e2e8f0">${input.toEmail}</td></tr>
              <tr><td style="padding:8px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:bold">Fecha/Hora</td><td style="padding:8px;border:1px solid #e2e8f0">${new Date().toLocaleString("es-MX")}</td></tr>
            </table>
            <p style="color:#64748b;font-size:13px">Si recibi\u00f3 este correo, el sistema de notificaciones autom\u00e1ticas est\u00e1 listo para enviar alertas de contratos, PAC y dict\u00e1menes.</p>
          </div>
        `,
      });
      if (!sent) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo enviar el correo. Verifica la configuraci\u00f3n SMTP en la base de datos o las variables de entorno SMTP_HOST, SMTP_USER y SMTP_PASS.",
        });
      }
      return { success: true, message: `Correo de prueba enviado a ${input.toEmail}` };
    }),

  /**
   * Obtener datos de empresa (campos completos NOM-035 / STPS)
   */
  getCompanyInfo: protectedProcedure.query(async () => {
    const COMPANY_KEYS = [
      "company_name",              // Razón Social
      "company_rfc",               // RFC
      "company_address",           // Domicilio fiscal
      "company_logo",              // Logotipo URL
      "company_legal_rep",         // Representante Legal
      "company_registro_patronal", // Registro Patronal IMSS
      "company_giro",              // Giro / actividad preponderante
      "company_scian",             // Código SCIAN
      "company_num_workers",       // Número de trabajadores
      "company_stps_reg",          // Registro STPS
      "company_phone",             // Teléfono
      "company_email",             // Correo electrónico
      "company_city",              // Ciudad
      "company_state",             // Estado
      "company_postal_code",       // Código Postal
      "company_fiscal_regime",     // Régimen fiscal
      "company_imss_subdelegacion",// Subdelegación IMSS
    ];
    const db = await getDb();
    if (!db) return Object.fromEntries(COMPANY_KEYS.map(k => [k, ""])) as Record<string, string>;
    const rows = await db
      .select({ key: systemSettings.settingKey, value: systemSettings.settingValue })
      .from(systemSettings)
      .where(inArray(systemSettings.settingKey, COMPANY_KEYS));
    const map: Record<string, string> = {};
    rows.forEach((r) => { map[r.key] = r.value ?? ""; });
    return Object.fromEntries(COMPANY_KEYS.map(k => [k, map[k] ?? ""])) as Record<string, string>;
  }),

  /**
   * Guardar datos de empresa (campos completos NOM-035 / STPS)
   */
  saveCompanyInfo: adminProcedure
    .input(
      z.object({
        company_name: z.string().max(255).optional(),
        company_rfc: z.string().max(20).optional(),
        company_address: z.string().max(500).optional(),
        company_logo: z.string().max(2048).optional(),
        company_legal_rep: z.string().max(255).optional(),
        company_registro_patronal: z.string().max(20).optional(),
        company_giro: z.string().max(255).optional(),
        company_scian: z.string().max(10).optional(),
        company_num_workers: z.string().max(10).optional(),
        company_stps_reg: z.string().max(50).optional(),
        company_phone: z.string().max(20).optional(),
        company_email: z.string().max(255).optional(),
        company_city: z.string().max(100).optional(),
        company_state: z.string().max(100).optional(),
        company_postal_code: z.string().max(10).optional(),
        company_fiscal_regime: z.string().max(100).optional(),
        company_imss_subdelegacion: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB error" });
      const entries = Object.entries(input).filter(([, v]) => v !== undefined) as [string, string][];
      for (const [key, value] of entries) {
        const existing = await db.select({ id: systemSettings.id }).from(systemSettings).where(eq(systemSettings.settingKey, key)).limit(1);
        if (existing.length > 0) {
          await db.update(systemSettings).set({ settingValue: value }).where(eq(systemSettings.settingKey, key));
        } else {
          await (db.insert(systemSettings) as any).values({ settingKey: key, settingValue: value });
        }
      }
      return { success: true };
    }),

  /**
   * Exportar TODOS los registros del historial de alertas sin paginación
   */
  getAllAlertsForExport: protectedProcedure
    .input(
      z.object({
        status: z.string().optional().default("all"),
        alertType: z.string().optional(),
        priority: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });
      const { alertHistory } = await import("../../drizzle/schema");
      const conditions: any[] = [];
      if (input.status && input.status !== "all") {
        conditions.push(eq(alertHistory.status, input.status as any));
      }
      if (input.alertType) {
        conditions.push(eq(alertHistory.alertType, input.alertType as any));
      }
      if (input.priority) {
        conditions.push(eq(alertHistory.priority, input.priority as any));
      }
      if (input.dateFrom) conditions.push(gte(alertHistory.triggeredAt, new Date(input.dateFrom)));
      if (input.dateTo) conditions.push(lte(alertHistory.triggeredAt, new Date(input.dateTo)));
      const rows = await db
        .select()
        .from(alertHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(alertHistory.triggeredAt));
      return rows;
    }),
});
