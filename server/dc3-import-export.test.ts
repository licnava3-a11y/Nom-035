/**
 * Test de integración: Importación y Exportación de la plantilla DC-3
 * Valida el mapeo de los 20 campos oficiales del formato DC-3 STPS
 *
 * Estructura de columnas de la plantilla (orden oficial):
 * A(0)  = Nombre del Trabajador *
 * B(1)  = CURP
 * C(2)  = Clave CNO
 * D(3)  = Descripción Ocupación CNO
 * E(4)  = Puesto
 * F(5)  = Nombre o Razón Social Empresa *
 * G(6)  = RFC Empresa
 * H(7)  = Nombre del Curso *
 * I(8)  = Duración (horas)
 * J(9)  = Fecha Inicio (YYYY-MM-DD)
 * K(10) = Fecha Fin (YYYY-MM-DD)
 * L(11) = Clave Área Temática
 * M(12) = Descripción Área Temática
 * N(13) = Nombre del Agente Capacitador o STPS
 * O(14) = Instructor o Tutor
 * P(15) = Patrón o Representante Legal *
 * Q(16) = Representante de los Trabajadores
 * R(17) = Estado (draft / issued / cancelled)
 * S(18) = Folio
 * T(19) = Notas internas
 */

import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";

// ─── Datos de prueba reales (10 registros) ────────────────────────────────────
const DATOS_PRUEBA = [
  {
    workerName: "GARCÍA LÓPEZ JUAN CARLOS",
    workerCurp: "GALJ850101HDFXXX00",
    workerOccupationCnoKey: "08.2",
    workerOccupationCnoDesc: "Administración",
    workerPosition: "Analista Administrativo",
    companyName: "INDUSTRIAS MONTERREY S.A. DE C.V.",
    companyRfc: "IMO850101AAA",
    courseName:
      "Prevención de Factores de Riesgo Psicosocial NOM-035-STPS-2018",
    courseDurationHours: 16,
    periodStartDate: "2025-01-15",
    periodEndDate: "2025-01-16",
    thematicAreaKey: "6000",
    thematicAreaDesc: "Seguridad",
    trainingAgentName: "Consultoría NOM-035 S.C.",
    instructorName: "LIC. PEDRO MARTÍNEZ SÁNCHEZ",
    employerRepName: "ING. ROBERTO FLORES HERNÁNDEZ",
    workerRepName: "",
    status: "issued",
    folioNumber: "DC3-0001/2025",
    notes: "",
  },
  {
    workerName: "RODRÍGUEZ PÉREZ ANA LAURA",
    workerCurp: "ROPA900215MDFXXX01",
    workerOccupationCnoKey: "09.1",
    workerOccupationCnoDesc: "Servicios médicos",
    workerPosition: "Enfermera",
    companyName: "INDUSTRIAS MONTERREY S.A. DE C.V.",
    companyRfc: "IMO850101AAA",
    courseName: "Primeros Auxilios y Manejo de Emergencias",
    courseDurationHours: 8,
    periodStartDate: "2025-02-10",
    periodEndDate: "2025-02-10",
    thematicAreaKey: "6000",
    thematicAreaDesc: "Seguridad",
    trainingAgentName: "Cruz Roja Mexicana",
    instructorName: "DR. CARLOS MENDOZA RUIZ",
    employerRepName: "ING. ROBERTO FLORES HERNÁNDEZ",
    workerRepName: "MARÍA ELENA TORRES VEGA",
    status: "issued",
    folioNumber: "DC3-0002/2025",
    notes: "",
  },
  {
    workerName: "HERNÁNDEZ MORALES LUIS ALBERTO",
    workerCurp: "HEML920730HDFXXX02",
    workerOccupationCnoKey: "04.4",
    workerOccupationCnoDesc: "Informática",
    workerPosition: "Técnico en Sistemas",
    companyName: "INDUSTRIAS MONTERREY S.A. DE C.V.",
    companyRfc: "IMO850101AAA",
    courseName: "Uso de Tecnologías de la Información para la Productividad",
    courseDurationHours: 24,
    periodStartDate: "2025-03-01",
    periodEndDate: "2025-03-03",
    thematicAreaKey: "8000",
    thematicAreaDesc: "Uso de tecnologías de la información y comunicación",
    trainingAgentName: "Instituto de Capacitación Tecnológica",
    instructorName: "ING. SOFÍA RAMÍREZ LUNA",
    employerRepName: "ING. ROBERTO FLORES HERNÁNDEZ",
    workerRepName: "",
    status: "draft",
    folioNumber: "",
    notes: "Pendiente de firma del instructor",
  },
  {
    workerName: "MARTÍNEZ SÁNCHEZ CLAUDIA ELENA",
    workerCurp: "MASC880520MDFXXX03",
    workerOccupationCnoKey: "07.1",
    workerOccupationCnoDesc: "Comercio",
    workerPosition: "Ejecutiva de Ventas",
    companyName: "COMERCIALIZADORA DEL NORTE S.A.",
    companyRfc: "CNO880520BBB",
    courseName: "Técnicas de Negociación y Ventas Efectivas",
    courseDurationHours: 12,
    periodStartDate: "2025-04-07",
    periodEndDate: "2025-04-08",
    thematicAreaKey: "2000",
    thematicAreaDesc: "Calidad",
    trainingAgentName: "Centro de Capacitación Empresarial A.C.",
    instructorName: "LIC. DIANA FUENTES CASTILLO",
    employerRepName: "C.P. ARTURO VEGA MORALES",
    workerRepName: "",
    status: "issued",
    folioNumber: "DC3-0003/2025",
    notes: "",
  },
  {
    workerName: "LÓPEZ RAMÍREZ MIGUEL ÁNGEL",
    workerCurp: "LORM750312HDFXXX04",
    workerOccupationCnoKey: "03.4",
    workerOccupationCnoDesc: "Instalación y mantenimiento",
    workerPosition: "Técnico de Mantenimiento",
    companyName: "MANUFACTURA INDUSTRIAL S.A. DE C.V.",
    companyRfc: "MIN750312CCC",
    courseName: "Mantenimiento Preventivo de Maquinaria Industrial",
    courseDurationHours: 40,
    periodStartDate: "2025-05-05",
    periodEndDate: "2025-05-09",
    thematicAreaKey: "3000",
    thematicAreaDesc: "Productividad",
    trainingAgentName: "CECATI No. 15",
    instructorName: "ING. FRANCISCO JIMÉNEZ OLVERA",
    employerRepName: "ING. PATRICIA LUNA ESPINOZA",
    workerRepName: "JORGE ALBERTO REYES CAMPOS",
    status: "issued",
    folioNumber: "DC3-0004/2025",
    notes: "",
  },
  {
    workerName: "TORRES VEGA KARLA PATRICIA",
    workerCurp: "TOVK950628MDFXXX05",
    workerOccupationCnoKey: "10.5",
    workerOccupationCnoDesc: "Publicidad, propaganda y relaciones públicas",
    workerPosition: "Diseñadora Gráfica",
    companyName: "AGENCIA CREATIVA DIGITAL S.C.",
    companyRfc: "ACD950628DDD",
    courseName: "Diseño UX/UI para Aplicaciones Móviles",
    courseDurationHours: 20,
    periodStartDate: "2025-06-02",
    periodEndDate: "2025-06-04",
    thematicAreaKey: "8000",
    thematicAreaDesc: "Uso de tecnologías de la información y comunicación",
    trainingAgentName: "Escuela de Diseño Digital A.C.",
    instructorName: "DIS. ALEJANDRA MORENO SILVA",
    employerRepName: "LIC. SAMUEL ORTEGA PEÑA",
    workerRepName: "",
    status: "issued",
    folioNumber: "DC3-0005/2025",
    notes: "",
  },
  {
    workerName: "FLORES HERNÁNDEZ ROBERTO CARLOS",
    workerCurp: "FOHR800905HDFXXX06",
    workerOccupationCnoKey: "06.2",
    workerOccupationCnoDesc: "Autotransporte",
    workerPosition: "Operador de Transporte",
    companyName: "LOGÍSTICA NACIONAL S.A. DE C.V.",
    companyRfc: "LNA800905EEE",
    courseName: "Manejo Defensivo y Seguridad Vial",
    courseDurationHours: 8,
    periodStartDate: "2025-07-14",
    periodEndDate: "2025-07-14",
    thematicAreaKey: "6000",
    thematicAreaDesc: "Seguridad",
    trainingAgentName: "Secretaría de Comunicaciones y Transportes",
    instructorName: "ING. HÉCTOR SALINAS MORA",
    employerRepName: "LIC. VERÓNICA CASTILLO RÍOS",
    workerRepName: "",
    status: "issued",
    folioNumber: "DC3-0006/2025",
    notes: "",
  },
  {
    workerName: "MENDOZA RUIZ DIANA SOFÍA",
    workerCurp: "MERD970415MDFXXX07",
    workerOccupationCnoKey: "11.2",
    workerOccupationCnoDesc: "Enseñanza",
    workerPosition: "Instructora de Capacitación",
    companyName: "GRUPO EDUCATIVO NACIONAL S.C.",
    companyRfc: "GEN970415FFF",
    courseName: "Metodología de Capacitación por Competencias",
    courseDurationHours: 32,
    periodStartDate: "2025-08-04",
    periodEndDate: "2025-08-07",
    thematicAreaKey: "1000",
    thematicAreaDesc: "Administración",
    trainingAgentName: "CONOCER — Consejo Nacional de Normalización",
    instructorName: "MTRA. LUCÍA VARGAS ESPINOZA",
    employerRepName: "DR. MANUEL RÍOS FUENTES",
    workerRepName: "PROF. ERNESTO CAMPOS LUNA",
    status: "issued",
    folioNumber: "DC3-0007/2025",
    notes: "",
  },
  {
    workerName: "JIMÉNEZ OLVERA FRANCISCO JAVIER",
    workerCurp: "JIOF830622HDFXXX08",
    workerOccupationCnoKey: "05.3",
    workerOccupationCnoDesc: "Alimentos y bebidas",
    workerPosition: "Supervisor de Producción",
    companyName: "ALIMENTOS DEL BAJÍO S.A. DE C.V.",
    companyRfc: "ABA830622GGG",
    courseName: "Buenas Prácticas de Manufactura en Industria Alimentaria",
    courseDurationHours: 16,
    periodStartDate: "2025-09-15",
    periodEndDate: "2025-09-16",
    thematicAreaKey: "6000",
    thematicAreaDesc: "Seguridad",
    trainingAgentName:
      "COFEPRIS — Comisión Federal para la Protección contra Riesgos Sanitarios",
    instructorName: "Q.F.B. ADRIANA MORALES SOTO",
    employerRepName: "ING. BERNARDO ESTRADA VILLA",
    workerRepName: "",
    status: "issued",
    folioNumber: "DC3-0008/2025",
    notes: "Certificado con vigencia de 2 años",
  },
  {
    workerName: "CASTILLO RÍOS VERÓNICA ISABEL",
    workerCurp: "CARV910810MDFXXX09",
    workerOccupationCnoKey: "08.1",
    workerOccupationCnoDesc: "Bolsa, banca y seguros",
    workerPosition: "Analista Financiera",
    companyName: "SERVICIOS FINANCIEROS INTEGRALES S.A.",
    companyRfc: "SFI910810HHH",
    courseName: "Prevención de Lavado de Dinero y Financiamiento al Terrorismo",
    courseDurationHours: 8,
    periodStartDate: "2025-10-20",
    periodEndDate: "2025-10-20",
    thematicAreaKey: "1000",
    thematicAreaDesc: "Administración",
    trainingAgentName: "Comisión Nacional Bancaria y de Valores (CNBV)",
    instructorName: "LIC. GABRIEL TORRES MEDINA",
    employerRepName: "C.P. ROSA ELENA GUTIÉRREZ PONCE",
    workerRepName: "",
    status: "issued",
    folioNumber: "DC3-0009/2025",
    notes: "",
  },
];

