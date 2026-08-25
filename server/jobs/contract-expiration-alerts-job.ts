import { getDb } from "../db";
import { employees, systemSettings } from "../../drizzle/schema";
import { sql } from "drizzle-orm";
import {
  sendEmail,
  getContractExpiringTemplate,
} from "../services/emailService";

/**
 * Job para enviar alertas de vencimiento de contratos
 * Se ejecuta diariamente y envía un email consolidado con todos los contratos que vencen en los próximos 7 días
 */
export async function runContractExpirationAlertsJob() {
  console.log(
    "[Contract Expiration Alerts Job] Iniciando verificación de contratos próximos a vencer..."
  );

  try {
    const db = await getDb();
    if (!db) {
      console.error(
        "[Contract Expiration Alerts Job] Error: Base de datos no disponible"
      );
      return {
        success: false,
        error: "Base de datos no disponible",
      };
    }

    // Obtener configuración del sistema para email de RH
    const [settings] = await db.select().from(systemSettings).limit(1);
    const hrEmail = (settings as any)?.hrEmail;

    if (!hrEmail) {
      console.warn(
        "[Contract Expiration Alerts Job] No hay email de RH configurado. Saltando envío de alertas."
      );
      return {
        success: false,
        error: "Email de Recursos Humanos no configurado",
      };
    }

    const today = new Date();
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    // Buscar empleados con contratos próximos a vencer
    const expiringContracts: Array<{
      employeeName: string;
      contractType: string;
      expirationDate: Date;
      daysRemaining: number;
    }> = [];

    // Obtener todos los empleados activos
    const activeEmployees = await db.select().from(employees);

    for (const employee of activeEmployees) {
      // Verificar cada tipo de contrato
      const contractFields = [
        {
          field: (employee as any).contract1ExpirationDate,
          type: "Contrato 1",
        },
        {
          field: (employee as any).contract2ExpirationDate,
          type: "Contrato 2",
        },
        {
          field: (employee as any).contract3ExpirationDate,
          type: "Contrato 3",
        },
      ];

      for (const contract of contractFields) {
        if (contract.field) {
          const expirationDate = new Date(contract.field);
          const timeDiff = expirationDate.getTime() - today.getTime();
          const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

          // Si vence en los próximos 7 días
          if (daysRemaining >= 0 && daysRemaining <= 7) {
            expiringContracts.push({
              employeeName:
                `${employee.firstName} ${employee.lastName}` || "Sin nombre",
              contractType: contract.type,
              expirationDate,
              daysRemaining,
            });
          }
        }
      }
    }

    if (expiringContracts.length === 0) {
      console.log(
        "[Contract Expiration Alerts Job] No hay contratos próximos a vencer en los próximos 7 días."
      );
      return {
        success: true,
        contractsChecked: activeEmployees.length,
        alertsSent: 0,
      };
    }

    // Ordenar por días restantes (más urgentes primero)
    expiringContracts.sort(
      (a: any, b: any) => a.daysRemaining - b.daysRemaining
    );

    // Generar email con template
    const emailHtml = getContractExpiringTemplate({
      contracts: expiringContracts,
    });

    // Enviar email consolidado
    const result = await sendEmail({
      to: hrEmail,
      subject: `⏰ Alerta: ${expiringContracts.length} contrato(s) próximo(s) a vencer`,
      html: emailHtml,
      template: "contract_expiring",
    });

    if (result.success) {
      console.log(
        `[Contract Expiration Alerts Job] Email enviado exitosamente a ${hrEmail} con ${expiringContracts.length} contratos.`
      );
    } else {
      console.error(
        `[Contract Expiration Alerts Job] Error al enviar email: ${result.error}`
      );
    }

    return {
      success: result.success,
      contractsChecked: activeEmployees.length,
      contractsExpiring: expiringContracts.length,
      emailSent: result.success,
      emailTo: hrEmail,
    };
  } catch (error) {
    console.error("[Contract Expiration Alerts Job] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido",
    };
  }
}
