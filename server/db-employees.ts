import { eq, like, and, or, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import { employees, users, committeeMembers, departments, positions } from "../drizzle/schema";
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
}): Promise<EmployeeWithRelations[]> {
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
        like(employees.employeeNumber, `%${filters.search}%`)
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
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        department: sql<string>`COALESCE(${departments.name}, 'Sin departamento')`,
        position: sql<string>`COALESCE(${positions.title}, 'Sin puesto')`
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
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
        department: sql<string>`COALESCE(${departments.name}, 'Sin departamento')`,
        position: sql<string>`COALESCE(${positions.title}, 'Sin puesto')`
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(positions, eq(employees.positionId, positions.id))
      .orderBy(desc(employees.createdAt));

  return (await query) as EmployeeWithRelations[];
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
      createdAt: employees.createdAt,
      updatedAt: employees.updatedAt,
      department: sql<string>`COALESCE(${departments.name}, 'Sin departamento')`,
      position: sql<string>`COALESCE(${positions.title}, 'Sin puesto')`
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

  const result = await db.insert(employees).values(data);
  return Number((result as any).insertId);
}

/**
 * Update employee
 */
export async function updateEmployee(id: number, data: Partial<InsertEmployee>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(employees)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(employees.id, id));

  return await getEmployeeById(id);
}

/**
 * Deactivate employee (soft delete)
 */
export async function deactivateEmployee(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(employees)
    .set({
      isActive: false,
      terminationDate: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(employees.id, id));

  return await getEmployeeById(id);
}

/**
 * Reactivate employee
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
    })
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
    byDepartment: departmentCounts.map((d) => ({
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

  const [result] = await db.insert(departments).values({
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

  const [result] = await db.insert(positions).values({
    title: data.title,
    description: data.description || null,
    departmentId: data.departmentId,
    level: data.level || "mid",
    createdAt: new Date(),
  });
  return result;
}

/**
 * Get employee by CURP
 */
export async function getEmployeeByCURP(curp: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.query.employees.findFirst({
    where: (employees: any, { eq }: any) => eq(employees.curp, curp),
  });
}
