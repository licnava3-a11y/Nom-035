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
  role: mysqlEnum("role", [
    "admin", 
    "instructor", 
    "student", 
    "committee", 
    "committee_member", 
    "committee_coordinator",
    // Roles NOM-035 específicos
    "director",
    "responsable_nom035",
    "supervisor",
    "jefe_area",
    "recursos_humanos",
    "demo"
  ]).default("student").notNull(),
  
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
 * Departments table - Organizational departments catalog
 * Master catalog of all departments in the organization
 */
export const departments = mysqlTable("departments", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  code: varchar("code", { length: 50 }).unique(), // Código del departamento (ej: "RH", "IT", "FIN")
  managerId: int("managerId"), // Jefe del departamento (self-reference a employees)
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Department = typeof departments.$inferSelect;
export type InsertDepartment = typeof departments.$inferInsert;

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
  department: varchar("department", { length: 100 }),
  position: varchar("position", { length: 100 }),
  hireDate: date("hireDate"),
  contractType: mysqlEnum("contractType", ["permanent", "temporary", "contract"]).default("permanent"),
  contract1ExpirationDate: date("contract1ExpirationDate"),
  contract2ExpirationDate: date("contract2ExpirationDate"),
  contract3ExpirationDate: date("contract3ExpirationDate"),
  
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
  // Campos de metadata de evaluación NOM-035
  fecha: varchar('fecha', { length: 10 }), // Fecha de evaluación (ISO 8601: "2024-01-15")
  periodo: varchar('periodo', { length: 20 }), // Periodo de evaluación ("Q1-2024")
  version_nom: varchar('version_nom', { length: 50 }).default('NOM-035-STPS-2018'), // Versión de la norma
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
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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


// ============================================================================
// SISTEMA DE ROLES Y PERMISOS GRANULARES NOM-035
// ============================================================================

/**
 * Role Permissions - Permisos por rol (matriz de permisos)
 * Define qué puede hacer cada rol en cada módulo del sistema
 */
export const rolePermissions = mysqlTable("role_permissions", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", [
    "admin",
    "director",
    "responsable_nom035",
    "supervisor",
    "jefe_area",
    "recursos_humanos",
    "demo"
  ]).notNull(),
  module: mysqlEnum("module", [
    "employees",    // Gestión de empleados
    "surveys",      // Encuestas NOM-035
    "cases",        // Casos de riesgo psicosocial
    "courses",      // Cursos de capacitación
    "reports",      // Reportes y análisis
    "committee",    // Comité de atención
    "company",      // Datos de la empresa
    "admin"         // Administración del sistema
  ]).notNull(),
  canView: boolean("can_view").default(false).notNull(),
  canCreate: boolean("can_create").default(false).notNull(),
  canEdit: boolean("can_edit").default(false).notNull(),
  canDelete: boolean("can_delete").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type RolePermission = typeof rolePermissions.$inferSelect;
export type InsertRolePermission = typeof rolePermissions.$inferInsert;

/**
 * User Permissions - Permisos específicos por usuario (override de permisos de rol)
 * Permite asignar permisos personalizados a usuarios individuales
 */
export const userPermissions = mysqlTable("user_permissions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id).notNull(),
  module: mysqlEnum("module", [
    "employees",
    "surveys",
    "cases",
    "courses",
    "reports",
    "committee",
    "company",
    "admin"
  ]).notNull(),
  canView: boolean("can_view").default(false).notNull(),
  canCreate: boolean("can_create").default(false).notNull(),
  canEdit: boolean("can_edit").default(false).notNull(),
  canDelete: boolean("can_delete").default(false).notNull(),
  grantedBy: int("granted_by").references(() => users.id), // Usuario que otorgó el permiso
  reason: text("reason"), // Razón del override de permisos
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type UserPermission = typeof userPermissions.$inferSelect;
export type InsertUserPermission = typeof userPermissions.$inferInsert;

/**
 * Role Audit Log - Historial de cambios de roles
 * Registra todos los cambios de rol para auditoría
 */
export const roleAuditLog = mysqlTable("role_audit_log", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id).notNull(),
  oldRole: varchar("old_role", { length: 50 }),
  newRole: varchar("new_role", { length: 50 }).notNull(),
  changedBy: int("changed_by").references(() => users.id).notNull(),
  reason: text("reason"), // Razón del cambio de rol
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RoleAuditLog = typeof roleAuditLog.$inferSelect;
export type InsertRoleAuditLog = typeof roleAuditLog.$inferInsert;

// Relations para rolePermissions
export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  // No hay relaciones directas, es una tabla de configuración
}));

