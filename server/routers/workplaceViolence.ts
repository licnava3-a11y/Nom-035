import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { workplaceViolenceCases, protocolSteps, employees, users } from "../../drizzle/schema";
import { eq, desc, and, or, like, gte, lte } from "drizzle-orm";

export const workplaceViolenceRouter = router({
  // Crear nuevo caso de violencia laboral
  createCase: protectedProcedure
    .input(
      z.object({
        complainantId: z.number().optional(), // Opcional para denuncias anónimas
        complainantName: z.string().optional(), // Nombre si es anónimo
        accusedId: z.number(),
        complaintDate: z.string(), // Fecha en formato ISO
        incidentDate: z.string().optional(),
        description: z.string(),
        evidenceFiles: z.array(z.string()).optional(),
        witnesses: z.array(z.object({ name: z.string(), contact: z.string() })).optional(),
        priority: z.enum(["baja", "media", "alta", "critica"]).default("media"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Generar folio único (VL-YYYY-NNNN)
      const year = new Date().getFullYear();
      const [lastCase] = await db
        .select({ folio: workplaceViolenceCases.folio })
        .from(workplaceViolenceCases)
        .where(like(workplaceViolenceCases.folio, `VL-${year}-%`))
        .orderBy(desc(workplaceViolenceCases.folio))
        .limit(1);

      let nextNumber = 1;
      if (lastCase?.folio) {
        const match = lastCase.folio.match(/VL-\d{4}-(\d{4})/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }
      const folio = `VL-${year}-${nextNumber.toString().padStart(4, "0")}`;

      // Crear caso
      const [newCase] = await db.insert(workplaceViolenceCases).values({
        folio: folio,
        complainantId: input.complainantId,
        complainantName: input.complainantName,
        accusedId: input.accusedId,
        complaintDate: new Date(input.complaintDate),
        incidentDate: input.incidentDate ? new Date(input.incidentDate) : undefined,
        description: input.description,
        evidenceFiles: input.evidenceFiles,
        witnesses: input.witnesses,
        priority: input.priority,
        createdBy: ctx.user.id,
      });

      // Registrar primer paso del protocolo (Recepción)
      await db.insert(protocolSteps).values({
        caseId: newCase.insertId,
        phase: "recepcion",
        action: "Recepción de queja de violencia laboral",
        responsibleId: ctx.user.id,
        notes: `Caso creado con folio ${folio}`,
      });

      return {
        success: true,
        caseId: newCase.insertId,
        folio,
      };
    }),

  // Listar todos los casos
  listCases: protectedProcedure
    .input(
      z.object({
        status: z.enum(["activo", "suspendido", "cerrado", "todos"]).default("todos"),
        priority: z.enum(["baja", "media", "alta", "critica", "todas"]).default("todas"),
        phase: z.enum(["recepcion", "evaluacion_inicial", "medidas_cautelares", "investigacion", "resolucion", "seguimiento", "cerrado", "todas"]).default("todas"),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      let conditions = [];
      if (input?.status && input.status !== "todos") {
        conditions.push(eq(workplaceViolenceCases.status, input.status));
      }
      if (input?.priority && input.priority !== "todas") {
        conditions.push(eq(workplaceViolenceCases.priority, input.priority));
      }
      if (input?.phase && input.phase !== "todas") {
        conditions.push(eq(workplaceViolenceCases.currentPhase, input.phase));
      }

      const cases = await db
        .select({
          id: workplaceViolenceCases.id,
          folio: workplaceViolenceCases.folio,
          complainantName: workplaceViolenceCases.complainantName,
          accusedName: employees.firstName,
          accusedLastName: employees.lastName,
          complaintDate: workplaceViolenceCases.complaintDate,
          currentPhase: workplaceViolenceCases.currentPhase,
          priority: workplaceViolenceCases.priority,
          status: workplaceViolenceCases.status,
          createdAt: workplaceViolenceCases.createdAt,
        })
        .from(workplaceViolenceCases)
        .leftJoin(employees, eq(workplaceViolenceCases.accusedId, employees.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(workplaceViolenceCases.createdAt));

      return cases;
    }),

  // Obtener caso por ID
  getCaseById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const [caseData] = await db
        .select({
          id: workplaceViolenceCases.id,
          folio: workplaceViolenceCases.folio,
          complainantId: workplaceViolenceCases.complainantId,
          complainantName: workplaceViolenceCases.complainantName,
          accusedId: workplaceViolenceCases.accusedId,
          accusedName: employees.firstName,
          accusedLastName: employees.lastName,
          accusedDepartmentId: employees.departmentId,
          accusedPositionId: employees.positionId,
          complaintDate: workplaceViolenceCases.complaintDate,
          incidentDate: workplaceViolenceCases.incidentDate,
          description: workplaceViolenceCases.description,
          evidenceFiles: workplaceViolenceCases.evidenceFiles,
          witnesses: workplaceViolenceCases.witnesses,
          currentPhase: workplaceViolenceCases.currentPhase,
          priority: workplaceViolenceCases.priority,
          status: workplaceViolenceCases.status,
          resolution: workplaceViolenceCases.resolution,
          resolutionDate: workplaceViolenceCases.resolutionDate,
          assignedToId: workplaceViolenceCases.assignedToId,
          assignedToName: users.name,
          createdAt: workplaceViolenceCases.createdAt,
          updatedAt: workplaceViolenceCases.updatedAt,
        })
        .from(workplaceViolenceCases)
        .leftJoin(employees, eq(workplaceViolenceCases.accusedId, employees.id))
        .leftJoin(users, eq(workplaceViolenceCases.assignedToId, users.id))
        .where(eq(workplaceViolenceCases.id, input.id))
        .limit(1);

      if (!caseData) {
        throw new Error("Caso no encontrado");
      }

      return caseData;
    }),

  // Actualizar fase del protocolo
  updateProtocolStep: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
        newPhase: z.enum(["recepcion", "evaluacion_inicial", "medidas_cautelares", "investigacion", "resolucion", "seguimiento", "cerrado"]),
        action: z.string(),
        notes: z.string().optional(),
        attachments: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Actualizar fase actual del caso
      await db
        .update(workplaceViolenceCases)
        .set({ currentPhase: input.newPhase })
        .where(eq(workplaceViolenceCases.id, input.caseId));

      // Registrar paso del protocolo
      await db.insert(protocolSteps).values({
        caseId: input.caseId,
        phase: input.newPhase,
        action: input.action,
        responsibleId: ctx.user.id,
        notes: input.notes,
        attachments: input.attachments,
      });

      return { success: true };
    }),

  // Obtener historial de pasos del protocolo
  getProtocolHistory: protectedProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const steps = await db
        .select({
          id: protocolSteps.id,
          phase: protocolSteps.phase,
          action: protocolSteps.action,
          responsibleName: users.name,
          actionDate: protocolSteps.actionDate,
          notes: protocolSteps.notes,
          attachments: protocolSteps.attachments,
        })
        .from(protocolSteps)
        .leftJoin(users, eq(protocolSteps.responsibleId, users.id))
        .where(eq(protocolSteps.caseId, input.caseId))
        .orderBy(desc(protocolSteps.actionDate));

      return steps;
    }),

  // Cerrar caso con resolución
  closeCase: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
        resolution: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const resolutionDate = new Date();

      // Actualizar caso
      await db
        .update(workplaceViolenceCases)
        .set({
          currentPhase: "cerrado",
          status: "cerrado",
          resolution: input.resolution,
          resolutionDate,
        })
        .where(eq(workplaceViolenceCases.id, input.caseId));

      // Registrar cierre en protocolo
      await db.insert(protocolSteps).values({
        caseId: input.caseId,
        phase: "cerrado",
        action: "Cierre del caso",
        responsibleId: ctx.user.id,
        notes: input.resolution,
      });

      return { success: true };
    }),

  // Asignar responsable al caso
  assignResponsible: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      await db
        .update(workplaceViolenceCases)
        .set({ assignedToId: input.userId })
        .where(eq(workplaceViolenceCases.id, input.caseId));

      // Registrar asignación en protocolo
      const [assignedUser] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);

      await db.insert(protocolSteps).values({
        caseId: input.caseId,
        phase: "recepcion",
        action: `Caso asignado a ${assignedUser?.name || "usuario"}`,
        responsibleId: ctx.user.id,
      });

      return { success: true };
    }),
});
