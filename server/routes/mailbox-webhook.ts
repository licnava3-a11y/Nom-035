/**
 * Webhook para recepción de correos electrónicos del buzón
 *
 * Este endpoint recibe correos entrantes de servicios como:
 * - SendGrid Inbound Parse
 * - AWS SES
 * - Mailgun
 * - Otros servicios de correo con webhooks
 */

import { Router } from "express";
import { getDb } from "../db";
import { mailbox } from "../../drizzle/schema";
import {
  parseIncomingEmail,
  sendStatusChangeNotification,
} from "../lib/email-service";

const router = Router();

/**
 * Generar folio único para solicitud del buzón
 */
function generateFolio(): string {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `BUZ-${year}-${timestamp}`;
}

/**
 * POST /api/mailbox-webhook
 *
 * Recibe correos entrantes y crea solicitudes en el buzón
 *
 * NOTA: La estructura del body dependerá del servicio de correo que uses.
 * Ajusta el parser según tu proveedor.
 */
router.post("/mailbox-webhook", async (req, res) => {
  try {
    // Parsear el correo entrante
    const parsedEmail = parseIncomingEmail(req.body);

    // Validar que tenga los campos mínimos
    if (!parsedEmail.from || !parsedEmail.subject) {
      return res.status(400).json({
        success: false,
        error: "Correo inválido: falta remitente o asunto",
      });
    }

    // Extraer nombre y email del remitente
    // Formato típico: "Nombre <email@ejemplo.com>" o solo "email@ejemplo.com"
    const emailMatch = parsedEmail.from.match(/<(.+?)>/) || [
      null,
      parsedEmail.from,
    ];
    const senderEmail = emailMatch[1] || parsedEmail.from;
    const nameMatch = parsedEmail.from.match(/^(.+?)\s*</);
    const senderName = nameMatch ? nameMatch[1].trim() : null;

    // Generar folio único
    const folio = generateFolio();

    // Determinar tipo de solicitud basado en palabras clave en el asunto
    let requestType:
      | "queja"
      | "sugerencia"
      | "felicitacion"
      | "solicitud_capacitacion" = "queja";
    let complaintType:
      | "liderazgo_negativo"
      | "entorno_organizacional_desfavorable"
      | "conductas_contrarias_ambiente_laboral"
      | "carga_trabajo"
      | "falta_control_trabajo"
      | "jornadas_trabajo_extensas"
      | "interferencia_relacion_trabajo_familia"
      | "acoso_laboral"
      | "acoso_sexual"
      | "hostigamiento_sexual"
      | "mobbing"
      | "burnout"
      | "violencia_laboral"
      | "otros"
      | null = null;

    const subjectLower = parsedEmail.subject.toLowerCase();

    if (subjectLower.includes("sugerencia")) {
      requestType = "sugerencia";
    } else if (
      subjectLower.includes("felicitacion") ||
      subjectLower.includes("felicitación")
    ) {
      requestType = "felicitacion";
    } else if (
      subjectLower.includes("capacitacion") ||
      subjectLower.includes("capacitación") ||
      subjectLower.includes("curso")
    ) {
      requestType = "solicitud_capacitacion";
    } else {
      // Es una queja, intentar determinar el tipo
      if (subjectLower.includes("acoso")) {
        complaintType = "acoso_laboral";
      } else if (
        subjectLower.includes("mobbing") ||
        subjectLower.includes("hostigamiento")
      ) {
        complaintType = "mobbing";
      } else if (
        subjectLower.includes("burnout") ||
        subjectLower.includes("agotamiento")
      ) {
        complaintType = "burnout";
      } else if (
        subjectLower.includes("carga") &&
        subjectLower.includes("trabajo")
      ) {
        complaintType = "carga_trabajo";
      } else if (subjectLower.includes("liderazgo")) {
        complaintType = "liderazgo_negativo";
      } else if (subjectLower.includes("violencia")) {
        complaintType = "violencia_laboral";
      } else {
        complaintType = "otros";
      }
    }

    // Crear solicitud en el buzón
    const db = await getDb();
    if (!db) {
      return res.status(500).json({
        success: false,
        error: "Base de datos no disponible",
      });
    }

    const [result] = await (db.insert(mailbox) as any).values({
      folio,
      requestType,
      complaintType,
      senderName,
      senderEmail,
      senderPhone: null,
      isAnonymous: false,
      subject: parsedEmail.subject,
      message: parsedEmail.body,
      status: "recibido",
      assignedTo: null,
      priority: "medium",
      receivedVia: "email",
      createdAt: parsedEmail.receivedAt,
    });

    // Enviar confirmación de recepción por correo
    await sendStatusChangeNotification(
      senderEmail,
      folio,
      parsedEmail.subject,
      "recibido"
    );

    console.log(`📬 Nueva solicitud recibida por correo: ${folio}`);

    res.json({
      success: true,
      folio,
      message: "Solicitud recibida correctamente",
    });
  } catch (error) {
    console.error("❌ Error procesando correo entrante:", error);
    res.status(500).json({
      success: false,
      error: "Error procesando el correo",
    });
  }
});

/**
 * GET /api/mailbox-webhook/test
 *
 * Endpoint de prueba para verificar que el webhook está funcionando
 */
router.get("/mailbox-webhook/test", (req, res) => {
  res.json({
    success: true,
    message: "Webhook del buzón funcionando correctamente",
    timestamp: new Date().toISOString(),
  });
});

export default router;
