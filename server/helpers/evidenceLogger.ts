import { getDb } from "../db";
import { cases, certificates, nom035EvidenceFolder, surveys } from "../../drizzle/schema";

export type EvidenceCategory =
  | "policies"
  | "preventive_actions"
  | "corrective_actions"
  | "organizational_environment"
  | "training_program"
  | "surveys"
  | "cases"
  | "minutes"
  | "certificates"
  | "position_acceptance"
  | "photographic_evidence";

interface LogEvidenceParams {
  category: EvidenceCategory;
  title: string;
  description: string;
  documentType: string;
  sourceModule: string;
  sourceId?: number | null;
  fileUrl: string;
  fileKey: string;
  uploadedBy: number;
}

/**
 * Registra automáticamente una evidencia en la carpeta de evidencias NOM-035
 */
export async function logEvidence(params: LogEvidenceParams): Promise<void> {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[Evidence Logger] Database connection failed");
      return;
    }

    await (db.insert(nom035EvidenceFolder) as any).values({
      category: params.category,
      title: params.title,
      description: params.description,
      documentType: params.documentType,
      sourceModule: params.sourceModule,
      sourceId: params.sourceId || null,
      fileUrl: params.fileUrl,
      fileKey: params.fileKey,
      generatedDate: new Date(),
      uploadedBy: params.uploadedBy,
    });

    console.log(`[Evidence Logger] Registered: ${params.title} (${params.category})`);
  } catch (error) {
    console.error("[Evidence Logger] Failed to register evidence:", error);
    // No lanzamos el error para no interrumpir el flujo principal
  }
}

/**
 * Registra evidencia de política NOM-035
 */
export async function logPolicyEvidence(
  policyId: number,
  policyName: string,
  pdfUrl: string,
  pdfKey: string,
  userId: number
): Promise<void> {
  await logEvidence({
    category: "policies",
    title: `Política: ${policyName}`,
    description: `Política de prevención de riesgos psicosociales publicada`,
    documentType: "PDF",
    sourceModule: "nom035_policies",
    sourceId: policyId,
    fileUrl: pdfUrl,
    fileKey: pdfKey,
    uploadedBy: userId,
  });
}

/**
 * Registra evidencia de minuta de reunión
 */
export async function logMinuteEvidence(
  minuteId: number,
  minuteTitle: string,
  pdfUrl: string,
  pdfKey: string,
  userId: number
): Promise<void> {
  await logEvidence({
    category: "minutes",
    title: `Minuta: ${minuteTitle}`,
    description: `Minuta de reunión del comité de seguridad y salud`,
    documentType: "PDF",
    sourceModule: "meeting_minutes",
    sourceId: minuteId,
    fileUrl: pdfUrl,
    fileKey: pdfKey,
    uploadedBy: userId,
  });
}

/**
 * Registra evidencia de acta constitutiva del comité
 */
export async function logConstitutiveActEvidence(
  folio: string,
  pdfUrl: string,
  pdfKey: string,
  userId: number
): Promise<void> {
  await logEvidence({
    category: "certificates",
    title: `Acta Constitutiva del Comité - ${folio}`,
    description: `Documento formal de constitución del Comité de Seguridad y Salud en el Trabajo`,
    documentType: "PDF",
    sourceModule: "committee_documents",
    sourceId: null, // Folio is stored in title
    fileUrl: pdfUrl,
    fileKey: pdfKey,
    uploadedBy: userId,
  });
}

/**
 * Registra evidencia de bases de funcionamiento del comité
 */
export async function logOperatingRulesEvidence(
  folio: string,
  pdfUrl: string,
  pdfKey: string,
  userId: number
): Promise<void> {
  await logEvidence({
    category: "certificates",
    title: `Bases de Funcionamiento del Comité - ${folio}`,
    description: `Reglamento interno del Comité de Seguridad y Salud en el Trabajo`,
    documentType: "PDF",
    sourceModule: "committee_documents",
    sourceId: null, // Folio is stored in title
    fileUrl: pdfUrl,
    fileKey: pdfKey,
    uploadedBy: userId,
  });
}

/**
 * Registra evidencia de aceptación de cargo
 */
export async function logPositionAcceptanceEvidence(
  acceptanceId: number,
  memberName: string,
  position: string,
  pdfUrl: string,
  pdfKey: string,
  userId: number
): Promise<void> {
  await logEvidence({
    category: "position_acceptance",
    title: `Aceptación de Cargo: ${memberName} - ${position}`,
    description: `Documento formal de aceptación de cargo con responsabilidades`,
    documentType: "PDF",
    sourceModule: "committee_position_acceptance",
    sourceId: acceptanceId,
    fileUrl: pdfUrl,
    fileKey: pdfKey,
    uploadedBy: userId,
  });
}

/**
 * Registra evidencia de reporte de encuesta NOM-035
 */
export async function logSurveyReportEvidence(
  surveyId: number,
  surveyTitle: string,
  pdfUrl: string,
  pdfKey: string,
  userId: number
): Promise<void> {
  await logEvidence({
    category: "surveys",
    title: `Reporte de Encuesta: ${surveyTitle}`,
    description: `Informe de resultados de identificación de factores de riesgo psicosocial`,
    documentType: "PDF",
    sourceModule: "surveys",
    sourceId: surveyId,
    fileUrl: pdfUrl,
    fileKey: pdfKey,
    uploadedBy: userId,
  });
}

/**
 * Registra evidencia de acción correctiva
 */
export async function logCorrectiveActionEvidence(
  actionId: number,
  actionTitle: string,
  pdfUrl: string,
  pdfKey: string,
  userId: number
): Promise<void> {
  await logEvidence({
    category: "corrective_actions",
    title: `Acción Correctiva: ${actionTitle}`,
    description: `Plan de acción para mitigar factores de riesgo psicosocial`,
    documentType: "PDF",
    sourceModule: "corrective_actions",
    sourceId: actionId,
    fileUrl: pdfUrl,
    fileKey: pdfKey,
    uploadedBy: userId,
  });
}
