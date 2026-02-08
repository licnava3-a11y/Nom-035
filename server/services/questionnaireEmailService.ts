import { getDb } from "../db";
import { companyGeneralData } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

interface QuestionnaireEmailData {
  employeeName: string;
  employeeEmail: string;
  questionnaireType: "mobbing" | "burnout";
  accessToken: string;
  expiresAt: Date;
  caseFollio: string;
}

/**
 * Envía correo electrónico con enlace al cuestionario de investigación
 */
export async function sendQuestionnaireEmail(data: QuestionnaireEmailData): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[Questionnaire Email] Database connection failed");
      return false;
    }

    // Obtener configuración de correos de la empresa
    const [companyData] = await db
      .select({
        noreplyEmail: companyGeneralData.noreplyEmail,
        companyName: companyGeneralData.razonSocial,
      })
      .from(companyGeneralData)
      .limit(1);

    if (!companyData?.noreplyEmail) {
      console.error("[Questionnaire Email] No se encontró correo noreply configurado");
      return false;
    }

    // Construir URL del cuestionario
    const questionnaireUrl = `${process.env.VITE_FRONTEND_URL || 'http://localhost:3000'}/questionnaire/${data.accessToken}`;

    // Determinar tipo de cuestionario en español
    const questionnaireTypeLabel = data.questionnaireType === "mobbing" 
      ? "Mobbing (Acoso Laboral)" 
      : "Burnout (Síndrome de Desgaste Profesional)";

    // Construir HTML del correo
    const htmlContent = generateQuestionnaireEmailHTML({
      employeeName: data.employeeName,
      questionnaireType: questionnaireTypeLabel,
      questionnaireUrl,
      expiresAt: data.expiresAt,
      caseFollio: data.caseFollio,
      companyName: companyData.companyName || "NOM-035 STPS",
    });

    // TODO: Implementar envío real de correo cuando se configure SMTP
    // Por ahora, solo registramos en consola
    console.log("[Questionnaire Email] Correo preparado para envío:");
    console.log(`  De: ${companyData.noreplyEmail}`);
    console.log(`  Para: ${data.employeeEmail}`);
    console.log(`  Asunto: Cuestionario de Investigación - ${questionnaireTypeLabel}`);
    console.log(`  URL: ${questionnaireUrl}`);
    console.log(`  Expira: ${data.expiresAt.toLocaleDateString('es-MX')}`);

    // Simular envío exitoso
    return true;
  } catch (error) {
    console.error("[Questionnaire Email] Error al enviar correo:", error);
    return false;
  }
}

/**
 * Genera HTML profesional para el correo del cuestionario
 */
function generateQuestionnaireEmailHTML(params: {
  employeeName: string;
  questionnaireType: string;
  questionnaireUrl: string;
  expiresAt: Date;
  caseFollio: string;
  companyName: string;
}): string {
  const { employeeName, questionnaireType, questionnaireUrl, expiresAt, caseFollio, companyName } = params;

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cuestionario de Investigación NOM-035</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 40px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                Cuestionario de Investigación
              </h1>
              <p style="margin: 10px 0 0 0; color: #e0e7ff; font-size: 14px;">
                NOM-035-STPS-2018
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #1f2937; font-size: 16px; line-height: 1.5;">
                Estimado(a) <strong>${employeeName}</strong>,
              </p>

              <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                Como parte del proceso de investigación del caso <strong>${caseFollio}</strong>, se le solicita completar el siguiente cuestionario de evaluación:
              </p>

              <!-- Questionnaire Type Badge -->
              <div style="background-color: #f3f4f6; border-left: 4px solid #667eea; padding: 16px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: #374151; font-size: 14px; font-weight: 600;">
                  Tipo de Cuestionario:
                </p>
                <p style="margin: 8px 0 0 0; color: #667eea; font-size: 16px; font-weight: 700;">
                  ${questionnaireType}
                </p>
              </div>

              <p style="margin: 20px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
                Este cuestionario es confidencial y sus respuestas serán utilizadas exclusivamente para fines de evaluación y cumplimiento normativo según la NOM-035-STPS-2018.
              </p>

              <!-- CTA Button -->
              <table role="presentation" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${questionnaireUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);">
                      Responder Cuestionario
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiration Notice -->
              <div style="background-color: #fef3c7; border: 1px solid #fbbf24; padding: 16px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  <strong>⚠️ Importante:</strong> Este enlace expirará el <strong>${expiresAt.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>. Por favor, complete el cuestionario antes de esta fecha.
                </p>
              </div>

              <!-- Alternative Link -->
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 13px; line-height: 1.5;">
                Si el botón no funciona, puede copiar y pegar el siguiente enlace en su navegador:
              </p>
              <p style="margin: 8px 0 0 0; word-break: break-all;">
                <a href="${questionnaireUrl}" style="color: #667eea; text-decoration: none; font-size: 13px;">
                  ${questionnaireUrl}
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px 40px; border-radius: 0 0 8px 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; text-align: center;">
                Este correo fue enviado por:
              </p>
              <p style="margin: 0; color: #374151; font-size: 14px; font-weight: 600; text-align: center;">
                ${companyName}
              </p>
              <p style="margin: 15px 0 0 0; color: #9ca3af; font-size: 12px; text-align: center; line-height: 1.5;">
                Sistema de Gestión NOM-035-STPS-2018<br>
                Prevención de Riesgos Psicosociales en el Trabajo
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}
