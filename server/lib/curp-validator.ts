/**
 * Utilidad para validar y extraer información de la CURP (Clave Única de Registro de Población)
 * 
 * Estructura de la CURP (18 caracteres):
 * - Posiciones 1-4: Apellido paterno + Apellido materno + Nombre
 * - Posiciones 5-10: Fecha de nacimiento (AAMMDD)
 * - Posición 11: Sexo (H/M)
 * - Posiciones 12-13: Estado de nacimiento
 * - Posiciones 14-16: Consonantes internas
 * - Posiciones 17-18: Dígitos verificadores
 */

// Catálogo de estados de la República Mexicana
const ESTADOS_MEXICO: Record<string, string> = {
  'AS': 'Aguascalientes',
  'BC': 'Baja California',
  'BS': 'Baja California Sur',
  'CC': 'Campeche',
  'CL': 'Coahuila',
  'CM': 'Colima',
  'CS': 'Chiapas',
  'CH': 'Chihuahua',
  'DF': 'Ciudad de México',
  'DG': 'Durango',
  'GT': 'Guanajuato',
  'GR': 'Guerrero',
  'HG': 'Hidalgo',
  'JC': 'Jalisco',
  'MC': 'México',
  'MN': 'Michoacán',
  'MS': 'Morelos',
  'NT': 'Nayarit',
  'NL': 'Nuevo León',
  'OC': 'Oaxaca',
  'PL': 'Puebla',
  'QT': 'Querétaro',
  'QR': 'Quintana Roo',
  'SP': 'San Luis Potosí',
  'SL': 'Sinaloa',
  'SR': 'Sonora',
  'TC': 'Tabasco',
  'TS': 'Tamaulipas',
  'TL': 'Tlaxcala',
  'VZ': 'Veracruz',
  'YN': 'Yucatán',
  'ZS': 'Zacatecas',
  'NE': 'Nacido en el Extranjero'
};

export interface CURPData {
  valid: boolean;
  curp: string;
  fechaNacimiento?: string; // Formato: YYYY-MM-DD
  sexo?: 'H' | 'M';
  genero?: 'Masculino' | 'Femenino';
  estado?: string;
  codigoEstado?: string;
  edad?: number;
  errors?: string[];
}

/**
 * Valida el formato de una CURP
 */
export function validateCURPFormat(curp: string): boolean {
  if (!curp || typeof curp !== 'string') return false;
  
  // Convertir a mayúsculas y eliminar espacios
  const cleanCURP = curp.trim().toUpperCase();
  
  // Verificar longitud
  if (cleanCURP.length !== 18) return false;
  
  // Expresión regular para validar formato de CURP
  const curpRegex = /^[A-Z]{1}[AEIOU]{1}[A-Z]{2}[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|1[0-9]|2[0-9]|3[0-1])[HM]{1}(AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[0-9A-Z]{2}$/;
  
  return curpRegex.test(cleanCURP);
}

/**
 * Extrae información de una CURP
 */
export function extractCURPData(curp: string): CURPData {
  const cleanCURP = curp.trim().toUpperCase();
  const errors: string[] = [];
  
  // Validar formato
  if (!validateCURPFormat(cleanCURP)) {
    return {
      valid: false,
      curp: cleanCURP,
      errors: ['Formato de CURP inválido']
    };
  }
  
  try {
    // Extraer fecha de nacimiento (posiciones 4-9, índices 4-9)
    const year = cleanCURP.substring(4, 6);
    const month = cleanCURP.substring(6, 8);
    const day = cleanCURP.substring(8, 10);
    
    // Determinar el siglo (si el año es mayor a 30, asumimos 1900, sino 2000)
    const fullYear = parseInt(year) > 30 ? `19${year}` : `20${year}`;
    const fechaNacimiento = `${fullYear}-${month}-${day}`;
    
    // Validar fecha
    const birthDate = new Date(fechaNacimiento);
    if (isNaN(birthDate.getTime())) {
      errors.push('Fecha de nacimiento inválida en CURP');
    }
    
    // Calcular edad
    const today = new Date();
    let edad = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      edad--;
    }
    
    // Extraer sexo (posición 10, índice 10)
    const sexo = cleanCURP.charAt(10) as 'H' | 'M';
    const genero = sexo === 'H' ? 'Masculino' : 'Femenino';
    
    // Extraer estado (posiciones 11-12, índices 11-12)
    const codigoEstado = cleanCURP.substring(11, 13);
    const estado = ESTADOS_MEXICO[codigoEstado] || 'Estado desconocido';
    
    if (!ESTADOS_MEXICO[codigoEstado]) {
      errors.push(`Código de estado desconocido: ${codigoEstado}`);
    }
    
    return {
      valid: errors.length === 0,
      curp: cleanCURP,
      fechaNacimiento,
      sexo,
      genero,
      estado,
      codigoEstado,
      edad,
      errors: errors.length > 0 ? errors : undefined
    };
    
  } catch (error) {
    return {
      valid: false,
      curp: cleanCURP,
      errors: ['Error al procesar CURP: ' + (error instanceof Error ? error.message : 'Error desconocido')]
    };
  }
}

/**
 * Valida una CURP y devuelve información extraída
 */
export function validateCURP(curp: string): CURPData {
  return extractCURPData(curp);
}
