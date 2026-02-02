import express from "express";
import {
  generateTrainingReportPDF,
  generateCasesReportPDF,
  generateComplianceReportPDF,
  generateTrainingReportExcel,
  generateCasesReportExcel,
  generateComplianceReportExcel,
} from "./reports";

const router = express.Router();

// Ruta para exportar reporte de capacitación a PDF
router.get("/export/training/pdf", async (req, res) => {
  try {
    const pdfBuffer = await generateTrainingReportPDF();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="reporte-capacitacion-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating training PDF:", error);
    res.status(500).json({ error: "Error al generar el reporte PDF" });
  }
});

// Ruta para exportar reporte de capacitación a Excel
router.get("/export/training/excel", async (req, res) => {
  try {
    const excelBuffer = await generateTrainingReportExcel();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="reporte-capacitacion-${Date.now()}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error generating training Excel:", error);
    res.status(500).json({ error: "Error al generar el reporte Excel" });
  }
});

// Ruta para exportar reporte de casos a PDF
router.get("/export/cases/pdf", async (req, res) => {
  try {
    const pdfBuffer = await generateCasesReportPDF();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="reporte-casos-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating cases PDF:", error);
    res.status(500).json({ error: "Error al generar el reporte PDF" });
  }
});

// Ruta para exportar reporte de casos a Excel
router.get("/export/cases/excel", async (req, res) => {
  try {
    const excelBuffer = await generateCasesReportExcel();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="reporte-casos-${Date.now()}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error generating cases Excel:", error);
    res.status(500).json({ error: "Error al generar el reporte Excel" });
  }
});

// Ruta para exportar reporte de cumplimiento a PDF
router.get("/export/compliance/pdf", async (req, res) => {
  try {
    const pdfBuffer = await generateComplianceReportPDF();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="reporte-cumplimiento-${Date.now()}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating compliance PDF:", error);
    res.status(500).json({ error: "Error al generar el reporte PDF" });
  }
});

// Ruta para exportar reporte de cumplimiento a Excel
router.get("/export/compliance/excel", async (req, res) => {
  try {
    const excelBuffer = await generateComplianceReportExcel();
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="reporte-cumplimiento-${Date.now()}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error("Error generating compliance Excel:", error);
    res.status(500).json({ error: "Error al generar el reporte Excel" });
  }
});

export default router;
