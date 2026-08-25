/**
 * Job Programado: Notificaciones de Expiración de Tokens Anónimos
 * Se ejecuta diariamente para enviar recordatorios de tokens próximos a expirar
 */

import { getDb } from "../db";
import {
  notifications,
  surveyAnonymousTokens,
  surveys,
  users,
} from "../../drizzle/schema";
import { and, eq, gte, lte, isNull } from "drizzle-orm";
import { sendEmail } from "../lib/email-sender";

interface TokenExpirationNotification {
  token: string;
  surveyType: string;
  department: string | null;
  expiresAt: Date;
  generatedBy: number | null;
  daysUntilExpiration: number;
}

/**
 * Obtiene tokens que expiran en los próximos 7 días
 */
async function getExpiringTokens(): Promise<TokenExpirationNotification[]> {
  const db = await getDb();
  if (!db) {
    console.error("[Token Expiration Job] Database not available");
    return [];
  }

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  try {
    const expiringTokens = await db
      .select({
        token: surveyAnonymousTokens.token,
        surveyType: surveyAnonymousTokens.surveyType,
        department: surveyAnonymousTokens.department,
        expiresAt: surveyAnonymousTokens.expiresAt,
        generatedBy: surveyAnonymousTokens.generatedBy,
      })
      .from(surveyAnonymousTokens)
      .where(
        and(
          gte(surveyAnonymousTokens.expiresAt, now),
          lte(surveyAnonymousTokens.expiresAt, sevenDaysFromNow),
          isNull(surveyAnonymousTokens.usedAt),
          eq(surveyAnonymousTokens.isRevoked, false)
        )
      );

    return expiringTokens.map((token: any) => ({
      ...token,
      daysUntilExpiration: Math.ceil(
        (token.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      ),
    }));
  } catch (error) {
    console.error(
      "[Token Expiration Job] Error fetching expiring tokens:",
      error
    );
    return [];
  }
}

/**
 * Agrupa tokens por usuario que los generó
 */
function groupTokensByUser(
  tokens: TokenExpirationNotification[]
): Map<number, TokenExpirationNotification[]> {
  const grouped = new Map<number, TokenExpirationNotification[]>();

  for (const token of tokens) {
    // Filtrar tokens sin generatedBy
    if (token.generatedBy === null) continue;

    const existing = grouped.get(token.generatedBy) || [];
    existing.push(token);
    grouped.set(token.generatedBy, existing);
  }

  return grouped;
}

/**
 * Obtiene información del usuario por ID
 */
async function getUserInfo(
  userId: number
): Promise<{ name: string | null; email: string | null } | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    const [user] = await db
      .select({
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user || null;
  } catch (error) {
    console.error("[Token Expiration Job] Error fetching user info:", error);
    return null;
  }
}

/**
 * Genera HTML para el correo de notificación
 */
function generateEmailHTML(
  userName: string,
  tokens: TokenExpirationNotification[]
): string {
  const surveyTypeNames: Record<string, string> = {
    guia_i: "Guía I - Acontecimientos Traumáticos Severos",
    guia_ii: "Guía II - Factores de Riesgo Psicosocial",
    guia_iii: "Guía III - Entorno Organizacional",
  };

  const tokenRows = tokens
    .map(
      token => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${surveyTypeNames[token.surveyType] || token.surveyType}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${token.department || "Sin departamento"}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          <span style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 600; ${
            token.daysUntilExpiration <= 3
              ? "background-color: #fee2e2; color: #991b1b;"
              : "background-color: #fef3c7; color: #92400e;"
          }">
            ${token.daysUntilExpiration} ${token.daysUntilExpiration === 1 ? "día" : "días"}
          </span>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${token.expiresAt.toLocaleDateString("es-MX", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </td>
      </tr>
    `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tokens Próximos a Expirar</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151; background-color: #f9fafb; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%); padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
            ⏰ Tokens Próximos a Expirar
          </h1>
          <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 14px;">
            Recordatorio de Tokens Anónimos - Plataforma NOM-035
          </p>
        </div>

        <!-- Content -->
        <div style="padding: 32px 24px;">
          <p style="margin: 0 0 24px; font-size: 16px; color: #1f2937;">
            Hola <strong>${userName}</strong>,
          </p>

          <p style="margin: 0 0 24px; font-size: 14px; color: #6b7280;">
            Te informamos que tienes <strong>${tokens.length}</strong> token${
              tokens.length === 1 ? "" : "es"
            } anónimo${tokens.length === 1 ? "" : "s"} que expirará${
              tokens.length === 1 ? "" : "n"
            } en los próximos 7 días. Los tokens que no se utilicen antes de su fecha de expiración dejarán de ser válidos.
          </p>

          <!-- Tokens Table -->
          <div style="margin: 24px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">
                    Tipo de Encuesta
                  </th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">
                    Departamento
                  </th>
                  <th style="padding: 12px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">
                    Días Restantes
                  </th>
                  <th style="padding: 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em;">
                    Fecha de Expiración
                  </th>
                </tr>
              </thead>
              <tbody>
                ${tokenRows}
              </tbody>
            </table>
          </div>

          <!-- Action Box -->
          <div style="margin: 24px 0; padding: 16px; background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #1e40af;">
              <strong>💡 Recomendación:</strong> Considera generar nuevos tokens si estos están próximos a expirar y aún no han sido distribuidos a los participantes.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${
              process.env.VITE_OAUTH_PORTAL_URL || "https://app.manus.im"
            }/surveys/anonymous-tokens" 
               style="display: inline-block; padding: 12px 32px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">
              Ver Tokens en el Sistema
            </a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0 0 8px; font-size: 12px; color: #9ca3af;">
            Este es un mensaje automático del sistema de gestión NOM-035 STPS 2018
          </p>
          <p style="margin: 0; font-size: 12px; color: #9ca3af;">
            © ${new Date().getFullYear()} Plataforma de Capacitación NOM-035. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Envía notificación de expiración a un usuario
 */
async function sendExpirationNotification(
  userEmail: string,
  userName: string,
  tokens: TokenExpirationNotification[]
): Promise<boolean> {
  try {
    const subject = `⏰ Recordatorio: ${tokens.length} token${
      tokens.length === 1 ? "" : "es"
    } anónimo${tokens.length === 1 ? "" : "s"} próximo${
      tokens.length === 1 ? "" : "s"
    } a expirar`;

    const htmlContent = generateEmailHTML(userName, tokens);

    await sendEmail({
      to: userEmail,
      subject,
      html: htmlContent,
    });

    return true;
  } catch (error) {
    console.error(
      `[Token Expiration Job] Error sending email to ${userEmail}:`,
      error
    );
    return false;
  }
}

/**
 * Ejecuta el job de notificaciones de expiración
 */
export async function runTokenExpirationJob(): Promise<void> {
  console.log("[Token Expiration Job] Starting job...");

  try {
    // 1. Obtener tokens próximos a expirar
    const expiringTokens = await getExpiringTokens();

    if (expiringTokens.length === 0) {
      console.log("[Token Expiration Job] No expiring tokens found");
      return;
    }

    console.log(
      `[Token Expiration Job] Found ${expiringTokens.length} expiring tokens`
    );

    // 2. Agrupar por usuario
    const tokensByUser = groupTokensByUser(expiringTokens);

    console.log(
      `[Token Expiration Job] Grouped into ${tokensByUser.size} users`
    );

    // 3. Enviar notificaciones
    let successCount = 0;
    let errorCount = 0;

    for (const [userId, userTokens] of Array.from(tokensByUser.entries())) {
      const userInfo = await getUserInfo(userId);

      if (!userInfo || !userInfo.email) {
        console.error(
          `[Token Expiration Job] User info or email not found for userId: ${userId}`
        );
        errorCount++;
        continue;
      }

      const success = await sendExpirationNotification(
        userInfo.email,
        userInfo.name || "Usuario",
        userTokens
      );

      if (success) {
        successCount++;
        console.log(
          `[Token Expiration Job] Notification sent to ${userInfo.email} (${userTokens.length} tokens)`
        );
      } else {
        errorCount++;
      }
    }

    console.log(
      `[Token Expiration Job] Job completed: ${successCount} notifications sent, ${errorCount} errors`
    );
  } catch (error) {
    console.error("[Token Expiration Job] Job failed:", error);
  }
}

// Exportar para uso en el servidor
export default runTokenExpirationJob;
