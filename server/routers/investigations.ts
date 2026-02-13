import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { requirePermission } from "../permissions";
import { getDb } from "../db";
import { investigationQuestionnaires, nom035Cases, employees } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import { randomBytes } from "crypto";
import { sendQuestionnaireEmail } from "../services/questionnaireEmailService";

export const investigationsRouter = router({
  // Crear y enviar cuestionario de investigación
  sendQuestionnaire: protectedProcedure
    .use(requirePermission('can_create'))
    .input(
      z.object({
        caseId: z.number(),
        questionnaireType: z.enum(["mobbing", "burnout"]),
        employeeId: z.number(),
        sendByEmail: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Generar token único para acceso en línea
      const accessToken = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Expira en 30 días

      // Crear cuestionario
      if (!db) throw new Error("Database connection failed");
      
      const [questionnaire] = await db.insert(investigationQuestionnaires).values({
        caseId: input.caseId,
        questionnaireType: input.questionnaireType,
        employeeId: input.employeeId,
        accessToken,
        expiresAt,
        createdBy: ctx.user!.id,
      });

      // Si se solicita envío por correo, enviar correo
      if (input.sendByEmail) {
        // Obtener datos del empleado y caso para el correo
        const [employeeData] = await db
          .select({
            firstName: employees.firstName,
            lastName: employees.lastName,
            email: employees.email,
          })
          .from(employees)
          .where(eq(employees.id, input.employeeId))
          .limit(1);

        const [caseData] = await db
          .select({
            folio: nom035Cases.folio,
          })
          .from(nom035Cases)
          .where(eq(nom035Cases.id, input.caseId))
          .limit(1);

        if (employeeData?.email && caseData?.folio) {
          await sendQuestionnaireEmail({
            employeeName: `${employeeData.firstName} ${employeeData.lastName}`,
            employeeEmail: employeeData.email,
            questionnaireType: input.questionnaireType,
            accessToken,
            expiresAt,
            caseFollio: caseData.folio,
          });
        }
      }

      return {
        success: true,
        questionnaireId: questionnaire.insertId,
        accessToken,
        expiresAt,
      };
    }),

  // Obtener cuestionario por token (para acceso en línea)
  getByToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const [questionnaire] = await db
        .select({
          id: investigationQuestionnaires.id,
          questionnaireType: investigationQuestionnaires.questionnaireType,
          status: investigationQuestionnaires.status,
          expiresAt: investigationQuestionnaires.expiresAt,
          responses: investigationQuestionnaires.responses,
          score: investigationQuestionnaires.score,
          riskLevel: investigationQuestionnaires.riskLevel,
          employeeName: employees.firstName,
          employeeLastName: employees.lastName,
        })
        .from(investigationQuestionnaires)
        .leftJoin(employees, eq(investigationQuestionnaires.employeeId, employees.id))
        .where(eq(investigationQuestionnaires.accessToken, input.token))
        .limit(1);

      if (!questionnaire) {
        throw new Error("Cuestionario no encontrado o token inválido");
      }

      // Verificar si el token ha expirado
      if (new Date() > new Date(questionnaire.expiresAt)) {
        throw new Error("El enlace ha expirado");
      }

      return questionnaire;
    }),

  // Guardar respuestas del cuestionario
  saveResponses: protectedProcedure
    .input(
      z.object({
        token: z.string(),
        responses: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Verificar que el cuestionario existe y no ha expirado
      if (!db) throw new Error("Database connection failed");
      
      const [questionnaire] = await db
        .select()
        .from(investigationQuestionnaires)
        .where(eq(investigationQuestionnaires.accessToken, input.token))
        .limit(1);

      if (!questionnaire) {
        throw new Error("Cuestionario no encontrado");
      }

      if (new Date() > new Date(questionnaire.expiresAt)) {
        throw new Error("El enlace ha expirado");
      }

      if (questionnaire.status === "completed") {
        throw new Error("Este cuestionario ya ha sido completado");
      }

      // Calcular puntaje y nivel de riesgo según tipo de cuestionario
      const { score, riskLevel } = calculateScoreAndRisk(
        input.responses,
        questionnaire.questionnaireType
      );

      // Actualizar cuestionario
      if (!db) throw new Error("Database connection failed");
      
      await db
        .update(investigationQuestionnaires)
        .set({
          responses: input.responses,
          score: score.toString(),
          riskLevel,
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(investigationQuestionnaires.id, questionnaire.id));

      return {
        success: true,
        score,
        riskLevel,
      };
    }),

  // Listar cuestionarios de un caso
  listByCaseId: protectedProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const questionnaires = await db
        .select({
          id: investigationQuestionnaires.id,
          questionnaireType: investigationQuestionnaires.questionnaireType,
          status: investigationQuestionnaires.status,
          score: investigationQuestionnaires.score,
          riskLevel: investigationQuestionnaires.riskLevel,
          sentAt: investigationQuestionnaires.sentAt,
          completedAt: investigationQuestionnaires.completedAt,
          expiresAt: investigationQuestionnaires.expiresAt,
          employeeName: employees.firstName,
          employeeLastName: employees.lastName,
          employeeEmail: employees.email,
        })
        .from(investigationQuestionnaires)
        .leftJoin(employees, eq(investigationQuestionnaires.employeeId, employees.id))
        .where(eq(investigationQuestionnaires.caseId, input.caseId))
        .orderBy(desc(investigationQuestionnaires.createdAt));

      return questionnaires;
    }),

  // [PÚBLICO] Validar token + CURP para acceso sin login
  validateTokenAndCurp: publicProcedure
    .input(
      z.object({
        token: z.string(),
        curp: z.string().length(18),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Buscar cuestionario por token
      const [questionnaire] = await db
        .select({
          id: investigationQuestionnaires.id,
          questionnaireType: investigationQuestionnaires.questionnaireType,
          status: investigationQuestionnaires.status,
          expiresAt: investigationQuestionnaires.expiresAt,
          responses: investigationQuestionnaires.responses,
          score: investigationQuestionnaires.score,
          riskLevel: investigationQuestionnaires.riskLevel,
          employeeId: investigationQuestionnaires.employeeId,
        })
        .from(investigationQuestionnaires)
        .where(eq(investigationQuestionnaires.accessToken, input.token))
        .limit(1);

      if (!questionnaire) {
        throw new Error("Cuestionario no encontrado o token inválido");
      }

      // Verificar si el token ha expirado
      if (new Date() > new Date(questionnaire.expiresAt)) {
        throw new Error("El enlace ha expirado");
      }

      // Validar CURP contra empleado asociado al cuestionario
      const [employee] = await db
        .select({
          id: employees.id,
          curp: employees.curp,
          firstName: employees.firstName,
          lastName: employees.lastName,
        })
        .from(employees)
        .where(eq(employees.id, questionnaire.employeeId))
        .limit(1);

      if (!employee || !employee.curp) {
        throw new Error("Empleado no encontrado o sin CURP registrado");
      }

      // Comparar CURP (sin importar mayúsculas/minúsculas)
      if (employee.curp.toUpperCase() !== input.curp.toUpperCase()) {
        throw new Error("CURP incorrecto. Verifica tu información.");
      }

      return {
        valid: true,
        questionnaireId: questionnaire.id,
        questionnaireType: questionnaire.questionnaireType,
        status: questionnaire.status,
        employeeName: `${employee.firstName} ${employee.lastName}`,
      };
    }),

  // [PÚBLICO] Guardar respuestas del cuestionario sin autenticación OAuth
  submitPublicResponses: publicProcedure
    .input(
      z.object({
        token: z.string(),
        curp: z.string().length(18),
        responses: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Verificar que el cuestionario existe y no ha expirado
      const [questionnaire] = await db
        .select()
        .from(investigationQuestionnaires)
        .where(eq(investigationQuestionnaires.accessToken, input.token))
        .limit(1);

      if (!questionnaire) {
        throw new Error("Cuestionario no encontrado");
      }

      if (new Date() > new Date(questionnaire.expiresAt)) {
        throw new Error("El enlace ha expirado");
      }

      if (questionnaire.status === "completed") {
        throw new Error("Este cuestionario ya ha sido completado");
      }

      // Validar CURP contra empleado asociado
      const [employee] = await db
        .select({ curp: employees.curp })
        .from(employees)
        .where(eq(employees.id, questionnaire.employeeId))
        .limit(1);

      if (!employee || !employee.curp) {
        throw new Error("Empleado no encontrado o sin CURP registrado");
      }

      if (employee.curp.toUpperCase() !== input.curp.toUpperCase()) {
        throw new Error("CURP incorrecto. No puedes enviar este cuestionario.");
      }

      // Calcular puntaje y nivel de riesgo según tipo de cuestionario
      const { score, riskLevel } = calculateScoreAndRisk(
        input.responses,
        questionnaire.questionnaireType
      );

      // Actualizar cuestionario
      await db
        .update(investigationQuestionnaires)
        .set({
          responses: input.responses,
          score: score.toString(),
          riskLevel,
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(investigationQuestionnaires.id, questionnaire.id));

      return {
        success: true,
        score,
        riskLevel,
      };
    }),

  // Obtener resultados detallados de un cuestionario
  getResults: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const [questionnaire] = await db
        .select({
          id: investigationQuestionnaires.id,
          questionnaireType: investigationQuestionnaires.questionnaireType,
          responses: investigationQuestionnaires.responses,
          score: investigationQuestionnaires.score,
          riskLevel: investigationQuestionnaires.riskLevel,
          completedAt: investigationQuestionnaires.completedAt,
          employeeName: employees.firstName,
          employeeLastName: employees.lastName,
          caseId: investigationQuestionnaires.caseId,
          caseFolio: nom035Cases.folio,
        })
        .from(investigationQuestionnaires)
        .leftJoin(employees, eq(investigationQuestionnaires.employeeId, employees.id))
        .leftJoin(nom035Cases, eq(investigationQuestionnaires.caseId, nom035Cases.id))
        .where(eq(investigationQuestionnaires.id, input.id))
        .limit(1);

      if (!questionnaire) {
        throw new Error("Cuestionario no encontrado");
      }

      return questionnaire;
    }),
});

