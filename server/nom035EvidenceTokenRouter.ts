/**
 * nom035EvidenceTokenRouter.ts
 * Endpoints públicos (sin autenticación) para subida de evidencias NOM-035 mediante token.
 *
 * GET  /api/nom035/evidence-upload/:token  → formulario HTML de subida
 * POST /api/nom035/evidence-upload/:token  → procesa la subida y registra la evidencia
 */

import { Router } from "express";
import multer from "multer";
import { getDb } from "./db";
import {
  nom035EvidenceTokens,
  nom035Evidences,
  nom035Actions,
  nom035Plans,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { storagePut } from "./storage";

const evidenceTokenRouter = Router();

// Multer en memoria (16 MB máx)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "image/jpeg", "image/png", "image/gif", "image/webp",
      "application/pdf",
      "video/mp4", "video/quicktime",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Tipo de archivo no permitido"));
    }
  },
});

// ── GET: mostrar formulario de subida ─────────────────────────────────────────
evidenceTokenRouter.get("/nom035/evidence-upload/:token", async (req, res) => {
  const { token } = req.params;

  if (!token || token.length < 16) {
    return res.status(400).send(buildResultHtml("Enlace inválido", "El enlace de subida de evidencia no es válido.", false));
  }

  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).send(buildResultHtml("Error del servidor", "No se pudo conectar a la base de datos.", false));
    }

    const [tokenRow] = await db
      .select()
      .from(nom035EvidenceTokens)
      .where(eq(nom035EvidenceTokens.token, token))
      .limit(1);

    if (!tokenRow) {
      return res.status(404).send(buildResultHtml("Enlace no encontrado", "El enlace de subida no existe o ya fue eliminado.", false));
    }

    // Verificar expiración
    if (new Date() > new Date(tokenRow.expiresAt)) {
      return res.status(410).send(buildResultHtml(
        "Enlace expirado",
        "Este enlace de subida de evidencia ha expirado (vigencia de 72 horas). Solicite un nuevo enlace al administrador.",
        false
      ));
    }

    // Verificar usos
    if (tokenRow.useCount >= tokenRow.maxUses) {
      return res.status(410).send(buildResultHtml(
        "Enlace ya utilizado",
        "Este enlace de subida ya fue utilizado. Si necesita subir más evidencias, solicite un nuevo enlace al administrador.",
        false
      ));
    }

    // Obtener datos de la acción
    const [actionRow] = await db
      .select({
        accion: nom035Actions.accion,
        objetivo: nom035Actions.objetivo,
        responsable: nom035Actions.responsable,
        estado: nom035Actions.estado,
        planTipo: nom035Plans.tipoPlan,
        planNivel: nom035Plans.nivelAplicacion,
      })
      .from(nom035Actions)
      .innerJoin(nom035Plans, eq(nom035Actions.planId, nom035Plans.id))
      .where(eq(nom035Actions.id, tokenRow.actionId))
      .limit(1);

    return res.send(buildUploadFormHtml({
      token,
      accion: actionRow?.accion ?? "Acción NOM-035",
      objetivo: actionRow?.objetivo ?? "",
      responsable: actionRow?.responsable ?? "",
      planTipo: actionRow?.planTipo ?? "",
      planNivel: actionRow?.planNivel ?? "",
      descripcionEsperada: tokenRow.descripcionEsperada ?? "",
      expiresAt: new Date(tokenRow.expiresAt).toLocaleString("es-MX", {
        dateStyle: "long", timeStyle: "short", timeZone: "America/Mexico_City",
      }),
    }));
  } catch (error) {
    console.error("[EvidenceToken GET] Error:", error);
    return res.status(500).send(buildResultHtml("Error", "Ocurrió un error al cargar el formulario.", false));
  }
});

