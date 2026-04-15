import { eq, like, and, or, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import { committeeMembers, departments, employeeHistory, employees, positions, users } from "../drizzle/schema";
import type { Employee, InsertEmployee } from "../drizzle/schema";

// Type for employee with department and position names
export type EmployeeWithRelations = Employee & {
  department: string;
  position: string;
};

/**
 * Get all employees with optional filters
 */
export async function getAllEmployees(filters?: {
  isActive?: boolean;
  department?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ employees: EmployeeWithRelations[]; pagination: { page: number; pageSize: number; totalCount: number; totalPages: number } }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let conditions = [];

  if (filters?.isActive !== undefined) {
    conditions.push(eq(employees.isActive, filters.isActive));
  }

  if (filters?.department) {
    conditions.push(eq(employees.departmentId, parseInt(filters.department)));
  }

  if (filters?.search) {
    conditions.push(
      or(
        like(employees.firstName, `%${filters.search}%`),
        like(employees.lastName, `%${filters.search}%`),
        like(employees.email, `%${filters.search}%`),
        like(employees.employeeNumber, `%${filters.search}%`),
        like(employees.rfc, `%${filters.search}%`),
        like(employees.nss, `%${filters.search}%`)
      )
    );
  }

  const query = conditions.length > 0
    ? db.select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        phone: employees.phone,
        curp: employees.curp,
        employeeNumber: employees.employeeNumber,
        departmentId: employees.departmentId,
        positionId: employees.positionId,
        hireDate: employees.hireDate,
        contractType: employees.contractType,
        isActive: employees.isActive,
        userId: employees.userId,
        cedulaProfesional: employees.cedulaProfesional,
        rfc: employees.rfc,
        nss: employees.nss,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        department: sql<string>`COALESCE(${departments.name}, 'Sin departamento')`,
        position: sql<string>`COALESCE(${positions.title}, 'Sin puesto')`,
        educationLevel: employees.educationLevel,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(positions, eq(employees.positionId, positions.id))
      .where(and(...conditions))
      .orderBy(desc(employees.createdAt))
    : db.select({
        id: employees.id,
        firstName: employees.firstName,
        lastName: employees.lastName,
        email: employees.email,
        phone: employees.phone,
        curp: employees.curp,
        employeeNumber: employees.employeeNumber,
        departmentId: employees.departmentId,
        positionId: employees.positionId,
        hireDate: employees.hireDate,
        contractType: employees.contractType,
        isActive: employees.isActive,
        userId: employees.userId,
        cedulaProfesional: employees.cedulaProfesional,
        rfc: employees.rfc,
        nss: employees.nss,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        department: sql<string>`COALESCE(${departments.name}, 'Sin departamento')`,
        position: sql<string>`COALESCE(${positions.title}, 'Sin puesto')`,
        educationLevel: employees.educationLevel,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(positions, eq(employees.positionId, positions.id))
      .orderBy(desc(employees.createdAt))
  // Contar total de empleados
  const countQuery = conditions.length > 0
    ? db.select({ count: sql<number>`count(*)` }).from(employees).where(and(...conditions))
    : db.select({ count: sql<number>`count(*)` }).from(employees);
  
  const [{ count: totalCount }] = await countQuery;

  // Aplicar paginación
  const page = filters?.page || 1;
  const pageSize = filters?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  const paginatedQuery = conditions.length > 0
    ? query.limit(pageSize).offset(offset)
    : query.limit(pageSize).offset(offset);

  const employeesList = (await paginatedQuery) as EmployeeWithRelations[];

  return {
    employees: employeesList,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    },
  };
}

/**
 * Get employee by ID
 */
export async function getEmployeeById(id: number): Promise<EmployeeWithRelations | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      id: employees.id,
      firstName: employees.firstName,
      lastName: employees.lastName,
      email: employees.email,
      phone: employees.phone,
      curp: employees.curp,
      employeeNumber: employees.employeeNumber,
      departmentId: employees.departmentId,
      positionId: employees.positionId,
      hireDate: employees.hireDate,
      contractType: employees.contractType,
      isActive: employees.isActive,
      userId: employees.userId,
      cedulaProfesional: employees.cedulaProfesional,
      rfc: employees.rfc,
      nss: employees.nss,
      createdAt: employees.createdAt,
      updatedAt: employees.updatedAt,
      educationLevel: employees.educationLevel,
      department: sql<string>`COALESCE(${departments.name}, 'Sin departamento')`,
      position: sql<string>`COALESCE(${positions.title}, 'Sin puesto')`,
      positionMinimumEducation: positions.minimumEducation,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .where(eq(employees.id, id))
    .limit(1);

  return (result[0] as EmployeeWithRelations) || null;
}

/**
 * Get employee by email
 */
export async function getEmployeeByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(employees)
    .where(eq(employees.email, email))
    .limit(1);

  return result[0] || null;
}

