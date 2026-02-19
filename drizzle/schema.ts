import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, date, bigint, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

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
  role: mysqlEnum("role", ["admin", "instructor", "student", "committee", "committee_member", "committee_coordinator", "administrativo", "director", "responsable_nom035", "gerente", "rh", "supervisor", "jefe_area", "empleado", "auxiliar_rh", "recursos_humanos", "demo"]).default("student").notNull(),
  customPermissions: json("customPermissions").$type<{
    can_view?: boolean;
    can_create?: boolean;
    can_edit?: boolean;
    can_delete?: boolean;
    can_approve?: boolean;
    can_export?: boolean;
  }>(),
  
  // Campos NOM-035 STPS 2018 - Guía V
  curp: varchar("curp", { length: 18 }).unique(),
  rfc: varchar("rfc", { length: 13 }).unique(),
  telefono: varchar("telefono", { length: 15 }),
  fechaNacimiento: date("fechaNacimiento"),
  sexo: mysqlEnum("sexo", ["Masculino", "Femenino", "Otro"]),
  estadoCivil: mysqlEnum("estadoCivil", ["Soltero(a)", "Casado(a)", "Divorciado(a)", "Viudo(a)", "Unión libre"]),
  puesto: varchar("puesto", { length: 255 }),
  departamento: varchar("departamento", { length: 255 }).notNull(),
  fechaIngreso: date("fechaIngreso"),
  tipoContrato: mysqlEnum("tipoContrato", ["Planta", "Temporal", "Por obra", "Honorarios", "Otro"]),
  jornadaLaboral: mysqlEnum("jornadaLaboral", ["Diurna", "Nocturna", "Mixta", "Por turnos"]),
  direccion: text("direccion"),
  ultimoGradoEstudios: varchar("ultimoGradoEstudios", { length: 100 }),
  nombreCarrera: varchar("nombreCarrera", { length: 255 }),
  habilidadesTransversales: text("habilidadesTransversales"),
  habilidadesLongitudinales: text("habilidadesLongitudinales"),
  
  // Campos para métricas NMX-025 (Igualdad Laboral)
  salario: decimal("salario", { precision: 10, scale: 2 }), // Salario mensual bruto
  nivelJerarquico: mysqlEnum("nivelJerarquico", ["Operativo", "Especialista", "Supervisor", "Gerencial", "Directivo", "Alta Dirección"]),
  
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
  departmentId: int("departmentId"), // Department where the case originated
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
    "employee_hire",
    "employee_termination",
    "department_change",
    "survey_expiring",
    "training_due",
    "recognition", // Reconocimientos y felicitaciones
    "system" // Notificaciones del sistema
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
 * Departments table - Organizational departments catalog
 * Master catalog of all departments in the organization
 */
export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  code: varchar("code", { length: 50 }).unique(), // Código del departamento (ej: "RH", "IT", "FIN")
  parentId: int("parentId"), // Departamento padre para jerarquía (self-reference)
  managerId: int("managerId"), // Jefe del departamento (self-reference a employees)
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

/**
 * Department History table - Track changes to departments over time
 * Stores historical snapshots of department changes for temporal comparison
 */
export const departmentHistory = mysqlTable("department_history", {
  id: int("id").autoincrement().primaryKey(),
  departmentId: int("departmentId").notNull(), // Reference to departments.id
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  code: varchar("code", { length: 50 }),
  parentId: int("parentId"), // Historical parent
  managerId: int("managerId"), // Historical manager
  isActive: boolean("isActive").notNull(),
  changeType: mysqlEnum("changeType", ["created", "updated", "deleted"]).notNull(),
  changedAt: timestamp("changedAt").defaultNow().notNull(),
  changedBy: int("changedBy"), // User who made the change
});

export type DepartmentHistory = typeof departmentHistory.$inferSelect;
export type InsertDepartmentHistory = typeof departmentHistory.$inferInsert;

/**
 * Positions table - Job positions catalog
 * Master catalog of all job positions in the organization
 */
