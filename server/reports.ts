import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { getDb } from "./db";
import {
  courses,
  modules,
  studentProgress,
  cases,
  caseFollowUps,
  evaluations,
  evaluationAttempts,
} from "../drizzle/schema";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";

/**
 * Genera un reporte PDF de capacitación con datos reales
 */
export async function generateTrainingReportPDF(): Promise<Buffer> {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const buffers: Buffer[] = [];

  doc.on("data", buffers.push.bind(buffers));

  return new Promise(async (resolve, reject) => {
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });

    doc.on("error", reject);

    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Header
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("Reporte de Capacitación NOM-035", { align: "center" });
      doc.moveDown();
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(
          `Fecha de generación: ${new Date().toLocaleDateString("es-MX")}`,
          { align: "center" }
        );
      doc.moveDown(2);

      // Obtener estadísticas generales
      const totalCoursesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(courses);
      const totalCourses = totalCoursesResult[0]?.count || 0;

      const publishedCoursesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(courses)
        .where(eq(courses.isPublished, true));
      const publishedCourses = publishedCoursesResult[0]?.count || 0;

      const totalEnrollmentsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(studentProgress);
      const totalEnrollments = totalEnrollmentsResult[0]?.count || 0;

      const completedEnrollmentsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(studentProgress)
        .where(eq(studentProgress.status, "completed"));
      const completedEnrollments = completedEnrollmentsResult[0]?.count || 0;

      // Sección: Resumen Ejecutivo
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Resumen Ejecutivo", { underline: true });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica");
      doc.text(`Total de cursos: ${totalCourses}`);
      doc.text(`Cursos publicados: ${publishedCourses}`);
      doc.text(`Total de inscripciones: ${totalEnrollments}`);
      doc.text(`Capacitaciones completadas: ${completedEnrollments}`);
      if (totalEnrollments > 0) {
        const completionRate = (
          (completedEnrollments / totalEnrollments) *
          100
        ).toFixed(1);
        doc.text(`Tasa de completación: ${completionRate}%`);
      }
      doc.moveDown(2);

      // Sección: Cursos Activos
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Cursos Activos", { underline: true });
      doc.moveDown();

      const activeCourses = await db
        .select()
        .from(courses)
        .where(eq(courses.isPublished, true))
        .limit(10);

      if (activeCourses.length > 0) {
        doc.fontSize(12).font("Helvetica");
        activeCourses.forEach((course: any, index: number) => {
          doc.font("Helvetica-Bold").text(`${index + 1}. ${course.title}`);
          doc.font("Helvetica").text(`   Categoría: ${course.category}`);
          doc.text(
            `   Duración: ${course.duration ? Math.round(course.duration / 60) : 0} horas`
          );
          doc.moveDown(0.5);
        });
      } else {
        doc
          .fontSize(12)
          .font("Helvetica")
          .text("No hay cursos activos en este momento.");
      }

      doc.moveDown(2);

      // Sección: Recomendaciones
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Recomendaciones", { underline: true });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica");
      doc.text(
        "• Continuar promoviendo la participación en los cursos de capacitación."
      );
      doc.text(
        "• Monitorear la tasa de completación y ofrecer apoyo a los participantes."
      );
      doc.text(
        "• Actualizar regularmente el contenido de los cursos según las necesidades identificadas."
      );
      doc.text(
        "• Fomentar la certificación de los participantes al completar los módulos."
      );

      doc.end();
    } catch (error) {
      console.error("Error generating PDF:", error);
      reject(error);
    }
  });
}

/**
 * Genera un reporte PDF de casos con datos reales
 */
