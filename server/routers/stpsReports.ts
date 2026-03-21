import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { employees, complianceReports, formatCatalog, notifications } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { storagePut } from "../storage";
import Handlebars from "handlebars";
import { generatePDFFromHTML } from "../_core/pdfGenerator";
import { getDC2Template } from "./templates/dc2Template";
import { getDC3Template } from "./templates/dc3Template";
import { getDC4Template } from "./templates/dc4Template";

/**
 * Router para generación automatizada de reportes oficiales STPS
 * - DC-2: Constancia de Competencias o de Habilidades Laborales
 * - DC-3: Constancia de Habilidades Laborales
 * - DC-4: Lista de Constancias de Competencias o de Habilidades Laborales
 */

// Schema para DC-2 (Constancia de Competencias)
const dc2Schema = z.object({
  employeeId: z.number(),
  courseTitle: z.string().min(1),
  courseDuration: z.number(), // Horas
  startDate: z.string(),
  endDate: z.string(),
  grade: z.number().min(0).max(100),
  instructorName: z.string().min(1),
  instructorSignatureUrl: z.string().optional(),
  representativeName: z.string().min(1),
  representativeSignatureUrl: z.string().optional(),
  companyName: z.string().min(1),
  companyRfc: z.string().min(12).max(13),
  companyAddress: z.string().min(1),
});

// Schema para DC-3 (Constancia de Habilidades Laborales)
const dc3Schema = z.object({
  employeeId: z.number(),
  courseTitle: z.string().min(1),
  courseDuration: z.number(), // Horas
  startDate: z.string(),
  endDate: z.string(),
  grade: z.number().min(0).max(100),
  skills: z.array(z.string()).min(1), // Habilidades adquiridas
  instructorName: z.string().min(1),
  instructorSignatureUrl: z.string().optional(),
  representativeName: z.string().min(1),
  representativeSignatureUrl: z.string().optional(),
  companyName: z.string().min(1),
  companyRfc: z.string().min(12).max(13),
  companyAddress: z.string().min(1),
});

// Schema para DC-4 (Lista de Constancias)
const dc4Schema = z.object({
  reportTitle: z.string().min(1),
  reportPeriod: z.string().min(1),
  certificates: z.array(
    z.object({
      employeeId: z.number(),
      employeeName: z.string(),
      employeeCurp: z.string(),
      courseTitle: z.string(),
      courseDuration: z.number(),
      completionDate: z.string(),
      grade: z.number(),
      folio: z.string(),
    })
  ).min(1),
  companyName: z.string().min(1),
  companyRfc: z.string().min(12).max(13),
  companyAddress: z.string().min(1),
  representativeName: z.string().min(1),
  representativeSignatureUrl: z.string().optional(),
});

