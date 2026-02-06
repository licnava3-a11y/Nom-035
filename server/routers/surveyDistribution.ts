import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, surveys, surveyTokens, surveyNotifications } from "../../drizzle/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { sendEmail } from "../lib/email-service";
// crypto se importará dinámicamente en el servidor

export const surveyDistributionRouter = router({
  /**
   * Determinar qué guías enviar según cantidad de trabajadores activos
   */
  getRequiredSurveys: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    
    // Contar trabajadores activos (excluyendo administradores)
    const result = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(users)
      .where(eq(users.role, "student"));
    
    const employeeCount = result[0]?.count || 0;
    
    // Determinar guías requeridas según NOM-035
    let requiredSurveys: string[] = [];
    
    if (employeeCount < 15) {
      requiredSurveys = ["guia_i"];
    } else if (employeeCount >= 15 && employeeCount <= 50) {
      requiredSurveys = ["guia_i", "guia_ii"];
    } else {
      requiredSurveys = ["guia_i", "guia_ii", "guia_iii"];
    }
    
    // Obtener información de las encuestas
    const surveyList = await db
      .select()
      .from(surveys)
      .where(sql`${surveys.type} IN (${sql.join(requiredSurveys.map(t => sql`${t}`), sql`, `)})`);
    
    return {
      employeeCount,
      requiredSurveys,
      surveys: surveyList,
      recommendation: employeeCount < 15 
        ? "Menos de 15 trabajadores: Solo se requiere Guía I"
        : employeeCount <= 50
        ? "15-50 trabajadores: Se requieren Guía I y Guía II"
        : "Más de 50 trabajadores: Se requieren Guía I, Guía II y Guía III"
    };
  }),

  /**
   * Obtener lista de empleados elegibles para encuestas
   */
  getEligibleEmployees: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      excludeCompleted: z.boolean().default(true),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      if (input.excludeCompleted) {
        // Obtener empleados que NO han completado la encuesta
        const employees = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            curp: users.curp,
            departamento: users.departamento,
            puesto: users.puesto,
          })
          .from(users)
          .where(
            and(
              eq(users.role, "student"),
              sql`NOT EXISTS (
                SELECT 1 FROM ${surveyTokens} 
                WHERE ${surveyTokens.userId} = ${users.id} 
                AND ${surveyTokens.surveyId} = ${input.surveyId}
                AND ${surveyTokens.usedAt} IS NOT NULL
              )`
            )
          );
        
        return employees;
      } else {
        // Obtener todos los empleados
        const employees = await db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            curp: users.curp,
            departamento: users.departamento,
            puesto: users.puesto,
          })
          .from(users)
          .where(eq(users.role, "student"));
        
        return employees;
      }
    }),

  /**
   * Enviar encuestas por correo a empleados seleccionados
   */
  sendSurveyInvitations: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      employeeIds: z.array(z.number()),
      subject: z.string().optional(),
      customMessage: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Obtener información de la encuesta
      const survey = await db
        .select()
        .from(surveys)
        .where(eq(surveys.id, input.surveyId))
        .limit(1);
      
      if (!survey[0]) {
        throw new Error("Encuesta no encontrada");
      }
      
      const surveyInfo = survey[0];
      
      // Obtener información de los empleados
      const employees = await db
        .select()
        .from(users)
        .where(sql`${users.id} IN (${sql.join(input.employeeIds.map(id => sql`${id}`), sql`, `)})`);
      
      const results = {
        sent: 0,
        failed: 0,
        errors: [] as string[],
      };
      
      // Generar tokens y enviar correos
      for (const employee of employees) {
        try {
          // Verificar si ya existe un token activo
          const existingToken = await db
            .select()
            .from(surveyTokens)
            .where(
              and(
                eq(surveyTokens.userId, employee.id),
                eq(surveyTokens.surveyId, input.surveyId),
                isNull(surveyTokens.usedAt)
              )
            )
            .limit(1);
          
          let token: string;
          
          if (existingToken[0]) {
            token = existingToken[0].token;
          } else {
            // Generar nuevo token único
            const crypto = await import("crypto");
            token = crypto.randomBytes(32).toString("hex");
            
            // Calcular fecha de expiración (30 días)
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            
            // NOTA: Este código necesita actualizarse para incluir periodId
            // Temporalmente comentado hasta implementar sistema de periodos completo
            // await db.insert(surveyTokens).values({
            //   periodId: input.periodId, // NUEVO CAMPO REQUERIDO
            //   userId: employee.id,
            //   surveyId: input.surveyId,
            //   token,
            //   expiresAt,
            //   sentVia: "email",
            //   sentAt: new Date(),
            // });
          }
          
          // Generar enlace único
          const surveyLink = `${process.env.VITE_OAUTH_PORTAL_URL || "http://localhost:3000"}/surveys/respond/${token}`;
          
          // Preparar contenido del correo
          const subject = input.subject || `Encuesta NOM-035: ${surveyInfo.title}`;
          
          const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Encuesta NOM-035 STPS 2018</h2>
              
              <p>Estimado(a) <strong>${employee.name || "Colaborador(a)"}</strong>,</p>
              
              ${input.customMessage ? `<p>${input.customMessage}</p>` : ""}
              
              <p>Se le invita a completar la siguiente encuesta como parte del cumplimiento de la NOM-035-STPS-2018:</p>
              
              <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">${surveyInfo.title}</h3>
                <p style="color: #6b7280;">${surveyInfo.description || ""}</p>
              </div>
              
              <p><strong>Importante:</strong></p>
              <ul>
                <li>Sus respuestas son <strong>confidenciales y anónimas</strong></li>
                <li>El tiempo estimado es de <strong>15-20 minutos</strong></li>
                <li>Este enlace es personal e intransferible</li>
                <li>Tiene <strong>30 días</strong> para completar la encuesta</li>
              </ul>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${surveyLink}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  Responder Encuesta
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 12px;">
                Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:<br>
                <a href="${surveyLink}">${surveyLink}</a>
              </p>
              
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
              
              <p style="color: #6b7280; font-size: 12px;">
                Este correo fue enviado automáticamente. Por favor no responda a este mensaje.
              </p>
            </div>
          `;
          
          // Enviar correo
          if (employee.email) {
            const emailConfig = {
              from: process.env.SMTP_FROM || "noreply@nom035.com",
              to: employee.email,
              subject,
              html: emailBody,
            };
            await sendEmail(emailConfig);
            
            // Registrar notificación
            await db.insert(surveyNotifications).values({
              surveyId: input.surveyId,
              userId: employee.id,
              type: "invitation",
              subject,
              body: emailBody,
              sentAt: new Date(),
            });
            
            results.sent++;
          } else {
            results.failed++;
            results.errors.push(`${employee.name}: Sin correo electrónico registrado`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`${employee.name}: ${error instanceof Error ? error.message : "Error desconocido"}`);
        }
      }
      
      return results;
    }),

  /**
   * Obtener estadísticas de envío y respuestas
   */
  getSurveyStats: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Total de tokens enviados
      const sentTokens = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyTokens)
        .where(eq(surveyTokens.surveyId, input.surveyId));
      
      // Tokens usados (encuestas completadas)
      const usedTokens = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyTokens)
        .where(
          and(
            eq(surveyTokens.surveyId, input.surveyId),
            sql`${surveyTokens.usedAt} IS NOT NULL`
          )
        );
      
      // Tokens pendientes
      const pendingTokens = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyTokens)
        .where(
          and(
            eq(surveyTokens.surveyId, input.surveyId),
            isNull(surveyTokens.usedAt)
          )
        );
      
      const sent = sentTokens[0]?.count || 0;
      const completed = usedTokens[0]?.count || 0;
      const pending = pendingTokens[0]?.count || 0;
      
      return {
        sent,
        completed,
        pending,
        completionRate: sent > 0 ? Math.round((completed / sent) * 100) : 0,
      };
    }),

  /**
   * Enviar recordatorios a empleados que no han completado la encuesta
   */
  sendReminders: protectedProcedure
    .input(z.object({
      surveyId: z.number(),
      customMessage: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Obtener tokens pendientes
      const tokens = await db
        .select({
          token: surveyTokens.token,
          userId: surveyTokens.userId,
          userName: users.name,
          userEmail: users.email,
          surveyTitle: surveys.title,
          surveyDescription: surveys.description,
        })
        .from(surveyTokens)
        .innerJoin(users, eq(surveyTokens.userId, users.id))
        .innerJoin(surveys, eq(surveyTokens.surveyId, surveys.id))
        .where(
          and(
            eq(surveyTokens.surveyId, input.surveyId),
            isNull(surveyTokens.usedAt)
          )
        );
      
      const results = {
        sent: 0,
        failed: 0,
        errors: [] as string[],
      };
      
      for (const tokenData of tokens) {
        try {
          const surveyLink = `${process.env.VITE_OAUTH_PORTAL_URL || "http://localhost:3000"}/surveys/respond/${tokenData.token}`;
          
          const subject = `Recordatorio: Encuesta NOM-035 pendiente`;
          
          const emailBody = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #f59e0b;">Recordatorio: Encuesta Pendiente</h2>
              
              <p>Estimado(a) <strong>${tokenData.userName || "Colaborador(a)"}</strong>,</p>
              
              <p>Le recordamos que aún no ha completado la siguiente encuesta:</p>
              
              <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="margin-top: 0; color: #92400e;">${tokenData.surveyTitle}</h3>
                <p style="color: #78350f;">${tokenData.surveyDescription || ""}</p>
              </div>
              
              ${input.customMessage ? `<p>${input.customMessage}</p>` : ""}
              
              <p>Su participación es muy importante para mejorar nuestro ambiente laboral.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${surveyLink}" style="background-color: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  Completar Encuesta Ahora
                </a>
              </div>
              
              <p style="color: #6b7280; font-size: 12px;">
                Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:<br>
                <a href="${surveyLink}">${surveyLink}</a>
              </p>
            </div>
          `;
          
          if (tokenData.userEmail) {
            const emailConfig = {
              from: process.env.SMTP_FROM || "noreply@nom035.com",
              to: tokenData.userEmail,
              subject,
              html: emailBody,
            };
            await sendEmail(emailConfig);
            
            // Registrar notificación de recordatorio
            await db.insert(surveyNotifications).values({
              surveyId: input.surveyId,
              userId: tokenData.userId,
              type: "reminder",
              subject,
              body: emailBody,
              sentAt: new Date(),
            });
            
            results.sent++;
          } else {
            results.failed++;
            results.errors.push(`${tokenData.userName}: Sin correo electrónico`);
          }
        } catch (error) {
          results.failed++;
          results.errors.push(`${tokenData.userName}: ${error instanceof Error ? error.message : "Error"}`);
        }
      }
      
      return results;
    }),
});
