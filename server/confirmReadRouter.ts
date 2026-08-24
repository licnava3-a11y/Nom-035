/**
 * confirmReadRouter.ts
 * Endpoint público (sin autenticación) para confirmar la lectura de una minuta.
 *
 * GET  /api/confirm-read/:token  → muestra el formulario de firma de recibido
 * POST /api/confirm-read/:token  → registra la firma y marca el despacho como leído
 */

import { Router } from "express";
import { getDb } from "./db";
import {
  minuteDispatches,
  minuteRecipients,
  meetingMinutes,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { emitCriticalAlertToAdmins } from "./_core/websocket";

const confirmReadRouter = Router();

// ── GET: mostrar formulario de firma ───────────────────────────────────────────
confirmReadRouter.get("/confirm-read/:token", async (req, res) => {
  const { token } = req.params;

  if (!token || token.length < 10) {
    return res
      .status(400)
      .send(
        buildResultHtml(
          "Token inválido",
          "El enlace de confirmación no es válido.",
          false
        )
      );
  }

  try {
    const db = await getDb();
    if (!db) {
      return res
        .status(500)
        .send(
          buildResultHtml(
            "Error del servidor",
            "No se pudo conectar a la base de datos.",
            false
          )
        );
    }

    const dispatches = await db
      .select({
        id: minuteDispatches.id,
        status: minuteDispatches.status,
        readAt: minuteDispatches.readAt,
        signerName: minuteDispatches.signerName,
        recipientName: minuteRecipients.name,
        recipientEmail: minuteRecipients.email,
        recipientPosition: minuteRecipients.position,
        minuteTitle: meetingMinutes.title,
        minuteFolio: meetingMinutes.folio,
        meetingDate: meetingMinutes.meetingDate,
        meetingType: meetingMinutes.meetingType,
      })
      .from(minuteDispatches)
      .leftJoin(
        minuteRecipients,
        eq(minuteDispatches.recipientId, minuteRecipients.id)
      )
      .leftJoin(
        meetingMinutes,
        eq(minuteDispatches.minuteId, meetingMinutes.id)
      )
      .where(eq(minuteDispatches.readToken, token))
      .limit(1);

    if (dispatches.length === 0) {
      return res
        .status(404)
        .send(
          buildResultHtml(
            "Enlace no encontrado",
            "El enlace de confirmación no existe o ya expiró.",
            false
          )
        );
    }

    const dispatch = dispatches[0];

    // Si ya fue confirmado, mostrar mensaje informativo
    if (dispatch.status === "read" && dispatch.readAt) {
      const readDate = new Date(dispatch.readAt).toLocaleString("es-MX", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/Mexico_City",
      });
      const signerInfo = dispatch.signerName
        ? `<br>Firmado por: <strong>${dispatch.signerName}</strong>`
        : "";
      return res.send(
        buildResultHtml(
          "Lectura ya registrada",
          `La lectura de la minuta <strong>${dispatch.minuteFolio || ""} — ${dispatch.minuteTitle || ""}</strong> ya fue confirmada el ${readDate}.${signerInfo}`,
          true
        )
      );
    }

    // Mostrar formulario de firma
    const meetingDateStr = dispatch.meetingDate
      ? new Date(dispatch.meetingDate).toLocaleDateString("es-MX", {
          dateStyle: "long",
        })
      : "—";

    return res.send(
      buildSignatureFormHtml({
        token,
        recipientName: dispatch.recipientName ?? "",
        recipientEmail: dispatch.recipientEmail ?? "",
        recipientPosition: dispatch.recipientPosition ?? "",
        minuteFolio: dispatch.minuteFolio ?? "",
        minuteTitle: dispatch.minuteTitle ?? "",
        meetingDate: meetingDateStr,
        meetingType: dispatch.meetingType ?? "",
      })
    );
  } catch (error) {
    console.error("[ConfirmRead GET] Error:", error);
    return res
      .status(500)
      .send(
        buildResultHtml(
          "Error",
          "Ocurrió un error al procesar su solicitud. Por favor intente de nuevo.",
          false
        )
      );
  }
});

