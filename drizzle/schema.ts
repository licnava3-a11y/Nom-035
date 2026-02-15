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
  departamento: varchar("departamento", { length: 255 }),
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
  departamento: varchar("departamento", { length: 255 }),
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
  departamento: varchar("departamento", { length: 255 }),
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
  departamento: varchar("departamento", { length: 255 }),
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
  departamento: varchar("departamento", { length: 255 }),
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
