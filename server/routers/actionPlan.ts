import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { surveyResponses, users, surveys } from "../../drizzle/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { generateActionPlanExcel } from "../lib/excel-generator";
import { storagePut } from "../storage";

/**
 * Router para Plan de Acción Multinivel NOM-035
 *
 * Análisis de resultados de encuestas por diferentes segmentos:
 * - Organizacional (toda la empresa)
 * - Departamental/grupal
 * - Por puesto
 * - Por rango de edad
 * - Por género
 * - Por estado civil
 * - Por jornada laboral
 * - Por tipo de contrato
 * - Por antigüedad en el puesto
 */

interface SegmentAnalysis {
  segment: string;
  totalResponses: number;
  avgScore: number;
  riskDistribution: {
    nulo: number;
    bajo: number;
    medio: number;
    alto: number;
    muy_alto: number;
  };
  topRisks: Array<{
    category: string;
    avgScore: number;
    riskLevel: string;
  }>;
}

// Helper para calcular distribución de riesgo
function calculateRiskDistribution(
  responses: any[]
): SegmentAnalysis["riskDistribution"] {
  const distribution = {
    nulo: 0,
    bajo: 0,
    medio: 0,
    alto: 0,
    muy_alto: 0,
  };

  responses.forEach(r => {
    if (r.results) {
      const results =
        typeof r.results === "string" ? JSON.parse(r.results) : r.results;
      const level = results.riskLevel?.toLowerCase().replace(" ", "_");
      if (level && level in distribution) {
        distribution[level as keyof typeof distribution]++;
      }
    }
  });

  return distribution;
}

// Helper para calcular score promedio
function calculateAvgScore(responses: any[]): number {
  let totalScore = 0;
  let count = 0;

  responses.forEach(r => {
    if (r.results) {
      const results =
        typeof r.results === "string" ? JSON.parse(r.results) : r.results;
      if (results.totalScore !== undefined) {
        totalScore += results.totalScore;
        count++;
      }
    }
  });

  return count > 0 ? totalScore / count : 0;
}

