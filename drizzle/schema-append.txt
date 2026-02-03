import { int, mysqlTable, text, timestamp, varchar, boolean, date } from "drizzle-orm/mysql-core";
import { users } from "./schema";

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
