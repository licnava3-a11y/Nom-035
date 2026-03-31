import { eq, asc, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, answerOptions, caseAssignments, caseDocuments, caseFollowUps, cases, certificates, committeeMembers, courses, evaluationAttempts, evaluations, expenseRequests, invoices, jobFunctions, jobPositions, leads, mailbox, mailboxResponses, modules, notifications, performanceEvaluations, positions, purchaseOrders, questions, resources, salespeople, sentimentAnalysis, studentAnswers, studentProgress, surveyResponses, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // First check if user exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.openId, user.openId))
      .limit(1);

    if (existingUser.length > 0) {
      // User exists - update only essential fields
      const updateData: Partial<InsertUser> = {
        lastSignedIn: new Date(),
      };

      if (user.name !== undefined) updateData.name = user.name;
      if (user.email !== undefined) updateData.email = user.email;
      if (user.loginMethod !== undefined) updateData.loginMethod = user.loginMethod;
      if (user.role !== undefined) updateData.role = user.role;
      if ((user as any).passwordHash !== undefined) (updateData as any).passwordHash = (user as any).passwordHash;

      await db
        .update(users)
        .set(updateData)
        .where(eq(users.openId, user.openId));

      console.log("[Database] User updated:", user.openId);
    } else {
      // User doesn't exist - insert with minimal fields
      const insertData: InsertUser = {
        openId: user.openId,
        name: user.name || "",
        email: user.email || "",
        loginMethod: user.loginMethod || "google",
        role: user.role || (user.openId === ENV.ownerOpenId ? "admin" : "student"),
        departamento: "Administración", // Departamento por defecto
        lastSignedIn: user.lastSignedIn || new Date(),
      };

      await (db.insert(users) as any).values(insertData);
      console.log("[Database] User created:", user.openId);
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// User management
export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users);
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function adminExists(): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ id: users.id }).from(users).where(eq(users.role, 'admin')).limit(1);
  return result.length > 0;
}

export async function updateUserRole(userId: number, role: "admin" | "instructor" | "student" | "committee") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role } as any).where(eq(users.id, userId));
}

// Course management
export async function getAllCourses() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(courses);
}

export async function getPublishedCourses() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(courses).where(eq(courses.isPublished, true));
}