// ── POST: procesar subida de evidencia ────────────────────────────────────────
evidenceTokenRouter.post(
  "/nom035/evidence-upload/:token",
  upload.single("archivo"),
  async (req, res) => {
    const { token } = req.params;
    const signerName = (req.body?.signerName ?? "").toString().trim();
    const signerEmail = (req.body?.signerEmail ?? "").toString().trim();
    const descripcion = (req.body?.descripcion ?? "").toString().trim();
    const tipoEvidencia = (req.body?.tipoEvidencia ?? "documento").toString().trim();

    if (!token || token.length < 16) {
      return res.status(400).send(buildResultHtml("Enlace inválido", "El enlace de subida no es válido.", false));
    }

    if (!signerName || signerName.length < 2) {
      return res.status(400).send(buildResultHtml("Nombre requerido", "Debe ingresar su nombre completo.", false));
    }

    if (!req.file) {
      return res.status(400).send(buildResultHtml("Archivo requerido", "Debe seleccionar un archivo para subir.", false));
    }

    try {
      const db = await getDb();
      if (!db) {
        return res.status(500).send(buildResultHtml("Error del servidor", "No se pudo conectar a la base de datos.", false));
      }

      const [tokenRow] = await db
        .select()
        .from(nom035EvidenceTokens)
        .where(eq(nom035EvidenceTokens.token, token))
        .limit(1);

      if (!tokenRow) {
        return res.status(404).send(buildResultHtml("Enlace no encontrado", "El enlace de subida no existe.", false));
      }

      if (new Date() > new Date(tokenRow.expiresAt)) {
        return res.status(410).send(buildResultHtml("Enlace expirado", "Este enlace ha expirado. Solicite un nuevo enlace.", false));
      }

      if (tokenRow.useCount >= tokenRow.maxUses) {
        return res.status(410).send(buildResultHtml("Enlace ya utilizado", "Este enlace ya fue utilizado.", false));
      }

      // Subir archivo a S3
      const ext = req.file.originalname.split(".").pop()?.toLowerCase() ?? "bin";
      const suffix = Math.random().toString(36).substring(2, 10);
      const fileKey = `nom035-evidences/token-${tokenRow.id}-${suffix}.${ext}`;
      const { url } = await storagePut(fileKey, req.file.buffer, req.file.mimetype);

      // Registrar evidencia en BD
      await db.insert(nom035Evidences).values({
        actionId: tokenRow.actionId,
        nombreArchivo: req.file.originalname,
        tipoArchivo: req.file.mimetype,
        tamanoBytes: req.file.size,
        fileUrl: url,
        fileKey,
        tipoEvidencia: tipoEvidencia as any,
        descripcion: descripcion || null,
        subidoPorNombre: signerName,
        subidoPorUserId: null,
      });

      // Actualizar contador de usos y registrar datos del firmante
      await db
        .update(nom035EvidenceTokens)
        .set({
          useCount: tokenRow.useCount + 1,
          usedAt: tokenRow.usedAt ?? new Date(),
          signerName: tokenRow.signerName ?? signerName,
          signerEmail: signerEmail ? signerEmail : (tokenRow.signerEmail ?? null),
        })
        .where(eq(nom035EvidenceTokens.id, tokenRow.id));

      const nowStr = new Date().toLocaleString("es-MX", {
        dateStyle: "long", timeStyle: "short", timeZone: "America/Mexico_City",
      });

      return res.send(buildResultHtml(
        "¡Evidencia registrada exitosamente!",
        `Estimado/a <strong>${escapeHtml(signerName)}</strong>, su archivo <strong>${escapeHtml(req.file.originalname)}</strong> ha sido registrado como evidencia el ${nowStr}.<br><br>Este archivo quedará vinculado a la acción correspondiente en el sistema NOM-035 STPS 2018.`,
        true
      ));
    } catch (error) {
      console.error("[EvidenceToken POST] Error:", error);
      return res.status(500).send(buildResultHtml("Error", "Ocurrió un error al registrar la evidencia. Por favor intente de nuevo.", false));
    }
  }
);

// ── Helpers HTML ──────────────────────────────────────────────────────────────

interface UploadFormData {
  token: string;
  accion: string;
  objetivo: string;
  responsable: string;
  planTipo: string;
  planNivel: string;
  descripcionEsperada: string;
  expiresAt: string;
}

