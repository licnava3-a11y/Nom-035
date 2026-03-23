import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { cases, nmx025ManualEvidences, recognitions, users } from "../../drizzle/schema";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import { storagePut, storageDelete } from "../storage";
import PDFDocument from "pdfkit";

/**
 * Router para gestionar carpeta de evidencias NMX-R-025-SCFI-2015
 * Norma Mexicana de Igualdad Laboral y No Discriminación
 * 
 * Estructura por 5 ejes temáticos:
 * 1. Incorporación al trabajo (incorporacion)
 * 2. Igualdad y no discriminación (igualdad)
 * 3. Prevención de hostigamiento y acoso (hostigamiento)
 * 4. Accesibilidad y ergonomía (accesibilidad)
 * 5. Libertad sindical y negociación colectiva (libertad_sindical)
 */

interface Evidence {
  type: string;
  name: string;
  description: string;
  date: string;
  status: "pending" | "partial" | "complete" | "active";
  id?: number;
  fileUrl?: string;
  fileName?: string;
}

interface EjeEvidence {
  eje: string;
  title: string;
  description: string;
  evidences: Evidence[];
  status: "pending" | "partial" | "complete";
  required: boolean;
}

type EvidencesFolder = {
  [key: string]: EjeEvidence;
};

export const nmx025EvidencesFolder = router({
  /**
   * Obtener evidencias organizadas por eje temático NMX-025
   * Diferencia requisitos según tamaño de empresa
   */
  getEvidences: protectedProcedure
    .input(
      z.object({
        companySize: z.enum(["small", "medium", "large"]).default("large"),
      })
    )
    .query(async ({ input }) => {
      const { companySize } = input;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Estructura base de evidencias NMX-025
      const evidences: EvidencesFolder = {
        incorporacion: {
          eje: "incorporacion",
          title: "1. Incorporación al Trabajo",
          description:
            "Procesos de reclutamiento, selección y contratación libres de discriminación",
          evidences: [],
          status: "pending",
          required: true,
        },
        igualdad: {
          eje: "igualdad",
          title: "2. Igualdad y No Discriminación",
          description:
            "Igualdad salarial, oportunidades de desarrollo y promoción sin discriminación",
          evidences: [],
          status: "pending",
          required: true,
        },
        hostigamiento: {
          eje: "hostigamiento",
          title: "3. Prevención de Hostigamiento y Acoso",
          description:
            "Protocolos de prevención, atención y sanción de hostigamiento sexual y acoso laboral",
          evidences: [],
          status: "pending",
          required: true,
        },
        accesibilidad: {
          eje: "accesibilidad",
          title: "4. Accesibilidad y Ergonomía",
          description:
            "Instalaciones accesibles y condiciones ergonómicas para todas las personas",
          evidences: [],
          status: "pending",
          required: companySize !== "small", // No requerido para empresas pequeñas
        },
        libertad_sindical: {
          eje: "libertad_sindical",
          title: "5. Libertad Sindical y Negociación Colectiva",
          description:
            "Respeto a la libertad de asociación y negociación colectiva",
          evidences: [],
          status: "pending",
          required: companySize === "large", // Solo requerido para empresas grandes
        },
      };

      // 1. Incorporación al Trabajo
      evidences.incorporacion.evidences.push({
        type: "policy",
        name: "Política de Reclutamiento Inclusivo",
        description:
          "Documento que establece criterios de selección basados en competencias, sin discriminación por género, edad, orientación sexual, etc.",
        date: new Date().toISOString(),
        status: "pending",
      });

      evidences.incorporacion.evidences.push({
        type: "document",
        name: "Descripción de Puestos",
        description:
          "Perfiles de puesto con requisitos objetivos y competencias necesarias",
        date: new Date().toISOString(),
        status: "pending",
      });

      // 2. Igualdad y No Discriminación
      // Verificar brecha salarial desde datos reales
      const salaryGapQuery = await db.execute(sql`
        SELECT 
          AVG(CASE WHEN sexo = 'Masculino' THEN CAST(salario AS DECIMAL(10,2)) END) as avg_male,
          AVG(CASE WHEN sexo = 'Femenino' THEN CAST(salario AS DECIMAL(10,2)) END) as avg_female,
          COUNT(CASE WHEN sexo = 'Masculino' THEN 1 END) as count_male,
          COUNT(CASE WHEN sexo = 'Femenino' THEN 1 END) as count_female
        FROM users 
        WHERE salario IS NOT NULL AND sexo IN ('Masculino', 'Femenino')
      `);

      const salaryData = salaryGapQuery[0] as any;
      const avgMale = parseFloat(salaryData?.avg_male || 0);
      const avgFemale = parseFloat(salaryData?.avg_female || 0);
      const gapPercentage =
        avgMale > 0 ? (((avgMale - avgFemale) / avgMale) * 100).toFixed(2) : "0";

      evidences.igualdad.evidences.push({
        type: "analysis",
        name: "Análisis de Brecha Salarial",
        description: `Brecha salarial actual: ${gapPercentage}% (Hombres: $${avgMale.toFixed(0)}, Mujeres: $${avgFemale.toFixed(0)})`,
        date: new Date().toISOString(),
        status: parseFloat(gapPercentage) < 10 ? "complete" : "partial",
      });

      // Verificar distribución de mujeres en puestos directivos
      const leadershipQuery = await db.execute(sql`
        SELECT 
          COUNT(CASE WHEN sexo = 'Femenino' AND nivelJerarquico IN ('Directivo', 'Alta Dirección', 'Gerencial') THEN 1 END) as women_leaders,
          COUNT(CASE WHEN nivelJerarquico IN ('Directivo', 'Alta Dirección', 'Gerencial') THEN 1 END) as total_leaders
        FROM users 
        WHERE nivelJerarquico IS NOT NULL
      `);

      const leadershipData = leadershipQuery[0] as any;
      const womenLeaders = parseInt(leadershipData?.women_leaders || 0);
      const totalLeaders = parseInt(leadershipData?.total_leaders || 0);
      const womenLeadershipPercentage =
        totalLeaders > 0 ? ((womenLeaders / totalLeaders) * 100).toFixed(1) : "0";

      evidences.igualdad.evidences.push({
        type: "metrics",
        name: "Participación de Mujeres en Puestos Directivos",
        description: `${womenLeadershipPercentage}% de puestos directivos ocupados por mujeres (${womenLeaders}/${totalLeaders})`,
        date: new Date().toISOString(),
        status: parseFloat(womenLeadershipPercentage) >= 30 ? "complete" : "partial",
      });

      evidences.igualdad.evidences.push({
        type: "policy",
        name: "Política de Igualdad Salarial",
        description:
          "Documento que garantiza igual salario por trabajo de igual valor",
        date: new Date().toISOString(),
        status: "pending",
      });

      evidences.igualdad.status =
        parseFloat(gapPercentage) < 10 && parseFloat(womenLeadershipPercentage) >= 30
          ? "complete"
          : "partial";

      // 3. Prevención de Hostigamiento y Acoso
      // Contar casos de hostigamiento atendidos
      const hostigamientoQuery = await db.execute(sql`
        SELECT COUNT(*) as count
        FROM cases
        WHERE case_type IN ('mobbing', 'violence')
      `);

      const hostigamientoCases = (hostigamientoQuery[0] as any)?.count || 0;

      evidences.hostigamiento.evidences.push({
        type: "protocol",
        name: "Protocolo de Atención a Casos de Hostigamiento",
        description: "Procedimiento documentado para recibir, investigar y resolver denuncias",
        date: new Date().toISOString(),
        status: "active",
      });

      evidences.hostigamiento.evidences.push({
        type: "cases",
        name: "Registro de Casos Atendidos",
        description: `Total de casos de hostigamiento/acoso atendidos: ${hostigamientoCases}`,
        date: new Date().toISOString(),
        status: "active",
      });

      evidences.hostigamiento.evidences.push({
        type: "training",
        name: "Capacitación en Prevención de Hostigamiento",
        description: "Constancias de capacitación al personal sobre prevención y detección",
        date: new Date().toISOString(),
        status: "pending",
      });

      evidences.hostigamiento.status = hostigamientoCases > 0 ? "complete" : "partial";

      // 4. Accesibilidad y Ergonomía (si aplica)
      if (companySize !== "small") {
        evidences.accesibilidad.evidences.push({
          type: "inspection",
          name: "Evaluación de Accesibilidad de Instalaciones",
          description:
            "Reporte de cumplimiento de normas de accesibilidad (rampas, baños, señalización)",
          date: new Date().toISOString(),
          status: "pending",
        });

        evidences.accesibilidad.evidences.push({
          type: "program",
          name: "Programa de Ergonomía",
          description:
            "Plan de mejoras ergonómicas en estaciones de trabajo y prevención de riesgos",
          date: new Date().toISOString(),
          status: "pending",
        });
      }

      // 5. Libertad Sindical (solo empresas grandes)
      if (companySize === "large") {
        evidences.libertad_sindical.evidences.push({
          type: "policy",
          name: "Política de Respeto a la Libertad Sindical",
          description:
            "Documento que garantiza el derecho de asociación y negociación colectiva",
          date: new Date().toISOString(),
          status: "pending",
        });

        evidences.libertad_sindical.evidences.push({
          type: "document",
          name: "Acuerdos Colectivos Vigentes",
          description: "Contratos colectivos de trabajo registrados ante autoridades",
          date: new Date().toISOString(),
          status: "pending",
        });
      }

      // Agregar evidencias manuales cargadas
      const manualEvidencesList = await db
        .select()
        .from(nmx025ManualEvidences)
        .orderBy(nmx025ManualEvidences.uploadedAt);

      for (const manualEvidence of manualEvidencesList) {
        const eje = manualEvidence.eje;
        if (evidences[eje]) {
          evidences[eje].evidences.push({
            type: "manual",
            name: manualEvidence.title,
            description: manualEvidence.description || "",
            date: manualEvidence.uploadedAt?.toISOString() || "",
            status: "complete",
            id: manualEvidence.id,
            fileUrl: manualEvidence.fileUrl,
            fileName: manualEvidence.fileName,
          });

          // Actualizar status del eje si tiene evidencias manuales
          if (evidences[eje].status === "pending") {
            evidences[eje].status = "partial";
          }
        }
      }

      return evidences;
    }),

  /**
   * Subir evidencia manual para NMX-025
   */
  uploadEvidence: protectedProcedure
    .input(
      z.object({
        eje: z.enum([
          "incorporacion",
          "igualdad",
          "hostigamiento",
          "accesibilidad",
          "libertad_sindical",
        ]),
        title: z.string().min(1).max(255),
        description: z.string().optional(),
        fileData: z.string(), // Base64
        fileName: z.string(),
        fileType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { eje, title, description, fileData, fileName, fileType } = input;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Decodificar base64
      const buffer = Buffer.from(fileData, "base64");

      // Subir a S3
      const fileKey = `nmx025-evidences/${ctx.user.id}/${eje}/${Date.now()}-${fileName}`;
      const { url: fileUrl } = await storagePut(fileKey, buffer, fileType);

      // Guardar en BD
      const result = await (db.insert(nmx025ManualEvidences) as any).values({
        eje,
        title,
        description: description || null,
        fileUrl,
        fileKey,
        fileName,
        fileType,
        uploadedBy: ctx.user.id,
      });

      return {
        success: true,
        evidenceId: result[0].insertId,
        fileUrl,
      };
    }),

  /**
   * Eliminar evidencia manual de NMX-025
   */
  deleteEvidence: protectedProcedure
    .input(
      z.object({
        evidenceId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { evidenceId } = input;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar evidencia
      const evidence = await db
        .select()
        .from(nmx025ManualEvidences)
        .where(eq(nmx025ManualEvidences.id, evidenceId))
        .limit(1);

      if (evidence.length === 0) {
        throw new Error("Evidencia no encontrada");
      }

      // Verificar permisos (solo el que subió o admin)
      if (evidence[0].uploadedBy !== ctx.user.id && ctx.user.role !== "admin") {
        throw new Error("No tienes permisos para eliminar esta evidencia");
      }

      // Eliminar de S3
      await storageDelete(evidence[0].fileKey);

      // Eliminar de BD
      await db
        .delete(nmx025ManualEvidences)
        .where(eq(nmx025ManualEvidences.id, evidenceId));

      return { success: true };
    }),

  /**
   * Generar PDF de carpeta de evidencias NMX-025
   */
  generatePDF: protectedProcedure
    .input(
      z.object({
        companySize: z.enum(["small", "medium", "large"]).default("large"),
        companyName: z.string().default("Empresa"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { companySize, companyName } = input;
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener evidencias (inline para evitar createCaller)
      const evidencesData: EvidencesFolder = {
        incorporacion: {
          eje: "incorporacion",
          title: "1. Incorporación al Trabajo",
          description: "Procesos de reclutamiento, selección y contratación libres de discriminación",
          evidences: [],
          status: "pending",
          required: true,
        },
        igualdad: {
          eje: "igualdad",
          title: "2. Igualdad y No Discriminación",
          description: "Igualdad salarial, oportunidades de desarrollo y promoción sin discriminación",
          evidences: [],
          status: "pending",
          required: true,
        },
        hostigamiento: {
          eje: "hostigamiento",
          title: "3. Prevención de Hostigamiento y Acoso",
          description: "Protocolos de prevención, atención y sanción de hostigamiento sexual y acoso laboral",
          evidences: [],
          status: "pending",
          required: true,
        },
        accesibilidad: {
          eje: "accesibilidad",
          title: "4. Accesibilidad y Ergonomía",
          description: "Instalaciones accesibles y condiciones ergonómicas para todas las personas",
          evidences: [],
          status: "pending",
          required: companySize !== "small",
        },
        libertad_sindical: {
          eje: "libertad_sindical",
          title: "5. Libertad Sindical y Negociación Colectiva",
          description: "Respeto a la libertad de asociación y negociación colectiva",
          evidences: [],
          status: "pending",
          required: companySize === "large",
        },
      };

      // Agregar evidencias manuales
      const manualEvidencesList = await db
        .select()
        .from(nmx025ManualEvidences)
        .orderBy(nmx025ManualEvidences.uploadedAt);

      for (const manualEvidence of manualEvidencesList) {
        const eje = manualEvidence.eje;
        if (evidencesData[eje]) {
          evidencesData[eje].evidences.push({
            type: "manual",
            name: manualEvidence.title,
            description: manualEvidence.description || "",
            date: manualEvidence.uploadedAt?.toISOString() || "",
            status: "complete",
            id: manualEvidence.id,
            fileUrl: manualEvidence.fileUrl,
            fileName: manualEvidence.fileName,
          });
        }
      }

      // Crear PDF
      const doc = new PDFDocument({ size: "LETTER", margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));

      // Portada
      doc.fontSize(24).font("Helvetica-Bold").text("CARPETA DE EVIDENCIAS", {
        align: "center",
      });
      doc.moveDown();
      doc
        .fontSize(18)
        .text("NMX-R-025-SCFI-2015", { align: "center" })
        .moveDown(0.5);
      doc
        .fontSize(14)
        .font("Helvetica")
        .text("Igualdad Laboral y No Discriminación", { align: "center" })
        .moveDown(2);

      doc.fontSize(12).text(`Empresa: ${companyName}`, { align: "center" });
      doc
        .text(`Tamaño: ${companySize === "small" ? "Pequeña (≤15)" : companySize === "medium" ? "Mediana (16-50)" : "Grande (>50)"}`, {
          align: "center",
        })
        .moveDown(0.5);
      doc
        .text(`Fecha de generación: ${new Date().toLocaleDateString("es-MX")}`, {
          align: "center",
        })
        .moveDown(0.5);

      const folio = `CARP-NMX025-${Date.now()}`;
      doc.text(`Folio: ${folio}`, { align: "center" }).moveDown(3);

      doc
        .fontSize(10)
        .font("Helvetica-Oblique")
        .text(
          "Este documento contiene las evidencias de cumplimiento de la Norma Mexicana NMX-R-025-SCFI-2015",
          { align: "center" }
        );

      // Nueva página: Índice
      doc.addPage();
      doc.fontSize(18).font("Helvetica-Bold").text("ÍNDICE", { align: "center" });
      doc.moveDown(2);

      doc.fontSize(11).font("Helvetica");
      let pageNumber = 3;
      Object.values(evidencesData).forEach((eje: any) => {
        if (eje.required) {
          doc.text(`${eje.title} ................................ Pág. ${pageNumber}`);
          doc.moveDown(0.5);
          pageNumber++;
        }
      });

      // Contenido por eje
      Object.values(evidencesData).forEach((eje: any) => {
        if (!eje.required) return;

        doc.addPage();
        doc.fontSize(16).font("Helvetica-Bold").text(eje.title);
        doc.moveDown(0.5);
        doc.fontSize(10).font("Helvetica-Oblique").text(eje.description);
        doc.moveDown(1);

        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .text(`Estado: ${eje.status === "complete" ? "Completo ✓" : eje.status === "partial" ? "Parcial ⚠" : "Pendiente ✗"}`);
        doc.moveDown(1);

        if (eje.evidences.length > 0) {
          doc.fontSize(10).font("Helvetica");
          eje.evidences.forEach((evidence: any, idx: number) => {
            doc.font("Helvetica-Bold").text(`${idx + 1}. ${evidence.name}`);
            doc.font("Helvetica").text(`   ${evidence.description}`);
            doc
              .font("Helvetica-Oblique")
              .text(`   Tipo: ${evidence.type} | Estado: ${evidence.status}`);
            if (evidence.fileName) {
              doc.text(`   Archivo: ${evidence.fileName}`);
            }
            doc.moveDown(0.5);
          });
        } else {
          doc.fontSize(10).font("Helvetica-Oblique").text("Sin evidencias registradas");
        }
      });

      // Pie de página en todas las páginas
      const pages = doc.bufferedPageRange();
      for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);
        doc
          .fontSize(8)
          .font("Helvetica")
          .text(
            `Folio: ${folio} | Página ${i + 1} de ${pages.count}`,
            50,
            doc.page.height - 50,
            { align: "center" }
          );
      }

      doc.end();

      // Esperar a que termine
      const pdfBuffer = await new Promise<Buffer>((resolve) => {
        doc.on("end", () => {
          resolve(Buffer.concat(chunks));
        });
      });

      return {
        success: true,
        pdf: pdfBuffer.toString("base64"),
        fileName: `Carpeta_NMX025_${folio}.pdf`,
      };
    }),
});
