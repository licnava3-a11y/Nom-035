import { storagePut } from "../storage";

/**
 * Convierte un data URL (base64) a Buffer
 * @param dataUrl - Data URL en formato "data:image/png;base64,..."
 * @returns Buffer con los bytes de la imagen
 */
function dataUrlToBuffer(dataUrl: string): Buffer {
  // Extraer la parte base64 del data URL
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64Data, "base64");
}

/**
 * Genera un nombre de archivo único para la firma
 * @param userId - ID del usuario (opcional)
 * @param documentId - ID del documento (opcional)
 * @returns Nombre de archivo único
 */
function generateSignatureFileName(
  userId?: number,
  documentId?: number
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const userPart = userId ? `user${userId}` : "external";
  const docPart = documentId ? `doc${documentId}` : "temp";
  return `signatures/${userPart}/${docPart}/sig-${timestamp}-${random}.png`;
}

/**
 * Sube una firma digitalizada a S3
 *
 * @param signatureDataUrl - Firma en formato data URL (base64)
 * @param userId - ID del usuario que firma (opcional para firmantes externos)
 * @param documentId - ID del documento relacionado (opcional)
 * @returns URL pública de la firma en S3
 */
export async function uploadSignatureToS3(
  signatureDataUrl: string,
  userId?: number,
  documentId?: number
): Promise<string> {
  try {
    // Convertir data URL a Buffer
    const imageBuffer = dataUrlToBuffer(signatureDataUrl);

    // Generar nombre de archivo único
    const fileName = generateSignatureFileName(userId, documentId);

    // Subir a S3
    const { url } = await storagePut(fileName, imageBuffer, "image/png");

    return url;
  } catch (error) {
    console.error("Error uploading signature to S3:", error);
    throw new Error("Failed to upload signature");
  }
}

/**
 * Valida que un data URL sea una imagen PNG válida
 * @param dataUrl - Data URL a validar
 * @returns true si es válido, false en caso contrario
 */
export function isValidSignatureDataUrl(dataUrl: string): boolean {
  // Verificar formato básico
  if (!dataUrl.startsWith("data:image/png;base64,")) {
    return false;
  }

  // Verificar que tenga contenido base64
  const base64Part = dataUrl.split(",")[1];
  if (!base64Part || base64Part.length < 100) {
    // Firma muy pequeña, probablemente vacía
    return false;
  }

  return true;
}
