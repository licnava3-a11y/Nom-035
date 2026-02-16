/**
 * Router tRPC para módulos de Igualdad Laboral y No Discriminación NMX-025
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as equalityDb from "../db-equality";
import { storagePut } from "../storage";
import { getDb } from "../db";
import { employees } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

/**
 * ============================================================================
 * POLÍTICA DE IGUALDAD (Requisito 4.1.1 NMX-025)
 * ============================================================================
 */

const policyRouter = router({
  get: protectedProcedure.query(async () => {
    return equalityDb.getEqualityPolicy();
  }),

  list: protectedProcedure.query(async () => {
    return equalityDb.listEqualityPolicies();
  }),

  create: protectedProcedure
    .input(
      z.object({
        titulo: z.string().min(1, "El título es requerido"),
        descripcion: z.string().min(1, "La descripción es requerida"),
        fechaAprobacion: z.string(),
        fechaVigencia: z.string().optional(),
        documentoBase64: z.string().optional(),
        documentoMimeType: z.string().optional(),
        aprobadoPor: z.number().optional(),
        estado: z.enum(["borrador", "vigente", "archivado"]).default("borrador"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let documentoUrl: string | undefined;
      let documentoKey: string | undefined;

      // Upload documento a S3 si se proporciona
      if (input.documentoBase64 && input.documentoMimeType) {
        const buffer = Buffer.from(input.documentoBase64, "base64");
        const timestamp = Date.now();
        const key = `equality/policies/policy-${timestamp}.pdf`;
        const { url, key: uploadedKey } = await storagePut(key, buffer, input.documentoMimeType);
        documentoUrl = url;
        documentoKey = uploadedKey;
      }

      const policyId = await equalityDb.createEqualityPolicy({
        titulo: input.titulo,
        descripcion: input.descripcion,
        fechaAprobacion: input.fechaAprobacion as any,
        fechaVigencia: input.fechaVigencia as any,
        documentoUrl,
        documentoKey,
        aprobadoPor: input.aprobadoPor,
        estado: input.estado,
        createdBy: ctx.user.id,
      });

      return { success: true, policyId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        titulo: z.string().optional(),
        descripcion: z.string().optional(),
        fechaAprobacion: z.string().optional(),
        fechaVigencia: z.string().optional(),
        documentoBase64: z.string().optional(),
        documentoMimeType: z.string().optional(),
        aprobadoPor: z.number().optional(),
        estado: z.enum(["borrador", "vigente", "archivado"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updateData: any = { ...input };
      delete updateData.id;
      delete updateData.documentoBase64;
      delete updateData.documentoMimeType;

      // Upload nuevo documento si se proporciona
      if (input.documentoBase64 && input.documentoMimeType) {
        const buffer = Buffer.from(input.documentoBase64, "base64");
        const timestamp = Date.now();
        const key = `equality/policies/policy-${timestamp}.pdf`;
        const { url, key: uploadedKey } = await storagePut(key, buffer, input.documentoMimeType);
        updateData.documentoUrl = url;
        updateData.documentoKey = uploadedKey;
      }

      await equalityDb.updateEqualityPolicy(input.id, updateData);
      return { success: true };
    }),
});

/**
 * ============================================================================
 * BRECHA SALARIAL (Requisito 4.2.1 NMX-025)
 * ============================================================================
 */

const salaryGapRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        periodo: z.string().optional(),
        departamento: z.string().optional(),
        puesto: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return equalityDb.listSalaryGaps(input);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return equalityDb.getSalaryGap(input.id);
    }),

  /**
   * Calcular brecha salarial por género
   * Algoritmo: ((Salario Promedio Hombres - Salario Promedio Mujeres) / Salario Promedio Hombres) * 100
   * TODO: Implementar con datos reales de salarios cuando estén disponibles en el sistema
   */
  calculate: protectedProcedure
    .input(
      z.object({
        periodo: z.string(),
        departamento: z.string().optional(),
        puesto: z.string().optional(),
        // Datos manuales temporales hasta que se integre con nómina
        totalMujeres: z.number(),
        totalHombres: z.number(),
        salarioPromedioMujeres: z.number(),
        salarioPromedioHombres: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Calcular brecha porcentual
      const brechaPorcentual =
        ((input.salarioPromedioHombres - input.salarioPromedioMujeres) / input.salarioPromedioHombres) * 100;

      // Determinar nivel de riesgo
      let nivelRiesgo: "bajo" | "medio" | "alto" = "bajo";
      if (Math.abs(brechaPorcentual) > 20) {
        nivelRiesgo = "alto";
      } else if (Math.abs(brechaPorcentual) > 10) {
        nivelRiesgo = "medio";
      }

      // Guardar resultado
      const gapId = await equalityDb.createSalaryGap({
        periodo: input.periodo,
        fechaCalculo: new Date().toISOString().split("T")[0] as any,
        departamento: input.departamento || 'Administración',
        puesto: input.puesto,
        totalMujeres: input.totalMujeres,
        totalHombres: input.totalHombres,
        salarioPromedioMujeres: input.salarioPromedioMujeres.toFixed(2),
        salarioPromedioHombres: input.salarioPromedioHombres.toFixed(2),
        brechaPorcentual: brechaPorcentual.toFixed(2),
        nivelRiesgo,
        calculadoPor: ctx.user.id,
      });

      return {
        success: true,
        gapId,
        resultado: {
          totalMujeres: input.totalMujeres,
          totalHombres: input.totalHombres,
          salarioPromedioMujeres: input.salarioPromedioMujeres,
          salarioPromedioHombres: input.salarioPromedioHombres,
          brechaPorcentual,
          nivelRiesgo,
        },
      };
    }),
});

/**
 * ============================================================================
 * ACCIONES AFIRMATIVAS (Requisito 4.3.1 NMX-025)
 * ============================================================================
 */

const affirmativeActionsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        tipo: z.string().optional(),
        estado: z.string().optional(),
        departamento: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return equalityDb.listAffirmativeActions(input);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return equalityDb.getAffirmativeAction(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        titulo: z.string().min(1, "El título es requerido"),
        tipo: z.enum([
          "capacitacion",
          "promocion",
          "contratacion",
          "conciliacion",
          "infraestructura",
          "otro",
        ]),
        descripcion: z.string().min(1, "La descripción es requerida"),
        objetivo: z.string().min(1, "El objetivo es requerido"),
        fechaInicio: z.string(),
        fechaFin: z.string().optional(),
        responsable: z.string().min(1, "El responsable es requerido"),
        departamento: z.string().optional(),
        presupuesto: z.string().optional(),
        estado: z.enum(["planeada", "en_progreso", "completada", "cancelada"]).default("planeada"),
        resultadosEsperados: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const actionId = await equalityDb.createAffirmativeAction({
        titulo: input.titulo,
        tipo: input.tipo,
        descripcion: input.descripcion,
        objetivo: input.objetivo,
        fechaInicio: input.fechaInicio as any,
        fechaFin: input.fechaFin as any,
        responsable: input.responsable,
        departamento: input.departamento || 'Administración',
        presupuesto: input.presupuesto as any,
        estado: input.estado,
        resultadosEsperados: input.resultadosEsperados,
        createdBy: ctx.user.id,
      });
      return { success: true, actionId };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        titulo: z.string().optional(),
        tipo: z.enum([
          "capacitacion",
          "promocion",
          "contratacion",
          "conciliacion",
          "infraestructura",
          "otro",
        ]).optional(),
        descripcion: z.string().optional(),
        objetivo: z.string().optional(),
        fechaInicio: z.string().optional(),
        fechaFin: z.string().optional(),
        responsable: z.string().optional(),
        departamento: z.string().optional(),
        presupuesto: z.string().optional(),
        estado: z.enum(["planeada", "en_progreso", "completada", "cancelada"]).optional(),
        resultadosEsperados: z.string().optional(),
        resultadosObtenidos: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const updateData: any = { ...rest };
      // Convertir fechas de string a Date si están presentes
      if (updateData.fechaInicio) updateData.fechaInicio = updateData.fechaInicio as any;
      if (updateData.fechaFin) updateData.fechaFin = updateData.fechaFin as any;
      if (updateData.presupuesto) updateData.presupuesto = updateData.presupuesto as any;
      await equalityDb.updateAffirmativeAction(id, updateData);
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await equalityDb.deleteAffirmativeAction(input.id);
      return { success: true };
    }),
});

