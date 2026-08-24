/**
 * Validador de RFC mexicano
 * Verifica formato, longitud y dígito verificador según SAT
 */

export interface RFCValidationResult {
  valid: boolean;
  type: "moral" | "fisica" | null;
  error: string | null;
  rfc: string;
  homoclave: string | null;
}

// Tabla de valores para el dígito verificador del SAT
const RFC_CHARS = "0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ";

/**
 * Calcula el dígito verificador de un RFC
 * Algoritmo oficial del SAT
 */
function calcularDigitoVerificador(rfc: string): string {
  const rfcSinDigito = rfc.slice(0, -1).padStart(12, " ");
  let suma = 0;
  for (let i = 0; i < rfcSinDigito.length; i++) {
    const char = rfcSinDigito[i].toUpperCase();
    const valor = RFC_CHARS.indexOf(char);
    if (valor === -1) return "?";
    suma += valor * (rfcSinDigito.length + 1 - i);
  }
  const residuo = suma % 11;
  if (residuo === 0) return "0";
  if (residuo === 1) return "A";
  return String(11 - residuo);
}

/**
 * Expresión regular para RFC de persona moral (12 caracteres)
 * Formato: 3 letras + 6 dígitos fecha + 3 homoclave
 */
const RFC_MORAL_REGEX = /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$/;

/**
 * Expresión regular para RFC de persona física (13 caracteres)
 * Formato: 4 letras + 6 dígitos fecha + 3 homoclave
 */
const RFC_FISICA_REGEX = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}$/;

/**
 * Valida un RFC mexicano
 * @param rfc - RFC a validar (con o sin homoclave)
 * @param strict - Si true, verifica el dígito verificador
 */
export function validateRFC(rfc: string, strict = false): RFCValidationResult {
  const rfcClean = rfc.trim().toUpperCase().replace(/\s+/g, "");

  if (!rfcClean) {
    return {
      valid: false,
      type: null,
      error: "El RFC no puede estar vacío",
      rfc: rfcClean,
      homoclave: null,
    };
  }

  // Determinar tipo por longitud
  const len = rfcClean.length;
  if (len !== 12 && len !== 13) {
    return {
      valid: false,
      type: null,
      error: `RFC inválido: debe tener 12 caracteres (persona moral) o 13 (persona física). Tiene ${len}.`,
      rfc: rfcClean,
      homoclave: null,
    };
  }

  const type: "moral" | "fisica" = len === 12 ? "moral" : "fisica";
  const regex = type === "moral" ? RFC_MORAL_REGEX : RFC_FISICA_REGEX;

  if (!regex.test(rfcClean)) {
    return {
      valid: false,
      type,
      error: `Formato inválido para RFC de persona ${type === "moral" ? "moral" : "física"}. Verifique letras y dígitos.`,
      rfc: rfcClean,
      homoclave: rfcClean.slice(-3),
    };
  }

  // Validar fecha incrustada en el RFC
  const yearStr = rfcClean.slice(
    type === "moral" ? 3 : 4,
    type === "moral" ? 5 : 6
  );
  const monthStr = rfcClean.slice(
    type === "moral" ? 5 : 6,
    type === "moral" ? 7 : 8
  );
  const dayStr = rfcClean.slice(
    type === "moral" ? 7 : 8,
    type === "moral" ? 9 : 10
  );
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (month < 1 || month > 12) {
    return {
      valid: false,
      type,
      error: `RFC inválido: el mes "${monthStr}" no es válido (01-12).`,
      rfc: rfcClean,
      homoclave: rfcClean.slice(-3),
    };
  }
  if (day < 1 || day > 31) {
    return {
      valid: false,
      type,
      error: `RFC inválido: el día "${dayStr}" no es válido (01-31).`,
      rfc: rfcClean,
      homoclave: rfcClean.slice(-3),
    };
  }

  // Verificar dígito verificador (opcional, solo si strict=true)
  if (strict && len === 13) {
    const digitoCalculado = calcularDigitoVerificador(rfcClean);
    const digitoReal = rfcClean.slice(-1);
    if (digitoCalculado !== "?" && digitoCalculado !== digitoReal) {
      return {
        valid: false,
        type,
        error: `Dígito verificador incorrecto. Se esperaba "${digitoCalculado}", se recibió "${digitoReal}".`,
        rfc: rfcClean,
        homoclave: rfcClean.slice(-3),
      };
    }
  }

  return {
    valid: true,
    type,
    error: null,
    rfc: rfcClean,
    homoclave: rfcClean.slice(-3),
  };
}

/**
 * Formatea un RFC con guiones para mejor legibilidad
 * Persona moral:  AAA-AAMMDD-HHH
 * Persona física: AAAA-AAMMDD-HHH
 */
export function formatRFC(rfc: string): string {
  const clean = rfc.trim().toUpperCase();
  if (clean.length === 12)
    return `${clean.slice(0, 3)}-${clean.slice(3, 9)}-${clean.slice(9)}`;
  if (clean.length === 13)
    return `${clean.slice(0, 4)}-${clean.slice(4, 10)}-${clean.slice(10)}`;
  return clean;
}