/**
 * Get employee by user ID
 */
export async function getEmployeeByUserId(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(employees)
    .where(eq(employees.userId, userId))
    .limit(1);

  return result[0] || null;
}

/**
 * Create new employee
 */
export async function createEmployee(data: InsertEmployee) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await (db.insert(employees) as any).values(data);
  // Drizzle MySQL2 returns [ResultSetHeader, ...] array
  return Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId);
}

/**
 * Create new employee with history event in a transaction
 * Ensures atomicity: both employee and history are created or neither is
 */
export async function createEmployeeWithHistory(
  employeeData: InsertEmployee,
  historyData: {
    curp: string;
    eventType: 'hire' | 'reentry';
    eventDate: Date;
    processedBy?: number;
    departmentId?: number;
    positionId?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { employeeHistory } = await import("../drizzle/schema");

  return await db.transaction(async (tx) => {
    // 1. Insert employee
    const result = await tx.insert(employees).values(employeeData);
    // Drizzle MySQL2 returns [ResultSetHeader, ...] array
    const employeeId = Number((result as any)?.[0]?.insertId ?? (result as any)?.insertId);

    // 2. Insert history event
    await tx.insert(employeeHistory).values({
      employeeId,
      curp: historyData.curp,
      eventType: historyData.eventType,
      eventDate: historyData.eventDate,
      processedBy: historyData.processedBy,
      departmentId: historyData.departmentId,
      positionId: historyData.positionId,
    });

    return employeeId;
  });
}

/**
 * Deactivate employee (soft delete)
 */
export async function deactivateEmployee(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(employees)
    .set({ isActive: false, updatedAt: new Date() } as any)
    .where(eq(employees.id, id));

  return await getEmployeeById(id);
}

/**
 * Terminate employee with history event in a transaction
 * Ensures atomicity: both employee termination and history are recorded or neither is
 */
export async function terminateEmployeeWithHistory(
  id: number,
  terminationData: {
    terminationDate: Date;
    terminationReason?: string;
    terminationCategory?: string;
    terminationNotes?: string;
    evidenceUrls?: string[];
  },
  historyData: {
    curp: string;
    processedBy?: number;
    departmentId?: number;
    positionId?: number;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { employeeHistory } = await import("../drizzle/schema");

  return await db.transaction(async (tx) => {
    // 1. Update employee with termination data
    await tx
      .update(employees)
      .set({
        isActive: false,
        terminationDate: terminationData.terminationDate,
        terminationReason: terminationData.terminationReason,
        terminationCategory: terminationData.terminationCategory,
        terminationNotes: terminationData.terminationNotes,
        evidenceUrls: terminationData.evidenceUrls,
        updatedAt: new Date(),
      } as any)
      .where(eq(employees.id, id));

    // 2. Insert history event
    await tx.insert(employeeHistory).values({
      employeeId: id,
      curp: historyData.curp,
      eventType: 'termination',
      eventDate: terminationData.terminationDate,
      terminationReason: terminationData.terminationReason,
      terminationCategory: terminationData.terminationCategory,
      terminationNotes: terminationData.terminationNotes,
      evidenceUrls: terminationData.evidenceUrls,
      processedBy: historyData.processedBy,
      departmentId: historyData.departmentId,
      positionId: historyData.positionId,
    } as any);

    // 3. Return updated employee
    const result = await tx
      .select()
      .from(employees)
      .where(eq(employees.id, id))
      .limit(1);

    return result[0];
  });
}

/**
 * Update employee
 */
export async function updateEmployee(id: number, data: Partial<InsertEmployee>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(employees)
    .set({ ...data, updatedAt: new Date() } as any)
    .where(eq(employees.id, id));

  return await getEmployeeById(id);
}

/**
 * Reactivate employee (undo soft delete)
 */
export async function reactivateEmployee(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(employees)
    .set({
      isActive: true,
      terminationDate: null,
      updatedAt: new Date(),
    } as any)
    .where(eq(employees.id, id));

  return await getEmployeeById(id);
}

/**
 * Get all departments (unique list)
 */
export async function getAllDepartments() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(departments)
    .where(eq(departments.isActive, true))
    .orderBy(departments.name);

  return result;
}

/**
 * Get all positions (unique list)
 */
export async function getAllPositions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(positions)
    .where(eq(positions.isActive, true))
    .orderBy(positions.title);

  return result;
}