// Relations para userPermissions
export const userPermissionsRelations = relations(userPermissions, ({ one }) => ({
  user: one(users, {
    fields: [userPermissions.userId],
    references: [users.id],
  }),
  grantedByUser: one(users, {
    fields: [userPermissions.grantedBy],
    references: [users.id],
  }),
}));

// Relations para roleAuditLog
export const roleAuditLogRelations = relations(roleAuditLog, ({ one }) => ({
  user: one(users, {
    fields: [roleAuditLog.userId],
    references: [users.id],
  }),
  changedByUser: one(users, {
    fields: [roleAuditLog.changedBy],
    references: [users.id],
  }),
}));

/**
 * ============================================================================
 * MÓDULO DE AUTODIAGNÓSTICO NOM-035
 * ============================================================================
 */

/**
 * Autodiagnósticos - Registro de evaluaciones de cumplimiento NOM-035
 */
export const autodiagnosticos = mysqlTable("autodiagnosticos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").references(() => users.id).notNull(),
  fecha: timestamp("fecha").defaultNow().notNull(),
  porcentajeTotal: decimal("porcentaje_total", { precision: 5, scale: 2 }).default("0.00"),
  porcentajeCategoria1: decimal("porcentaje_categoria_1", { precision: 5, scale: 2 }).default("0.00"), // Política
  porcentajeCategoria2: decimal("porcentaje_categoria_2", { precision: 5, scale: 2 }).default("0.00"), // Identificación
  porcentajeCategoria3: decimal("porcentaje_categoria_3", { precision: 5, scale: 2 }).default("0.00"), // Análisis
  porcentajeCategoria4: decimal("porcentaje_categoria_4", { precision: 5, scale: 2 }).default("0.00"), // Medidas de Control
  porcentajeCategoria5: decimal("porcentaje_categoria_5", { precision: 5, scale: 2 }).default("0.00"), // Registros
  status: varchar("status", { length: 50 }).default("en_progreso").notNull(), // en_progreso, completado
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Autodiagnostico = typeof autodiagnosticos.$inferSelect;
export type InsertAutodiagnostico = typeof autodiagnosticos.$inferInsert;

/**
 * Requirements - Catálogo de requisitos normativos NOM-035
 */
export const requirements = mysqlTable("requirements", {
  id: int("id").autoincrement().primaryKey(),
  categoria: int("categoria").notNull(), // 1-5
  categoriaNombre: varchar("categoria_nombre", { length: 100 }).notNull(),
  codigo: varchar("codigo", { length: 20 }).notNull(), // Ej: POL-01, IDE-02
  descripcion: text("descripcion").notNull(),
  articuloNOM: varchar("articulo_nom", { length: 100 }), // Referencia al artículo de la NOM-035
  orden: int("orden").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Requirement = typeof requirements.$inferSelect;
export type InsertRequirement = typeof requirements.$inferInsert;

/**
 * Evidences - Evidencias de cumplimiento por requisito
 */
export const evidences = mysqlTable("evidences", {
  id: int("id").autoincrement().primaryKey(),
  autodiagnosticoId: int("autodiagnostico_id").references(() => autodiagnosticos.id).notNull(),
  requirementId: int("requirement_id").references(() => requirements.id).notNull(),
  cumple: boolean("cumple").default(false).notNull(),
  evidenciaUrl: text("evidencia_url"), // URL de S3
  evidenciaNombre: varchar("evidencia_nombre", { length: 255 }),
  observaciones: text("observaciones"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Evidence = typeof evidences.$inferSelect;
export type InsertEvidence = typeof evidences.$inferInsert;

// Relations
export const autodiagnosticosRelations = relations(autodiagnosticos, ({ one, many }) => ({
  user: one(users, {
    fields: [autodiagnosticos.userId],
    references: [users.id],
  }),
  evidences: many(evidences),
}));

export const requirementsRelations = relations(requirements, ({ many }) => ({
  evidences: many(evidences),
}));

export const evidencesRelations = relations(evidences, ({ one }) => ({
  autodiagnostico: one(autodiagnosticos, {
    fields: [evidences.autodiagnosticoId],
    references: [autodiagnosticos.id],
  }),
  requirement: one(requirements, {
    fields: [evidences.requirementId],
    references: [requirements.id],
  }),
}));

