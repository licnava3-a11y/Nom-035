import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, date } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with role field for access control.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "instructor", "student", "committee"]).default("student").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Courses table - Main course catalog
 */
export const courses = mysqlTable("courses", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", [
    "fundamentos",
    "categorias_dominios",
    "mobbing",
    "burnout",
    "protocolos",
    "comite",
    "analisis_puestos",
    "otros"
  ]).notNull(),
  duration: int("duration"), // Duration in minutes
  isPublished: boolean("isPublished").default(false).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Course = typeof courses.$inferSelect;
export type InsertCourse = typeof courses.$inferInsert;

/**
 * Modules table - Course modules/lessons
 */
export const modules = mysqlTable("modules", {
  id: int("id").autoincrement().primaryKey(),
  courseId: int("courseId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  content: text("content"), // HTML or markdown content
  orderIndex: int("orderIndex").notNull().default(0),
  duration: int("duration"), // Duration in minutes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Module = typeof modules.$inferSelect;
export type InsertModule = typeof modules.$inferInsert;

/**
 * Evaluations table - Assessments for modules
 */
export const evaluations = mysqlTable("evaluations", {
  id: int("id").autoincrement().primaryKey(),
  moduleId: int("moduleId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  passingScore: int("passingScore").notNull().default(70), // Percentage
  maxAttempts: int("maxAttempts").default(3),
  timeLimit: int("timeLimit"), // Time limit in minutes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Evaluation = typeof evaluations.$inferSelect;
export type InsertEvaluation = typeof evaluations.$inferInsert;

/**
 * Questions table - Questions for evaluations
 */
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  evaluationId: int("evaluationId").notNull(),
  questionType: mysqlEnum("questionType", ["multiple_choice", "true_false", "case_analysis"]).notNull(),
  questionText: text("questionText").notNull(),
  orderIndex: int("orderIndex").notNull().default(0),
  points: int("points").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Question = typeof questions.$inferSelect;
export type InsertQuestion = typeof questions.$inferInsert;

/**
 * Answer options table - Options for multiple choice questions
 */
export const answerOptions = mysqlTable("answerOptions", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull(),
  optionText: text("optionText").notNull(),
  isCorrect: boolean("isCorrect").notNull().default(false),
  orderIndex: int("orderIndex").notNull().default(0),
  feedback: text("feedback"), // Feedback for this option
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AnswerOption = typeof answerOptions.$inferSelect;
export type InsertAnswerOption = typeof answerOptions.$inferInsert;

/**
 * Student progress table - Track student progress through courses
 */
export const studentProgress = mysqlTable("studentProgress", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  moduleId: int("moduleId"),
  status: mysqlEnum("status", ["not_started", "in_progress", "completed"]).default("not_started").notNull(),
  progressPercentage: int("progressPercentage").default(0).notNull(),
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  lastAccessedAt: timestamp("lastAccessedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StudentProgress = typeof studentProgress.$inferSelect;
export type InsertStudentProgress = typeof studentProgress.$inferInsert;

/**
 * Evaluation attempts table - Track evaluation attempts
 */
export const evaluationAttempts = mysqlTable("evaluationAttempts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  evaluationId: int("evaluationId").notNull(),
  attemptNumber: int("attemptNumber").notNull(),
  score: decimal("score", { precision: 5, scale: 2 }),
  passed: boolean("passed").default(false).notNull(),
  startedAt: timestamp("startedAt").notNull(),
  completedAt: timestamp("completedAt"),
  timeSpent: int("timeSpent"), // Time spent in minutes
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EvaluationAttempt = typeof evaluationAttempts.$inferSelect;
export type InsertEvaluationAttempt = typeof evaluationAttempts.$inferInsert;

/**
 * Student answers table - Store student answers
 */
export const studentAnswers = mysqlTable("studentAnswers", {
  id: int("id").autoincrement().primaryKey(),
  attemptId: int("attemptId").notNull(),
  questionId: int("questionId").notNull(),
  selectedOptionId: int("selectedOptionId"), // For multiple choice
  answerText: text("answerText"), // For case analysis
  isCorrect: boolean("isCorrect"),
  pointsEarned: int("pointsEarned").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StudentAnswer = typeof studentAnswers.$inferSelect;
export type InsertStudentAnswer = typeof studentAnswers.$inferInsert;

/**
 * Certificates table - Course completion certificates
 */
export const certificates = mysqlTable("certificates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: int("courseId").notNull(),
  certificateNumber: varchar("certificateNumber", { length: 100 }).notNull().unique(),
  issuedAt: timestamp("issuedAt").defaultNow().notNull(),
  certificateUrl: varchar("certificateUrl", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = typeof certificates.$inferInsert;

/**
 * Cases table - Psychosocial risk cases
 */
export const cases = mysqlTable("cases", {
  id: int("id").autoincrement().primaryKey(),
  caseNumber: varchar("caseNumber", { length: 100 }).notNull().unique(),
  reporterName: varchar("reporterName", { length: 255 }),
  reporterEmail: varchar("reporterEmail", { length: 320 }),
  reporterPhone: varchar("reporterPhone", { length: 50 }),
  isAnonymous: boolean("isAnonymous").default(false).notNull(),
  caseType: mysqlEnum("caseType", ["mobbing", "burnout", "violence", "stress", "other"]).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["open", "investigating", "resolved", "closed"]).default("open").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  assignedTo: int("assignedTo"), // Committee member assigned
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  closedAt: timestamp("closedAt"),
});

export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;

/**
 * Case follow-ups table - Track case progress
 */
export const caseFollowUps = mysqlTable("caseFollowUps", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  userId: int("userId").notNull(), // User who made the follow-up
  action: text("action").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CaseFollowUp = typeof caseFollowUps.$inferSelect;
export type InsertCaseFollowUp = typeof caseFollowUps.$inferInsert;

/**
 * Case documents table - Documents attached to cases
 */
export const caseDocuments = mysqlTable("caseDocuments", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  documentName: varchar("documentName", { length: 255 }).notNull(),
  documentType: varchar("documentType", { length: 100 }),
  documentUrl: varchar("documentUrl", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CaseDocument = typeof caseDocuments.$inferSelect;
export type InsertCaseDocument = typeof caseDocuments.$inferInsert;

/**
 * Committee members table - Members of the attention committee
 * Now references employees table instead of users directly
 */
export const committeeMembers = mysqlTable("committeeMembers", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").unique(), // References employees table (optional for migration)
  userId: int("userId").notNull().unique(), // Still keep for backward compatibility
  position: varchar("position", { length: 255 }),
  responsibilities: text("responsibilities"),
  isActive: boolean("isActive").default(true).notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CommitteeMember = typeof committeeMembers.$inferSelect;
export type InsertCommitteeMember = typeof committeeMembers.$inferInsert;

/**
 * Resources table - Downloadable resources
 */
export const resources = mysqlTable("resources", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  category: mysqlEnum("category", ["pdf", "presentation", "protocol", "manual", "form", "other"]).notNull(),
  resourceUrl: varchar("resourceUrl", { length: 500 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileSize: int("fileSize"), // File size in bytes
  downloadCount: int("downloadCount").default(0).notNull(),
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Resource = typeof resources.$inferSelect;
export type InsertResource = typeof resources.$inferInsert;

/**
 * Job positions table - Job positions for analysis
 */
export const jobPositions = mysqlTable("jobPositions", {
  id: int("id").autoincrement().primaryKey(),
  positionName: varchar("positionName", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }),
  description: text("description"),
  riskLevel: mysqlEnum("riskLevel", ["low", "medium", "high", "very_high"]),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobPosition = typeof jobPositions.$inferSelect;
export type InsertJobPosition = typeof jobPositions.$inferInsert;

/**
 * Job functions table - Functions breakdown for positions
 */
export const jobFunctions = mysqlTable("jobFunctions", {
  id: int("id").autoincrement().primaryKey(),
  positionId: int("positionId").notNull(),
  functionName: varchar("functionName", { length: 255 }).notNull(),
  description: text("description"),
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly", "occasional"]),
  riskFactors: text("riskFactors"), // JSON array of risk factors
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobFunction = typeof jobFunctions.$inferSelect;
export type InsertJobFunction = typeof jobFunctions.$inferInsert;

/**
 * Performance evaluations table - Employee performance evaluations
 */
export const performanceEvaluations = mysqlTable("performanceEvaluations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  evaluatorId: int("evaluatorId").notNull(),
  evaluationDate: timestamp("evaluationDate").notNull(),
  overallScore: decimal("overallScore", { precision: 5, scale: 2 }),
  workEnvironmentScore: decimal("workEnvironmentScore", { precision: 5, scale: 2 }),
  comments: text("comments"),
  recommendations: text("recommendations"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PerformanceEvaluation = typeof performanceEvaluations.$inferSelect;
export type InsertPerformanceEvaluation = typeof performanceEvaluations.$inferInsert;

/**
 * Mailbox table - Electronic mailbox for complaints, suggestions, etc.
 */
export const mailbox = mysqlTable("mailbox", {
  id: int("id").autoincrement().primaryKey(),
  folio: varchar("folio", { length: 50 }).notNull().unique(),
  requestType: mysqlEnum("requestType", [
    "queja",
    "sugerencia",
    "felicitacion",
    "solicitud_capacitacion"
  ]).notNull(),
  complaintType: mysqlEnum("complaintType", [
    "liderazgo_negativo",
    "entorno_organizacional_desfavorable",
    "conductas_contrarias_ambiente_laboral",
    "carga_trabajo",
    "falta_control_trabajo",
    "jornadas_trabajo_extensas",
    "interferencia_relacion_trabajo_familia",
    "acoso_laboral",
    "acoso_sexual",
    "hostigamiento_sexual",
    "mobbing",
    "burnout",
    "violencia_laboral",
    "otros"
  ]),
  senderName: varchar("senderName", { length: 255 }),
  senderEmail: varchar("senderEmail", { length: 320 }).notNull(),
  senderPhone: varchar("senderPhone", { length: 20 }),
  isAnonymous: boolean("isAnonymous").default(false).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["recibido", "asignado", "en_proceso", "concluido"]).default("recibido").notNull(),
  assignedTo: int("assignedTo"), // Committee member assigned
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  receivedVia: mysqlEnum("receivedVia", ["email", "web_form"]).default("web_form").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  concludedAt: timestamp("concludedAt"),
});

export type Mailbox = typeof mailbox.$inferSelect;
export type InsertMailbox = typeof mailbox.$inferInsert;

/**
 * Mailbox responses table - Responses to mailbox requests
 */
export const mailboxResponses = mysqlTable("mailboxResponses", {
  id: int("id").autoincrement().primaryKey(),
  mailboxId: int("mailboxId").notNull(),
  responderId: int("responderId").notNull(),
  response: text("response").notNull(),
  emailSent: boolean("emailSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MailboxResponse = typeof mailboxResponses.$inferSelect;
export type InsertMailboxResponse = typeof mailboxResponses.$inferInsert;

/**
 * Notifications table - System notifications
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // Recipient
  type: mysqlEnum("type", [
    "new_case",
    "case_status_change",
    "case_assigned",
    "deadline_approaching",
    "new_mailbox_request",
    "mailbox_status_change",
    "system"
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  relatedEntityType: varchar("relatedEntityType", { length: 50 }), // e.g., "case", "mailbox"
  relatedEntityId: int("relatedEntityId"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Case assignments table - Committee member assignments to cases
 */
export const caseAssignments = mysqlTable("caseAssignments", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  committeeMemberId: int("committeeMemberId").notNull(),
  role: mysqlEnum("role", ["lead", "support", "observer"]).default("support").notNull(),
  assignedBy: int("assignedBy").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  assignedAt: timestamp("assignedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type CaseAssignment = typeof caseAssignments.$inferSelect;
export type InsertCaseAssignment = typeof caseAssignments.$inferInsert;

/**
 * Employees table - Catalog of workers/employees
 * This is the master catalog for all employees in the organization
 */
export const employees = mysqlTable("employees", {
  id: int("id").autoincrement().primaryKey(),
  // Personal Information
  firstName: varchar("firstName", { length: 100 }).notNull(),
  lastName: varchar("lastName", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  curp: varchar("curp", { length: 18 }).unique(), // CURP (Mexican ID)
  
  // Employment Information
  employeeNumber: varchar("employeeNumber", { length: 50 }).unique(),
  department: varchar("department", { length: 100 }),
  position: varchar("position", { length: 100 }),
  hireDate: date("hireDate"),
  contractType: mysqlEnum("contractType", ["permanent", "temporary", "contract"]).default("permanent"),
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  terminationDate: date("terminationDate"),
  
  // Relationship with users table
  userId: int("userId").unique(), // Link to users table when employee has system access
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;
