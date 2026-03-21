import { exec } from "child_process";
import { promisify } from "util";
import { writeFile, unlink } from "fs/promises";
import { randomBytes } from "crypto";
import path from "path";

const execAsync = promisify(exec);

interface DigitalSignature {
  approverName: string;
  approverRole: string;
  approverRoleDescription?: string;
  signatureData: string;
  signedAt: Date;
  comments?: string;
}

interface OperatingRuleData {
  id: number;
  version: string;
  versionNumber?: number;
  effectiveDate: string;
  reviewDate?: string;
  nextReviewDate?: string;
  objectives: string;
  structure: string;
  roles: string;
  meetingFrequency: string;
  quorum: string;
  decisionMaking: string;
  communication: string;
  caseHandling: string;
  confidentiality: string;
  amendments?: string;
  signatures?: string;
  status: string;
  createdAt: Date;
  approvedAt?: Date;
  approvedBy?: number;
  approverName?: string;
  creatorName?: string;
  digitalSignatures?: DigitalSignature[];
}

export async function generateOperatingRulesPDF(data: OperatingRuleData): Promise<Buffer> {
  const tempId = randomBytes(16).toString("hex");
  const htmlPath = path.join("/tmp", `operating-rules-${tempId}.html`);
  const pdfPath = path.join("/tmp", `operating-rules-${tempId}.pdf`);

  try {
    // Generar URL de verificación con código QR
    const verificationUrl = `${process.env.VITE_FRONTEND_FORGE_API_URL || "https://app.manus.space"}/verify-document/operating-rules/${data.id}`;
    
    // Formatear fechas
    const formatDate = (date: string | Date | undefined) => {
      if (!date) return "N/A";
      const d = new Date(date);
      return d.toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
    };

    // Generar HTML de firmas digitales
    let signaturesHtml = "";
    if (data.digitalSignatures && data.digitalSignatures.length > 0) {
      const getRoleLabel = (role: string) => {
        const roles: Record<string, string> = {
          president: "Presidente",
          secretary: "Secretario",
          vocal: "Vocal",
          other: "Otro",
        };
        return roles[role] || role;
      };

      signaturesHtml = `
        <div class="section" style="page-break-before: always;">
          <h2>Firmas de Aprobación</h2>
          <p style="margin-bottom: 20px; color: #666;">Las siguientes personas han revisado y aprobado esta base de funcionamiento mediante firma digital:</p>
          <div class="digital-signatures">
            ${data.digitalSignatures.map((sig: any, index: number) => `
              <div class="digital-signature-item" style="margin-bottom: 30px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa;">
                <div style="display: flex; align-items: center; gap: 20px;">
                  <div style="flex: 0 0 200px;">
                    <img src="${sig.signatureData}" alt="Firma de ${sig.approverName}" style="max-width: 200px; max-height: 80px; border: 1px solid #ccc; padding: 5px; background: white;" />
                  </div>
                  <div style="flex: 1;">
                    <p style="margin: 0; font-size: 14pt; font-weight: bold; color: #333;">${sig.approverName}</p>
                    <p style="margin: 5px 0; font-size: 11pt; color: #666;">${getRoleLabel(sig.approverRole)}${sig.approverRoleDescription ? ` - ${sig.approverRoleDescription}` : ""}</p>
                    <p style="margin: 5px 0; font-size: 10pt; color: #999;">Firmado el: ${formatDate(sig.signedAt)}</p>
                    ${sig.comments ? `<p style="margin: 10px 0 0 0; font-size: 10pt; font-style: italic; color: #666;">"${sig.comments}"</p>` : ""}
                  </div>
                </div>
              </div>
            `).join("")}
          </div>
          <p style="margin-top: 20px; font-size: 9pt; color: #999; text-align: center;">Las firmas digitales son legátimas y verificables. Este documento cumple con la NOM-151 de la Secretaría de Economía de México.</p>
        </div>
      `;
    } else if (data.signatures) {
      // Mantener compatibilidad con firmas antiguas
      try {
        const signatures = JSON.parse(data.signatures);
        if (Array.isArray(signatures) && signatures.length > 0) {
          signaturesHtml = `
            <div class="section">
              <h2>Firmas de Aprobación</h2>
              <div class="signatures-grid">
                ${signatures.map((sig: any) => `
                  <div class="signature-item">
                    <div class="signature-line"></div>
                    <p class="signature-name"><strong>${sig.name || "N/A"}</strong></p>
                    <p class="signature-position">${sig.position || "N/A"}</p>
                    <p class="signature-date">${formatDate(sig.date)}</p>
                  </div>
                `).join("")}
              </div>
            </div>
          `;
        }
      } catch (error) {
        console.error("Error parsing signatures:", error);
      }
    }

    // Generar HTML del documento
    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bases de Funcionamiento del Comité - ${data.version}</title>
  <style>
    @page {
      size: letter;
      margin: 2cm 2cm 3cm 2cm;
      @bottom-center {
        content: "Bases de Funcionamiento del Comité | ${data.version} | Página " counter(page) " de " counter(pages);
        font-size: 9pt;
        color: #666;
      }
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Arial', 'Helvetica', sans-serif;
      font-size: 11pt;
      line-height: 1.6;
      color: #333;
      position: relative;
    }

    /* Marca de agua */
    body::before {
      content: "${data.version} - ${data.status === "active" ? "ACTIVO" : "BORRADOR"}";
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 80pt;
      font-weight: bold;
      color: rgba(0, 0, 0, 0.05);
      z-index: -1;
      white-space: nowrap;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }

    .header h1 {
      font-size: 20pt;
      color: #1e40af;
      margin-bottom: 10px;
      text-transform: uppercase;
    }

    .header .subtitle {
      font-size: 14pt;
      color: #64748b;
      margin-bottom: 5px;
    }

    .metadata {
      display: flex;
      justify-content: space-between;
      margin-bottom: 30px;
      padding: 15px;
      background-color: #f8fafc;
      border-left: 4px solid #2563eb;
    }

    .metadata-item {
      flex: 1;
    }

    .metadata-item strong {
      display: block;
      color: #1e40af;
      font-size: 9pt;
      text-transform: uppercase;
      margin-bottom: 3px;
    }

    .metadata-item span {
      display: block;
      font-size: 11pt;
    }

    .section {
      margin-bottom: 25px;
      page-break-inside: avoid;
    }

    .section h2 {
      font-size: 14pt;
      color: #1e40af;
      margin-bottom: 12px;
      padding-bottom: 5px;
      border-bottom: 2px solid #e2e8f0;
    }

    .section p {
      text-align: justify;
      margin-bottom: 10px;
      white-space: pre-wrap;
    }

    .two-column {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .signatures-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 30px;
      margin-top: 40px;
    }

    .signature-item {
      text-align: center;
    }

    .signature-line {
      border-top: 2px solid #333;
      margin-bottom: 8px;
      width: 100%;
    }

    .signature-name {
      font-weight: bold;
      font-size: 11pt;
      margin-bottom: 3px;
    }

    .signature-position {
      font-size: 10pt;
      color: #64748b;
      margin-bottom: 3px;
    }

    .signature-date {
      font-size: 9pt;
      color: #94a3b8;
    }

    .footer-info {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .footer-info .qr-section {
      text-align: center;
    }

    .footer-info .qr-section img {
      width: 100px;
      height: 100px;
      margin-bottom: 5px;
    }

    .footer-info .qr-section p {
      font-size: 8pt;
      color: #64748b;
    }

    .footer-info .document-info {
      flex: 1;
      padding-right: 20px;
    }

    .footer-info .document-info p {
      font-size: 9pt;
      color: #64748b;
      margin-bottom: 3px;
    }

    .status-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 10pt;
      font-weight: bold;
      text-transform: uppercase;
    }

    .status-active {
      background-color: #dcfce7;
      color: #166534;
    }

    .status-draft {
      background-color: #fef3c7;
      color: #92400e;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Bases de Funcionamiento del Comité</h1>
    <div class="subtitle">Comité de Seguridad y Salud en el Trabajo</div>
    <div class="subtitle">NOM-035-STPS-2018</div>
  </div>

  <div class="metadata">
    <div class="metadata-item">
      <strong>Versión</strong>
      <span>${data.version} ${data.versionNumber ? `(V${data.versionNumber})` : ""}</span>
    </div>
    <div class="metadata-item">
      <strong>Fecha de Vigencia</strong>
      <span>${formatDate(data.effectiveDate)}</span>
    </div>
    <div class="metadata-item">
      <strong>Próxima Revisión</strong>
      <span>${formatDate(data.nextReviewDate)}</span>
    </div>
    <div class="metadata-item">
      <strong>Estado</strong>
      <span class="status-badge ${data.status === "active" ? "status-active" : "status-draft"}">
        ${data.status === "active" ? "ACTIVO" : "BORRADOR"}
      </span>
    </div>
  </div>

  <div class="section">
    <h2>1. Objetivos del Comité</h2>
    <p>${data.objectives || "No especificado"}</p>
  </div>

  <div class="section">
    <h2>2. Estructura Organizacional</h2>
    <p>${data.structure || "No especificado"}</p>
  </div>

  <div class="section">
    <h2>3. Funciones y Responsabilidades</h2>
    <p>${data.roles || "No especificado"}</p>
  </div>

  <div class="two-column">
    <div class="section">
      <h2>4. Periodicidad de Reuniones</h2>
      <p>${data.meetingFrequency || "No especificado"}</p>
    </div>

    <div class="section">
      <h2>5. Quórum Mínimo</h2>
      <p>${data.quorum || "No especificado"}</p>
    </div>
  </div>

  <div class="section">
    <h2>6. Toma de Decisiones</h2>
    <p>${data.decisionMaking || "No especificado"}</p>
  </div>

  <div class="section">
    <h2>7. Mecanismos de Comunicación</h2>
    <p>${data.communication || "No especificado"}</p>
  </div>

  <div class="section">
    <h2>8. Procedimiento de Atención de Casos</h2>
    <p>${data.caseHandling || "No especificado"}</p>
  </div>

  <div class="section">
    <h2>9. Confidencialidad y Manejo de Información</h2>
    <p>${data.confidentiality || "No especificado"}</p>
  </div>

  ${data.amendments ? `
  <div class="section">
    <h2>10. Procedimiento de Modificación</h2>
    <p>${data.amendments}</p>
  </div>
  ` : ""}

  ${signaturesHtml}

  <div class="footer-info">
    <div class="document-info">
      <p><strong>Documento ID:</strong> ORF-${String(data.id).padStart(6, "0")}</p>
      <p><strong>Creado por:</strong> ${data.creatorName || "Sistema"}</p>
      <p><strong>Fecha de creación:</strong> ${formatDate(data.createdAt)}</p>
      ${data.approvedAt ? `<p><strong>Aprobado el:</strong> ${formatDate(data.approvedAt)} por ${data.approverName || "N/A"}</p>` : ""}
      <p><strong>Cumplimiento:</strong> NOM-035-STPS-2018, NOM-151</p>
    </div>
    <div class="qr-section">
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verificationUrl)}" alt="Código QR de verificación" />
      <p>Escanea para verificar autenticidad</p>
      <p style="font-size: 7pt; word-break: break-all;">${verificationUrl}</p>
    </div>
  </div>
</body>
</html>
    `;

    // Escribir HTML temporal
    await writeFile(htmlPath, htmlContent, "utf-8");

    // Generar PDF usando WeasyPrint (disponible en el sistema)
    await execAsync(`weasyprint ${htmlPath} ${pdfPath}`);

    // Leer PDF generado
    const pdfBuffer = await require("fs").promises.readFile(pdfPath);

    // Limpiar archivos temporales
    await unlink(htmlPath);
    await unlink(pdfPath);

    return pdfBuffer;
  } catch (error) {
    console.error("Error generating PDF:", error);
    // Limpiar archivos temporales en caso de error
    try {
      await unlink(htmlPath);
      await unlink(pdfPath);
    } catch (e) {
      // Ignorar errores de limpieza
    }
    throw new Error("Error al generar el PDF");
  }
}
