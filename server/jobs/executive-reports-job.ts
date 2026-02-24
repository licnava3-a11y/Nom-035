/**
 * Job para generación automática de reportes ejecutivos
 * Frecuencia: Semanal (lunes 8am) y Mensual (día 1 de cada mes 8am)
 */

import { getDb } from "../db";
import { 
  cases, 
  employees, 
  surveys,
  surveyPeriods,
  surveyResponses,
  departments,
  courses
} from "../../drizzle/schema";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";
import { storagePut } from "../storage";
import { notifyOwner } from "../_core/notification";

interface ExecutiveReportData {
  period: 'weekly' | 'monthly';
  generatedAt: string;
  dateRange: {
    start: string;
    end: string;
  };
  
  // KPIs principales
  kpis: {
    totalEmployees: number;
    activeCases: number;
    resolvedCases: number;
    newCases: number;
    averageResolutionDays: number;
    criticalCases: number;
    
    // Encuestas
    surveyCoverage: number;
    highRiskEmployees: number;
    mediumRiskEmployees: number;
    
    // Capacitación
    activeTrainings: number;
    completedTrainings: number;
    trainingCoverage: number;
  };
  
  // Tendencias departamentales
  departmentalRisks: Array<{
    departmentName: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskScore: number;
    activeCases: number;
    highRiskEmployees: number;
  }>;
  
  // Top 5 casos críticos
  criticalCases: Array<{
    id: number;
    employeeName: string;
    department: string;
    priority: string;
    daysOpen: number;
    status: string;
  }>;
  
  // Recomendaciones
  recommendations: string[];
}

/**
 * Generar datos consolidados para reporte ejecutivo
 */
