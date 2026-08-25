/**
 * Funciones helper para módulos de Igualdad Laboral NMX-025
 */

import { getDb } from "./db";
import {
  equalityPolicy,
  equalitySalaryGap,
  equalityAffirmativeActions,
  equalityComplaints,
  equalityCommittee,
  type InsertEqualityPolicy,
  type InsertEqualitySalaryGap,
  type InsertEqualityAffirmativeAction,
  type InsertEqualityComplaint,
  type InsertEqualityCommitteeMember,
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * ============================================================================
 * POLÍTICA DE IGUALDAD
 * ============================================================================
 */

export async function getEqualityPolicy() {
  const db = await getDb();
  if (!db) return null;
  const policies = await db
    .select()
    .from(equalityPolicy)
    .where(eq(equalityPolicy.estado, "vigente"))
    .orderBy(desc(equalityPolicy.fechaAprobacion))
    .limit(1);
  return policies[0] || null;
}

export async function listEqualityPolicies() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(equalityPolicy)
    .orderBy(desc(equalityPolicy.createdAt));
}

export async function createEqualityPolicy(data: InsertEqualityPolicy) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await (db.insert(equalityPolicy) as any).values(data);
  return result.insertId;
}

export async function updateEqualityPolicy(
  id: number,
  data: Partial<InsertEqualityPolicy>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(equalityPolicy).set(data).where(eq(equalityPolicy.id, id));
}

/**
 * ============================================================================
 * BRECHA SALARIAL
 * ============================================================================
 */

export async function listSalaryGaps(filters?: {
  periodo?: string;
  departamento?: string;
  puesto?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(equalitySalaryGap);

  const conditions = [];
  if (filters?.periodo) {
    conditions.push(eq(equalitySalaryGap.periodo, filters.periodo));
  }
  if (filters?.departamento) {
    conditions.push(eq(equalitySalaryGap.departamento, filters.departamento));
  }
  if (filters?.puesto) {
    conditions.push(eq(equalitySalaryGap.puesto, filters.puesto));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(equalitySalaryGap.fechaCalculo));
}

export async function getSalaryGap(id: number) {
  const db = await getDb();
  if (!db) return null;
  const gaps = await db
    .select()
    .from(equalitySalaryGap)
    .where(eq(equalitySalaryGap.id, id))
    .limit(1);
  return gaps[0] || null;
}

export async function createSalaryGap(data: InsertEqualitySalaryGap) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await (db.insert(equalitySalaryGap) as any).values(data);
  return result.insertId;
}

/**
 * ============================================================================
 * ACCIONES AFIRMATIVAS
 * ============================================================================
 */

export async function listAffirmativeActions(filters?: {
  tipo?: string;
  estado?: string;
  departamento?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(equalityAffirmativeActions);

  const conditions = [];
  if (filters?.tipo) {
    conditions.push(eq(equalityAffirmativeActions.tipo, filters.tipo as any));
  }
  if (filters?.estado) {
    conditions.push(
      eq(equalityAffirmativeActions.estado, filters.estado as any)
    );
  }
  if (filters?.departamento) {
    conditions.push(
      eq(equalityAffirmativeActions.departamento, filters.departamento)
    );
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(equalityAffirmativeActions.createdAt));
}

export async function getAffirmativeAction(id: number) {
  const db = await getDb();
  if (!db) return null;
  const actions = await db
    .select()
    .from(equalityAffirmativeActions)
    .where(eq(equalityAffirmativeActions.id, id))
    .limit(1);
  return actions[0] || null;
}

export async function createAffirmativeAction(
  data: InsertEqualityAffirmativeAction
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await (db.insert(equalityAffirmativeActions) as any).values(
    data
  );
  return result.insertId;
}

export async function updateAffirmativeAction(
  id: number,
  data: Partial<InsertEqualityAffirmativeAction>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(equalityAffirmativeActions)
    .set(data)
    .where(eq(equalityAffirmativeActions.id, id));
}

export async function deleteAffirmativeAction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .delete(equalityAffirmativeActions)
    .where(eq(equalityAffirmativeActions.id, id));
}