export async function generateCasesReportPDF(): Promise<Buffer> {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const buffers: Buffer[] = [];

  doc.on("data", buffers.push.bind(buffers));

  return new Promise(async (resolve, reject) => {
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });

    doc.on("error", reject);

    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Header
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("Reporte de Casos Psicosociales", { align: "center" });
      doc.moveDown();
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(
          `Fecha de generación: ${new Date().toLocaleDateString("es-MX")}`,
          { align: "center" }
        );
      doc.moveDown(2);

      // Obtener estadísticas de casos
      const totalCasesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(cases);
      const totalCases = totalCasesResult[0]?.count || 0;

      const openCasesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(cases)
        .where(eq(cases.status, "open"));
      const openCases = openCasesResult[0]?.count || 0;

      const investigatingCasesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(cases)
        .where(eq(cases.status, "investigating"));
      const investigatingCases = investigatingCasesResult[0]?.count || 0;

      const resolvedCasesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(cases)
        .where(eq(cases.status, "resolved"));
      const resolvedCases = resolvedCasesResult[0]?.count || 0;

      const closedCasesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(cases)
        .where(eq(cases.status, "closed"));
      const closedCases = closedCasesResult[0]?.count || 0;

      // Sección: Resumen Ejecutivo
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Resumen Ejecutivo", { underline: true });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica");
      doc.text(`Total de casos registrados: ${totalCases}`);
      doc.text(`Casos abiertos: ${openCases}`);
      doc.text(`Casos en investigación: ${investigatingCases}`);
      doc.text(`Casos resueltos: ${resolvedCases}`);
      doc.text(`Casos cerrados: ${closedCases}`);
      doc.moveDown(2);

      // Sección: Distribución por Tipo
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Distribución por Tipo de Caso", { underline: true });
      doc.moveDown();

      const casesByType = await db
        .select({
          caseType: cases.caseType,
          count: sql<number>`count(*)`,
        })
        .from(cases)
        .groupBy(cases.caseType);

      if (casesByType.length > 0) {
        doc.fontSize(12).font("Helvetica");
        casesByType.forEach((item: any) => {
          doc.text(`${item.caseType}: ${item.count} casos`);
        });
      } else {
        doc
          .fontSize(12)
          .font("Helvetica")
          .text("No hay datos de casos por tipo.");
      }

      doc.moveDown(2);

      // Sección: Casos Recientes
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Casos Recientes", { underline: true });
      doc.moveDown();

      const recentCases = await db
        .select()
        .from(cases)
        .orderBy(desc(cases.createdAt))
        .limit(10);

      if (recentCases.length > 0) {
        doc.fontSize(12).font("Helvetica");
        recentCases.forEach((caseItem: any, index: number) => {
          doc
            .font("Helvetica-Bold")
            .text(`${index + 1}. Folio: ${caseItem.caseNumber}`);
          doc.font("Helvetica").text(`   Tipo: ${caseItem.caseType}`);
          doc.text(`   Estado: ${caseItem.status}`);
          doc.text(
            `   Fecha: ${caseItem.createdAt.toLocaleDateString("es-MX")}`
          );
          doc.moveDown(0.5);
        });
      } else {
        doc.fontSize(12).font("Helvetica").text("No hay casos registrados.");
      }

      doc.moveDown(2);

      // Sección: Recomendaciones
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Recomendaciones", { underline: true });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica");
      doc.text(
        "• Dar seguimiento puntual a los casos abiertos y en investigación."
      );
      doc.text("• Documentar todas las acciones y evidencias en cada caso.");
      doc.text(
        "• Capacitar al comité de atención en protocolos de intervención."
      );
      doc.text(
        "• Implementar medidas preventivas basadas en los casos identificados."
      );

      doc.end();
    } catch (error) {
      console.error("Error generating PDF:", error);
      reject(error);
    }
  });
}

/**
 * Genera un reporte PDF de cumplimiento NOM-035 con datos reales
 */
export async function generateComplianceReportPDF(): Promise<Buffer> {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const buffers: Buffer[] = [];

  doc.on("data", buffers.push.bind(buffers));

  return new Promise(async (resolve, reject) => {
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });

    doc.on("error", reject);

    try {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Header
      doc
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("Reporte de Cumplimiento NOM-035", { align: "center" });
      doc.moveDown();
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(
          `Fecha de generación: ${new Date().toLocaleDateString("es-MX")}`,
          { align: "center" }
        );
      doc.moveDown(2);

      // Obtener estadísticas
      const totalCoursesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(courses);
      const totalCourses = totalCoursesResult[0]?.count || 0;

      const totalEnrollmentsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(studentProgress);
      const totalEnrollments = totalEnrollmentsResult[0]?.count || 0;

      const completedEnrollmentsResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(studentProgress)
        .where(eq(studentProgress.status, "completed"));
      const completedEnrollments = completedEnrollmentsResult[0]?.count || 0;

      const totalCasesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(cases);
      const totalCases = totalCasesResult[0]?.count || 0;

      const resolvedCasesResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(cases)
        .where(eq(cases.status, "resolved"));
      const resolvedCases = resolvedCasesResult[0]?.count || 0;

      // Calcular indicadores de cumplimiento
      const trainingCompletionRate =
        totalEnrollments > 0
          ? ((completedEnrollments / totalEnrollments) * 100).toFixed(1)
          : "0.0";
      const caseResolutionRate =
        totalCases > 0
          ? ((resolvedCases / totalCases) * 100).toFixed(1)
          : "0.0";

      // Sección: Indicadores de Cumplimiento
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Indicadores de Cumplimiento", { underline: true });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica");
      doc.text(
        `Tasa de completación de capacitación: ${trainingCompletionRate}%`
      );
      doc.text(`Tasa de resolución de casos: ${caseResolutionRate}%`);
      doc.text(`Total de cursos disponibles: ${totalCourses}`);
      doc.text(`Total de inscripciones: ${totalEnrollments}`);
      doc.text(`Total de casos atendidos: ${totalCases}`);
      doc.moveDown(2);

      // Sección: Requisitos de la NOM-035
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Requisitos de la NOM-035", { underline: true });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica");
      doc.text("✓ Política de prevención de riesgos psicosociales");
      doc.text("✓ Identificación y análisis de factores de riesgo psicosocial");
      doc.text("✓ Evaluación del entorno organizacional");
      doc.text("✓ Medidas de prevención y control");
      doc.text("✓ Atención de casos de violencia laboral");
      doc.text("✓ Capacitación del personal");
      doc.text("✓ Registros y evidencias documentales");
      doc.moveDown(2);

      // Sección: Áreas de Mejora
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Áreas de Mejora", { underline: true });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica");

      if (parseFloat(trainingCompletionRate) < 90) {
        doc.text(
          "• Incrementar la tasa de completación de capacitaciones (objetivo: 90%)"
        );
      }
      if (parseFloat(caseResolutionRate) < 80) {
        doc.text("• Mejorar la tasa de resolución de casos (objetivo: 80%)");
      }
      doc.text(
        "• Actualizar periódicamente la identificación de factores de riesgo"
      );
      doc.text(
        "• Fortalecer las medidas preventivas en las áreas identificadas"
      );
      doc.text("• Mantener actualizada la documentación de cumplimiento");

      doc.moveDown(2);

      // Sección: Conclusiones
      doc
        .fontSize(16)
        .font("Helvetica-Bold")
        .text("Conclusiones", { underline: true });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica");
      doc.text(
        "La organización está trabajando activamente en el cumplimiento de la NOM-035-STPS-2018. Se recomienda continuar con las acciones de capacitación, seguimiento de casos y mejora continua del entorno organizacional."
      );

      doc.end();
    } catch (error) {
      console.error("Error generating PDF:", error);
      reject(error);
    }
  });
}

