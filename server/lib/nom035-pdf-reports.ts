import PDFDocument from "pdfkit";
import * as calculator from "./nom035-calculator";

interface ReportData {
  employeeName: string;
  employeeId: string;
  department?: string;
  position?: string;
  surveyType: "guia_i" | "guia_ii" | "guia_iii";
  surveyDate: Date;
  answers: Array<{
    questionId: number;
    questionText: string;
    answer: string;
    isReverseScored: boolean;
    category: string;
    domain: string;
    dimension: string;
  }>;
}

interface AggregatedReportData {
  organizationName: string;
  reportDate: Date;
  totalEmployees: number;
  totalResponses: number;
  coverage: number;
  riskDistribution: Record<string, number>;
  averageRiskByCategory: Array<{ category: string; averageScore: number }>;
  atsDetected: number;
}

/**
 * Genera reporte individual PDF con resultados de encuesta NOM-035
 */
export async function generateIndividualReport(
  data: ReportData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Calcular resultados (solo para Guía II y III)
      if (data.surveyType === "guia_i") {
        throw new Error("Use generateGuideIReport para reportes de Guía I");
      }
      const result = calculator.calculateSurveyResult(
        data.answers,
        data.surveyType
      );
      const riskColor = calculator.getRiskColorHex(result.finalRiskColor);

      // Header
      doc
        .fontSize(20)
        .fillColor("#000000")
        .text("Reporte Individual NOM-035-STPS-2018", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .fillColor("#666666")
        .text("Identificación y Análisis de Factores de Riesgo Psicosocial", {
          align: "center",
        });
      doc.moveDown(2);

      // Información del trabajador
      doc
        .fontSize(14)
        .fillColor("#000000")
        .text("Información del Trabajador", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor("#333333");
      doc.text(`Nombre: ${data.employeeName}`);
      doc.text(`ID: ${data.employeeId}`);
      if (data.department) doc.text(`Departamento: ${data.department}`);
      if (data.position) doc.text(`Puesto: ${data.position}`);
      doc.text(
        `Fecha de evaluación: ${data.surveyDate.toLocaleDateString("es-MX")}`
      );
      doc.text(
        `Guía de referencia: ${data.surveyType === "guia_ii" ? "II (16-50 trabajadores)" : "III (51+ trabajadores)"}`
      );
      doc.moveDown(2);

      // Resultado general con colorimetría
      doc
        .fontSize(14)
        .fillColor("#000000")
        .text("Resultado General", { underline: true });
      doc.moveDown(0.5);

      // Cuadro de nivel de riesgo con color oficial
      const boxY = doc.y;
      doc.rect(50, boxY, 200, 60).fillAndStroke(riskColor, "#000000");
      doc
        .fontSize(16)
        .fillColor("#FFFFFF")
        .text(result.finalRiskLevel.toUpperCase(), 60, boxY + 10, {
          width: 180,
        });
      doc
        .fontSize(12)
        .fillColor("#FFFFFF")
        .text(
          calculator.getRiskLevelLabel(result.finalRiskLevel),
          60,
          boxY + 35,
          { width: 180 }
        );

      // Calificación final
      doc
        .fillColor("#000000")
        .fontSize(11)
        .text(
          `Calificación final: ${result.finalScore} puntos`,
          270,
          boxY + 20
        );
      doc.moveDown(5);

      // Resultados por categoría
      if (result.categories.length > 0) {
        doc
          .fontSize(14)
          .fillColor("#000000")
          .text("Resultados por Categoría", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#333333");

        result.categories.forEach((cat: any) => {
          const surveyTypeForCalc =
            data.surveyType === "guia_i" ? "guia_ii" : data.surveyType;
          const catRisk = calculator.determineRiskLevel(
            cat.score,
            surveyTypeForCalc
          );
          const catColor = calculator.getRiskColorHex(catRisk.color);

          doc.text(`${cat.category}: ${cat.score.toFixed(1)} puntos`, {
            continued: true,
          });
          doc
            .fillColor(catColor)
            .text(` (${catRisk.label})`, { continued: false });
          doc.fillColor("#333333");
        });
        doc.moveDown(1.5);
      }

      // Acciones recomendadas
      doc.addPage();
      doc
        .fontSize(14)
        .fillColor("#000000")
        .text("Acciones Recomendadas", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#333333");

      result.recommendedActions.forEach((action: any, index: number) => {
        doc.text(`${index + 1}. ${action}`, { align: "justify" });
        doc.moveDown(0.3);
      });

      // Footer
      doc.fontSize(8).fillColor("#999999");
      doc.text(
        "Este reporte es confidencial y debe ser utilizado únicamente para cumplir con la NOM-035-STPS-2018.",
        50,
        doc.page.height - 70,
        { align: "center", width: doc.page.width - 100 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Genera reporte individual de Guía I (ATS) con detección
 */
export async function generateGuideIReport(
  data: ReportData,
  atsDetected: boolean
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Header
      doc
        .fontSize(20)
        .fillColor("#000000")
        .text("Reporte de Acontecimientos Traumáticos Severos", {
          align: "center",
        });
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .fillColor("#666666")
        .text("Guía de Referencia I - NOM-035-STPS-2018", { align: "center" });
      doc.moveDown(2);

      // Información del trabajador
      doc
        .fontSize(14)
        .fillColor("#000000")
        .text("Información del Trabajador", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor("#333333");
      doc.text(`Nombre: ${data.employeeName}`);
      doc.text(`ID: ${data.employeeId}`);
      if (data.department) doc.text(`Departamento: ${data.department}`);
      if (data.position) doc.text(`Puesto: ${data.position}`);
      doc.text(
        `Fecha de evaluación: ${data.surveyDate.toLocaleDateString("es-MX")}`
      );
      doc.moveDown(2);

      // Resultado de detección ATS
      doc
        .fontSize(14)
        .fillColor("#000000")
        .text("Resultado de Evaluación", { underline: true });
      doc.moveDown(0.5);

      if (atsDetected) {
        // Cuadro rojo de alerta
        const boxY = doc.y;
        doc
          .rect(50, boxY, doc.page.width - 100, 80)
          .fillAndStroke("#EF4444", "#000000");
        doc
          .fontSize(16)
          .fillColor("#FFFFFF")
          .text("ATENCIÓN REQUERIDA", 60, boxY + 15, {
            width: doc.page.width - 120,
            align: "center",
          });
        doc
          .fontSize(11)
          .fillColor("#FFFFFF")
          .text(
            "Se ha detectado un acontecimiento traumático severo. El comité de seguridad y salud debe brindar atención inmediata.",
            60,
            boxY + 45,
            { width: doc.page.width - 120, align: "center" }
          );
        doc.moveDown(6);

        // Acciones inmediatas
        doc
          .fontSize(14)
          .fillColor("#000000")
          .text("Acciones Inmediatas Requeridas", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#333333");
        doc.text(
          "1. Notificar al comité de atención de factores de riesgo psicosocial"
        );
        doc.text("2. Brindar apoyo psicológico al trabajador afectado");
        doc.text(
          "3. Evaluar la necesidad de canalización a servicios especializados"
        );
        doc.text(
          "4. Implementar medidas preventivas para evitar situaciones similares"
        );
        doc.text("5. Documentar el caso y las acciones tomadas");
      } else {
        // Cuadro verde de no detección
        const boxY = doc.y;
        doc
          .rect(50, boxY, doc.page.width - 100, 60)
          .fillAndStroke("#10B981", "#000000");
        doc
          .fontSize(16)
          .fillColor("#FFFFFF")
          .text("NO SE DETECTÓ ATS", 60, boxY + 10, {
            width: doc.page.width - 120,
            align: "center",
          });
        doc
          .fontSize(11)
          .fillColor("#FFFFFF")
          .text(
            "No se identificaron acontecimientos traumáticos severos en el trabajador.",
            60,
            boxY + 35,
            { width: doc.page.width - 120, align: "center" }
          );
        doc.moveDown(5);
      }

      // Footer
      doc.fontSize(8).fillColor("#999999");
      doc.text(
        "Este reporte es confidencial y debe ser utilizado únicamente para cumplir con la NOM-035-STPS-2018.",
        50,
        doc.page.height - 70,
        { align: "center", width: doc.page.width - 100 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Genera reporte agregado organizacional con estadísticas
 */
export async function generateAggregatedReport(
  data: AggregatedReportData
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Header
      doc
        .fontSize(20)
        .fillColor("#000000")
        .text("Reporte Organizacional NOM-035-STPS-2018", { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .fillColor("#666666")
        .text("Estadísticas Agregadas de Factores de Riesgo Psicosocial", {
          align: "center",
        });
      doc.moveDown(2);

      // Información general
      doc
        .fontSize(14)
        .fillColor("#000000")
        .text("Información General", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor("#333333");
      doc.text(`Organización: ${data.organizationName}`);
      doc.text(
        `Fecha del reporte: ${data.reportDate.toLocaleDateString("es-MX")}`
      );
      doc.text(`Total de trabajadores: ${data.totalEmployees}`);
      doc.text(`Respuestas recibidas: ${data.totalResponses}`);
      doc.text(`Cobertura: ${data.coverage.toFixed(1)}%`);
      if (data.atsDetected > 0) {
        doc
          .fillColor("#EF4444")
          .text(`Casos ATS detectados: ${data.atsDetected}`, {
            continued: false,
          });
        doc.fillColor("#333333");
      }
      doc.moveDown(2);

      // Leyenda de niveles de riesgo NOM-035-STPS-2018
      doc
        .fontSize(12)
        .fillColor("#000000")
        .text("Leyenda de Niveles de Riesgo NOM-035-STPS-2018", {
          underline: true,
        });
      doc.moveDown(0.5);
      doc.fontSize(9).fillColor("#666666");
      doc.text(
        "Nulo: No requiere acciones correctivas | Bajo: Riesgo mínimo | Medio: Acciones en 1 año | Alto: Intervención urgente | Muy Alto: Intervención inmediata"
      );
      doc.moveDown(1.5);

      // Distribución de niveles de riesgo
      doc
        .fontSize(14)
        .fillColor("#000000")
        .text("Distribución de Niveles de Riesgo", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#333333");

      Object.entries(data.riskDistribution).forEach(
        ([level, count]: [string, any]) => {
          const percentage = ((count / data.totalResponses) * 100).toFixed(1);
          const riskLevel = level as calculator.RiskLevel;
          const riskResult = calculator.determineRiskLevel(0, "guia_ii");
          // Obtener color basado en el nivel de riesgo
          let riskColor: calculator.RiskColor = "blue";
          if (riskLevel === "bajo") riskColor = "green";
          else if (riskLevel === "medio") riskColor = "yellow";
          else if (riskLevel === "alto") riskColor = "orange";
          else if (riskLevel === "muy_alto") riskColor = "red";
          const color = calculator.getRiskColorHex(riskColor);

          doc
            .fillColor(color)
            .circle(60, doc.y + 5, 5)
            .fill();
          doc
            .fillColor("#333333")
            .text(
              `${calculator.getRiskLevelLabel(riskLevel)}: ${count} trabajadores (${percentage}%)`,
              75
            );
        }
      );
      doc.moveDown(2);

      // Riesgo promedio por categoría
      if (data.averageRiskByCategory.length > 0) {
        doc
          .fontSize(14)
          .fillColor("#000000")
          .text("Riesgo Promedio por Categoría", { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).fillColor("#333333");

        data.averageRiskByCategory.forEach((cat: any) => {
          doc.text(`${cat.category}: ${cat.averageScore.toFixed(1)} puntos`);
        });
        doc.moveDown(2);
      }

      // Recomendaciones generales
      doc.addPage();
      doc
        .fontSize(14)
        .fillColor("#000000")
        .text("Recomendaciones Generales", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#333333");

      const highRisk =
        (data.riskDistribution.alto || 0) +
        (data.riskDistribution.muy_alto || 0);
      if (highRisk > 0) {
        doc.text(
          "1. Implementar programa de intervención inmediata para trabajadores en riesgo alto y muy alto"
        );
        doc.text(
          "2. Realizar evaluaciones específicas de los factores de riesgo identificados"
        );
        doc.text(
          "3. Establecer medidas preventivas y correctivas documentadas"
        );
        doc.text(
          "4. Capacitar a los responsables de la implementación de las acciones"
        );
        doc.text(
          "5. Realizar seguimiento trimestral del programa de intervención"
        );
      } else {
        doc.text("1. Mantener las condiciones actuales de trabajo");
        doc.text("2. Realizar evaluaciones periódicas para monitorear cambios");
        doc.text("3. Promover un entorno organizacional favorable");
        doc.text(
          "4. Capacitar al personal en prevención de factores de riesgo psicosocial"
        );
      }

      // Footer
      doc.fontSize(8).fillColor("#999999");
      doc.text(
        "Este reporte es confidencial y debe ser utilizado únicamente para cumplir con la NOM-035-STPS-2018.",
        50,
        doc.page.height - 70,
        { align: "center", width: doc.page.width - 100 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Genera reporte grupal por departamento o área
 */
export async function generateGroupReport(
  groupName: string,
  responses: Array<ReportData>,
  surveyType: "guia_i" | "guia_ii" | "guia_iii"
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "LETTER",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Header
      doc
        .fontSize(20)
        .fillColor("#000000")
        .text(`Reporte Grupal - ${groupName}`, { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(12)
        .fillColor("#666666")
        .text("NOM-035-STPS-2018", { align: "center" });
      doc.moveDown(2);

      // Información del grupo
      doc
        .fontSize(14)
        .fillColor("#000000")
        .text("Información del Grupo", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).fillColor("#333333");
      doc.text(`Grupo/Departamento: ${groupName}`);
      doc.text(`Total de evaluados: ${responses.length}`);
      doc.text(
        `Guía de referencia: ${surveyType === "guia_i" ? "I (ATS)" : surveyType === "guia_ii" ? "II" : "III"}`
      );
      doc.moveDown(2);

      // Calcular estadísticas del grupo
      const riskDistribution: Record<string, number> = {};
      responses.forEach((resp: any) => {
        if (surveyType === "guia_i") return; // Guía I no tiene cálculo de riesgo
        const result = calculator.calculateSurveyResult(
          resp.answers,
          surveyType
        );
        riskDistribution[result.finalRiskLevel] =
          (riskDistribution[result.finalRiskLevel] || 0) + 1;
      });

      // Distribución de riesgos
      doc
        .fontSize(14)
        .fillColor("#000000")
        .text("Distribución de Niveles de Riesgo", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#333333");

      Object.entries(riskDistribution).forEach(
        ([level, count]: [string, any]) => {
          const percentage = ((count / responses.length) * 100).toFixed(1);
          const riskLevel = level as calculator.RiskLevel;
          // Obtener color basado en el nivel de riesgo
          let riskColor: calculator.RiskColor = "blue";
          if (riskLevel === "bajo") riskColor = "green";
          else if (riskLevel === "medio") riskColor = "yellow";
          else if (riskLevel === "alto") riskColor = "orange";
          else if (riskLevel === "muy_alto") riskColor = "red";
          const color = calculator.getRiskColorHex(riskColor);

          doc
            .fillColor(color)
            .circle(60, doc.y + 5, 5)
            .fill();
          doc
            .fillColor("#333333")
            .text(
              `${calculator.getRiskLevelLabel(riskLevel)}: ${count} trabajadores (${percentage}%)`,
              75
            );
        }
      );

      // Footer
      doc.fontSize(8).fillColor("#999999");
      doc.text(
        "Este reporte es confidencial y debe ser utilizado únicamente para cumplir con la NOM-035-STPS-2018.",
        50,
        doc.page.height - 70,
        { align: "center", width: doc.page.width - 100 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Genera reporte PDF de trabajadores pendientes de responder encuesta
 */
export async function generatePendingWorkersReport(data: {
  surveyType: "guia_i" | "guia_ii" | "guia_iii";
  surveyTitle: string;
  totalWorkers: number;
  respondedWorkers: number;
  pendingWorkers: Array<{
    name: string;
    email: string;
    department: string;
    position: string;
  }>;
  generatedAt: Date;
}): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "LETTER" });
      const buffers: Buffer[] = [];

      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      // Header
      doc
        .fontSize(18)
        .fillColor("#1e40af")
        .text("Reporte de Trabajadores Pendientes", { align: "center" });
      doc
        .fontSize(12)
        .fillColor("#666666")
        .text(data.surveyTitle, { align: "center" });
      doc.moveDown(0.5);
      doc
        .fontSize(10)
        .fillColor("#999999")
        .text(
          `Generado el ${data.generatedAt.toLocaleDateString("es-MX", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}`,
          { align: "center" }
        );
      doc.moveDown(2);

      // Estadísticas generales
      doc
        .fontSize(14)
        .fillColor("#000000")
        .text("Resumen de Cobertura", { underline: true });
      doc.moveDown(0.5);

      const coverage =
        data.totalWorkers > 0
          ? (data.respondedWorkers / data.totalWorkers) * 100
          : 0;
      const coverageColor =
        coverage >= 90
          ? "#10b981"
          : coverage >= 70
            ? "#3b82f6"
            : coverage >= 50
              ? "#f59e0b"
              : "#ef4444";

      doc.fontSize(10).fillColor("#333333");
      doc.text(`Total de trabajadores: ${data.totalWorkers}`);
      doc.text(`Respuestas recibidas: ${data.respondedWorkers}`);
      doc.text(`Trabajadores pendientes: ${data.pendingWorkers.length}`);
      doc
        .fillColor(coverageColor)
        .text(`Cobertura: ${coverage.toFixed(1)}%`, { continued: false });
      doc.moveDown(2);

      // Tabla de trabajadores pendientes
      doc
        .fontSize(14)
        .fillColor("#000000")
        .text("Lista de Trabajadores Pendientes", { underline: true });
      doc.moveDown(1);

      if (data.pendingWorkers.length === 0) {
        doc
          .fontSize(12)
          .fillColor("#10b981")
          .text(
            "¡Excelente! Todos los trabajadores han completado la encuesta.",
            { align: "center" }
          );
      } else {
        // Encabezados de tabla
        const tableTop = doc.y;
        const colWidths = {
          name: 150,
          email: 150,
          department: 120,
          position: 100,
        };
        let currentX = 50;

        doc.fontSize(9).fillColor("#ffffff");
        doc.rect(50, tableTop, 520, 20).fill("#1e40af");

        doc.text("Nombre", currentX + 5, tableTop + 5, {
          width: colWidths.name,
        });
        currentX += colWidths.name;
        doc.text("Correo", currentX + 5, tableTop + 5, {
          width: colWidths.email,
        });
        currentX += colWidths.email;
        doc.text("Departamento", currentX + 5, tableTop + 5, {
          width: colWidths.department,
        });
        currentX += colWidths.department;
        doc.text("Puesto", currentX + 5, tableTop + 5, {
          width: colWidths.position,
        });

        // Filas de datos
        doc.fontSize(8).fillColor("#333333");
        let currentY = tableTop + 25;

        data.pendingWorkers.forEach((worker: any, index: number) => {
          // Verificar si necesitamos una nueva página
          if (currentY > doc.page.height - 100) {
            doc.addPage();
            currentY = 50;

            // Repetir encabezados
            doc.fontSize(9).fillColor("#ffffff");
            doc.rect(50, currentY, 520, 20).fill("#1e40af");
            let headerX = 50;
            doc.text("Nombre", headerX + 5, currentY + 5, {
              width: colWidths.name,
            });
            headerX += colWidths.name;
            doc.text("Correo", headerX + 5, currentY + 5, {
              width: colWidths.email,
            });
            headerX += colWidths.email;
            doc.text("Departamento", headerX + 5, currentY + 5, {
              width: colWidths.department,
            });
            headerX += colWidths.department;
            doc.text("Puesto", headerX + 5, currentY + 5, {
              width: colWidths.position,
            });

            currentY += 25;
            doc.fontSize(8).fillColor("#333333");
          }

          // Fondo alternado
          if (index % 2 === 0) {
            doc.rect(50, currentY, 520, 20).fill("#f3f4f6");
          }

          currentX = 50;
          doc.fillColor("#333333");
          doc.text(worker.name, currentX + 5, currentY + 5, {
            width: colWidths.name - 10,
          });
          currentX += colWidths.name;
          doc.text(worker.email, currentX + 5, currentY + 5, {
            width: colWidths.email - 10,
          });
          currentX += colWidths.email;
          doc.text(worker.department, currentX + 5, currentY + 5, {
            width: colWidths.department - 10,
          });
          currentX += colWidths.department;
          doc.text(worker.position, currentX + 5, currentY + 5, {
            width: colWidths.position - 10,
          });

          currentY += 20;
        });
      }

      // Footer
      doc.fontSize(8).fillColor("#999999");
      doc.text(
        "Este reporte es confidencial y debe ser utilizado únicamente para cumplir con la NOM-035-STPS-2018.",
        50,
        doc.page.height - 70,
        { align: "center", width: doc.page.width - 100 }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