/**
 * ============================================================================
 * QUEJAS Y DENUNCIAS
 * ============================================================================
 */

export async function listComplaints(filters?: {
  tipo?: string;
  estado?: string;
  prioridad?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  let query = db.select().from(equalityComplaints);

  const conditions = [];
  if (filters?.tipo) {
    conditions.push(eq(equalityComplaints.tipo, filters.tipo as any));
  }
  if (filters?.estado) {
    conditions.push(eq(equalityComplaints.estado, filters.estado as any));
  }
  if (filters?.prioridad) {
    conditions.push(eq(equalityComplaints.prioridad, filters.prioridad as any));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  return query.orderBy(desc(equalityComplaints.createdAt));
}

export async function getComplaint(id: number) {
  const db = await getDb();
  if (!db) return null;
  const complaints = await db
    .select()
    .from(equalityComplaints)
    .where(eq(equalityComplaints.id, id))
    .limit(1);
  return complaints[0] || null;
}

export async function getComplaintByFolio(folio: string) {
  const db = await getDb();
  if (!db) return null;
  const complaints = await db
    .select()
    .from(equalityComplaints)
    .where(eq(equalityComplaints.folio, folio))
    .limit(1);
  return complaints[0] || null;
}

export async function createComplaint(data: InsertEqualityComplaint) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await (db.insert(equalityComplaints) as any).values(data);
  return result.insertId;
}

export async function updateComplaint(
  id: number,
  data: Partial<InsertEqualityComplaint>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(equalityComplaints)
    .set(data)
    .where(eq(equalityComplaints.id, id));
}

/**
 * ============================================================================
 * COMITÉ DE IGUALDAD
 * ============================================================================
 */

export async function listCommitteeMembers(activeOnly = true) {
  const db = await getDb();
  if (!db) return [];
  let query = db
    .select({
      id: equalityCommittee.id,
      userId: equalityCommittee.userId,
      cargo: equalityCommittee.cargo,
      fechaDesignacion: equalityCommittee.fechaDesignacion,
      fechaTermino: equalityCommittee.fechaTermino,
      activo: equalityCommittee.activo,
      observaciones: equalityCommittee.observaciones,
      createdAt: equalityCommittee.createdAt,
    })
    .from(equalityCommittee);

  if (activeOnly) {
    query = query.where(eq(equalityCommittee.activo, true)) as any;
  }

  return query.orderBy(
    equalityCommittee.cargo,
    equalityCommittee.fechaDesignacion
  );
}

export async function getCommitteeMember(id: number) {
  const db = await getDb();
  if (!db) return null;
  const members = await db
    .select()
    .from(equalityCommittee)
    .where(eq(equalityCommittee.id, id))
    .limit(1);
  return members[0] || null;
}

export async function addCommitteeMember(data: InsertEqualityCommitteeMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Construir objeto con solo los campos que tienen valores
  const insertData: any = {
    userId: data.userId,
    cargo: data.cargo,
    fechaDesignacion: data.fechaDesignacion,
    activo: data.activo ?? true,
  };

  // Agregar campos opcionales solo si tienen valores
  if (data.observaciones) insertData.observaciones = data.observaciones;
  if (data.designadoPor) insertData.designadoPor = data.designadoPor;
  if (data.fechaTermino) insertData.fechaTermino = data.fechaTermino;

  const [result] = await (db.insert(equalityCommittee) as any).values(
    insertData
  );
  return result.insertId;
}

export async function removeCommitteeMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(equalityCommittee)
    .set({ activo: false, fechaTermino: sql`CURDATE()` } as any)
    .where(eq(equalityCommittee.id, id));
}

export async function updateCommitteeMember(
  id: number,
  data: Partial<InsertEqualityCommitteeMember>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(equalityCommittee)
    .set(data)
    .where(eq(equalityCommittee.id, id));
}