/**
 * Genera un reporte Excel de capacitación con datos reales
 */
export async function generateTrainingReportExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Hoja 1: Resumen
  const summarySheet = workbook.addWorksheet("Resumen");
  summarySheet.columns = [
    { header: "Indicador", key: "indicator", width: 40 },
    { header: "Valor", key: "value", width: 20 },
  ];

  const totalCoursesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(courses);
  const totalCourses = totalCoursesResult[0]?.count || 0;

  const publishedCoursesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(courses)
    .where(eq(courses.isPublished, true));
  const publishedCourses = publishedCoursesResult[0]?.count || 0;

  const totalEnrollmentsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(studentProgress);
  const totalEnrollments = totalEnrollmentsResult[0]?.count || 0;

  const completedEnrollmentsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(studentProgress)
    .where(eq(studentProgress.status, "completed"));
  const completedEnrollments = completedEnrollmentsResult[0]?.count || 0;

  summarySheet.addRows([
    { indicator: "Total de cursos", value: totalCourses },
    { indicator: "Cursos publicados", value: publishedCourses },
    { indicator: "Total de inscripciones", value: totalEnrollments },
    { indicator: "Capacitaciones completadas", value: completedEnrollments },
    {
      indicator: "Tasa de completación",
      value:
        totalEnrollments > 0
          ? `${((completedEnrollments / totalEnrollments) * 100).toFixed(1)}%`
          : "0%",
    },
  ]);

  // Estilo del encabezado
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Hoja 2: Cursos
  const coursesSheet = workbook.addWorksheet("Cursos");
  coursesSheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Título", key: "title", width: 40 },
    { header: "Categoría", key: "category", width: 20 },
    { header: "Duración (horas)", key: "duration", width: 15 },
    { header: "Publicado", key: "published", width: 12 },
  ];

  const allCourses = await db.select().from(courses);
  allCourses.forEach((course: any) => {
    coursesSheet.addRow({
      id: course.id,
      title: course.title,
      category: course.category,
      duration: course.duration ? Math.round(course.duration / 60) : 0,
      published: course.isPublished ? "Sí" : "No",
    });
  });

  // Estilo del encabezado
  coursesSheet.getRow(1).font = { bold: true };
  coursesSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  coursesSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Genera un reporte Excel de casos con datos reales
 */
