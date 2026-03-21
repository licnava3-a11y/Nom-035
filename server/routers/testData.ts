import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { evaluation360Assignments } from "../../drizzle/schema";

export const testDataRouter = router({
  seedSession29: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    try {
      // 1. Insertar 2 ciclos de evaluación 360° usando SQL raw para evitar problemas de timezone
      await db.execute(sql`
        INSERT INTO evaluation_360_cycles (cycle_name, description, start_date, end_date, status, created_by) VALUES
        ('Evaluación 360° Q1 2026', 'Ciclo de evaluación del primer trimestre 2026', '2026-01-15', '2026-03-31', 'active', ${ctx.user.id}),
        ('Evaluación 360° Q4 2025', 'Ciclo de evaluación del cuarto trimestre 2025 (completado)', '2025-10-01', '2025-12-31', 'completed', ${ctx.user.id})
      `);

      // Obtener IDs de ciclos recién creados
      const cyclesResult = await db.execute(sql`
        SELECT id FROM evaluation_360_cycles ORDER BY created_at DESC LIMIT 2
      `);
      const cyclesRows = (cyclesResult as any)[0] as Array<{ id: number }>;
      const cycleIds = cyclesRows.map((row: any) => row.id).reverse();
      const cycle1Id = cycleIds[0];
      const cycle2Id = cycleIds[1];

      // Obtener empleados existentes (primeros 10)
      const employeesResult = await db.execute(sql`
        SELECT id FROM employees ORDER BY id ASC LIMIT 10
      `);
      const employeesRows = (employeesResult as any)[0] as Array<{ id: number }>;
      const employeeIds = employeesRows.map((row: any) => row.id);

      if (employeeIds.length < 10) {
        throw new Error(`Solo hay ${employeeIds.length} empleados en la base de datos. Se requieren al menos 10 para generar datos de prueba.`);
      }

      // 2. Insertar 10 asignaciones de empleados a ciclos
      await (db.insert(evaluation360Assignments) as any).values([
        { cycleId: cycle1Id, evaluatedEmployeeId: employeeIds[0], status: 'pending' },
        { cycleId: cycle1Id, evaluatedEmployeeId: employeeIds[1], status: 'in_progress' },
        { cycleId: cycle1Id, evaluatedEmployeeId: employeeIds[2], status: 'pending' },
        { cycleId: cycle1Id, evaluatedEmployeeId: employeeIds[3], status: 'in_progress' },
        { cycleId: cycle1Id, evaluatedEmployeeId: employeeIds[4], status: 'pending' },
        { cycleId: cycle2Id, evaluatedEmployeeId: employeeIds[5], status: 'completed' },
        { cycleId: cycle2Id, evaluatedEmployeeId: employeeIds[6], status: 'completed' },
        { cycleId: cycle2Id, evaluatedEmployeeId: employeeIds[7], status: 'completed' },
        { cycleId: cycle2Id, evaluatedEmployeeId: employeeIds[8], status: 'completed' },
        { cycleId: cycle2Id, evaluatedEmployeeId: employeeIds[9], status: 'completed' },
      ]);

      // 3. Insertar umbrales de alertas tempranas (30% riesgo alto por defecto)
      await db.execute(sql`
        INSERT INTO risk_alert_thresholds (department_id, high_risk_threshold, medium_risk_threshold, alert_enabled, created_by) VALUES
        (1, 30, 20, 1, ${ctx.user.id}),
        (2, 35, 25, 1, ${ctx.user.id}),
        (3, 25, 15, 1, ${ctx.user.id})
      `);

      // 4. Insertar 2 reportes programados
      await db.execute(sql`
        INSERT INTO scheduled_reports (report_name, description, frequency, recipients, include_nmx025, include_nom035, is_active, created_by) VALUES
        ('Reporte Ejecutivo Mensual', 'Dashboard ejecutivo con métricas NMX-025 y NOM-035', 'monthly', 'director@empresa.com,rh@empresa.com', 1, 1, 1, ${ctx.user.id}),
        ('Reporte Trimestral de Cumplimiento', 'Reporte trimestral de cumplimiento normativo', 'quarterly', 'gerencia@empresa.com,legal@empresa.com', 1, 1, 1, ${ctx.user.id})
      `);

      // 5. Insertar historial de reportes (simulando envíos previos)
      await db.execute(sql`
        INSERT INTO report_history (report_id, sent_at, status, recipients) VALUES
        (LAST_INSERT_ID() - 1, '2026-01-01 08:00:00', 'sent', 'director@empresa.com,rh@empresa.com'),
        (LAST_INSERT_ID() - 1, '2025-12-01 08:00:00', 'sent', 'director@empresa.com,rh@empresa.com'),
        (LAST_INSERT_ID(), '2025-10-01 08:00:00', 'sent', 'gerencia@empresa.com,legal@empresa.com')
      `);

      return {
        success: true,
        message: 'Datos de prueba de Sesión 29 insertados exitosamente',
        data: {
          cycles: 2,
          assignments: 10,
          thresholds: 3,
          scheduledReports: 2,
          reportHistory: 3
        }
      };
    } catch (error: any) {
      console.error('Error seeding Session 29 test data:', error);
      throw new Error(`Error al insertar datos de prueba: ${error.message}`);
    }
  })
});
