import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { surveyTokens, surveyPeriods, users, surveys, surveyResponses } from "../../drizzle/schema";
import { eq, and, sql, inArray } from "drizzle-orm";

export const surveyTokensAdvancedRouter = router({
  /**
   * Obtener información del token para aplicación de encuesta
   * Incluye información del empleado y determina qué encuesta debe completar
   */
  getTokenInfo: publicProcedure
    .input(z.object({
      token: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Buscar el token
      const [tokenData] = await db
        .select({
          id: surveyTokens.id,
          token: surveyTokens.token,
          userId: surveyTokens.userId,
          periodId: surveyTokens.periodId,
          usedAt: surveyTokens.usedAt,
          expiresAt: surveyTokens.expiresAt,
          periodName: surveyPeriods.name,
          surveyType: surveyPeriods.surveyType,
          periodStatus: surveyPeriods.status,
          userName: users.name,
          userEmail: users.email,
        })
        .from(surveyTokens)
        .leftJoin(surveyPeriods, eq(surveyTokens.periodId, surveyPeriods.id))
        .leftJoin(users, eq(surveyTokens.userId, users.id))
        .where(eq(surveyTokens.token, input.token))
        .limit(1);

      if (!tokenData) {
        throw new TRPCError({ 
          code: "NOT_FOUND", 
          message: "Token no encontrado o inválido" 
        });
      }

      // Verificar si el token ha expirado
      if (tokenData.expiresAt && new Date(tokenData.expiresAt) < new Date()) {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "El token ha expirado" 
        });
      }

      // Verificar si el periodo está activo
      if (tokenData.periodStatus !== "active") {
        throw new TRPCError({ 
          code: "BAD_REQUEST", 
          message: "El periodo de aplicación no está activo" 
        });
      }

      // Verificar si ya completó la encuesta
      const [existingResponse] = await db
        .select()
        .from(surveyResponses)
        .where(
          and(
            eq(surveyResponses.userId, tokenData.userId),
            eq(surveyResponses.periodId, tokenData.periodId)
          )
        )
        .limit(1);

      if (existingResponse && existingResponse.completedAt) {
        // Ya completó la encuesta principal, verificar si debe completar Guía II o III
        const shouldContinue = await shouldCompleteNextSurvey(db, String(tokenData.userId), tokenData.surveyType || '');
        
        if (shouldContinue.shouldComplete) {
          return {
            ...tokenData,
            alreadyCompleted: true,
            nextSurvey: shouldContinue.nextSurveyType,
            message: `Has completado la ${getSurveyName(tokenData.surveyType || '')}. Ahora debes completar la ${getSurveyName(shouldContinue.nextSurveyType || '')}.`,
          };
        }

        return {
          ...tokenData,
          alreadyCompleted: true,
          nextSurvey: null,
          message: "Ya has completado todas las encuestas requeridas.",
        };
      }

      return {
        ...tokenData,
        alreadyCompleted: false,
        nextSurvey: null,
      };
    }),

  /**
   * Exportar tokens de un periodo a Excel
   * Incluye códigos QR en formato base64
   */
  exportTokensToExcel: protectedProcedure
    .input(z.object({
      periodId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener todos los tokens del periodo
      const tokens = await db
        .select({
          id: surveyTokens.id,
          token: surveyTokens.token,
          userId: surveyTokens.userId,
          usedAt: surveyTokens.usedAt,
          createdAt: surveyTokens.createdAt,
          expiresAt: surveyTokens.expiresAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(surveyTokens)
        .leftJoin(users, eq(surveyTokens.userId, users.id))
        .where(eq(surveyTokens.periodId, input.periodId));

      // Generar URLs de QR para cada token
      const tokensWithQR = tokens.map(token => ({
        ...token,
        qrUrl: `${process.env.VITE_FRONTEND_FORGE_API_URL || "https://app.manus.space"}/survey/apply?token=${token.token}`,
      }));

      return tokensWithQR;
    }),

  /**
   * Obtener estadísticas de tokens de un periodo
   */
  getTokenStats: protectedProcedure
    .input(z.object({
      periodId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [stats] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          active: sql<number>`SUM(CASE WHEN ${surveyTokens.usedAt} IS NULL AND ${surveyTokens.expiresAt} > NOW() THEN 1 ELSE 0 END)`,
          used: sql<number>`SUM(CASE WHEN ${surveyTokens.usedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
          expired: sql<number>`SUM(CASE WHEN ${surveyTokens.usedAt} IS NULL AND ${surveyTokens.expiresAt} <= NOW() THEN 1 ELSE 0 END)`,
        })
        .from(surveyTokens)
        .where(eq(surveyTokens.periodId, input.periodId));

      return stats || { total: 0, active: 0, used: 0, expired: 0 };
    }),

  /**
   * Regenerar token para un usuario específico
   */
  regenerateToken: protectedProcedure
    .input(z.object({
      tokenId: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Generar nuevo token
      const newToken = crypto.randomBytes(32).toString("hex");

      // Actualizar el token
      await db
        .update(surveyTokens)
        .set({
          token: newToken,
          usedAt: null,
          createdAt: new Date(),
        })
        .where(eq(surveyTokens.id, input.tokenId));

      return { success: true, newToken };
    }),
});

/**
 * Determina si el usuario debe completar la siguiente encuesta (Guía II o III)
 * según el tamaño de la empresa
 */
async function shouldCompleteNextSurvey(
  db: any,
  userId: string,
  currentSurveyType: string
): Promise<{ shouldComplete: boolean; nextSurveyType: string | null }> {
  // Si completó Guía I, verificar si debe completar Guía II o III
  if (currentSurveyType === "guia_i") {
    // TODO: Implementar lógica para determinar tamaño de empresa
    // Por ahora, asumimos que empresas con más de 50 empleados deben completar Guía III
    // y empresas con 16-50 empleados deben completar Guía II
    
    // Esta lógica debe ser ajustada según los requisitos reales de la NOM-035
    // El tamaño de la empresa debe obtenerse de la configuración global
    const companySize = 100; // Placeholder - debe obtenerse de la configuración de la empresa

    if (companySize > 50) {
      return { shouldComplete: true, nextSurveyType: "guia_iii" };
    } else if (companySize >= 16) {
      return { shouldComplete: true, nextSurveyType: "guia_ii" };
    }
  }

  return { shouldComplete: false, nextSurveyType: null };
}

/**
 * Obtiene el nombre legible de la encuesta
 */
function getSurveyName(surveyType: string): string {
  switch (surveyType) {
    case "guia_i":
      return "Guía I - Identificación de factores de riesgo";
    case "guia_ii":
      return "Guía II - Identificación y análisis de factores de riesgo psicosocial";
    case "guia_iii":
      return "Guía III - Identificación y análisis de factores de riesgo psicosocial y evaluación del entorno organizacional";
    default:
      return "Encuesta";
  }
}

// Importar crypto al inicio del archivo
import crypto from "crypto";
