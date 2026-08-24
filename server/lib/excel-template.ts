import * as XLSX from "xlsx";

/**
 * Genera una plantilla Excel para la carga masiva de trabajadores
 * con todos los campos requeridos según la Guía V NOM-035-STPS-2018
 */
export function generateWorkersTemplate(): Buffer {
  // Crear libro de trabajo
  const workbook = XLSX.utils.book_new();

  // Hoja 1: Instrucciones
  const instructions = [
    ["PLANTILLA DE CARGA MASIVA DE TRABAJADORES"],
    ["Plataforma de Capacitación NOM-035 STPS 2018"],
    [""],
    ["INSTRUCCIONES DE USO:"],
    [
      "1. Complete todos los campos obligatorios marcados con (*) en la hoja 'Trabajadores'",
    ],
    ["2. Respete el formato de cada columna según se indica"],
    ["3. No modifique los encabezados de las columnas"],
    ["4. Puede agregar tantas filas como trabajadores necesite"],
    ["5. Guarde el archivo y súbalo al sistema"],
    [""],
    ["FORMATOS REQUERIDOS:"],
    ["- CURP: 18 caracteres alfanuméricos (Ej: AAAA000000HDFBBB00)"],
    ["- RFC: 12-13 caracteres alfanuméricos (Ej: AAAA000000XXX)"],
    ["- Fecha de nacimiento: DD/MM/AAAA (Ej: 15/03/1990)"],
    ["- Fecha de ingreso: DD/MM/AAAA (Ej: 01/01/2020)"],
    ["- Correo electrónico: formato válido (Ej: nombre@empresa.com)"],
    ["- Teléfono: 10 dígitos (Ej: 5512345678)"],
    [""],
    ["CATÁLOGOS:"],
    ["- Sexo: Masculino, Femenino, Otro"],
    [
      "- Estado civil: Soltero(a), Casado(a), Divorciado(a), Viudo(a), Unión libre",
    ],
    ["- Tipo de contrato: Planta, Temporal, Por obra, Honorarios, Otro"],
    ["- Jornada laboral: Diurna, Nocturna, Mixta, Por turnos"],
    [
      "- Grado de estudios: Primaria, Secundaria, Preparatoria, Licenciatura, Posgrado, Otro",
    ],
    [""],
    ["NOTAS IMPORTANTES:"],
    ["- El sistema validará que CURP y RFC no estén duplicados"],
    ["- Los puestos y departamentos deben existir previamente en el sistema"],
    ["- Si hay errores, se generará un reporte PDF con los detalles"],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);

  // Ajustar ancho de columnas
  wsInstructions["!cols"] = [{ wch: 80 }];

  // Agregar estilos a la primera fila (título)
  if (!wsInstructions["!rows"]) wsInstructions["!rows"] = [];
  wsInstructions["!rows"][0] = { hpt: 20 };

  XLSX.utils.book_append_sheet(workbook, wsInstructions, "Instrucciones");

  // Hoja 2: Trabajadores (plantilla)
  const headers = [
    "CURP (*)",
    "RFC (*)",
    "Nombre (*)",
    "Apellido Paterno (*)",
    "Apellido Materno",
    "Fecha de Nacimiento (*)",
    "Sexo (*)",
    "Estado Civil",
    "Puesto (*)",
    "Departamento (*)",
    "Fecha de Ingreso (*)",
    "Tipo de Contrato (*)",
    "Jornada Laboral (*)",
    "Correo Electrónico (*)",
    "Teléfono",
    "Dirección",
    "Último Grado de Estudios",
    "Nombre de Carrera",
    "Habilidades Transversales",
    "Habilidades Longitudinales",
  ];

  // Datos de ejemplo
  const exampleData = [
    [
      "AAAA900315HDFBBB00",
      "AAAA900315XXX",
      "Juan",
      "Pérez",
      "García",
      "15/03/1990",
      "Masculino",
      "Casado(a)",
      "Gerente de Recursos Humanos",
      "Recursos Humanos",
      "01/01/2020",
      "Planta",
      "Diurna",
      "juan.perez@empresa.com",
      "5512345678",
      "Calle Principal #123, Col. Centro, CDMX",
      "Licenciatura",
      "Psicología Organizacional",
      "Liderazgo, Comunicación efectiva",
      "Gestión de talento, Reclutamiento",
    ],
  ];

  const wsData = XLSX.utils.aoa_to_sheet([headers, ...exampleData]);

  // Ajustar ancho de columnas
  wsData["!cols"] = [
    { wch: 20 }, // CURP
    { wch: 15 }, // RFC
    { wch: 20 }, // Nombre
    { wch: 20 }, // Apellido Paterno
    { wch: 20 }, // Apellido Materno
    { wch: 18 }, // Fecha de Nacimiento
    { wch: 12 }, // Sexo
    { wch: 15 }, // Estado Civil
    { wch: 30 }, // Puesto
    { wch: 25 }, // Departamento
    { wch: 18 }, // Fecha de Ingreso
    { wch: 18 }, // Tipo de Contrato
    { wch: 18 }, // Jornada Laboral
    { wch: 30 }, // Correo Electrónico
    { wch: 15 }, // Teléfono
    { wch: 40 }, // Dirección
    { wch: 20 }, // Último Grado de Estudios
    { wch: 30 }, // Nombre de Carrera
    { wch: 40 }, // Habilidades Transversales
    { wch: 40 }, // Habilidades Longitudinales
  ];

  XLSX.utils.book_append_sheet(workbook, wsData, "Trabajadores");

  // Hoja 3: Catálogos
  const catalogData = [
    [
      "CATÁLOGO DE SEXO",
      "",
      "CATÁLOGO DE ESTADO CIVIL",
      "",
      "CATÁLOGO DE TIPO DE CONTRATO",
    ],
    ["Masculino", "", "Soltero(a)", "", "Planta"],
    ["Femenino", "", "Casado(a)", "", "Temporal"],
    ["Otro", "", "Divorciado(a)", "", "Por obra"],
    ["", "", "Viudo(a)", "", "Honorarios"],
    ["", "", "Unión libre", "", "Otro"],
    [""],
    ["CATÁLOGO DE JORNADA LABORAL", "", "CATÁLOGO DE GRADO DE ESTUDIOS"],
    ["Diurna", "", "Primaria"],
    ["Nocturna", "", "Secundaria"],
    ["Mixta", "", "Preparatoria"],
    ["Por turnos", "", "Licenciatura"],
    ["", "", "Posgrado"],
    ["", "", "Otro"],
  ];

  const wsCatalogs = XLSX.utils.aoa_to_sheet(catalogData);
  wsCatalogs["!cols"] = [
    { wch: 30 },
    { wch: 5 },
    { wch: 30 },
    { wch: 5 },
    { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(workbook, wsCatalogs, "Catálogos");

  // Convertir a buffer
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return buffer;
}

/**
 * Interfaz para los datos de un trabajador desde Excel
 */
export interface WorkerFromExcel {
  curp: string;
  rfc: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno?: string;
  fechaNacimiento: string;
  sexo: string;
  estadoCivil?: string;
  puesto: string;
  departamento: string;
  fechaIngreso: string;
  tipoContrato: string;
  jornadaLaboral: string;
  correoElectronico: string;
  telefono?: string;
  direccion?: string;
  ultimoGradoEstudios?: string;
  nombreCarrera?: string;
  habilidadesTransversales?: string;
  habilidadesLongitudinales?: string;
}

/**
 * Interfaz para errores de validación
 */
export interface ValidationError {
  row: number;
  field: string;
  value: any;
  error: string;
  severity: "error" | "warning";
}

/**
 * Lee un archivo Excel y extrae los datos de trabajadores
 */
export function parseWorkersFromExcel(buffer: Buffer): {
  workers: WorkerFromExcel[];
  errors: ValidationError[];
} {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const worksheet = workbook.Sheets["Trabajadores"];

  if (!worksheet) {
    throw new Error("No se encontró la hoja 'Trabajadores' en el archivo");
  }

  // Convertir a JSON
  const data: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  const workers: WorkerFromExcel[] = [];
  const errors: ValidationError[] = [];

  data.forEach((row: any, index: number) => {
    const rowNumber = index + 2; // +2 porque la primera fila es el encabezado y Excel empieza en 1

    try {
      const worker: WorkerFromExcel = {
        curp: String(row["CURP (*)"] || "")
          .trim()
          .toUpperCase(),
        rfc: String(row["RFC (*)"] || "")
          .trim()
          .toUpperCase(),
        nombre: String(row["Nombre (*)"] || "").trim(),
        apellidoPaterno: String(row["Apellido Paterno (*)"] || "").trim(),
        apellidoMaterno:
          String(row["Apellido Materno"] || "").trim() || undefined,
        fechaNacimiento: String(row["Fecha de Nacimiento (*)"] || "").trim(),
        sexo: String(row["Sexo (*)"] || "").trim(),
        estadoCivil: String(row["Estado Civil"] || "").trim() || undefined,
        puesto: String(row["Puesto (*)"] || "").trim(),
        departamento: String(row["Departamento (*)"] || "").trim(),
        fechaIngreso: String(row["Fecha de Ingreso (*)"] || "").trim(),
        tipoContrato: String(row["Tipo de Contrato (*)"] || "").trim(),
        jornadaLaboral: String(row["Jornada Laboral (*)"] || "").trim(),
        correoElectronico: String(row["Correo Electrónico (*)"] || "")
          .trim()
          .toLowerCase(),
        telefono: String(row["Teléfono"] || "").trim() || undefined,
        direccion: String(row["Dirección"] || "").trim() || undefined,
        ultimoGradoEstudios:
          String(row["Último Grado de Estudios"] || "").trim() || undefined,
        nombreCarrera:
          String(row["Nombre de Carrera"] || "").trim() || undefined,
        habilidadesTransversales:
          String(row["Habilidades Transversales"] || "").trim() || undefined,
        habilidadesLongitudinales:
          String(row["Habilidades Longitudinales"] || "").trim() || undefined,
      };

      // Validaciones básicas
      if (!worker.curp) {
        errors.push({
          row: rowNumber,
          field: "CURP",
          value: worker.curp,
          error: "El CURP es obligatorio",
          severity: "error",
        });
      } else if (worker.curp.length !== 18) {
        errors.push({
          row: rowNumber,
          field: "CURP",
          value: worker.curp,
          error: "El CURP debe tener exactamente 18 caracteres",
          severity: "error",
        });
      }

      if (!worker.rfc) {
        errors.push({
          row: rowNumber,
          field: "RFC",
          value: worker.rfc,
          error: "El RFC es obligatorio",
          severity: "error",
        });
      } else if (worker.rfc.length < 12 || worker.rfc.length > 13) {
        errors.push({
          row: rowNumber,
          field: "RFC",
          value: worker.rfc,
          error: "El RFC debe tener 12 o 13 caracteres",
          severity: "error",
        });
      }

      if (!worker.nombre) {
        errors.push({
          row: rowNumber,
          field: "Nombre",
          value: worker.nombre,
          error: "El nombre es obligatorio",
          severity: "error",
        });
      }

      if (!worker.apellidoPaterno) {
        errors.push({
          row: rowNumber,
          field: "Apellido Paterno",
          value: worker.apellidoPaterno,
          error: "El apellido paterno es obligatorio",
          severity: "error",
        });
      }

      if (!worker.correoElectronico) {
        errors.push({
          row: rowNumber,
          field: "Correo Electrónico",
          value: worker.correoElectronico,
          error: "El correo electrónico es obligatorio",
          severity: "error",
        });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(worker.correoElectronico)) {
        errors.push({
          row: rowNumber,
          field: "Correo Electrónico",
          value: worker.correoElectronico,
          error: "El formato del correo electrónico no es válido",
          severity: "error",
        });
      }

      // Validar fechas
      if (!worker.fechaNacimiento) {
        errors.push({
          row: rowNumber,
          field: "Fecha de Nacimiento",
          value: worker.fechaNacimiento,
          error: "La fecha de nacimiento es obligatoria",
          severity: "error",
        });
      } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(worker.fechaNacimiento)) {
        errors.push({
          row: rowNumber,
          field: "Fecha de Nacimiento",
          value: worker.fechaNacimiento,
          error: "El formato de la fecha debe ser DD/MM/AAAA",
          severity: "error",
        });
      }

      if (!worker.fechaIngreso) {
        errors.push({
          row: rowNumber,
          field: "Fecha de Ingreso",
          value: worker.fechaIngreso,
          error: "La fecha de ingreso es obligatoria",
          severity: "error",
        });
      } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(worker.fechaIngreso)) {
        errors.push({
          row: rowNumber,
          field: "Fecha de Ingreso",
          value: worker.fechaIngreso,
          error: "El formato de la fecha debe ser DD/MM/AAAA",
          severity: "error",
        });
      }

      workers.push(worker);
    } catch (error) {
      errors.push({
        row: rowNumber,
        field: "General",
        value: null,
        error: `Error al procesar la fila: ${error instanceof Error ? error.message : "Error desconocido"}`,
        severity: "error",
      });
    }
  });

  return { workers, errors };
}
