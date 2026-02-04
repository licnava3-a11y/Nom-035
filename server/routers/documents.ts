import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { documents, signatures, documentParticipants, formatCatalog } from "../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import {
  generateActaConstitutivaPDF,
  generateFuncionesComitePDF,
  generateAceptacionCargoPDF,
  generateFolio,
} from "../lib/pdf-generator";
import { storagePut } from "../storage";

// Schema de validación para firmas
const signatureSchema = z.object({
  url: z.string().url(),
  nombre: z.string().min(1),
  cargo: z.string().min(1),
  userId: z.number().optional(),
  ipAddress: z.string().optional(),
  deviceInfo: z.string().optional(),
});

// Schema para Acta Constitutiva
const actaConstitutivaSchema = z.object({
  title: z.string().min(1),
  organizacion: z.string().min(1),
  fecha: z.string(),
  lugar: z.string().min(1),
  objetivo: z.string().min(1),
  miembros: z.array(
    z.object({
      nombre: z.string(),
      cargo: z.string(),
      area: z.string(),
    })
  ),
  firmas: z.array(signatureSchema),
  status: z.enum(["draft", "final"]).default("draft"),
});

// Schema para Funciones del Comité
const funcionesComiteSchema = z.object({
  title: z.string().min(1),
  organizacion: z.string().min(1),
  fecha: z.string(),
  funciones: z.array(
    z.object({
      categoria: z.string(),
      items: z.array(z.string()),
    })
  ),
  firmas: z.array(signatureSchema),
  status: z.enum(["draft", "final"]).default("draft"),
});

// Schema para Aceptación de Cargo
const aceptacionCargoSchema = z.object({
  title: z.string().min(1),
  organizacion: z.string().min(1),
  fecha: z.string(),
  nombreCompleto: z.string().min(1),
  cargo: z.string().min(1),
  departamento: z.string().min(1),
  curp: z.string().length(18),
  email: z.string().email(),
  telefono: z.string().min(10),
  declaracion: z.string().optional(),
  firmas: z.array(signatureSchema),
  status: z.enum(["draft", "final"]).default("draft"),
});

// Schema para Acta de Recorrido
const actaRecorridoSchema = z.object({
  title: z.string().min(1),
  organizacion: z.string().min(1),
  fecha: z.string(),
  horaInicio: z.string(),
  horaFin: z.string(),
  objetivo: z.string().min(1),
  alcance: z.string().min(1),
  observaciones: z.array(
    z.object({
      area: z.string(),
      descripcion: z.string(),
      riesgo: z.string(),
      accionCorrectiva: z.string(),
      responsable: z.string(),
      plazo: z.string(),
    })
  ),
  participantes: z.array(
    z.object({
      nombre: z.string(),
      cargo: z.string(),
      curp: z.string().optional(),
      ine: z.string().optional(),
    })
  ),
  firmas: z.array(signatureSchema),
  status: z.enum(["draft", "final"]).default("draft"),
});

// Schema para Acta Final de Resultados
const actaFinalResultadosSchema = z.object({
  title: z.string().min(1),
  organizacion: z.string().min(1),
  rfc: z.string(),
  domicilio: z.string(),
  telefono: z.string(),
  actividadPrincipal: z.string(),
  fechaEvaluacion: z.string(),
  esUnidadVerificacion: z.boolean(),
  // Datos de Unidad de Verificación (condicional)
  nombreUnidadVerificacion: z.string().optional(),
  numeroAcreditacion: z.string().optional(),
  numeroAprobacionSTPS: z.string().optional(),
  domicilioUnidadVerificacion: z.string().optional(),
  // Datos del dictamen (condicional)
  claveNorma: z.string().optional(),
  nombreVerificador: z.string().optional(),
  fechaVerificacion: z.string().optional(),
  numeroDictamen: z.string().optional(),
  vigenciaDictamen: z.string().optional(),
  lugarEmisionDictamen: z.string().optional(),
  fechaEmisionDictamen: z.string().optional(),
  numeroRegistroDictamen: z.string().optional(),
  // Método y resultados
  metodoUtilizado: z.string(),
  guiaReferencia: z.string().optional(),
  areasTrabajo: z.string(),
  numeroTrabajadores: z.string(),
  resultadosGenerales: z.string(),
  factoresRiesgoIdentificados: z.string(),
  // Acciones de control
  accionesControl: z.array(
    z.object({
      nivel: z.string(),
      descripcion: z.string(),
      fechaProgramada: z.string(),
      responsable: z.string(),
      avance: z.string(),
    })
  ),
  firmas: z.array(signatureSchema),
  status: z.enum(["draft", "final"]).default("draft"),
});

