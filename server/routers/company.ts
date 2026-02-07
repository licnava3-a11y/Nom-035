import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as companyDb from "../db-company";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";

/**
 * Router para módulos de Empresa (NOM-035 Capítulo 5)
 * Gestión de datos generales, logo, representante legal, firmas digitales y reportes de encuestas
 */
export const companyRouter = router({
  /**
   * ============================================================================
   * DATOS GENERALES DE LA EMPRESA
   * ============================================================================
   */
  generalData: router({
    get: protectedProcedure.query(async () => {
      return await companyDb.getCompanyGeneralData();
    }),

    update: protectedProcedure
      .input(
        z.object({
          razonSocial: z.string().min(1, "Razón social es requerida"),
          rfc: z.string().regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/, "RFC inválido"),
          direccionFiscal: z.string().min(1, "Dirección fiscal es requerida"),
          giro: z.string().optional(),
          actividadesPreponderantes: z.string().optional(),
          numeroTrabajadores: z.number().int().positive().optional(),
          representanteLegal: z.string().optional(),
          telefonoContacto: z.string().optional(),
          emailContacto: z.string().email("Email inválido").optional(),
          paginaWeb: z.string().url("URL inválida").optional().or(z.literal("")),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo administradores pueden actualizar datos de la empresa",
          });
        }

        const id = await companyDb.upsertCompanyGeneralData(input);
        return { success: true, id };
      }),
  }),

  /**
   * ============================================================================
   * LOGO DE LA EMPRESA
   * ============================================================================
   */
  logo: router({
    get: protectedProcedure.query(async () => {
      return await companyDb.getCompanyLogo();
    }),

    upload: protectedProcedure
      .input(
        z.object({
          fileData: z.string(), // Base64 encoded file
          fileName: z.string(),
          mimeType: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo administradores pueden subir el logo",
          });
        }

        // Convertir base64 a Buffer
        const base64Data = input.fileData.split(",")[1] || input.fileData;
        const fileBuffer = Buffer.from(base64Data, "base64");
        const fileSize = fileBuffer.length;

        // Validar tamaño (máximo 5MB)
        if (fileSize > 5 * 1024 * 1024) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "El archivo excede el tamaño máximo de 5MB",
          });
        }

        // Subir a S3
        const timestamp = Date.now();
        const fileKey = `company/logo-${timestamp}-${input.fileName}`;
        const { url } = await storagePut(fileKey, fileBuffer, input.mimeType);

        // Guardar en base de datos
        const id = await companyDb.createCompanyLogo({
          logoUrl: url,
          logoKey: fileKey,
          mimeType: input.mimeType,
          fileSize,
          uploadedBy: ctx.user.id,
        });

        return {
          success: true,
          id,
          url,
        };
      }),
  }),

  /**
   * ============================================================================
   * REPRESENTANTE LEGAL
   * ============================================================================
   */
  legalRepresentative: router({
    list: protectedProcedure.query(async () => {
      return await companyDb.getAllLegalRepresentatives();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await companyDb.getLegalRepresentativeById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          nombre: z.string().min(1, "Nombre es requerido"),
          cargo: z.string().min(1, "Cargo es requerido"),
          email: z.string().email("Email inválido").optional(),
          telefono: z.string().optional(),
          firmaData: z.string().optional(), // Base64 de firma
          certificadoData: z.string().optional(), // Base64 de certificado
          vigenciaInicio: z.string().optional(),
          vigenciaFin: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo administradores pueden crear representantes legales",
          });
        }

        let firmaUrl, firmaKey, certificadoUrl, certificadoKey;

        // Subir firma si existe
        if (input.firmaData) {
          const base64Data = input.firmaData.split(",")[1] || input.firmaData;
          const fileBuffer = Buffer.from(base64Data, "base64");
          const timestamp = Date.now();
          firmaKey = `company/firma-${timestamp}.png`;
          const result = await storagePut(firmaKey, fileBuffer, "image/png");
          firmaUrl = result.url;
        }

        // Subir certificado si existe
        if (input.certificadoData) {
          const base64Data = input.certificadoData.split(",")[1] || input.certificadoData;
          const fileBuffer = Buffer.from(base64Data, "base64");
          const timestamp = Date.now();
          certificadoKey = `company/certificado-${timestamp}.pdf`;
          const result = await storagePut(certificadoKey, fileBuffer, "application/pdf");
          certificadoUrl = result.url;
        }

        const id = await companyDb.createLegalRepresentative({
          nombre: input.nombre,
          cargo: input.cargo,
          email: input.email,
          telefono: input.telefono,
          firmaUrl,
          firmaKey,
          certificadoUrl,
          certificadoKey,
          vigenciaInicio: input.vigenciaInicio ? new Date(input.vigenciaInicio) : undefined,
          vigenciaFin: input.vigenciaFin ? new Date(input.vigenciaFin) : undefined,
        });

        return { success: true, id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          nombre: z.string().min(1, "Nombre es requerido"),
          cargo: z.string().min(1, "Cargo es requerido"),
          email: z.string().email("Email inválido").optional(),
          telefono: z.string().optional(),
          activo: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo administradores pueden actualizar representantes legales",
          });
        }

        const { id, ...data } = input;
        await companyDb.updateLegalRepresentative(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo administradores pueden eliminar representantes legales",
          });
        }

        await companyDb.deleteLegalRepresentative(input.id);
        return { success: true };
      }),
  }),

  /**
   * ============================================================================
   * FIRMAS DIGITALES (Catálogo NOM-151)
   * ============================================================================
   */
  digitalSignature: router({
    list: protectedProcedure.query(async () => {
      return await companyDb.getAllDigitalSignatures();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await companyDb.getDigitalSignatureById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          userId: z.number().optional(),
          nombreFirmante: z.string().min(1, "Nombre es requerido"),
          cargo: z.string().min(1, "Cargo es requerido"),
          departamento: z.string().optional(),
          firmaData: z.string(), // Base64 de firma
          certificadoData: z.string().optional(), // Base64 de certificado
          tipoFirmante: z.enum(["interno", "externo"]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Subir firma
        const base64Data = input.firmaData.split(",")[1] || input.firmaData;
        const fileBuffer = Buffer.from(base64Data, "base64");
        const timestamp = Date.now();
        const firmaKey = `signatures/firma-${timestamp}.png`;
        const { url: firmaUrl } = await storagePut(firmaKey, fileBuffer, "image/png");

        let certificadoUrl, certificadoKey;

        // Subir certificado si existe
        if (input.certificadoData) {
          const certBase64 = input.certificadoData.split(",")[1] || input.certificadoData;
          const certBuffer = Buffer.from(certBase64, "base64");
          certificadoKey = `signatures/certificado-${timestamp}.pdf`;
          const result = await storagePut(certificadoKey, certBuffer, "application/pdf");
          certificadoUrl = result.url;
        }

        // Si es firmante externo, requiere autorización del admin
        const estadoAutorizacion = input.tipoFirmante === "externo" ? "pendiente" : "autorizado";

        const id = await companyDb.createDigitalSignature({
          userId: input.userId,
          nombreFirmante: input.nombreFirmante,
          cargo: input.cargo,
          departamento: input.departamento,
          firmaUrl,
          firmaKey,
          certificadoUrl,
          certificadoKey,
          tipoFirmante: input.tipoFirmante,
          estadoAutorizacion,
          autorizadoPor: input.tipoFirmante === "interno" ? ctx.user.id : undefined,
          fechaAutorizacion: input.tipoFirmante === "interno" ? new Date() : undefined,
        });

        return { success: true, id, requiresAuthorization: input.tipoFirmante === "externo" };
      }),

    authorize: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          approved: z.boolean(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo administradores pueden autorizar firmas",
          });
        }

        await companyDb.authorizeDigitalSignature(input.id, input.approved, ctx.user.id);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo administradores pueden eliminar firmas",
          });
        }

        await companyDb.deleteDigitalSignature(input.id);
        return { success: true };
      }),
  }),

  /**
   * ============================================================================
   * REPORTE DE ENCUESTA NOM-035
   * ============================================================================
   */
  surveyReport: router({
    list: protectedProcedure.query(async () => {
      return await companyDb.getAllSurveyReports();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await companyDb.getSurveyReportById(input.id);
      }),

    create: protectedProcedure
      .input(
        z.object({
          periodoAplicacion: z.string().min(1, "Periodo es requerido"),
          fechaInicio: z.string(),
          fechaFin: z.string(),
          guiaAplicada: z.enum(["guia-i", "guia-ii", "guia-iii"]),
          tamañoMuestra: z.number().int().positive(),
          cobertura: z.number().optional(),
          numeroTrabajadoresTotal: z.number().int().positive(),
          numeroTrabajadoresEncuestados: z.number().int().positive(),
          metodologiaAplicacion: z.string().optional(),
          observaciones: z.string().optional(),
          responsableAplicacion: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "committee") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo administradores y comité pueden crear reportes",
          });
        }

        const id = await companyDb.createSurveyReport({
          periodoAplicacion: input.periodoAplicacion,
          fechaInicio: new Date(input.fechaInicio),
          fechaFin: new Date(input.fechaFin),
          guiaAplicada: input.guiaAplicada,
          tamañoMuestra: input.tamañoMuestra,
          cobertura: input.cobertura?.toString(),
          numeroTrabajadoresTotal: input.numeroTrabajadoresTotal,
          numeroTrabajadoresEncuestados: input.numeroTrabajadoresEncuestados,
          metodologiaAplicacion: input.metodologiaAplicacion,
          observaciones: input.observaciones,
          responsableAplicacion: input.responsableAplicacion,
          createdBy: ctx.user.id,
        });

        return { success: true, id };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          periodoAplicacion: z.string().min(1, "Periodo es requerido"),
          fechaInicio: z.string(),
          fechaFin: z.string(),
          guiaAplicada: z.enum(["guia-i", "guia-ii", "guia-iii"]),
          tamañoMuestra: z.number().int().positive(),
          cobertura: z.number().optional(),
          numeroTrabajadoresTotal: z.number().int().positive(),
          numeroTrabajadoresEncuestados: z.number().int().positive(),
          metodologiaAplicacion: z.string().optional(),
          observaciones: z.string().optional(),
          responsableAplicacion: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role !== "admin" && ctx.user.role !== "committee") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Solo administradores y comité pueden actualizar reportes",
          });
        }

        const { id, ...data } = input;

        await companyDb.updateSurveyReport(id, {
          periodoAplicacion: data.periodoAplicacion,
          fechaInicio: new Date(data.fechaInicio),
          fechaFin: new Date(data.fechaFin),
          guiaAplicada: data.guiaAplicada,
          tamañoMuestra: data.tamañoMuestra,
          cobertura: data.cobertura?.toString(),
          numeroTrabajadoresTotal: data.numeroTrabajadoresTotal,
          numeroTrabajadoresEncuestados: data.numeroTrabajadoresEncuestados,
          metodologiaAplicacion: data.metodologiaAplicacion,
          observaciones: data.observaciones,
          responsableAplicacion: data.responsableAplicacion,
        });

        return { success: true };
      }),
  }),
});
