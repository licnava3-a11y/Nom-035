import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal, date, bigint } from "drizzle-orm/mysql-core";
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
  role: mysqlEnum("role", ["admin", "instructor", "student", "committee", "committee_member", "committee_coordinator"]).default("student").notNull(),
  
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

// Encuestas (Guía I, II, III)
export const surveys = mysqlTable('surveys', {
  id: int('id').primaryKey().autoincrement(),
  type: mysqlEnum('type', ['guia_i', 'guia_ii', 'guia_iii']).notNull(), // Tipo de guía NOM-035
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  status: mysqlEnum('status', ['active', 'inactive', 'archived']).default('active').notNull(),
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

// Relations para surveyTokens
export const surveyTokensRelations = relations(surveyTokens, ({ one }) => ({
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
  description: text("description").notNull(),
  responsibleUserId: int("responsibleUserId"),
  departamento: varchar("departamento", { length: 255 }),
  dueDate: date("dueDate"),
  status: mysqlEnum("status", ["pendiente", "en_proceso", "completada", "cancelada"]).default("pendiente").notNull(),
  notes: text("notes"),
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

