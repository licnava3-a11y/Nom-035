import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, courses, modules, evaluations, questions, answerOptions, studentProgress, evaluationAttempts, studentAnswers, certificates, cases, caseFollowUps, caseDocuments, committeeMembers, resources, jobPositions, jobFunctions, performanceEvaluations, mailbox, mailboxResponses, notifications, caseAssignments, invoices, purchaseOrders, expenseRequests } from "../drizzle/schema";
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

      await db.insert(users).values(insertData);
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

export async function updateUserRole(userId: number, role: "admin" | "instructor" | "student" | "committee") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
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
  const result = await db.insert(resources).values({
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
  }).where(eq(resources.id, id));
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
  const result = await db.insert(jobPositions).values(data);
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
  
  const result = await db.insert(mailbox).values({
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
  
  const result = await db.insert(mailboxResponses).values({
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
  
  const result = await db.insert(notifications).values({
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
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
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
  
  const result = await db.insert(caseAssignments).values({
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
  const montoTotal = allInvoices.reduce((sum, inv) => sum + parseFloat(inv.monto.toString()), 0);
  
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
  const montoTotal = allOrders.reduce((sum, order) => sum + parseFloat(order.monto.toString()), 0);
  
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
  const montoTotal = allRequests.reduce((sum, req) => sum + parseFloat(req.monto.toString()), 0);
  
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
