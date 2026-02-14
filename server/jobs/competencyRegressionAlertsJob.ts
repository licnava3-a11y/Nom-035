import { getDb } from "../db";
import { competencyRegressionAlerts, skillsMatrixSnapshots, employees, organizationalCompetencies, departments } from "../../drizzle/schema";
import { desc, eq, and } from "drizzle-orm";
import { sendEmail } from "../lib/email-sender";

/**
 * Competency Regression Alerts Job
 * Detects significant drops in employee competency levels by comparing consecutive snapshots
 * Sends notifications to supervisors and HR when regressions are detected
 * Runs daily at 9:00 AM
 */

interface EmployeeCompetency {
  employeeId: number;
  competencyId: number;
  level: number;
}

interface RegressionAlert {
  employeeId: number;
  employeeName: string;
  competencyId: number;
  competencyName: string;
  previousLevel: number;
  currentLevel: number;
  levelDrop: number;
  departmentName: string | null;
}

export async function detectCompetencyRegressions() {
  const startTime = Date.now();
  console.log(`[Competency Regression Job] Starting regression detection at ${new Date().toISOString()}`);

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Competency Regression Job] Database connection failed");
      return { success: false, error: "Database connection failed" };
    }

    // Get the two most recent snapshots for each department
    const allSnapshots = await db
      .select()
      .from(skillsMatrixSnapshots)
      .orderBy(desc(skillsMatrixSnapshots.snapshotDate));

    if (allSnapshots.length < 2) {
      console.log("[Competency Regression Job] Not enough snapshots to compare (need at least 2)");
      return { success: true, message: "Not enough snapshots to compare" };
    }

    const results = {
      totalRegressions: 0,
      notificationsSent: 0,
      errors: [] as string[],
      regressionsByDepartment: {} as Record<string, number>,
    };

    // Group snapshots by department
    const snapshotsByDept = new Map<number | null, typeof allSnapshots>();
    for (const snapshot of allSnapshots) {
      const deptId = snapshot.departmentId;
      if (!snapshotsByDept.has(deptId)) {
        snapshotsByDept.set(deptId, []);
      }
      snapshotsByDept.get(deptId)!.push(snapshot);
    }

    // Process each department
    for (const [deptId, deptSnapshots] of snapshotsByDept.entries()) {
      if (deptSnapshots.length < 2) {
        console.log(`[Competency Regression Job] Skipping department ${deptId} - not enough snapshots`);
        continue;
      }

      // Get the two most recent snapshots
      const [currentSnapshot, previousSnapshot] = deptSnapshots.slice(0, 2);

      console.log(`[Competency Regression Job] Comparing snapshots: ${currentSnapshot.name} vs ${previousSnapshot.name}`);

      // Extract employee competencies from both snapshots
      const currentData = currentSnapshot.data as any;
      const previousData = previousSnapshot.data as any;

      const currentCompetencies = new Map<string, EmployeeCompetency>();
      const previousCompetencies = new Map<string, EmployeeCompetency>();

      // Build maps for easy comparison
      for (const emp of currentData.employees || []) {
        for (const comp of emp.competencies || []) {
          const key = `${emp.employeeId}-${comp.competencyId}`;
          currentCompetencies.set(key, {
            employeeId: emp.employeeId,
            competencyId: comp.competencyId,
            level: comp.currentLevel || 0,
          });
        }
      }

      for (const emp of previousData.employees || []) {
        for (const comp of emp.competencies || []) {
          const key = `${emp.employeeId}-${comp.competencyId}`;
          previousCompetencies.set(key, {
            employeeId: emp.employeeId,
            competencyId: comp.competencyId,
            level: comp.currentLevel || 0,
          });
        }
      }

      // Detect regressions (level drops of 1 or more)
      const regressions: RegressionAlert[] = [];

      for (const [key, current] of currentCompetencies.entries()) {
        const previous = previousCompetencies.get(key);
        if (!previous) continue;

        const levelDrop = previous.level - current.level;
        if (levelDrop >= 1) {
          // Significant regression detected
          const empData = currentData.employees.find((e: any) => e.employeeId === current.employeeId);
          const compData = empData?.competencies.find((c: any) => c.competencyId === current.competencyId);

          regressions.push({
            employeeId: current.employeeId,
            employeeName: `${empData?.firstName || ''} ${empData?.lastName || ''}`.trim(),
            competencyId: current.competencyId,
            competencyName: compData?.competencyName || 'Competencia desconocida',
            previousLevel: previous.level,
            currentLevel: current.level,
            levelDrop,
            departmentName: empData?.departmentName || null,
          });

          // Save alert to database
          try {
            await db.insert(competencyRegressionAlerts).values({
              employeeId: current.employeeId,
              snapshotId: currentSnapshot.id,
              previousSnapshotId: previousSnapshot.id,
              competencyId: current.competencyId,
              previousLevel: previous.level,
              currentLevel: current.level,
              levelDrop: -levelDrop, // Store as negative number
              alertDate: new Date(),
              notificationSent: false,
            });

            results.totalRegressions++;
            const deptName = empData?.departmentName || 'Sin departamento';
            results.regressionsByDepartment[deptName] = (results.regressionsByDepartment[deptName] || 0) + 1;
          } catch (error: any) {
            console.error(`[Competency Regression Job] Error saving alert for employee ${current.employeeId}:`, error);
            results.errors.push(`Error saving alert: ${error.message}`);
          }
        }
      }

      // Send notifications if regressions were detected
      if (regressions.length > 0) {
        console.log(`[Competency Regression Job] Detected ${regressions.length} regressions in department ${deptId}`);

        try {
          await sendRegressionNotifications(regressions, currentSnapshot.name, previousSnapshot.name);
          results.notificationsSent++;
        } catch (error: any) {
          console.error(`[Competency Regression Job] Error sending notifications:`, error);
          results.errors.push(`Error sending notifications: ${error.message}`);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Competency Regression Job] Completed in ${duration}ms. Results:`, results);

    return {
      success: true,
      results,
      duration,
    };
  } catch (error: any) {
    console.error("[Competency Regression Job] Fatal error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

async function sendRegressionNotifications(
  regressions: RegressionAlert[],
  currentSnapshotName: string,
  previousSnapshotName: string
) {
  // Group regressions by department
  const byDepartment = new Map<string, RegressionAlert[]>();
  for (const reg of regressions) {
    const dept = reg.departmentName || 'Sin departamento';
    if (!byDepartment.has(dept)) {
      byDepartment.set(dept, []);
    }
    byDepartment.get(dept)!.push(reg);
  }

  // Send email notification for each department
  for (const [deptName, deptRegressions] of byDepartment.entries()) {
    const subject = `🚨 Alerta: Retrocesos de Competencias Detectados - ${deptName}`;

    const employeeList = deptRegressions
      .map(r => `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${r.employeeName}</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${r.competencyName}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${r.previousLevel}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${r.currentLevel}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center; color: #dc2626; font-weight: bold;">-${r.levelDrop}</td>
        </tr>
      `)
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">⚠️ Alerta de Retrocesos de Competencias</h2>
        <p>Se han detectado <strong>${deptRegressions.length} retrocesos significativos</strong> en competencias del departamento <strong>${deptName}</strong>.</p>
        
        <p><strong>Comparación:</strong> ${previousSnapshotName} → ${currentSnapshotName}</p>
        
        <h3 style="color: #1f2937; margin-top: 24px;">Empleados Afectados:</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
          <thead>
            <tr style="background-color: #f3f4f6;">
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Empleado</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Competencia</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Nivel Anterior</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Nivel Actual</th>
              <th style="padding: 8px; border: 1px solid #ddd; text-align: center;">Cambio</th>
            </tr>
          </thead>
          <tbody>
            ${employeeList}
          </tbody>
        </table>
        
        <div style="margin-top: 24px; padding: 16px; background-color: #fef2f2; border-left: 4px solid #dc2626;">
          <h4 style="margin: 0 0 8px 0; color: #991b1b;">Acciones Recomendadas:</h4>
          <ul style="margin: 0; padding-left: 20px;">
            <li>Revisar las causas del retroceso con cada empleado afectado</li>
            <li>Programar sesiones de reforzamiento o capacitación adicional</li>
            <li>Evaluar si existen factores externos que afecten el desempeño</li>
            <li>Dar seguimiento cercano en los próximos snapshots</li>
          </ul>
        </div>
        
        <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">
          Este es un mensaje automático generado por el sistema de Gestión de Talento.
        </p>
      </div>
    `;

    try {
      // Send to HR and supervisors (you can customize recipients here)
      await sendEmail({
        to: process.env.OWNER_EMAIL || "rh@empresa.com",
        subject,
        html,
      });
      console.log(`[Competency Regression Job] Notification sent for department: ${deptName}`);
    } catch (error: any) {
      console.error(`[Competency Regression Job] Error sending email for ${deptName}:`, error);
      throw error;
    }
  }
}
