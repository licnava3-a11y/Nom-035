/**
 * confirmReadRouter.ts
 * Endpoint público (sin autenticación) para confirmar la lectura de una minuta
 * cuando el destinatario hace clic en el enlace del correo.
 *
 * GET /api/confirm-read/:token
 *   - Busca el despacho por readToken
 *   - Actualiza status → "read" y readAt → now()
 *   - Devuelve una página HTML de confirmación
 */

import { Router } from "express";
import { getDb } from "./db";
import { minuteDispatches, minuteRecipients, meetingMinutes } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const confirmReadRouter = Router();

confirmReadRouter.get("/confirm-read/:token", async (req, res) => {
  const { token } = req.params;

  if (!token || token.length < 10) {
    return res.status(400).send(buildHtml("Token inválido", "El enlace de confirmación no es válido.", false));
  }

  try {
    const db = await getDb();
    if (!db) {
      return res.status(500).send(buildHtml("Error del servidor", "No se pudo conectar a la base de datos.", false));
    }

    // Buscar el despacho por token
    const dispatches = await db
      .select({
        id: minuteDispatches.id,
        status: minuteDispatches.status,
        readAt: minuteDispatches.readAt,
        recipientName: minuteRecipients.name,
        minuteTitle: meetingMinutes.title,
        minuteFolio: meetingMinutes.folio,
        meetingDate: meetingMinutes.meetingDate,
      })
      .from(minuteDispatches)
      .leftJoin(minuteRecipients, eq(minuteDispatches.recipientId, minuteRecipients.id))
      .leftJoin(meetingMinutes, eq(minuteDispatches.minuteId, meetingMinutes.id))
      .where(eq(minuteDispatches.readToken, token))
      .limit(1);

    if (dispatches.length === 0) {
      return res.status(404).send(buildHtml("Enlace no encontrado", "El enlace de confirmación no existe o ya expiró.", false));
    }

    const dispatch = dispatches[0];

    // Si ya fue leído, mostrar mensaje informativo sin actualizar
    if (dispatch.status === "read" && dispatch.readAt) {
      const readDate = new Date(dispatch.readAt).toLocaleString("es-MX", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "America/Mexico_City",
      });
      return res.send(
        buildHtml(
          "Lectura ya registrada",
          `Su lectura de la minuta <strong>${dispatch.minuteFolio || ""} — ${dispatch.minuteTitle || ""}</strong> ya fue registrada el ${readDate}.`,
          true
        )
      );
    }

    // Actualizar el despacho como leído
    await db
      .update(minuteDispatches)
      .set({
        status: "read",
        readAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(minuteDispatches.id, dispatch.id));

    const now = new Date().toLocaleString("es-MX", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "America/Mexico_City",
    });

    return res.send(
      buildHtml(
        "Lectura confirmada",
        `Estimado/a <strong>${dispatch.recipientName || "destinatario"}</strong>, su lectura de la minuta <strong>${dispatch.minuteFolio || ""} — ${dispatch.minuteTitle || ""}</strong> ha sido registrada exitosamente el ${now}.`,
        true
      )
    );
  } catch (error) {
    console.error("[ConfirmRead] Error:", error);
    return res.status(500).send(buildHtml("Error", "Ocurrió un error al procesar su confirmación. Por favor intente de nuevo.", false));
  }
});

function buildHtml(title: string, message: string, success: boolean): string {
  const color = success ? "#16a34a" : "#dc2626";
  const icon = success ? "✓" : "✗";
  const bgColor = success ? "#f0fdf4" : "#fef2f2";
  const borderColor = success ? "#bbf7d0" : "#fecaca";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Plataforma NOM-035</title>
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
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
    }
    p {
      font-size: 15px;
      color: #475569;
      line-height: 1.6;
      margin-bottom: 24px;
    }
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
    .footer {
      margin-top: 32px;
      font-size: 12px;
      color: #94a3b8;
    }
    strong { color: #0f172a; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <span class="badge">Plataforma NOM-035 STPS 2018</span>
    <div class="footer">Sistema de Gestión de Riesgos Psicosociales</div>
  </div>
</body>
</html>`;
}

export default confirmReadRouter;
