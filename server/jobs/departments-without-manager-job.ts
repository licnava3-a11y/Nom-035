/**
 * Job programado para detectar departamentos sin manager asignado
 * Se ejecuta semanalmente para detectar:
 * - Departamentos sin managerId después de 30 días de creación
 * - Departamentos activos sin responsable
 */

import { getDb } from "../db";
import { departments, users } from "../../drizzle/schema";
import { eq, isNull, and, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";
import { logJobExecution } from "../jobLogger";

/**
 * Ejecutar verificación de departamentos sin manager
 */
export async function runDepartmentsWithoutManagerCheck() {
  console.log('[Departments Without Manager Job] Starting automated check...');
  
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Departments Without Manager Job] Database not available');
      return;
    }

    // Obtener departamentos activos sin manager
    const deptsWithoutManager = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        createdAt: departments.createdAt,
        description: departments.description,
      })
      .from(departments)
      .where(
        and(
          eq(departments.isActive, true),
          isNull(departments.managerId)
        )
      );

    console.log(`[Departments Without Manager Job] Found ${deptsWithoutManager.length} departments without manager`);

    if (deptsWithoutManager.length === 0) {
      console.log('[Departments Without Manager Job] No departments without manager found');
      return {
        success: true,
        alertsSent: 0,
        departmentsFound: 0,
      };
    }

    // Filtrar departamentos con más de 30 días sin manager
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const criticalDepts = deptsWithoutManager.filter((dept: any) => {
      const createdDate = new Date(dept.createdAt);
      return createdDate < thirtyDaysAgo;
    });

    console.log(`[Departments Without Manager Job] Found ${criticalDepts.length} critical departments (>30 days without manager)`);

    if (criticalDepts.length === 0) {
      console.log('[Departments Without Manager Job] No critical departments found');
      return {
        success: true,
        alertsSent: 0,
        departmentsFound: deptsWithoutManager.length,
      };
    }

    // Generar mensaje de alerta
    const deptList = criticalDepts
      .map((dept: any) => {
        const daysSinceCreation = Math.floor(
          (Date.now() - new Date(dept.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );
        return `• ${dept.name} (${dept.code || 'Sin código'}) - ${daysSinceCreation} días sin manager`;
      })
      .join('\n');

    const alertMessage = `
⚠️ ALERTA: Departamentos sin Responsable Asignado

Se han detectado ${criticalDepts.length} departamento(s) que llevan más de 30 días sin tener un manager asignado:

${deptList}

Por favor, asigne un responsable a estos departamentos lo antes posible para garantizar una correcta gestión organizacional.

Puede gestionar los departamentos desde:
Panel de Administración > Gestión de Departamentos
    `.trim();

    // Enviar notificación al propietario
    const notificationSent = await notifyOwner({
      title: '⚠️ Departamentos sin Manager',
      content: alertMessage,
    });

    if (notificationSent) {
      console.log('[Departments Without Manager Job] Alert notification sent successfully');
    } else {
      console.warn('[Departments Without Manager Job] Failed to send alert notification');
    }

    console.log('[Departments Without Manager Job] Check completed successfully');
    
    return {
      success: true,
      alertsSent: notificationSent ? 1 : 0,
      departmentsFound: criticalDepts.length,
      departments: criticalDepts.map((d: any) => ({ id: d.id, name: d.name })),
    };
  } catch (error) {
    console.error('[Departments Without Manager Job] Error running check:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Iniciar job programado
 * Se ejecuta semanalmente (cada 7 días)
 */
export function startDepartmentsWithoutManagerJob() {
  console.log('[Departments Without Manager Job] Initializing automated job (weekly)...');
  
  // Ejecutar inmediatamente al iniciar
  logJobExecution('departments-without-manager', runDepartmentsWithoutManagerCheck);
  
  // Programar ejecución semanal (7 * 24 * 60 * 60 * 1000 ms)
  const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
  setInterval(() => {
    logJobExecution('departments-without-manager', runDepartmentsWithoutManagerCheck);
  }, ONE_WEEK);
  
  console.log('[Departments Without Manager Job] Automated job started successfully');
}