export const positions = mysqlTable("positions", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  code: varchar("code", { length: 50 }).unique(), // Código del puesto (ej: "GER-001", "ANA-002")
  departmentId: int("departmentId").references(() => departments.id), // Departamento al que pertenece
  level: mysqlEnum("level", ["executive", "management", "supervisor", "specialist", "entry"]),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Position = typeof positions.$inferSelect;
export type InsertPosition = typeof positions.$inferInsert;

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
  gender: mysqlEnum("gender", ["male", "female", "other", "prefer_not_to_say"]), // Género para métricas NMX-025
  
  // Employment Information
  employeeNumber: varchar("employeeNumber", { length: 50 }).unique(),
  departmentId: int("departmentId").references(() => departments.id),
  positionId: int("positionId").references(() => positions.id),
  hireDate: date("hireDate"),
  contractType: mysqlEnum("contractType", ["permanent", "temporary", "contract"]).default("permanent"),
  contract1ExpirationDate: date("contract1ExpirationDate"),
  contract2ExpirationDate: date("contract2ExpirationDate"),
  contract3ExpirationDate: date("contract3ExpirationDate"),
  
  // Status
  isActive: boolean("isActive").default(true).notNull(),
  terminationDate: date("terminationDate"),
  
  // Reentry tracking
  reentryCount: int("reentryCount").default(0).notNull(), // Number of times re-hired
  previousHireDates: json("previousHireDates").$type<string[]>(), // Array of previous hire dates
  
  // Relationship with users table
  userId: int("userId").unique(), // Link to users table when employee has system access
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;

/**
 * Employee History - Tracks all employment events (hires, terminations, reentries)
 */
export const employeeHistory = mysqlTable("employeeHistory", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").references(() => employees.id).notNull(),
  curp: varchar("curp", { length: 18 }).notNull(), // Store CURP for tracking across reentries
  eventType: mysqlEnum("eventType", ["hire", "termination", "reentry"]).notNull(),
  eventDate: date("eventDate").notNull(),
  
  // Termination details (only for termination events)
  terminationReason: mysqlEnum("terminationReason", [
    "resignation",
    "dismissal",
    "retirement",
    "contract_end",
    "death",
    "abandonment",
    "mutual_agreement",
    "other"
  ]),
  terminationCategory: mysqlEnum("terminationCategory", ["voluntary", "involuntary", "legal"]),
  terminationNotes: text("terminationNotes"),
  evidenceUrls: json("evidenceUrls").$type<string[]>(), // S3 URLs of uploaded evidence
  processedBy: int("processedBy").references(() => users.id), // User who processed the termination
  
  // Employment details at time of event
  departmentId: int("departmentId").references(() => departments.id),
  positionId: int("positionId").references(() => positions.id),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmployeeHistory = typeof employeeHistory.$inferSelect;
export type InsertEmployeeHistory = typeof employeeHistory.$inferInsert;

// Catálogo de formatos (para administración)
export const formatCatalog = mysqlTable('format_catalog', {
  id: int('id').primaryKey().autoincrement(),
  code: varchar('code', { length: 50 }).notNull().unique(), // Código del formato (ej: "FC", "AC", "ACG")
  name: varchar('name', { length: 255 }).notNull(), // Nombre del formato
  version: varchar('version', { length: 20 }).notNull(), // Versión del formato (ej: "1.0", "2.1")
  versionDate: date('version_date').notNull(), // Fecha de la versión
  reference: text('reference'), // Referencia legal o normativa
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// Documentos formales generados
export const documents = mysqlTable('documents', {
  id: int('id').primaryKey().autoincrement(),
  formatCatalogId: int('format_catalog_id').notNull().references(() => formatCatalog.id),
  folio: varchar('folio', { length: 100 }).notNull().unique(), // CÓDIGO+CONSECUTIVO/AÑO
  title: varchar('title', { length: 255 }).notNull(), // Título del documento
  type: varchar('type', { length: 50 }).notNull(), // 'funciones_comite', 'acta_constitutiva', 'aceptacion_cargo', 'acta_recorrido', 'bases_funcionamiento'
  status: varchar('status', { length: 20 }).notNull().default('draft'), // 'draft', 'final', 'archived'
  content: text('content'), // Contenido del documento en JSON (se parseará manualmente)
  pdfUrl: text('pdf_url'), // URL del PDF generado
  qrCode: varchar('qr_code', { length: 255 }).unique(), // Código QR único para validación
  createdBy: int('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
  finalizedAt: timestamp('finalized_at'), // Fecha de finalización
});

// Firmas digitales
export const signatures = mysqlTable('signatures', {
  id: int('id').primaryKey().autoincrement(),
  documentId: int('document_id').notNull().references(() => documents.id),
  userId: int('user_id').references(() => users.id), // Puede ser null para firmantes externos
  signerName: varchar('signer_name', { length: 255 }).notNull(), // Nombre del firmante
  signerRole: varchar('signer_role', { length: 100 }), // Rol o cargo del firmante
  signatureImageUrl: text('signature_image_url').notNull(), // URL de la imagen de la firma
  signedAt: timestamp('signed_at').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }), // IP desde donde se firmó
  deviceInfo: text('device_info'), // Información del dispositivo
  signatureHash: varchar('signature_hash', { length: 64 }), // SHA-256 hash de la firma para validación
  serverTimestamp: bigint('server_timestamp', { mode: 'number' }), // Unix timestamp del servidor (ms)
});

// Participantes en documentos (para actas de recorrido)
export const documentParticipants = mysqlTable('document_participants', {
  id: int('id').primaryKey().autoincrement(),
  documentId: int('document_id').notNull().references(() => documents.id),
  userId: int('user_id').references(() => users.id), // Puede ser null para participantes externos
  name: varchar('name', { length: 255 }).notNull(),
  curp: varchar('curp', { length: 18 }),
  ine: varchar('ine', { length: 20 }), // Número de INE
  role: varchar('role', { length: 100 }), // Rol en el recorrido (ej: "Inspector", "Testigo")
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Evidencias fotográficas de documentos
export const documentEvidence = mysqlTable('document_evidence', {
  id: int('id').primaryKey().autoincrement(),
  documentId: int('document_id').notNull().references(() => documents.id),
  imageUrl: text('image_url').notNull(),
  description: text('description'),
  uploadedAt: timestamp('uploaded_at').notNull().defaultNow(),
});


// Relations para formatCatalog
export const formatCatalogRelations = relations(formatCatalog, ({ many }) => ({
  documents: many(documents),
}));

// Relations para documents
export const documentsRelations = relations(documents, ({ one, many }) => ({
  formatCatalog: one(formatCatalog, {
    fields: [documents.formatCatalogId],
    references: [formatCatalog.id],
  }),
  createdBy: one(users, {
    fields: [documents.createdBy],
    references: [users.id],
  }),
  signatures: many(signatures),
  participants: many(documentParticipants),
  evidence: many(documentEvidence),
}));

// Relations para signatures
export const signaturesRelations = relations(signatures, ({ one }) => ({
  document: one(documents, {
    fields: [signatures.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [signatures.userId],
    references: [users.id],
  }),
}));

// Relations para documentParticipants
export const documentParticipantsRelations = relations(documentParticipants, ({ one }) => ({
  document: one(documents, {
    fields: [documentParticipants.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [documentParticipants.userId],
    references: [users.id],
  }),
}));

// Relations para documentEvidence
export const documentEvidenceRelations = relations(documentEvidence, ({ one }) => ({
  document: one(documents, {
    fields: [documentEvidence.documentId],
    references: [documents.id],
  }),
}));


// ============================================================================
// SISTEMA DE ENCUESTAS NOM-035 STPS 2018 (Guías I, II y III)
// ============================================================================

// Periodos de aplicación de encuestas
export const surveyPeriods = mysqlTable('survey_periods', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(), // Ej: "Evaluación Primer Semestre 2026"
  surveyType: mysqlEnum('survey_type', ['guia_i', 'guia_ii', 'guia_iii']).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: mysqlEnum('status', ['draft', 'active', 'closed', 'archived']).default('draft').notNull(),
  description: text('description'),
  createdBy: int('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// Encuestas (Guía I, II, III)
export const surveys = mysqlTable('surveys', {
  id: int('id').primaryKey().autoincrement(),
  type: mysqlEnum('type', ['guia_i', 'guia_ii', 'guia_iii']).notNull(), // Tipo de guía NOM-035
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: mysqlEnum('status', ['active', 'inactive', 'archived']).default('active').notNull(),
  startDate: date('start_date'), // Fecha de inicio de aplicación
  endDate: date('end_date'), // Fecha límite de aplicación
  targetDepartmentId: int('target_department_id'), // Departamento objetivo (null = todos)
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().onUpdateNow(),
});

// Preguntas de encuestas
export const surveyQuestions = mysqlTable('survey_questions', {
  id: int('id').primaryKey().autoincrement(),
  surveyId: int('survey_id').notNull().references(() => surveys.id),
  questionText: text('question_text').notNull(),
  questionType: mysqlEnum('question_type', ['multiple_choice', 'scale', 'yes_no', 'text']).notNull(),
  category: varchar('category', { length: 100 }), // Categoría NOM-035 (ej: "Ambiente de trabajo")
  domain: varchar('domain', { length: 100 }), // Dominio al que pertenece (ej: "Condiciones en el ambiente de trabajo")
  dimension: varchar('dimension', { length: 100 }), // Dimensión (ej: "Condiciones peligrosas e inseguras")
  order: int('order').notNull(), // Orden de la pregunta
  isReverseScored: boolean('is_reverse_scored').default(false).notNull(), // Si la calificación es inversa (Siempre=4, Nunca=0)
  options: text('options'), // Opciones en JSON para preguntas de opción múltiple
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Respuestas de encuestas (una por trabajador por encuesta)
export const surveyResponses = mysqlTable('survey_responses', {
  id: int('id').primaryKey().autoincrement(),
  surveyId: int('survey_id').notNull().references(() => surveys.id),
  periodId: int('period_id').references(() => surveyPeriods.id), // Periodo de aplicación
  userId: int('user_id').references(() => users.id), // Puede ser null si se responde con CURP
  curp: varchar('curp', { length: 18 }), // CURP capturado si no hay userId
  token: varchar('token', { length: 64 }).notNull().unique(), // Token único para la respuesta
  completedAt: timestamp('completed_at'), // Null si no ha completado
  startedAt: timestamp('started_at').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
  deviceInfo: text('device_info'),
  results: text('results'), // Resultados calculados en JSON
});

// Respuestas individuales a preguntas
export const surveyAnswers = mysqlTable('survey_answers', {
  id: int('id').primaryKey().autoincrement(),
  responseId: int('response_id').notNull().references(() => surveyResponses.id),
  questionId: int('question_id').notNull().references(() => surveyQuestions.id),
  answerValue: text('answer_value').notNull(), // Valor de la respuesta
  answeredAt: timestamp('answered_at').notNull().defaultNow(),
});

// Tokens de encuestas (para envío por correo/SMS/QR)
export const surveyTokens = mysqlTable('survey_tokens', {
  id: int('id').primaryKey().autoincrement(),
  periodId: int('period_id').notNull().references(() => surveyPeriods.id), // Periodo de aplicación
  userId: int('user_id').notNull().references(() => users.id),
  surveyId: int('survey_id').notNull().references(() => surveys.id),
  token: varchar('token', { length: 64 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(), // Fecha de expiración del token
  usedAt: timestamp('used_at'), // Null si no se ha usado
  sentVia: mysqlEnum('sent_via', ['email', 'sms', 'whatsapp', 'qr']), // Medio de envío
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Resultados calculados de encuestas NOM-035 (con nivel de riesgo)
export const surveyResults = mysqlTable('survey_results', {
  id: int('id').primaryKey().autoincrement(),
  responseId: int('response_id').notNull().unique().references(() => surveyResponses.id),
  userId: int('user_id').references(() => users.id),
  surveyId: int('survey_id').notNull().references(() => surveys.id),
  periodId: int('period_id').references(() => surveyPeriods.id),
  totalScore: int('total_score').notNull(),
  riskLevel: mysqlEnum('risk_level', ['low', 'medium', 'high', 'very_high']).notNull(),
  categoryScores: text('category_scores'),
  domainScores: text('domain_scores'),
  recommendations: text('recommendations'),
  calculatedAt: timestamp('calculated_at').notNull().defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Relations para surveys
export const surveysRelations = relations(surveys, ({ many }) => ({
  questions: many(surveyQuestions),
  responses: many(surveyResponses),
  tokens: many(surveyTokens),
}));

// Relations para surveyQuestions
export const surveyQuestionsRelations = relations(surveyQuestions, ({ one, many }) => ({
  survey: one(surveys, {
    fields: [surveyQuestions.surveyId],
    references: [surveys.id],
  }),
  answers: many(surveyAnswers),
}));

// Relations para surveyResponses
export const surveyResponsesRelations = relations(surveyResponses, ({ one, many }) => ({
  period: one(surveyPeriods, {
    fields: [surveyResponses.periodId],
    references: [surveyPeriods.id],
  }),
  survey: one(surveys, {
    fields: [surveyResponses.surveyId],
    references: [surveys.id],
  }),
  user: one(users, {
    fields: [surveyResponses.userId],
    references: [users.id],
  }),
  answers: many(surveyAnswers),
}));

// Relations para surveyAnswers
export const surveyAnswersRelations = relations(surveyAnswers, ({ one }) => ({
  response: one(surveyResponses, {
    fields: [surveyAnswers.responseId],
    references: [surveyResponses.id],
  }),
  question: one(surveyQuestions, {
    fields: [surveyAnswers.questionId],
    references: [surveyQuestions.id],
  }),
}));

// Relations para surveyPeriods
export const surveyPeriodsRelations = relations(surveyPeriods, ({ one, many }) => ({
  creator: one(users, {
    fields: [surveyPeriods.createdBy],
    references: [users.id],
  }),
  responses: many(surveyResponses),
  tokens: many(surveyTokens),
}));

// Relations para surveyTokens
export const surveyTokensRelations = relations(surveyTokens, ({ one }) => ({
  period: one(surveyPeriods, {
    fields: [surveyTokens.periodId],
    references: [surveyPeriods.id],
  }),
  user: one(users, {
    fields: [surveyTokens.userId],
    references: [users.id],
  }),
  survey: one(surveys, {
    fields: [surveyTokens.surveyId],
    references: [surveys.id],
  }),
}));


/**
 * Survey Notifications table - Email notifications for surveys
 */
export const surveyNotifications = mysqlTable("surveyNotifications", {
  id: int("id").autoincrement().primaryKey(),
  surveyId: int("surveyId").notNull(),
  userId: int("userId"),
  type: mysqlEnum("type", ["invitation", "reminder", "completion"]).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sentAt"),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  error: text("error"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SurveyNotification = typeof surveyNotifications.$inferSelect;
export type InsertSurveyNotification = typeof surveyNotifications.$inferInsert;

/**
 * Corrective Actions table - Actions taken based on survey results
 */
export const correctiveActions = mysqlTable("correctiveActions", {
  id: int("id").autoincrement().primaryKey(),
  surveyResponseId: int("surveyResponseId"),
  surveyPeriodId: int("surveyPeriodId"), // Periodo de encuesta al que pertenece
  riskLevel: mysqlEnum("riskLevel", ["nulo", "bajo", "medio", "alto", "muy_alto"]).notNull(),
  category: varchar("category", { length: 255 }),
  title: varchar("title", { length: 255 }), // Título de la acción
  description: text("description").notNull(),
  responsibleUserId: int("responsibleUserId"),
  departamento: varchar("departamento", { length: 255 }).notNull(),
  dueDate: date("dueDate"),
  priority: mysqlEnum("priority", ["low", "medium", "high"]).default("medium"), // Prioridad de la acción
  status: mysqlEnum("status", ["pendiente", "en_proceso", "completada", "cancelada"]).default("pendiente").notNull(),
  notes: text("notes"),
  observations: text("observations"), // Observaciones adicionales
  pdfUrl: varchar("pdfUrl", { length: 500 }), // URL del PDF generado
  
  // FASE 181: Acciones Correctivas en 3 Niveles
  actionLevel: mysqlEnum("actionLevel", ["organizacional", "grupal", "individual"]).notNull(), // Nivel de la acción
  targetScope: int("targetScope"), // null para organizacional, departmentId para grupal, employeeId para individual
  atsDetected: boolean("atsDetected").default(false), // Acontecimientos Traumáticos Severos detectados
  source_guide: mysqlEnum("source_guide", ["guia_i", "guia_ii", "guia_iii"]), // Guía de origen
  
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type CorrectiveAction = typeof correctiveActions.$inferSelect;
export type InsertCorrectiveAction = typeof correctiveActions.$inferInsert;

// Relations para surveyNotifications
export const surveyNotificationsRelations = relations(surveyNotifications, ({ one }) => ({
  survey: one(surveys, {
    fields: [surveyNotifications.surveyId],
    references: [surveys.id],
  }),
  user: one(users, {
    fields: [surveyNotifications.userId],
    references: [users.id],
  }),
}));

// Relations para correctiveActions
export const correctiveActionsRelations = relations(correctiveActions, ({ one }) => ({
  surveyResponse: one(surveyResponses, {
    fields: [correctiveActions.surveyResponseId],
    references: [surveyResponses.id],
  }),
  responsible: one(users, {
    fields: [correctiveActions.responsibleUserId],
    references: [users.id],
  }),
}));


/**
 * Employee Documents table - Digital file management for employees
 */
export const employeeDocuments = mysqlTable("employeeDocuments", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  documentType: mysqlEnum("documentType", [
    "ine", // Identificación oficial (INE/IFE)
    "curp_document", // Documento de CURP
    "rfc_document", // Constancia de RFC
    "nss_document", // Documento de NSS (IMSS)
    "birth_certificate", // Acta de nacimiento
    "proof_of_address", // Comprobante de domicilio
    "contract", // Contrato laboral
    "job_offer", // Carta oferta
    "resignation", // Renuncia
    "termination", // Finiquito
    "recommendation", // Carta de recomendación
    "diploma", // Título o diploma
    "certificate", // Certificado
    "medical_exam", // Examen médico
    "background_check", // Carta de antecedentes
    "other" // Otro documento
  ]).notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(), // URL en S3
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // Key en S3 para eliminación
  mimeType: varchar("mimeType", { length: 100 }).notNull(), // application/pdf, image/jpeg, etc.
  fileSize: int("fileSize").notNull(), // Tamaño en bytes
  
  // Control de vigencia
  expiresAt: date("expiresAt"), // Fecha de vencimiento (opcional)
  status: mysqlEnum("status", ["vigente", "por_vencer", "vencido"]).default("vigente").notNull(),
  
  // Auditoría
  uploadedBy: int("uploadedBy").notNull(), // FK to users
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
  notes: text("notes"), // Notas adicionales sobre el documento
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type InsertEmployeeDocument = typeof employeeDocuments.$inferInsert;

// Relations para employeeDocuments
export const employeeDocumentsRelations = relations(employeeDocuments, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeDocuments.employeeId],
    references: [employees.id],
  }),
  uploader: one(users, {
    fields: [employeeDocuments.uploadedBy],
    references: [users.id],
  }),
}));


/**
 * Job Profiles table - Position profiles with required competencies
 */
export const jobProfiles = mysqlTable("jobProfiles", {
  id: int("id").autoincrement().primaryKey(),
  positionId: int("positionId").notNull(), // FK to jobPositions
  competencyName: varchar("competencyName", { length: 255 }).notNull(),
  competencyType: mysqlEnum("competencyType", ["tecnica", "transversal", "conocimiento"]).notNull(),
  requiredLevel: mysqlEnum("requiredLevel", ["basico", "intermedio", "avanzado", "experto"]).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type JobProfile = typeof jobProfiles.$inferSelect;
export type InsertJobProfile = typeof jobProfiles.$inferInsert;

/**
 * Employee Competencies table - Employee's actual competencies
 */
export const employeeCompetencies = mysqlTable("employeeCompetencies", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  competencyName: varchar("competencyName", { length: 255 }).notNull(),
  competencyType: mysqlEnum("competencyType", ["tecnica", "transversal", "conocimiento"]).notNull(),
  currentLevel: mysqlEnum("currentLevel", ["basico", "intermedio", "avanzado", "experto"]).notNull(),
  certificationDate: date("certificationDate"),
  expirationDate: date("expirationDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmployeeCompetency = typeof employeeCompetencies.$inferSelect;
export type InsertEmployeeCompetency = typeof employeeCompetencies.$inferInsert;

/**
 * Training Needs (DNC) table - Automatically generated training needs
 */
export const trainingNeeds = mysqlTable("trainingNeeds", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(),
  competencyName: varchar("competencyName", { length: 255 }).notNull(),
  competencyType: mysqlEnum("competencyType", ["tecnica", "transversal", "conocimiento"]).notNull(),
  requiredLevel: mysqlEnum("requiredLevel", ["basico", "intermedio", "avanzado", "experto"]).notNull(),
  currentLevel: mysqlEnum("currentLevel", ["ninguno", "basico", "intermedio", "avanzado", "experto"]).notNull(),
  gap: int("gap").notNull(), // Numeric gap (1-4)
  priority: mysqlEnum("priority", ["baja", "media", "alta", "critica"]).notNull(),
  status: mysqlEnum("status", ["pendiente", "en_proceso", "completada", "cancelada"]).default("pendiente").notNull(),
  recommendedCourseId: int("recommendedCourseId"), // FK to courses
  dueDate: date("dueDate"),
  completedDate: date("completedDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TrainingNeed = typeof trainingNeeds.$inferSelect;
export type InsertTrainingNeed = typeof trainingNeeds.$inferInsert;

/**
 * Organizational Competencies table - Transversal competencies required across the organization
 * Includes soft skills (habilidades blandas) and organizational-wide competencies
 */
export const organizationalCompetencies = mysqlTable("organizationalCompetencies", {
  id: int("id").autoincrement().primaryKey(),
  competencyName: varchar("competencyName", { length: 255 }).notNull(),
  competencyCategory: mysqlEnum("competencyCategory", [
    "soft_skill", // Habilidades blandas (comunicación, liderazgo, trabajo en equipo)
    "organizational", // Competencias organizacionales transversales
    "leadership", // Competencias de liderazgo
    "technical_transversal" // Competencias técnicas transversales
  ]).notNull(),
  description: text("description"),
  requiredLevel: mysqlEnum("requiredLevel", ["basico", "intermedio", "avanzado", "experto"]).notNull(),
  appliesToDepartments: text("appliesToDepartments"), // JSON array of department names, null = all departments
  appliesToRoles: text("appliesToRoles"), // JSON array of role types, null = all roles
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrganizationalCompetency = typeof organizationalCompetencies.$inferSelect;
export type InsertOrganizationalCompetency = typeof organizationalCompetencies.$inferInsert;

// Relations para jobProfiles
export const jobProfilesRelations = relations(jobProfiles, ({ one }) => ({
  position: one(jobPositions, {
    fields: [jobProfiles.positionId],
    references: [jobPositions.id],
  }),
}));

// Relations para employeeCompetencies
export const employeeCompetenciesRelations = relations(employeeCompetencies, ({ one }) => ({
  employee: one(employees, {
    fields: [employeeCompetencies.employeeId],
    references: [employees.id],
  }),
}));

// Relations para trainingNeeds
export const trainingNeedsRelations = relations(trainingNeeds, ({ one }) => ({
  employee: one(employees, {
    fields: [trainingNeeds.employeeId],
    references: [employees.id],
  }),
  recommendedCourse: one(courses, {
    fields: [trainingNeeds.recommendedCourseId],
    references: [courses.id],
  }),
}));

/**
 * System Settings table - Global configuration
 */
export const systemSettings = mysqlTable("systemSettings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 100 }).notNull().unique(),
  settingValue: text("settingValue"),
  description: text("description"),
  updatedBy: int("updatedBy"), // FK to users
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = typeof systemSettings.$inferInsert;

/**
 * Skills Matrix tables - Organizational competency matrix
 */

// Competencies catalog
export const competencies = mysqlTable("competencies", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  type: varchar("type", { length: 50 }).notNull(), // Técnica, Blanda, Específica
  category: varchar("category", { length: 100 }), // Categoría adicional
  createdBy: int("createdBy").notNull(), // FK to users
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Competency = typeof competencies.$inferSelect;
export type InsertCompetency = typeof competencies.$inferInsert;

// Skills Matrix - Employee competency levels
export const skillsMatrix = mysqlTable("skillsMatrix", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employeeId").notNull(), // FK to employees
  competencyId: int("competencyId").notNull(), // FK to competencies
  level: varchar("level", { length: 50 }).notNull(), // Sin evaluar, Básico, Intermedio, Avanzado, Experto
  evaluatedBy: int("evaluatedBy"), // FK to users
  evaluationDate: timestamp("evaluationDate"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SkillsMatrixEntry = typeof skillsMatrix.$inferSelect;
export type InsertSkillsMatrixEntry = typeof skillsMatrix.$inferInsert;

// Skills Matrix Import History
export const skillsMatrixImports = mysqlTable("skillsMatrixImports", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  importedBy: int("importedBy").notNull(), // FK to users
  recordsImported: int("recordsImported").notNull(),
  recordsFailed: int("recordsFailed").notNull(),
  status: varchar("status", { length: 50 }).notNull(), // success, partial, failed
  errorLog: text("errorLog"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SkillsMatrixImport = typeof skillsMatrixImports.$inferSelect;
export type InsertSkillsMatrixImport = typeof skillsMatrixImports.$inferInsert;

// Relations para skillsMatrix
export const skillsMatrixRelations = relations(skillsMatrix, ({ one }) => ({
  employee: one(employees, {
    fields: [skillsMatrix.employeeId],
    references: [employees.id],
  }),
  competency: one(competencies, {
    fields: [skillsMatrix.competencyId],
    references: [competencies.id],
  }),
}));


// Meeting Minutes - Minutas de Reunión (NOM-151)
export const meetingMinutes = mysqlTable("meetingMinutes", {
  id: int("id").autoincrement().primaryKey(),
  folio: varchar("folio", { length: 50 }).notNull().unique(), // Foliado automático
  title: varchar("title", { length: 255 }).notNull(),
  meetingDate: timestamp("meetingDate").notNull(),
  meetingType: varchar("meetingType", { length: 100 }).notNull(), // Ordinaria, Extraordinaria, Comité, etc.
  location: varchar("location", { length: 255 }),
  agenda: text("agenda").notNull(),
  agreements: text("agreements"), // Acuerdos tomados
  observations: text("observations"),
  qrCode: text("qrCode"), // Código QR único (NOM-151)
  qrCodeUrl: varchar("qrCodeUrl", { length: 500 }), // URL del código QR en S3
  status: varchar("status", { length: 50 }).notNull().default("draft"), // draft, finalized, signed
  createdBy: int("createdBy").notNull(), // FK to users
  finalizedAt: timestamp("finalizedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MeetingMinute = typeof meetingMinutes.$inferSelect;
export type InsertMeetingMinute = typeof meetingMinutes.$inferInsert;

// Meeting Participants - Participantes de la reunión
export const meetingParticipants = mysqlTable("meetingParticipants", {
  id: int("id").autoincrement().primaryKey(),
  meetingMinuteId: int("meetingMinuteId").notNull(), // FK to meetingMinutes
  employeeId: int("employeeId"), // FK to employees (opcional si es externo)
  name: varchar("name", { length: 255 }).notNull(), // Nombre completo
  curp: varchar("curp", { length: 18 }), // CURP del participante
  ineNumber: varchar("ineNumber", { length: 20 }), // Número de INE
  role: varchar("role", { length: 100 }), // Rol en la reunión (Presidente, Secretario, Vocal, etc.)
  signature: text("signature"), // Firma digital (base64)
  signedAt: timestamp("signedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MeetingParticipant = typeof meetingParticipants.$inferSelect;
export type InsertMeetingParticipant = typeof meetingParticipants.$inferInsert;

// Meeting Attachments - Evidencia fotográfica y documentos
export const meetingAttachments = mysqlTable("meetingAttachments", {
  id: int("id").autoincrement().primaryKey(),
  meetingMinuteId: int("meetingMinuteId").notNull(), // FK to meetingMinutes
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: varchar("fileUrl", { length: 500 }).notNull(), // URL en S3
  fileType: varchar("fileType", { length: 50 }).notNull(), // photo, document, other
  fileSize: int("fileSize"), // Tamaño en bytes
  uploadedBy: int("uploadedBy").notNull(), // FK to users
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MeetingAttachment = typeof meetingAttachments.$inferSelect;
export type InsertMeetingAttachment = typeof meetingAttachments.$inferInsert;

// Relations para meetingMinutes
export const meetingMinutesRelations = relations(meetingMinutes, ({ many }) => ({
  participants: many(meetingParticipants),
  attachments: many(meetingAttachments),
}));

export const meetingParticipantsRelations = relations(meetingParticipants, ({ one }) => ({
  meetingMinute: one(meetingMinutes, {
    fields: [meetingParticipants.meetingMinuteId],
    references: [meetingMinutes.id],
  }),
  employee: one(employees, {
    fields: [meetingParticipants.employeeId],
    references: [employees.id],
  }),
}));

export const meetingAttachmentsRelations = relations(meetingAttachments, ({ one }) => ({
  meetingMinute: one(meetingMinutes, {
    fields: [meetingAttachments.meetingMinuteId],
    references: [meetingMinutes.id],
  }),
}));


// Alert Logs - Registro de alertas automáticas enviadas
export const alertLogs = mysqlTable("alertLogs", {
  id: int("id").autoincrement().primaryKey(),
  alertType: varchar("alertType", { length: 50 }).notNull(), // 'low_coverage', 'worker_pending'
  surveyId: int("surveyId").notNull(), // FK to surveys
  triggeredAt: timestamp("triggeredAt").defaultNow().notNull(),
  details: text("details"), // JSON con detalles de la alerta
  notificationSent: boolean("notificationSent").default(false).notNull(),
  notificationError: text("notificationError"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AlertLog = typeof alertLogs.$inferSelect;
export type InsertAlertLog = typeof alertLogs.$inferInsert;


// Compliance Checklist - Items de verificación NOM-035
export const complianceChecklist = mysqlTable("complianceChecklist", {
  id: int("id").autoincrement().primaryKey(),
  section: varchar("section", { length: 10 }).notNull(), // A, B, C, D, E, F, G
  sectionName: varchar("sectionName", { length: 200 }).notNull(),
  itemCode: varchar("itemCode", { length: 10 }).notNull(), // A1, B1, etc.
  requirement: text("requirement").notNull(),
  evidence: text("evidence").notNull(), // Descripción de evidencia en sistema
  fundament: varchar("fundament", { length: 100 }), // Fundamento legal (numeral NOM-035)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ComplianceChecklistItem = typeof complianceChecklist.$inferSelect;
export type InsertComplianceChecklistItem = typeof complianceChecklist.$inferInsert;

// Compliance Checks - Registros de verificación
export const complianceChecks = mysqlTable("complianceChecks", {
  id: int("id").autoincrement().primaryKey(),
  checklistItemId: int("checklistItemId").notNull(), // FK to complianceChecklist
  isCompliant: boolean("isCompliant").default(false).notNull(),
  verifiedBy: int("verifiedBy"), // FK to users
  verifiedAt: timestamp("verifiedAt"),
  dueDate: timestamp("dueDate"), // Fecha de vencimiento para recordatorios
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ComplianceCheck = typeof complianceChecks.$inferSelect;
export type InsertComplianceCheck = typeof complianceChecks.$inferInsert;

// Compliance Evidence - Evidencias asociadas
export const complianceEvidence = mysqlTable("complianceEvidence", {
  id: int("id").autoincrement().primaryKey(),
  checkId: int("checkId").notNull(), // FK to complianceChecks
  evidenceType: varchar("evidenceType", { length: 50 }).notNull(), // document, screenshot, report, export
  evidenceUrl: varchar("evidenceUrl", { length: 500 }), // URL en S3
  description: text("description"),
  uploadedBy: int("uploadedBy").notNull(), // FK to users
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ComplianceEvidenceItem = typeof complianceEvidence.$inferSelect;
export type InsertComplianceEvidenceItem = typeof complianceEvidence.$inferInsert;


/**
 * ============================================================================
 * MÓDULOS DE EMPRESA - NOM-035-STPS-2018 Capítulo 5
 * ============================================================================
 */

/**
 * Datos generales de la empresa (NOM-035 Cap. 5.1)
 * Información básica del centro de trabajo
 */
export const companyGeneralData = mysqlTable("company_general_data", {
  id: int("id").autoincrement().primaryKey(),
  razonSocial: varchar("razon_social", { length: 255 }).notNull(),
  rfc: varchar("rfc", { length: 13 }).notNull().unique(),
  direccionFiscal: text("direccion_fiscal").notNull(),
  giro: varchar("giro", { length: 255 }),
  actividadesPreponderantes: text("actividades_preponderantes"),
  numeroTrabajadores: int("numero_trabajadores"),
  representanteLegal: varchar("representante_legal", { length: 255 }),
  telefonoContacto: varchar("telefono_contacto", { length: 15 }),
  emailContacto: varchar("email_contacto", { length: 320 }),
  paginaWeb: varchar("pagina_web", { length: 255 }),
  notificationEmail: varchar("notification_email", { length: 320 }),
  noreplyEmail: varchar("noreply_email", { length: 320 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CompanyGeneralData = typeof companyGeneralData.$inferSelect;
export type InsertCompanyGeneralData = typeof companyGeneralData.$inferInsert;

/**
 * Logo de la empresa
 * Almacena el logo corporativo para uso en reportes y documentos
 */
export const companyLogo = mysqlTable("company_logo", {
  id: int("id").autoincrement().primaryKey(),
  logoUrl: varchar("logo_url", { length: 512 }).notNull(),
  logoKey: varchar("logo_key", { length: 512 }).notNull(), // S3 key
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: int("file_size"), // bytes
  uploadedBy: int("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CompanyLogo = typeof companyLogo.$inferSelect;
export type InsertCompanyLogo = typeof companyLogo.$inferInsert;

/**
 * Representante legal de la empresa
 * Persona autorizada para firmar documentos oficiales
 */
export const companyLegalRepresentative = mysqlTable("company_legal_representative", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  telefono: varchar("telefono", { length: 15 }),
  rfc: varchar("rfc", { length: 13 }),
  curp: varchar("curp", { length: 18 }),
  domicilio: text("domicilio"),
  actaConstitutiva: varchar("acta_constitutiva", { length: 100 }),
  poderNotarial: varchar("poder_notarial", { length: 100 }),
  firmaUrl: varchar("firma_url", { length: 512 }), // URL de firma digitalizada
  firmaKey: varchar("firma_key", { length: 512 }), // S3 key
  certificadoUrl: varchar("certificado_url", { length: 512 }), // Certificado NOM-151
  certificadoKey: varchar("certificado_key", { length: 512 }),
  vigenciaInicio: date("vigencia_inicio"),
  vigenciaFin: date("vigencia_fin"),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CompanyLegalRepresentative = typeof companyLegalRepresentative.$inferSelect;
export type InsertCompanyLegalRepresentative = typeof companyLegalRepresentative.$inferInsert;

/**
 * Catálogo de firmas digitales
 * Registro de personas autorizadas para firmar documentos (NOM-151)
 */
export const companyDigitalSignature = mysqlTable("company_digital_signature", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id), // Puede ser null si es firmante externo
  nombreFirmante: varchar("nombre_firmante", { length: 255 }).notNull(),
  cargo: varchar("cargo", { length: 255 }).notNull(),
  departamento: varchar("departamento", { length: 255 }).notNull(),
  firmaUrl: varchar("firma_url", { length: 512 }).notNull(), // Firma digitalizada
  firmaKey: varchar("firma_key", { length: 512 }).notNull(),
  certificadoUrl: varchar("certificado_url", { length: 512 }), // Certificado NOM-151
  certificadoKey: varchar("certificado_key", { length: 512 }),
  tipoFirmante: mysqlEnum("tipo_firmante", ["interno", "externo"]).default("interno").notNull(),
  autorizadoPor: int("autorizado_por").references(() => users.id), // Admin que autorizó
  estadoAutorizacion: mysqlEnum("estado_autorizacion", ["pendiente", "autorizado", "rechazado"]).default("pendiente").notNull(),
  fechaAutorizacion: timestamp("fecha_autorizacion"),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CompanyDigitalSignature = typeof companyDigitalSignature.$inferSelect;
export type InsertCompanyDigitalSignature = typeof companyDigitalSignature.$inferInsert;

/**
 * Datos del reporte de la encuesta NOM-035
 * Información sobre la aplicación de encuestas (Cap. 5.2-5.7)
 */
export const companySurveyReport = mysqlTable("company_survey_report", {
  id: int("id").autoincrement().primaryKey(),
  periodoAplicacion: varchar("periodo_aplicacion", { length: 100 }).notNull(), // Ej: "2024-Q1"
  fechaInicio: date("fecha_inicio").notNull(),
  fechaFin: date("fecha_fin").notNull(),
  guiaAplicada: mysqlEnum("guia_aplicada", ["guia-i", "guia-ii", "guia-iii"]).notNull(),
  tamañoMuestra: int("tamaño_muestra").notNull(),
  cobertura: decimal("cobertura", { precision: 5, scale: 2 }), // Porcentaje
  numeroTrabajadoresTotal: int("numero_trabajadores_total").notNull(),
  numeroTrabajadoresEncuestados: int("numero_trabajadores_encuestados").notNull(),
  metodologiaAplicacion: text("metodologia_aplicacion"),
  observaciones: text("observaciones"),
  responsableAplicacion: varchar("responsable_aplicacion", { length: 255 }),
  // Campos del informe NOM-035 (Numeral 7.5)
  // a) Datos del centro de trabajo
  nombreCentroTrabajo: varchar("nombre_centro_trabajo", { length: 255 }),
  domicilioCentroTrabajo: text("domicilio_centro_trabajo"),
  actividadPrincipal: text("actividad_principal"),
  // b) Objetivo
  objetivoInforme: text("objetivo_informe"),
  // c) Principales actividades realizadas
  actividadesRealizadas: text("actividades_realizadas"),
  // d) Método utilizado
  metodoUtilizado: text("metodo_utilizado"),
  // e) Resultados obtenidos
  resultadosObtenidos: text("resultados_obtenidos"),
  nivelRiesgoGeneral: mysqlEnum("nivel_riesgo_general", ["bajo", "medio", "alto", "muy_alto"]),
  // f) Conclusiones
  conclusiones: text("conclusiones"),
  // g) Recomendaciones y acciones de intervención
  recomendaciones: text("recomendaciones"),
  accionesIntervencion: text("acciones_intervencion"),
  // h) Datos del responsable de la evaluación
  nombreResponsableEvaluacion: varchar("nombre_responsable_evaluacion", { length: 255 }),
  cedulaProfesional: varchar("cedula_profesional", { length: 20 }),
  reporteUrl: varchar("reporte_url", { length: 512 }), // PDF del reporte
  reporteKey: varchar("reporte_key", { length: 512 }),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CompanySurveyReport = typeof companySurveyReport.$inferSelect;
export type InsertCompanySurveyReport = typeof companySurveyReport.$inferInsert;


/**
 * ============================================================================
 * MÓDULOS DE IGUALDAD LABORAL Y NO DISCRIMINACIÓN NMX-025-SCFI-2015
 * ============================================================================
 */

/**
 * Política de Igualdad Laboral y No Discriminación
 * Requisito 4.1.1 de NMX-025-SCFI-2015
 */
export const equalityPolicy = mysqlTable("equality_policy", {
  id: int("id").autoincrement().primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  descripcion: text("descripcion").notNull(),
  fechaAprobacion: date("fecha_aprobacion").notNull(),
  fechaVigencia: date("fecha_vigencia"),
  documentoUrl: varchar("documento_url", { length: 512 }),
  documentoKey: varchar("documento_key", { length: 512 }),
  aprobadoPor: int("aprobado_por").references(() => users.id),
  estado: mysqlEnum("estado", ["borrador", "vigente", "archivado"]).default("borrador").notNull(),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type EqualityPolicy = typeof equalityPolicy.$inferSelect;
export type InsertEqualityPolicy = typeof equalityPolicy.$inferInsert;

/**
 * Indicadores de Brecha Salarial
 * Requisito 4.2.1 de NMX-025-SCFI-2015
 */
export const equalitySalaryGap = mysqlTable("equality_salary_gap", {
  id: int("id").autoincrement().primaryKey(),
  periodo: varchar("periodo", { length: 100 }).notNull(), // Ej: "2024-Q1"
  fechaCalculo: date("fecha_calculo").notNull(),
  departamento: varchar("departamento", { length: 255 }).notNull(),
  puesto: varchar("puesto", { length: 255 }),
  // Datos agregados por género
  totalMujeres: int("total_mujeres").notNull(),
  totalHombres: int("total_hombres").notNull(),
  salarioPromedioMujeres: decimal("salario_promedio_mujeres", { precision: 10, scale: 2 }).notNull(),
  salarioPromedioHombres: decimal("salario_promedio_hombres", { precision: 10, scale: 2 }).notNull(),
  brechaPorcentual: decimal("brecha_porcentual", { precision: 5, scale: 2 }).notNull(), // %
  // Análisis
  nivelRiesgo: mysqlEnum("nivel_riesgo", ["bajo", "medio", "alto"]).default("bajo").notNull(),
  observaciones: text("observaciones"),
  accionesRecomendadas: text("acciones_recomendadas"),
  calculadoPor: int("calculado_por").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type EqualitySalaryGap = typeof equalitySalaryGap.$inferSelect;
export type InsertEqualitySalaryGap = typeof equalitySalaryGap.$inferInsert;

/**
 * Acciones Afirmativas
 * Requisito 4.3.1 de NMX-025-SCFI-2015
 */
export const equalityAffirmativeActions = mysqlTable("equality_affirmative_actions", {
  id: int("id").autoincrement().primaryKey(),
  titulo: varchar("titulo", { length: 255 }).notNull(),
  tipo: mysqlEnum("tipo", [
    "capacitacion",
    "promocion",
    "contratacion",
    "conciliacion",
    "infraestructura",
    "otro"
  ]).notNull(),
  descripcion: text("descripcion").notNull(),
  objetivo: text("objetivo").notNull(),
  fechaInicio: date("fecha_inicio").notNull(),
  fechaFin: date("fecha_fin"),
  responsable: varchar("responsable", { length: 255 }).notNull(),
  departamento: varchar("departamento", { length: 255 }).notNull(),
  presupuesto: decimal("presupuesto", { precision: 10, scale: 2 }),
  estado: mysqlEnum("estado", ["planeada", "en_progreso", "completada", "cancelada"]).default("planeada").notNull(),
  resultadosEsperados: text("resultados_esperados"),
  resultadosObtenidos: text("resultados_obtenidos"),
  evidenciaUrl: varchar("evidencia_url", { length: 512 }),
  evidenciaKey: varchar("evidencia_key", { length: 512 }),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type EqualityAffirmativeAction = typeof equalityAffirmativeActions.$inferSelect;
export type InsertEqualityAffirmativeAction = typeof equalityAffirmativeActions.$inferInsert;

/**
 * Quejas y Denuncias de Discriminación
 * Requisito 4.4.1 de NMX-025-SCFI-2015
 */
export const equalityComplaints = mysqlTable("equality_complaints", {
  id: int("id").autoincrement().primaryKey(),
  folio: varchar("folio", { length: 50 }).notNull().unique(),
  tipo: mysqlEnum("tipo", [
    "discriminacion_genero",
    "acoso_laboral",
    "acoso_sexual",
    "discriminacion_edad",
    "discriminacion_discapacidad",
    "otro"
  ]).notNull(),
  descripcion: text("descripcion").notNull(),
  fechaIncidente: date("fecha_incidente"),
  // Confidencialidad
  denuncianteNombre: varchar("denunciante_nombre", { length: 255 }), // Opcional para denuncias anónimas
  denuncianteEmail: varchar("denunciante_email", { length: 255 }),
  denuncianteTelefono: varchar("denunciante_telefono", { length: 20 }),
  esAnonima: boolean("es_anonima").default(false).notNull(),
  // Seguimiento
  estado: mysqlEnum("estado", [
    "recibida",
    "en_investigacion",
    "resuelta",
    "cerrada",
    "desestimada"
  ]).default("recibida").notNull(),
  prioridad: mysqlEnum("prioridad", ["baja", "media", "alta", "urgente"]).default("media").notNull(),
  investigadorAsignado: int("investigador_asignado").references(() => users.id),
  fechaAsignacion: date("fecha_asignacion"),
  fechaResolucion: date("fecha_resolucion"),
  resolucion: text("resolucion"),
  accionesCorrectivas: text("acciones_correctivas"),
  // Evidencia
  evidenciaUrl: varchar("evidencia_url", { length: 512 }),
  evidenciaKey: varchar("evidencia_key", { length: 512 }),
  observaciones: text("observaciones"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type EqualityComplaint = typeof equalityComplaints.$inferSelect;
export type InsertEqualityComplaint = typeof equalityComplaints.$inferInsert;

/**
 * Comité de Igualdad Laboral y No Discriminación
 * Requisito 4.1.2 de NMX-025-SCFI-2015
 */
export const equalityCommittee = mysqlTable("equality_committee", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id).notNull(),
  cargo: mysqlEnum("cargo", [
    "presidente",
    "secretario",
    "vocal",
    "asesor"
  ]).notNull(),
  fechaDesignacion: date("fecha_designacion").notNull(),
  fechaTermino: date("fecha_termino"),
  activo: boolean("activo").default(true).notNull(),
  observaciones: text("observaciones"),
  designadoPor: int("designado_por").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type EqualityCommitteeMember = typeof equalityCommittee.$inferSelect;
export type InsertEqualityCommitteeMember = typeof equalityCommittee.$inferInsert;

/**
 * NOM-035 Policies table
 * Stores organizational policies for psychosocial risk prevention
 */
export const nom035Policies = mysqlTable("nom035_policies", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion").notNull(),
  fechaPublicacion: date("fecha_publicacion").notNull(),
  representanteLegalId: int("representante_legal_id").references(() => companyLegalRepresentative.id),
  pdfUrl: text("pdf_url"),
  activo: boolean("activo").default(true).notNull(),
  createdBy: int("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Nom035Policy = typeof nom035Policies.$inferSelect;
export type InsertNom035Policy = typeof nom035Policies.$inferInsert;

/**
 * NOM-035 Policy Versions table
 * Stores version history of policies for audit trail
 */
export const nom035PolicyVersions = mysqlTable("nom035_policy_versions", {
  id: int("id").autoincrement().primaryKey(),
  policyId: int("policy_id").references(() => nom035Policies.id, { onDelete: 'cascade' }).notNull(),
  versionNumber: int("version_number").notNull(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion").notNull(),
  fechaPublicacion: date("fecha_publicacion").notNull(),
  representanteLegalId: int("representante_legal_id").references(() => companyLegalRepresentative.id),
  pdfUrl: text("pdf_url"),
  uploadedFileName: varchar("uploaded_file_name", { length: 255 }),
  fileSize: int("file_size"),
  changeDescription: text("change_description"),
  createdBy: int("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Nom035PolicyVersion = typeof nom035PolicyVersions.$inferSelect;
export type InsertNom035PolicyVersion = typeof nom035PolicyVersions.$inferInsert;

/**
 * NOM-035 Evidence Folder table
 * Centralized repository for all NOM-035 compliance documentation
 */
export const nom035EvidenceFolder = mysqlTable("nom035_evidence_folder", {
  id: int("id").autoincrement().primaryKey(),
  category: mysqlEnum("category", [
    "policies",
    "preventive_actions",
    "corrective_actions",
    "organizational_environment",
    "training_program",
    "surveys",
    "cases",
    "minutes",
    "certificates",
    "position_acceptance",
    "photographic_evidence"
  ]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  documentType: varchar("document_type", { length: 100 }), // PDF, DOCX, XLSX, JPG, etc.
  sourceModule: varchar("source_module", { length: 100 }), // Module that generated this evidence
  sourceId: int("source_id"), // ID of the source record
  fileUrl: text("file_url").notNull(),
  fileKey: varchar("file_key", { length: 500 }).notNull(),
  fileSize: int("file_size"), // File size in bytes
  generatedDate: date("generated_date").notNull(),
  uploadedBy: int("uploaded_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Nom035Evidence = typeof nom035EvidenceFolder.$inferSelect;
export type InsertNom035Evidence = typeof nom035EvidenceFolder.$inferInsert;

/**
 * Committee Position Acceptances table
 * Stores formal acceptance documents for committee members with INE photo and signature
 */
export const committeePositionAcceptances = mysqlTable("committee_position_acceptances", {
  id: int("id").autoincrement().primaryKey(),
  committeeMemberId: int("committee_member_id").references(() => committeeMembers.id).notNull(),
  positionType: mysqlEnum("position_type", ["president", "secretary", "vocal", "alternate", "advisor"]).notNull(),
  inePhotoUrl: text("ine_photo_url"),
  inePhotoKey: varchar("ine_photo_key", { length: 500 }),
  acceptanceDate: date("acceptance_date").notNull(),
  signatureUrl: text("signature_url"),
  signatureKey: varchar("signature_key", { length: 500 }),
  pdfUrl: text("pdf_url"),
  pdfKey: varchar("pdf_key", { length: 500 }),
  responsibilities: text("responsibilities"),
  status: mysqlEnum("status", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CommitteePositionAcceptance = typeof committeePositionAcceptances.$inferSelect;
export type InsertCommitteePositionAcceptance = typeof committeePositionAcceptances.$inferInsert;

/**
 * NOM-035 Cases table
 * Stores individual cases of psychosocial risk identified through surveys
 */
export const nom035Cases = mysqlTable("nom035_cases", {
  id: int("id").autoincrement().primaryKey(),
  folio: varchar("folio", { length: 50 }).notNull().unique(),
  employeeId: int("employee_id").references(() => employees.id).notNull(),
  surveyResponseId: int("survey_response_id"),
  riskLevel: mysqlEnum("risk_level", ["nulo", "bajo", "medio", "alto", "muy_alto"]).notNull(),
  riskCategory: varchar("risk_category", { length: 255 }), // Category of psychosocial risk
  description: text("description").notNull(),
  identifiedDate: date("identified_date").notNull(),
  deadline: date("deadline").notNull(), // Fecha límite para atención
  status: mysqlEnum("status", ["open", "in_progress", "closed"]).default("open").notNull(),
  assignedTo: int("assigned_to").references(() => users.id), // Responsible for follow-up
  interventionPlan: text("intervention_plan"), // Plan de intervención
  followUpNotes: text("follow_up_notes"), // Notas de seguimiento
  closedAt: timestamp("closed_at"),
  closedBy: int("closed_by").references(() => users.id),
  createdBy: int("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Nom035Case = typeof nom035Cases.$inferSelect;
export type InsertNom035Case = typeof nom035Cases.$inferInsert;


// Investigation Questionnaires (Mobbing & Burnout)
export const investigationQuestionnaires = mysqlTable("investigation_questionnaires", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("case_id").references(() => nom035Cases.id).notNull(),
  questionnaireType: mysqlEnum("questionnaire_type", ["mobbing", "burnout"]).notNull(),
  employeeId: int("employee_id").references(() => employees.id).notNull(),
  accessToken: varchar("access_token", { length: 255 }).notNull().unique(), // Token único para acceso en línea
  responses: json("responses").$type<Record<string, any>>(), // Respuestas en formato JSON
  score: decimal("score", { precision: 5, scale: 2 }), // Puntaje calculado
  riskLevel: mysqlEnum("risk_level", ["bajo", "medio", "alto", "muy_alto"]), // Nivel de riesgo calculado
  status: mysqlEnum("status", ["sent", "completed", "expired"]).default("sent").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  expiresAt: timestamp("expires_at").notNull(), // Fecha de expiración del token (30 días)
  createdBy: int("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type InvestigationQuestionnaire = typeof investigationQuestionnaires.$inferSelect;
export type InsertInvestigationQuestionnaire = typeof investigationQuestionnaires.$inferInsert;


// Workplace Violence Protocol - Protocolo de Violencia Laboral
export const workplaceViolenceCases = mysqlTable("workplace_violence_cases", {
  id: int("id").autoincrement().primaryKey(),
  folio: varchar("folio", { length: 50 }).notNull().unique(), // Folio único del caso
  complainantId: int("complainant_id").references(() => employees.id), // Denunciante (puede ser anónimo)
  complainantName: varchar("complainant_name", { length: 255 }), // Nombre si es anónimo
  accusedId: int("accused_id").references(() => employees.id).notNull(), // Persona acusada
  complaintDate: date("complaint_date").notNull(), // Fecha de recepción de la queja
  incidentDate: date("incident_date"), // Fecha del incidente
  description: text("description").notNull(), // Descripción detallada de los hechos
  evidenceFiles: json("evidence_files").$type<string[]>(), // URLs de archivos de evidencia
  witnesses: json("witnesses").$type<Array<{ name: string; contact: string }>>(), // Testigos
  currentPhase: mysqlEnum("current_phase", [
    "recepcion", // Recepción de la queja
    "evaluacion_inicial", // Evaluación inicial
    "medidas_cautelares", // Medidas cautelares
    "investigacion", // Investigación formal
    "resolucion", // Resolución y dictamen
    "seguimiento", // Seguimiento post-resolución
    "cerrado" // Caso cerrado
  ]).default("recepcion").notNull(),
  priority: mysqlEnum("priority", ["baja", "media", "alta", "critica"]).default("media").notNull(),
  status: mysqlEnum("status", ["activo", "suspendido", "cerrado"]).default("activo").notNull(),
  resolution: text("resolution"), // Resolución final del caso
  resolutionDate: date("resolution_date"), // Fecha de resolución
  assignedToId: int("assigned_to_id").references(() => users.id), // Responsable asignado
  createdBy: int("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type WorkplaceViolenceCase = typeof workplaceViolenceCases.$inferSelect;
export type InsertWorkplaceViolenceCase = typeof workplaceViolenceCases.$inferInsert;

// Protocol Steps - Seguimiento de fases del protocolo
export const protocolSteps = mysqlTable("protocol_steps", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("case_id").references(() => workplaceViolenceCases.id).notNull(),
  phase: mysqlEnum("phase", [
    "recepcion",
    "evaluacion_inicial",
    "medidas_cautelares",
    "investigacion",
    "resolucion",
    "seguimiento",
    "cerrado"
  ]).notNull(),
  action: text("action").notNull(), // Acción realizada en esta fase
  responsibleId: int("responsible_id").references(() => users.id).notNull(), // Responsable de la acción
  actionDate: timestamp("action_date").defaultNow().notNull(), // Fecha de la acción
  notes: text("notes"), // Notas adicionales
  attachments: json("attachments").$type<string[]>(), // Archivos adjuntos (URLs)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProtocolStep = typeof protocolSteps.$inferSelect;
export type InsertProtocolStep = typeof protocolSteps.$inferInsert;

// Committee Training Programs - Programas de capacitación del comité
export const committeeTrainingPrograms = mysqlTable("committee_programs", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(), // Título del programa
  description: text("description"), // Descripción del programa
  type: mysqlEnum("type", ["protocolo_violencia", "factores_riesgo", "medidas_prevencion", "otro"]).notNull(), // Tipo de capacitación
  duration: int("duration").notNull(), // Duración en horas
  instructor: varchar("instructor", { length: 255 }), // Nombre del instructor
  status: mysqlEnum("status", ["activo", "completado", "cancelado"]).default("activo").notNull(),
  createdBy: int("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CommitteeTrainingProgram = typeof committeeTrainingPrograms.$inferSelect;
export type InsertCommitteeTrainingProgram = typeof committeeTrainingPrograms.$inferInsert;

// Committee Training Sessions - Sesiones de capacitación del comité
export const committeeTrainingSessions = mysqlTable("committee_sessions", {
  id: int("id").autoincrement().primaryKey(),
  programId: int("program_id").references(() => committeeTrainingPrograms.id).notNull(),
  sessionDate: date("session_date").notNull(), // Fecha de la sesión
  sessionTime: varchar("session_time", { length: 10 }).notNull(), // Hora de la sesión (HH:MM)
  location: varchar("location", { length: 255 }), // Ubicación física
  type: mysqlEnum("type", ["presencial", "en_linea"]).notNull(), // Tipo de sesión
  meetingLink: varchar("meeting_link", { length: 500 }), // Enlace de reunión virtual (Zoom, Meet, etc.)
  status: mysqlEnum("status", ["programada", "en_curso", "completada", "cancelada"]).default("programada").notNull(),
  attendanceCount: int("attendance_count").default(0), // Contador de asistentes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CommitteeTrainingSession = typeof committeeTrainingSessions.$inferSelect;
export type InsertCommitteeTrainingSession = typeof committeeTrainingSessions.$inferInsert;

// Committee Training Attendance - Asistencia a sesiones de capacitación
export const committeeTrainingAttendance = mysqlTable("committee_attendance", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: int("session_id").references(() => committeeTrainingSessions.id).notNull(),
  committeeMemberId: int("committee_member_id").references(() => committeeMembers.id).notNull(),
  attended: boolean("attended").default(false).notNull(), // ¿Asistió?
  attendedAt: timestamp("attended_at"), // Fecha/hora de registro de asistencia
  certificateUrl: varchar("certificate_url", { length: 500 }), // URL del certificado generado
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CommitteeTrainingAttendance = typeof committeeTrainingAttendance.$inferSelect;
export type InsertCommitteeTrainingAttendance = typeof committeeTrainingAttendance.$inferInsert;

// NOM-035 Questionnaire Questions - 72 preguntas oficiales del cuestionario
export const nom035Questions = mysqlTable("nom035_questions", {
  id: int("id").autoincrement().primaryKey(),
  questionNumber: int("question_number").notNull().unique(), // Número de pregunta (1-72)
  category: varchar("category", { length: 100 }).notNull(), // Categoría principal (Ambiente, Liderazgo, Carga, etc.)
  domain: varchar("domain", { length: 150 }), // Dominio según NOM-035 (8 dominios)
  dimension: varchar("dimension", { length: 150 }), // Dimensión específica
  questionText: text("question_text").notNull(), // Texto de la pregunta
  questionType: mysqlEnum("question_type", ["likert_5", "yes_no", "multiple_choice"]).default("likert_5").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Nom035Question = typeof nom035Questions.$inferSelect;
export type InsertNom035Question = typeof nom035Questions.$inferInsert;

// NOM-035 Survey Periods - Períodos de aplicación del cuestionario
export const nom035SurveyPeriods = mysqlTable("nom035_survey_periods", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // Nombre del período (ej: "Evaluación Anual 2024")
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: mysqlEnum("status", ["draft", "active", "closed"]).default("draft").notNull(),
  createdBy: int("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Nom035SurveyPeriod = typeof nom035SurveyPeriods.$inferSelect;
export type InsertNom035SurveyPeriod = typeof nom035SurveyPeriods.$inferInsert;

// NOM-035 Responses - Respuestas individuales del cuestionario
export const nom035Responses = mysqlTable("nom035_responses", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employee_id").references(() => employees.id).notNull(),
  surveyPeriodId: int("survey_period_id").references(() => nom035SurveyPeriods.id).notNull(),
  questionId: int("question_id").references(() => nom035Questions.id).notNull(),
  response: int("response").notNull(), // Valor numérico de la respuesta (0-4 para Likert)
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type Nom035Response = typeof nom035Responses.$inferSelect;
export type InsertNom035Response = typeof nom035Responses.$inferInsert;

// NOM-035 Results - Resultados calculados por empleado y período
export const nom035Results = mysqlTable("nom035_results", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employee_id").references(() => employees.id).notNull(),
  surveyPeriodId: int("survey_period_id").references(() => nom035SurveyPeriods.id).notNull(),
  globalScore: int("global_score").notNull(), // Puntaje global
  globalRiskLevel: mysqlEnum("global_risk_level", ["nulo", "bajo", "medio", "alto", "muy_alto"]).notNull(),
  categoryScores: json("category_scores"), // JSON con puntajes por categoría
  domainScores: json("domain_scores"), // JSON con puntajes por dominio
  dimensionScores: json("dimension_scores"), // JSON con puntajes por dimensión
  recommendations: text("recommendations"), // Recomendaciones automáticas
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Nom035Result = typeof nom035Results.$inferSelect;
export type InsertNom035Result = typeof nom035Results.$inferInsert;


// Alert History - Histórico de alertas del sistema para auditoría
export const alertHistory = mysqlTable("alert_history", {
  id: int("id").autoincrement().primaryKey(),
  alertType: mysqlEnum("alert_type", ["critical_cases", "low_coverage", "excellent_compliance"]).notNull(),
  priority: mysqlEnum("priority", ["info", "warning", "critical"]).default("warning").notNull(),
  threshold: int("threshold").notNull(), // Umbral que activó la alerta
  currentValue: int("current_value").notNull(), // Valor actual que superó el umbral
  description: text("description").notNull(), // Descripción de la alerta
  status: mysqlEnum("status", ["active", "resolved"]).default("active").notNull(),
  triggeredAt: timestamp("triggered_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  userId: int("user_id").references(() => users.id), // Usuario que resolvió la alerta (opcional)
  notes: text("notes"), // Notas sobre acciones tomadas
});

export type AlertHistory = typeof alertHistory.$inferSelect;
export type InsertAlertHistory = typeof alertHistory.$inferInsert;

// Alert Thresholds - Umbrales configurables para alertas
export const alertThresholds = mysqlTable("alert_thresholds", {
  id: int("id").autoincrement().primaryKey(),
  alertType: mysqlEnum("alert_type", ["critical_cases", "low_coverage", "excellent_compliance"]).notNull().unique(),
  threshold: int("threshold").notNull(), // Valor umbral configurable
  description: text("description"), // Descripción del umbral
  updatedBy: int("updated_by").references(() => users.id), // Usuario que actualizó
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AlertThreshold = typeof alertThresholds.$inferSelect;
export type InsertAlertThreshold = typeof alertThresholds.$inferInsert;

// Notification History - Historial de notificaciones push enviadas
export const notificationHistory = mysqlTable("notification_history", {
  id: int("id").autoincrement().primaryKey(),
  alertId: int("alert_id").references(() => alertHistory.id).notNull(), // Referencia a la alerta
  alertType: mysqlEnum("alert_type", ["critical_cases", "low_coverage", "excellent_compliance"]).notNull(),
  priority: mysqlEnum("priority", ["info", "warning", "critical"]).notNull(),
  description: text("description").notNull(),
  currentValue: int("current_value").notNull(),
  threshold: int("threshold").notNull(),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export type NotificationHistory = typeof notificationHistory.$inferSelect;
export type InsertNotificationHistory = typeof notificationHistory.$inferInsert;


// ============================================================================
// RECRUITMENT MODULE - Módulo de Reclutamiento
// ============================================================================

// Job Openings - Vacantes disponibles
export const jobOpenings = mysqlTable("job_openings", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(), // Título de la vacante
  description: text("description").notNull(), // Descripción detallada
  departmentId: int("department_id").references(() => departments.id),
  positionId: int("position_id").references(() => jobPositions.id),
  requirements: text("requirements"), // Requisitos del puesto
  responsibilities: text("responsibilities"), // Responsabilidades
  salaryRange: varchar("salary_range", { length: 100 }), // Rango salarial
  location: varchar("location", { length: 255 }), // Ubicación
  employmentType: mysqlEnum("employment_type", ["permanent", "temporary", "contract", "internship"]).default("permanent").notNull(),
  status: mysqlEnum("status", ["draft", "open", "closed", "filled"]).default("draft").notNull(),
  openDate: date("open_date"),
  closeDate: date("close_date"),
  createdBy: int("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type JobOpening = typeof jobOpenings.$inferSelect;
export type InsertJobOpening = typeof jobOpenings.$inferInsert;

// Candidates - Candidatos/Postulantes
export const candidates = mysqlTable("candidates", {
  id: int("id").autoincrement().primaryKey(),
  jobOpeningId: int("job_opening_id").references(() => jobOpenings.id).notNull(),
  
  // Datos personales
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 15 }).notNull(),
  curp: varchar("curp", { length: 18 }).notNull(),
  
  // Datos extraídos de CURP
  birthDate: date("birth_date"),
  gender: mysqlEnum("gender", ["Masculino", "Femenino"]),
  birthState: varchar("birth_state", { length: 100 }),
  age: int("age"),
  
  // Dirección
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 100 }),
  postalCode: varchar("postal_code", { length: 10 }),
  
  // Educación
  education: varchar("education", { length: 255 }), // Último grado de estudios
  fieldOfStudy: varchar("field_of_study", { length: 255 }), // Carrera/especialidad
  
  // Cláusulas ARCO y veracidad
  arcoAccepted: boolean("arco_accepted").default(false).notNull(), // Aceptación de cláusulas ARCO
  arcoAcceptedAt: timestamp("arco_accepted_at"),
  verificationAuthorized: boolean("verification_authorized").default(false).notNull(), // Autorización de verificación
  verificationAuthorizedAt: timestamp("verification_authorized_at"),
  
  // Estado del candidato
  status: mysqlEnum("status", ["new", "reviewing", "interview", "offer", "hired", "rejected"]).default("new").notNull(),
  hiringScore: int("hiring_score"), // Índice de contratación (0-100)
  
  // Notas del reclutador
  recruiterNotes: text("recruiter_notes"),
  
  // CV/Resume
  resumeUrl: varchar("resume_url", { length: 500 }),
  
  // Fechas
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
  interviewedAt: timestamp("interviewed_at"),
  hiredAt: timestamp("hired_at"),
  rejectedAt: timestamp("rejected_at"),
  
  // Relación con empleado (si fue contratado)
  employeeId: int("employee_id").references(() => employees.id),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = typeof candidates.$inferInsert;

// Candidate Work History - Historial laboral del candidato
export const candidateWorkHistory = mysqlTable("candidate_work_history", {
  id: int("id").autoincrement().primaryKey(),
  candidateId: int("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"), // NULL si es empleo actual
  isCurrent: boolean("is_current").default(false).notNull(),
  responsibilities: text("responsibilities"),
  reasonForLeaving: text("reason_for_leaving"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CandidateWorkHistory = typeof candidateWorkHistory.$inferSelect;
export type InsertCandidateWorkHistory = typeof candidateWorkHistory.$inferInsert;

// Candidate References - Referencias laborales del candidato
export const candidateReferences = mysqlTable("candidate_references", {
  id: int("id").autoincrement().primaryKey(),
  candidateId: int("candidate_id").references(() => candidates.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }).notNull(),
  company: varchar("company", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 15 }).notNull(),
  email: varchar("email", { length: 320 }),
  relationship: varchar("relationship", { length: 100 }), // Relación (jefe directo, colega, etc.)
  
  // Verificación de referencia
  verified: boolean("verified").default(false).notNull(),
  verifiedAt: timestamp("verified_at"),
  verifiedBy: int("verified_by").references(() => users.id),
  verificationNotes: text("verification_notes"),
  referenceScore: int("reference_score"), // Calificación de la referencia (0-10)
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CandidateReference = typeof candidateReferences.$inferSelect;
export type InsertCandidateReference = typeof candidateReferences.$inferInsert;

// ============================================================================
// EMPLOYEE TERMINATION MODULE - Módulo de Salida de Personal
// ============================================================================

// Employee Terminations - Bajas de personal
export const employeeTerminations = mysqlTable("employee_terminations", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employee_id").references(() => employees.id).notNull(),
  terminationDate: date("termination_date").notNull(),
  terminationReason: mysqlEnum("termination_reason", [
    "resignation", // Renuncia voluntaria
    "dismissal", // Despido
    "retirement", // Jubilación
    "contract_end", // Fin de contrato
    "mutual_agreement", // Mutuo acuerdo
    "death", // Fallecimiento
    "other" // Otro
  ]).notNull(),
  terminationReasonDetails: text("termination_reason_details"), // Detalles adicionales
  noticeGiven: boolean("notice_given").default(false).notNull(), // ¿Se dio aviso previo?
  noticePeriodDays: int("notice_period_days"), // Días de aviso previo
  finalWorkDate: date("final_work_date"), // Último día trabajado
  severancePayment: decimal("severance_payment", { precision: 10, scale: 2 }), // Liquidación
  notes: text("notes"),
  documentUrls: json("document_urls"), // URLs de documentos relacionados
  processedBy: int("processed_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type EmployeeTermination = typeof employeeTerminations.$inferSelect;
export type InsertEmployeeTermination = typeof employeeTerminations.$inferInsert;

// Exit Interview Questions - Catálogo de preguntas para entrevista de salida
export const exitInterviewQuestions = mysqlTable("exit_interview_questions", {
  id: int("id").autoincrement().primaryKey(),
  questionText: text("question_text").notNull(),
  questionType: mysqlEnum("question_type", ["multiple_choice", "text"]).default("multiple_choice").notNull(),
  options: json("options"), // Array de opciones para preguntas de opción múltiple
  category: varchar("category", { length: 100 }), // Categoría de la pregunta (ambiente, compensación, desarrollo, etc.)
  order: int("order").notNull(), // Orden de presentación
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExitInterviewQuestion = typeof exitInterviewQuestions.$inferSelect;
export type InsertExitInterviewQuestion = typeof exitInterviewQuestions.$inferInsert;

// Exit Interviews - Entrevistas de salida
export const exitInterviews = mysqlTable("exit_interviews", {
  id: int("id").autoincrement().primaryKey(),
  terminationId: int("termination_id").references(() => employeeTerminations.id).notNull(),
  employeeId: int("employee_id").references(() => employees.id).notNull(),
  
  // Observaciones adicionales
  additionalComments: text("additional_comments"),
  
  // Confidencialidad
  isConfidential: boolean("is_confidential").default(true).notNull(),
  
  // Estado
  status: mysqlEnum("status", ["pending", "completed"]).default("pending").notNull(),
  completedAt: timestamp("completed_at"),
  
  // Auditoría
  conductedBy: int("conducted_by").references(() => users.id), // Usuario que realizó la entrevista
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ExitInterview = typeof exitInterviews.$inferSelect;
export type InsertExitInterview = typeof exitInterviews.$inferInsert;

// Exit Interview Responses - Respuestas de entrevista de salida
export const exitInterviewResponses = mysqlTable("exit_interview_responses", {
  id: int("id").autoincrement().primaryKey(),
  exitInterviewId: int("exit_interview_id").references(() => exitInterviews.id, { onDelete: "cascade" }).notNull(),
  questionId: int("question_id").references(() => exitInterviewQuestions.id).notNull(),
  response: text("response").notNull(), // Respuesta seleccionada o texto libre
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExitInterviewResponse = typeof exitInterviewResponses.$inferSelect;
export type InsertExitInterviewResponse = typeof exitInterviewResponses.$inferInsert;

// Turnover Action Plans - Planes de acción basados en análisis de rotación
export const turnoverActionPlans = mysqlTable("turnover_action_plans", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  
  // Causas identificadas
  primaryCauses: json("primary_causes"), // Array de causas principales de rotación
  
  // Acciones propuestas
  proposedActions: json("proposed_actions"), // Array de acciones correctivas
  
  // Periodo de análisis
  analysisStartDate: date("analysis_start_date").notNull(),
  analysisEndDate: date("analysis_end_date").notNull(),
  
  // Estado del plan
  status: mysqlEnum("status", ["draft", "approved", "in_progress", "completed"]).default("draft").notNull(),
  
  // Responsable
  assignedTo: int("assigned_to").references(() => users.id),
  
  // Fechas
  createdBy: int("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export type TurnoverActionPlan = typeof turnoverActionPlans.$inferSelect;
export type InsertTurnoverActionPlan = typeof turnoverActionPlans.$inferInsert;


// ============================================
// COMPLIANCE MANAGEMENT (NOM-035 Numerals 7 & 8)
// ============================================

/**
 * Compliance requirements catalog - NOM-035 Numerals 7 & 8
 */
export const complianceRequirements = mysqlTable("compliance_requirements", {
  id: int("id").autoincrement().primaryKey(),
  numeral: varchar("numeral", { length: 10 }).notNull(), // "7.1", "7.2", "8.1", etc.
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description").notNull(),
  category: mysqlEnum("category", ["identification", "analysis", "prevention", "control", "documentation"]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ComplianceRequirement = typeof complianceRequirements.$inferSelect;
export type InsertComplianceRequirement = typeof complianceRequirements.$inferInsert;

// Note: complianceChecks and complianceEvidence are already defined above (lines 1321-1347)

/**
 * Historial de reportes de cumplimiento generados
 * Almacena cada reporte PDF generado con UUID único para verificación NOM-151
 */
export const complianceReports = mysqlTable("compliance_reports", {
  id: int("id").autoincrement().primaryKey(),
  uuid: varchar("uuid", { length: 36 }).notNull().unique(), // UUID v4 único
  tipo: varchar("tipo", { length: 100 }).notNull(), // "verificacion_numerales", "auditoria", etc.
  titulo: varchar("titulo", { length: 500 }).notNull(),
  // Folio para sistemas de gestión: CÓDIGO-CONSECUTIVO/AÑO
  formatId: int("format_id").references(() => documentFormats.id),
  folioNumber: int("folio_number"), // Número consecutivo
  folioYear: int("folio_year"), // Año del folio
  folio: varchar("folio", { length: 50 }), // Folio completo generado (ej: "VN-001/2026")
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  generatedBy: int("generated_by").notNull().references(() => users.id),
  generatedByName: varchar("generated_by_name", { length: 255 }).notNull(),
  generatedByEmail: varchar("generated_by_email", { length: 320 }),
  data: json("data"), // Datos completos del reporte en JSON
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ComplianceReport = typeof complianceReports.$inferSelect;
export type InsertComplianceReport = typeof complianceReports.$inferInsert;

/**
 * Catálogo de formatos de documentos para sistema de gestión
 * Gestiona nomenclatura de folios: CÓDIGO-CONSECUTIVO/AÑO
 */
export const documentFormats = mysqlTable("document_formats", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 20 }).notNull().unique(), // Ej: "VN", "RN", "AC"
  nombre: varchar("nombre", { length: 255 }).notNull(), // Ej: "Verificación de Numerales"
  descripcion: text("descripcion"),
  version: varchar("version", { length: 20 }).notNull().default("1.0"), // Ej: "1.0", "2.1"
  fechaVersion: date("fecha_version").notNull(), // Fecha de la versión actual
  referencia: varchar("referencia", { length: 500 }), // Referencia normativa o interna
  consecutivoActual: int("consecutivo_actual").notNull().default(0), // Último consecutivo usado
  activo: boolean("activo").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().onUpdateNow(),
});

export type DocumentFormat = typeof documentFormats.$inferSelect;
export type InsertDocumentFormat = typeof documentFormats.$inferInsert;


/**
 * Document Audit Log - ISO 9001 Compliance
 * Registro de accesos, visualizaciones y descargas de documentos
 */
export const documentAuditLog = mysqlTable("document_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  reportId: int("report_id").notNull(), // FK a compliance_reports
  userId: int("user_id"), // Puede ser null para accesos anónimos (verificación pública)
  userName: varchar("user_name", { length: 255 }), // Nombre del usuario que accedió
  userEmail: varchar("user_email", { length: 320 }), // Email del usuario
  action: mysqlEnum("action", ["view", "download", "verify"]).notNull(), // Tipo de acción
  ipAddress: varchar("ip_address", { length: 45 }), // IPv4 o IPv6
  userAgent: text("user_agent"), // Navegador y sistema operativo
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export type DocumentAuditLog = typeof documentAuditLog.$inferSelect;
export type InsertDocumentAuditLog = typeof documentAuditLog.$inferInsert;


/**
 * Security Alerts - Alertas de Actividad Sospechosa
 * Registro de alertas de seguridad detectadas automáticamente
 */
export const securityAlerts = mysqlTable("security_alerts", {
  id: int("id").autoincrement().primaryKey(),
  alertType: mysqlEnum("alert_type", [
    "multiple_downloads", // Múltiples descargas en corto tiempo
    "unknown_ip", // Acceso desde IP desconocida
    "off_hours", // Acceso fuera de horario laboral
    "suspicious_pattern", // Patrón sospechoso general
  ]).notNull(),
  severity: mysqlEnum("severity", ["low", "medium", "high", "critical"]).notNull().default("medium"),
  userId: int("user_id"), // Usuario involucrado (puede ser null)
  userName: varchar("user_name", { length: 255 }),
  reportId: int("report_id"), // Reporte involucrado (puede ser null)
  ipAddress: varchar("ip_address", { length: 45 }),
  description: text("description").notNull(), // Descripción de la alerta
  metadata: json("metadata"), // Datos adicionales (conteo, timestamps, etc.)
  status: mysqlEnum("status", ["pending", "reviewed", "resolved", "false_positive"]).notNull().default("pending"),
  reviewedBy: int("reviewed_by"), // Usuario que revisó la alerta
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"), // Notas de revisión
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SecurityAlert = typeof securityAlerts.$inferSelect;
export type InsertSecurityAlert = typeof securityAlerts.$inferInsert;


/**
 * Report Templates - Plantillas Personalizables de Reportes
 * Permite a cada empresa definir su propio diseño de documentos oficiales
 */
export const reportTemplates = mysqlTable("report_templates", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  tipo: varchar("tipo", { length: 100 }).notNull(), // 'verificacion_numerales', 'minuta', 'constancia', etc.
  htmlTemplate: text("html_template").notNull(), // Template HTML con variables {{variable}}
  cssStyles: text("css_styles"), // Estilos CSS personalizados
  variables: json("variables"), // Lista de variables disponibles con descripción
  isDefault: boolean("is_default").default(false).notNull(),
  activo: boolean("activo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type InsertReportTemplate = typeof reportTemplates.$inferInsert;


/**
 * Committee Minutes - Minutas de Comité
 * Gestión completa de minutas con borradores, historial y exportación PDF
 */
export const committeeMinutes = mysqlTable("committee_minutes", {
  id: int("id").autoincrement().primaryKey(),
  folio: varchar("folio", { length: 100 }).notNull().unique(), // MC-001/2026
  sessionNumber: int("session_number").notNull(), // Número de sesión
  meetingDate: date("meeting_date").notNull(), // Fecha de la reunión
  meetingTime: varchar("meeting_time", { length: 10 }).notNull(), // Hora (HH:MM)
  meetingPlace: varchar("meeting_place", { length: 255 }).notNull(), // Lugar de la reunión
  meetingType: mysqlEnum("meeting_type", [
    "ordinaria",
    "extraordinaria",
    "urgente",
    "seguimiento"
  ]).notNull().default("ordinaria"),
  status: mysqlEnum("status", ["borrador", "finalizada", "archivada"]).notNull().default("borrador"),
  objective: text("objective"), // Objetivo de la reunión
  results: text("results"), // Resultados obtenidos
  groupPhotoUrl: varchar("group_photo_url", { length: 512 }), // Foto grupal
  groupPhotoKey: varchar("group_photo_key", { length: 512 }),
  attendanceListUrl: varchar("attendance_list_url", { length: 512 }), // Lista de asistencia
  attendanceListKey: varchar("attendance_list_key", { length: 512 }),
  pdfUrl: varchar("pdf_url", { length: 512 }), // PDF generado
  pdfKey: varchar("pdf_key", { length: 512 }),
  qrCode: varchar("qr_code", { length: 255 }).unique(), // Código QR para verificación
  version: int("version").notNull().default(1), // Versión del documento
  createdBy: int("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  finalizedAt: timestamp("finalized_at"), // Fecha de finalización
});

export type CommitteeMinute = typeof committeeMinutes.$inferSelect;
export type InsertCommitteeMinute = typeof committeeMinutes.$inferInsert;

/**
 * Committee Minute Attendees - Asistentes a Minutas
 */
export const committeeMinuteAttendees = mysqlTable("committee_minute_attendees", {
  id: int("id").autoincrement().primaryKey(),
  minuteId: int("minute_id").references(() => committeeMinutes.id).notNull(),
  userId: int("user_id").references(() => users.id), // Puede ser null para externos
  name: varchar("name", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }), // Cargo
  role: varchar("role", { length: 100 }), // Rol en la reunión (presidente, secretario, vocal, etc.)
  photoUrl: varchar("photo_url", { length: 512 }), // Foto del representante
  photoKey: varchar("photo_key", { length: 512 }),
  signatureUrl: varchar("signature_url", { length: 512 }), // Firma digital
  signatureKey: varchar("signature_key", { length: 512 }),
  attended: boolean("attended").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CommitteeMinuteAttendee = typeof committeeMinuteAttendees.$inferSelect;
export type InsertCommitteeMinuteAttendee = typeof committeeMinuteAttendees.$inferInsert;

/**
 * Committee Minute Agenda Items - Orden del Día
 */
export const committeeMinuteAgendaItems = mysqlTable("committee_minute_agenda_items", {
  id: int("id").autoincrement().primaryKey(),
  minuteId: int("minute_id").references(() => committeeMinutes.id).notNull(),
  orderIndex: int("order_index").notNull(), // Orden en la agenda
  topic: varchar("topic", { length: 255 }).notNull(), // Tema
  description: text("description"), // Descripción
  presenter: varchar("presenter", { length: 255 }), // Responsable de presentar
  duration: int("duration"), // Duración estimada en minutos
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CommitteeMinuteAgendaItem = typeof committeeMinuteAgendaItems.$inferSelect;
export type InsertCommitteeMinuteAgendaItem = typeof committeeMinuteAgendaItems.$inferInsert;

/**
 * Committee Minute Agreements - Acuerdos de Minutas
 */
export const committeeMinuteAgreements = mysqlTable("committee_minute_agreements", {
  id: int("id").autoincrement().primaryKey(),
  minuteId: int("minute_id").references(() => committeeMinutes.id).notNull(),
  agreementNumber: varchar("agreement_number", { length: 50 }).notNull(), // Número de acuerdo
  description: text("description").notNull(), // Descripción del acuerdo
  responsibleUserId: int("responsible_user_id").references(() => users.id), // Responsable
  responsibleName: varchar("responsible_name", { length: 255 }), // Nombre del responsable
  dueDate: date("due_date"), // Fecha de cumplimiento
  status: mysqlEnum("status", ["pendiente", "en_proceso", "completado", "cancelado"]).notNull().default("pendiente"),
  priority: mysqlEnum("priority", ["baja", "media", "alta", "urgente"]).notNull().default("media"),
  notes: text("notes"), // Notas adicionales
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CommitteeMinuteAgreement = typeof committeeMinuteAgreements.$inferSelect;
export type InsertCommitteeMinuteAgreement = typeof committeeMinuteAgreements.$inferInsert;

/**
 * Committee Minute History - Historial de Versiones de Minutas
 */
export const committeeMinuteHistory = mysqlTable("committee_minute_history", {
  id: int("id").autoincrement().primaryKey(),
  minuteId: int("minute_id").references(() => committeeMinutes.id).notNull(),
  version: int("version").notNull(),
  snapshot: json("snapshot").notNull(), // Snapshot completo de la minuta
  changedBy: int("changed_by").references(() => users.id).notNull(),
  changeDescription: text("change_description"), // Descripción del cambio
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CommitteeMinuteHistoryEntry = typeof committeeMinuteHistory.$inferSelect;
export type InsertCommitteeMinuteHistoryEntry = typeof committeeMinuteHistory.$inferInsert;

/**
 * Digital Certificates - Certificados Digitales e.firma SAT
 */
export const digitalCertificates = mysqlTable("digital_certificates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id).notNull(),
  certificateName: varchar("certificate_name", { length: 255 }).notNull(), // Nombre del certificado
  certificatePath: varchar("certificate_path", { length: 500 }).notNull(), // Ruta del archivo .cer en S3
  keyPath: varchar("key_path", { length: 500 }).notNull(), // Ruta del archivo .key en S3
  passwordEncrypted: text("password_encrypted").notNull(), // Contraseña de la llave privada (encriptada)
  validFrom: date("valid_from").notNull(), // Fecha de inicio de vigencia
  validUntil: date("valid_until").notNull(), // Fecha de fin de vigencia
  status: mysqlEnum("status", ["active", "expired", "revoked"]).notNull().default("active"),
  issuer: varchar("issuer", { length: 255 }), // Emisor del certificado
  serialNumber: varchar("serial_number", { length: 100 }), // Número de serie del certificado
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type DigitalCertificate = typeof digitalCertificates.$inferSelect;
export type InsertDigitalCertificate = typeof digitalCertificates.$inferInsert;

/**
 * Assessments - Evaluaciones/Exámenes
 */
export const assessments = mysqlTable("assessments", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(), // Título del examen
  description: text("description"), // Descripción
  courseId: int("course_id").references(() => courses.id), // Curso asociado (opcional)
  passingScore: int("passing_score").notNull().default(70), // Calificación mínima para aprobar
  timeLimit: int("time_limit"), // Tiempo límite en minutos (null = sin límite)
  maxAttempts: int("max_attempts").default(3), // Número máximo de intentos
  shuffleQuestions: boolean("shuffle_questions").default(false), // Aleatorizar preguntas
  shuffleOptions: boolean("shuffle_options").default(false), // Aleatorizar opciones
  showResults: boolean("show_results").default(true), // Mostrar resultados al terminar
  status: mysqlEnum("status", ["draft", "active", "archived"]).notNull().default("draft"),
  createdBy: int("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Assessment = typeof assessments.$inferSelect;
export type InsertAssessment = typeof assessments.$inferInsert;

/**
 * Exam Questions - Banco de Preguntas para Exámenes
 */
export const examQuestions = mysqlTable("exam_questions", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessment_id").references(() => assessments.id).notNull(),
  questionText: text("question_text").notNull(), // Texto de la pregunta
  questionType: mysqlEnum("question_type", ["multiple_choice", "true_false", "short_answer"]).notNull().default("multiple_choice"),
  points: int("points").notNull().default(1), // Puntos que vale la pregunta
  orderIndex: int("order_index").notNull(), // Orden en el examen
  explanation: text("explanation"), // Explicación de la respuesta correcta
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ExamQuestion = typeof examQuestions.$inferSelect;
export type InsertExamQuestion = typeof examQuestions.$inferInsert;

/**
 * Exam Question Options - Opciones de Respuesta para Exámenes
 */
export const examQuestionOptions = mysqlTable("exam_question_options", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("question_id").references(() => examQuestions.id).notNull(),
  optionText: text("option_text").notNull(), // Texto de la opción
  isCorrect: boolean("is_correct").notNull().default(false), // Si es la respuesta correcta
  orderIndex: int("order_index").notNull(), // Orden de la opción
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExamQuestionOption = typeof examQuestionOptions.$inferSelect;
export type InsertExamQuestionOption = typeof examQuestionOptions.$inferInsert;

/**
 * Exam Attempts - Intentos de Examen
 */
export const examAttempts = mysqlTable("exam_attempts", {
  id: int("id").autoincrement().primaryKey(),
  assessmentId: int("assessment_id").references(() => assessments.id).notNull(),
  employeeId: int("employee_id").references(() => employees.id).notNull(),
  attemptNumber: int("attempt_number").notNull().default(1), // Número de intento
  startedAt: timestamp("started_at").notNull(), // Inicio del examen
  submittedAt: timestamp("submitted_at"), // Fin del examen
  score: int("score"), // Calificación obtenida
  passed: boolean("passed"), // Si aprobó o no
  status: mysqlEnum("status", ["in_progress", "completed", "abandoned"]).notNull().default("in_progress"),
  timeSpent: int("time_spent"), // Tiempo transcurrido en segundos
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExamAttempt = typeof examAttempts.$inferSelect;
export type InsertExamAttempt = typeof examAttempts.$inferInsert;

/**
 * Exam Answers - Respuestas de Examen
 */
export const examAnswers = mysqlTable("exam_answers", {
  id: int("id").autoincrement().primaryKey(),
  attemptId: int("attempt_id").references(() => examAttempts.id).notNull(),
  questionId: int("question_id").references(() => examQuestions.id).notNull(),
  selectedOptionId: int("selected_option_id").references(() => examQuestionOptions.id), // Para multiple choice
  textAnswer: text("text_answer"), // Para respuestas cortas
  isCorrect: boolean("is_correct"), // Si la respuesta fue correcta
  pointsEarned: int("points_earned").default(0), // Puntos obtenidos
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExamAnswer = typeof examAnswers.$inferSelect;
export type InsertExamAnswer = typeof examAnswers.$inferInsert;

/**
 * Notification Templates - Plantillas de Notificaciones
 */
export const notificationTemplates = mysqlTable("notification_templates", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(), // Código único (ej: "cert_expiring_30")
  name: varchar("name", { length: 255 }).notNull(), // Nombre descriptivo
  description: text("description"), // Descripción
  channel: mysqlEnum("channel", ["email", "sms", "both"]).notNull().default("email"),
  emailSubject: varchar("email_subject", { length: 255 }), // Asunto del correo
  emailBody: text("email_body"), // Cuerpo del correo (HTML)
  smsBody: varchar("sms_body", { length: 500 }), // Cuerpo del SMS
  variables: json("variables"), // Variables disponibles para la plantilla
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = typeof notificationTemplates.$inferInsert;

/**
 * Notification Queue - Cola de Notificaciones
 */
export const notificationQueue = mysqlTable("notification_queue", {
  id: int("id").autoincrement().primaryKey(),
  templateCode: varchar("template_code", { length: 50 }).notNull(),
  recipientId: int("recipient_id").references(() => employees.id), // Empleado destinatario
  recipientEmail: varchar("recipient_email", { length: 320 }), // Email directo
  recipientPhone: varchar("recipient_phone", { length: 20 }), // Teléfono directo
  channel: mysqlEnum("channel", ["email", "sms", "both"]).notNull(),
  subject: varchar("subject", { length: 255 }), // Asunto procesado
  body: text("body"), // Cuerpo procesado
  variables: json("variables"), // Variables utilizadas
  status: mysqlEnum("status", ["pending", "sent", "failed", "cancelled"]).notNull().default("pending"),
  scheduledFor: timestamp("scheduled_for"), // Cuándo enviar (null = inmediato)
  sentAt: timestamp("sent_at"), // Cuándo se envió
  errorMessage: text("error_message"), // Mensaje de error si falló
  retryCount: int("retry_count").default(0), // Número de reintentos
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type NotificationQueueItem = typeof notificationQueue.$inferSelect;
export type InsertNotificationQueueItem = typeof notificationQueue.$inferInsert;

/**
 * Notification Logs - Historial de Notificaciones Enviadas
 */
export const notificationLogs = mysqlTable("notification_logs", {
  id: int("id").autoincrement().primaryKey(),
  queueId: int("queue_id").references(() => notificationQueue.id),
  templateCode: varchar("template_code", { length: 50 }).notNull(),
  recipientId: int("recipient_id").references(() => employees.id),
  recipientEmail: varchar("recipient_email", { length: 320 }),
  recipientPhone: varchar("recipient_phone", { length: 20 }),
  channel: mysqlEnum("channel", ["email", "sms"]).notNull(),
  subject: varchar("subject", { length: 255 }),
  body: text("body"),
  status: mysqlEnum("status", ["sent", "failed", "bounced"]).notNull(),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = typeof notificationLogs.$inferInsert;

/**
 * Invoices - Facturas
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  folio: varchar("folio", { length: 50 }).notNull().unique(),
  clienteNombre: varchar("cliente_nombre", { length: 255 }).notNull(),
  clienteRFC: varchar("cliente_rfc", { length: 13 }),
  monto: decimal("monto", { precision: 10, scale: 2 }).notNull(),
  moneda: mysqlEnum("moneda", ["MXN", "USD", "EUR"]).notNull().default("MXN"),
  fechaEmision: date("fecha_emision").notNull(),
  fechaVencimiento: date("fecha_vencimiento").notNull(),
  estado: mysqlEnum("estado", ["pendiente", "pagada", "vencida", "cancelada"]).notNull().default("pendiente"),
  archivoUrl: varchar("archivo_url", { length: 500 }),
  notas: text("notas"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Purchase Orders - Órdenes de Compra
 */
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  folio: varchar("folio", { length: 50 }).notNull().unique(),
  proveedor: varchar("proveedor", { length: 255 }).notNull(),
  proveedorRFC: varchar("proveedor_rfc", { length: 13 }),
  monto: decimal("monto", { precision: 10, scale: 2 }).notNull(),
  moneda: mysqlEnum("moneda", ["MXN", "USD", "EUR"]).notNull().default("MXN"),
  fecha: date("fecha").notNull(),
  fechaEntregaEstimada: date("fecha_entrega_estimada"),
  estado: mysqlEnum("estado", ["borrador", "enviada", "recibida", "cancelada"]).notNull().default("borrador"),
  descripcion: text("descripcion"),
  archivoUrl: varchar("archivo_url", { length: 500 }),
  createdBy: int("created_by").references(() => users.id),
  approvedBy: int("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

/**
 * Expense Requests - Solicitudes de Gasto
 */
export const expenseRequests = mysqlTable("expense_requests", {
  id: int("id").autoincrement().primaryKey(),
  folio: varchar("folio", { length: 50 }).notNull().unique(),
  solicitanteId: int("solicitante_id").references(() => users.id).notNull(),
  monto: decimal("monto", { precision: 10, scale: 2 }).notNull(),
  moneda: mysqlEnum("moneda", ["MXN", "USD", "EUR"]).notNull().default("MXN"),
  concepto: varchar("concepto", { length: 255 }).notNull(),
  descripcion: text("descripcion"),
  categoria: mysqlEnum("categoria", ["viaje", "materiales", "servicios", "capacitacion", "otro"]).notNull(),
  fechaSolicitud: date("fecha_solicitud").notNull(),
  fechaRequerida: date("fecha_requerida"),
  estado: mysqlEnum("estado", ["pendiente", "aprobada", "rechazada", "pagada"]).notNull().default("pendiente"),
  aprobadorId: int("aprobador_id").references(() => users.id),
  fechaAprobacion: timestamp("fecha_aprobacion"),
  comentariosAprobador: text("comentarios_aprobador"),
  archivoUrl: varchar("archivo_url", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ExpenseRequest = typeof expenseRequests.$inferSelect;
export type InsertExpenseRequest = typeof expenseRequests.$inferInsert;

/**
 * Permission Change History - Auditoría de Cambios de Permisos
 */
export const permissionChangeHistory = mysqlTable("permission_change_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id).notNull(), // Usuario cuyo permiso fue modificado
  changedBy: int("changed_by").references(() => users.id).notNull(), // Usuario que realizó el cambio
  changeType: mysqlEnum("change_type", ["role_change", "custom_permission_update", "custom_permission_reset"]).notNull(),
  oldValue: json("old_value").$type<{
    role?: string;
    customPermissions?: {
      can_view?: boolean;
      can_create?: boolean;
      can_edit?: boolean;
      can_delete?: boolean;
      can_approve?: boolean;
      can_export?: boolean;
    };
  }>(),
  newValue: json("new_value").$type<{
    role?: string;
    customPermissions?: {
      can_view?: boolean;
      can_create?: boolean;
      can_edit?: boolean;
      can_delete?: boolean;
      can_approve?: boolean;
      can_export?: boolean;
    };
  }>(),
  reason: text("reason"), // Motivo del cambio (opcional)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PermissionChangeHistory = typeof permissionChangeHistory.$inferSelect;
export type InsertPermissionChangeHistory = typeof permissionChangeHistory.$inferInsert;


/**
 * SMTP Configuration table
 * Stores email server configuration for sending notifications
 */
export const smtpConfig = mysqlTable("smtp_config", {
  id: int("id").autoincrement().primaryKey(),
  host: varchar("host", { length: 255 }).notNull(),
  port: int("port").notNull().default(587),
  secure: boolean("secure").notNull().default(false), // true for 465, false for other ports
  user: varchar("user", { length: 255 }).notNull(),
  password: text("password").notNull(), // Encrypted
  fromEmail: varchar("from_email", { length: 320 }).notNull(),
  fromName: varchar("from_name", { length: 255 }).notNull().default("Sistema NOM-035"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type SmtpConfig = typeof smtpConfig.$inferSelect;
export type InsertSmtpConfig = typeof smtpConfig.$inferInsert;



/**
 * Survey Anonymous Tokens table
 * Stores anonymous access tokens for NOM-035 surveys (no user association)
 */
export const surveyAnonymousTokens = mysqlTable("survey_anonymous_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(), // Unique token string
  surveyType: varchar("survey_type", { length: 50 }).notNull(), // 'guia_i', 'guia_ii', 'guia_iii'
  department: varchar("department", { length: 255 }), // Optional department filter
  expiresAt: timestamp("expires_at").notNull(), // Token expiration date
  usedAt: timestamp("used_at"), // When the token was used (null if unused)
  isRevoked: boolean("is_revoked").notNull().default(false), // Manual revocation
  generatedBy: int("generated_by").references(() => users.id), // Admin who generated the token
  notes: text("notes"), // Optional notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SurveyAnonymousToken = typeof surveyAnonymousTokens.$inferSelect;
export type InsertSurveyAnonymousToken = typeof surveyAnonymousTokens.$inferInsert;

/**
 * User Notification Preferences
 * Stores personalized notification settings for each user
 */
export const userNotificationPreferences = mysqlTable("user_notification_preferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Notification Types (enabled/disabled)
  alertsEnabled: boolean("alerts_enabled").notNull().default(true), // Alertas de sistema
  remindersEnabled: boolean("reminders_enabled").notNull().default(true), // Recordatorios
  reportsEnabled: boolean("reports_enabled").notNull().default(true), // Reportes automáticos
  surveysEnabled: boolean("surveys_enabled").notNull().default(true), // Notificaciones de encuestas
  casesEnabled: boolean("cases_enabled").notNull().default(true), // Notificaciones de casos
  correctiveActionsEnabled: boolean("corrective_actions_enabled").notNull().default(true), // Acciones correctivas
  
  // Frequency Settings
  frequency: mysqlEnum("frequency", ["immediate", "daily", "weekly"]).notNull().default("immediate"),
  dailySummaryEnabled: boolean("daily_summary_enabled").notNull().default(false), // Resumen diario por correo
  dailySummaryTime: varchar("daily_summary_time", { length: 5 }).default("09:00"), // Hora del resumen (HH:mm)
  
  // Channel Preferences
  emailEnabled: boolean("email_enabled").notNull().default(true),
  inAppEnabled: boolean("in_app_enabled").notNull().default(true),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type UserNotificationPreference = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreference = typeof userNotificationPreferences.$inferInsert;

/**
 * Nine Box Grid Assessments
 * Stores talent assessment data combining performance and potential
 */
export const nineBoxAssessments = mysqlTable("nine_box_assessments", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  performanceScore: int("performance_score").notNull(), // 1-3 (Low, Medium, High)
  potentialScore: int("potential_score").notNull(), // 1-3 (Low, Medium, High)
  quadrant: varchar("quadrant", { length: 50 }).notNull(), // e.g., "High Potential - High Performance"
  assessmentDate: date("assessment_date").notNull(),
  assessedBy: int("assessed_by").references(() => users.id), // Who performed the assessment
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type NineBoxAssessment = typeof nineBoxAssessments.$inferSelect;
export type InsertNineBoxAssessment = typeof nineBoxAssessments.$inferInsert;

/**
 * Skills Matrix Snapshots
 * Manual snapshots of the skills matrix for temporal comparison
 */
export const skillsMatrixSnapshots = mysqlTable("skills_matrix_snapshots", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // User-defined name for the snapshot
  description: text("description"), // Optional description
  snapshotDate: date("snapshot_date").notNull(), // Date of the snapshot
  departmentId: int("department_id").references(() => departments.id), // Optional: filter by department
  data: json("data").notNull().$type<{
    employees: Array<{
      id: number;
      firstName: string;
      lastName: string;
      departmentName: string;
      positionName: string;
      competencies: Array<{
        competencyId: number;
        competencyName: string;
        currentLevel: number;
        requiredLevel: number;
        gap: number;
      }>;
      averageLevel: number;
      totalGap: number;
    }>;
    summary: {
      totalEmployees: number;
      totalCompetencies: number;
      averageCompetencyLevel: number;
      totalGaps: number;
      criticalGaps: number;
    };
  }>(), // Complete snapshot data
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SkillsMatrixSnapshot = typeof skillsMatrixSnapshots.$inferSelect;
export type InsertSkillsMatrixSnapshot = typeof skillsMatrixSnapshots.$inferInsert;


/**
 * Competency Regression Alerts
 * Tracks significant drops in employee competency levels
 */
export const competencyRegressionAlerts = mysqlTable("competency_regression_alerts", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employee_id").notNull().references(() => employees.id),
  snapshotId: int("snapshot_id").notNull(),
  previousSnapshotId: int("prev_snapshot_id").notNull(),
  competencyId: int("competency_id").notNull().references(() => organizationalCompetencies.id),
  previousLevel: int("previous_level").notNull(), // 0-4
  currentLevel: int("current_level").notNull(), // 0-4
  levelDrop: int("level_drop").notNull(), // Negative number indicating drop
  alertDate: timestamp("alert_date").defaultNow().notNull(),
  notificationSent: boolean("notification_sent").default(false).notNull(),
  resolvedAt: timestamp("resolved_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type CompetencyRegressionAlert = typeof competencyRegressionAlerts.$inferSelect;
export type InsertCompetencyRegressionAlert = typeof competencyRegressionAlerts.$inferInsert;


// ============================================================
// SISTEMA DE RECONOCIMIENTOS Y FELICITACIONES CORPORATIVAS
// ============================================================

/**
 * Categorías de reconocimientos predefinidas
 */
export const recognitionCategories = mysqlTable("recognition_categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }), // Nombre del icono de lucide-react
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type RecognitionCategory = typeof recognitionCategories.$inferSelect;
export type InsertRecognitionCategory = typeof recognitionCategories.$inferInsert;

/**
 * Reconocimientos y felicitaciones entre empleados
 */
export const recognitions = mysqlTable("recognitions", {
  id: int("id").autoincrement().primaryKey(),
  fromUserId: int("from_user_id").notNull().references(() => users.id),
  toUserId: int("to_user_id").notNull().references(() => users.id),
  categoryId: int("category_id").notNull().references(() => recognitionCategories.id),
  type: mysqlEnum("type", ["reconocimiento", "felicitacion"]).notNull(),
  message: text("message").notNull(),
  isPublic: boolean("is_public").default(false).notNull(), // Visible en muro público
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("approved").notNull(),
  approvedBy: int("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  readAt: timestamp("read_at"), // Marca de tiempo cuando el destinatario leyó el reconocimiento
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Recognition = typeof recognitions.$inferSelect;
export type InsertRecognition = typeof recognitions.$inferInsert;

/**
 * Reacciones a reconocimientos (likes, aplausos, etc.)
 */
export const recognitionReactions = mysqlTable("recognition_reactions", {
  id: int("id").autoincrement().primaryKey(),
  recognitionId: int("recognition_id").notNull().references(() => recognitions.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id),
  reactionType: mysqlEnum("reaction_type", ["like", "applause", "heart", "star"]).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RecognitionReaction = typeof recognitionReactions.$inferSelect;
export type InsertRecognitionReaction = typeof recognitionReactions.$inferInsert;

/**
 * Evidencias manuales cargadas por el administrador para carpeta de evidencias STPS
 */
export const manualEvidences = mysqlTable("manual_evidences", {
  id: int("id").autoincrement().primaryKey(),
  numeral: varchar("numeral", { length: 10 }).notNull(), // "5.1", "5.2", etc.
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fileUrl: varchar("file_url", { length: 512 }).notNull(), // URL de S3
  fileKey: varchar("file_key", { length: 512 }).notNull(), // Key de S3 para eliminar
  fileName: varchar("file_name", { length: 255 }).notNull(), // Nombre original del archivo
  fileType: varchar("file_type", { length: 100 }), // MIME type
  uploadedBy: int("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export type ManualEvidence = typeof manualEvidences.$inferSelect;
export type InsertManualEvidence = typeof manualEvidences.$inferInsert;

/**
 * Tabla para almacenar evidencias manuales de NMX-R-025-SCFI-2015
 * Norma Mexicana de Igualdad Laboral y No Discriminación
 * Organizada por 5 ejes temáticos
 */
export const nmx025ManualEvidences = mysqlTable("nmx025_manual_evidences", {
  id: int("id").autoincrement().primaryKey(),
  eje: varchar("eje", { length: 50 }).notNull(), // "incorporacion", "igualdad", "hostigamiento", "accesibilidad", "libertad_sindical"
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fileUrl: varchar("file_url", { length: 512 }).notNull(), // URL de S3
  fileKey: varchar("file_key", { length: 512 }).notNull(), // Key de S3 para eliminar
  fileName: varchar("file_name", { length: 255 }).notNull(), // Nombre original del archivo
  fileType: varchar("file_type", { length: 100 }), // MIME type
  uploadedBy: int("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export type NMX025ManualEvidence = typeof nmx025ManualEvidences.$inferSelect;
export type InsertNMX025ManualEvidence = typeof nmx025ManualEvidences.$inferInsert;

/**
 * Encuestas de seguimiento post-caso
 * Se envían automáticamente 30/60/90 días después de cerrar un caso
 * para medir efectividad de intervenciones
 */
export const postCaseSurveys = mysqlTable("post_case_surveys", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("case_id").notNull().references(() => cases.id, { onDelete: "cascade" }),
  daysSinceClosure: int("days_since_closure").notNull(), // 30, 60 o 90
  status: mysqlEnum("status", ["pending", "sent", "completed", "expired"]).default("pending").notNull(),
  sentAt: timestamp("sent_at"),
  completedAt: timestamp("completed_at"),
  
  // Respuestas de la encuesta (escala 1-5)
  improvementRating: int("improvement_rating"), // ¿Ha mejorado la situación?
  satisfactionRating: int("satisfaction_rating"), // ¿Qué tan satisfecho está con la resolución?
  supportRating: int("support_rating"), // ¿Recibió el apoyo necesario?
  recommendationRating: int("recommendation_rating"), // ¿Recomendaría el proceso?
  
  // Comentarios adicionales
  comments: text("comments"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Fecha de expiración (7 días después de envío)
});

export type PostCaseSurvey = typeof postCaseSurveys.$inferSelect;
export type InsertPostCaseSurvey = typeof postCaseSurveys.$inferInsert;

/**
 * Job Executions - Historial de ejecuciones de jobs automáticos
 */
export const jobExecutions = mysqlTable("job_executions", {
  id: int("id").autoincrement().primaryKey(),
  jobName: varchar("job_name", { length: 100 }).notNull(), // Nombre del job
  status: mysqlEnum("status", ["running", "success", "failed"]).notNull(), // Estado de ejecución
  startedAt: timestamp("started_at").notNull(), // Inicio de ejecución
  completedAt: timestamp("completed_at"), // Fin de ejecución
  duration: int("duration"), // Duración en milisegundos
  result: json("result").$type<Record<string, any>>(), // Resultado de la ejecución (JSON)
  error: text("error"), // Mensaje de error (si falló)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type JobExecution = typeof jobExecutions.$inferSelect;
export type InsertJobExecution = typeof jobExecutions.$inferInsert;


/**
 * Root Cause Analysis - Análisis de Causas Raíz con IA
 * Almacena análisis automatizados de patrones en casos cerrados
 */
export const rootCauseAnalysis = mysqlTable("root_cause_analysis", {
  id: int("id").autoincrement().primaryKey(),
  analysisDate: timestamp("analysis_date").notNull(), // Fecha del análisis
  periodStart: date("period_start").notNull(), // Inicio del período analizado
  periodEnd: date("period_end").notNull(), // Fin del período analizado
  totalCasesAnalyzed: int("total_cases_analyzed").notNull(), // Total de casos analizados
  
  // Resultados del análisis (JSON estructurado)
  rootCauses: json("root_causes").$type<Array<{
    cause: string;
    frequency: number;
    percentage: number;
    affectedDepartments: string[];
    severity: "low" | "medium" | "high" | "critical";
  }>>().notNull(), // Causas raíz identificadas
  
  patterns: json("patterns").$type<Array<{
    pattern: string;
    description: string;
    casesAffected: number;
    departments: string[];
  }>>().notNull(), // Patrones detectados
  
  correlations: json("correlations").$type<Array<{
    factor1: string;
    factor2: string;
    correlationStrength: number; // 0-1
    description: string;
  }>>(), // Correlaciones entre factores
  
  recommendations: json("recommendations").$type<Array<{
    priority: "high" | "medium" | "low";
    recommendation: string;
    targetDepartments: string[];
    expectedImpact: string;
    actionItems: string[];
  }>>().notNull(), // Recomendaciones preventivas
  
  departmentInsights: json("department_insights").$type<Record<string, {
    totalCases: number;
    topCauses: string[];
    riskLevel: "low" | "medium" | "high" | "critical";
    specificRecommendations: string[];
  }>>(), // Insights por departamento
  
  llmModel: varchar("llm_model", { length: 100 }), // Modelo de IA utilizado
  analysisStatus: mysqlEnum("analysis_status", ["pending", "completed", "failed"]).default("pending").notNull(),
  errorMessage: text("error_message"), // Mensaje de error si falló
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type RootCauseAnalysis = typeof rootCauseAnalysis.$inferSelect;
export type InsertRootCauseAnalysis = typeof rootCauseAnalysis.$inferInsert;


// ============================================
// TABLAS DE CAPACITACIÓN DEL COMITÉ
// ============================================

/**
 * Catálogo de capacitaciones obligatorias para miembros del comité
 */
export const committeeTrainings = mysqlTable("committee_trainings", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(), // Título de la capacitación
  description: text("description"), // Descripción detallada
  type: mysqlEnum("type", ["mobbing", "burnout", "primeros_auxilios_psicologicos", "nom035", "investigacion", "otro"]).notNull(), // Tipo de capacitación
  duration: int("duration").notNull(), // Duración en horas
  validityMonths: int("validity_months"), // Vigencia en meses (null = sin vencimiento)
  isRequired: boolean("is_required").default(true).notNull(), // Si es obligatoria
  targetRoles: json("target_roles").$type<string[]>(), // Roles objetivo (committee, committee_coordinator, etc.)
  content: text("content"), // Contenido o temario
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type CommitteeTraining = typeof committeeTrainings.$inferSelect;
export type InsertCommitteeTraining = typeof committeeTrainings.$inferInsert;

/**
 * Asignaciones de capacitaciones a miembros del comité
 */
export const trainingAssignments = mysqlTable("training_assignments", {
  id: int("id").autoincrement().primaryKey(),
  trainingId: int("training_id").notNull().references(() => committeeTrainings.id, { onDelete: "cascade" }),
  committeeMemberId: int("committee_member_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  assignedDate: timestamp("assigned_date").defaultNow().notNull(), // Fecha de asignación
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "expired"]).default("pending").notNull(),
  startDate: timestamp("start_date"), // Fecha de inicio
  completionDate: timestamp("completion_date"), // Fecha de completación
  score: int("score"), // Calificación (0-100)
  notes: text("notes"), // Notas adicionales
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type TrainingAssignment = typeof trainingAssignments.$inferSelect;
export type InsertTrainingAssignment = typeof trainingAssignments.$inferInsert;

/**
 * Certificados digitales de capacitaciones completadas
 */
export const trainingCertificates = mysqlTable("training_certificates", {
  id: int("id").autoincrement().primaryKey(),
  assignmentId: int("assignment_id").notNull().references(() => trainingAssignments.id, { onDelete: "cascade" }),
  
  certificateNumber: varchar("certificate_number", { length: 50 }).notNull().unique(), // Número de certificado único
  issueDate: date("issue_date").notNull(), // Fecha de emisión
  expiryDate: date("expiry_date"), // Fecha de vencimiento (null = sin vencimiento)
  pdfUrl: text("pdf_url").notNull(), // URL del PDF en S3
  verificationCode: varchar("verification_code", { length: 100 }).notNull().unique(), // Código de verificación (UUID)
  signedBy: varchar("signed_by", { length: 255 }), // Nombre del firmante
  signerTitle: varchar("signer_title", { length: 255 }), // Cargo del firmante
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type TrainingCertificate = typeof trainingCertificates.$inferSelect;
export type InsertTrainingCertificate = typeof trainingCertificates.$inferInsert;


/**
 * Seguimiento de recomendaciones del análisis de causas raíz
 */
export const recommendationsTracking = mysqlTable("recommendations_tracking", {
  id: int("id").autoincrement().primaryKey(),
  analysisId: int("analysis_id").notNull().references(() => rootCauseAnalysis.id, { onDelete: "cascade" }),
  
  recommendation: text("recommendation").notNull(), // Texto de la recomendación
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  category: varchar("category", { length: 100 }), // Categoría (prevención, capacitación, proceso, etc.)
  
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  assignedTo: int("assigned_to").references(() => users.id, { onDelete: "set null" }), // Responsable
  dueDate: date("due_date"), // Fecha límite
  completionDate: date("completion_date"), // Fecha de completación
  
  // Métricas de efectividad
  targetCaseType: varchar("target_case_type", { length: 50 }), // Tipo de caso objetivo
  targetDepartmentId: int("target_department_id").references(() => departments.id, { onDelete: "set null" }),
  baselineCaseCount: int("baseline_case_count"), // Casos antes de implementar
  currentCaseCount: int("current_case_count"), // Casos después de implementar
  reductionPercentage: decimal("reduction_percentage", { precision: 5, scale: 2 }), // % de reducción
  
  notes: text("notes"), // Notas de seguimiento
  evidenceUrls: json("evidence_urls").$type<string[]>(), // URLs de evidencias
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});
export type RecommendationTracking = typeof recommendationsTracking.$inferSelect;
export type InsertRecommendationTracking = typeof recommendationsTracking.$inferInsert;


// Tabla de evaluaciones de capacitaciones del comité
export const trainingEvaluations = mysqlTable("training_evaluations", {
  id: int("id").autoincrement().primaryKey(),
  assignmentId: int("assignment_id").notNull().references(() => trainingAssignments.id, { onDelete: "cascade" }),
  evaluatorId: int("evaluator_id").notNull().references(() => users.id),
  
  // Evaluación del instructor
  instructorKnowledge: int("instructor_knowledge").notNull(), // 1-5
  instructorCommunication: int("instructor_communication").notNull(), // 1-5
  instructorEngagement: int("instructor_engagement").notNull(), // 1-5
  
  // Evaluación del contenido
  contentRelevance: int("content_relevance").notNull(), // 1-5
  contentClarity: int("content_clarity").notNull(), // 1-5
  contentDepth: int("content_depth").notNull(), // 1-5
  
  // Evaluación de aplicabilidad
  practicalApplication: int("practical_application").notNull(), // 1-5
  workplaceRelevance: int("workplace_relevance").notNull(), // 1-5
  
  // Evaluación general
  overallSatisfaction: int("overall_satisfaction").notNull(), // 1-5
  wouldRecommend: mysqlEnum("would_recommend", ["yes", "no", "maybe"]).notNull(),
  
  // Comentarios
  strengths: text("strengths"), // Fortalezas de la capacitación
  improvements: text("improvements"), // Áreas de mejora
  additionalComments: text("additional_comments"),
  
  createdAt: timestamp("created_at").defaultNow(),
});


// Tabla de alertas inteligentes con IA
export const intelligentAlerts = mysqlTable("intelligent_alerts", {
  id: int("id").autoincrement().primaryKey(),
  
  // Tipo de alerta
  alertType: mysqlEnum("alert_type", [
    "case_surge", // Aumento anormal de casos
    "training_satisfaction_drop", // Caída en satisfacción de capacitaciones
    "pending_recommendations", // Recomendaciones sin implementar
    "department_risk", // Riesgo departamental
    "compliance_issue", // Problema de cumplimiento
    "other" // Otro
  ]).notNull(),
  
  // Severidad de la alerta
  severity: mysqlEnum("severity", ["critical", "high", "medium", "low"]).notNull(),
  
  // Información de la alerta
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  
  // Contexto JSON con datos relevantes
  context: json("context").notNull(), // { departmentId, caseCount, trend, etc. }
  
  // Sugerencias de intervención generadas por IA
  suggestions: json("suggestions").notNull(), // Array de sugerencias
  
  // Estado de la alerta
  status: mysqlEnum("status", ["active", "resolved", "dismissed"]).notNull().default("active"),
  
  // Responsable asignado
  assignedTo: int("assigned_to").references(() => users.id),
  
  // Notas de resolución
  resolutionNotes: text("resolution_notes"),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: int("resolved_by").references(() => users.id),
  
  // Métricas de efectividad
  effectivenessScore: int("effectiveness_score"), // 1-100
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});


// Tabla de costos de capacitaciones para cálculo de ROI
export const trainingCosts = mysqlTable("training_costs", {
  id: int("id").primaryKey().autoincrement(),
  trainingId: int("training_id").notNull().references(() => committeeTrainings.id, { onDelete: "cascade" }),
  instructorCost: decimal("instructor_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  materialsCost: decimal("materials_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  facilitiesCost: decimal("facilities_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  laborHoursCost: decimal("labor_hours_cost", { precision: 10, scale: 2 }).notNull().default("0.00"), // Costo de horas laborales de participantes
  otherCosts: decimal("other_costs", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});


// Benchmarking Sectorial Tables
export const industrySectors = mysqlTable("industry_sectors", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sectorBenchmarks = mysqlTable("sector_benchmarks", {
  id: int("id").primaryKey().autoincrement(),
  sectorId: int("sector_id").notNull().references(() => industrySectors.id, { onDelete: "cascade" }),
  metricName: varchar("metric_name", { length: 100 }).notNull(), // e.g., "avg_cases_per_100_employees"
  metricValue: decimal("metric_value", { precision: 10, scale: 2 }).notNull(),
  metricUnit: varchar("metric_unit", { length: 50 }), // e.g., "casos", "porcentaje", "días"
  period: varchar("period", { length: 50 }), // e.g., "2024-Q4", "2025-Annual"
  source: varchar("source", { length: 255 }), // e.g., "STPS", "IMSS", "Estudio Sectorial"
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});


// Planes de Acción Correctiva Automatizados
export const correctiveActionPlans = mysqlTable("corrective_action_plans", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  
  // Origen del plan
  originType: mysqlEnum("origin_type", ["root_cause_analysis", "intelligent_alert", "manual_case", "recommendation"]).notNull(),
  originId: int("origin_id"), // ID del origen (rootCauseAnalysisId, intelligentAlertId, caseId, recommendationId)
  
  // Workflow
  status: mysqlEnum("status", ["draft", "assigned", "in_progress", "completed", "verified", "closed"]).notNull().default("draft"),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).notNull().default("medium"),
  
  // Responsables
  assignedTo: int("assigned_to").references(() => users.id), // Responsable principal
  verifiedBy: int("verified_by").references(() => users.id), // Verificador
  createdBy: int("created_by").notNull().references(() => users.id),
  
  // Fechas
  dueDate: timestamp("due_date").notNull(),
  completedAt: timestamp("completed_at"),
  verifiedAt: timestamp("verified_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  
  // Firmas digitales
  responsibleSignature: text("responsible_signature"), // Firma del responsable
  verifierSignature: text("verifier_signature"), // Firma del verificador
  verificationCode: varchar("verification_code", { length: 100 }), // Código único para auditorías
  
  // Métricas de efectividad
  effectivenessScore: int("effectiveness_score"), // 0-100
  notes: text("notes"),
});

export const actionEvidences = mysqlTable("action_evidences", {
  id: int("id").autoincrement().primaryKey(),
  planId: int("plan_id").notNull().references(() => correctiveActionPlans.id, { onDelete: "cascade" }),
  
  // Evidencia
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  fileUrl: varchar("file_url", { length: 500 }).notNull(), // URL en S3
  fileType: varchar("file_type", { length: 50 }).notNull(), // image/jpeg, application/pdf, etc.
  fileName: varchar("file_name", { length: 255 }).notNull(),
  
  // Metadata
  uploadedBy: int("uploaded_by").notNull().references(() => users.id),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});


// Tabla de análisis de impacto de intervenciones
export const interventionImpactAnalysis = mysqlTable("intervention_impact_analysis", {
  id: int("id").primaryKey().autoincrement(),
  interventionType: mysqlEnum("intervention_type", ["training", "policy_change", "organizational_change", "corrective_action", "awareness_campaign", "other"]).notNull(),
  interventionName: varchar("intervention_name", { length: 255 }).notNull(),
  description: text("description"),
  implementationDate: date("implementation_date").notNull(),
  targetDepartmentId: int("target_department_id"),
  targetArea: varchar("target_area", { length: 255 }),
  
  // Métricas antes de la intervención
  casesBeforeCount: int("cases_before_count").default(0),
  avgResolutionTimeBefore: int("avg_resolution_time_before"), // días
  climateScoreBefore: decimal("climate_score_before", { precision: 3, scale: 2 }), // 0-5
  satisfactionScoreBefore: decimal("satisfaction_score_before", { precision: 3, scale: 2 }), // 0-5
  
  // Métricas después de la intervención
  casesAfterCount: int("cases_after_count").default(0),
  avgResolutionTimeAfter: int("avg_resolution_time_after"), // días
  climateScoreAfter: decimal("climate_score_after", { precision: 3, scale: 2 }), // 0-5
  satisfactionScoreAfter: decimal("satisfaction_score_after", { precision: 3, scale: 2 }), // 0-5
  
  // Período de medición
  measurementPeriodMonths: int("measurement_period_months").default(3), // meses
  
  // Métricas calculadas
  caseReductionPercentage: decimal("case_reduction_percentage", { precision: 5, scale: 2 }),
  resolutionTimeImprovement: decimal("resolution_time_improvement", { precision: 5, scale: 2 }),
  climateScoreImprovement: decimal("climate_score_improvement", { precision: 5, scale: 2 }),
  satisfactionScoreImprovement: decimal("satisfaction_score_improvement", { precision: 5, scale: 2 }),
  effectivenessScore: decimal("effectiveness_score", { precision: 5, scale: 2 }), // 0-100
  
  // Insights generados por IA
  aiInsights: json("ai_insights").$type<{
    successFactors: string[];
    challenges: string[];
    recommendations: string[];
    predictedImpact: string;
  }>(),
  
  status: mysqlEnum("status", ["active", "completed", "archived"]).default("active"),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

/**
 * Historial de reportes compartidos
 * Registra quién compartió qué reporte, cuándo, a través de qué canal y a quién
 */
export const sharedReportsLog = mysqlTable("shared_reports_log", {
  id: int("id").autoincrement().primaryKey(),
  
  // Información del reporte
  reportUrl: text("report_url").notNull(),
  reportType: mysqlEnum("report_type", ["pdf", "excel"]).notNull(),
  reportCategory: varchar("report_category", { length: 100 }).notNull(), // 'intervention_impact', 'executive_dashboard', etc.
  
  // Canal de compartición
  shareChannel: mysqlEnum("share_channel", ["email", "linkedin", "twitter", "whatsapp", "other"]).notNull(),
  
  // Destinatarios (para email)
  recipients: json("recipients").$type<string[]>(), // Array de emails
  recipientCount: int("recipient_count").default(0),
  
  // Metadata del email (si aplica)
  emailSubject: text("email_subject"),
  emailMessage: text("email_message"),
  
  // Usuario que compartió
  sharedBy: int("shared_by").notNull(),
  sharedByName: varchar("shared_by_name", { length: 255 }),
  sharedByEmail: varchar("shared_by_email", { length: 320 }),
  
  // Filtros aplicados al reporte (JSON)
  appliedFilters: json("applied_filters").$type<{
    status?: string;
    interventionType?: string;
    dateRange?: { start: string; end: string };
    department?: string;
    [key: string]: any;
  }>(),
  
  // Métricas de engagement (futuro)
  viewCount: int("view_count").default(0),
  downloadCount: int("download_count").default(0),
  
  createdAt: timestamp("created_at").defaultNow(),
});


// Tabla de caché de reportes generados
export const reportCache = mysqlTable("report_cache", {
  id: int("id").primaryKey().autoincrement(),
  
  // Tipo de reporte
  reportType: mysqlEnum("report_type", ["intervention_impact_pdf", "intervention_impact_excel", "shared_reports_excel"]).notNull(),
  
  // Hash MD5 de los parámetros de entrada (para identificación única)
  paramsHash: varchar("params_hash", { length: 32 }).notNull().unique(),
  
  // Parámetros originales (JSON)
  params: json("params").$type<{
    status?: string;
    interventionType?: string;
    chartImages?: any;
    companyLogo?: string;
    [key: string]: any;
  }>(),
  
  // URL del reporte en S3
  reportUrl: text("report_url").notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  
  // Tamaño del archivo en bytes
  fileSize: int("file_size"),
  
  // Usuario que generó el reporte
  generatedBy: int("generated_by").notNull(),
  generatedByName: varchar("generated_by_name", { length: 255 }),
  
  // Contadores de uso
  hitCount: int("hit_count").default(0), // Cuántas veces se reutilizó desde caché
  
  // Expiración (24 horas por defecto)
  expiresAt: timestamp("expires_at").notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
  lastAccessedAt: timestamp("last_accessed_at").defaultNow(),
});


// Tabla de historial de reasignaciones masivas de departamentos
export const bulkReassignments = mysqlTable("bulk_reassignments", {
  id: int("id").primaryKey().autoincrement(),
  
  // Departamento origen y destino
  sourceDepartmentId: int("source_department_id"),
  sourceDepartmentName: varchar("source_department_name", { length: 255 }),
  targetDepartmentId: int("target_department_id").notNull(),
  targetDepartmentName: varchar("target_department_name", { length: 255 }).notNull(),
  
  // Usuario que realizó la reasignación
  performedBy: int("performed_by").notNull(),
  performedByName: varchar("performed_by_name", { length: 255 }).notNull(),
  
  // Motivo de la reasignación
  reason: text("reason"),
  
  // Cantidad de empleados afectados
  employeeCount: int("employee_count").notNull().default(0),
  
  // Fecha de la reasignación
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabla de detalles de reasignaciones masivas (empleados afectados)
export const bulkReassignmentDetails = mysqlTable("bulk_reassignment_details", {
  id: int("id").primaryKey().autoincrement(),
  
  // Referencia a la reasignación masiva
  reassignmentId: int("reassignment_id").notNull(),
  
  // Empleado afectado
  employeeId: int("employee_id").notNull(),
  employeeName: varchar("employee_name", { length: 255 }).notNull(),
  employeeEmail: varchar("employee_email", { length: 255 }),
  
  // Fecha de registro
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabla de alertas predictivas de rotación
export const predictiveTurnoverAlerts = mysqlTable("predictive_turnover_alerts", {
  id: int("id").primaryKey().autoincrement(),
  
  // Departamento analizado
  departmentId: int("department_id").notNull(),
  departmentName: varchar("department_name", { length: 255 }).notNull(),
  
  // Score de riesgo (0-100)
  riskScore: int("risk_score").notNull(), // 0-30: bajo, 31-60: medio, 61-100: alto
  
  // Métricas del análisis
  currentEmployeeCount: int("current_employee_count").notNull(),
  hiresLast3Months: int("hires_last_3_months").notNull(),
  terminationsLast3Months: int("terminations_last_3_months").notNull(),
  avgTenureMonths: decimal("avg_tenure_months", { precision: 10, scale: 2 }),
  
  // Predicción
  predictedTurnoverRate: decimal("predicted_turnover_rate", { precision: 5, scale: 2 }), // Porcentaje estimado de rotación
  recommendedActions: text("recommended_actions"), // JSON con recomendaciones
  
  // Estado de la alerta
  status: varchar("status", { length: 50 }).default("active"), // active, resolved, dismissed
  
  // Fechas
  analyzedAt: timestamp("analyzed_at").defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  
  // Notificaciones enviadas
  notificationsSent: int("notifications_sent").default(0),
  lastNotificationAt: timestamp("last_notification_at"),
});

// Tabla de configuración del algoritmo predictivo
export const predictiveAlgorithmConfig = mysqlTable("predictive_algorithm_config", {
  id: int("id").primaryKey().autoincrement(),
  
  // Nombre de la configuración
  configName: varchar("config_name", { length: 255 }).notNull().default("default"),
  
  // Pesos del algoritmo (deben sumar 100)
  rotationWeight: int("rotation_weight").notNull().default(40), // Peso de la tasa de rotación (%)
  tenureWeight: int("tenure_weight").notNull().default(30), // Peso de la antigüedad promedio (%)
  managerWeight: int("manager_weight").notNull().default(20), // Peso de ausencia de manager (%)
  teamSizeWeight: int("team_size_weight").notNull().default(10), // Peso del tamaño del equipo (%)
  
  // Umbrales de riesgo
  lowRiskThreshold: int("low_risk_threshold").notNull().default(30), // 0-30: bajo
  mediumRiskThreshold: int("medium_risk_threshold").notNull().default(60), // 31-60: medio
  highRiskThreshold: int("high_risk_threshold").notNull().default(100), // 61-100: alto
  
  // Metadata
  createdBy: int("created_by"), // Usuario que creó la configuración
  updatedBy: int("updated_by"), // Último usuario que actualizó
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Estado
  isActive: boolean("is_active").default(true), // Solo una configuración puede estar activa
});

// Tabla de histórico de predicciones del algoritmo
export const predictionHistory = mysqlTable("prediction_history", {
  id: int("id").primaryKey().autoincrement(),
  
  // Referencia al departamento
  departmentId: int("department_id").notNull(),
  departmentName: varchar("department_name", { length: 255 }).notNull(),
  
  // Predicción realizada
  predictedRiskScore: int("predicted_risk_score").notNull(), // Score de riesgo predicho (0-100)
  predictedTurnoverRate: decimal("predicted_turnover_rate", { precision: 5, scale: 2 }), // Tasa de rotación predicha (%)
  
  // Datos reales observados (se actualizan después de 3 meses)
  actualTurnoverRate: decimal("actual_turnover_rate", { precision: 5, scale: 2 }), // Tasa de rotación real (%)
  actualTerminations: int("actual_terminations"), // Bajas reales en el período
  
  // Métricas del análisis
  currentEmployeeCount: int("current_employee_count").notNull(),
  avgTenureMonths: decimal("avg_tenure_months", { precision: 10, scale: 2 }),
  hasManager: boolean("has_manager").notNull(),
  
  // Configuración del algoritmo utilizada
  algorithmConfigId: int("algorithm_config_id"),
  rotationWeight: int("rotation_weight").notNull(),
  tenureWeight: int("tenure_weight").notNull(),
  managerWeight: int("manager_weight").notNull(),
  teamSizeWeight: int("team_size_weight").notNull(),
  
  // Precisión de la predicción (se calcula después de 3 meses)
  accuracyScore: decimal("accuracy_score", { precision: 5, scale: 2 }), // Precisión de la predicción (%)
  predictionError: decimal("prediction_error", { precision: 5, scale: 2 }), // Error absoluto de la predicción
  
  // Fechas
  predictionDate: timestamp("prediction_date").notNull(), // Fecha de la predicción
  evaluationDate: timestamp("evaluation_date"), // Fecha de evaluación de precisión (3 meses después)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Estado
  status: varchar("status", { length: 50 }).default("pending"), // pending, evaluated
});

/**
 * ============================================================================
 * WHATSAPP TRACKING - Sistema de seguimiento de conversiones
 * ============================================================================
 */

/**
 * Tabla para registrar eventos de tracking de WhatsApp
 * Registra clics en botones de WhatsApp, normativas solicitadas y metadata
 */
export const whatsappTrackingEvents = mysqlTable("whatsapp_tracking_events", {
  id: int("id").primaryKey().autoincrement(),
  
  // Usuario (opcional, puede ser anónimo)
  userId: int("user_id"), // Null si es usuario anónimo
  
  // Tipo de evento
  eventType: varchar("event_type", { length: 50 }).notNull(), // 'click', 'demo_request', 'contact_request'
  
  // Normativas solicitadas (JSON array de códigos)
  normativas: json("normativas").$type<string[]>(), // ['nom-035', 'nmx-025', etc.]
  
  // Datos del usuario (si están disponibles)
  userData: json("user_data").$type<{
    nombre?: string;
    email?: string;
    empresa?: string;
    telefono?: string;
  }>(),
  
  // Metadata técnica
  metadata: json("metadata").$type<{
    userAgent?: string;
    referrer?: string;
    source?: string; // 'home', 'contact', 'demo', etc.
    buttonVariant?: string; // 'default', 'outline', etc.
  }>(),
  
  // Información de red
  userAgent: text("user_agent"),
  ipAddress: varchar("ip_address", { length: 45 }), // Soporta IPv6
  
  // Geolocalización (opcional)
  country: varchar("country", { length: 100 }),
  city: varchar("city", { length: 100 }),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  
  // Estado de conversión
  conversionStatus: varchar("conversion_status", { length: 50 }).default("pending"), // 'pending', 'converted', 'lost'
  convertedAt: timestamp("converted_at"),
  
  // Notas adicionales
  notes: text("notes"),
});

/**
 * ============================================================================
 * LEADS CRM - Sistema de seguimiento post-contacto
 * ============================================================================
 */

/**
 * Tabla para gestionar leads generados desde WhatsApp
 * Pipeline de ventas con seguimiento de estado y próximas acciones
 */
export const leads = mysqlTable("leads", {
  id: int("id").primaryKey().autoincrement(),
  
  // Referencia al evento de WhatsApp que generó el lead
  whatsappEventId: int("whatsapp_event_id"),
  
  // Información del contacto
  nombre: varchar("nombre", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  empresa: varchar("empresa", { length: 255 }),
  telefono: varchar("telefono", { length: 50 }),
  
  // Normativas de interés (JSON array)
  normativas: json("normativas").$type<string[]>(),
  
  // Estado del lead en el pipeline
  estado: varchar("estado", { length: 50 }).notNull().default("nuevo"), 
  // Estados: nuevo, contactado, en_negociacion, propuesta_enviada, ganado, perdido
  
  // Seguimiento
  fechaContacto: timestamp("fecha_contacto"),
  proximaAccion: timestamp("proxima_accion"),
  proximaAccionDescripcion: text("proxima_accion_descripcion"),
  
  // Notas y observaciones
  notas: text("notas"),
  
  // Asignación
  asignadoA: int("asignado_a"), // ID del usuario asignado
  asignadoNombre: varchar("asignado_nombre", { length: 255 }),
  
  // Origen del lead
  origen: varchar("origen", { length: 100 }), // 'whatsapp', 'contacto', 'landing_nom035', etc.
  
  // Valor estimado del negocio
  valorEstimado: decimal("valor_estimado", { precision: 10, scale: 2 }),
  
  // Probabilidad de cierre (0-100%)
  probabilidadCierre: int("probabilidad_cierre").default(0),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  
  // Fecha de cierre (cuando se gana o pierde)
  fechaCierre: timestamp("fecha_cierre"),
  
  // Razón de pérdida (si estado = perdido)
  razonPerdida: text("razon_perdida"),
});

/**
 * Tabla de vendedores para asignación automática de leads
 */
export const salespeople = mysqlTable("salespeople", {
  id: int("id").primaryKey().autoincrement(),
  
  // Vinculación con usuario (opcional)
  userId: int("user_id"),
  
  // Información del vendedor
  nombre: varchar("nombre", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  
  // Estado activo/inactivo para round-robin
  activo: boolean("activo").default(true).notNull(),
  
  // Tracking de asignaciones
  ultimaAsignacion: timestamp("ultima_asignacion"),
  totalLeadsAsignados: int("total_leads_asignados").default(0).notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

/**
 * Tabla de umbrales configurables por departamento
 * Para sistema de alertas tempranas
 */
export const departmentThresholds = mysqlTable("department_thresholds", {
  id: int("id").primaryKey().autoincrement(),
  
  // Departamento (null = umbral global por defecto)
  departmentId: int("department_id").references(() => departments.id, { onDelete: "cascade" }),
  
  // Umbrales de riesgo
  criticalCasesThreshold: int("critical_cases_threshold").default(5).notNull(), // Casos críticos para alerta
  openCasesThreshold: int("open_cases_threshold").default(10).notNull(), // Casos abiertos para alerta
  riskScoreThreshold: int("risk_score_threshold").default(70).notNull(), // Score de riesgo (0-100)
  avgResolutionDaysThreshold: int("avg_resolution_days_threshold").default(30).notNull(), // Días promedio de resolución
  
  // Configuración de notificaciones
  enableAlerts: boolean("enable_alerts").default(true).notNull(),
  alertRecipients: text("alert_recipients"), // JSON array de emails
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DepartmentThreshold = typeof departmentThresholds.$inferSelect;
export type InsertDepartmentThreshold = typeof departmentThresholds.$inferInsert;

/**
 * Tabla de configuración de reportes ejecutivos automatizados
 * Permite configurar frecuencia, destinatarios y habilitar/deshabilitar reportes
 */
export const reportConfigurations = mysqlTable("report_configurations", {
  id: int("id").primaryKey().autoincrement(),
  
  // Tipo de reporte
  reportType: varchar("report_type", { length: 50 }).notNull(), // 'executive_weekly', 'executive_monthly', 'departmental', etc.
  
  // Configuración de frecuencia
  frequency: varchar("frequency", { length: 20 }).notNull(), // 'weekly', 'monthly', 'quarterly', 'custom'
  customSchedule: varchar("custom_schedule", { length: 100 }), // Cron expression para frecuencias personalizadas
  
  // Configuración de destinatarios
  recipients: text("recipients").notNull(), // JSON array de emails
  ccRecipients: text("cc_recipients"), // JSON array de emails en copia
  
  // Estado y configuración
  enabled: boolean("enabled").default(true).notNull(),
  includeCharts: boolean("include_charts").default(true).notNull(),
  includeTrends: boolean("include_trends").default(true).notNull(),
  includeRecommendations: boolean("include_recommendations").default(true).notNull(),
  
  // Filtros y opciones
  departmentIds: text("department_ids"), // JSON array de IDs de departamentos (null = todos)
  dateRangeType: varchar("date_range_type", { length: 20 }).default('auto'), // 'auto', 'custom', 'last_7_days', 'last_30_days'
  
  // Metadata
  lastExecutedAt: timestamp("last_executed_at"),
  nextExecutionAt: timestamp("next_execution_at"),
  executionCount: int("execution_count").default(0).notNull(),
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: int("created_by").notNull(), // User ID
});

export type ReportConfiguration = typeof reportConfigurations.$inferSelect;
export type InsertReportConfiguration = typeof reportConfigurations.$inferInsert;

/**
 * Tabla de análisis de sentimiento en respuestas de encuestas NOM-035
 * Almacena resultados de análisis automático con LLM para detectar riesgo psicosocial
 */
export const sentimentAnalysis = mysqlTable("sentiment_analysis", {
  id: int("id").primaryKey().autoincrement(),
  
  // Referencia a respuesta de encuesta
  responseId: int("response_id").notNull().unique().references(() => surveyResponses.id),
  answerId: int("answer_id").references(() => surveyAnswers.id), // Respuesta específica analizada (si aplica)
  
  // Resultados del análisis
  sentiment: mysqlEnum("sentiment", ["positive", "neutral", "negative", "critical"]).notNull(),
  riskLevel: mysqlEnum("risk_level", ["low", "medium", "high", "critical"]).notNull(),
  confidence: decimal("confidence", { precision: 5, scale: 2 }), // Nivel de confianza del análisis (0-100)
  
  // Detalles del análisis
  keywords: text("keywords"), // JSON array de palabras clave detectadas
  riskIndicators: text("risk_indicators"), // JSON array de indicadores de riesgo (burnout, acoso, estrés)
  summary: text("summary"), // Resumen generado por LLM
  recommendations: text("recommendations"), // Recomendaciones generadas por LLM
  
  // Metadata
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
  alertGenerated: boolean("alert_generated").default(false).notNull(), // Si se generó alerta automática
  reviewedBy: int("reviewed_by").references(() => users.id), // Usuario que revisó el análisis
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
});

export type SentimentAnalysis = typeof sentimentAnalysis.$inferSelect;
export type InsertSentimentAnalysis = typeof sentimentAnalysis.$inferInsert;

// Relations para sentimentAnalysis
export const sentimentAnalysisRelations = relations(sentimentAnalysis, ({ one }) => ({
  response: one(surveyResponses, {
    fields: [sentimentAnalysis.responseId],
    references: [surveyResponses.id],
  }),
  answer: one(surveyAnswers, {
    fields: [sentimentAnalysis.answerId],
    references: [surveyAnswers.id],
  }),
  reviewer: one(users, {
    fields: [sentimentAnalysis.reviewedBy],
    references: [users.id],
  }),
}));

/**
 * Tabla de historial de reportes ejecutivos generados
 * Almacena metadata y archivos PDF de reportes generados manualmente o automáticamente
 */
export const executiveReportsHistory = mysqlTable("executive_reports_history", {
  id: int("id").primaryKey().autoincrement(),
  
  // Tipo y periodo del reporte
  reportType: mysqlEnum("report_type", ["weekly", "monthly", "quarterly", "custom"]).notNull(),
  periodLabel: varchar("period_label", { length: 100 }).notNull(), // "Semana 1 Enero 2026", "Enero 2026", etc.
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  
  // Archivo PDF generado
  fileUrl: text("file_url").notNull(), // URL de S3
  fileKey: varchar("file_key", { length: 500 }).notNull(), // Key de S3
  fileSize: int("file_size"), // Tamaño en bytes
  
  // Metadata del reporte
  generatedBy: int("generated_by").notNull().references(() => users.id),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  
  // Destinatarios (opcional, para envío por email)
  recipients: text("recipients"), // JSON array de emails
  emailSent: boolean("email_sent").default(false).notNull(),
  emailSentAt: timestamp("email_sent_at"),
  
  // Estadísticas incluidas en el reporte (JSON)
  reportData: text("report_data"), // JSON con KPIs y métricas
});

export type ExecutiveReportHistory = typeof executiveReportsHistory.$inferSelect;
export type InsertExecutiveReportHistory = typeof executiveReportsHistory.$inferInsert;

// Relations para executiveReportsHistory
export const executiveReportsHistoryRelations = relations(executiveReportsHistory, ({ one }) => ({
  generator: one(users, {
    fields: [executiveReportsHistory.generatedBy],
    references: [users.id],
  }),
}));




// Employee Turnover History - Historial de rotación de empleados
export const employeeTurnoverHistory = mysqlTable("employee_turnover_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull().references(() => users.id),
  exitDate: timestamp("exit_date").notNull(),
  exitReason: varchar("exit_reason", { length: 100 }), // voluntary, involuntary, retirement, etc.
  wasHighRisk: boolean("was_high_risk").default(false).notNull(), // Si fue identificado como alto riesgo antes de rotar
  riskScoreAtExit: int("risk_score_at_exit"), // Puntuación de riesgo al momento de salida (0-100)
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EmployeeTurnoverHistory = typeof employeeTurnoverHistory.$inferSelect;
export type InsertEmployeeTurnoverHistory = typeof employeeTurnoverHistory.$inferInsert;


// Model Thresholds Configuration - Configuración de umbrales del modelo predictivo
export const modelThresholds = mysqlTable("model_thresholds", {
  id: int("id").autoincrement().primaryKey(),
  
  // Pesos de la fórmula predictiva (deben sumar 100)
  criticalCommentsWeight: int("critical_comments_weight").notNull().default(40), // Peso de comentarios críticos (0-100)
  openCasesWeight: int("open_cases_weight").notNull().default(30), // Peso de casos abiertos (0-100)
  highRiskSurveysWeight: int("high_risk_surveys_weight").notNull().default(30), // Peso de encuestas de alto riesgo (0-100)
  
  // Umbrales de clasificación de riesgo
  highRiskThreshold: int("high_risk_threshold").notNull().default(70), // Score >= 70 = Alto riesgo
  mediumRiskThreshold: int("medium_risk_threshold").notNull().default(40), // Score >= 40 = Riesgo medio
  
  // Metadata
  description: text("description"), // Descripción de la configuración
  isActive: boolean("is_active").default(true).notNull(), // Solo una configuración activa a la vez
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ModelThresholds = typeof modelThresholds.$inferSelect;
export type InsertModelThresholds = typeof modelThresholds.$inferInsert;

// Relations para modelThresholds
export const modelThresholdsRelations = relations(modelThresholds, ({ one }) => ({
  creator: one(users, {
    fields: [modelThresholds.createdBy],
    references: [users.id],
  }),
}));

/**
 * Tabla: model_performance_alerts
 * Almacena alertas generadas cuando las métricas del modelo caen por debajo de umbrales críticos
 */
export const modelPerformanceAlerts = mysqlTable("model_performance_alerts", {
  id: int("id").primaryKey().autoincrement(),
  alertType: varchar("alert_type", { length: 50 }).notNull(), // precision_low, recall_low, f1_low, accuracy_low
  metricName: varchar("metric_name", { length: 50 }).notNull(), // precision, recall, f1Score, accuracy
  currentValue: decimal("current_value", { precision: 5, scale: 2 }).notNull(), // Valor actual de la métrica
  thresholdValue: decimal("threshold_value", { precision: 5, scale: 2 }).notNull(), // Umbral crítico configurado
  severity: varchar("severity", { length: 20 }).notNull(), // low, medium, high, critical
  message: text("message").notNull(), // Mensaje descriptivo de la alerta
  recommendation: text("recommendation"), // Recomendación de acción
  isResolved: boolean("is_resolved").default(false).notNull(),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: int("resolved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ModelPerformanceAlert = typeof modelPerformanceAlerts.$inferSelect;
export type InsertModelPerformanceAlert = typeof modelPerformanceAlerts.$inferInsert;

/**
 * Tabla: threshold_experiments
 * Almacena experimentos A/B de configuraciones de umbrales para comparar rendimiento
 */
export const thresholdExperiments = mysqlTable("threshold_experiments", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 100 }).notNull(), // Nombre del experimento
  description: text("description"), // Descripción del experimento
  configIdA: int("config_id_a").notNull(), // ID de la primera configuración a comparar
  configIdB: int("config_id_b").notNull(), // ID de la segunda configuración a comparar
  startDate: timestamp("start_date").notNull(), // Fecha de inicio del experimento
  endDate: timestamp("end_date"), // Fecha de fin del experimento (null si está activo)
  
  // Métricas de configuración A
  precisionA: decimal("precision_a", { precision: 5, scale: 2 }),
  recallA: decimal("recall_a", { precision: 5, scale: 2 }),
  f1ScoreA: decimal("f1_score_a", { precision: 5, scale: 2 }),
  accuracyA: decimal("accuracy_a", { precision: 5, scale: 2 }),
  
  // Métricas de configuración B
  precisionB: decimal("precision_b", { precision: 5, scale: 2 }),
  recallB: decimal("recall_b", { precision: 5, scale: 2 }),
  f1ScoreB: decimal("f1_score_b", { precision: 5, scale: 2 }),
  accuracyB: decimal("accuracy_b", { precision: 5, scale: 2 }),
  
  // Resultado del experimento
  winnerConfigId: int("winner_config_id"), // ID de la configuración ganadora
  conclusion: text("conclusion"), // Conclusiones del experimento
  
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, completed, cancelled
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ThresholdExperiment = typeof thresholdExperiments.$inferSelect;
export type InsertThresholdExperiment = typeof thresholdExperiments.$inferInsert;

/**
 * Tabla: model_retraining_history
 * Almacena historial de reentrena mientos automáticos del modelo predictivo
 */
export const modelRetrainingHistory = mysqlTable("model_retraining_history", {
  id: int("id").primaryKey().autoincrement(),
  oldConfigId: int("old_config_id").notNull(), // Configuración anterior
  newConfigId: int("new_config_id").notNull(), // Nueva configuración aplicada
  reason: text("reason").notNull(), // Razón del reentrenamiento
  
  // Métricas antes del reentrenamiento
  oldPrecision: decimal("old_precision", { precision: 5, scale: 2 }),
  oldRecall: decimal("old_recall", { precision: 5, scale: 2 }),
  oldF1Score: decimal("old_f1_score", { precision: 5, scale: 2 }),
  oldAccuracy: decimal("old_accuracy", { precision: 5, scale: 2 }),
  
  // Métricas después del reentrenamiento
  newPrecision: decimal("new_precision", { precision: 5, scale: 2 }),
  newRecall: decimal("new_recall", { precision: 5, scale: 2 }),
  newF1Score: decimal("new_f1_score", { precision: 5, scale: 2 }),
  newAccuracy: decimal("new_accuracy", { precision: 5, scale: 2 }),
  
  // Metadata
  alertCount: int("alert_count").notNull(), // Número de alertas que dispararon el reentrenamiento
  improvementPercentage: decimal("improvement_percentage", { precision: 5, scale: 2 }), // Mejora esperada en F1-Score
  status: varchar("status", { length: 20 }).default("applied").notNull(), // applied, reverted
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  revertedAt: timestamp("reverted_at"),
  createdBy: int("created_by"), // NULL si es automático
});

export type ModelRetrainingHistory = typeof modelRetrainingHistory.$inferSelect;
export type InsertModelRetrainingHistory = typeof modelRetrainingHistory.$inferInsert;

/**
 * Tabla: retention_interventions
 * Almacena intervenciones de retención aplicadas a empleados de alto riesgo
 */
export const retentionInterventions = mysqlTable("retention_interventions", {
  id: int("id").primaryKey().autoincrement(),
  employeeId: int("employee_id").notNull(), // ID del empleado
  employeeName: varchar("employee_name", { length: 255 }).notNull(),
  employeePosition: varchar("employee_position", { length: 255 }),
  department: varchar("department", { length: 255 }),
  
  // Tipo de intervención
  interventionType: varchar("intervention_type", { length: 100 }).notNull(), // training, salary_adjustment, position_change, benefits, recognition, other
  interventionDescription: text("intervention_description").notNull(),
  
  // Costos y fechas
  cost: decimal("cost", { precision: 10, scale: 2 }), // Costo de la intervención
  implementationDate: date("implementation_date").notNull(),
  followUpDate: date("follow_up_date"), // Fecha de seguimiento
  
  // Métricas antes de la intervención
  riskScoreBefore: decimal("risk_score_before", { precision: 5, scale: 2 }), // Riesgo de rotación antes (0-100)
  turnoverProbabilityBefore: decimal("turnover_probability_before", { precision: 5, scale: 2 }), // Probabilidad de rotación antes (0-100)
  
  // Métricas después de la intervención
  riskScoreAfter: decimal("risk_score_after", { precision: 5, scale: 2 }), // Riesgo de rotación después (0-100)
  turnoverProbabilityAfter: decimal("turnover_probability_after", { precision: 5, scale: 2 }), // Probabilidad de rotación después (0-100)
  
  // Outcome
  outcome: varchar("outcome", { length: 50 }), // retained, left, pending
  outcomeDate: date("outcome_date"), // Fecha del outcome
  outcomeNotes: text("outcome_notes"), // Notas adicionales sobre el resultado
  
  // Efectividad calculada
  riskReduction: decimal("risk_reduction", { precision: 5, scale: 2 }), // Reducción de riesgo (%)
  effectivenessScore: decimal("effectiveness_score", { precision: 5, scale: 2 }), // Score de efectividad (0-100)
  
  // Metadata
  createdBy: int("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type RetentionIntervention = typeof retentionInterventions.$inferSelect;
export type InsertRetentionIntervention = typeof retentionInterventions.$inferInsert;

/**
 * Tabla: payroll_data
 * Almacena datos de compensación y beneficios de empleados para análisis de correlación con riesgo de rotación
 */
export const payrollData = mysqlTable("payroll_data", {
  id: int("id").primaryKey().autoincrement(),
  employeeId: int("employee_id").notNull().unique(), // ID del empleado (único)
  employeeName: varchar("employee_name", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }),
  position: varchar("position", { length: 255 }),
  
  // Compensación
  salary: decimal("salary", { precision: 10, scale: 2 }).notNull(), // Salario mensual bruto
  benefits: decimal("benefits", { precision: 10, scale: 2 }), // Valor mensual de beneficios
  totalCompensation: decimal("total_compensation", { precision: 10, scale: 2 }), // Salario + beneficios
  
  // Historial salarial
  lastRaiseDate: date("last_raise_date"), // Fecha del último aumento
  lastRaisePercentage: decimal("last_raise_percentage", { precision: 5, scale: 2 }), // Porcentaje del último aumento
  monthsSinceLastRaise: int("months_since_last_raise"), // Meses desde el último aumento
  
  // Comparación con mercado
  marketRate: decimal("market_rate", { precision: 10, scale: 2 }), // Tasa de mercado para el puesto
  salaryGapPercentage: decimal("salary_gap_percentage", { precision: 5, scale: 2 }), // Brecha salarial (%)
  salaryGapStatus: varchar("salary_gap_status", { length: 50 }), // below_market, at_market, above_market
  
  // Alertas
  compensationRiskLevel: varchar("compensation_risk_level", { length: 50 }), // low, medium, high, critical
  requiresReview: boolean("requires_review").default(false), // Requiere revisión salarial
  
  // Metadata
  lastUpdated: timestamp("last_updated").defaultNow().onUpdateNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type PayrollData = typeof payrollData.$inferSelect;
export type InsertPayrollData = typeof payrollData.$inferInsert;

// Historial de reportes de compensación generados
export const compensationReportsHistory = mysqlTable("compensation_reports_history", {
  id: int("id").autoincrement().primaryKey(),
  
  // Metadata del reporte
  reportDate: timestamp("report_date").defaultNow().notNull(),
  generatedBy: int("generated_by").notNull(), // user ID
  
  // Estadísticas del reporte
  totalEmployees: int("total_employees").notNull(),
  criticalGaps: int("critical_gaps").notNull(),
  highRiskCount: int("high_risk_count").notNull(),
  totalAdjustmentCost: decimal("total_adjustment_cost", { precision: 12, scale: 2 }),
  
  // Archivo PDF
  pdfUrl: text("pdf_url").notNull(),
  pdfKey: text("pdf_key").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CompensationReportsHistory = typeof compensationReportsHistory.$inferSelect;
export type InsertCompensationReportsHistory = typeof compensationReportsHistory.$inferInsert;

// Historial de cambios salariales para análisis de tendencias
export const salaryHistory = mysqlTable("salary_history", {
  id: int("id").autoincrement().primaryKey(),
  
  // Empleado
  employeeId: int("employee_id").notNull(),
  employeeName: varchar("employee_name", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }),
  position: varchar("position", { length: 255 }),
  
  // Datos salariales
  previousSalary: decimal("previous_salary", { precision: 10, scale: 2 }),
  newSalary: decimal("new_salary", { precision: 10, scale: 2 }).notNull(),
  adjustmentPercentage: decimal("adjustment_percentage", { precision: 5, scale: 2 }),
  adjustmentType: varchar("adjustment_type", { length: 50 }), // annual_review, promotion, market_adjustment, retention
  
  // Contexto de mercado
  marketRate: decimal("market_rate", { precision: 10, scale: 2 }),
  salaryGapPercentage: decimal("salary_gap_percentage", { precision: 5, scale: 2 }),
  
  // Metadata
  effectiveDate: date("effective_date").notNull(),
  reason: text("reason"),
  approvedBy: int("approved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SalaryHistory = typeof salaryHistory.$inferSelect;
export type InsertSalaryHistory = typeof salaryHistory.$inferInsert;

// Alertas de riesgo de ofertas externas
export const externalOfferRiskAlerts = mysqlTable("external_offer_risk_alerts", {
  id: int("id").autoincrement().primaryKey(),
  
  // Empleado
  employeeId: int("employee_id").notNull(),
  employeeName: varchar("employee_name", { length: 255 }).notNull(),
  department: varchar("department", { length: 255 }),
  position: varchar("position", { length: 255 }),
  
  // Factores de riesgo
  salaryGapPercentage: decimal("salary_gap_percentage", { precision: 5, scale: 2 }),
  monthsSinceLastRaise: int("months_since_last_raise"),
  skillLevel: varchar("skill_level", { length: 50 }), // junior, mid, senior, expert
  marketDemand: varchar("market_demand", { length: 50 }), // low, medium, high, critical
  turnoverProbability: decimal("turnover_probability", { precision: 5, scale: 2 }),
  
  // Nivel de riesgo
  riskLevel: varchar("risk_level", { length: 50 }).notNull(), // low, medium, high, critical
  riskScore: decimal("risk_score", { precision: 5, scale: 2 }).notNull(), // 0-100
  
  // Recomendaciones
  recommendedAction: text("recommended_action"),
  estimatedTimeToOffer: int("estimated_time_to_offer"), // días estimados
  
  // Estado
  status: varchar("status", { length: 50 }).default("active").notNull(), // active, resolved, dismissed
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  
  // Metadata
  alertDate: timestamp("alert_date").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().onUpdateNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExternalOfferRiskAlerts = typeof externalOfferRiskAlerts.$inferSelect;
export type InsertExternalOfferRiskAlerts = typeof externalOfferRiskAlerts.$inferInsert;

// Escenarios de planificación presupuestaria de ajustes salariales
export const budgetAdjustmentScenarios = mysqlTable("budget_adjustment_scenarios", {
  id: int("id").autoincrement().primaryKey(),
  
  // Metadata del escenario
  scenarioName: varchar("scenario_name", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: int("created_by").notNull(),
  
  // Presupuesto
  totalBudget: decimal("total_budget", { precision: 12, scale: 2 }).notNull(),
  budgetUsed: decimal("budget_used", { precision: 12, scale: 2 }).default("0"),
  budgetRemaining: decimal("budget_remaining", { precision: 12, scale: 2 }),
  
  // Ajustes incluidos (JSON array de employee IDs y montos)
  adjustments: json("adjustments"), // [{employeeId, employeeName, currentSalary, newSalary, increase, priority}]
  
  // Secuencia óptima (orden de implementación)
  implementationSequence: json("implementation_sequence"), // [employeeId1, employeeId2, ...]
  
  // Métricas del escenario
  totalEmployeesAffected: int("total_employees_affected").default(0),
  averageIncreasePercentage: decimal("average_increase_percentage", { precision: 5, scale: 2 }),
  highRiskEmployeesCovered: int("high_risk_employees_covered").default(0),
  estimatedRetentionRate: decimal("estimated_retention_rate", { precision: 5, scale: 2 }),
  
  // ROI proyectado
  estimatedTurnoverCostSavings: decimal("estimated_turnover_cost_savings", { precision: 12, scale: 2 }),
  roi: decimal("roi", { precision: 5, scale: 2 }), // (savings - cost) / cost * 100
  
  // Estado
  status: varchar("status", { length: 50 }).default("draft").notNull(), // draft, approved, implemented
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at"),
  implementedAt: timestamp("implemented_at"),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().onUpdateNow(),
});

export type BudgetAdjustmentScenarios = typeof budgetAdjustmentScenarios.$inferSelect;
export type InsertBudgetAdjustmentScenarios = typeof budgetAdjustmentScenarios.$inferInsert;

// Análisis de Equidad Salarial (NMX-R-025-SCFI-2015)
// Detecta brechas salariales por género, edad y antigüedad
export const salaryEquityAnalysis = mysqlTable("salary_equity_analysis", {
  id: int("id").autoincrement().primaryKey(),
  
  // Metadata del análisis
  analysisDate: timestamp("analysis_date").defaultNow().notNull(),
  analyzedBy: int("analyzed_by").notNull(),
  
  // Análisis por Género
  maleAverageSalary: decimal("male_average_salary", { precision: 12, scale: 2 }),
  femaleAverageSalary: decimal("female_average_salary", { precision: 12, scale: 2 }),
  genderPayGapPercentage: decimal("gender_pay_gap_percentage", { precision: 5, scale: 2 }), // (male - female) / male * 100
  genderEquityScore: int("gender_equity_score").default(0), // 0-100
  
  // Análisis por Edad
  ageGroupAnalysis: json("age_group_analysis").$type<Array<{
    ageRange: string; // "18-25", "26-35", "36-45", "46-55", "56+"
    averageSalary: number;
    employeeCount: number;
    gapPercentage: number;
  }>>(),
  ageEquityScore: int("age_equity_score").default(0), // 0-100
  
  // Análisis por Antigüedad
  tenureGroupAnalysis: json("tenure_group_analysis").$type<Array<{
    tenureRange: string; // "0-1", "1-3", "3-5", "5-10", "10+"
    averageSalary: number;
    employeeCount: number;
    gapPercentage: number;
  }>>(),
  tenureEquityScore: int("tenure_equity_score").default(0), // 0-100
  
  // Casos Críticos de Inequidad
  criticalCases: json("critical_cases").$type<Array<{
    employeeId: number;
    employeeName: string;
    department: string;
    position: string;
    gender: string;
    age: number;
    tenure: number;
    currentSalary: number;
    expectedSalary: number;
    gapPercentage: number;
    inequityType: "gender" | "age" | "tenure" | "multiple";
  }>>(),
  
  // Índice de Equidad Global
  globalEquityIndex: int("global_equity_index").default(0), // 0-100, promedio ponderado
  
  // Cumplimiento NMX-R-025-SCFI-2015
  nmxComplianceStatus: varchar("nmx_compliance_status", { length: 50 }).default("non_compliant"), // compliant, partial, non_compliant
  complianceScore: int("compliance_score").default(0), // 0-100
  
  // Recomendaciones
  recommendations: json("recommendations").$type<Array<{
    priority: "high" | "medium" | "low";
    category: string;
    description: string;
    estimatedCost: number;
    expectedImpact: string;
  }>>(),
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SalaryEquityAnalysis = typeof salaryEquityAnalysis.$inferSelect;
export type InsertSalaryEquityAnalysis = typeof salaryEquityAnalysis.$inferInsert;

// Historial de Reportes de Equidad Salarial
export const equityReportsHistory = mysqlTable("equity_reports_history", {
  id: int("id").autoincrement().primaryKey(),
  analysisId: int("analysis_id").notNull().references(() => salaryEquityAnalysis.id),
  reportUrl: varchar("report_url", { length: 512 }).notNull(), // URL de S3
  reportKey: varchar("report_key", { length: 512 }).notNull(), // Key de S3
  generatedBy: int("generated_by").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
});

export type EquityReportsHistory = typeof equityReportsHistory.$inferSelect;
export type InsertEquityReportsHistory = typeof equityReportsHistory.$inferInsert;

// ============================================
// CLIMA LABORAL (ORGANIZATIONAL CLIMATE)
// ============================================

// Encuestas de Clima Organizacional
export const organizationalClimateSurveys = mysqlTable("organizational_climate_surveys", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  
  // Dimensiones de evaluación
  dimensions: json("dimensions").$type<Array<{
    id: string;
    name: string;
    questions: Array<{
      id: string;
      text: string;
      type: "likert" | "yes_no" | "open";
    }>;
  }>>().notNull(),
  
  // Configuración
  frequency: varchar("frequency", { length: 50 }).default("quarterly"), // monthly, quarterly, semiannual, annual
  isActive: boolean("is_active").default(true),
  
  // Metadata
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type OrganizationalClimateSurvey = typeof organizationalClimateSurveys.$inferSelect;
export type InsertOrganizationalClimateSurvey = typeof organizationalClimateSurveys.$inferInsert;

// Respuestas de Encuestas de Clima
export const climateSurveyResponses = mysqlTable("climate_survey_responses", {
  id: int("id").autoincrement().primaryKey(),
  surveyId: int("survey_id").notNull().references(() => organizationalClimateSurveys.id),
  employeeId: int("employee_id").notNull(),
  
  // Respuestas por dimensión
  responses: json("responses").$type<Record<string, {
    dimensionId: string;
    dimensionName: string;
    answers: Record<string, string | number>;
    score: number; // 0-100 por dimensión
  }>>().notNull(),
  
  // Score global
  overallScore: int("overall_score").notNull(), // 0-100
  
  // Metadata
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export type ClimateSurveyResponse = typeof climateSurveyResponses.$inferSelect;
export type InsertClimateSurveyResponse = typeof climateSurveyResponses.$inferInsert;

// Análisis de Clima Organizacional
export const climateAnalysis = mysqlTable("climate_analysis", {
  id: int("id").autoincrement().primaryKey(),
  surveyId: int("survey_id").notNull().references(() => organizationalClimateSurveys.id),
  period: varchar("period", { length: 50 }).notNull(), // "2026-Q1", "2026-02", etc.
  
  // Índice de Clima Laboral Global
  climateIndex: int("climate_index").notNull(), // 0-100
  
  // Scores por dimensión
  dimensionScores: json("dimension_scores").$type<Record<string, {
    dimensionId: string;
    dimensionName: string;
    score: number; // 0-100
    participationRate: number; // % de empleados que respondieron
    trend: "improving" | "stable" | "declining";
  }>>().notNull(),
  
  // Correlaciones con otras métricas
  correlations: json("correlations").$type<{
    climateVsRotation: { correlation: number; significance: string };
    climateVsEquity: { correlation: number; significance: string };
    climateVsProductivity: { correlation: number; significance: string };
  }>(),
  
  // Áreas críticas
  criticalAreas: json("critical_areas").$type<Array<{
    dimension: string;
    score: number;
    affectedEmployees: number;
    recommendations: string[];
  }>>(),
  
  // Metadata
  analyzedAt: timestamp("analyzed_at").defaultNow().notNull(),
});

export type ClimateAnalysis = typeof climateAnalysis.$inferSelect;
export type InsertClimateAnalysis = typeof climateAnalysis.$inferInsert;

// ============================================
// PLANES DE CARRERA (CAREER PLANNING)
// ============================================

// Rutas de Carrera Organizacionales
export const careerPaths = mysqlTable("career_paths", {
  id: int("id").autoincrement().primaryKey(),
  pathName: varchar("path_name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Posiciones en la ruta
  positions: json("positions").$type<Array<{
    level: number;
    positionId: number;
    positionName: string;
    requiredCompetencies: Array<{
      competencyId: number;
      competencyName: string;
      minimumLevel: number; // 1-5
    }>;
    estimatedTimeMonths: number;
  }>>().notNull(),
  
  // Requisitos generales
  minimumEducation: varchar("minimum_education", { length: 100 }),
  minimumExperience: int("minimum_experience"), // Meses
  
  // Metadata
  isActive: boolean("is_active").default(true),
  createdBy: int("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type CareerPath = typeof careerPaths.$inferSelect;
export type InsertCareerPath = typeof careerPaths.$inferInsert;

// Planes de Carrera Individuales
export const employeeCareerPlans = mysqlTable("employee_career_plans", {
  id: int("id").autoincrement().primaryKey(),
  employeeId: int("employee_id").notNull(),
  pathId: int("path_id").notNull().references(() => careerPaths.id),
  
  // Estado actual
  currentLevel: int("current_level").notNull(),
  targetLevel: int("target_level").notNull(),
  
  // Brechas de competencias
  competencyGaps: json("competency_gaps").$type<Array<{
    competencyId: number;
    competencyName: string;
    currentLevel: number;
    requiredLevel: number;
    gap: number;
    recommendedCourses: Array<{
      courseId: number;
      courseName: string;
      duration: number;
    }>;
  }>>(),
  
  // Hitos de desarrollo
  milestones: json("milestones").$type<Array<{
    id: string;
    title: string;
    description: string;
    targetDate: string;
    status: "pending" | "in_progress" | "completed";
    completedDate?: string;
  }>>(),
  
  // Proyección de vacantes
  projectedVacancies: json("projected_vacancies").$type<Array<{
    positionId: number;
    positionName: string;
    estimatedOpeningDate: string;
    probability: number; // 0-100
  }>>(),
  
  // Metadata
  status: varchar("status", { length: 50 }).default("active"), // active, on_hold, completed, cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type EmployeeCareerPlan = typeof employeeCareerPlans.$inferSelect;
export type InsertEmployeeCareerPlan = typeof employeeCareerPlans.$inferInsert;


// ============================================
// CSRF VIOLATIONS (SECURITY LOGGING)
// ============================================

/**
 * Tabla para registrar intentos fallidos de validación CSRF
 * Permite detectar patrones de ataque y generar alertas de seguridad
 */
export const csrfViolations = mysqlTable("csrf_violations", {
  id: int("id").autoincrement().primaryKey(),
  
  // Información del intento fallido
  token: varchar("token", { length: 128 }), // Token inválido o expirado
  userId: varchar("user_id", { length: 64 }), // Usuario asociado (si existe)
  
  // Información de la request
  ipAddress: varchar("ip_address", { length: 45 }).notNull(), // IPv4 o IPv6
  userAgent: text("user_agent"), // Navegador y sistema operativo
  endpoint: varchar("endpoint", { length: 255 }), // Endpoint que se intentó acceder
  method: varchar("method", { length: 10 }), // GET, POST, PUT, DELETE
  
  // Razón del fallo
  reason: mysqlEnum("reason", [
    "missing_token",      // Token no presente en header
    "invalid_token",      // Token no existe en tokenStore
    "expired_token",      // Token expirado
    "user_mismatch",      // Token pertenece a otro usuario
    "malformed_token"     // Token con formato inválido
  ]).notNull(),
  
  // Metadata
  attemptedAt: timestamp("attempted_at").defaultNow().notNull(),
});

export type CsrfViolation = typeof csrfViolations.$inferSelect;
export type InsertCsrfViolation = typeof csrfViolations.$inferInsert;


/**
 * Tabla para registrar alertas de patrones de ataque CSRF detectados
 * Se genera una alerta cuando se detectan >10 intentos fallidos/hora desde la misma IP
 */
export const csrfAlerts = mysqlTable("csrf_alerts", {
  id: int("id").autoincrement().primaryKey(),
  
  // Información del atacante
  ipAddress: varchar("ip_address", { length: 45 }).notNull(), // IP del atacante
  
  // Estadísticas del ataque
  violationCount: int("violation_count").notNull(), // Número de intentos fallidos
  firstAttempt: timestamp("first_attempt").notNull(), // Primera violación detectada
  lastAttempt: timestamp("last_attempt").notNull(), // Última violación detectada
  
  // Endpoints afectados
  affectedEndpoints: json("affected_endpoints").$type<string[]>().notNull(), // Lista de endpoints atacados
  
  // Estado de la alerta
  status: mysqlEnum("status", [
    "pending",      // Alerta generada, pendiente de revisión
    "investigating", // En investigación
    "resolved",     // Resuelta
    "false_positive" // Falso positivo
  ]).default("pending").notNull(),
  
  // Acciones tomadas
  actionTaken: text("action_taken"), // Descripción de acciones tomadas
  resolvedBy: varchar("resolved_by", { length: 64 }), // Usuario que resolvió la alerta
  resolvedAt: timestamp("resolved_at"), // Fecha de resolución
  
  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type CsrfAlert = typeof csrfAlerts.$inferSelect;
export type InsertCsrfAlert = typeof csrfAlerts.$inferInsert;


/**
 * Tabla para evaluaciones de Matriz Nine Box
 * Clasifica empleados según desempeño (performance) y potencial (potential)
 * Metodología: 9 cuadrantes (3x3) para identificar talento y planificar desarrollo
 */
export const nineBoxEvaluations = mysqlTable("nine_box_evaluations", {
  id: int("id").autoincrement().primaryKey(),
  
  // Empleado evaluado
  employeeId: int("employee_id").notNull(),
  
  // Scores de evaluación (escala 1-3: bajo/medio/alto)
  performanceScore: int("performance_score").notNull(), // 1=Bajo, 2=Medio, 3=Alto desempeño
  potentialScore: int("potential_score").notNull(),     // 1=Bajo, 2=Medio, 3=Alto potencial
  
  // Clasificación automática por cuadrante (1-9)
  // Cuadrantes: 1=Bajo-Bajo, 2=Bajo-Medio, 3=Bajo-Alto, 4=Medio-Bajo, 5=Medio-Medio (Core), 
  //             6=Medio-Alto, 7=Alto-Bajo, 8=Alto-Medio, 9=Alto-Alto (High Potential)
  quadrant: int("quadrant").notNull(),
  
  // Etiquetas de cuadrante para UI
  quadrantLabel: varchar("quadrant_label", { length: 50 }).notNull(), // Ej: "High Potential", "Core Performer", "Under Performer"
  
  // Plan de desarrollo personalizado
  developmentPlan: text("development_plan"), // Recomendaciones específicas según cuadrante
  
  // Metadata de evaluación
  evaluationDate: date("evaluation_date").notNull(),
  evaluatedBy: int("evaluated_by").notNull(), // ID del evaluador
  notes: text("notes"), // Notas adicionales del evaluador
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type NineBoxEvaluation = typeof nineBoxEvaluations.$inferSelect;
export type InsertNineBoxEvaluation = typeof nineBoxEvaluations.$inferInsert;


/**
 * Survey Employee Tokens table
 * Tokens personalizados para encuestas NOM-035 con autenticación CURP
 * Cada token está asociado a un empleado específico
 */
export const surveyEmployeeTokens = mysqlTable("survey_employee_tokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(), // UUID único
  employeeId: int("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }), // Empleado asociado
  curp: varchar("curp", { length: 18 }).notNull(), // CURP para autenticación
  surveyPeriodId: int("survey_period_id").notNull().references(() => surveyPeriods.id, { onDelete: "cascade" }), // Período de encuesta
  surveyType: varchar("survey_type", { length: 50 }).notNull(), // 'guia_i', 'guia_ii', 'guia_iii'
  expiresAt: timestamp("expires_at").notNull(), // Fecha de expiración
  usedAt: timestamp("used_at"), // Fecha en que se usó el token (null si no usado)
  isRevoked: boolean("is_revoked").notNull().default(false), // Revocación manual
  generatedBy: int("generated_by").notNull().references(() => users.id), // Admin que generó el token
  notes: text("notes"), // Notas opcionales
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SurveyEmployeeToken = typeof surveyEmployeeTokens.$inferSelect;
export type InsertSurveyEmployeeToken = typeof surveyEmployeeTokens.$inferInsert;
