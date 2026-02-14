/**
 * Validation helpers con mensajes claros en español
 */

export const validationMessages = {
  required: (field: string) => `El campo ${field} es obligatorio`,
  email: "Ingrese un correo electrónico válido",
  minLength: (field: string, min: number) => `${field} debe tener al menos ${min} caracteres`,
  maxLength: (field: string, max: number) => `${field} no debe exceder ${max} caracteres`,
  pattern: (field: string) => `${field} tiene un formato inválido`,
  number: "Debe ser un número válido",
  positive: "Debe ser un número positivo",
  date: "Debe ser una fecha válida",
  phone: "Ingrese un número de teléfono válido (10 dígitos)",
  curp: "Ingrese un CURP válido (18 caracteres)",
  rfc: "Ingrese un RFC válido",
};

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\d{10}$/;
  return phoneRegex.test(phone.replace(/\s|-/g, ""));
}

export function validateCURP(curp: string): boolean {
  const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/;
  return curpRegex.test(curp.toUpperCase());
}

export function validateRFC(rfc: string): boolean {
  const rfcRegex = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
  return rfcRegex.test(rfc.toUpperCase());
}

export function sanitizeInput(input: string): string {
  // Remover caracteres peligrosos para prevenir XSS
  return input
    .replace(/[<>]/g, "")
    .trim();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