// ── POST: procesar la firma y confirmar lectura ────────────────────────────────
confirmReadRouter.post("/confirm-read/:token", async (req, res) => {
  const { token } = req.params;
  const signerName = (req.body?.signerName ?? "").toString().trim();

  if (!token || token.length < 10) {
    return res
      .status(400)
      .send(
        buildResultHtml(
          "Token inválido",
          "El enlace de confirmación no es válido.",
          false
        )
      );
  }

  if (!signerName || signerName.length < 2) {
    return res
      .status(400)
      .send(
        buildResultHtml(
          "Nombre requerido",
          "Debe ingresar su nombre completo para confirmar la recepción.",
          false
        )
      );
  }

  try {
    const db = await getDb();
    if (!db) {
      return res
        .status(500)
        .send(
          buildResultHtml(
            "Error del servidor",
            "No se pudo conectar a la base de datos.",
            false
          )
        );
    }

    const dispatches = await db
      .select({
        id: minuteDispatches.id,
        status: minuteDispatches.status,
        readAt: minuteDispatches.readAt,
        recipientName: minuteRecipients.name,
        minuteTitle: meetingMinutes.title,
        minuteFolio: meetingMinutes.folio,
      })
      .from(minuteDispatches)
      .leftJoin(
        minuteRecipients,
        eq(minuteDispatches.recipientId, minuteRecipients.id)
      )
      .leftJoin(
        meetingMinutes,
        eq(minuteDispatches.minuteId, meetingMinutes.id)
      )
      .where(eq(minuteDispatches.readToken, token))
      .limit(1);

    if (dispatches.length === 0) {
      return res
        .status(404)
        .send(
          buildResultHtml(
            "Enlace no encontrado",
            "El enlace de confirmación no existe o ya expiró.",
            false
          )
        );
    }

    const dispatch = dispatches[0];

    if (dispatch.status === "read" && dispatch.readAt) {
      return res.send(
        buildResultHtml(
          "Ya confirmado",
          "Esta minuta ya fue confirmada previamente. No es necesario confirmar de nuevo.",
          true
        )
      );
    }

    const now = new Date();

    await db
      .update(minuteDispatches)
      .set({
        status: "read",
        readAt: now,
        signerName,
        updatedAt: now,
      })
      .where(eq(minuteDispatches.id, dispatch.id));

    const nowStr = now.toLocaleString("es-MX", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "America/Mexico_City",
    });

    // Emitir notificación WebSocket al admin
    try {
      emitCriticalAlertToAdmins({
        id: dispatch.id,
        category: "dispatch_signed",
        priority: "info",
        title: `Firma registrada: ${dispatch.minuteFolio || "Minuta"}`,
        message: `${signerName} confirmó la recepción de "${dispatch.minuteTitle || "minuta"}" el ${nowStr}.`,
      });
    } catch (wsErr) {
      console.warn(
        "[ConfirmRead] No se pudo emitir notificación WebSocket:",
        wsErr
      );
    }

    return res.send(
      buildResultHtml(
        "¡Recepción confirmada!",
        `Estimado/a <strong>${signerName}</strong>, su recepción de la minuta <strong>${dispatch.minuteFolio || ""} — ${dispatch.minuteTitle || ""}</strong> ha sido registrada exitosamente el ${nowStr}.<br><br>Este registro queda como evidencia de recepción documental.`,
        true
      )
    );
  } catch (error) {
    console.error("[ConfirmRead POST] Error:", error);
    return res
      .status(500)
      .send(
        buildResultHtml(
          "Error",
          "Ocurrió un error al registrar su confirmación. Por favor intente de nuevo.",
          false
        )
      );
  }
});

// ── Helpers de HTML ────────────────────────────────────────────────────────────

interface SignatureFormData {
  token: string;
  recipientName: string;
  recipientEmail: string;
  recipientPosition: string;
  minuteFolio: string;
  minuteTitle: string;
  meetingDate: string;
  meetingType: string;
}