const TIPO_LABELS: Record<string, string> = {
  fotografia: "Fotografía",
  documento: "Documento",
  acta: "Acta / Minuta",
  constancia: "Constancia",
  lista_asistencia: "Lista de asistencia",
  evaluacion: "Evaluación",
  encuesta: "Encuesta",
  reporte: "Reporte",
  video: "Video",
  otro: "Otro",
};

function buildUploadFormHtml(data: UploadFormData): string {
  const tipoOptions = Object.entries(TIPO_LABELS)
    .map(([val, label]) => `<option value="${val}">${label}</option>`)
    .join("\n");

  const planTipoLabel: Record<string, string> = {
    intervencion: "Intervención de Riesgos",
    violencia_laboral: "Prevención de Violencia Laboral",
    no_discriminacion: "No Discriminación",
    consolidado: "Plan Consolidado",
  };

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Subir evidencia NOM-035</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f1f5f9;
      min-height: 100vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 32px 16px;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.10);
      max-width: 560px;
      width: 100%;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      padding: 28px 32px 24px;
      color: white;
    }
    .header-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.85;
      margin-bottom: 6px;
    }
    .header h1 { font-size: 19px; font-weight: 700; line-height: 1.35; }
    .header .badge {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 10px;
    }
    .body { padding: 28px 32px; }
    .info-box {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 20px;
    }
    .info-box .info-title {
      font-size: 12px;
      font-weight: 700;
      color: #15803d;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .info-box p { font-size: 13px; color: #166534; line-height: 1.5; }
    .expiry-notice {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12px;
      color: #92400e;
      margin-bottom: 20px;
    }
    .form-group { margin-bottom: 16px; }
    .form-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .form-label .req { color: #dc2626; margin-left: 3px; }
    .form-input, .form-select, .form-textarea {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      font-size: 14px;
      color: #0f172a;
      outline: none;
      transition: border-color 0.15s;
      font-family: inherit;
      background: white;
    }
    .form-input:focus, .form-select:focus, .form-textarea:focus {
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16,185,129,0.12);
    }
    .form-textarea { resize: vertical; min-height: 72px; }
    .drop-zone {
      border: 2px dashed #cbd5e1;
      border-radius: 10px;
      padding: 28px 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.15s;
      background: #f8fafc;
    }
    .drop-zone.dragover { border-color: #10b981; background: #f0fdf4; }
    .drop-zone .dz-icon { font-size: 32px; margin-bottom: 8px; }
    .drop-zone .dz-text { font-size: 14px; color: #475569; }
    .drop-zone .dz-sub { font-size: 12px; color: #94a3b8; margin-top: 4px; }
    .file-preview {
      display: none;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-top: 8px;
      font-size: 13px;
      color: #15803d;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 13px;
      background: #059669;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 20px;
      font-family: inherit;
      transition: background 0.15s;
    }
    .btn:hover { background: #047857; }
    .btn:disabled { background: #9ca3af; cursor: not-allowed; }
    .notice { margin-top: 12px; font-size: 12px; color: #94a3b8; text-align: center; line-height: 1.5; }
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 12px 32px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
    #progressBar { display: none; width: 100%; height: 6px; background: #e2e8f0; border-radius: 3px; margin-top: 12px; overflow: hidden; }
    #progressFill { height: 100%; background: #10b981; width: 0%; transition: width 0.3s; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-label">Subida de evidencia — NOM-035 STPS 2018</div>
      <h1>${escapeHtml(data.accion)}</h1>
      <div class="badge">${escapeHtml(planTipoLabel[data.planTipo] ?? data.planTipo)} · Nivel ${escapeHtml(data.planNivel)}</div>
    </div>
    <div class="body">
      ${data.objetivo ? `<div class="info-box"><div class="info-title">Objetivo de la acción</div><p>${escapeHtml(data.objetivo)}</p></div>` : ""}
      ${data.descripcionEsperada ? `<div class="info-box"><div class="info-title">Evidencia requerida</div><p>${escapeHtml(data.descripcionEsperada)}</p></div>` : ""}
      <div class="expiry-notice">
        ⏱ Este enlace es válido hasta el <strong>${escapeHtml(data.expiresAt)}</strong>. Después de esa fecha no podrá subir archivos.
      </div>

      <form id="uploadForm" method="POST" action="/api/nom035/evidence-upload/${escapeHtml(data.token)}" enctype="multipart/form-data">
        <div class="form-group">
          <label class="form-label" for="signerName">Nombre completo <span class="req">*</span></label>
          <input type="text" id="signerName" name="signerName" class="form-input"
            placeholder="Ingrese su nombre completo" autocomplete="name" maxlength="255" required />
        </div>
        <div class="form-group">
          <label class="form-label" for="signerEmail">Correo electrónico</label>
          <input type="email" id="signerEmail" name="signerEmail" class="form-input"
            placeholder="correo@empresa.com" autocomplete="email" maxlength="320" />
        </div>
        <div class="form-group">
          <label class="form-label" for="tipoEvidencia">Tipo de evidencia <span class="req">*</span></label>
          <select id="tipoEvidencia" name="tipoEvidencia" class="form-select" required>
            ${tipoOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label" for="descripcion">Descripción de la evidencia</label>
          <textarea id="descripcion" name="descripcion" class="form-textarea"
            placeholder="Describa brevemente el contenido del archivo..." maxlength="500"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Archivo <span class="req">*</span></label>
          <div class="drop-zone" id="dropZone" onclick="document.getElementById('archivo').click()">
            <div class="dz-icon">📎</div>
            <div class="dz-text">Haga clic o arrastre un archivo aquí</div>
            <div class="dz-sub">PDF, imágenes, Word, Excel, video — máx. 16 MB</div>
          </div>
          <div class="file-preview" id="filePreview"></div>
          <input type="file" id="archivo" name="archivo" style="display:none" required
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.doc,.docx,.xls,.xlsx" />
        </div>
        <div id="progressBar"><div id="progressFill"></div></div>
        <button type="submit" class="btn" id="submitBtn">⬆ Subir evidencia</button>
        <p class="notice">Al subir el archivo, confirma que es una evidencia real y válida para el cumplimiento de la NOM-035 STPS 2018.</p>
      </form>
    </div>
    <div class="footer">Plataforma de Gestión de Riesgos Psicosociales — NOM-035 STPS 2018</div>
  </div>
  <script>
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('archivo');
    const filePreview = document.getElementById('filePreview');
    const submitBtn = document.getElementById('submitBtn');
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');

    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) showFile(fileInput.files[0]);
    });

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        showFile(e.dataTransfer.files[0]);
      }
    });

    function showFile(file) {
      const mb = (file.size / 1024 / 1024).toFixed(2);
      filePreview.style.display = 'block';
      filePreview.textContent = '✓ ' + file.name + ' (' + mb + ' MB)';
    }

    document.getElementById('uploadForm').addEventListener('submit', function(e) {
      if (!fileInput.files[0]) { e.preventDefault(); alert('Seleccione un archivo.'); return; }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Subiendo...';
      progressBar.style.display = 'block';
      let pct = 0;
      const interval = setInterval(() => {
        pct = Math.min(pct + 8, 90);
        progressFill.style.width = pct + '%';
      }, 200);
      setTimeout(() => clearInterval(interval), 5000);
    });
  </script>
</body>
</html>`;
}

function buildResultHtml(title: string, message: string, success: boolean): string {
  const color = success ? "#059669" : "#dc2626";
  const icon = success ? "✓" : "✗";
  const bgColor = success ? "#f0fdf4" : "#fef2f2";
  const borderColor = success ? "#bbf7d0" : "#fecaca";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)} — Plataforma NOM-035</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f8fafc;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 32px rgba(0,0,0,0.10);
      max-width: 480px;
      width: 100%;
      padding: 40px 36px;
      text-align: center;
    }
    .icon {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${bgColor};
      border: 2px solid ${borderColor};
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      color: ${color};
      margin: 0 auto 20px;
    }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    p { font-size: 14px; color: #475569; line-height: 1.6; }
    .footer { margin-top: 28px; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${message}</p>
    <div class="footer">Plataforma de Gestión de Riesgos Psicosociales — NOM-035 STPS 2018</div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default evidenceTokenRouter;
