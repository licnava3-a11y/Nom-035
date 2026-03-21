import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { surveyEmployeeTokens, employees, surveyPeriods, surveyQuestions, surveyResponses, surveyAnswers, users } from "../../drizzle/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { sendBulkEmails, getSurveyInvitationTemplate } from "../services/emailService";

export const publicSurveysRouter = router({
  /**
   * Generar tokens para empleados de un período de encuesta
   * Solo administradores pueden generar tokens
   */
  generateTokens: protectedProcedure
    .input(
      z.object({
        surveyPeriodId: z.number(),
        surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]),
        employeeIds: z.array(z.number()).optional(), // Si no se especifica, genera para todos los empleados activos
        expirationDays: z.number().default(30), // Días de validez del token
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "responsable_nom035") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No autorizado para generar tokens",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      try {
        // Verificar que el período de encuesta existe
        const [period] = await db.select().from(surveyPeriods).where(eq(surveyPeriods.id, input.surveyPeriodId)).limit(1);
        
        if (!period) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Período de encuesta no encontrado",
          });
        }

        // Obtener empleados
        let targetEmployees;
        if (input.employeeIds && input.employeeIds.length > 0) {
          // Empleados específicos
          targetEmployees = await db.select().from(employees).where(
            and(
              eq(employees.id, input.employeeIds[0]) // Drizzle needs single value, we'll iterate
            )
          );
          // TODO: Mejorar query para múltiples IDs
        } else {
          // Todos los empleados activos
          targetEmployees = await db.select().from(employees);
        }

        if (targetEmployees.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No se encontraron empleados para generar tokens",
          });
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + input.expirationDays);

        const tokensGenerated = [];

        for (const employee of targetEmployees) {
          // Verificar si el empleado tiene CURP
          if (!employee.curp) {
            console.warn(`[PublicSurveys] Empleado ${employee.id} no tiene CURP, saltando...`);
            continue;
          }

          // Verificar si ya existe un token activo para este empleado y período
          const existingTokens = await db.select().from(surveyEmployeeTokens).where(
            and(
              eq(surveyEmployeeTokens.employeeId, employee.id),
              eq(surveyEmployeeTokens.surveyPeriodId, input.surveyPeriodId),
              eq(surveyEmployeeTokens.surveyType, input.surveyType),
              isNull(surveyEmployeeTokens.usedAt),
              eq(surveyEmployeeTokens.isRevoked, false)
            )
          );

          if (existingTokens.length > 0) {
            console.log(`[PublicSurveys] Empleado ${employee.id} ya tiene token activo, saltando...`);
            tokensGenerated.push({
              employeeId: employee.id,
              token: existingTokens[0].token,
              existing: true,
            });
            continue;
          }

          // Generar nuevo token
          const token = randomUUID();

          await db.insert(surveyEmployeeTokens).values({
            token,
            employeeId: employee.id,
            curp: employee.curp,
            surveyPeriodId: input.surveyPeriodId,
            surveyType: input.surveyType,
            expiresAt,
            generatedBy: ctx.user.id,
          });

          tokensGenerated.push({
            employeeId: employee.id,
            token,
            existing: false,
          });
        }

        return {
          success: true,
          tokensGenerated: tokensGenerated.length,
          tokens: tokensGenerated,
        };
      } catch (error) {
        console.error("[PublicSurveys] Error generating tokens:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al generar tokens",
        });
      }
    }),

  /**
   * Validar token y autenticar con CURP (endpoint público)
   */
  validateToken: publicProcedure
    .input(
      z.object({
        token: z.string().uuid("Token inválido"),
        curp: z.string().length(18, "CURP debe tener 18 caracteres"),
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

      try {
        // Buscar token
        const [tokenData] = await db.select().from(surveyEmployeeTokens).where(
          eq(surveyEmployeeTokens.token, input.token)
        ).limit(1);

        if (!tokenData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Token no encontrado",
          });
        }

        // Verificar CURP
        if (tokenData.curp !== input.curp.toUpperCase()) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "CURP incorrecto",
          });
        }

        // Verificar expiración
        if (new Date() > new Date(tokenData.expiresAt)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "El token ha expirado",
          });
        }

        // Verificar si ya fue usado
        if (tokenData.usedAt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este token ya fue utilizado",
          });
        }

        // Verificar si está revocado
        if (tokenData.isRevoked) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este token ha sido revocado",
          });
        }

        // Obtener información del empleado
        const [employee] = await db.select().from(employees).where(
          eq(employees.id, tokenData.employeeId)
        ).limit(1);

        if (!employee) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Empleado no encontrado",
          });
        }

        // Obtener información del período
        const [period] = await db.select().from(surveyPeriods).where(
          eq(surveyPeriods.id, tokenData.surveyPeriodId)
        ).limit(1);

        return {
          success: true,
          tokenData: {
            id: tokenData.id,
            surveyType: tokenData.surveyType,
            surveyPeriodId: tokenData.surveyPeriodId,
            employeeId: tokenData.employeeId,
            expiresAt: tokenData.expiresAt,
          },
          employee: {
            id: employee.id,
            name: sql<string>`CONCAT(${employee.firstName}, ' ', ${employee.lastName})`,
            department: employee.departmentId,
          },
          period: period ? {
            id: period.id,
            name: period.name,
            startDate: period.startDate,
            endDate: period.endDate,
          } : null,
        };
      } catch (error) {
        console.error("[PublicSurveys] Error validating token:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al validar token",
        });
      }
    }),

  /**
   * Obtener preguntas de la encuesta (endpoint público)
   */
  getSurveyQuestions: publicProcedure
    .input(
      z.object({
        token: z.string().uuid(),
        surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]),
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

      try {
        // Verificar que el token existe y es válido
        const [tokenData] = await db.select().from(surveyEmployeeTokens).where(
          eq(surveyEmployeeTokens.token, input.token)
        ).limit(1);

        if (!tokenData || tokenData.surveyType !== input.surveyType) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Token inválido o tipo de encuesta incorrecto",
          });
        }

        // Obtener preguntas de la encuesta (surveyQuestions no tiene surveyType, usar category)
        const questions = await db.select().from(surveyQuestions).where(
          eq(surveyQuestions.category, input.surveyType as string)
        );

        return {
          success: true,
          questions,
        };
      } catch (error) {
        console.error("[PublicSurveys] Error getting survey questions:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener preguntas",
        });
      }
    }),

  /**
   * Enviar respuestas de encuesta (endpoint público)
   */
  submitSurveyResponses: publicProcedure
    .input(
      z.object({
        token: z.string().uuid(),
        responses: z.array(
          z.object({
            questionId: z.number(),
            answer: z.string(),
          })
        ),
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

      try {
        // Verificar token
        const [tokenData] = await db.select().from(surveyEmployeeTokens).where(
          eq(surveyEmployeeTokens.token, input.token)
        ).limit(1);

        if (!tokenData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Token no encontrado",
          });
        }

        if (tokenData.usedAt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este token ya fue utilizado",
          });
        }

        if (new Date() > new Date(tokenData.expiresAt)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "El token ha expirado",
          });
        }

        // Crear respuesta de encuesta (campos correctos del schema: surveyId, periodId, userId, token)
        const [surveyResponse] = await db.insert(surveyResponses).values({
          surveyId: tokenData.surveyPeriodId, // surveyPeriodId apunta al survey
          periodId: tokenData.surveyPeriodId,
          userId: tokenData.employeeId,
          token: tokenData.token,
          completedAt: new Date(),
        });

        // Guardar respuestas individuales
        for (const response of input.responses) {
          await db.insert(surveyAnswers).values({
            responseId: surveyResponse.insertId,
            questionId: response.questionId,
            answerValue: response.answer,
          });
        }

        // Marcar token como usado
        await db.update(surveyEmployeeTokens)
          .set({ usedAt: new Date() })
          .where(eq(surveyEmployeeTokens.id, tokenData.id));

        return {
          success: true,
          message: "Encuesta enviada exitosamente",
          responseId: surveyResponse.insertId,
        };
      } catch (error) {
        console.error("[PublicSurveys] Error submitting survey:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al enviar encuesta",
        });
      }
    }),

  /**
   * Listar tokens generados (admin only)
   */
  listTokens: protectedProcedure
    .input(
      z.object({
        surveyPeriodId: z.number().optional(),
        surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]).optional(),
        showUsed: z.boolean().default(false),
      })
    )
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "responsable_nom035") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No autorizado",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      try {
        let conditions = [];
        
        if (input.surveyPeriodId) {
          conditions.push(eq(surveyEmployeeTokens.surveyPeriodId, input.surveyPeriodId));
        }
        
        if (input.surveyType) {
          conditions.push(eq(surveyEmployeeTokens.surveyType, input.surveyType));
        }
        
        if (!input.showUsed) {
          conditions.push(isNull(surveyEmployeeTokens.usedAt));
        }

        const tokens = await db.select().from(surveyEmployeeTokens).where(
          conditions.length > 0 ? and(...conditions) : undefined
        );

        return {
          success: true,
          tokens,
        };
      } catch (error) {
        console.error("[PublicSurveys] Error listing tokens:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al listar tokens",
        });
      }
    }),

  /**
   * Enviar invitaciones por email a empleados con tokens generados
   */
  sendSurveyInvitations: protectedProcedure
    .input(
      z.object({
        surveyPeriodId: z.number(),
        surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin" && ctx.user.role !== "responsable_nom035") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "No autorizado para enviar invitaciones",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      try {
        // Obtener tokens activos (no usados, no revocados, no expirados)
        const tokens = await db.select().from(surveyEmployeeTokens).where(
          and(
            eq(surveyEmployeeTokens.surveyPeriodId, input.surveyPeriodId),
            eq(surveyEmployeeTokens.surveyType, input.surveyType),
            isNull(surveyEmployeeTokens.usedAt),
            eq(surveyEmployeeTokens.isRevoked, false)
          )
        );

        if (tokens.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No hay tokens activos para enviar invitaciones. Genera tokens primero.",
          });
        }

        // Preparar emails
        const emailsToSend = [];

        for (const token of tokens) {
          // Obtener información del empleado
          const [employee] = await db.select().from(employees).where(
            eq(employees.id, token.employeeId)
          ).limit(1);

          if (!employee || !employee.email) {
            console.warn(`[PublicSurveys] Empleado ${token.employeeId} no tiene email, saltando...`);
            continue;
          }

          // Generar URL del survey
          const surveyUrl = `${process.env.VITE_FRONTEND_URL || 'http://localhost:3000'}/survey/public/${token.token}`;

          // Generar HTML del email
          const emailHtml = getSurveyInvitationTemplate({
            employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || "Empleado",
            surveyType: input.surveyType,
            surveyToken: token.token,
            expiresAt: new Date(token.expiresAt),
          });

          emailsToSend.push({
            to: employee.email,
            subject: `Invitación a Encuesta NOM-035 - ${input.surveyType.toUpperCase()}`,
            html: emailHtml,
            template: "survey_invitation" as const,
          });
        }

        if (emailsToSend.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No hay empleados con email válido para enviar invitaciones",
          });
        }

        // Enviar emails en lote
        const result = await sendBulkEmails(emailsToSend);

        return {
          success: true,
          totalTokens: tokens.length,
          emailsSent: result.sent,
          emailsFailed: result.failed,
          errors: result.errors,
        };
      } catch (error) {
        console.error("[PublicSurveys] Error sending invitations:", error);
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al enviar invitaciones",
        });
      }
    }),
});
