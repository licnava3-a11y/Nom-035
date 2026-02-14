import { getDb } from "../db";
import { departments, employees, skillsMatrix, organizationalCompetencies, skillsMatrixSnapshots, positions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Automatic Snapshots Job
 * Generates monthly snapshots of the skills matrix for all departments
 * Runs on the 1st of each month at 00:00
 */

export async function generateMonthlySnapshots() {
  const startTime = Date.now();
  console.log(`[Auto Snapshots Job] Starting monthly snapshots generation at ${new Date().toISOString()}`);

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Auto Snapshots Job] Database connection failed");
      return { success: false, error: "Database connection failed" };
    }

    // Get all departments
    const allDepartments = await db.select().from(departments);
    console.log(`[Auto Snapshots Job] Found ${allDepartments.length} departments`);

    const results = {
      totalSnapshots: 0,
      successfulSnapshots: 0,
      failedSnapshots: 0,
      errors: [] as string[],
    };

    // Generate snapshot for each department
    for (const dept of allDepartments) {
      try {
        console.log(`[Auto Snapshots Job] Generating snapshot for department: ${dept.name}`);

        // Get skills matrix data for this department
        const matrixData = await db
          .select({
            employeeId: employees.id,
            firstName: employees.firstName,
            lastName: employees.lastName,
            departmentId: employees.departmentId,
            departmentName: departments.name,
            positionId: employees.positionId,
            positionName: positions.name,
            competencyId: skillsMatrix.competencyId,
            competencyName: organizationalCompetencies.name,
            currentLevel: skillsMatrix.currentLevel,
            requiredLevel: skillsMatrix.requiredLevel,
          })
          .from(skillsMatrix)
          .innerJoin(employees, eq(skillsMatrix.employeeId, employees.id))
          .innerJoin(organizationalCompetencies, eq(skillsMatrix.competencyId, organizationalCompetencies.id))
          .leftJoin(departments, eq(employees.departmentId, departments.id))
          .leftJoin(positions, eq(employees.positionId, positions.id))
          .where(eq(employees.departmentId, dept.id));

        if (matrixData.length === 0) {
          console.log(`[Auto Snapshots Job] No data found for department: ${dept.name}, skipping`);
          continue;
        }

        // Calculate summary statistics
        const employeeIds = new Set(matrixData.map(row => row.employeeId));
        const totalEmployees = employeeIds.size;
        const totalCompetencies = new Set(matrixData.map(row => row.competencyId)).size;

        let totalCurrentLevel = 0;
        let totalGaps = 0;
        let criticalGaps = 0;

        for (const row of matrixData) {
          totalCurrentLevel += row.currentLevel || 0;
          const gap = (row.requiredLevel || 0) - (row.currentLevel || 0);
          if (gap > 0) {
            totalGaps++;
            if (gap >= 2) {
              criticalGaps++;
            }
          }
        }

        const averageCompetencyLevel = totalCurrentLevel / matrixData.length;

        // Prepare snapshot data
        const snapshotData = {
          summary: {
            totalEmployees,
            totalCompetencies,
            averageCompetencyLevel: parseFloat(averageCompetencyLevel.toFixed(2)),
            totalGaps,
            criticalGaps,
          },
          employees: Array.from(employeeIds).map(empId => {
            const empData = matrixData.filter(row => row.employeeId === empId);
            const empInfo = empData[0];
            
            let empTotalLevel = 0;
            let empTotalGaps = 0;
            let empCriticalGaps = 0;

            for (const row of empData) {
              empTotalLevel += row.currentLevel || 0;
              const gap = (row.requiredLevel || 0) - (row.currentLevel || 0);
              if (gap > 0) {
                empTotalGaps++;
                if (gap >= 2) {
                  empCriticalGaps++;
                }
              }
            }

            return {
              employeeId: empId,
              firstName: empInfo.firstName,
              lastName: empInfo.lastName,
              positionId: empInfo.positionId,
              positionName: empInfo.positionName,
              averageLevel: parseFloat((empTotalLevel / empData.length).toFixed(2)),
              totalGaps: empTotalGaps,
              criticalGaps: empCriticalGaps,
              competencies: empData.map(row => ({
                competencyId: row.competencyId,
                competencyName: row.competencyName,
                currentLevel: row.currentLevel,
                requiredLevel: row.requiredLevel,
              })),
            };
          }),
        };

        // Insert snapshot
        const currentDate = new Date();
        const monthName = currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
        
        await db.insert(skillsMatrixSnapshots).values({
          snapshotDate: currentDate,
          name: `Snapshot Automático - ${dept.name} - ${monthName}`,
          description: `Snapshot generado automáticamente el ${currentDate.toLocaleDateString('es-MX')}`,
          data: snapshotData as any,
          createdBy: 1, // System user
          departmentId: dept.id,
        });

        results.totalSnapshots++;
        results.successfulSnapshots++;
        console.log(`[Auto Snapshots Job] Successfully generated snapshot for department: ${dept.name}`);
      } catch (error: any) {
        results.totalSnapshots++;
        results.failedSnapshots++;
        results.errors.push(`Error generating snapshot for ${dept.name}: ${error.message}`);
        console.error(`[Auto Snapshots Job] Error generating snapshot for ${dept.name}:`, error);
      }
    }

    // Generate global snapshot (all departments)
    try {
      console.log(`[Auto Snapshots Job] Generating global snapshot (all departments)`);

      const matrixData = await db
        .select({
          employeeId: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          departmentId: employees.departmentId,
          departmentName: departments.name,
          positionId: employees.positionId,
          positionName: positions.name,
          competencyId: skillsMatrix.competencyId,
          competencyName: organizationalCompetencies.name,
          currentLevel: skillsMatrix.currentLevel,
          requiredLevel: skillsMatrix.requiredLevel,
        })
        .from(skillsMatrix)
        .innerJoin(employees, eq(skillsMatrix.employeeId, employees.id))
        .innerJoin(organizationalCompetencies, eq(skillsMatrix.competencyId, organizationalCompetencies.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id));

      if (matrixData.length > 0) {
        const employeeIds = new Set(matrixData.map(row => row.employeeId));
        const totalEmployees = employeeIds.size;
        const totalCompetencies = new Set(matrixData.map(row => row.competencyId)).size;

        let totalCurrentLevel = 0;
        let totalGaps = 0;
        let criticalGaps = 0;

        for (const row of matrixData) {
          totalCurrentLevel += row.currentLevel || 0;
          const gap = (row.requiredLevel || 0) - (row.currentLevel || 0);
          if (gap > 0) {
            totalGaps++;
            if (gap >= 2) {
              criticalGaps++;
            }
          }
        }

        const averageCompetencyLevel = totalCurrentLevel / matrixData.length;

        const snapshotData = {
          summary: {
            totalEmployees,
            totalCompetencies,
            averageCompetencyLevel: parseFloat(averageCompetencyLevel.toFixed(2)),
            totalGaps,
            criticalGaps,
          },
          employees: Array.from(employeeIds).map(empId => {
            const empData = matrixData.filter(row => row.employeeId === empId);
            const empInfo = empData[0];
            
            let empTotalLevel = 0;
            let empTotalGaps = 0;
            let empCriticalGaps = 0;

            for (const row of empData) {
              empTotalLevel += row.currentLevel || 0;
              const gap = (row.requiredLevel || 0) - (row.currentLevel || 0);
              if (gap > 0) {
                empTotalGaps++;
                if (gap >= 2) {
                  empCriticalGaps++;
                }
              }
            }

            return {
              employeeId: empId,
              firstName: empInfo.firstName,
              lastName: empInfo.lastName,
              departmentId: empInfo.departmentId,
              departmentName: empInfo.departmentName,
              positionId: empInfo.positionId,
              positionName: empInfo.positionName,
              averageLevel: parseFloat((empTotalLevel / empData.length).toFixed(2)),
              totalGaps: empTotalGaps,
              criticalGaps: empCriticalGaps,
              competencies: empData.map(row => ({
                competencyId: row.competencyId,
                competencyName: row.competencyName,
                currentLevel: row.currentLevel,
                requiredLevel: row.requiredLevel,
              })),
            };
          }),
        };

        const currentDate = new Date();
        const monthName = currentDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
        
        await db.insert(skillsMatrixSnapshots).values({
          snapshotDate: currentDate,
          name: `Snapshot Automático Global - ${monthName}`,
          description: `Snapshot global generado automáticamente el ${currentDate.toLocaleDateString('es-MX')}`,
          data: snapshotData as any,
          createdBy: 1, // System user
          departmentId: null,
        });

        results.totalSnapshots++;
        results.successfulSnapshots++;
        console.log(`[Auto Snapshots Job] Successfully generated global snapshot`);
      }
    } catch (error: any) {
      results.totalSnapshots++;
      results.failedSnapshots++;
      results.errors.push(`Error generating global snapshot: ${error.message}`);
      console.error(`[Auto Snapshots Job] Error generating global snapshot:`, error);
    }

    const duration = Date.now() - startTime;
    console.log(`[Auto Snapshots Job] Completed in ${duration}ms. Results:`, results);

    return {
      success: true,
      results,
      duration,
    };
  } catch (error: any) {
    console.error("[Auto Snapshots Job] Fatal error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
