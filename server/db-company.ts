import { getDb } from "./db";
import {
  companyGeneralData,
  companyLogo,
  companyLegalRepresentative,
  companyDigitalSignature,
  companySurveyReport,
  type CompanyGeneralData,
  type InsertCompanyGeneralData,
  type CompanyLogo,
  type InsertCompanyLogo,
  type CompanyLegalRepresentative,
  type InsertCompanyLegalRepresentative,
  type CompanyDigitalSignature,
  type InsertCompanyDigitalSignature,
  type CompanySurveyReport,
  type InsertCompanySurveyReport,
} from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/**
 * ============================================================================
 * DATOS GENERALES DE LA EMPRESA
 * ============================================================================
 */

export async function getCompanyGeneralData(): Promise<CompanyGeneralData | null> {
  const db = await getDb();
  if (!db) return null;
  const data = await db.select().from(companyGeneralData).limit(1);
  return data[0] || null;
}

export async function upsertCompanyGeneralData(data: InsertCompanyGeneralData): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(companyGeneralData).limit(1);

  if (existing.length === 0) {
    const [result] = await (db.insert(companyGeneralData) as any).values(data);
    return result.insertId;
  } else {
    await db
      .update(companyGeneralData)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(companyGeneralData.id, existing[0].id));
    return existing[0].id;
  }
}

/**
 * ============================================================================
 * LOGO DE LA EMPRESA
 * ============================================================================
 */

export async function getCompanyLogo(): Promise<CompanyLogo | null> {
  const db = await getDb();
  if (!db) return null;
  const logos = await db
    .select()
    .from(companyLogo)
    .orderBy(desc(companyLogo.createdAt))
    .limit(1);
  return logos[0] || null;
}

export async function createCompanyLogo(data: InsertCompanyLogo): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await (db.insert(companyLogo) as any).values(data);
  return result.insertId;
}

/**
 * ============================================================================
 * REPRESENTANTE LEGAL
 * ============================================================================
 */

export async function getAllLegalRepresentatives(): Promise<CompanyLegalRepresentative[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(companyLegalRepresentative)
    .orderBy(desc(companyLegalRepresentative.activo), desc(companyLegalRepresentative.createdAt));
}

export async function getLegalRepresentativeById(id: number): Promise<CompanyLegalRepresentative | null> {
  const db = await getDb();
  if (!db) return null;
  const [representative] = await db
    .select()
    .from(companyLegalRepresentative)
    .where(eq(companyLegalRepresentative.id, id));
  return representative || null;
}

export async function createLegalRepresentative(data: InsertCompanyLegalRepresentative): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await (db.insert(companyLegalRepresentative) as any).values(data);
  return result.insertId;
}

export async function updateLegalRepresentative(
  id: number,
  data: Partial<InsertCompanyLegalRepresentative>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(companyLegalRepresentative)
    .set({ ...data, updatedAt: new Date() } as any)
    .where(eq(companyLegalRepresentative.id, id));
}

export async function deleteLegalRepresentative(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Soft delete
  await db
    .update(companyLegalRepresentative)
    .set({ activo: false, updatedAt: new Date() } as any)
    .where(eq(companyLegalRepresentative.id, id));
}

/**
 * ============================================================================
 * FIRMAS DIGITALES
 * ============================================================================
 */

export async function getAllDigitalSignatures(): Promise<CompanyDigitalSignature[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(companyDigitalSignature)
    .orderBy(desc(companyDigitalSignature.activo), desc(companyDigitalSignature.createdAt));
}

export async function getDigitalSignatureById(id: number): Promise<CompanyDigitalSignature | null> {
  const db = await getDb();
  if (!db) return null;
  const [signature] = await db
    .select()
    .from(companyDigitalSignature)
    .where(eq(companyDigitalSignature.id, id));
  return signature || null;
}

export async function createDigitalSignature(data: InsertCompanyDigitalSignature): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await (db.insert(companyDigitalSignature) as any).values(data);
  return result.insertId;
}

export async function authorizeDigitalSignature(
  id: number,
  approved: boolean,
  autorizadoPor: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(companyDigitalSignature)
    .set({
      estadoAutorizacion: approved ? "autorizado" : "rechazado",
      autorizadoPor,
      fechaAutorizacion: new Date(),
      updatedAt: new Date(),
    } as any)
    .where(eq(companyDigitalSignature.id, id));
}

export async function deleteDigitalSignature(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Soft delete
  await db
    .update(companyDigitalSignature)
    .set({ activo: false, updatedAt: new Date() } as any)
    .where(eq(companyDigitalSignature.id, id));
}

/**
 * ============================================================================
 * REPORTES DE ENCUESTA
 * ============================================================================
 */

export async function getAllSurveyReports(): Promise<CompanySurveyReport[]> {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(companySurveyReport)
    .orderBy(desc(companySurveyReport.createdAt));
}

export async function getSurveyReportById(id: number): Promise<CompanySurveyReport | null> {
  const db = await getDb();
  if (!db) return null;
  const [report] = await db
    .select()
    .from(companySurveyReport)
    .where(eq(companySurveyReport.id, id));
  return report || null;
}

export async function createSurveyReport(data: InsertCompanySurveyReport): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await (db.insert(companySurveyReport) as any).values(data);
  return result.insertId;
}

export async function updateSurveyReport(
  id: number,
  data: Partial<InsertCompanySurveyReport>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(companySurveyReport)
    .set({ ...data, updatedAt: new Date() } as any)
    .where(eq(companySurveyReport.id, id));
}
