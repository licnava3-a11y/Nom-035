import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { 
  careerPaths, 
  employeeCareerPlans,
  employeeTurnoverHistory,
  users
} from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const careerPlanningRouter = router({
  // Crear ruta de carrera
  createPath: protectedProcedure
    .input(z.object({
      pathName: z.string(),
      description: z.string().optional(),
      positions: z.array(z.object({
        level: z.number(),
        positionId: z.number(),
        positionName: z.string(),
        requiredCompetencies: z.array(z.object({
          competencyId: z.number(),
          competencyName: z.string(),
          minimumLevel: z.number(),
        })),
        estimatedTimeMonths: z.number(),
      })),
      minimumEducation: z.string().optional(),
      minimumExperience: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      
      const [path] = await db.insert(careerPaths).values({
        pathName: input.pathName,
        description: input.description,
        positions: input.positions as any,
        minimumEducation: input.minimumEducation,
        minimumExperience: input.minimumExperience,
        createdBy: ctx.user.id,
      });
      
      return { success: true, pathId: path.insertId };
    }),

  // Obtener rutas de carrera activas
  getActivePaths: protectedProcedure.query(async () => {
    const db = await getDb();
    
    const paths = await db
      .select()
      .from(careerPaths)
      .where(eq(careerPaths.isActive, true))
      .orderBy(desc(careerPaths.createdAt));
    
    return paths;
  }),

  // Sugerir ruta de carrera para empleado
  suggestPath: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      // Obtener información del empleado
      const [employee] = await db
        .select()
        .from(users)
        .where(eq(users.id, input.employeeId))
        .limit(1);
      
      if (!employee) {
        throw new Error("Empleado no encontrado");
      }
      
      // Obtener todas las rutas activas
      const paths = await db
        .select()
        .from(careerPaths)
        .where(eq(careerPaths.isActive, true));
      
      // Algoritmo de scoring para sugerencias
      const suggestions = paths.map(path => {
        let score = 0;
        
        // Factor 1: Educación (30%)
        if (path.minimumEducation && employee.education) {
          const educationMatch = employee.education.includes(path.minimumEducation);
          score += educationMatch ? 30 : 0;
        } else {
          score += 15; // Neutral si no hay requisito
        }
        
        // Factor 2: Experiencia (20%)
        const experienceMonths = employee.yearsOfExperience ? employee.yearsOfExperience * 12 : 0;
        if (path.minimumExperience) {
          const experienceRatio = Math.min(experienceMonths / path.minimumExperience, 1);
          score += experienceRatio * 20;
        } else {
          score += 10;
        }
        
        // Factor 3: Departamento actual (25%)
        const currentDepartmentMatch = path.positions.some(
          (pos: any) => pos.positionName.toLowerCase().includes(employee.department?.toLowerCase() || "")
        );
        score += currentDepartmentMatch ? 25 : 0;
        
        // Factor 4: Posición actual (25%)
        const currentPositionMatch = path.positions.some(
          (pos: any) => pos.positionName.toLowerCase() === employee.position?.toLowerCase()
        );
        score += currentPositionMatch ? 25 : 10;
        
        return {
          pathId: path.id,
          pathName: path.pathName,
          description: path.description,
          matchScore: Math.round(score),
          estimatedDuration: path.positions.reduce((sum: number, pos: any) => sum + pos.estimatedTimeMonths, 0),
          positions: path.positions,
        };
      });
      
      // Ordenar por score descendente
      suggestions.sort((a, b) => b.matchScore - a.matchScore);
      
      return suggestions.slice(0, 3); // Top 3
    }),

  // Crear plan de carrera individual
  createPlan: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
      pathId: z.number(),
      currentLevel: z.number(),
      targetLevel: z.number(),
      competencyGaps: z.array(z.object({
        competencyId: z.number(),
        competencyName: z.string(),
        currentLevel: z.number(),
        requiredLevel: z.number(),
        gap: z.number(),
        recommendedCourses: z.array(z.object({
          courseId: z.number(),
          courseName: z.string(),
          duration: z.number(),
        })),
      })).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      // Generar hitos automáticos
      const milestones = [
        {
          id: "m1",
          title: "Completar capacitaciones requeridas",
          description: "Finalizar cursos de desarrollo de competencias",
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          status: "pending" as const,
        },
        {
          id: "m2",
          title: "Evaluación de competencias",
          description: "Demostrar dominio de competencias clave",
          targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
          status: "pending" as const,
        },
        {
          id: "m3",
          title: "Promoción a siguiente nivel",
          description: "Transición formal a nueva posición",
          targetDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          status: "pending" as const,
        },
      ];
      
      const [plan] = await db.insert(employeeCareerPlans).values({
        employeeId: input.employeeId,
        pathId: input.pathId,
        currentLevel: input.currentLevel,
        targetLevel: input.targetLevel,
        competencyGaps: (input.competencyGaps || []) as any,
        milestones: milestones as any,
      });
      
      return { success: true, planId: plan.insertId };
    }),

  // Obtener plan de carrera del empleado
  getEmployeePlan: protectedProcedure
    .input(z.object({
      employeeId: z.number(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      
      const [plan] = await db
        .select()
        .from(employeeCareerPlans)
        .where(
          and(
            eq(employeeCareerPlans.employeeId, input.employeeId),
            eq(employeeCareerPlans.status, "active")
          )
        )
        .limit(1);
      
      if (!plan) {
        return null;
      }
      
      // Obtener información de la ruta
      const [path] = await db
        .select()
        .from(careerPaths)
        .where(eq(careerPaths.id, plan.pathId))
        .limit(1);
      
      return {
        ...plan,
        path,
      };
    }),

  // Actualizar progreso de hitos
  updateMilestone: protectedProcedure
    .input(z.object({
      planId: z.number(),
      milestoneId: z.string(),
      status: z.enum(["pending", "in_progress", "completed"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      const [plan] = await db
        .select()
        .from(employeeCareerPlans)
        .where(eq(employeeCareerPlans.id, input.planId))
        .limit(1);
      
      if (!plan) {
        throw new Error("Plan no encontrado");
      }
      
      const updatedMilestones = (plan.milestones as any[]).map(m => {
        if (m.id === input.milestoneId) {
          return {
            ...m,
            status: input.status,
            completedDate: input.status === "completed" ? new Date().toISOString() : m.completedDate,
          };
        }
        return m;
      });
      
      await db
        .update(employeeCareerPlans)
        .set({ milestones: updatedMilestones as any })
        .where(eq(employeeCareerPlans.id, input.planId));
      
      return { success: true };
    }),

  // Proyectar vacantes futuras
  getVacancyProjections: protectedProcedure.query(async () => {
    const db = await getDb();
    
    // Calcular proyecciones basadas en rotación histórica
    const turnoverData = await db
      .select({
        position: employeeTurnoverHistory.position,
        count: sql<number>`COUNT(*)`,
      })
      .from(employeeTurnoverHistory)
      .where(
        sql`${employeeTurnoverHistory.exitDate} >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`
      )
      .groupBy(employeeTurnoverHistory.position);
    
    const projections = turnoverData.map(item => ({
      position: item.position,
      estimatedVacancies: Math.ceil(item.count / 12 * 6), // Proyección 6 meses
      probability: Math.min((item.count / 12) * 100, 100),
      estimatedOpeningDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }));
    
    return projections;
  }),
});
