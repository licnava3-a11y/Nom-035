import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { 
  assessments, 
  examQuestions, 
  examQuestionOptions, 
  examAttempts, 
  examAnswers,
  employees,
  users,
  courses
} from '../../drizzle/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export const assessmentsRouter = router({
  // Crear nueva evaluación
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        courseId: z.number().optional(),
        passingScore: z.number().min(0).max(100).default(70),
        timeLimit: z.number().optional(),
        maxAttempts: z.number().default(3),
        shuffleQuestions: z.boolean().default(false),
        shuffleOptions: z.boolean().default(false),
        showResults: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const [result] = await (db.insert(assessments) as any).values({
        ...input,
        createdBy: ctx.user.id,
        status: 'draft',
      });

      return {
        success: true,
        assessmentId: result.insertId,
      };
    }),

  // Listar evaluaciones
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(['draft', 'active', 'archived']).optional(),
        courseId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      let query = db
        .select({
          id: assessments.id,
          title: assessments.title,
          description: assessments.description,
          courseId: assessments.courseId,
          courseName: courses.title,
          passingScore: assessments.passingScore,
          timeLimit: assessments.timeLimit,
          maxAttempts: assessments.maxAttempts,
          status: assessments.status,
          createdAt: assessments.createdAt,
          createdBy: assessments.createdBy,
          creatorName: users.name,
        })
        .from(assessments)
        .leftJoin(courses, eq(assessments.courseId, courses.id))
        .leftJoin(users, eq(assessments.createdBy, users.id))
        .orderBy(desc(assessments.createdAt));

      if (input.status) {
        query = query.where(eq(assessments.status, input.status)) as any;
      }

      if (input.courseId) {
        query = query.where(eq(assessments.courseId, input.courseId)) as any;
      }

      const results = await query;

      return results;
    }),

  // Obtener detalle de evaluación
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const assessment = await db
        .select()
        .from(assessments)
        .where(eq(assessments.id, input.id))
        .limit(1);

      if (!assessment || assessment.length === 0) {
        throw new Error('Evaluación no encontrada');
      }

      // Obtener preguntas con opciones
      const questions = await db
        .select()
        .from(examQuestions)
        .where(eq(examQuestions.assessmentId, input.id))
        .orderBy(examQuestions.orderIndex);

      const questionsWithOptions = await Promise.all(
        questions.map(async (question) => {
          const options = await db
            .select()
            .from(examQuestionOptions)
            .where(eq(examQuestionOptions.questionId, question.id))
            .orderBy(examQuestionOptions.orderIndex);

          return {
            ...question,
            options,
          };
        })
      );

      return {
        ...assessment[0],
        questions: questionsWithOptions,
      };
    }),

  // Actualizar evaluación
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        passingScore: z.number().min(0).max(100).optional(),
        timeLimit: z.number().optional(),
        maxAttempts: z.number().optional(),
        shuffleQuestions: z.boolean().optional(),
        shuffleOptions: z.boolean().optional(),
        showResults: z.boolean().optional(),
        status: z.enum(['draft', 'active', 'archived']).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { id, ...updateData } = input;

      await db
        .update(assessments)
        .set(updateData)
        .where(eq(assessments.id, id));

      return { success: true };
    }),

  // Eliminar evaluación
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Eliminar preguntas y opciones asociadas
      const questions = await db
        .select({ id: examQuestions.id })
        .from(examQuestions)
        .where(eq(examQuestions.assessmentId, input.id));

      for (const question of questions) {
        await db
          .delete(examQuestionOptions)
          .where(eq(examQuestionOptions.questionId, question.id));
      }

      await db
        .delete(examQuestions)
        .where(eq(examQuestions.assessmentId, input.id));

      await db
        .delete(assessments)
        .where(eq(assessments.id, input.id));

      return { success: true };
    }),

  // Agregar pregunta a evaluación
  addQuestion: protectedProcedure
    .input(
      z.object({
        assessmentId: z.number(),
        questionText: z.string().min(1),
        questionType: z.enum(['multiple_choice', 'true_false', 'short_answer']),
        points: z.number().default(1),
        orderIndex: z.number(),
        explanation: z.string().optional(),
        options: z.array(
          z.object({
            optionText: z.string(),
            isCorrect: z.boolean(),
            orderIndex: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { options, ...questionData } = input;

      // Insertar pregunta
      const [questionResult] = await (db.insert(examQuestions) as any).values(questionData);

      // Insertar opciones
      if (options && options.length > 0) {
        await (db.insert(examQuestionOptions) as any).values(
          options.map((opt: any) => ({
            questionId: questionResult.insertId,
            ...opt,
          }))
        );
      }

      return {
        success: true,
        questionId: questionResult.insertId,
      };
    }),

  // Actualizar pregunta
  updateQuestion: protectedProcedure
    .input(
      z.object({
        questionId: z.number(),
        questionText: z.string().min(1).optional(),
        points: z.number().optional(),
        explanation: z.string().optional(),
        options: z.array(
          z.object({
            id: z.number().optional(),
            optionText: z.string(),
            isCorrect: z.boolean(),
            orderIndex: z.number(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const { questionId, options, ...questionData } = input;

      // Actualizar pregunta
      if (Object.keys(questionData).length > 0) {
        await db
          .update(examQuestions)
          .set(questionData)
          .where(eq(examQuestions.id, questionId));
      }

      // Actualizar opciones si se proporcionan
      if (options) {
        // Eliminar opciones existentes
        await db
          .delete(examQuestionOptions)
          .where(eq(examQuestionOptions.questionId, questionId));

        // Insertar nuevas opciones
        await (db.insert(examQuestionOptions) as any).values(
          options.map((opt: any) => ({
            questionId,
            optionText: opt.optionText,
            isCorrect: opt.isCorrect,
            orderIndex: opt.orderIndex,
          }))
        );
      }

      return { success: true };
    }),

  // Eliminar pregunta
  deleteQuestion: protectedProcedure
    .input(z.object({ questionId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Eliminar opciones
      await db
        .delete(examQuestionOptions)
        .where(eq(examQuestionOptions.questionId, input.questionId));

      // Eliminar pregunta
      await db
        .delete(examQuestions)
        .where(eq(examQuestions.id, input.questionId));

      return { success: true };
    }),

  // Iniciar intento de examen
  startAttempt: protectedProcedure
    .input(
      z.object({
        assessmentId: z.number(),
        employeeId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Verificar evaluación activa
      const assessment = await db
        .select()
        .from(assessments)
        .where(
          and(
            eq(assessments.id, input.assessmentId),
            eq(assessments.status, 'active')
          )
        )
        .limit(1);

      if (!assessment || assessment.length === 0) {
        throw new Error('Evaluación no disponible');
      }

      // Verificar intentos previos
      const previousAttempts = await db
        .select()
        .from(examAttempts)
        .where(
          and(
            eq(examAttempts.assessmentId, input.assessmentId),
            eq(examAttempts.employeeId, input.employeeId)
          )
        );

      const attemptNumber = previousAttempts.length + 1;

      if (
        assessment[0].maxAttempts &&
        attemptNumber > assessment[0].maxAttempts
      ) {
        throw new Error('Se ha alcanzado el número máximo de intentos');
      }

      // Crear nuevo intento
      const [result] = await (db.insert(examAttempts) as any).values({
        assessmentId: input.assessmentId,
        employeeId: input.employeeId,
        attemptNumber,
        startedAt: new Date(),
        status: 'in_progress',
      });

      return {
        success: true,
        attemptId: result.insertId,
        attemptNumber,
      };
    }),

  // Enviar respuestas y calificar
  submitAnswers: protectedProcedure
    .input(
      z.object({
        attemptId: z.number(),
        answers: z.array(
          z.object({
            questionId: z.number(),
            selectedOptionId: z.number().optional(),
            textAnswer: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      // Obtener intento
      const attempt = await db
        .select()
        .from(examAttempts)
        .where(eq(examAttempts.id, input.attemptId))
        .limit(1);

      if (!attempt || attempt.length === 0) {
        throw new Error('Intento no encontrado');
      }

      if (attempt[0].status !== 'in_progress') {
        throw new Error('El examen ya fue completado');
      }

      // Obtener evaluación y preguntas
      const assessment = await db
        .select()
        .from(assessments)
        .where(eq(assessments.id, attempt[0].assessmentId))
        .limit(1);

      const questions = await db
        .select()
        .from(examQuestions)
        .where(eq(examQuestions.assessmentId, attempt[0].assessmentId));

      // Calcular tiempo transcurrido
      const startTime = new Date(attempt[0].startedAt).getTime();
      const endTime = Date.now();
      const timeSpent = Math.floor((endTime - startTime) / 1000); // en segundos

      // Calificar respuestas
      let totalPoints = 0;
      let earnedPoints = 0;

      for (const answer of input.answers) {
        const question = questions.find((q: any) => q.id === answer.questionId);
        if (!question) continue;

        totalPoints += question.points;

        let isCorrect = false;
        let pointsEarned = 0;

        if (question.questionType === 'multiple_choice' || question.questionType === 'true_false') {
          // Verificar respuesta de opción múltiple
          if (answer.selectedOptionId) {
            const option = await db
              .select()
              .from(examQuestionOptions)
              .where(eq(examQuestionOptions.id, answer.selectedOptionId))
              .limit(1);

            if (option && option.length > 0 && option[0].isCorrect) {
              isCorrect = true;
              pointsEarned = question.points;
              earnedPoints += pointsEarned;
            }
          }
        } else if (question.questionType === 'short_answer') {
          // Para respuestas cortas, se debe calificar manualmente
          // Por ahora, no se asignan puntos automáticamente
          isCorrect = false;
          pointsEarned = 0;
        }

        // Guardar respuesta
        await (db.insert(examAnswers) as any).values({
          attemptId: input.attemptId,
          questionId: answer.questionId,
          selectedOptionId: answer.selectedOptionId,
          textAnswer: answer.textAnswer,
          isCorrect,
          pointsEarned,
        });
      }

      // Calcular calificación (porcentaje)
      const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      const passed = score >= (assessment[0].passingScore || 70);

      // Actualizar intento
      await db
        .update(examAttempts)
        .set({
          submittedAt: new Date(),
          score,
          passed,
          status: 'completed',
          timeSpent,
        } as any)
        .where(eq(examAttempts.id, input.attemptId));

      return {
        success: true,
        score,
        passed,
        earnedPoints,
        totalPoints,
        timeSpent,
      };
    }),

  // Obtener resultados de intento
  getAttemptResults: protectedProcedure
    .input(z.object({ attemptId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const attempt = await db
        .select()
        .from(examAttempts)
        .where(eq(examAttempts.id, input.attemptId))
        .limit(1);

      if (!attempt || attempt.length === 0) {
        throw new Error('Intento no encontrado');
      }

      const answers = await db
        .select({
          questionId: examAnswers.questionId,
          questionText: examQuestions.questionText,
          questionType: examQuestions.questionType,
          points: examQuestions.points,
          selectedOptionId: examAnswers.selectedOptionId,
          textAnswer: examAnswers.textAnswer,
          isCorrect: examAnswers.isCorrect,
          pointsEarned: examAnswers.pointsEarned,
          explanation: examQuestions.explanation,
        })
        .from(examAnswers)
        .leftJoin(examQuestions, eq(examAnswers.questionId, examQuestions.id))
        .where(eq(examAnswers.attemptId, input.attemptId));

      return {
        ...attempt[0],
        answers,
      };
    }),

  // Listar intentos de un empleado
  listEmployeeAttempts: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const attempts = await db
        .select({
          id: examAttempts.id,
          assessmentId: examAttempts.assessmentId,
          assessmentTitle: assessments.title,
          attemptNumber: examAttempts.attemptNumber,
          startedAt: examAttempts.startedAt,
          submittedAt: examAttempts.submittedAt,
          score: examAttempts.score,
          passed: examAttempts.passed,
          status: examAttempts.status,
          timeSpent: examAttempts.timeSpent,
        })
        .from(examAttempts)
        .leftJoin(assessments, eq(examAttempts.assessmentId, assessments.id))
        .where(eq(examAttempts.employeeId, input.employeeId))
        .orderBy(desc(examAttempts.startedAt));

      return attempts;
    }),
});
