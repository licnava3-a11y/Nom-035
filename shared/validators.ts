/**
 * Validadores de datos personales mexicanos
 * 
 * Implementa algoritmos oficiales para validación de:
 * - CURP (Clave Única de Registro de Población)
 * - RFC (Registro Federal de Contribuyentes)
 * - NSS (Número de Seguridad Social)
 */

/**
 * Valida formato y dígito verificador de CURP
 * Formato: AAAA######HHHHHH##
 * - 4 letras (apellido paterno, materno, nombre)
 * - 6 dígitos (fecha: AAMMDD)
 * - 1 letra (sexo: H/M)
 * - 2 letras (estado de nacimiento)
 * - 3 consonantes internas
 * - 2 dígitos (homoclave + verificador)
 */
export function validateCURP(curp: string): { valid: boolean; error?: string } {
  if (!curp) {
    return { valid: false, error: 'CURP es requerido' };
  }

  // Convertir a mayúsculas
  curp = curp.toUpperCase().trim();

  // Validar longitud
  if (curp.length !== 18) {
    return { valid: false, error: 'CURP debe tener 18 caracteres' };
  }

  // Validar formato general
  const curpRegex = /^[A-Z]{4}\d{6}[HM][A-Z]{5}[0-9A-Z]\d$/;
  if (!curpRegex.test(curp)) {
    return { valid: false, error: 'Formato de CURP inválido' };
  }

  // Validar fecha de nacimiento
  const year = parseInt(curp.substring(4, 6));
  const month = parseInt(curp.substring(6, 8));
  const day = parseInt(curp.substring(8, 10));

  if (month < 1 || month > 12) {
    return { valid: false, error: 'Mes de nacimiento inválido en CURP' };
  }

  if (day < 1 || day > 31) {
    return { valid: false, error: 'Día de nacimiento inválido en CURP' };
  }

  // Validar sexo
  const sexo = curp.charAt(10);
  if (sexo !== 'H' && sexo !== 'M') {
    return { valid: false, error: 'Sexo inválido en CURP (debe ser H o M)' };
  }

  // Validar estado de nacimiento (códigos oficiales)
  const estadosValidos = [
    'AS', 'BC', 'BS', 'CC', 'CL', 'CM', 'CS', 'CH', 'DF', 'DG',
    'GT', 'GR', 'HG', 'JC', 'MC', 'MN', 'MS', 'NT', 'NL', 'OC',
    'PL', 'QT', 'QR', 'SP', 'SL', 'SR', 'TC', 'TS', 'TL', 'VZ',
    'YN', 'ZS', 'NE' // NE = Nacido en el Extranjero
  ];
  const estado = curp.substring(11, 13);
  if (!estadosValidos.includes(estado)) {
    return { valid: false, error: 'Estado de nacimiento inválido en CURP' };
  }

  // Validar dígito verificador
  const digitoVerificador = curp.charAt(17);
  const calculado = calcularDigitoVerificadorCURP(curp.substring(0, 17));
  
  if (digitoVerificador !== calculado) {
    return { valid: false, error: 'Dígito verificador de CURP inválido' };
  }

  return { valid: true };
}

/**
 * Calcula el dígito verificador de CURP según algoritmo oficial
 */
function calcularDigitoVerificadorCURP(curp17: string): string {
  const diccionario = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
  let suma = 0;

  for (let i = 0; i < 17; i++) {
    const valor = diccionario.indexOf(curp17.charAt(i));
    suma += valor * (18 - i);
  }

  const residuo = suma % 10;
  const digitoVerificador = residuo === 0 ? '0' : String(10 - residuo);

  return digitoVerificador;
}

/**
 * Valida formato y dígito verificador de RFC
 * Formato persona física: AAAA######XXX
 * Formato persona moral: AAA######XXX
 * - 3-4 letras (apellidos y nombre o razón social)
 * - 6 dígitos (fecha: AAMMDD)
 * - 3 caracteres (homoclave)
 */
export function validateRFC(rfc: string, tipoPersona: 'fisica' | 'moral' = 'fisica'): { valid: boolean; error?: string } {
  if (!rfc) {
    return { valid: false, error: 'RFC es requerido' };
  }

  // Convertir a mayúsculas
  rfc = rfc.toUpperCase().trim();

  // Validar longitud según tipo de persona
  const longitudEsperada = tipoPersona === 'fisica' ? 13 : 12;
  if (rfc.length !== longitudEsperada) {
    return { valid: false, error: `RFC debe tener ${longitudEsperada} caracteres` };
  }

  // Validar formato general
  const rfcRegex = tipoPersona === 'fisica'
    ? /^[A-ZÑ&]{4}\d{6}[0-9A-Z]{3}$/
    : /^[A-ZÑ&]{3}\d{6}[0-9A-Z]{3}$/;

  if (!rfcRegex.test(rfc)) {
    return { valid: false, error: 'Formato de RFC inválido' };
  }

  // Validar fecha
  const offset = tipoPersona === 'fisica' ? 4 : 3;
  const year = parseInt(rfc.substring(offset, offset + 2));
  const month = parseInt(rfc.substring(offset + 2, offset + 4));
  const day = parseInt(rfc.substring(offset + 4, offset + 6));

  if (month < 1 || month > 12) {
    return { valid: false, error: 'Mes inválido en RFC' };
  }

  if (day < 1 || day > 31) {
    return { valid: false, error: 'Día inválido en RFC' };
  }

  // Validar dígito verificador (último carácter)
  const digitoVerificador = rfc.charAt(rfc.length - 1);
  const calculado = calcularDigitoVerificadorRFC(rfc.substring(0, rfc.length - 1));

  if (digitoVerificador !== calculado) {
    return { valid: false, error: 'Dígito verificador de RFC inválido' };
  }

  return { valid: true };
}