export const actionPlanRouter = router({
  // Análisis organizacional (toda la empresa)
  getOrganizationalAnalysis: protectedProcedure
    .input(
      z.object({
        surveyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Obtener todas las respuestas completadas de la encuesta
      const responses = await db
        .select()
        .from(surveyResponses)
        .where(
          and(
            eq(surveyResponses.surveyId, input.surveyId),
            sql`${surveyResponses.completedAt} IS NOT NULL`
          )
        );

      if (responses.length === 0) {
        return {
          segment: "Organizacional",
          totalResponses: 0,
          avgScore: 0,
          riskDistribution: {
            nulo: 0,
            bajo: 0,
            medio: 0,
            alto: 0,
            muy_alto: 0,
          },
          topRisks: [],
        };
      }

      const avgScore = calculateAvgScore(responses);
      const riskDistribution = calculateRiskDistribution(responses);

      // Calcular top riesgos por categoría
      const categoryScores: Record<string, { total: number; count: number }> =
        {};

      responses.forEach(r => {
        if (r.results) {
          const results =
            typeof r.results === "string" ? JSON.parse(r.results) : r.results;
          if (results.categoryScores) {
            results.categoryScores.forEach((cat: any) => {
              if (!categoryScores[cat.category]) {
                categoryScores[cat.category] = { total: 0, count: 0 };
              }
              categoryScores[cat.category].total += cat.score;
              categoryScores[cat.category].count++;
            });
          }
        }
      });

      const topRisks = Object.entries(categoryScores)
        .map(([category, data]: [string, any]) => ({
          category,
          avgScore: data.total / data.count,
          riskLevel: "medio", // Simplificado, se puede calcular según rangos
        }))
        .sort((a: any, b: any) => b.avgScore - a.avgScore)
        .slice(0, 5);

      return {
        segment: "Organizacional",
        totalResponses: responses.length,
        avgScore,
        riskDistribution,
        topRisks,
      };
    }),

  // Análisis departamental
  getDepartmentalAnalysis: protectedProcedure
    .input(
      z.object({
        surveyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Obtener respuestas con información de departamento
      const responses = await db
        .select({
          responseId: surveyResponses.id,
          results: surveyResponses.results,
          departamento: users.departamento,
        })
        .from(surveyResponses)
        .leftJoin(users, eq(surveyResponses.userId, users.id))
        .where(
          and(
            eq(surveyResponses.surveyId, input.surveyId),
            sql`${surveyResponses.completedAt} IS NOT NULL`
          )
        );

      // Agrupar por departamento
      const departmentGroups: Record<string, any[]> = {};

      responses.forEach(r => {
        const dept = r.departamento || "Sin departamento";
        if (!departmentGroups[dept]) {
          departmentGroups[dept] = [];
        }
        departmentGroups[dept].push(r);
      });

      // Calcular análisis por departamento
      const analysis = Object.entries(departmentGroups).map(
        ([dept, deptResponses]: [string, any]) => ({
          segment: dept,
          totalResponses: deptResponses.length,
          avgScore: calculateAvgScore(deptResponses),
          riskDistribution: calculateRiskDistribution(deptResponses),
          topRisks: [],
        })
      );

      return analysis;
    }),

  // Análisis por puesto
  getPositionAnalysis: protectedProcedure
    .input(
      z.object({
        surveyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const responses = await db
        .select({
          responseId: surveyResponses.id,
          results: surveyResponses.results,
          puesto: users.puesto,
        })
        .from(surveyResponses)
        .leftJoin(users, eq(surveyResponses.userId, users.id))
        .where(
          and(
            eq(surveyResponses.surveyId, input.surveyId),
            sql`${surveyResponses.completedAt} IS NOT NULL`
          )
        );

      const positionGroups: Record<string, any[]> = {};

      responses.forEach(r => {
        const position = r.puesto || "Sin puesto";
        if (!positionGroups[position]) {
          positionGroups[position] = [];
        }
        positionGroups[position].push(r);
      });

      const analysis = Object.entries(positionGroups).map(
        ([position, posResponses]: [string, any]) => ({
          segment: position,
          totalResponses: posResponses.length,
          avgScore: calculateAvgScore(posResponses),
          riskDistribution: calculateRiskDistribution(posResponses),
          topRisks: [],
        })
      );

      return analysis;
    }),

  // Análisis por rango de edad
  getAgeRangeAnalysis: protectedProcedure
    .input(
      z.object({
        surveyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const responses = await db
        .select({
          responseId: surveyResponses.id,
          results: surveyResponses.results,
          fechaNacimiento: users.fechaNacimiento,
        })
        .from(surveyResponses)
        .leftJoin(users, eq(surveyResponses.userId, users.id))
        .where(
          and(
            eq(surveyResponses.surveyId, input.surveyId),
            sql`${surveyResponses.completedAt} IS NOT NULL`
          )
        );

      // Calcular edad y agrupar por rangos
      const ageGroups: Record<string, any[]> = {
        "18-25": [],
        "26-35": [],
        "36-45": [],
        "46-55": [],
        "56+": [],
        "Sin edad": [],
      };

      responses.forEach(r => {
        if (!r.fechaNacimiento) {
          ageGroups["Sin edad"].push(r);
          return;
        }

        const birthDate = new Date(r.fechaNacimiento);
        const age = Math.floor(
          (Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
        );

        if (age >= 18 && age <= 25) ageGroups["18-25"].push(r);
        else if (age >= 26 && age <= 35) ageGroups["26-35"].push(r);
        else if (age >= 36 && age <= 45) ageGroups["36-45"].push(r);
        else if (age >= 46 && age <= 55) ageGroups["46-55"].push(r);
        else if (age >= 56) ageGroups["56+"].push(r);
        else ageGroups["Sin edad"].push(r);
      });

      const analysis = Object.entries(ageGroups)
        .filter(([_, ageResponses]) => ageResponses.length > 0)
        .map(([ageRange, ageResponses]: [string, any]) => ({
          segment: ageRange,
          totalResponses: ageResponses.length,
          avgScore: calculateAvgScore(ageResponses),
          riskDistribution: calculateRiskDistribution(ageResponses),
          topRisks: [],
        }));

      return analysis;
    }),

  // Análisis por género
  getGenderAnalysis: protectedProcedure
    .input(
      z.object({
        surveyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const responses = await db
        .select({
          responseId: surveyResponses.id,
          results: surveyResponses.results,
          sexo: users.sexo,
        })
        .from(surveyResponses)
        .leftJoin(users, eq(surveyResponses.userId, users.id))
        .where(
          and(
            eq(surveyResponses.surveyId, input.surveyId),
            sql`${surveyResponses.completedAt} IS NOT NULL`
          )
        );

      const genderGroups: Record<string, any[]> = {};

      responses.forEach(r => {
        const gender = r.sexo || "No especificado";
        if (!genderGroups[gender]) {
          genderGroups[gender] = [];
        }
        genderGroups[gender].push(r);
      });

      const analysis = Object.entries(genderGroups).map(
        ([gender, genderResponses]: [string, any]) => ({
          segment: gender,
          totalResponses: genderResponses.length,
          avgScore: calculateAvgScore(genderResponses),
          riskDistribution: calculateRiskDistribution(genderResponses),
          topRisks: [],
        })
      );

      return analysis;
    }),

  // Análisis por estado civil
  getMaritalStatusAnalysis: protectedProcedure
    .input(
      z.object({
        surveyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const responses = await db
        .select({
          responseId: surveyResponses.id,
          results: surveyResponses.results,
          estadoCivil: users.estadoCivil,
        })
        .from(surveyResponses)
        .leftJoin(users, eq(surveyResponses.userId, users.id))
        .where(
          and(
            eq(surveyResponses.surveyId, input.surveyId),
            sql`${surveyResponses.completedAt} IS NOT NULL`
          )
        );

      const maritalGroups: Record<string, any[]> = {};

      responses.forEach(r => {
        const marital = r.estadoCivil || "No especificado";
        if (!maritalGroups[marital]) {
          maritalGroups[marital] = [];
        }
        maritalGroups[marital].push(r);
      });

      const analysis = Object.entries(maritalGroups).map(
        ([marital, maritalResponses]: [string, any]) => ({
          segment: marital,
          totalResponses: maritalResponses.length,
          avgScore: calculateAvgScore(maritalResponses),
          riskDistribution: calculateRiskDistribution(maritalResponses),
          topRisks: [],
        })
      );

      return analysis;
    }),

  // Análisis por jornada laboral
  getWorkScheduleAnalysis: protectedProcedure
    .input(
      z.object({
        surveyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const responses = await db
        .select({
          responseId: surveyResponses.id,
          results: surveyResponses.results,
          jornadaLaboral: users.jornadaLaboral,
        })
        .from(surveyResponses)
        .leftJoin(users, eq(surveyResponses.userId, users.id))
        .where(
          and(
            eq(surveyResponses.surveyId, input.surveyId),
            sql`${surveyResponses.completedAt} IS NOT NULL`
          )
        );

      const scheduleGroups: Record<string, any[]> = {};

      responses.forEach(r => {
        const schedule = r.jornadaLaboral || "No especificado";
        if (!scheduleGroups[schedule]) {
          scheduleGroups[schedule] = [];
        }
        scheduleGroups[schedule].push(r);
      });

      const analysis = Object.entries(scheduleGroups).map(
        ([schedule, scheduleResponses]: [string, any]) => ({
          segment: schedule,
          totalResponses: scheduleResponses.length,
          avgScore: calculateAvgScore(scheduleResponses),
          riskDistribution: calculateRiskDistribution(scheduleResponses),
          topRisks: [],
        })
      );

      return analysis;
    }),

  // Análisis por tipo de contrato
  getContractTypeAnalysis: protectedProcedure
    .input(
      z.object({
        surveyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const responses = await db
        .select({
          responseId: surveyResponses.id,
          results: surveyResponses.results,
          tipoContrato: users.tipoContrato,
        })
        .from(surveyResponses)
        .leftJoin(users, eq(surveyResponses.userId, users.id))
        .where(
          and(
            eq(surveyResponses.surveyId, input.surveyId),
            sql`${surveyResponses.completedAt} IS NOT NULL`
          )
        );

      const contractGroups: Record<string, any[]> = {};

      responses.forEach(r => {
        const contract = r.tipoContrato || "No especificado";
        if (!contractGroups[contract]) {
          contractGroups[contract] = [];
        }
        contractGroups[contract].push(r);
      });

      const analysis = Object.entries(contractGroups).map(
        ([contract, contractResponses]: [string, any]) => ({
          segment: contract,
          totalResponses: contractResponses.length,
          avgScore: calculateAvgScore(contractResponses),
          riskDistribution: calculateRiskDistribution(contractResponses),
          topRisks: [],
        })
      );

      return analysis;
    }),

  // Análisis por antigüedad en el puesto
  getTenureAnalysis: protectedProcedure
    .input(
      z.object({
        surveyId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const responses = await db
        .select({
          responseId: surveyResponses.id,
          results: surveyResponses.results,
          fechaIngreso: users.fechaIngreso,
        })
        .from(surveyResponses)
        .leftJoin(users, eq(surveyResponses.userId, users.id))
        .where(
          and(
            eq(surveyResponses.surveyId, input.surveyId),
            sql`${surveyResponses.completedAt} IS NOT NULL`
          )
        );

      // Agrupar por antigüedad
      const tenureGroups: Record<string, any[]> = {
        "0-1 años": [],
        "1-3 años": [],
        "3-5 años": [],
        "5-10 años": [],
        "10+ años": [],
        "Sin fecha": [],
      };

      responses.forEach(r => {
        if (!r.fechaIngreso) {
          tenureGroups["Sin fecha"].push(r);
          return;
        }

        const hireDate = new Date(r.fechaIngreso);
        const yearsOfService =
          (Date.now() - hireDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

        if (yearsOfService < 1) tenureGroups["0-1 años"].push(r);
        else if (yearsOfService < 3) tenureGroups["1-3 años"].push(r);
        else if (yearsOfService < 5) tenureGroups["3-5 años"].push(r);
        else if (yearsOfService < 10) tenureGroups["5-10 años"].push(r);
        else tenureGroups["10+ años"].push(r);
      });

      const analysis = Object.entries(tenureGroups)
        .filter(([_, tenureResponses]) => tenureResponses.length > 0)
        .map(([tenure, tenureResponses]: [string, any]) => ({
          segment: tenure,
          totalResponses: tenureResponses.length,
          avgScore: calculateAvgScore(tenureResponses),
          riskDistribution: calculateRiskDistribution(tenureResponses),
          topRisks: [],
        }));

      return analysis;
    }),

  // Exportar análisis a Excel
  exportToExcel: protectedProcedure
    .input(
      z.object({
        surveyId: z.number(),
        analysisType: z.enum([
          "organizational",
          "departmental",
          "position",
          "age",
          "gender",
          "marital",
          "schedule",
          "contract",
          "tenure",
        ]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Obtener datos según tipo de análisis
      let data: any[] = [];
      let title = "";
      let subtitle = "";

      switch (input.analysisType) {
        case "organizational":
          // Llamar al procedimiento correspondiente
          const orgRouter = actionPlanRouter.createCaller(ctx);
          const orgData = await orgRouter.getOrganizationalAnalysis({
            surveyId: input.surveyId,
          });
          data = [orgData];
          title = "Análisis Organizacional NOM-035";
          subtitle = "Evaluación del entorno organizacional - Nivel empresa";
          break;
        case "departmental":
          const deptRouter = actionPlanRouter.createCaller(ctx);
          data = await deptRouter.getDepartmentalAnalysis({
            surveyId: input.surveyId,
          });
          title = "Análisis Departamental NOM-035";
          subtitle = "Evaluación del entorno organizacional por departamento";
          break;
        case "position":
          const posRouter = actionPlanRouter.createCaller(ctx);
          data = await posRouter.getPositionAnalysis({
            surveyId: input.surveyId,
          });
          title = "Análisis por Puesto NOM-035";
          subtitle =
            "Evaluación del entorno organizacional por puesto de trabajo";
          break;
        case "age":
          const ageRouter = actionPlanRouter.createCaller(ctx);
          data = await ageRouter.getAgeRangeAnalysis({
            surveyId: input.surveyId,
          });
          title = "Análisis por Rango de Edad NOM-035";
          subtitle = "Evaluación del entorno organizacional por grupo etáreo";
          break;
        case "gender":
          const genderRouter = actionPlanRouter.createCaller(ctx);
          data = await genderRouter.getGenderAnalysis({
            surveyId: input.surveyId,
          });
          title = "Análisis por Género NOM-035";
          subtitle = "Evaluación del entorno organizacional por género";
          break;
        case "marital":
          const maritalRouter = actionPlanRouter.createCaller(ctx);
          data = await maritalRouter.getMaritalStatusAnalysis({
            surveyId: input.surveyId,
          });
          title = "Análisis por Estado Civil NOM-035";
          subtitle = "Evaluación del entorno organizacional por estado civil";
          break;
        case "schedule":
          const scheduleRouter = actionPlanRouter.createCaller(ctx);
          data = await scheduleRouter.getWorkScheduleAnalysis({
            surveyId: input.surveyId,
          });
          title = "Análisis por Jornada Laboral NOM-035";
          subtitle =
            "Evaluación del entorno organizacional por tipo de jornada";
          break;
        case "contract":
          const contractRouter = actionPlanRouter.createCaller(ctx);
          data = await contractRouter.getContractTypeAnalysis({
            surveyId: input.surveyId,
          });
          title = "Análisis por Tipo de Contrato NOM-035";
          subtitle =
            "Evaluación del entorno organizacional por tipo de contrato";
          break;
        case "tenure":
          const tenureRouter = actionPlanRouter.createCaller(ctx);
          data = await tenureRouter.getTenureAnalysis({
            surveyId: input.surveyId,
          });
          title = "Análisis por Antigüedad NOM-035";
          subtitle =
            "Evaluación del entorno organizacional por antigüedad en el puesto";
          break;
      }

      // Generar Excel
      const excelBuffer = await generateActionPlanExcel({
        title,
        subtitle,
        data,
        surveyId: input.surveyId,
      });

      // Subir a S3
      const timestamp = Date.now();
      const fileName = `action-plan-${input.analysisType}-${timestamp}.xlsx`;
      const { url } = await storagePut(
        `reports/${fileName}`,
        excelBuffer,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      return {
        success: true,
        url,
        fileName,
      };
    }),
});
