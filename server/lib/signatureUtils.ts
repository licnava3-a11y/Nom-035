import crypto from 'crypto';

/**
 * Utilidades para manejo de firmas digitales conforme a NOM-151-SCFI-2016
 */

/**
 * Calcula el hash SHA-256 de una firma digital (imagen base64)
 * @param signatureDataUrl - Data URL de la firma (base64)
 * @returns Hash SHA-256 en formato hexadecimal
 */
export function calculateSignatureHash(signatureDataUrl: string): string {
  // Extraer solo la parte base64 (sin el prefijo data:image/png;base64,)
  const base64Data = signatureDataUrl.replace(/^data:image\/\w+;base64,/, '');
  
  // Calcular SHA-256
  const hash = crypto.createHash('sha256');
  hash.update(base64Data);
  
  return hash.digest('hex');
}

/**
 * Obtiene el timestamp del servidor en milisegundos
 * @returns Unix timestamp en milisegundos
 */
export function getServerTimestamp(): number {
  return Date.now();
}

/**
 * Prepara los datos de firma con hash y timestamp para inserción en BD
 * @param signatureData - Datos de la firma
 * @returns Objeto con todos los campos necesarios para la tabla signatures
 */
export function prepareSignatureData(signatureData: {
  documentId: number;
  userId?: number | null;
  signerName: string;
  signerRole?: string | null;
  signatureImageUrl: string;
  ipAddress?: string | null;
  deviceInfo?: string | null;
}) {
  return {
    ...signatureData,
    signatureHash: calculateSignatureHash(signatureData.signatureImageUrl),
    serverTimestamp: getServerTimestamp(),
  };
}
