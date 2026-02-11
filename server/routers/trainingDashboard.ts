import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc.js";
import { getDb } from '../db.js';
import { complianceReports, employees, departments, courses } from "../../drizzle/schema.js";
import { eq, desc, and, gte, lte, count, sql } from "drizzle-orm";

export const trainingDashboardRouter = router({
  // Obtener estadísticas generales de capacitación
  getStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const conditions = [];
      conditions.push(eq(complianceReports.tipo, 'certificate'));

      if (input.startDate) {
        conditions.push(gte(complianceReports.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(complianceReports.createdAt, new Date(input.endDate)));
      }

      // Total de certificados emitidos
      const totalCertificates = await db
        .select({ count: count() })
        .from(complianceReports)
        .where(and(...conditions));

      // Empleados únicos capacitados
      const uniqueEmployees = await db
        .selectDistinct({ workerId: sql<number>`JSON_UNQUOTE(JSON_EXTRACT(${complianceReports.data}, '$.employeeId'))` })
        .from(complianceReports)
        .where(and(...conditions));

      // Cursos activos (esto es un placeholder, ajustar según tu schema real)
      // Cursos activos - contar todos los cursos disponibles
      const activeCourses = await db
        .select({ count: count() })
        .from(courses);

      // Promedio de calificaciones (extraer de metadata JSON)
      const certificates = await db
        .select({ metadata: complianceReports.data })
        .from(complianceReports)
        .where(and(...conditions));

      let totalGrade = 0;
      let gradeCount = 0;
      certificates.forEach((cert) => {
        if (cert.metadata && typeof cert.metadata === 'object') {
          const meta = cert.metadata as any;
          if (meta.grade) {
            // Intentar extraer número de la calificación
            const gradeMatch = String(meta.grade).match(/\d+/);
            if (gradeMatch) {
              totalGrade += parseInt(gradeMatch[0]);
              gradeCount++;
            }
          }
        }
      });

      const averageGrade = gradeCount > 0 ? Math.round(totalGrade / gradeCount) : 0;

      return {
        totalCertificates: totalCertificates[0]?.count || 0,
        uniqueEmployees: uniqueEmployees.length,
        activeCourses: activeCourses[0]?.count || 0,
        averageGrade,
      };
    }),

  // Certificados por mes (últimos 12 meses)
  getCertificatesByMonth: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const certificates = await db
      .select({
        month: sql<string>`DATE_FORMAT(${complianceReports.createdAt}, '%Y-%m')`,
        count: count(),
      })
      .from(complianceReports)
      .where(
        and(
          eq(complianceReports.tipo, 'certificate'),
          gte(complianceReports.createdAt, twelveMonthsAgo)
        )
      )
      .groupBy(sql`DATE_FORMAT(${complianceReports.createdAt}, '%Y-%m')`)
      .orderBy(sql`DATE_FORMAT(${complianceReports.createdAt}, '%Y-%m')`);

    return certificates.map((c) => ({
      month: c.month,
      count: c.count,
    }));
  }),

  // Empleados capacitados por departamento
  getEmployeesByDepartment: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const result = await db
      .select({
        departmentId: employees.departmentId,
        departmentName: departments.name,
        count: count(),
      })
      .from(complianceReports)
      .innerJoin(employees, eq(sql<number>`JSON_UNQUOTE(JSON_EXTRACT(${complianceReports.data}, '$.employeeId'))`, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .where(eq(complianceReports.tipo, 'certificate'))
      .groupBy(employees.departmentId, departments.name);

    return result.map((r) => ({
      department: r.departmentName || 'Sin departamento',
      count: r.count,
    }));
  }),

  // Cursos más populares (basado en certificados emitidos)
  getPopularCourses: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const certificates = await db
      .select({ metadata: complianceReports.data })
      .from(complianceReports)
      .where(eq(complianceReports.tipo, 'certificate'));

    // Contar cursos desde metadata
    const courseCounts: Record<string, number> = {};
    certificates.forEach((cert) => {
      if (cert.metadata && typeof cert.metadata === 'object') {
        const meta = cert.metadata as any;
        if (meta.courseName) {
          const courseName = String(meta.courseName);
          courseCounts[courseName] = (courseCounts[courseName] || 0) + 1;
        }
      }
    });

    // Convertir a array y ordenar
    const popularCourses = Object.entries(courseCounts)
      .map(([courseName, count]) => ({ courseName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return popularCourses;
  }),

  // Alertas de renovación (certificados próximos a vencer)
  getRenewalAlerts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Obtener certificados de los últimos 2 años
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const certificates = await db
      .select({
        id: complianceReports.id,
        folio: complianceReports.folio,
        workerId: sql<number>`JSON_UNQUOTE(JSON_EXTRACT(${complianceReports.data}, '$.employeeId'))`,
        workerFirstName: employees.firstName,
        workerLastName: employees.lastName,
        createdAt: complianceReports.createdAt,
        metadata: complianceReports.data,
      })
      .from(complianceReports)
      .innerJoin(employees, eq(sql<number>`JSON_UNQUOTE(JSON_EXTRACT(${complianceReports.data}, '$.employeeId'))`, employees.id))
      .where(
        and(
          eq(complianceReports.tipo, 'certificate'),
          gte(complianceReports.createdAt, twoYearsAgo)
        )
      )
      .orderBy(desc(complianceReports.createdAt));

    // Filtrar certificados que necesitan renovación (más de 1 año)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const renewalAlerts = certificates
      .filter((cert) => new Date(cert.createdAt) < oneYearAgo)
      .map((cert) => {
        const meta = cert.metadata as any;
        return {
          id: cert.id,
          folio: cert.folio,
          employeeName: `${cert.workerFirstName} ${cert.workerLastName}`,
          courseName: meta?.courseName || 'Curso no especificado',
          issueDate: cert.createdAt,
          daysOverdue: Math.floor(
            (new Date().getTime() - new Date(cert.createdAt).getTime()) / (1000 * 60 * 60 * 24) - 365
          ),
        };
      })
      .slice(0, 20); // Limitar a 20 alertas

    return renewalAlerts;
  }),

  // Certificados recientes
  getRecentCertificates: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');

      const certificates = await db
        .select({
          id: complianceReports.id,
          folio: complianceReports.folio,
          titulo: complianceReports.titulo,
          workerFirstName: employees.firstName,
          workerLastName: employees.lastName,
          createdAt: complianceReports.createdAt,
          metadata: complianceReports.data,
        })
        .from(complianceReports)
        .innerJoin(employees, eq(sql<number>`JSON_UNQUOTE(JSON_EXTRACT(${complianceReports.data}, '$.employeeId'))`, employees.id))
        .where(eq(complianceReports.tipo, 'certificate'))
        .orderBy(desc(complianceReports.createdAt))
        .limit(input.limit);

      return certificates.map((cert) => {
        const meta = cert.metadata as any;
        return {
          id: cert.id,
          folio: cert.folio,
          titulo: cert.titulo,
          employeeName: `${cert.workerFirstName} ${cert.workerLastName}`,
          courseName: meta?.courseName || 'Curso no especificado',
          grade: meta?.grade || 'N/A',
          createdAt: cert.createdAt,
        };
      });
    }),
});