// ─── Helper: simular la función generateTemplate del servidor ─────────────────
function buildTestWorkbook(data: typeof DATOS_PRUEBA): Buffer {
  const wb = XLSX.utils.book_new();
  const headers = [
    "Nombre del Trabajador *\n(Apellido paterno, apellido materno y nombre(s))",
    "CURP\n(Clave Única de Registro de Población)",
    "Clave CNO\n(Catálogo Nacional de Ocupaciones)",
    "Descripción Ocupación CNO",
    "Puesto\n(Dato no obligatorio)",
    "Nombre o Razón Social Empresa *\n(Persona física: apellidos y nombre(s))",
    "RFC Empresa\n(Con homoclave SHCP)",
    "Nombre del Curso *",
    "Duración\n(horas)",
    "Fecha Inicio\n(YYYY-MM-DD)",
    "Fecha Fin\n(YYYY-MM-DD)",
    "Clave Área Temática\n(Ver hoja Áreas Temáticas)",
    "Descripción Área Temática",
    "Nombre del Agente Capacitador o STPS",
    "Instructor o Tutor\n(Nombre)",
    "Patrón o Representante Legal *\n(Nombre)",
    "Representante de los Trabajadores\n(Solo para empresas con más de 50 trabajadores)",
    "Estado\n(draft / issued / cancelled)",
    "Folio\n(Auto-generado al emitir)",
    "Notas internas",
  ];
  const rows = data.map(d => [
    d.workerName, // A(0)
    d.workerCurp, // B(1)
    d.workerOccupationCnoKey, // C(2)
    d.workerOccupationCnoDesc, // D(3)
    d.workerPosition, // E(4)
    d.companyName, // F(5)
    d.companyRfc, // G(6)
    d.courseName, // H(7)
    String(d.courseDurationHours), // I(8)
    d.periodStartDate, // J(9)
    d.periodEndDate, // K(10)
    d.thematicAreaKey, // L(11)
    d.thematicAreaDesc, // M(12)
    d.trainingAgentName, // N(13)
    d.instructorName, // O(14)
    d.employerRepName, // P(15)
    d.workerRepName, // Q(16)
    d.status, // R(17)
    d.folioNumber, // S(18)
    d.notes, // T(19)
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, "DC-3 Plantilla");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ─── Helper: simular la función importFromExcel del servidor ──────────────────
function parseImportedRows(
  buffer: Buffer
): Record<string, string | number | null>[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
  }) as unknown[][];
  if (rows.length < 2) throw new Error("El archivo no contiene datos");

  const dataRows = rows.slice(1).filter(row => (row as unknown[])[0]);
  return dataRows.map(rawRow => {
    const row = rawRow as (string | number | undefined)[];
    const statusRaw = String(row[17] ?? "draft")
      .trim()
      .toLowerCase();
    const status = ["draft", "issued", "cancelled"].includes(statusRaw)
      ? statusRaw
      : "draft";
    const durationRaw = parseInt(String(row[8] ?? ""), 10);
    return {
      workerName: String(row[0] ?? "").trim(),
      workerCurp: String(row[1] ?? "").trim() || null,
      workerOccupationCnoKey: String(row[2] ?? "").trim() || null,
      workerOccupationCnoDesc: String(row[3] ?? "").trim() || null,
      workerPosition: String(row[4] ?? "").trim() || null,
      companyName: String(row[5] ?? "").trim(),
      companyRfc: String(row[6] ?? "").trim() || null,
      courseName: String(row[7] ?? "").trim(),
      courseDurationHours: isNaN(durationRaw) ? null : durationRaw,
      periodStartDate: String(row[9] ?? "").trim() || null,
      periodEndDate: String(row[10] ?? "").trim() || null,
      thematicAreaKey: String(row[11] ?? "").trim() || null,
      thematicAreaDesc: String(row[12] ?? "").trim() || null,
      trainingAgentName: String(row[13] ?? "").trim() || null,
      instructorName: String(row[14] ?? "").trim() || null,
      employerRepName: String(row[15] ?? "").trim() || null,
      workerRepName: String(row[16] ?? "").trim() || null,
      status,
      folioNumber: String(row[18] ?? "").trim() || null,
      notes: String(row[19] ?? "").trim() || null,
    };
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("DC-3 Importación y Exportación — Validación de 20 campos oficiales", () => {
  it("La plantilla genera exactamente 20 columnas en el orden oficial", () => {
    const buffer = buildTestWorkbook(DATOS_PRUEBA);
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
    }) as unknown[][];
    const header = rows[0] as string[];
    expect(header).toHaveLength(20);
    // Verificar que los encabezados contienen los campos obligatorios
    expect(header[0]).toContain("Nombre del Trabajador");
    expect(header[5]).toContain("Nombre o Razón Social Empresa");
    expect(header[7]).toContain("Nombre del Curso");
    expect(header[15]).toContain("Patrón o Representante Legal");
  });

  it("La plantilla contiene exactamente 10 filas de datos de prueba", () => {
    const buffer = buildTestWorkbook(DATOS_PRUEBA);
    const wb = XLSX.read(buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
    }) as unknown[][];
    // 1 encabezado + 10 datos
    expect(rows.length).toBe(11);
  });

  it("El mapeo de importación lee correctamente los 20 campos de cada fila", () => {
    const buffer = buildTestWorkbook(DATOS_PRUEBA);
    const parsed = parseImportedRows(buffer);
    expect(parsed).toHaveLength(10);

    // Verificar el primer registro completo
    const r0 = parsed[0];
    expect(r0.workerName).toBe("GARCÍA LÓPEZ JUAN CARLOS");
    expect(r0.workerCurp).toBe("GALJ850101HDFXXX00");
    expect(r0.workerOccupationCnoKey).toBe("08.2");
    expect(r0.workerOccupationCnoDesc).toBe("Administración");
    expect(r0.workerPosition).toBe("Analista Administrativo");
    expect(r0.companyName).toBe("INDUSTRIAS MONTERREY S.A. DE C.V.");
    expect(r0.companyRfc).toBe("IMO850101AAA");
    expect(r0.courseName).toBe(
      "Prevención de Factores de Riesgo Psicosocial NOM-035-STPS-2018"
    );
    expect(r0.courseDurationHours).toBe(16);
    expect(r0.periodStartDate).toBe("2025-01-15");
    expect(r0.periodEndDate).toBe("2025-01-16");
    expect(r0.thematicAreaKey).toBe("6000");
    expect(r0.thematicAreaDesc).toBe("Seguridad");
    expect(r0.trainingAgentName).toBe("Consultoría NOM-035 S.C.");
    expect(r0.instructorName).toBe("LIC. PEDRO MARTÍNEZ SÁNCHEZ");
    expect(r0.employerRepName).toBe("ING. ROBERTO FLORES HERNÁNDEZ");
    expect(r0.workerRepName).toBeNull();
    expect(r0.status).toBe("issued");
    expect(r0.folioNumber).toBe("DC3-0001/2025");
    expect(r0.notes).toBeNull();
  });

  it("Los 3 campos obligatorios (workerName, companyName, courseName) se leen correctamente en todos los registros", () => {
    const buffer = buildTestWorkbook(DATOS_PRUEBA);
    const parsed = parseImportedRows(buffer);
    for (const record of parsed) {
      expect(record.workerName).toBeTruthy();
      expect(record.companyName).toBeTruthy();
      expect(record.courseName).toBeTruthy();
    }
  });

  it("El campo duración se convierte correctamente a número entero", () => {
    const buffer = buildTestWorkbook(DATOS_PRUEBA);
    const parsed = parseImportedRows(buffer);
    const duraciones = parsed.map(r => r.courseDurationHours);
    expect(duraciones[0]).toBe(16);
    expect(duraciones[1]).toBe(8);
    expect(duraciones[2]).toBe(24);
    expect(duraciones[4]).toBe(40);
    expect(duraciones[7]).toBe(32);
    // Todos deben ser números enteros positivos
    for (const d of duraciones) {
      expect(typeof d).toBe("number");
      expect(d as number).toBeGreaterThan(0);
    }
  });

  it("El campo estado se normaliza correctamente (draft/issued/cancelled)", () => {
    const buffer = buildTestWorkbook(DATOS_PRUEBA);
    const parsed = parseImportedRows(buffer);
    // Los registros 0,1,3,4,5,6,7,8,9 son 'issued', el registro 2 es 'draft'
    expect(parsed[0].status).toBe("issued");
    expect(parsed[1].status).toBe("issued");
    expect(parsed[2].status).toBe("draft");
    expect(parsed[3].status).toBe("issued");
    // Todos deben ser uno de los 3 valores válidos
    for (const r of parsed) {
      expect(["draft", "issued", "cancelled"]).toContain(r.status);
    }
  });

  it("El campo Representante de los Trabajadores es null cuando está vacío", () => {
    const buffer = buildTestWorkbook(DATOS_PRUEBA);
    const parsed = parseImportedRows(buffer);
    // Registros sin rep. trabajadores (empresas ≤50 trabajadores)
    expect(parsed[0].workerRepName).toBeNull();
    expect(parsed[2].workerRepName).toBeNull();
    expect(parsed[3].workerRepName).toBeNull();
    // Registros con rep. trabajadores (empresas >50 trabajadores)
    expect(parsed[1].workerRepName).toBe("MARÍA ELENA TORRES VEGA");
    expect(parsed[4].workerRepName).toBe("JORGE ALBERTO REYES CAMPOS");
    expect(parsed[7].workerRepName).toBe("PROF. ERNESTO CAMPOS LUNA");
  });

  it("Los folios se leen correctamente y los borradores no tienen folio", () => {
    const buffer = buildTestWorkbook(DATOS_PRUEBA);
    const parsed = parseImportedRows(buffer);
    expect(parsed[0].folioNumber).toBe("DC3-0001/2025");
    expect(parsed[2].folioNumber).toBeNull(); // draft sin folio
    expect(parsed[9].folioNumber).toBe("DC3-0009/2025");
  });

  it("Las fechas se leen como strings en formato YYYY-MM-DD", () => {
    const buffer = buildTestWorkbook(DATOS_PRUEBA);
    const parsed = parseImportedRows(buffer);
    for (const r of parsed) {
      if (r.periodStartDate) {
        expect(r.periodStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
      if (r.periodEndDate) {
        expect(r.periodEndDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it("Las claves CNO y Área Temática se leen correctamente", () => {
    const buffer = buildTestWorkbook(DATOS_PRUEBA);
    const parsed = parseImportedRows(buffer);
    // Verificar CNO keys
    expect(parsed[0].workerOccupationCnoKey).toBe("08.2");
    expect(parsed[1].workerOccupationCnoKey).toBe("09.1");
    expect(parsed[4].workerOccupationCnoKey).toBe("03.4");
    // Verificar Área Temática keys
    expect(parsed[0].thematicAreaKey).toBe("6000");
    expect(parsed[3].thematicAreaKey).toBe("2000");
    expect(parsed[7].thematicAreaKey).toBe("1000");
  });

  it("Las notas internas se leen correctamente y null cuando están vacías", () => {
    const buffer = buildTestWorkbook(DATOS_PRUEBA);
    const parsed = parseImportedRows(buffer);
    expect(parsed[2].notes).toBe("Pendiente de firma del instructor");
    expect(parsed[8].notes).toBe("Certificado con vigencia de 2 años");
    expect(parsed[0].notes).toBeNull();
    expect(parsed[9].notes).toBeNull();
  });

  it("Ciclo completo: exportar → leer → todos los campos coinciden con los originales", () => {
    const buffer = buildTestWorkbook(DATOS_PRUEBA);
    const parsed = parseImportedRows(buffer);

    // Verificar todos los 10 registros campo por campo
    for (let i = 0; i < DATOS_PRUEBA.length; i++) {
      const original = DATOS_PRUEBA[i];
      const imported = parsed[i];

      expect(imported.workerName).toBe(original.workerName);
      expect(imported.workerCurp).toBe(original.workerCurp || null);
      expect(imported.workerOccupationCnoKey).toBe(
        original.workerOccupationCnoKey || null
      );
      expect(imported.workerOccupationCnoDesc).toBe(
        original.workerOccupationCnoDesc || null
      );
      expect(imported.workerPosition).toBe(original.workerPosition || null);
      expect(imported.companyName).toBe(original.companyName);
      expect(imported.companyRfc).toBe(original.companyRfc || null);
      expect(imported.courseName).toBe(original.courseName);
      expect(imported.courseDurationHours).toBe(original.courseDurationHours);
      expect(imported.periodStartDate).toBe(original.periodStartDate || null);
      expect(imported.periodEndDate).toBe(original.periodEndDate || null);
      expect(imported.thematicAreaKey).toBe(original.thematicAreaKey || null);
      expect(imported.thematicAreaDesc).toBe(original.thematicAreaDesc || null);
      expect(imported.trainingAgentName).toBe(
        original.trainingAgentName || null
      );
      expect(imported.instructorName).toBe(original.instructorName || null);
      expect(imported.employerRepName).toBe(original.employerRepName || null);
      expect(imported.workerRepName).toBe(original.workerRepName || null);
      expect(imported.status).toBe(original.status);
      expect(imported.folioNumber).toBe(original.folioNumber || null);
      expect(imported.notes).toBe(original.notes || null);
    }
  });
});