export const documentsRouter = router({
  // Guardar Acta Constitutiva
  saveActaConstitutiva: protectedProcedure.input(actaConstitutivaSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Obtener o crear catálogo de formato
    let [catalog] = await db.select().from(formatCatalog).where(eq(formatCatalog.code, "AC")).limit(1);

    if (!catalog) {
      const [newCatalog] = await db.insert(formatCatalog).values({
        code: "AC",
        name: "Acta Constitutiva del Comité",
        version: "1.0",
        versionDate: new Date(),
        reference: "NOM-035-STPS-2018",
      });
      catalog = { id: newCatalog.insertId, code: "AC" } as any;
    }

    // Obtener consecutivo
    const [lastDoc] = await db.select().from(documents).where(eq(documents.type, "acta_constitutiva")).orderBy(desc(documents.id)).limit(1);

    const consecutivo = lastDoc ? parseInt(lastDoc.folio.split("-")[1].split("/")[0]) + 1 : 1;
    const folio = generateFolio("acta_constitutiva", consecutivo);

    // Generar código QR único
    const qrCode = `${folio}-${Date.now()}`;

    // Guardar documento
    const [result] = await db.insert(documents).values({
      formatCatalogId: catalog.id,
      folio,
      title: input.title,
      type: "acta_constitutiva",
      status: input.status,
      content: JSON.stringify(input),
      qrCode,
      createdBy: ctx.user.id,
      finalizedAt: input.status === "final" ? new Date() : null,
    });

    const documentId = result.insertId;

    // Guardar firmas con hash y timestamp
    const { prepareSignatureData } = await import('../lib/signatureUtils');
    for (const firma of input.firmas) {
      const signatureData = prepareSignatureData({
        documentId,
        userId: firma.userId || null,
        signerName: firma.nombre,
        signerRole: firma.cargo,
        signatureImageUrl: firma.url,
        ipAddress: firma.ipAddress || null,
        deviceInfo: firma.deviceInfo || null,
      });
      await db.insert(signatures).values(signatureData);
    }

    // Si es final, generar PDF
    if (input.status === "final") {
      try {
        const pdfBuffer = await generateActaConstitutivaPDF({
          documentId: String(documentId),
          folio,
          organizacion: input.organizacion,
          fecha: input.fecha,
          lugar: input.lugar,
          objetivo: input.objetivo,
          miembros: input.miembros,
          firmas: input.firmas,
        });

        // Subir PDF a S3
        const { url: pdfUrl } = await storagePut(`documents/${folio}.pdf`, pdfBuffer, "application/pdf");

        // Actualizar documento con URL del PDF
        await db.update(documents).set({ pdfUrl }).where(eq(documents.id, documentId));

        return { success: true, documentId, folio, pdfUrl };
      } catch (error) {
        console.error("Error generando PDF:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al generar el PDF del documento",
        });
      }
    }

    return { success: true, documentId, folio };
  }),

  // Guardar Funciones del Comité
  saveFuncionesComite: protectedProcedure.input(funcionesComiteSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    let [catalog] = await db.select().from(formatCatalog).where(eq(formatCatalog.code, "FC")).limit(1);

    if (!catalog) {
      const [newCatalog] = await db.insert(formatCatalog).values({
        code: "FC",
        name: "Funciones del Comité",
        version: "1.0",
        versionDate: new Date(),
        reference: "NOM-035-STPS-2018",
      });
      catalog = { id: newCatalog.insertId, code: "FC" } as any;
    }

    const [lastDoc] = await db.select().from(documents).where(eq(documents.type, "funciones_comite")).orderBy(desc(documents.id)).limit(1);

    const consecutivo = lastDoc ? parseInt(lastDoc.folio.split("-")[1].split("/")[0]) + 1 : 1;
    const folio = generateFolio("funciones_comite", consecutivo);
    const qrCode = `${folio}-${Date.now()}`;

    const [result] = await db.insert(documents).values({
      formatCatalogId: catalog.id,
      folio,
      title: input.title,
      type: "funciones_comite",
      status: input.status,
      content: JSON.stringify(input),
      qrCode,
      createdBy: ctx.user.id,
      finalizedAt: input.status === "final" ? new Date() : null,
    });

    const documentId = result.insertId;

    for (const firma of input.firmas) {
      await db.insert(signatures).values({
        documentId,
        userId: firma.userId || null,
        signerName: firma.nombre,
        signerRole: firma.cargo,
        signatureImageUrl: firma.url,
        ipAddress: firma.ipAddress || null,
        deviceInfo: firma.deviceInfo || null,
      });
    }

    if (input.status === "final") {
      try {
        const pdfBuffer = await generateFuncionesComitePDF({
          documentId: String(documentId),
          folio,
          organizacion: input.organizacion,
          fecha: input.fecha,
          funciones: input.funciones,
          firmas: input.firmas,
        });

        const { url: pdfUrl } = await storagePut(`documents/${folio}.pdf`, pdfBuffer, "application/pdf");
        await db.update(documents).set({ pdfUrl }).where(eq(documents.id, documentId));

        return { success: true, documentId, folio, pdfUrl };
      } catch (error) {
        console.error("Error generando PDF:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al generar el PDF del documento",
        });
      }
    }

    return { success: true, documentId, folio };
  }),

  // Guardar Aceptación de Cargo
  saveAceptacionCargo: protectedProcedure.input(aceptacionCargoSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    let [catalog] = await db.select().from(formatCatalog).where(eq(formatCatalog.code, "ACC")).limit(1);

    if (!catalog) {
      const [newCatalog] = await db.insert(formatCatalog).values({
        code: "ACC",
        name: "Aceptación de Cargo",
        version: "1.0",
        versionDate: new Date(),
        reference: "NOM-035-STPS-2018",
      });
      catalog = { id: newCatalog.insertId, code: "ACC" } as any;
    }

    const [lastDoc] = await db.select().from(documents).where(eq(documents.type, "aceptacion_cargo")).orderBy(desc(documents.id)).limit(1);

    const consecutivo = lastDoc ? parseInt(lastDoc.folio.split("-")[1].split("/")[0]) + 1 : 1;
    const folio = generateFolio("aceptacion_cargo", consecutivo);
    const qrCode = `${folio}-${Date.now()}`;

    const [result] = await db.insert(documents).values({
      formatCatalogId: catalog.id,
      folio,
      title: input.title,
      type: "aceptacion_cargo",
      status: input.status,
      content: JSON.stringify(input),
      qrCode,
      createdBy: ctx.user.id,
      finalizedAt: input.status === "final" ? new Date() : null,
    });

    const documentId = result.insertId;

    for (const firma of input.firmas) {
      await db.insert(signatures).values({
        documentId,
        userId: firma.userId || null,
        signerName: firma.nombre,
        signerRole: firma.cargo,
        signatureImageUrl: firma.url,
        ipAddress: firma.ipAddress || null,
        deviceInfo: firma.deviceInfo || null,
      });
    }

    if (input.status === "final") {
      try {
        const pdfBuffer = await generateAceptacionCargoPDF({
          documentId: String(documentId),
          folio,
          organizacion: input.organizacion,
          fecha: input.fecha,
          nombreCompleto: input.nombreCompleto,
          cargo: input.cargo,
          departamento: input.departamento,
          curp: input.curp,
          email: input.email,
          telefono: input.telefono,
          declaracion: input.declaracion || "",
          firmas: input.firmas,
        });

        const { url: pdfUrl } = await storagePut(`documents/${folio}.pdf`, pdfBuffer, "application/pdf");
        await db.update(documents).set({ pdfUrl }).where(eq(documents.id, documentId));

        return { success: true, documentId, folio, pdfUrl };
      } catch (error) {
        console.error("Error generando PDF:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al generar el PDF del documento",
        });
      }
    }

    return { success: true, documentId, folio };
  }),

  // Guardar Acta de Recorrido NOM-019
  saveActaRecorrido: protectedProcedure.input(actaRecorridoSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    let [catalog] = await db.select().from(formatCatalog).where(eq(formatCatalog.code, "AR")).limit(1);

    if (!catalog) {
      const [newCatalog] = await db.insert(formatCatalog).values({
        code: "AR",
        name: "Acta de Recorrido NOM-019",
        version: "1.0",
        versionDate: new Date(),
        reference: "NOM-019-STPS-2011",
      });
      catalog = { id: newCatalog.insertId, code: "AR" } as any;
    }

    const [lastDoc] = await db.select().from(documents).where(eq(documents.type, "acta_recorrido")).orderBy(desc(documents.id)).limit(1);

    const consecutivo = lastDoc ? parseInt(lastDoc.folio.split("-")[1].split("/")[0]) + 1 : 1;
    const folio = generateFolio("acta_recorrido", consecutivo);
    const qrCode = `${folio}-${Date.now()}`;

    const [result] = await db.insert(documents).values({
      formatCatalogId: catalog.id,
      folio,
      title: input.title,
      type: "acta_recorrido",
      status: input.status,
      content: JSON.stringify(input),
      qrCode,
      createdBy: ctx.user.id,
      finalizedAt: input.status === "final" ? new Date() : null,
    });

    const documentId = result.insertId;

    // Guardar firmas con hash y timestamp
    const { prepareSignatureData } = await import('../lib/signatureUtils');
    for (const firma of input.firmas) {
      const signatureData = prepareSignatureData({
        documentId,
        userId: firma.userId || null,
        signerName: firma.nombre,
        signerRole: firma.cargo,
        signatureImageUrl: firma.url,
        ipAddress: firma.ipAddress || null,
        deviceInfo: firma.deviceInfo || null,
      });
      await db.insert(signatures).values(signatureData);
    }

    // Guardar participantes
    for (const participante of input.participantes) {
      await db.insert(documentParticipants).values({
        documentId,
        name: participante.nombre,
        role: participante.cargo,
        curp: participante.curp || null,
        ine: participante.ine || null,
      });
    }

    return { success: true, documentId, folio };
  }),

  // Guardar Acta Final de Resultados
  saveActaFinalResultados: protectedProcedure.input(actaFinalResultadosSchema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    let [catalog] = await db.select().from(formatCatalog).where(eq(formatCatalog.code, "AFR")).limit(1);

    if (!catalog) {
      const [newCatalog] = await db.insert(formatCatalog).values({
        code: "AFR",
        name: "Acta Final de Resultados",
        version: "1.0",
        versionDate: new Date(),
        reference: "NOM-035-STPS-2018",
      });
      catalog = { id: newCatalog.insertId, code: "AFR" } as any;
    }

    const [lastDoc] = await db.select().from(documents).where(eq(documents.type, "acta_final_resultados")).orderBy(desc(documents.id)).limit(1);

    const consecutivo = lastDoc ? parseInt(lastDoc.folio.split("-")[1].split("/")[0]) + 1 : 1;
    const folio = generateFolio("acta_final_resultados", consecutivo);
    const qrCode = `${folio}-${Date.now()}`;

    const [result] = await db.insert(documents).values({
      formatCatalogId: catalog.id,
      folio,
      title: input.title,
      type: "acta_final_resultados",
      status: input.status,
      content: JSON.stringify(input),
      qrCode,
      createdBy: ctx.user.id,
      finalizedAt: input.status === "final" ? new Date() : null,
    });

    const documentId = result.insertId;

    // Guardar firmas con hash y timestamp
    const { prepareSignatureData } = await import('../lib/signatureUtils');
    for (const firma of input.firmas) {
      const signatureData = prepareSignatureData({
        documentId,
        userId: firma.userId || null,
        signerName: firma.nombre,
        signerRole: firma.cargo,
        signatureImageUrl: firma.url,
        ipAddress: firma.ipAddress || null,
        deviceInfo: firma.deviceInfo || null,
      });
      await db.insert(signatures).values(signatureData);
    }

    return { success: true, documentId, folio };
  }),

  // Listar documentos
  list: protectedProcedure
    .input(
      z.object({
        type: z.string().optional(),
        status: z.string().optional(),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [];

      if (input.type) {
        conditions.push(eq(documents.type, input.type));
      }

      if (input.status) {
        conditions.push(eq(documents.status, input.status));
      }

      let query = db.select().from(documents).orderBy(desc(documents.createdAt)).limit(input.limit);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }
      
      const docs = await query;

      return docs;
    }),

  // Obtener documento por ID
  getById: protectedProcedure.input(z.number()).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
    const [doc] = await db.select().from(documents).where(eq(documents.id, input)).limit(1);
    if (!doc) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Documento no encontrado",
      });
    }
    return doc;
  }),

  // Generar PDF de Acta de Recorrido
  generateActaRecorridoPDF: protectedProcedure
    .input(z.number())
    .mutation(async ({ input: documentId }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener documento con firmas y participantes
      const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      if (!doc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Documento no encontrado" });
      }

      if (doc.type !== 'acta_recorrido') {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El documento no es un Acta de Recorrido" });
      }

      // Obtener firmas
      const sigs = await db
        .select()
        .from(signatures)
        .where(eq(signatures.documentId, documentId));

      // Obtener participantes
      const participants = await db
        .select()
        .from(documentParticipants)
        .where(eq(documentParticipants.documentId, documentId));

      // Parsear contenido JSON
      const content = JSON.parse(doc.content || '{}');

      // Importar generador PDF
      const { generateActaRecorridoPDF } = await import('../pdfGenerator');

      // Generar PDF
      const pdfBuffer = await generateActaRecorridoPDF({
        folio: doc.folio,
        title: doc.title,
        content,
        participants: participants.map(p => ({
          name: p.name,
          curp: p.curp,
          ine: p.ine,
          role: p.role,
        })),
        signatures: sigs.map(s => ({
          signerName: s.signerName,
          signerRole: s.signerRole,
          signatureImageUrl: s.signatureImageUrl,
          signedAt: s.signedAt,
          signatureHash: s.signatureHash,
        })),
        qrCode: doc.qrCode || `https://validate.nom035.mx/${doc.folio}`,
        createdAt: doc.createdAt,
      });

      // Subir PDF a S3
      const fileName = `documents/${doc.folio}-acta-recorrido.pdf`;
      const { url: pdfUrl } = await storagePut(fileName, pdfBuffer, 'application/pdf');

      // Actualizar documento con URL del PDF
      await db
        .update(documents)
        .set({ pdfUrl, updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      return { pdfUrl };
    }),

  // Generar PDF de Acta Final de Resultados
  generateActaFinalResultadosPDF: protectedProcedure
    .input(z.number())
    .mutation(async ({ input: documentId }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener documento con firmas
      const [doc] = await db
        .select()
        .from(documents)
        .where(eq(documents.id, documentId))
        .limit(1);

      if (!doc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Documento no encontrado" });
      }

      if (doc.type !== 'acta_final_resultados') {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El documento no es un Acta Final de Resultados" });
      }

      // Obtener firmas
      const sigs = await db
        .select()
        .from(signatures)
        .where(eq(signatures.documentId, documentId));

      // Parsear contenido JSON
      const content = JSON.parse(doc.content || '{}');

      // Importar generador PDF
      const { generateActaFinalResultadosPDF } = await import('../pdfGenerator');

      // Generar PDF
      const pdfBuffer = await generateActaFinalResultadosPDF({
        folio: doc.folio,
        title: doc.title,
        content,
        signatures: sigs.map(s => ({
          signerName: s.signerName,
          signerRole: s.signerRole,
          signatureImageUrl: s.signatureImageUrl,
          signedAt: s.signedAt,
          signatureHash: s.signatureHash,
        })),
        qrCode: doc.qrCode || `https://validate.nom035.mx/${doc.folio}`,
        createdAt: doc.createdAt,
      });

      // Subir PDF a S3
      const fileName = `documents/${doc.folio}-acta-final-resultados.pdf`;
      const { url: pdfUrl } = await storagePut(fileName, pdfBuffer, 'application/pdf');

      // Actualizar documento con URL del PDF
      await db
        .update(documents)
        .set({ pdfUrl, updatedAt: new Date() })
        .where(eq(documents.id, documentId));

      return { pdfUrl };
    }),
});
