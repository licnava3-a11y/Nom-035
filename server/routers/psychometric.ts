import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { psychometricAssessments } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const NOM035_QUESTIONS = [
  { id: 1, domain: "work_conditions", text: "Mi trabajo me exige hacer mucho esfuerzo fisico" },
  { id: 2, domain: "work_conditions", text: "Me preocupa sufrir un accidente en mi trabajo" },
  { id: 3, domain: "work_conditions", text: "Considero que en mi trabajo se presentan riesgos que danan mi salud" },
  { id: 4, domain: "work_conditions", text: "En mi trabajo tengo que manejar sustancias o materiales peligrosos" },
  { id: 5, domain: "workload", text: "Por la cantidad de trabajo que tengo debo quedarme tiempo adicional a mi turno" },
  { id: 6, domain: "workload", text: "Por la cantidad de trabajo que tengo debo trabajar sin parar" },
  { id: 7, domain: "workload", text: "Tengo que atender varios asuntos al mismo tiempo" },
  { id: 8, domain: "workload", text: "En mi trabajo se presentan situaciones que me hacen sentir presionado" },
  { id: 9, domain: "workload", text: "Recibo criticas constantes a mi trabajo" },
  { id: 10, domain: "lack_control", text: "Mi trabajo requiere que me fije metas muy altas o muy exigentes" },
  { id: 11, domain: "lack_control", text: "Mis superiores me exigen que sea muy preciso en mi trabajo" },
  { id: 12, domain: "lack_control", text: "En mi trabajo me dan ordenes contradictorias" },
  { id: 13, domain: "lack_control", text: "Considero que el trabajo que realizo es dificil" },
  { id: 14, domain: "workday_hours", text: "Mi trabajo me exige laborar en dias de descanso, festivos o fines de semana" },
  { id: 15, domain: "workday_hours", text: "Considero que el tiempo en el trabajo es mucho y perjudica mis actividades familiares" },
  { id: 16, domain: "workday_hours", text: "Pienso en las actividades familiares cuando estoy en mi trabajo" },
  { id: 17, domain: "interference", text: "Pienso que mis responsabilidades familiares afectan mi trabajo" },
  { id: 18, domain: "interference", text: "Las actividades en el trabajo me impiden atender necesidades personales y familiares" },
  { id: 19, domain: "leadership", text: "Mi jefe tiene favoritismos entre nosotros" },
  { id: 20, domain: "leadership", text: "Mi jefe me comunica tarde los asuntos de trabajo" },
  { id: 21, domain: "leadership", text: "Mi jefe dificulta la realizacion del trabajo" },
  { id: 22, domain: "leadership", text: "Mi jefe habla mal de mi ante otras personas" },
  { id: 23, domain: "leadership", text: "Mi jefe me exige una cantidad de trabajo que considero excesiva" },
  { id: 24, domain: "relationships", text: "Mis companeros de trabajo dificultan la realizacion del trabajo" },
  { id: 25, domain: "relationships", text: "Mis companeros me excluyen o me ignoran" },
  { id: 26, domain: "relationships", text: "En mi trabajo existe mucha competencia que me perjudica" },
  { id: 27, domain: "relationships", text: "Mis companeros de trabajo se comportan de manera hostil conmigo" },
  { id: 28, domain: "violence", text: "Algun companero de trabajo me ha golpeado, pateado, empujado o jalado" },
  { id: 29, domain: "violence", text: "Algun companero de trabajo me ha amenazado con hacerme dano" },
  { id: 30, domain: "violence", text: "Algun companero de trabajo me ha dicho groserias, insultos o palabras ofensivas" },
  { id: 31, domain: "violence", text: "Algun jefe me ha golpeado, pateado, empujado o jalado" },
  { id: 32, domain: "violence", text: "Algun jefe me ha amenazado con hacerme dano" },
  { id: 33, domain: "violence", text: "Algun jefe me ha dicho groserias, insultos o palabras ofensivas" },
  { id: 34, domain: "violence", text: "Algun cliente o proveedor me ha golpeado, pateado, empujado o jalado" },
  { id: 35, domain: "violence", text: "Algun cliente o proveedor me ha amenazado con hacerme dano" },
];

export const ANSWER_OPTIONS = [
  { value: 0, label: "Siempre" },
  { value: 1, label: "Casi siempre" },
  { value: 2, label: "Algunas veces" },
  { value: 3, label: "Casi nunca" },
  { value: 4, label: "Nunca" },
];

function calcRiskLevel(total: number): string {
  if (total <= 20) return "nulo";
  if (total <= 45) return "bajo";
  if (total <= 70) return "medio";
  if (total <= 90) return "alto";
  return "muy_alto";
}

function calcDomainScore(answers: { questionId: number; answer: number }[], domain: string): number {
  return NOM035_QUESTIONS
    .filter(q => q.domain === domain)
    .reduce((sum, q) => {
      const ans = answers.find(a => a.questionId === q.id);
      return sum + (ans ? ans.answer : 0);
    }, 0);
}

export const psychometricRouter = router({
  getQuestions: protectedProcedure.query(() => {
    return { questions: NOM035_QUESTIONS, answerOptions: ANSWER_OPTIONS };
  }),

  getHistory: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      return db.select().from(psychometricAssessments)
        .where(eq(psychometricAssessments.employeeId, input.employeeId))
        .orderBy(desc(psychometricAssessments.createdAt)).limit(20);
    }),

  getLatest: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const [record] = await db.select().from(psychometricAssessments)
        .where(eq(psychometricAssessments.employeeId, input.employeeId))
        .orderBy(desc(psychometricAssessments.createdAt)).limit(1);
      return record || null;
    }),

  submit: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      answers: z.array(z.object({ questionId: z.number(), answer: z.number().min(0).max(4) })),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const { answers, employeeId, notes } = input;
      const sc = (d: string) => calcDomainScore(answers, d);
      const scoreWorkConditions = sc("work_conditions");
      const scoreWorkload = sc("workload");
      const scoreLackControl = sc("lack_control");
      const scoreWorkdayHours = sc("workday_hours");
      const scoreInterference = sc("interference");
      const scoreLeadership = sc("leadership");
      const scoreRelationships = sc("relationships");
      const scoreViolence = sc("violence");
      const scoreTotal = scoreWorkConditions + scoreWorkload + scoreLackControl +
        scoreWorkdayHours + scoreInterference + scoreLeadership + scoreRelationships + scoreViolence;
      const riskLevel = calcRiskLevel(scoreTotal);
      await db.insert(psychometricAssessments).values({
        employeeId, assessedBy: ctx.user.id, answers: answers as any,
        scoreWorkConditions, scoreWorkload, scoreLackControl, scoreWorkdayHours,
        scoreInterference, scoreLeadership, scoreRelationships, scoreViolence,
        scoreTotal, riskLevel, notes: notes || null,
      });
      return { success: true, scoreTotal, riskLevel };
    }),
});