/**
 * ============================================================================
 * QUEJAS Y DENUNCIAS (Requisito 4.4.1 NMX-025)
 * ============================================================================
 */

const complaintsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        tipo: z.string().optional(),
        estado: z.string().optional(),
        prioridad: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return equalityDb.listComplaints(input);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return equalityDb.getComplaint(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        tipo: z.enum([
          "discriminacion_genero",
          "acoso_laboral",
          "acoso_sexual",
          "discriminacion_edad",
          "discriminacion_discapacidad",
          "otro",
        ]),
        descripcion: z.string().min(1, "La descripción es requerida"),
        fechaIncidente: z.string().optional(),
        denuncianteNombre: z.string().optional(),
        denuncianteEmail: z.string().email().optional(),
        denuncianteTelefono: z.string().optional(),
        esAnonima: z.boolean().default(false),
        prioridad: z.enum(["baja", "media", "alta", "urgente"]).default("media"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Generar folio único
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 1000);
      const folio = `QJ-${timestamp}-${random}`;

      const complaintId = await equalityDb.createComplaint({
        folio,
        tipo: input.tipo,
        descripcion: input.descripcion,
        fechaIncidente: input.fechaIncidente as any,
        denuncianteNombre: input.denuncianteNombre,
        denuncianteEmail: input.denuncianteEmail,
        denuncianteTelefono: input.denuncianteTelefono,
        esAnonima: input.esAnonima,
        prioridad: input.prioridad,
        estado: "recibida",
        createdBy: ctx.user.id,
      });

      return { success: true, complaintId, folio };
    }),

  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        estado: z.enum(["recibida", "en_investigacion", "resuelta", "cerrada", "desestimada"]),
        investigadorAsignado: z.number().optional(),
        resolucion: z.string().optional(),
        accionesCorrectivas: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const updateData: any = {
        estado: input.estado,
        investigadorAsignado: input.investigadorAsignado,
        resolucion: input.resolucion,
        accionesCorrectivas: input.accionesCorrectivas,
      };

      if (input.estado === "en_investigacion" && input.investigadorAsignado) {
        updateData.fechaAsignacion = new Date().toISOString().split("T")[0];
      }

      if (input.estado === "resuelta" || input.estado === "cerrada") {
        updateData.fechaResolucion = new Date().toISOString().split("T")[0];
      }

      await equalityDb.updateComplaint(input.id, updateData);
      return { success: true };
    }),
});