export const stpsReportsRouter = router({
  /**
   * Generar formato DC-2 (Constancia de Competencias)
   */
  generateDC2: protectedProcedure.input(dc2Schema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Obtener datos del empleado
    const [employee] = await db.select().from(employees).where(eq(employees.id, input.employeeId)).limit(1);
    if (!employee) throw new TRPCError({ code: "NOT_FOUND", message: "Empleado no encontrado" });

    // Obtener o crear catálogo de formato DC-2
    let [catalog] = await db.select().from(formatCatalog).where(eq(formatCatalog.code, "DC2")).limit(1);
    if (!catalog) {
      const [newCatalog] = await (db.insert(formatCatalog) as any).values({
        code: "DC2",
        name: "Constancia de Competencias o de Habilidades Laborales",
        version: "1.0",
        versionDate: new Date('2024-01-15'),
        reference: "STPS - Formato DC-2",
      });
      catalog = { id: newCatalog.insertId, code: "DC2" } as any;
    }

    // Generar folio único
    const [lastReport] = await db
      .select()
      .from(complianceReports)
      .where(eq(complianceReports.tipo, "dc2"))
      .orderBy(desc(complianceReports.id))
      .limit(1);

    const consecutivo = lastReport && lastReport.folio ? parseInt(lastReport.folio.split("-")[1].split("/")[0]) + 1 : 1;
    const year = new Date().getFullYear();
    const folio = `DC2-${String(consecutivo).padStart(4, "0")}/${year}`;

    // Generar código QR único
    const qrCode = `${folio}-${Date.now()}`;

    // Preparar datos para la plantilla
    const templateData = {
      folio,
      uuid: qrCode,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeCurp: employee.curp || "N/A",
      employeeRfc: employee.curp || "N/A", // RFC no existe en schema
      courseTitle: input.courseTitle,
      courseDuration: input.courseDuration,
      startDate: input.startDate,
      endDate: input.endDate,
      grade: input.grade,
      instructorName: input.instructorName,
      instructorSignature: input.instructorSignatureUrl || "",
      representativeName: input.representativeName,
      representativeSignature: input.representativeSignatureUrl || "",
      companyName: input.companyName,
      companyRfc: input.companyRfc,
      companyAddress: input.companyAddress,
      issueDate: new Date().toLocaleDateString("es-MX"),
    };

    // Generar HTML con plantilla (se creará en la siguiente fase)
    const template = Handlebars.compile(getDC2Template());
    const htmlContent = template(templateData);

    // Guardar reporte en BD
    const [result] = await (db.insert(complianceReports) as any).values({
      tipo: "dc2",
      folio,
      titulo: `DC-2: ${input.courseTitle} - ${employee.firstName} ${employee.lastName}`,
      data: templateData,
      uuid: qrCode,
      generatedBy: ctx.user.id,
      generatedByName: ctx.user.name || 'Usuario',
      generatedByEmail: ctx.user.email || '',
      
    });

    const reportId = result.insertId;

    // Generar PDF real con Puppeteer
    const pdfUrl = await generatePDFFromHTML(htmlContent, `dc2-${folio}`, {
      format: "Letter",
      orientation: "portrait",
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
    });

    // Actualizar reporte con URL del PDF
    await db.update(complianceReports).set({ data: { ...JSON.parse(JSON.stringify(templateData)), pdfUrl } }).where(eq(complianceReports.id, reportId));

    // Crear notificación para el usuario
    try {
      await (db.insert(notifications) as any).values({
        userId: ctx.user.id,
        type: "system",
        title: `Reporte ${folio.split('-')[0]} generado exitosamente`,
        message: `El reporte ${folio} para ${employee.firstName} ${employee.lastName} ha sido generado correctamente.`,
        relatedEntityType: "compliance_report",
        relatedEntityId: reportId,
        isRead: false,
      } as any);
    } catch (err) {
      console.error("[STPS Reports] Error al crear notificación:", err);
    }

    return {
      success: true,
      reportId,
      folio,
      pdfUrl,
      uuid: qrCode,
    };
  }),

  /**
   * Generar formato DC-3 (Constancia de Habilidades Laborales)
   */
  generateDC3: protectedProcedure.input(dc3Schema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Obtener datos del empleado
    const [employee] = await db.select().from(employees).where(eq(employees.id, input.employeeId)).limit(1);
    if (!employee) throw new TRPCError({ code: "NOT_FOUND", message: "Empleado no encontrado" });

    // Obtener o crear catálogo de formato DC-3
    let [catalog] = await db.select().from(formatCatalog).where(eq(formatCatalog.code, "DC3")).limit(1);
    if (!catalog) {
      const [newCatalog] = await (db.insert(formatCatalog) as any).values({
        code: "DC3",
        name: "Constancia de Habilidades Laborales",
        version: "1.0",
        versionDate: new Date('2024-01-15'),
        reference: "STPS - Formato DC-3",
      });
      catalog = { id: newCatalog.insertId, code: "DC3" } as any;
    }

    // Generar folio único
    const [lastReport] = await db
      .select()
      .from(complianceReports)
      .where(eq(complianceReports.tipo, "dc3"))
      .orderBy(desc(complianceReports.id))
      .limit(1);

    const consecutivo = lastReport && lastReport.folio ? parseInt(lastReport.folio.split("-")[1].split("/")[0]) + 1 : 1;
    const year = new Date().getFullYear();
    const folio = `DC3-${String(consecutivo).padStart(4, "0")}/${year}`;

    // Generar código QR único
    const qrCode = `${folio}-${Date.now()}`;

    // Preparar datos para la plantilla
    const templateData = {
      folio,
      uuid: qrCode,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeCurp: employee.curp || "N/A",
      employeeRfc: employee.curp || "N/A", // RFC no existe en schema
      courseTitle: input.courseTitle,
      courseDuration: input.courseDuration,
      startDate: input.startDate,
      endDate: input.endDate,
      grade: input.grade,
      skills: input.skills,
      instructorName: input.instructorName,
      instructorSignature: input.instructorSignatureUrl || "",
      representativeName: input.representativeName,
      representativeSignature: input.representativeSignatureUrl || "",
      companyName: input.companyName,
      companyRfc: input.companyRfc,
      companyAddress: input.companyAddress,
      issueDate: new Date().toLocaleDateString("es-MX"),
    };

    // Generar HTML con plantilla (se creará en la siguiente fase)
    const template = Handlebars.compile(getDC3Template());
    const htmlContent = template(templateData);

    // Guardar reporte en BD
    const [result] = await (db.insert(complianceReports) as any).values({
      tipo: "dc3",
      folio,
      titulo: `DC-3: ${input.courseTitle} - ${employee.firstName} ${employee.lastName}`,
      data: templateData,
      uuid: qrCode,
      generatedBy: ctx.user.id,
      generatedByName: ctx.user.name || 'Usuario',
      generatedByEmail: ctx.user.email || '',
      
    });

    const reportId = result.insertId;

    // Generar PDF real con Puppeteer
    const pdfUrl = await generatePDFFromHTML(htmlContent, folio, {
      format: "Letter",
      orientation: "portrait",
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
    });

    // Actualizar reporte con URL del PDF
    await db.update(complianceReports).set({ data: { ...JSON.parse(JSON.stringify(templateData)), pdfUrl } }).where(eq(complianceReports.id, reportId));

    // Crear notificación para el usuario
    try {
      await (db.insert(notifications) as any).values({
        userId: ctx.user.id,
        type: "system",
        title: `Reporte ${folio.split('-')[0]} generado exitosamente`,
        message: `El reporte ${folio} para ${employee.firstName} ${employee.lastName} ha sido generado correctamente.`,
        relatedEntityType: "compliance_report",
        relatedEntityId: reportId,
        isRead: false,
      } as any);
    } catch (err) {
      console.error("[STPS Reports] Error al crear notificación:", err);
    }

    return {
      success: true,
      reportId,
      folio,
      pdfUrl,
      uuid: qrCode,
    };
  }),

  /**
   * Generar formato DC-4 (Lista de Constancias)
   */
  generateDC4: protectedProcedure.input(dc4Schema).mutation(async ({ ctx, input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Obtener o crear catálogo de formato DC-4
    let [catalog] = await db.select().from(formatCatalog).where(eq(formatCatalog.code, "DC4")).limit(1);
    if (!catalog) {
      const [newCatalog] = await (db.insert(formatCatalog) as any).values({
        code: "DC4",
        name: "Lista de Constancias de Competencias o de Habilidades Laborales",
        version: "1.0",
        versionDate: new Date('2024-01-15'),
        reference: "STPS - Formato DC-4",
      });
      catalog = { id: newCatalog.insertId, code: "DC4" } as any;
    }

    // Generar folio único
    const [lastReport] = await db
      .select()
      .from(complianceReports)
      .where(eq(complianceReports.tipo, "dc4"))
      .orderBy(desc(complianceReports.id))
      .limit(1);

    const consecutivo = lastReport && lastReport.folio ? parseInt(lastReport.folio.split("-")[1].split("/")[0]) + 1 : 1;
    const year = new Date().getFullYear();
    const folio = `DC4-${String(consecutivo).padStart(4, "0")}/${year}`;

    // Generar código QR único
    const qrCode = `${folio}-${Date.now()}`;

    // Preparar datos para la plantilla
    const templateData = {
      folio,
      uuid: qrCode,
      reportTitle: input.reportTitle,
      reportPeriod: input.reportPeriod,
      certificates: input.certificates,
      totalCertificates: input.certificates.length,
      companyName: input.companyName,
      companyRfc: input.companyRfc,
      companyAddress: input.companyAddress,
      representativeName: input.representativeName,
      representativeSignature: input.representativeSignatureUrl || "",
      issueDate: new Date().toLocaleDateString("es-MX"),
    };

    // Generar HTML con plantilla (se creará en la siguiente fase)
    const template = Handlebars.compile(getDC4Template());
    const htmlContent = template(templateData);

    // Guardar reporte en BD
    const [result] = await (db.insert(complianceReports) as any).values({
      tipo: "dc4",
      folio,
      titulo: `DC-4: ${input.reportTitle}`,
      data: templateData,
      uuid: qrCode,
      generatedBy: ctx.user.id,
      generatedByName: ctx.user.name || 'Usuario',
      generatedByEmail: ctx.user.email || '',
      
    });

    const reportId = result.insertId;

    // Generar PDF real con Puppeteer
    const pdfUrl = await generatePDFFromHTML(htmlContent, folio, {
      format: "Letter",
      orientation: "portrait",
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
    });

    // Actualizar reporte con URL del PDF
    await db.update(complianceReports).set({ data: { ...JSON.parse(JSON.stringify(templateData)), pdfUrl } }).where(eq(complianceReports.id, reportId));

    // Crear notificación para el usuario
    try {
      await (db.insert(notifications) as any).values({
        userId: ctx.user.id,
        type: "system",
        title: `Reporte ${folio.split('-')[0]} generado exitosamente`,
        message: `El reporte ${folio} (${input.reportTitle}) con ${input.certificates.length} certificados ha sido generado correctamente.`,
        relatedEntityType: "compliance_report",
        relatedEntityId: reportId,
        isRead: false,
      } as any);
    } catch (err) {
      console.error("[STPS Reports] Error al crear notificación:", err);
    }

    return {
      success: true,
      reportId,
      folio,
      pdfUrl,
      uuid: qrCode,
    };
  }),

  /**
   * Listar reportes STPS generados
   */
  listReports: protectedProcedure
    .input(
      z.object({
        reportType: z.enum(["dc2", "dc3", "dc4"]).optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = input.reportType
        ? [eq(complianceReports.tipo, input.reportType)]
        : [];

      const reports = await db
        .select()
        .from(complianceReports)
        .where(and(...conditions))
        .orderBy(desc(complianceReports.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(complianceReports)
        .where(and(...conditions));

      return {
        reports,
        total: countResult.count,
        hasMore: input.offset + input.limit < countResult.count,
      };
    }),

  /**
   * Obtener reporte por ID
   */
  getReportById: protectedProcedure.input(z.object({ reportId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const [report] = await db.select().from(complianceReports).where(eq(complianceReports.id, input.reportId)).limit(1);

    if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Reporte no encontrado" });

    return report;
  }),
});