/**
 * Calcula el dígito verificador de RFC según algoritmo oficial
 */
function calcularDigitoVerificadorRFC(rfc12: string): string {
  const diccionario = '0123456789ABCDEFGHIJKLMN&OPQRSTUVWXYZ Ñ';
  const valores: { [key: string]: number } = {};
  
  for (let i = 0; i < diccionario.length; i++) {
    valores[diccionario[i]] = i;
  }

  let suma = 0;
  const longitud = rfc12.length;

  for (let i = 0; i < longitud; i++) {
    const char = rfc12.charAt(i);
    const valor = valores[char] || 0;
    suma += valor * (longitud - i + 1);
  }

  const residuo = suma % 11;
  
  if (residuo === 0) {
    return '0';
  } else if (residuo === 10) {
    return 'A';
  } else {
    return String(11 - residuo);
  }
}

/**
 * Valida formato de NSS (Número de Seguridad Social)
 * Formato: ##-##-##-####-#
 * - 2 dígitos: subdelegación
 * - 2 dígitos: año de alta
 * - 2 dígitos: año de nacimiento
 * - 4 dígitos: número consecutivo
 * - 1 dígito: verificador
 */
export function validateNSS(nss: string): { valid: boolean; error?: string } {
  if (!nss) {
    return { valid: false, error: 'NSS es requerido' };
  }

  // Eliminar guiones y espacios
  nss = nss.replace(/[-\s]/g, '').trim();

  // Validar longitud
  if (nss.length !== 11) {
    return { valid: false, error: 'NSS debe tener 11 dígitos' };
  }

  // Validar que sean solo dígitos
  if (!/^\d{11}$/.test(nss)) {
    return { valid: false, error: 'NSS debe contener solo dígitos' };
  }

  // Validar subdelegación (01-99)
  const subdelegacion = parseInt(nss.substring(0, 2));
  if (subdelegacion < 1 || subdelegacion > 99) {
    return { valid: false, error: 'Subdelegación inválida en NSS' };
  }

  // Validar dígito verificador
  const digitoVerificador = parseInt(nss.charAt(10));
  const calculado = calcularDigitoVerificadorNSS(nss.substring(0, 10));

  if (digitoVerificador !== calculado) {
    return { valid: false, error: 'Dígito verificador de NSS inválido' };
  }

  return { valid: true };
}

/**
 * Calcula el dígito verificador de NSS según algoritmo oficial del IMSS
 */
function calcularDigitoVerificadorNSS(nss10: string): number {
  let suma = 0;

  for (let i = 0; i < 10; i++) {
    const digito = parseInt(nss10.charAt(i));
    const posicion = i + 1;

    // Multiplicar por la posición
    let producto = digito * posicion;

    // Si el producto es mayor a 9, sumar sus dígitos
    if (producto > 9) {
      producto = Math.floor(producto / 10) + (producto % 10);
    }

    suma += producto;
  }

  // El dígito verificador es el complemento a 10 del último dígito de la suma
  const ultimoDigito = suma % 10;
  return ultimoDigito === 0 ? 0 : 10 - ultimoDigito;
}

/**
 * Valida formato de correo electrónico
 */
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) {
    return { valid: false, error: 'Correo electrónico es requerido' };
  }

  email = email.trim().toLowerCase();

  // Regex para validación de email
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Formato de correo electrónico inválido' };
  }

  return { valid: true };
}

/**
 * Valida que la fecha de ingreso no sea futura
 */
export function validateHireDate(hireDate: Date | string): { valid: boolean; error?: string } {
  const fecha = typeof hireDate === 'string' ? new Date(hireDate) : hireDate;
  const hoy = new Date();

  if (fecha > hoy) {
    return { valid: false, error: 'La fecha de ingreso no puede ser futura' };
  }

  return { valid: true };
}

/**
 * Valida que la edad sea >= 18 años
 */
export function validateAge(birthDate: Date | string): { valid: boolean; error?: string } {
  const fechaNacimiento = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const hoy = new Date();

  let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
  const mes = hoy.getMonth() - fechaNacimiento.getMonth();

  if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
    edad--;
  }

  if (edad < 18) {
    return { valid: false, error: 'El empleado debe tener al menos 18 años' };
  }

  return { valid: true };
}

/**
 * Valida que la fecha de fin sea posterior a la fecha de inicio
 */
export function validateDateRange(startDate: Date | string, endDate: Date | string): { valid: boolean; error?: string } {
  const inicio = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const fin = typeof endDate === 'string' ? new Date(endDate) : endDate;

  if (fin <= inicio) {
    return { valid: false, error: 'La fecha de fin debe ser posterior a la fecha de inicio' };
  }

  return { valid: true };
}
