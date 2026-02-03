import { eq, like, and, or, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import { employees, users, committeeMembers } from "../drizzle/schema";
import type { Employee, InsertEmployee } from "../drizzle/schema";

/**
 * Get all employees with optional filters
 */
export async function getAllEmployees(filters?: {
  isActive?: boolean;
  department?: string;
  search?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  let conditions = [];

  if (filters?.isActive !== undefined) {
    conditions.push(eq(employees.isActive, filters.isActive));
  }

  if (filters?.department) {
    conditions.push(eq(employees.department, filters.department));
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
    ? db.select().from(employees).where(and(...conditions)).orderBy(desc(employees.createdAt))
    : db.select().from(employees).orderBy(desc(employees.createdAt));

  return await query;
}

/**
 * Get employee by ID
 */
export async function getEmployeeById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(employees)
    .where(eq(employees.id, id))
    .limit(1);

  return result[0] || null;
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
    .selectDistinct({ department: employees.department })
    .from(employees)
    .where(and(eq(employees.isActive, true), sql`${employees.department} IS NOT NULL`));

  return result.map((r) => r.department).filter(Boolean);
}

/**
 * Get all positions (unique list)
 */
export async function getAllPositions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .selectDistinct({ position: employees.position })
    .from(employees)
    .where(and(eq(employees.isActive, true), sql`${employees.position} IS NOT NULL`));

  return result.map((r) => r.position).filter(Boolean);
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
      department: employees.department,
      count: sql<number>`count(*)`,
    })
    .from(employees)
    .where(eq(employees.isActive, true))
    .groupBy(employees.department);

  return {
    totalActive: Number(totalActive.count),
    totalInactive: Number(totalInactive.count),
    byDepartment: departmentCounts.map((d) => ({
      department: d.department || "Sin departamento",
      count: Number(d.count),
    })),
  };
}
