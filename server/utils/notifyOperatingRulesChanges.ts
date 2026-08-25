import { getDb } from "../db";
import { users, committeeMembers, notifications } from "../../drizzle/schema";
import { eq, and, or, sql } from "drizzle-orm";
import { sendEmail } from "../_core/email";

interface NotificationData {
  type: "created" | "updated" | "approved" | "restored" | "rejected";
  operatingRuleId: number;
  operatingRuleVersion: string;
  changeDescription?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  creatorEmail?: string;
  changedByUserId?: number;
  changedByName?: string | null;
}

/**
 * Notificar a todos los miembros del comité sobre cambios en las bases de funcionamiento
 */
export async function notifyOperatingRulesChanges(data: NotificationData) {
  const db = await getDb();

  try {
    // Obtener todos los miembros activos del comité
    const committeeUserIds = await db!
      .select({ userId: committeeMembers.userId })
      .from(committeeMembers)
      .where(eq(committeeMembers.isActive, true));

    if (committeeUserIds.length === 0) {
      console.log("No active committee members to notify");
      return { success: true, notified: 0 };
    }

    // Obtener información de usuarios
    const committeeUsers = await db!
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(
        sql`${users.id} IN (${sql.join(
          committeeUserIds.map(
            (m: (typeof committeeUserIds)[number]) => sql`${m.userId}`
          ),
          sql`, `
        )})`
      );

    // Preparar mensaje según tipo de cambio
    let notificationTitle = "";
    let notificationMessage = "";
    let emailSubject = "";
    let emailBody = "";

    const documentUrl = `${process.env.VITE_FRONTEND_FORGE_API_URL || "https://app.manus.space"}/committee-operating-rules`;

    switch (data.type) {
      case "created":
        notificationTitle = "Nueva Base de Funcionamiento Creada";
        notificationMessage = `Se ha creado una nueva base de funcionamiento del comité (${data.operatingRuleVersion}).`;
        emailSubject = "Nueva Base de Funcionamiento del Comité";
        emailBody = `
          <h2>Nueva Base de Funcionamiento del Comité</h2>
          <p>Estimado miembro del comité,</p>
          <p>Se ha creado una nueva base de funcionamiento del comité:</p>
          <ul>
            <li><strong>Versión:</strong> ${data.operatingRuleVersion}</li>
            <li><strong>Fecha:</strong> ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</li>
          </ul>
          <p>Por favor, revise el documento en el sistema.</p>
          <p><a href="${documentUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Ver Documento</a></p>
        `;
        break;

      case "updated":
        notificationTitle = "Base de Funcionamiento Actualizada";
        notificationMessage = `Se ha actualizado la base de funcionamiento del comité (${data.operatingRuleVersion}). ${data.changeDescription ? `Cambios: ${data.changeDescription}` : ""}`;
        emailSubject = "Actualización de Base de Funcionamiento del Comité";
        emailBody = `
          <h2>Actualización de Base de Funcionamiento del Comité</h2>
          <p>Estimado miembro del comité,</p>
          <p>Se ha actualizado la base de funcionamiento del comité:</p>
          <ul>
            <li><strong>Versión:</strong> ${data.operatingRuleVersion}</li>
            <li><strong>Fecha:</strong> ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</li>
            ${data.changeDescription ? `<li><strong>Descripción de cambios:</strong> ${data.changeDescription}</li>` : ""}
          </ul>
          <p>Por favor, revise los cambios realizados en el sistema.</p>
          <p><a href="${documentUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Ver Cambios</a></p>
        `;
        break;

      case "approved":
        notificationTitle = "Base de Funcionamiento Aprobada";
        notificationMessage = `La base de funcionamiento del comité (${data.operatingRuleVersion}) ha sido aprobada y ahora está activa.`;
        emailSubject = "Base de Funcionamiento del Comité Aprobada";
        emailBody = `
          <h2>Base de Funcionamiento del Comité Aprobada</h2>
          <p>Estimado miembro del comité,</p>
          <p>La base de funcionamiento del comité ha sido oficialmente aprobada:</p>
          <ul>
            <li><strong>Versión:</strong> ${data.operatingRuleVersion}</li>
            <li><strong>Fecha de aprobación:</strong> ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</li>
          </ul>
          <p>Esta versión ahora está activa y en vigor.</p>
          <p><a href="${documentUrl}" style="display: inline-block; padding: 10px 20px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 5px;">Ver Documento Aprobado</a></p>
        `;
        break;

      case "restored":
        notificationTitle = "Base de Funcionamiento Restaurada";
        notificationMessage = `Se ha restaurado una versión anterior de la base de funcionamiento del comité (${data.operatingRuleVersion}). ${data.changeDescription ? `Motivo: ${data.changeDescription}` : ""}`;
        emailSubject = "Restauración de Base de Funcionamiento del Comité";
        emailBody = `
          <h2>Restauración de Base de Funcionamiento del Comité</h2>
          <p>Estimado miembro del comité,</p>
          <p>Se ha restaurado una versión anterior de la base de funcionamiento del comité:</p>
          <ul>
            <li><strong>Versión:</strong> ${data.operatingRuleVersion}</li>
            <li><strong>Fecha:</strong> ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</li>
            ${data.changeDescription ? `<li><strong>Motivo de restauración:</strong> ${data.changeDescription}</li>` : ""}
          </ul>
          <p>Por favor, revise la versión restaurada en el sistema.</p>
          <p><a href="${documentUrl}" style="display: inline-block; padding: 10px 20px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px;">Ver Documento</a></p>
         `;
        break;

      case "rejected":
        notificationTitle = "Base de Funcionamiento Rechazada";
        notificationMessage = `La base de funcionamiento del comité (${data.operatingRuleVersion}) ha sido rechazada por ${data.rejectedBy}. Motivo: ${data.rejectionReason}`;
        emailSubject = "Base de Funcionamiento del Comité Rechazada";
        emailBody = `
          <h2 style="color: #dc2626;">Base de Funcionamiento del Comité Rechazada</h2>
          <p>Estimado creador,</p>
          <p>La base de funcionamiento del comité ha sido rechazada y ha regresado a estado borrador:</p>
          <ul>
            <li><strong>Versión:</strong> ${data.operatingRuleVersion}</li>
            <li><strong>Rechazado por:</strong> ${data.rejectedBy}</li>
            <li><strong>Fecha:</strong> ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</li>
            <li><strong>Motivo de rechazo:</strong> ${data.rejectionReason}</li>
          </ul>
          <p>Por favor, realice las correcciones necesarias y vuelva a solicitar aprobación.</p>
          <p><a href="${documentUrl}" style="display: inline-block; padding: 10px 20px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 5px;">Revisar Documento</a></p>
        `;
        break;
    }

    // Crear notificaciones internas para cada miembro
    const notificationPromises = committeeUsers.map(
      async (user: (typeof committeeUsers)[number]) => {
        // Crear notificación interna
        await db!.insert(notifications).values({
          userId: user.id,
          title: notificationTitle,
          message: notificationMessage,
          type: "committee",
          relatedEntityType: "operating_rule",
          relatedEntityId: data.operatingRuleId,
          isRead: false,
        });

        // Enviar email si el usuario tiene email configurado
        if (user.email) {
          try {
            await sendEmail({
              to: user.email,
              subject: emailSubject,
              html: emailBody,
            });
          } catch (emailError) {
            console.error(`Error sending email to ${user.email}:`, emailError);
            // No lanzar error, continuar con otros usuarios
          }
        }
      }
    );

    await Promise.all(notificationPromises);

    console.log(
      `Notified ${committeeUsers.length} committee members about operating rules change`
    );

    return {
      success: true,
      notified: committeeUsers.length,
    };
  } catch (error) {
    console.error("Error notifying operating rules changes:", error);
    // No lanzar error para no interrumpir el flujo principal
    return {
      success: false,
      notified: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