export async function getCourseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(courses).where(eq(courses.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getModulesByCourseId(courseId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(modules).where(eq(modules.courseId, courseId));
}

export async function getModuleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(modules).where(eq(modules.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Evaluation management
export async function getAllEvaluations() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(evaluations);
}

export async function getEvaluationsByModuleId(moduleId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(evaluations).where(eq(evaluations.moduleId, moduleId));
}

export async function getEvaluationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(evaluations).where(eq(evaluations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getQuestionsByEvaluationId(evaluationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(questions).where(eq(questions.evaluationId, evaluationId));
}

export async function getAnswerOptionsByQuestionId(questionId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(answerOptions).where(eq(answerOptions.questionId, questionId));
}

// Student progress
export async function getStudentProgressByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(studentProgress).where(eq(studentProgress.userId, userId));
}

export async function getStudentProgressByCourse(userId: number, courseId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(studentProgress)
    .where(eq(studentProgress.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Evaluation attempts
export async function getEvaluationAttemptsByUser(userId: number, evaluationId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(evaluationAttempts)
    .where(eq(evaluationAttempts.userId, userId));
}

export async function getNextAttemptNumber(userId: number, evaluationId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 1;
  const attempts = await db.select().from(evaluationAttempts)
    .where(eq(evaluationAttempts.userId, userId));
  const filtered = attempts.filter(a => a.evaluationId === evaluationId);
  return filtered.length + 1;
}

export async function getEvaluationAttempts(userId: number, evaluationId: number) {
  const db = await getDb();
  if (!db) return [];
  const attempts = await db.select().from(evaluationAttempts)
    .where(eq(evaluationAttempts.userId, userId));
  return attempts.filter(a => a.evaluationId === evaluationId);
}

export async function getAttemptById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(evaluationAttempts).where(eq(evaluationAttempts.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getStudentAnswersByAttempt(attemptId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(studentAnswers).where(eq(studentAnswers.attemptId, attemptId));
}

// Certificates
export async function getCertificatesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(certificates).where(eq(certificates.userId, userId));
}

// Cases management
export async function getAllCases() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(cases);
}

export async function getCaseById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCaseFollowUpsByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(caseFollowUps).where(eq(caseFollowUps.caseId, caseId));
}

export async function getCaseDocumentsByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(caseDocuments).where(eq(caseDocuments.caseId, caseId));
}

// Committee members
export async function getAllCommitteeMembers() {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: committeeMembers.id,
      employeeId: committeeMembers.employeeId,
      userId: committeeMembers.userId,
      position: committeeMembers.position,
      responsibilities: committeeMembers.responsibilities,
      isActive: committeeMembers.isActive,
      assignedAt: committeeMembers.assignedAt,
      createdAt: committeeMembers.createdAt,
      updatedAt: committeeMembers.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(committeeMembers)
    .leftJoin(users, eq(committeeMembers.userId, users.id));
  
  return result;
}

export async function getCommitteeMemberByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(committeeMembers).where(eq(committeeMembers.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Resources
export async function getAllResources() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(resources);
}

export async function getResourceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(resources).where(eq(resources.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createResource(data: {
  title: string;
  description?: string;
  category: "manual" | "protocol" | "form" | "pdf" | "presentation" | "other";
  fileUrl: string;
  fileType: string;
  uploadedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await (db.insert(resources) as any).values({
    title: data.title,
    description: data.description,
    category: data.category,
    resourceUrl: data.fileUrl,
    fileKey: data.fileUrl,
    uploadedBy: data.uploadedBy,
  });
  const insertId = (result as any)[0]?.insertId || 1;
  return { id: Number(insertId), ...data };
}

export async function updateResource(id: number, data: {
  title: string;
  description?: string;
  category: "manual" | "protocol" | "form" | "pdf" | "presentation" | "other";
  fileUrl: string;
  fileType: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(resources).set({
    title: data.title,
    description: data.description,
    category: data.category,
    resourceUrl: data.fileUrl,
    fileKey: data.fileUrl,
  } as any).where(eq(resources.id, id));
  return { id, ...data };
}

// Job positions
export async function getAllJobPositions() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(jobPositions);
}

export async function getJobPositionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobPositions).where(eq(jobPositions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getJobFunctionsByPositionId(positionId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(jobFunctions).where(eq(jobFunctions.positionId, positionId));
}

export async function createJobPosition(data: typeof jobPositions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await (db.insert(jobPositions) as any).values(data);
  return { id: Number(result[0].insertId), ...data };
}

export async function updateJobPosition(id: number, data: Partial<typeof jobPositions.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db.update(jobPositions).set(data).where(eq(jobPositions.id, id));
  return { id, ...data };
}

// Performance evaluations
export async function getPerformanceEvaluationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(performanceEvaluations).where(eq(performanceEvaluations.userId, userId));
}

// Mailbox functions
export async function getAllMailboxRequests() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(mailbox);
}

export async function getMailboxRequestById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(mailbox).where(eq(mailbox.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMailboxRequest(data: {
  requestType: "queja" | "sugerencia" | "felicitacion" | "solicitud_capacitacion";
  complaintType?: string;
  senderName?: string;
  senderEmail: string;
  senderPhone?: string;
  isAnonymous: boolean;
  subject: string;
  message: string;
  priority?: "low" | "medium" | "high" | "urgent";
  receivedVia: "email" | "web_form";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Generate folio
  const year = new Date().getFullYear();
  const allRequests = await db.select().from(mailbox);
  const consecutivo = allRequests.length + 1;
  const folio = `BZN-${consecutivo.toString().padStart(4, '0')}/${year}`;
  
  const result = await (db.insert(mailbox) as any).values({
    folio,
    requestType: data.requestType,
    complaintType: data.complaintType as any,
    senderName: data.senderName,
    senderEmail: data.senderEmail,
    senderPhone: data.senderPhone,
    isAnonymous: data.isAnonymous,
    subject: data.subject,
    message: data.message,
    priority: data.priority || "medium",
    receivedVia: data.receivedVia,
    status: "recibido",
  });
  
  const insertId = (result as any)[0]?.insertId || 1;
  return { id: Number(insertId), folio, ...data };
}

export async function updateMailboxStatus(id: number, status: "recibido" | "asignado" | "en_proceso" | "concluido", assignedTo?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const updateData: any = { status };
  if (assignedTo) {
    updateData.assignedTo = assignedTo;
  }
  if (status === "concluido") {
    updateData.concludedAt = new Date();
  }
  
  await db.update(mailbox).set(updateData).where(eq(mailbox.id, id));
  return { id, status, assignedTo };
}

export async function addMailboxResponse(mailboxId: number, responderId: number, response: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await (db.insert(mailboxResponses) as any).values({
    mailboxId,
    responderId,
    response,
    emailSent: false,
  });
  
  const insertId = (result as any)[0]?.insertId || 1;
  return { id: Number(insertId), mailboxId, responderId, response };
}

export async function getMailboxResponses(mailboxId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(mailboxResponses).where(eq(mailboxResponses.mailboxId, mailboxId));
}

// Notifications functions
export async function createNotification(data: {
  userId: number;
  type: "new_case" | "case_status_change" | "case_assigned" | "deadline_approaching" | "new_mailbox_request" | "mailbox_status_change" | "system";
  title: string;
  message: string;
  relatedEntityType?: string;
  relatedEntityId?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await (db.insert(notifications) as any).values({
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    relatedEntityType: data.relatedEntityType,
    relatedEntityId: data.relatedEntityId,
    isRead: false,
  });
  
  const insertId = (result as any)[0]?.insertId || 1;
  return { id: Number(insertId), ...data };
}

export async function getUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications).where(eq(notifications.userId, userId));
}

export async function markNotificationAsRead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(notifications).set({ isRead: true } as any).where(eq(notifications.id, id));
  return { id, isRead: true };
}

export async function getUnreadNotificationsCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(notifications).where(eq(notifications.userId, userId));
  return result.filter(n => !n.isRead).length;
}

// Case assignments functions
export async function assignCommitteeMemberToCase(caseId: number, committeeMemberId: number, assignedBy: number, role: "lead" | "support" | "observer" = "support") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await (db.insert(caseAssignments) as any).values({
    caseId,
    committeeMemberId,
    assignedBy,
    role,
    isActive: true,
  });
  
  const insertId = (result as any)[0]?.insertId || 1;
  return { id: Number(insertId), caseId, committeeMemberId, assignedBy, role };
}

export async function getCaseAssignments(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(caseAssignments).where(eq(caseAssignments.caseId, caseId));
}

export async function getCommitteeMemberAssignments(committeeMemberId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(caseAssignments).where(eq(caseAssignments.committeeMemberId, committeeMemberId));
}


// ==================== FINANCIAL QUERIES ====================

/**
 * Get invoices summary for dashboard
 */
export async function getInvoicesSummary() {
  const db = await getDb();
  if (!db) return { total: 0, pendientes: 0, vencidas: 0, montoTotal: 0 };
  
  const allInvoices = await db.select().from(invoices);
  const total = allInvoices.length;
  const pendientes = allInvoices.filter(inv => inv.estado === 'pendiente').length;
  const vencidas = allInvoices.filter(inv => inv.estado === 'vencida').length;
  const montoTotal = allInvoices.reduce((sum: any, inv: any) => sum + parseFloat(inv.monto.toString()), 0);
  
  return { total, pendientes, vencidas, montoTotal };
}

/**
 * Get purchase orders summary for dashboard
 */
export async function getPurchaseOrdersSummary() {
  const db = await getDb();
  if (!db) return { total: 0, montoTotal: 0 };
  
  const allOrders = await db.select().from(purchaseOrders);
  const total = allOrders.length;
  const montoTotal = allOrders.reduce((sum: any, order: any) => sum + parseFloat(order.monto.toString()), 0);
  
  return { total, montoTotal };
}

/**
 * Get expense requests summary for dashboard
 */
export async function getExpenseRequestsSummary() {
  const db = await getDb();
  if (!db) return { total: 0, pendientes: 0, montoTotal: 0 };
  
  const allRequests = await db.select().from(expenseRequests);
  const total = allRequests.length;
  const pendientes = allRequests.filter(req => req.estado === 'pendiente').length;
  const montoTotal = allRequests.reduce((sum: any, req: any) => sum + parseFloat(req.monto.toString()), 0);
  
  return { total, pendientes, montoTotal };
}

/**
 * Get all invoices
 */
export async function getAllInvoices() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(invoices);
}

/**
 * Get all purchase orders
 */
export async function getAllPurchaseOrders() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(purchaseOrders);
}

/**
 * Get all expense requests
 */
export async function getAllExpenseRequests() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(expenseRequests);
}

// ============================================
// Salespeople Management
// ============================================

/**
 * Get all active salespeople ordered by last assignment (round-robin)
 */
export async function getActiveSalespeople() {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(salespeople)
    .where(eq(salespeople.activo, true))
    .orderBy(asc(salespeople.ultimaAsignacion));
}

/**
 * Get next salesperson using round-robin strategy
 * Returns the active salesperson with the oldest last assignment date
 */
export async function getNextSalespersonRoundRobin() {
  const db = await getDb();
  if (!db) return null;
  
  const activeSalespeople = await db
    .select()
    .from(salespeople)
    .where(eq(salespeople.activo, true))
    .orderBy(asc(salespeople.ultimaAsignacion))
    .limit(1);
  
  return activeSalespeople[0] || null;
}

/**
 * Update salesperson assignment stats after assigning a lead
 */
export async function updateSalespersonAssignment(salespersonId: number) {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(salespeople)
    .set({
      ultimaAsignacion: new Date(),
      totalLeadsAsignados: sql`${salespeople.totalLeadsAsignados} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(salespeople.id, salespersonId));
}

/**
 * Get salesperson by ID
 */
export async function getSalespersonById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(salespeople).where(eq(salespeople.id, id)).limit(1);
  return result[0] || null;
}

/**
 * Get all salespeople (active and inactive)
 */
export async function getAllSalespeople() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(salespeople).orderBy(desc(salespeople.activo), asc(salespeople.nombre));
}

/**
 * Create new salesperson
 */
export async function createSalesperson(data: {
  nombre: string;
  email: string;
  userId?: number;
}) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await (db.insert(salespeople) as any).values({
    nombre: data.nombre,
    email: data.email,
    userId: data.userId,
    activo: true,
    totalLeadsAsignados: 0,
  });
  
  return result.insertId;
}

/**
 * Update salesperson
 */
export async function updateSalesperson(id: number, data: {
  nombre?: string;
  email?: string;
  activo?: boolean;
}) {
  const db = await getDb();
  if (!db) return;
  
  await db
    .update(salespeople)
    .set({
      ...data,
      updatedAt: new Date(),
    } as any)
    .where(eq(salespeople.id, id));
}

/**
 * Toggle salesperson active status
 */
export async function toggleSalespersonActive(id: number) {
  const db = await getDb();
  if (!db) return;
  
  const salesperson = await getSalespersonById(id);
  if (!salesperson) return;
  
  await db
    .update(salespeople)
    .set({
      activo: !salesperson.activo,
      updatedAt: new Date(),
    } as any)
    .where(eq(salespeople.id, id));
}

/**
 * Get salespeople distribution stats
 */
export async function getSalespeopleDistributionStats() {
  const db = await getDb();
  if (!db) return [];
  
  // Get all salespeople with their lead counts by status
  const stats = await db
    .select({
      id: salespeople.id,
      nombre: salespeople.nombre,
      email: salespeople.email,
      activo: salespeople.activo,
      totalLeadsAsignados: salespeople.totalLeadsAsignados,
      ultimaAsignacion: salespeople.ultimaAsignacion,
      leadsActivos: sql<number>`COUNT(CASE WHEN ${(leads as any).status} IN ('new', 'contacted', 'negotiation', 'proposal') THEN 1 END)`,
      leadsGanados: sql<number>`COUNT(CASE WHEN ${(leads as any).status} = 'won' THEN 1 END)`,
      leadsPerdidos: sql<number>`COUNT(CASE WHEN ${(leads as any).status} = 'lost' THEN 1 END)`,
    })
    .from(salespeople)
    .leftJoin(leads, eq((leads as any).assignedTo, salespeople.id))
    .groupBy(salespeople.id)
    .orderBy(desc(salespeople.activo), asc(salespeople.nombre));
  
  return stats;
}

/**
 * Create notification for salesperson when lead is assigned
 */
export async function notifySalespersonLeadAssignment(data: {
  salespersonId: number;
  leadId: number;
  leadName: string;
  leadCompany?: string;
  leadNormativas?: string[];
}) {
  const db = await getDb();
  if (!db) return;
  
  // Get salesperson with userId
  const salesperson = await getSalespersonById(data.salespersonId);
  if (!salesperson || !salesperson.userId) {
    console.log(`[Notifications] Salesperson ${data.salespersonId} has no linked userId, skipping notification`);
    return;
  }
  
  // Build notification message
  const normativasText = data.leadNormativas && data.leadNormativas.length > 0
    ? ` interesado en ${data.leadNormativas.join(", ")}`
    : "";
  
  const companyText = data.leadCompany ? ` de ${data.leadCompany}` : "";
  
  const message = `Se te ha asignado un nuevo lead: ${data.leadName}${companyText}${normativasText}. Revisa el pipeline para dar seguimiento.`;
  
  // Create notification
  await (db.insert(notifications) as any).values({
    userId: salesperson.userId,
    type: "lead_assigned" as any,
    title: "Nuevo Lead Asignado",
    message,
    relatedEntityType: "lead",
    relatedEntityId: data.leadId,
    isRead: false,
  } as any);
  
  console.log(`[Notifications] Lead assignment notification sent to salesperson ${salesperson.nombre} (userId: ${salesperson.userId})`);
}

/**
 * Get individual salesperson performance metrics
 */
export async function getSalespersonPerformance(salespersonId: number, months: number = 6) {
  const db = await getDb();
  if (!db) return null;
  
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  // Get all leads for this salesperson
  const salespersonLeads = await db
    .select()
    .from(leads)
    .where(eq(leads.asignadoA, salespersonId));
  
  // Calculate metrics
  const totalLeads = salespersonLeads.length;
  const leadsWon = salespersonLeads.filter(l => l.estado === "ganado").length;
  const leadsLost = salespersonLeads.filter(l => l.estado === "perdido").length;
  const leadsActive = salespersonLeads.filter(l => 
    ["nuevo", "contactado", "en_negociacion", "propuesta_enviada"].includes(l.estado)
  ).length;
  
  const conversionRate = totalLeads > 0 ? (leadsWon / totalLeads) * 100 : 0;
  
  // Calculate average response time (time from creation to first contact)
  const contactedLeads = salespersonLeads.filter(l => l.fechaContacto);
  let avgResponseTime = 0;
  if (contactedLeads.length > 0) {
    const totalResponseTime = contactedLeads.reduce((sum: any, lead: any) => {
      if (lead.fechaContacto && lead.createdAt) {
        const diff = new Date(lead.fechaContacto).getTime() - new Date(lead.createdAt).getTime();
        return sum + diff;
      }
      return sum;
    }, 0);
    avgResponseTime = totalResponseTime / contactedLeads.length / (1000 * 60 * 60); // Convert to hours
  }
  
  // Group by source
  const bySource: Record<string, { total: number; won: number }> = {};
  salespersonLeads.forEach(lead => {
    const source = lead.origen || "Desconocido";
    if (!bySource[source]) {
      bySource[source] = { total: 0, won: 0 };
    }
    bySource[source].total++;
    if (lead.estado === "ganado") {
      bySource[source].won++;
    }
  });
  
  // Group by month for trends
  const monthlyTrends: Record<string, { total: number; won: number; lost: number }> = {};
  salespersonLeads.forEach(lead => {
    const monthKey = new Date(lead.createdAt).toISOString().substring(0, 7); // YYYY-MM
    if (!monthlyTrends[monthKey]) {
      monthlyTrends[monthKey] = { total: 0, won: 0, lost: 0 };
    }
    monthlyTrends[monthKey].total++;
    if (lead.estado === "ganado") monthlyTrends[monthKey].won++;
    if (lead.estado === "perdido") monthlyTrends[monthKey].lost++;
  });
  
  // Calculate total revenue from won leads
  const totalRevenue = salespersonLeads
    .filter(l => l.estado === "ganado" && l.valorEstimado)
    .reduce((sum: any, l: any) => sum + Number(l.valorEstimado || 0), 0);
  
  return {
    totalLeads,
    leadsWon,
    leadsLost,
    leadsActive,
    conversionRate,
    avgResponseTime,
    totalRevenue,
    bySource,
    monthlyTrends,
    recentLeads: salespersonLeads
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10),
  };
}

/**
 * Analizar sentimiento de respuestas de encuestas NOM-035 usando LLM
 * Detecta patrones de riesgo psicosocial (burnout, acoso, estrés)
 */
export async function analyzeSentimentWithLLM(responseText: string, questionContext?: string) {
  const { invokeLLM } = await import("./_core/llm");
  
  const prompt = `Eres un experto en psicología organizacional y riesgo psicosocial según la NOM-035-STPS-2018 de México.

Analiza la siguiente respuesta de un trabajador en una encuesta de factores de riesgo psicosocial:

${questionContext ? `**Contexto de la pregunta:** ${questionContext}\n\n` : ''}**Respuesta del trabajador:** "${responseText}"

Realiza un análisis profundo y proporciona tu evaluación en formato JSON con la siguiente estructura:

{
  "sentiment": "positive|neutral|negative|critical",
  "riskLevel": "low|medium|high|critical",
  "confidence": 85,
  "keywords": ["palabra1", "palabra2", "palabra3"],
  "riskIndicators": ["burnout", "acoso", "estrés", "violencia", "carga_excesiva"],
  "summary": "Resumen breve del análisis (máximo 200 caracteres)",
  "recommendations": "Recomendaciones específicas para el comité de atención (máximo 300 caracteres)"
}

**Criterios de evaluación:**
- **sentiment**: Tono emocional general (positive: satisfacción, neutral: indiferente, negative: insatisfacción, critical: alerta roja)
- **riskLevel**: Nivel de riesgo psicosocial detectado
  * low: Sin indicadores de riesgo significativos
  * medium: Indicadores moderados que requieren seguimiento
  * high: Indicadores claros de riesgo que requieren intervención
  * critical: Situación crítica que requiere atención inmediata (burnout severo, acoso, violencia)
- **confidence**: Nivel de confianza del análisis (0-100)
- **keywords**: Palabras clave más relevantes de la respuesta
- **riskIndicators**: Indicadores específicos detectados (burnout, acoso, estrés, violencia, carga_excesiva, discriminación, hostigamiento)
- **summary**: Resumen conciso del análisis
- **recommendations**: Acciones recomendadas para el comité

**Importante:** Si detectas indicadores de riesgo crítico (burnout severo, acoso laboral, violencia, hostigamiento sexual), marca como "critical" y genera recomendaciones de intervención inmediata.`;

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Eres un experto en psicología organizacional y análisis de riesgo psicosocial. Respondes siempre en formato JSON válido."
        },
        {
          role: "user",
          content: prompt
        }
      ] as any,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "sentiment_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              sentiment: {
                type: "string",
                enum: ["positive", "neutral", "negative", "critical"],
                description: "Tono emocional general de la respuesta"
              },
              riskLevel: {
                type: "string",
                enum: ["low", "medium", "high", "critical"],
                description: "Nivel de riesgo psicosocial detectado"
              },
              confidence: {
                type: "number",
                description: "Nivel de confianza del análisis (0-100)"
              },
              keywords: {
                type: "array",
                items: { type: "string" },
                description: "Palabras clave más relevantes"
              },
              riskIndicators: {
                type: "array",
                items: { type: "string" },
                description: "Indicadores específicos de riesgo detectados"
              },
              summary: {
                type: "string",
                description: "Resumen breve del análisis"
              },
              recommendations: {
                type: "string",
                description: "Recomendaciones específicas para el comité"
              }
            },
            required: ["sentiment", "riskLevel", "confidence", "keywords", "riskIndicators", "summary", "recommendations"],
            additionalProperties: false
          }
        }
      }
    });

    const content = response.choices[0].message.content as string;
    if (!content) {
      throw new Error("No content in LLM response");
    }

    const analysis = JSON.parse(content);
    return analysis;
  } catch (error) {
    console.error("[SentimentAnalysis] Error analyzing with LLM:", error);
    throw error;
  }
}

/**
 * Obtener tendencias de sentimiento por departamento
 */
export async function getSentimentTrends(departmentId?: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return null;

  const { sentimentAnalysis, surveyResponses, users } = await import("../drizzle/schema");
  const { eq, and, gte, lte, sql } = await import("drizzle-orm");

  let conditions = [];
  
  if (departmentId) {
    conditions.push(eq(users.departamento, String(departmentId)));
  }
  
  if (startDate) {
    conditions.push(gte(sentimentAnalysis.analyzedAt, startDate));
  }
  
  if (endDate) {
    conditions.push(lte(sentimentAnalysis.analyzedAt, endDate));
  }

  const results = await db
    .select({
      id: sentimentAnalysis.id,
      sentiment: sentimentAnalysis.sentiment,
      riskLevel: sentimentAnalysis.riskLevel,
      confidence: sentimentAnalysis.confidence,
      keywords: sentimentAnalysis.keywords,
      riskIndicators: sentimentAnalysis.riskIndicators,
      summary: sentimentAnalysis.summary,
      recommendations: sentimentAnalysis.recommendations,
      analyzedAt: sentimentAnalysis.analyzedAt,
      alertGenerated: sentimentAnalysis.alertGenerated,
      responseId: surveyResponses.id,
      userId: surveyResponses.userId,
      userName: users.name,
      userDepartment: users.departamento,
    })
    .from(sentimentAnalysis)
    .leftJoin(surveyResponses, eq(sentimentAnalysis.responseId, surveyResponses.id))
    .leftJoin(users, eq(surveyResponses.userId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${sentimentAnalysis.analyzedAt} DESC`);

  return results;
}
