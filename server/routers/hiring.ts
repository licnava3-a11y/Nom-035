import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { employees, users } from "../../drizzle/schema";
import { eq, and, lte, gte, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sendEmail } from "../lib/email-service";

/**
 * Generate random password
 */
function generatePassword(length: number = 12): string {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

/**
 * Generate username from employee data
 */
function generateUsername(firstName: string, lastName: string): string {
  const firstPart = firstName.toLowerCase().replace(/\s+/g, "");
  const lastPart = lastName.toLowerCase().replace(/\s+/g, "");
  const randomSuffix = Math.floor(Math.random() * 1000);
  return `${firstPart}.${lastPart}${randomSuffix}`;
}

export const hiringRouter = router({
  /**
   * Create user account for employee and send credentials
   */
  createEmployeeAccount: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        role: z.enum(["admin", "instructor", "student", "committee", "committee_member", "committee_coordinator"]).default("student"),
        sendToPersonalEmail: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      // Get employee data
      const [employee] = await db
        .select()
        .from(employees)
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }

      // Check if employee already has a user account
      if (employee.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El empleado ya tiene una cuenta de usuario",
        });
      }

      // Generate credentials
      const username = generateUsername(employee.firstName, employee.lastName);
      const password = generatePassword();

      // Create user account
      const [user] = await db.insert(users).values({
        openId: `employee_${employee.id}_${Date.now()}`,
        name: `${employee.firstName} ${employee.lastName}`,
        email: employee.email,
        role: input.role,
      });

      // Link user to employee
      await db
        .update(employees)
        .set({ userId: user.insertId })
        .where(eq(employees.id, input.employeeId));

      // Prepare email
      const recipientEmail = input.sendToPersonalEmail ? employee.email : employee.email;
      const emailSubject = "Bienvenido al Sistema de Gestión NOM-035";
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .credentials { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
    .credential-item { margin: 10px 0; }
    .credential-label { font-weight: bold; color: #667eea; }
    .credential-value { font-family: monospace; background: #f0f0f0; padding: 5px 10px; border-radius: 4px; display: inline-block; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Bienvenido al Sistema!</h1>
      <p>Plataforma de Gestión NOM-035 STPS 2018</p>
    </div>
    <div class="content">
      <p>Hola <strong>${employee.firstName} ${employee.lastName}</strong>,</p>
      
      <p>Tu cuenta de usuario ha sido creada exitosamente. A continuación encontrarás tus credenciales de acceso:</p>
      
      <div class="credentials">
        <div class="credential-item">
          <span class="credential-label">Usuario:</span>
          <span class="credential-value">${username}</span>
        </div>
        <div class="credential-item">
          <span class="credential-label">Contraseña:</span>
          <span class="credential-value">${password}</span>
        </div>
      </div>
      
      <p><strong>⚠️ Importante:</strong> Por seguridad, te recomendamos cambiar tu contraseña en tu primer inicio de sesión.</p>
      
      <p>Puedes acceder al sistema haciendo clic en el siguiente botón:</p>
      
      <div style="text-align: center;">
        <a href="${process.env.VITE_FRONTEND_FORGE_API_URL || 'https://app.manus.im'}" class="button">
          Acceder al Sistema
        </a>
      </div>
      
      <p>Si tienes alguna pregunta o necesitas ayuda, no dudes en contactar al administrador del sistema.</p>
      
      <p>Saludos cordiales,<br>
      <strong>Equipo de Gestión NOM-035</strong></p>
    </div>
    <div class="footer">
      <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
    </div>
  </div>
</body>
</html>
      `;

      // Send email
      try {
        await sendEmail({
          from: "noreply@nom035.com",
          to: recipientEmail,
          subject: emailSubject,
          html: emailHtml,
        });
      } catch (error) {
        console.error("Error sending welcome email:", error);
        // Don't fail the whole operation if email fails
      }

      return {
        success: true,
        userId: user.insertId,
        username,
        message: "Cuenta creada y credenciales enviadas por correo",
      };
    }),

  /**
   * Get contracts expiring soon (within 7 days)
   */
  getExpiringContracts: protectedProcedure
    .input(z.object({ daysAhead: z.number().default(7) }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + input.daysAhead);

      // Get all active employees and filter in memory
      const allEmployees = await db
        .select()
        .from(employees)
        .where(eq(employees.isActive, true));

      // Filter employees with expiring contracts
      const expiringEmployees = allEmployees.filter((emp) => {
        const hasExpiring = [
          emp.contract1ExpirationDate,
          emp.contract2ExpirationDate,
          emp.contract3ExpirationDate,
        ].some((date) => {
          if (!date) return false;
          const expDate = new Date(date);
          return expDate >= today && expDate <= futureDate;
        });
        return hasExpiring;
      });

      // Format results
      const results = expiringEmployees.map((emp) => {
        const contracts = [];
        if (emp.contract1ExpirationDate) {
          contracts.push({
            type: "Contrato 1",
            expirationDate: emp.contract1ExpirationDate,
          });
        }
        if (emp.contract2ExpirationDate) {
          contracts.push({
            type: "Contrato 2",
            expirationDate: emp.contract2ExpirationDate,
          });
        }
        if (emp.contract3ExpirationDate) {
          contracts.push({
            type: "Contrato 3",
            expirationDate: emp.contract3ExpirationDate,
          });
        }

        return {
          ...emp,
          expiringContracts: contracts.filter((c) => {
            const expDate = new Date(c.expirationDate);
            return expDate >= today && expDate <= futureDate;
          }),
        };
      });

      return results.filter((r) => r.expiringContracts.length > 0);
    }),

  /**
   * Send consolidated report of expiring contracts to HR
   */
  sendExpiringContractsReport: protectedProcedure
    .input(
      z.object({
        hrEmail: z.string().email(),
        daysAhead: z.number().default(7),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + input.daysAhead);

      // Get all active employees and filter in memory
      const allEmployees = await db
        .select()
        .from(employees)
        .where(eq(employees.isActive, true));

      // Filter employees with expiring contracts
      const expiringEmployees = allEmployees.filter((emp) => {
        const hasExpiring = [
          emp.contract1ExpirationDate,
          emp.contract2ExpirationDate,
          emp.contract3ExpirationDate,
        ].some((date) => {
          if (!date) return false;
          const expDate = new Date(date);
          return expDate >= today && expDate <= futureDate;
        });
        return hasExpiring;
      });

      if (expiringEmployees.length === 0) {
        return {
          success: true,
          message: "No hay contratos próximos a vencer",
        };
      }

      // Build table rows
      let tableRows = "";
      expiringEmployees.forEach((emp) => {
        const contracts = [];
        if (emp.contract1ExpirationDate) {
          const expDate = new Date(emp.contract1ExpirationDate);
          if (expDate >= today && expDate <= futureDate) {
            contracts.push({
              type: "Contrato 1",
              date: emp.contract1ExpirationDate,
            });
          }
        }
        if (emp.contract2ExpirationDate) {
          const expDate = new Date(emp.contract2ExpirationDate);
          if (expDate >= today && expDate <= futureDate) {
            contracts.push({
              type: "Contrato 2",
              date: emp.contract2ExpirationDate,
            });
          }
        }
        if (emp.contract3ExpirationDate) {
          const expDate = new Date(emp.contract3ExpirationDate);
          if (expDate >= today && expDate <= futureDate) {
            contracts.push({
              type: "Contrato 3",
              date: emp.contract3ExpirationDate,
            });
          }
        }

        contracts.forEach((contract) => {
          tableRows += `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #ddd;">${emp.employeeNumber || "-"}</td>
              <td style="padding: 12px; border-bottom: 1px solid #ddd;">${emp.firstName} ${emp.lastName}</td>
              <td style="padding: 12px; border-bottom: 1px solid #ddd;">${emp.department || "-"}</td>
              <td style="padding: 12px; border-bottom: 1px solid #ddd;">${emp.position || "-"}</td>
              <td style="padding: 12px; border-bottom: 1px solid #ddd;">${contract.type}</td>
              <td style="padding: 12px; border-bottom: 1px solid #ddd;">${new Date(contract.date).toLocaleDateString()}</td>
            </tr>
          `;
        });
      });

      const emailSubject = `⚠️ Reporte de Contratos Próximos a Vencer - ${new Date().toLocaleDateString()}`;
      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 900px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; background: white; margin: 20px 0; }
    th { background: #667eea; color: white; padding: 12px; text-align: left; }
    td { padding: 12px; border-bottom: 1px solid #ddd; }
    tr:hover { background: #f5f5f5; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Reporte de Contratos Próximos a Vencer</h1>
      <p>Sistema de Gestión NOM-035 STPS 2018</p>
    </div>
    <div class="content">
      <div class="alert">
        <strong>⚠️ Atención:</strong> Los siguientes contratos vencerán en los próximos ${input.daysAhead} días.
      </div>
      
      <p><strong>Total de contratos próximos a vencer:</strong> ${expiringEmployees.length}</p>
      
      <table>
        <thead>
          <tr>
            <th>No. Empleado</th>
            <th>Nombre</th>
            <th>Departamento</th>
            <th>Puesto</th>
            <th>Tipo de Contrato</th>
            <th>Fecha de Vencimiento</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      
      <p>Por favor, toma las acciones necesarias para renovar o actualizar estos contratos antes de su vencimiento.</p>
      
      <p>Saludos cordiales,<br>
      <strong>Sistema Automático de Gestión NOM-035</strong></p>
    </div>
    <div class="footer">
      <p>Este es un correo automático generado por el sistema.</p>
    </div>
  </div>
</body>
</html>
      `;

      // Send email
      await sendEmail({
        from: "noreply@nom035.com",
        to: input.hrEmail,
        subject: emailSubject,
        html: emailHtml,
      });

      return {
        success: true,
        contractsCount: expiringEmployees.length,
        message: "Reporte enviado exitosamente",
      };
    }),
});