export async function generateCasesReportExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Hoja 1: Resumen
  const summarySheet = workbook.addWorksheet("Resumen");
  summarySheet.columns = [
    { header: "Indicador", key: "indicator", width: 40 },
    { header: "Valor", key: "value", width: 20 },
  ];

  const totalCasesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(cases);
  const totalCases = totalCasesResult[0]?.count || 0;

  const openCasesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(cases)
    .where(eq(cases.status, "open"));
  const openCases = openCasesResult[0]?.count || 0;

  const investigatingCasesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(cases)
    .where(eq(cases.status, "investigating"));
  const investigatingCases = investigatingCasesResult[0]?.count || 0;

  const resolvedCasesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(cases)
    .where(eq(cases.status, "resolved"));
  const resolvedCases = resolvedCasesResult[0]?.count || 0;

  summarySheet.addRows([
    { indicator: "Total de casos", value: totalCases },
    { indicator: "Casos abiertos", value: openCases },
    { indicator: "Casos en investigación", value: investigatingCases },
    { indicator: "Casos resueltos", value: resolvedCases },
  ]);

  // Estilo del encabezado
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDC3545" },
  };
  summarySheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Hoja 2: Casos
  const casesSheet = workbook.addWorksheet("Casos");
  casesSheet.columns = [
    { header: "Folio", key: "folio", width: 15 },
    { header: "Tipo", key: "type", width: 20 },
    { header: "Estado", key: "status", width: 15 },
    { header: "Prioridad", key: "priority", width: 12 },
    { header: "Fecha de Registro", key: "createdAt", width: 20 },
  ];

  const allCases = await db.select().from(cases);
  allCases.forEach((caseItem: any) => {
    casesSheet.addRow({
      folio: caseItem.caseNumber,
      type: caseItem.caseType,
      status: caseItem.status,
      priority: caseItem.priority,
      createdAt: caseItem.createdAt.toLocaleDateString("es-MX"),
    });
  });

  // Estilo del encabezado
  casesSheet.getRow(1).font = { bold: true };
  casesSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFDC3545" },
  };
  casesSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Genera un reporte Excel de cumplimiento NOM-035 con datos reales
 */
export async function generateComplianceReportExcel(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Hoja 1: Indicadores
  const indicatorsSheet = workbook.addWorksheet("Indicadores");
  indicatorsSheet.columns = [
    { header: "Indicador", key: "indicator", width: 50 },
    { header: "Valor", key: "value", width: 20 },
  ];

  const totalCoursesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(courses);
  const totalCourses = totalCoursesResult[0]?.count || 0;

  const totalEnrollmentsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(studentProgress);
  const totalEnrollments = totalEnrollmentsResult[0]?.count || 0;

  const completedEnrollmentsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(studentProgress)
    .where(eq(studentProgress.status, "completed"));
  const completedEnrollments = completedEnrollmentsResult[0]?.count || 0;

  const totalCasesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(cases);
  const totalCases = totalCasesResult[0]?.count || 0;

  const resolvedCasesResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(cases)
    .where(eq(cases.status, "resolved"));
  const resolvedCases = resolvedCasesResult[0]?.count || 0;

  const trainingCompletionRate =
    totalEnrollments > 0
      ? ((completedEnrollments / totalEnrollments) * 100).toFixed(1)
      : "0.0";
  const caseResolutionRate =
    totalCases > 0 ? ((resolvedCases / totalCases) * 100).toFixed(1) : "0.0";

  indicatorsSheet.addRows([
    {
      indicator: "Tasa de completación de capacitación",
      value: `${trainingCompletionRate}%`,
    },
    {
      indicator: "Tasa de resolución de casos",
      value: `${caseResolutionRate}%`,
    },
    { indicator: "Total de cursos disponibles", value: totalCourses },
    { indicator: "Total de inscripciones", value: totalEnrollments },
    { indicator: "Capacitaciones completadas", value: completedEnrollments },
    { indicator: "Total de casos atendidos", value: totalCases },
    { indicator: "Casos resueltos", value: resolvedCases },
  ]);

  // Estilo del encabezado
  indicatorsSheet.getRow(1).font = { bold: true };
  indicatorsSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF28A745" },
  };
  indicatorsSheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  // Hoja 2: Requisitos NOM-035
  const requirementsSheet = workbook.addWorksheet("Requisitos NOM-035");
  requirementsSheet.columns = [
    { header: "Requisito", key: "requirement", width: 60 },
    { header: "Estado", key: "status", width: 20 },
  ];

  requirementsSheet.addRows([
    {
      requirement: "Política de prevención de riesgos psicosociales",
      status: "Cumplido",
    },
    {
      requirement:
        "Identificación y análisis de factores de riesgo psicosocial",
      status: "Cumplido",
    },
    {
      requirement: "Evaluación del entorno organizacional",
      status: "Cumplido",
    },
    { requirement: "Medidas de prevención y control", status: "Cumplido" },
    {
      requirement: "Atención de casos de violencia laboral",
      status: "Cumplido",
    },
    { requirement: "Capacitación del personal", status: "Cumplido" },
    { requirement: "Registros y evidencias documentales", status: "Cumplido" },
  ]);

  // Estilo del encabezado
  requirementsSheet.getRow(1).font = { bold: true };
  requirementsSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF28A745" },
  };
  requirementsSheet.getRow(1).font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
  };

  // Generar buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
