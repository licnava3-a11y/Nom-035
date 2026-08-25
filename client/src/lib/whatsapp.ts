/**
 * Helper para generar enlaces de WhatsApp con mensajes pre-llenados
 * Útil para solicitudes de demo, contacto comercial, soporte, etc.
 */

export interface WhatsAppMessageOptions {
  phoneNumber: string; // Número de teléfono en formato internacional (sin +)
  message: string; // Mensaje pre-llenado
}

/**
 * Genera un enlace de WhatsApp con mensaje pre-llenado
 * @param options - Opciones del mensaje
 * @returns URL de WhatsApp lista para abrir
 *
 * @example
 * ```ts
 * const url = generateWhatsAppLink({
 *   phoneNumber: "525512345678",
 *   message: "Hola, me interesa solicitar una demo de NOM-035"
 * });
 * window.open(url, '_blank');
 * ```
 */
export function generateWhatsAppLink(options: WhatsAppMessageOptions): string {
  const { phoneNumber, message } = options;

  // Limpiar el número de teléfono (eliminar espacios, guiones, paréntesis)
  const cleanPhone = phoneNumber.replace(/[\s\-\(\)\+]/g, "");

  // Codificar el mensaje para URL
  const encodedMessage = encodeURIComponent(message);

  // Generar URL de WhatsApp
  // Usar api.whatsapp.com para abrir en cualquier dispositivo (web o app)
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedMessage}`;
}

/**
 * Genera un mensaje de solicitud de demo con información del usuario
 * @param userData - Datos del usuario interesado
 * @returns Mensaje formateado para WhatsApp
 */
export interface DemoRequestData {
  nombre?: string;
  email?: string;
  empresa?: string;
  normativas: string[]; // Array de normativas de interés
}

export function generateDemoRequestMessage(data: DemoRequestData): string {
  const { nombre, email, empresa, normativas } = data;

  let message =
    "¡Hola! Me interesa solicitar una demo de la plataforma de cumplimiento normativo.\n\n";

  if (nombre) {
    message += `👤 *Nombre:* ${nombre}\n`;
  }

  if (email) {
    message += `📧 *Email:* ${email}\n`;
  }

  if (empresa) {
    message += `🏢 *Empresa:* ${empresa}\n`;
  }

  if (normativas && normativas.length > 0) {
    message += `\n📋 *Normativas de interés:*\n`;
    normativas.forEach((norm: any) => {
      message += `• ${norm}\n`;
    });
  }

  message += `\n¿Podrían proporcionarme más información sobre la plataforma?`;

  return message;
}

/**
 * Mapeo de códigos de normativas a nombres completos
 */
export const NORMATIVAS_MAP: Record<string, string> = {
  "nom-035": "NOM-035-STPS-2018 (Factores de Riesgo Psicosocial)",
  "nom-036": "NOM-036-1-STPS-2018 (Ergonomía)",
  "nmx-025": "NMX-R-025-SCFI-2015 (Igualdad Laboral y No Discriminación)",
  "ley-silla": "Ley Silla (Descanso para Trabajadores)",
  "protocolo-violencia": "Protocolo de Atención a la Violencia Laboral",
};

/**
 * Abre WhatsApp con un mensaje de solicitud de demo
 * @param phoneNumber - Número de WhatsApp del negocio (formato internacional sin +)
 * @param data - Datos del usuario y normativas de interés
 */
export function openWhatsAppDemo(
  phoneNumber: string,
  data: DemoRequestData
): void {
  const message = generateDemoRequestMessage(data);
  const url = generateWhatsAppLink({ phoneNumber, message });
  window.open(url, "_blank");
}

/**
 * Genera un mensaje de contacto general
 * @param nombre - Nombre del usuario
 * @param asunto - Asunto del mensaje
 * @param mensaje - Mensaje adicional
 */
export function generateContactMessage(
  nombre: string,
  asunto: string,
  mensaje?: string
): string {
  let text = `¡Hola! Mi nombre es *${nombre}*.\n\n`;
  text += `*Asunto:* ${asunto}\n\n`;

  if (mensaje) {
    text += `${mensaje}\n\n`;
  }

  text += `Quedo atento a su respuesta.`;

  return text;
}

/**
 * Formatea un número de teléfono mexicano a formato internacional
 * @param phone - Número de teléfono (10 dígitos)
 * @returns Número en formato internacional (525512345678)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");

  // Si ya tiene código de país, retornar
  if (cleaned.startsWith("52") && cleaned.length === 12) {
    return cleaned;
  }

  // Si es número mexicano de 10 dígitos, agregar 52
  if (cleaned.length === 10) {
    return `52${cleaned}`;
  }

  // Retornar limpio si no cumple con el formato esperado
  return cleaned;
}