async function generateReportData(period: 'weekly' | 'monthly'): Promise<ExecutiveReportData> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  const dateRange = period === 'weekly' 
    ? {
        start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        end: now.toISOString()
      }
    : {
        start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        end: now.toISOString()
      };
  
  // KPIs principales
  const [totalEmployeesResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(employees)
    .where(eq(employees.isActive, true));
  
  const [activeCasesResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(cases)
    .where(sql`${cases.status} IN ('open', 'in_progress')`);
  
  const [resolvedCasesResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(cases)
    .where(eq(cases.status, 'resolved'));
  
  const [newCasesResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(cases)
    .where(and(
      gte(cases.createdAt, new Date(dateRange.start)),
      lte(cases.createdAt, new Date(dateRange.end))
    ));
  
  const [criticalCasesResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(cases)
    .where(and(
      eq(cases.priority, 'critical'),
      sql`${cases.status} IN ('open', 'in_progress')`
    ));
  
  // Calcular promedio de días de resolución
  const resolvedCasesWithDates = await db
    .select({
      createdAt: cases.createdAt,
      resolvedAt: cases.resolvedAt
    })
    .from(cases)
    .where(eq(cases.status, 'resolved'))
    .limit(100);
  
  const avgResolutionDays = resolvedCasesWithDates.length > 0
    ? resolvedCasesWithDates.reduce((sum, c) => {
        if (!c.resolvedAt) return sum;
        const days = Math.floor((c.resolvedAt.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0) / resolvedCasesWithDates.length
    : 0;
  
  // Encuestas: calcular cobertura y riesgo
  const latestPeriod = await db
    .select()
    .from(surveyPeriods)
    .where(eq(surveyPeriods.isActive, true))
    .orderBy(desc(surveyPeriods.startDate))
    .limit(1);
  
  let surveyCoverage = 0;
  let highRiskEmployees = 0;
  let mediumRiskEmployees = 0;
  
  if (latestPeriod.length > 0) {
    const periodId = latestPeriod[0].id;
    
    const [coverageResult] = await db
      .select({ 
        total: sql<number>`COUNT(DISTINCT ${surveyResponses.employeeId})`,
        totalEmployees: sql<number>`(SELECT COUNT(*) FROM ${employees} WHERE ${employees.isActive} = true)`
      })
      .from(surveyResponses)
      .where(eq(surveyResponses.periodId, periodId));
    
    surveyCoverage = coverageResult.totalEmployees > 0
      ? (coverageResult.total / coverageResult.totalEmployees) * 100
      : 0;
    
    // Contar empleados por nivel de riesgo
    const riskCounts = await db
      .select({
        riskLevel: surveyResponses.riskLevel,
        count: sql<number>`COUNT(DISTINCT ${surveyResponses.employeeId})`
      })
      .from(surveyResponses)
      .where(eq(surveyResponses.periodId, periodId))
      .groupBy(surveyResponses.riskLevel);
    
    highRiskEmployees = riskCounts.find(r => r.riskLevel === 'high')?.count || 0;
    mediumRiskEmployees = riskCounts.find(r => r.riskLevel === 'medium')?.count || 0;
  }
  
  // Capacitación
  const [activeTrainingsResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(courses)
    .where(eq(courses.status, 'published'));
  
  // Placeholder para enrollments (tabla no existe)
  const completedTrainingsResult = { count: 0 };
  const totalEnrollmentsResult = { count: 0 };
  
  const trainingCoverage = 0; // Placeholder hasta implementar enrollments
  
  // Tendencias departamentales (top 10 con mayor riesgo)
  const departmentalData = await db
    .select({
      departmentId: employees.departmentId,
      departmentName: departments.name,
      activeCases: sql<number>`COUNT(DISTINCT CASE WHEN ${cases.status} IN ('open', 'in_progress') THEN ${cases.id} END)`,
      highRiskCount: sql<number>`COUNT(DISTINCT CASE WHEN ${surveyResponses.riskLevel} = 'high' THEN ${surveyResponses.employeeId} END)`,
      employeeCount: sql<number>`COUNT(DISTINCT ${employees.id})`
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(cases, eq(cases.employeeId, employees.id))
    .leftJoin(surveyResponses, eq(surveyResponses.employeeId, employees.id))
    .where(eq(employees.isActive, true))
    .groupBy(employees.departmentId, departments.name)
    .orderBy(desc(sql`COUNT(DISTINCT CASE WHEN ${cases.status} IN ('open', 'in_progress') THEN ${cases.id} END)`))
    .limit(10);
  
  const departmentalRisks = departmentalData.map(d => {
    const riskScore = (d.activeCases * 10 + d.highRiskCount * 5) / Math.max(d.employeeCount, 1);
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (riskScore >= 15) riskLevel = 'critical';
    else if (riskScore >= 10) riskLevel = 'high';
    else if (riskScore >= 5) riskLevel = 'medium';
    
    return {
      departmentName: d.departmentName || 'Sin departamento',
      riskLevel,
      riskScore: Math.round(riskScore * 10) / 10,
      activeCases: d.activeCases,
      highRiskEmployees: d.highRiskCount
    };
  });
  
  // Top 5 casos críticos
  const criticalCasesData = await db
    .select({
      id: cases.id,
      employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
      departmentName: departments.name,
      priority: cases.priority,
      status: cases.status,
      createdAt: cases.createdAt
    })
    .from(cases)
    .leftJoin(employees, eq(cases.employeeId, employees.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(and(
      eq(cases.priority, 'critical'),
      sql`${cases.status} IN ('open', 'in_progress')`
    ))
    .orderBy(cases.createdAt)
    .limit(5);
  
  const criticalCasesList = criticalCasesData.map(c => ({
    id: c.id,
    employeeName: c.employeeName || 'N/A',
    department: c.departmentName || 'N/A',
    priority: c.priority || 'N/A',
    daysOpen: Math.floor((now.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
    status: c.status || 'N/A'
  }));
  
  // Generar recomendaciones
  const recommendations: string[] = [];
  
  if (criticalCasesResult.count > 5) {
    recommendations.push(`Atención urgente: ${criticalCasesResult.count} casos críticos abiertos. Priorizar resolución inmediata.`);
  }
  
  if (surveyCoverage < 80) {
    recommendations.push(`Cobertura de encuestas baja (${surveyCoverage.toFixed(1)}%). Implementar campaña de sensibilización.`);
  }
  
  if (highRiskEmployees > totalEmployeesResult.count * 0.1) {
    recommendations.push(`${highRiskEmployees} empleados en riesgo alto. Programar intervenciones preventivas.`);
  }
  
  if (avgResolutionDays > 30) {
    recommendations.push(`Tiempo promedio de resolución elevado (${avgResolutionDays.toFixed(1)} días). Revisar procesos de atención.`);
  }
  
  if (trainingCoverage < 70) {
    recommendations.push(`Cobertura de capacitación baja (${trainingCoverage.toFixed(1)}%). Aumentar participación en cursos NOM-035.`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Sistema operando dentro de parámetros normales. Mantener monitoreo continuo.');
  }
  
  return {
    period,
    generatedAt: now.toISOString(),
    dateRange,
    kpis: {
      totalEmployees: totalEmployeesResult.count,
      activeCases: activeCasesResult.count,
      resolvedCases: resolvedCasesResult.count,
      newCases: newCasesResult.count,
      averageResolutionDays: Math.round(avgResolutionDays * 10) / 10,
      criticalCases: criticalCasesResult.count,
      surveyCoverage: Math.round(surveyCoverage * 10) / 10,
      highRiskEmployees,
      mediumRiskEmployees,
      activeTrainings: activeTrainingsResult.count,
      completedTrainings: completedTrainingsResult.count,
      trainingCoverage: Math.round(trainingCoverage * 10) / 10
    },
    departmentalRisks,
    criticalCases: criticalCasesList,
    recommendations
  };
}

/**
 * Generar HTML del reporte ejecutivo
 */
function generateReportHTML(data: ExecutiveReportData): string {
  const periodLabel = data.period === 'weekly' ? 'Semanal' : 'Mensual';
  const dateStart = new Date(data.dateRange.start).toLocaleDateString('es-MX');
  const dateEnd = new Date(data.dateRange.end).toLocaleDateString('es-MX');
  
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Reporte Ejecutivo ${periodLabel} - NOM-035</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    h1 {
      color: #1e40af;
      margin: 0 0 10px 0;
      font-size: 28px;
    }
    .subtitle {
      color: #64748b;
      font-size: 14px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
    }
    .kpi-card {
      background: #f8fafc;
      border-left: 4px solid #2563eb;
      padding: 15px;
      border-radius: 4px;
    }
    .kpi-card.warning {
      border-left-color: #f59e0b;
    }
    .kpi-card.danger {
      border-left-color: #ef4444;
    }
    .kpi-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    .kpi-value {
      font-size: 32px;
      font-weight: bold;
      color: #1e293b;
    }
    .section {
      margin-bottom: 30px;
    }
    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #1e40af;
      margin-bottom: 15px;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th {
      background: #f1f5f9;
      padding: 12px;
      text-align: left;
      font-size: 13px;
      color: #475569;
      border-bottom: 2px solid #cbd5e1;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 14px;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge.low { background: #d1fae5; color: #065f46; }
    .badge.medium { background: #fef3c7; color: #92400e; }
    .badge.high { background: #fed7aa; color: #9a3412; }
    .badge.critical { background: #fecaca; color: #991b1b; }
    .recommendations {
      background: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 20px;
      border-radius: 4px;
    }
    .recommendations ul {
      margin: 10px 0 0 0;
      padding-left: 20px;
    }
    .recommendations li {
      margin-bottom: 8px;
      color: #1e40af;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #64748b;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Reporte Ejecutivo ${periodLabel} - NOM-035 STPS</h1>
      <div class="subtitle">
        Período: ${dateStart} - ${dateEnd} | Generado: ${new Date(data.generatedAt).toLocaleString('es-MX')}
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">Indicadores Clave de Desempeño (KPIs)</div>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total Empleados</div>
          <div class="kpi-value">${data.kpis.totalEmployees}</div>
        </div>
        <div class="kpi-card ${data.kpis.activeCases > 20 ? 'warning' : ''}">
          <div class="kpi-label">Casos Abiertos</div>
          <div class="kpi-value">${data.kpis.activeCases}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Casos Resueltos</div>
          <div class="kpi-value">${data.kpis.resolvedCases}</div>
        </div>
        <div class="kpi-card ${data.kpis.newCases > 10 ? 'warning' : ''}">
          <div class="kpi-label">Casos Nuevos (Período)</div>
          <div class="kpi-value">${data.kpis.newCases}</div>
        </div>
        <div class="kpi-card ${data.kpis.criticalCases > 5 ? 'danger' : data.kpis.criticalCases > 0 ? 'warning' : ''}">
          <div class="kpi-label">Casos Críticos</div>
          <div class="kpi-value">${data.kpis.criticalCases}</div>
        </div>
        <div class="kpi-card ${data.kpis.averageResolutionDays > 30 ? 'warning' : ''}">
          <div class="kpi-label">Días Prom. Resolución</div>
          <div class="kpi-value">${data.kpis.averageResolutionDays}</div>
        </div>
        <div class="kpi-card ${data.kpis.surveyCoverage < 80 ? 'warning' : ''}">
          <div class="kpi-label">Cobertura Encuestas</div>
          <div class="kpi-value">${data.kpis.surveyCoverage}%</div>
        </div>
        <div class="kpi-card ${data.kpis.highRiskEmployees > data.kpis.totalEmployees * 0.1 ? 'danger' : ''}">
          <div class="kpi-label">Empleados Alto Riesgo</div>
          <div class="kpi-value">${data.kpis.highRiskEmployees}</div>
        </div>
        <div class="kpi-card ${data.kpis.trainingCoverage < 70 ? 'warning' : ''}">
          <div class="kpi-label">Cobertura Capacitación</div>
          <div class="kpi-value">${data.kpis.trainingCoverage}%</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <div class="section-title">Tendencias Departamentales (Top 10 Riesgo)</div>
      <table>
        <thead>
          <tr>
            <th>Departamento</th>
            <th>Nivel de Riesgo</th>
            <th>Score</th>
            <th>Casos Activos</th>
            <th>Empleados Alto Riesgo</th>
          </tr>
        </thead>
        <tbody>
          ${data.departmentalRisks.map(dept => `
            <tr>
              <td>${dept.departmentName}</td>
              <td><span class="badge ${dept.riskLevel}">${dept.riskLevel}</span></td>
              <td>${dept.riskScore}</td>
              <td>${dept.activeCases}</td>
              <td>${dept.highRiskEmployees}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    ${data.criticalCases.length > 0 ? `
    <div class="section">
      <div class="section-title">Casos Críticos Abiertos (Top 5)</div>
      <table>
        <thead>
          <tr>
            <th>ID</th>
            <th>Empleado</th>
            <th>Departamento</th>
            <th>Severidad</th>
            <th>Días Abierto</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          ${data.criticalCases.map(c => `
            <tr>
              <td>#${c.id}</td>
              <td>${c.employeeName}</td>
              <td>${c.department}</td>
              <td><span class="badge critical">${c.priority}</span></td>
              <td>${c.daysOpen}</td>
              <td>${c.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <div class="section">
      <div class="recommendations">
        <div class="section-title" style="border: none; padding: 0; margin-bottom: 10px;">Recomendaciones</div>
        <ul>
          ${data.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
    </div>
    
    <div class="footer">
      <p>Este reporte fue generado automáticamente por el Sistema de Gestión NOM-035 STPS 2018</p>
      <p>Para más información, acceda al dashboard ejecutivo de la plataforma</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Ejecutar job de reportes ejecutivos
 */
export async function runExecutiveReportsJob(period: 'weekly' | 'monthly' = 'weekly') {
  console.log(`[Executive Reports Job] Starting ${period} report generation...`);
  
  try {
    // Generar datos del reporte
    const reportData = await generateReportData(period);
    
    // Generar HTML
    const htmlContent = generateReportHTML(reportData);
    
    // Subir HTML a S3
    const fileName = `executive-report-${period}-${new Date().toISOString().split('T')[0]}.html`;
    const fileKey = `executive-reports/${fileName}`;
    
    const { url: reportUrl } = await storagePut(
      fileKey,
      Buffer.from(htmlContent, 'utf-8'),
      'text/html'
    );
    
    // Notificar al owner
    const periodLabel = period === 'weekly' ? 'Semanal' : 'Mensual';
    await notifyOwner({
      title: `📊 Reporte Ejecutivo ${periodLabel} Generado`,
      content: `Se ha generado el reporte ejecutivo ${period === 'weekly' ? 'semanal' : 'mensual'}.

**Resumen de KPIs:**
- Casos Abiertos: ${reportData.kpis.activeCases}
- Casos Críticos: ${reportData.kpis.criticalCases}
- Empleados Alto Riesgo: ${reportData.kpis.highRiskEmployees}
- Cobertura Encuestas: ${reportData.kpis.surveyCoverage}%

**Recomendaciones principales:**
${reportData.recommendations.slice(0, 3).map(r => `- ${r}`).join('\n')}

Ver reporte completo: ${reportUrl}`
    });
    
    console.log(`[Executive Reports Job] ${periodLabel} report generated successfully:`, reportUrl);
    
    return {
      success: true,
      reportUrl,
      data: reportData
    };
    
  } catch (error) {
    console.error(`[Executive Reports Job] Error generating ${period} report:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Exportar para uso en cron jobs
export const weeklyReportJob = () => runExecutiveReportsJob('weekly');
export const monthlyReportJob = () => runExecutiveReportsJob('monthly');