/**
 * ============================================================================
 * COMITÉ DE IGUALDAD (Requisito 4.1.2 NMX-025)
 * ============================================================================
 */

const committeeRouter = router({
  list: protectedProcedure
    .input(z.object({ activeOnly: z.boolean().default(true) }).optional())
    .query(async ({ input }) => {
      return equalityDb.listCommitteeMembers(input?.activeOnly ?? true);
    }),

  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return equalityDb.getCommitteeMember(input.id);
    }),

  addMember: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        cargo: z.enum(["presidente", "secretario", "vocal", "asesor"]),
        fechaDesignacion: z.string(),
        observaciones: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const memberId = await equalityDb.addCommitteeMember({
        userId: input.userId,
        cargo: input.cargo,
        fechaDesignacion: input.fechaDesignacion as any,
        observaciones: input.observaciones,
        activo: true,
        designadoPor: ctx.user.id,
      });
      return { success: true, memberId };
    }),

  removeMember: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await equalityDb.removeCommitteeMember(input.id);
      return { success: true };
    }),

  updateMember: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        cargo: z.enum(["presidente", "secretario", "vocal", "asesor"]).optional(),
        fechaTermino: z.string().optional(),
        observaciones: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...rest } = input;
      const updateData: any = { ...rest };
      if (updateData.fechaTermino) updateData.fechaTermino = updateData.fechaTermino as any;
      await equalityDb.updateCommitteeMember(id, updateData);
      return { success: true };
    }),
});

/**
 * ============================================================================
 * ROUTER PRINCIPAL DE IGUALDAD LABORAL
 * ============================================================================
 */

export const equalityRouter = router({
  policy: policyRouter,
  salaryGap: salaryGapRouter,
  affirmativeActions: affirmativeActionsRouter,
  complaints: complaintsRouter,
  committee: committeeRouter,
});
