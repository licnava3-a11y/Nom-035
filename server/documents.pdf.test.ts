import { describe, it, expect, beforeAll } from "vitest";
import {
  calculateSignatureHash,
  prepareSignatureData,
} from "./lib/signatureUtils";

describe("Document PDF Generation and Signature Validation", () => {
  describe("Signature Hash Calculation", () => {
    it("should calculate SHA-256 hash from signature base64", () => {
      const testSignature =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const hash = calculateSignatureHash(testSignature);

      expect(hash).toBeDefined();
      expect(hash).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(hash).toMatch(/^[a-f0-9]{64}$/); // Only hex characters
    });

    it("should produce consistent hash for same signature", () => {
      const testSignature =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

      const hash1 = calculateSignatureHash(testSignature);
      const hash2 = calculateSignatureHash(testSignature);

      expect(hash1).toBe(hash2);
    });

    it("should produce different hash for different signatures", () => {
      const signature1 =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      const signature2 =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

      const hash1 = calculateSignatureHash(signature1);
      const hash2 = calculateSignatureHash(signature2);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("Signature Data Preparation", () => {
    it("should prepare signature data with hash and timestamp", () => {
      const signatureData = {
        documentId: 1,
        userId: 123,
        signerName: "Juan Pérez",
        signerRole: "Director",
        signatureImageUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        ipAddress: "192.168.1.1",
        deviceInfo: "Mozilla/5.0",
      };

      const prepared = prepareSignatureData(signatureData);

      expect(prepared).toHaveProperty("signatureHash");
      expect(prepared).toHaveProperty("serverTimestamp");
      expect(prepared.signatureHash).toHaveLength(64);
      expect(prepared.serverTimestamp).toBeGreaterThan(0);
      expect(prepared.documentId).toBe(1);
      expect(prepared.signerName).toBe("Juan Pérez");
    });

    it("should include server timestamp within reasonable range", () => {
      const now = Date.now();
      const signatureData = {
        documentId: 1,
        signerName: "Test User",
        signatureImageUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      };

      const prepared = prepareSignatureData(signatureData);

      // Timestamp should be within 1 second of now
      expect(prepared.serverTimestamp).toBeGreaterThanOrEqual(now - 1000);
      expect(prepared.serverTimestamp).toBeLessThanOrEqual(now + 1000);
    });
  });

  describe("PDF Generator Module", () => {
    it("should export generateActaRecorridoPDF function", async () => {
      const pdfGenerator = await import("./pdfGenerator");

      expect(pdfGenerator.generateActaRecorridoPDF).toBeDefined();
      expect(typeof pdfGenerator.generateActaRecorridoPDF).toBe("function");
    });

    it("should export generateActaFinalResultadosPDF function", async () => {
      const pdfGenerator = await import("./pdfGenerator");

      expect(pdfGenerator.generateActaFinalResultadosPDF).toBeDefined();
      expect(typeof pdfGenerator.generateActaFinalResultadosPDF).toBe(
        "function"
      );
    });

    it("should generate PDF buffer for Acta de Recorrido", async () => {
      const { generateActaRecorridoPDF } = await import("./pdfGenerator");

      const testData = {
        folio: "AR-001/2024",
        title: "Acta de Recorrido de Prueba",
        content: {
          fecha: "2024-02-04",
          hora: "14:00",
          lugar: "Oficinas Centrales",
          objetivo: "Inspección de seguridad",
          areaInspeccionada: "Área de producción",
          observaciones: "Sin observaciones",
          hallazgos: "Ninguno",
          recomendaciones: "Mantener condiciones actuales",
        },
        participants: [
          {
            name: "Juan Pérez",
            curp: "PERJ800101HDFRXN01",
            ine: "1234567890123",
            role: "Inspector",
          },
        ],
        signatures: [
          {
            signerName: "Juan Pérez",
            signerRole: "Inspector",
            signatureImageUrl:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            signedAt: new Date(),
            signatureHash: "abc123",
          },
        ],
        qrCode: "https://validate.nom035.mx/AR-001-2024",
        createdAt: new Date(),
      };

      const pdfBuffer = await generateActaRecorridoPDF(testData);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      // PDF files start with %PDF
      expect(pdfBuffer.toString("utf8", 0, 4)).toBe("%PDF");
    });

    it("should generate PDF buffer for Acta Final de Resultados", async () => {
      const { generateActaFinalResultadosPDF } = await import("./pdfGenerator");

      const testData = {
        folio: "AFR-001/2024",
        title: "Acta Final de Resultados de Prueba",
        content: {
          fecha: "2024-02-04",
          periodo: "Enero - Diciembre 2024",
          introduccion: "Introducción del documento",
          metodologia: "Metodología aplicada",
          resultados: "Resultados obtenidos",
          conclusiones: "Conclusiones principales",
          recomendaciones: "Recomendaciones finales",
          planAccion: "Plan de acción propuesto",
        },
        signatures: [
          {
            signerName: "María García",
            signerRole: "Directora",
            signatureImageUrl:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
            signedAt: new Date(),
            signatureHash: "def456",
          },
        ],
        qrCode: "https://validate.nom035.mx/AFR-001-2024",
        createdAt: new Date(),
      };

      const pdfBuffer = await generateActaFinalResultadosPDF(testData);

      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      // PDF files start with %PDF
      expect(pdfBuffer.toString("utf8", 0, 4)).toBe("%PDF");
    });
  });
});