/**
 * Get positions by department
 */
export async function getPositionsByDepartment(departmentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(positions)
    .where(
      and(
        eq(positions.isActive, true),
        eq(positions.departmentId, departmentId)
      )
    )
    .orderBy(positions.title);

  return result;
}

/**
 * Get employee with user info
 */
export async function getEmployeeWithUser(employeeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({
      employee: employees,
      user: users,
    })
    .from(employees)
    .leftJoin(users, eq(employees.userId, users.id))
    .where(eq(employees.id, employeeId))
    .limit(1);

  return result[0] || null;
}

/**
 * Check if employee is committee member
 */
export async function isCommitteeMember(employeeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(committeeMembers)
    .where(and(
      eq(committeeMembers.employeeId, employeeId),
      eq(committeeMembers.isActive, true)
    ))
    .limit(1);

  return result.length > 0;
}

/**
 * Get employee statistics
 */
export async function getEmployeeStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [totalActive] = await db
    .select({ count: sql<number>`count(*)` })
    .from(employees)
    .where(eq(employees.isActive, true));

  const [totalInactive] = await db
    .select({ count: sql<number>`count(*)` })
    .from(employees)
    .where(eq(employees.isActive, false));

  const departmentCounts = await db
    .select({
      departmentId: employees.departmentId,
      departmentName: departments.name,
      count: sql<number>`count(*)`,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .where(eq(employees.isActive, true))
    .groupBy(employees.departmentId, departments.name);

  return {
    totalActive: Number(totalActive.count),
    totalInactive: Number(totalInactive.count),
    byDepartment: departmentCounts.map((d: any) => ({
      department: d.departmentName || "Sin departamento",
      count: Number(d.count),
    })),
  };
}


/**
 * Create a new department
 */
export async function createDepartment(data: {
  name: string;
  description?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await (db.insert(departments) as any).values({
    name: data.name,
    description: data.description || null,
    createdAt: new Date(),
  });
  return result;
}

/**
 * Create a new position
 */
export async function createPosition(data: {
  title: string;
  description?: string | null;
  departmentId: number;
  level?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await (db.insert(positions) as any).values({
    title: data.title,
    description: data.description || null,
    departmentId: data.departmentId,
    level: (data.level as any) || null,
  });
  return result;
}

/**
 * Get employee by CURP
 */
export async function getEmployeeByCURP(curp: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [employee] = await db
    .select()
    .from(employees)
    .where(eq(employees.curp, curp))
    .limit(1);
  
  return employee;
}


/**
 * Add event to employee history
 */
export async function addEmployeeHistoryEvent(data: {
  employeeId: number;
  curp: string;
  eventType: 'hire' | 'termination' | 'reentry';
  eventDate: Date;
  terminationReason?: string;
  terminationCategory?: string;
  terminationNotes?: string;
  evidenceUrls?: string[];
  processedBy?: number;
  departmentId?: number;
  positionId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { employeeHistory } = await import("../drizzle/schema");
  
  await (db.insert(employeeHistory) as any).values({
    employeeId: data.employeeId,
    curp: data.curp,
    eventType: data.eventType,
    eventDate: data.eventDate,
    terminationReason: data.terminationReason as any,
    terminationCategory: data.terminationCategory as any,
    terminationNotes: data.terminationNotes,
    evidenceUrls: data.evidenceUrls || null,
    processedBy: data.processedBy,
    departmentId: data.departmentId,
    positionId: data.positionId,
  });
}

/**
 * Get employee history by employee ID
 */
export async function getEmployeeHistory(employeeId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { employeeHistory } = await import("../drizzle/schema");
  
  const history = await db
    .select({
      id: employeeHistory.id,
      employeeId: employeeHistory.employeeId,
      curp: employeeHistory.curp,
      eventType: employeeHistory.eventType,
      eventDate: employeeHistory.eventDate,
      terminationReason: employeeHistory.terminationReason,
      terminationCategory: employeeHistory.terminationCategory,
      terminationNotes: employeeHistory.terminationNotes,
      evidenceUrls: employeeHistory.evidenceUrls,
      processedBy: employeeHistory.processedBy,
      departmentId: employeeHistory.departmentId,
      departmentName: departments.name,
      positionId: employeeHistory.positionId,
      positionTitle: positions.title,
      createdAt: employeeHistory.createdAt,
    })
    .from(employeeHistory)
    .leftJoin(departments, sql`${employeeHistory.departmentId} = ${departments.id}`)
    .leftJoin(positions, sql`${employeeHistory.positionId} = ${positions.id}`)
    .where(sql`${employeeHistory.employeeId} = ${employeeId}`)
    .orderBy(sql`${employeeHistory.eventDate} DESC`);
  
  return history;
}

/**
 * Get employee history by CURP (all records for this person)
 */
export async function getEmployeeHistoryByCURP(curp: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { employeeHistory } = await import("../drizzle/schema");
  
  const history = await db
    .select({
      id: employeeHistory.id,
      employeeId: employeeHistory.employeeId,
      curp: employeeHistory.curp,
      eventType: employeeHistory.eventType,
      eventDate: employeeHistory.eventDate,
      terminationReason: employeeHistory.terminationReason,
      terminationCategory: employeeHistory.terminationCategory,
      terminationNotes: employeeHistory.terminationNotes,
      evidenceUrls: employeeHistory.evidenceUrls,
      processedBy: employeeHistory.processedBy,
      departmentId: employeeHistory.departmentId,
      departmentName: departments.name,
      positionId: employeeHistory.positionId,
      positionTitle: positions.title,
      createdAt: employeeHistory.createdAt,
    })
    .from(employeeHistory)
    .leftJoin(departments, sql`${employeeHistory.departmentId} = ${departments.id}`)
    .leftJoin(positions, sql`${employeeHistory.positionId} = ${positions.id}`)
    .where(sql`${employeeHistory.curp} = ${curp}`)
    .orderBy(sql`${employeeHistory.eventDate} DESC`);
  
  return history;
}

/**
 * Update employee reentry count and previous hire dates
 */
export async function updateEmployeeReentryInfo(
  employeeId: number,
  reentryCount: number,
  previousHireDates: Date[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(employees)
    .set({
      reentryCount,
      previousHireDates: previousHireDates.map(d => d.toISOString()),
    } as any)
    .where(eq(employees.id, employeeId));
}

/**
 * Get turnover statistics for a given period
 */
export async function getTurnoverStats(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { employeeHistory, departments } = await import("../drizzle/schema");
  
  // Get total terminations in period
  const terminations = await db
    .select({
      id: employeeHistory.id,
      eventDate: employeeHistory.eventDate,
      terminationReason: employeeHistory.terminationReason,
      terminationCategory: employeeHistory.terminationCategory,
      departmentId: employeeHistory.departmentId,
      departmentName: departments.name,
    })
    .from(employeeHistory)
    .leftJoin(departments, sql`${employeeHistory.departmentId} = ${departments.id}`)
    .where(
      sql`${employeeHistory.eventType} = 'termination' 
          AND ${employeeHistory.eventDate} >= ${startDate.toISOString().split('T')[0]}
          AND ${employeeHistory.eventDate} <= ${endDate.toISOString().split('T')[0]}`
    );

  // Get average employee count in period
  const avgEmployees = await db
    .select({
      count: sql<number>`COUNT(*)`,
    })
    .from(employees)
    .where(sql`${employees.isActive} = 1`);

  const totalActive = avgEmployees[0]?.count || 0;
  const totalTerminations = terminations.length;

  // Calculate turnover rate
  const turnoverRate = totalActive > 0 ? (totalTerminations / totalActive) * 100 : 0;

  // Calculate average monthly terminations
  const months = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 30)));
  const averageMonthly = Math.round((totalTerminations / months) * 100) / 100;

  return {
    totalTerminations,
    totalActive,
    activeEmployees: totalActive, // Alias for compatibility
    turnoverRate: Math.round(turnoverRate * 100) / 100,
    averageMonthly,
    terminations,
  };
}

/**
 * Get monthly termination trends
 */
export async function getMonthlyTerminationTrends(months: number = 12) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { employeeHistory } = await import("../drizzle/schema");
  
  const trends = await db
    .select({
      month: sql<string>`DATE_FORMAT(${employeeHistory.eventDate}, '%Y-%m')`,
      count: sql<number>`COUNT(*)`,
    })
    .from(employeeHistory)
    .where(
      sql`${employeeHistory.eventType} = 'termination' 
          AND ${employeeHistory.eventDate} >= DATE_SUB(CURDATE(), INTERVAL ${months} MONTH)`
    )
    .groupBy(sql`DATE_FORMAT(${employeeHistory.eventDate}, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${employeeHistory.eventDate}, '%Y-%m') ASC`);

  return trends;
}

/**
 * Get termination distribution by reason
 */
export async function getTerminationsByReason(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { employeeHistory } = await import("../drizzle/schema");
  
  const distribution = await db
    .select({
      reason: employeeHistory.terminationReason,
      category: employeeHistory.terminationCategory,
      count: sql<number>`COUNT(*)`,
    })
    .from(employeeHistory)
    .where(
      sql`${employeeHistory.eventType} = 'termination' 
          AND ${employeeHistory.eventDate} >= ${startDate.toISOString().split('T')[0]}
          AND ${employeeHistory.eventDate} <= ${endDate.toISOString().split('T')[0]}`
    )
    .groupBy(employeeHistory.terminationReason, employeeHistory.terminationCategory);

  return distribution;
}

/**
 * Get termination metrics by department
 */
export async function getTerminationsByDepartment(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { employeeHistory, departments } = await import("../drizzle/schema");
  
  const metrics = await db
    .select({
      departmentId: employeeHistory.departmentId,
      departmentName: departments.name,
      count: sql<number>`COUNT(*)`,
    })
    .from(employeeHistory)
    .leftJoin(departments, sql`${employeeHistory.departmentId} = ${departments.id}`)
    .where(
      sql`${employeeHistory.eventType} = 'termination' 
          AND ${employeeHistory.eventDate} >= ${startDate.toISOString().split('T')[0]}
          AND ${employeeHistory.eventDate} <= ${endDate.toISOString().split('T')[0]}`
    )
    .groupBy(employeeHistory.departmentId, departments.name);

  return metrics;
}