function buildSignatureFormHtml(data: SignatureFormData): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmar recepción de minuta — NOM-035</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f1f5f9;
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
      max-width: 520px;
      width: 100%;
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      padding: 28px 32px 24px;
      color: white;
    }
    .header-label {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.8;
      margin-bottom: 6px;
    }
    .header h1 {
      font-size: 20px;
      font-weight: 700;
      line-height: 1.3;
    }
    .header .folio {
      display: inline-block;
      background: rgba(255,255,255,0.2);
      border-radius: 6px;
      padding: 3px 10px;
      font-size: 13px;
      font-weight: 600;
      margin-top: 10px;
    }
    .body { padding: 28px 32px; }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
      background: #f8fafc;
      border-radius: 10px;
      padding: 16px;
      border: 1px solid #e2e8f0;
    }
    .info-item label {
      display: block;
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 3px;
    }
    .info-item span {
      font-size: 14px;
      color: #0f172a;
      font-weight: 500;
    }
    .divider {
      border: none;
      border-top: 1px solid #e2e8f0;
      margin: 20px 0;
    }
    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .form-sublabel {
      font-size: 12px;
      color: #64748b;
      margin-bottom: 12px;
      line-height: 1.5;
    }
    .form-input {
      width: 100%;
      padding: 10px 14px;
      border: 1.5px solid #cbd5e1;
      border-radius: 8px;
      font-size: 15px;
      color: #0f172a;
      outline: none;
      transition: border-color 0.15s;
      font-family: inherit;
    }
    .form-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.12);
    }
    .form-input::placeholder { color: #94a3b8; }
    .btn {
      display: block;
      width: 100%;
      padding: 12px;
      background: #1e40af;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      margin-top: 16px;
      font-family: inherit;
      transition: background 0.15s;
    }
    .btn:hover { background: #1d4ed8; }
    .btn:active { background: #1e3a8a; }
    .notice {
      margin-top: 16px;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.5;
    }
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 14px 32px;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
    .error-msg {
      color: #dc2626;
      font-size: 13px;
      margin-top: 6px;
      display: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-label">Confirmación de recepción</div>
      <h1>${escapeHtml(data.minuteTitle || "Minuta de reunión")}</h1>
      ${data.minuteFolio ? `<div class="folio">Folio: ${escapeHtml(data.minuteFolio)}</div>` : ""}
    </div>
    <div class="body">
      <div class="info-grid">
        <div class="info-item">
          <label>Destinatario</label>
          <span>${escapeHtml(data.recipientName || "—")}</span>
        </div>
        <div class="info-item">
          <label>Cargo</label>
          <span>${escapeHtml(data.recipientPosition || "—")}</span>
        </div>
        <div class="info-item">
          <label>Fecha de reunión</label>
          <span>${escapeHtml(data.meetingDate || "—")}</span>
        </div>
        <div class="info-item">
          <label>Tipo de reunión</label>
          <span>${escapeHtml(data.meetingType || "—")}</span>
        </div>
      </div>
      <hr class="divider" />
      <form method="POST" action="/api/confirm-read/${escapeHtml(data.token)}" onsubmit="return validateForm()">
        <label class="form-label" for="signerName">Nombre completo para firma de recibido</label>
        <p class="form-sublabel">
          Al ingresar su nombre y hacer clic en "Confirmar recepción", queda constancia de que recibió y leyó el documento indicado.
        </p>
        <input
          type="text"
          id="signerName"
          name="signerName"
          class="form-input"
          placeholder="Ingrese su nombre completo"
          value="${escapeHtml(data.recipientName || "")}"
          autocomplete="name"
          maxlength="255"
          required
        />
        <div class="error-msg" id="errorMsg">Por favor ingrese su nombre completo (mínimo 2 caracteres).</div>
        <button type="submit" class="btn">✓ Confirmar recepción</button>
        <p class="notice">
          Este registro queda como evidencia de recepción documental en el sistema NOM-035 STPS 2018.
        </p>
      </form>
    </div>
    <div class="footer">Plataforma de Gestión de Riesgos Psicosociales — NOM-035 STPS 2018</div>
  </div>
  <script>
    function validateForm() {
      const val = document.getElementById('signerName').value.trim();
      const errEl = document.getElementById('errorMsg');
      if (val.length < 2) {
        errEl.style.display = 'block';
        return false;
      }
      errEl.style.display = 'none';
      return true;
    }
  </script>
</body>
</html>`;
}

function buildResultHtml(
  title: string,
  message: string,
  success: boolean
): string {
  const color = success ? "#16a34a" : "#dc2626";
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
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      max-width: 480px;
      width: 100%;
      padding: 40px 32px;
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
      margin: 0 auto 24px;
      font-size: 28px;
      color: ${color};
    }
    h1 { font-size: 22px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
    p { font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 24px; }
    .badge {
      display: inline-block;
      background: ${bgColor};
      border: 1px solid ${borderColor};
      color: ${color};
      font-size: 13px;
      font-weight: 600;
      padding: 6px 16px;
      border-radius: 20px;
    }
    .footer { margin-top: 32px; font-size: 12px; color: #94a3b8; }
    strong { color: #0f172a; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${message}</p>
    <span class="badge">Plataforma NOM-035 STPS 2018</span>
    <div class="footer">Sistema de Gestión de Riesgos Psicosociales</div>
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

export default confirmReadRouter;
