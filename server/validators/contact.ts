import { z } from "zod";

/**
 * Validación de email según RFC 5322 (simplificado pero robusto)
 * Acepta la mayoría de formatos válidos de email
 */
export const emailValidator = z
  .string()
  .min(1, "El correo electrónico es requerido")
  .email("Formato de correo electrónico inválido")
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    "Formato de correo electrónico inválido según RFC 5322"
  );

/**
 * Validación de email opcional
 */
export const emailValidatorOptional = z
  .string()
  .email("Formato de correo electrónico inválido")
  .regex(
    /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    "Formato de correo electrónico inválido según RFC 5322"
  )
  .optional()
  .or(z.literal(""));

/**
 * Validación de teléfono mexicano (10 dígitos)
 * Formatos aceptados:
 * - 5512345678 (10 dígitos)
 * - 55 1234 5678 (con espacios)
 * - 55-1234-5678 (con guiones)
 * - (55) 1234-5678 (con paréntesis)
 */
export const phoneValidatorMX = z
  .string()
  .min(1, "El teléfono es requerido")
  .regex(
    /^(\+?52)?[\s-]?(\(?\d{2,3}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}$/,
    "Formato de teléfono inválido. Use formato: 5512345678 o (55) 1234-5678"
  )
  .transform((val) => {
    // Normalizar: eliminar espacios, guiones, paréntesis y +52
    return val.replace(/[\s\-\(\)\+]/g, "").replace(/^52/, "");
  })
  .refine((val) => val.length === 10, {
    message: "El teléfono debe tener exactamente 10 dígitos",
  });

/**
 * Validación de teléfono mexicano opcional
 */
export const phoneValidatorMXOptional = z
  .string()
  .regex(
    /^(\+?52)?[\s-]?(\(?\d{2,3}\)?[\s-]?)?\d{3,4}[\s-]?\d{4}$/,
    "Formato de teléfono inválido. Use formato: 5512345678 o (55) 1234-5678"
  )
  .transform((val) => {
    if (!val) return "";
    return val.replace(/[\s\-\(\)\+]/g, "").replace(/^52/, "");
  })
  .refine(
    (val) => !val || val.length === 10,
    {
      message: "El teléfono debe tener exactamente 10 dígitos",
    }
  )
  .optional()
  .or(z.literal(""));

/**
 * Validación de teléfono internacional E.164
 * Formato: +[código país][número]
 * Ejemplo: +525512345678, +14155552671
 */
export const phoneValidatorE164 = z
  .string()
  .min(1, "El teléfono es requerido")
  .regex(
    /^\+[1-9]\d{1,14}$/,
    "Formato de teléfono internacional inválido. Use formato E.164: +525512345678"
  );

/**
 * Validación de teléfono internacional E.164 opcional
 */
export const phoneValidatorE164Optional = z
  .string()
  .regex(
    /^\+[1-9]\d{1,14}$/,
    "Formato de teléfono internacional inválido. Use formato E.164: +525512345678"
  )
  .optional()
  .or(z.literal(""));

/**
 * Helper para formatear teléfono mexicano a formato legible
 * Entrada: "5512345678"
 * Salida: "(55) 1234-5678"
 */
export function formatPhoneMX(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length !== 10) return phone;
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
}

/**
 * Helper para formatear teléfono a formato E.164
 * Entrada: "5512345678" (asume México si no tiene código)
 * Salida: "+525512345678"
 */
export function formatPhoneE164(phone: string, countryCode: string = "52"): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith(countryCode)) {
    return `+${cleaned}`;
  }
  return `+${countryCode}${cleaned}`;
}