// Función auxiliar para calcular puntaje y nivel de riesgo
function calculateScoreAndRisk(
  responses: Record<string, any>,
  questionnaireType: "mobbing" | "burnout"
): { score: number; riskLevel: "bajo" | "medio" | "alto" | "muy_alto" } {
  // Calcular puntaje total sumando todas las respuestas numéricas
  const scores = Object.values(responses).filter((v) => typeof v === "number");
  const totalScore = scores.reduce((sum: number, score) => sum + (score as number), 0);
  const averageScore = scores.length > 0 ? totalScore / scores.length : 0;

  // Determinar nivel de riesgo según tipo de cuestionario y literatura especializada
  let riskLevel: "bajo" | "medio" | "alto" | "muy_alto";

  if (questionnaireType === "mobbing") {
    // Escala de mobbing (basada en literatura especializada)
    // Puntaje promedio: 1-5 (escala Likert)
    if (averageScore < 2) {
      riskLevel = "bajo";
    } else if (averageScore < 3) {
      riskLevel = "medio";
    } else if (averageScore < 4) {
      riskLevel = "alto";
    } else {
      riskLevel = "muy_alto";
    }
  } else {
    // Escala de burnout (basada en Maslach Burnout Inventory)
    // Puntaje promedio: 1-7 (escala Likert)
    if (averageScore < 2.5) {
      riskLevel = "bajo";
    } else if (averageScore < 4) {
      riskLevel = "medio";
    } else if (averageScore < 5.5) {
      riskLevel = "alto";
    } else {
      riskLevel = "muy_alto";
    }
  }

  return {
    score: Math.round(averageScore * 100) / 100, // Redondear a 2 decimales
    riskLevel,
  };
}
