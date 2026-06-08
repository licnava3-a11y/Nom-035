import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { dc3Records, companyDigitalSignature } from "../../drizzle/schema";
import { eq, desc, and, like, or, sql, gte, lte } from "drizzle-orm";
import * as XLSX from "xlsx";
import { extractCURPData } from "../lib/curp-validator";
import { validateRFC, formatRFC } from "../lib/rfc-validator";
import * as employeesDb from "../db-employees";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import { createHash } from "crypto";
import QRCode from "qrcode";

// ─── Catálogos oficiales STPS ──────────────────────────────────────────────────

export const CNO_AREAS = [
  { key: "01", label: "Cultivo, crianza y aprovechamiento" },
  { key: "01.1", label: "Agricultura y silvicultura" },
  { key: "01.2", label: "Ganadería" },
  { key: "01.3", label: "Pesca y acuacultura" },
  { key: "02", label: "Extracción y suministro" },
  { key: "02.1", label: "Exploración" },
  { key: "02.2", label: "Extracción" },
  { key: "02.3", label: "Refinación y beneficio" },
  { key: "02.4", label: "Provisión de energía" },
  { key: "02.5", label: "Provisión de agua" },
  { key: "03", label: "Construcción" },
  { key: "03.1", label: "Planeación y dirección de obras" },
  { key: "03.2", label: "Edificación y urbanización" },
  { key: "03.3", label: "Acabado" },
  { key: "03.4", label: "Instalación y mantenimiento" },
  { key: "04", label: "Tecnología" },
  { key: "04.1", label: "Mecánica" },
  { key: "04.2", label: "Electricidad" },
  { key: "04.3", label: "Electrónica" },
  { key: "04.4", label: "Informática" },
  { key: "04.5", label: "Telecomunicaciones" },
  { key: "04.6", label: "Procesos industriales" },
  { key: "05", label: "Procesamiento y fabricación" },
  { key: "05.1", label: "Minerales no metálicos" },
  { key: "05.2", label: "Metales" },
  { key: "05.3", label: "Alimentos y bebidas" },
  { key: "05.4", label: "Textiles y prendas de vestir" },
  { key: "05.5", label: "Materia orgánica" },
  { key: "05.6", label: "Productos químicos" },
  { key: "05.7", label: "Productos metálicos y de hule y plástico" },
  { key: "05.8", label: "Productos eléctricos y electrónicos" },
  { key: "05.9", label: "Productos impresos" },
  { key: "06", label: "Transporte" },
  { key: "06.1", label: "Ferroviario" },
  { key: "06.2", label: "Autotransporte" },
  { key: "06.3", label: "Aéreo" },
  { key: "06.4", label: "Marítimo y fluvial" },
  { key: "06.5", label: "Servicios de apoyo" },
  { key: "07", label: "Provisión de bienes y servicios" },
  { key: "07.1", label: "Comercio" },
  { key: "07.2", label: "Alimentación y hospedaje" },
  { key: "07.3", label: "Turismo" },
  { key: "07.4", label: "Deporte y esparcimiento" },
  { key: "07.5", label: "Servicios personales" },
  { key: "07.6", label: "Reparación de artículos de uso doméstico y personal" },
  { key: "07.7", label: "Limpieza" },
  { key: "07.8", label: "Servicio postal y mensajería" },
  { key: "08", label: "Gestión y soporte administrativo" },
  { key: "08.1", label: "Bolsa, banca y seguros" },
  { key: "08.2", label: "Administración" },
  { key: "08.3", label: "Servicios legales" },
  { key: "09", label: "Salud y protección social" },
  { key: "09.1", label: "Servicios médicos" },
  { key: "09.2", label: "Inspección sanitaria y del medio ambiente" },
  { key: "09.3", label: "Seguridad social" },
  { key: "09.4", label: "Protección de bienes y/o personas" },
  { key: "10", label: "Comunicación" },
  { key: "10.1", label: "Publicación" },
  { key: "10.2", label: "Radio, cine, televisión y teatro" },
  { key: "10.3", label: "Interpretación artística" },
  { key: "10.4", label: "Traducción e interpretación lingüística" },
  { key: "10.5", label: "Publicidad, propaganda y relaciones públicas" },
  { key: "11", label: "Desarrollo y extensión del conocimiento" },
  { key: "11.1", label: "Investigación" },
  { key: "11.2", label: "Enseñanza" },
  { key: "11.3", label: "Difusión cultural" },
];

export const THEMATIC_AREAS = [
  { key: "1000", label: "Producción general" },
  { key: "2000", label: "Servicios" },
  { key: "3000", label: "Administración, contabilidad y economía" },
  { key: "4000", label: "Comercialización" },
  { key: "5000", label: "Mantenimiento y reparación" },
  { key: "6000", label: "Seguridad" },
  { key: "7000", label: "Desarrollo personal y familiar" },
  { key: "8000", label: "Uso de tecnologías de la información y comunicación" },
  { key: "9000", label: "Participación social" },
];

// ─── Zod schema ───────────────────────────────────────────────────────────────

const dc3RecordSchema = z.object({
  // BLOQUE 1: DATOS DEL TRABAJADOR
  workerName: z.string().min(1, "El nombre del trabajador es obligatorio"),
  workerCurp: z.string().max(18).optional().nullable(),
  workerOccupationCnoKey: z.string().max(10).optional().nullable(),
  workerOccupationCnoDesc: z.string().max(255).optional().nullable(),
  workerPosition: z.string().max(255).optional().nullable(), // Dato no obligatorio según DC-3

  // BLOQUE 2: DATOS DE LA EMPRESA
  companyName: z.string().min(1, "El nombre de la empresa es obligatorio"),
  companyRfc: z.string().max(15).optional().nullable(),

  // BLOQUE 3: DATOS DEL PROGRAMA DE CAPACITACIÓN, ADIESTRAMIENTO Y PRODUCTIVIDAD
  courseName: z.string().min(1, "El nombre del curso es obligatorio"),
  courseDurationHours: z.number().int().positive().optional().nullable(),
  periodStartDate: z.string().optional().nullable(),
  periodEndDate: z.string().optional().nullable(),
  thematicAreaKey: z.string().max(10).optional().nullable(),
  thematicAreaDesc: z.string().max(255).optional().nullable(),
  trainingAgentName: z.string().max(255).optional().nullable(), // Agente capacitador o STPS

  // FIRMANTES (bajo protesta de decir verdad)
  instructorName: z.string().max(255).optional().nullable(),      // Instructor o tutor
  employerRepName: z.string().max(255).optional().nullable(),     // Patrón o representante legal
  workerRepName: z.string().max(255).optional().nullable(),       // Representante de los trabajadores (>50 trabajadores)

  // Control interno
  status: z.enum(["draft", "issued", "cancelled"]).default("draft"),
  folioNumber: z.string().max(50).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ─── Helper: generar folio ────────────────────────────────────────────────────

function generateDC3Folio(id: number): string {
  const year = new Date().getFullYear();
  return `DC3-${String(id).padStart(4, "0")}/${year}`;
}

// ─── Helper: generar plantilla Excel oficial DC-3 ─────────────────────────────
//
// Estructura basada en el FORMATO DC-3 oficial STPS:
// CONSTANCIA DE COMPETENCIAS O DE HABILIDADES LABORALES
//
// ANVERSO:
//   BLOQUE 1 — DATOS DEL TRABAJADOR
//   BLOQUE 2 — DATOS DE LA EMPRESA
//   BLOQUE 3 — DATOS DEL PROGRAMA DE CAPACITACIÓN, ADIESTRAMIENTO Y PRODUCTIVIDAD
//   FIRMANTES — Instructor/tutor | Patrón o rep. legal | Rep. trabajadores
//
// REVERSO:
//   Catálogo CNO (Áreas y subáreas del Catálogo Nacional de Ocupaciones)
//   Catálogo de Áreas Temáticas de los Cursos

function buildDC3Template(): Buffer {
  const wb = XLSX.utils.book_new();

  // ── Hoja 1: Plantilla de captura (estructura del ANVERSO del DC-3) ──────────
  //
  // Columnas en el MISMO orden que aparecen en el formato oficial STPS:
  //
  // COL A  — Nombre del Trabajador* (Apellido paterno, apellido materno y nombre(s))
  // COL B  — CURP (Clave Única de Registro de Población — 18 caracteres)
  // COL C  — Clave CNO (Ocupación específica — Catálogo Nacional de Ocupaciones)
  // COL D  — Descripción Ocupación CNO
  // COL E  — Puesto* (dato no obligatorio según formato oficial)
  // COL F  — Nombre o Razón Social Empresa* (persona física: apellidos y nombre)
  // COL G  — RFC Empresa (con homoclave SHCP — formato: XXXX-XXXXXX-XXX)
  // COL H  — Nombre del Curso*
  // COL I  — Duración en horas
  // COL J  — Fecha Inicio Periodo (YYYY-MM-DD)
  // COL K  — Fecha Fin Periodo (YYYY-MM-DD)
  // COL L  — Clave Área Temática del Curso (ver hoja Áreas Temáticas)
  // COL M  — Descripción Área Temática
  // COL N  — Nombre del Agente Capacitador o STPS
  // COL O  — Instructor o Tutor (Nombre y firma)
  // COL P  — Patrón o Representante Legal (Nombre y firma)
  // COL Q  — Representante de los Trabajadores (solo empresas >50 trabajadores)
  // COL R  — Estado (draft=Borrador | issued=Emitida | cancelled=Cancelada)
  // COL S  — Folio (auto-generado al emitir: DC3-XXXX/YYYY)
  // COL T  — Notas internas

  const headers = [
    // BLOQUE 1: DATOS DEL TRABAJADOR
    "Nombre del Trabajador *\n(Apellido paterno, apellido materno y nombre(s))",
    "CURP\n(Clave Única de Registro de Población)",
    "Clave CNO\n(Catálogo Nacional de Ocupaciones)",
    "Descripción Ocupación CNO",
    "Puesto\n(Dato no obligatorio)",

    // BLOQUE 2: DATOS DE LA EMPRESA
    "Nombre o Razón Social Empresa *\n(Persona física: apellidos y nombre(s))",
    "RFC Empresa\n(Con homoclave SHCP)",

    // BLOQUE 3: DATOS DEL PROGRAMA DE CAPACITACIÓN
    "Nombre del Curso *",
    "Duración\n(horas)",
    "Fecha Inicio\n(YYYY-MM-DD)",
    "Fecha Fin\n(YYYY-MM-DD)",
    "Clave Área Temática\n(Ver hoja Áreas Temáticas)",
    "Descripción Área Temática",
    "Nombre del Agente Capacitador o STPS",

    // FIRMANTES (bajo protesta de decir verdad)
    "Instructor o Tutor\n(Nombre)",
    "Patrón o Representante Legal *\n(Nombre — empresas ≤50 trabajadores: patrón;\nempresa >50: rep. ante Comisión Mixta)",
    "Representante de los Trabajadores\n(Solo para empresas con más de 50 trabajadores)",

    // Control interno
    "Estado\n(draft / issued / cancelled)",
    "Folio\n(Auto-generado al emitir)",
    "Notas internas",
  ];

  const exampleRows = [
    [
      // BLOQUE 1
      "GARCÍA LÓPEZ JUAN CARLOS",
      "GALJ850101HDFXXX00",
      "08.2",
      "Administración",
      "Analista Administrativo",
      // BLOQUE 2
      "EMPRESA EJEMPLO S.A. DE C.V.",
      "EEJ850101XXX",
      // BLOQUE 3
      "Prevención de Factores de Riesgo Psicosocial NOM-035-STPS-2018",
      "16",
      "2025-01-15",
      "2025-01-16",
      "6000",
      "Seguridad",
      "Consultoría NOM-035 S.C.",
      // Firmantes
      "LIC. PEDRO MARTÍNEZ SÁNCHEZ",
      "ING. ROBERTO FLORES HERNÁNDEZ",
      "",
      // Control
      "issued",
      "DC3-0001/2025",
      "",
    ],
    [
      // BLOQUE 1
      "RODRÍGUEZ PÉREZ ANA LAURA",
      "ROPA900215MDFXXX01",
      "09.1",
      "Servicios médicos",
      "Enfermera",
      // BLOQUE 2
      "EMPRESA EJEMPLO S.A. DE C.V.",
      "EEJ850101XXX",
      // BLOQUE 3
      "Primeros Auxilios y Manejo de Emergencias",
      "8",
      "2025-02-10",
      "2025-02-10",
      "6000",
      "Seguridad",
      "Cruz Roja Mexicana",
      // Firmantes
      "DR. CARLOS MENDOZA RUIZ",
      "ING. ROBERTO FLORES HERNÁNDEZ",
      "MARÍA ELENA TORRES VEGA",
      // Control
      "issued",
      "DC3-0002/2025",
      "",
    ],
    [
      // BLOQUE 1
      "HERNÁNDEZ MORALES LUIS ALBERTO",
      "HEML920730HDFXXX02",
      "04.4",
      "Informática",
      "Técnico en Sistemas",
      // BLOQUE 2
      "EMPRESA EJEMPLO S.A. DE C.V.",
      "EEJ850101XXX",
      // BLOQUE 3
      "Uso de Tecnologías de la Información para la Productividad",
      "24",
      "2025-03-01",
      "2025-03-03",
      "8000",
      "Uso de tecnologías de la información y comunicación",
      "Instituto de Capacitación Tecnológica",
      // Firmantes
      "ING. SOFÍA RAMÍREZ LUNA",
      "ING. ROBERTO FLORES HERNÁNDEZ",
      "",
      // Control
      "draft",
      "",
      "Pendiente de firma del instructor",
    ],
  ];

  const wsData = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);

  // Anchos de columna ajustados al contenido oficial
  wsData["!cols"] = [
    { wch: 40 }, // A: Nombre trabajador
    { wch: 22 }, // B: CURP
    { wch: 12 }, // C: Clave CNO
    { wch: 38 }, // D: Descripción CNO
    { wch: 28 }, // E: Puesto
    { wch: 42 }, // F: Empresa
    { wch: 16 }, // G: RFC
    { wch: 52 }, // H: Nombre del curso
    { wch: 10 }, // I: Duración horas
    { wch: 16 }, // J: Fecha inicio
    { wch: 16 }, // K: Fecha fin
    { wch: 14 }, // L: Clave área temática
    { wch: 38 }, // M: Descripción área temática
    { wch: 38 }, // N: Agente capacitador
    { wch: 35 }, // O: Instructor
    { wch: 40 }, // P: Patrón/rep. legal
    { wch: 38 }, // Q: Rep. trabajadores
    { wch: 12 }, // R: Estado
    { wch: 16 }, // S: Folio
    { wch: 30 }, // T: Notas
  ];

  // Altura de la fila de encabezados para que quepan los textos multilínea
  wsData["!rows"] = [{ hpt: 60 }];

  XLSX.utils.book_append_sheet(wb, wsData, "DC-3 Plantilla");

  // ── Hoja 2: Catálogo CNO (REVERSO del DC-3) ──────────────────────────────────
  const cnoCatalog = [
    ["CLAVES Y DENOMINACIONES DE ÁREAS Y SUBÁREAS DEL CATÁLOGO NACIONAL DE OCUPACIONES"],
    [""],
    ["CLAVE DEL ÁREA/SUBÁREA", "DENOMINACIÓN"],
    ...CNO_AREAS.map((a) => [a.key, a.label]),
  ];
  const wsCno = XLSX.utils.aoa_to_sheet(cnoCatalog);
  wsCno["!cols"] = [{ wch: 22 }, { wch: 55 }];
  wsCno["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  XLSX.utils.book_append_sheet(wb, wsCno, "Catálogo CNO");

  // ── Hoja 3: Catálogo Áreas Temáticas (REVERSO del DC-3) ──────────────────────
  const thematicCatalog = [
    ["CLAVES Y DENOMINACIONES DEL CATÁLOGO DE ÁREAS TEMÁTICAS DE LOS CURSOS"],
    [""],
    ["CLAVE DEL ÁREA", "DENOMINACIÓN"],
    ...THEMATIC_AREAS.map((a) => [a.key, a.label]),
  ];
  const wsThematic = XLSX.utils.aoa_to_sheet(thematicCatalog);
  wsThematic["!cols"] = [{ wch: 16 }, { wch: 55 }];
  wsThematic["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
  XLSX.utils.book_append_sheet(wb, wsThematic, "Áreas Temáticas");

  // ── Hoja 4: Instrucciones oficiales ──────────────────────────────────────────
  const instructions = [
    ["INSTRUCCIONES DE LLENADO — FORMATO DC-3 STPS"],
    ["CONSTANCIA DE COMPETENCIAS O DE HABILIDADES LABORALES"],
    [""],
    ["INSTRUCCIONES OFICIALES (según el reverso del formato DC-3):"],
    ["  • Llenar a máquina o con letra de molde."],
    ["  • Deberá entregarse al trabajador dentro de los veinte días hábiles siguientes al término del curso de capacitación aprobado."],
    [""],
    ["CAMPOS OBLIGATORIOS (marcados con *)"],
    ["  • Nombre del Trabajador: Anotar apellido paterno, apellido materno y nombre(s)"],
    ["  • Nombre o Razón Social Empresa: En caso de persona física, anotar apellidos y nombre(s)"],
    ["  • Nombre del Curso"],
    [""],
    ["CAMPOS OPCIONALES"],
    ["  • Puesto: Dato no obligatorio según el formato oficial DC-3"],
    ["  • CURP: 18 caracteres"],
    ["  • RFC Empresa: Con homoclave (SHCP) — formato: XXXX-XXXXXX-XXX"],
    ["  • Clave CNO: Consultar hoja 'Catálogo CNO' — Catálogo Nacional de Ocupaciones (www.stps.gob.mx)"],
    ["  • Clave Área Temática: Consultar hoja 'Áreas Temáticas' (www.stps.gob.mx)"],
    ["  • Duración: Número entero de horas"],
    ["  • Fechas: Formato YYYY-MM-DD (ej. 2025-01-15)"],
    ["  • Estado: draft (borrador) | issued (emitida) | cancelled (cancelada)"],
    [""],
    ["NOTAS LEGALES (según el formato oficial DC-3):"],
    ["  1. Las áreas y subáreas ocupacionales del CNO están disponibles en el reverso del formato y en www.stps.gob.mx"],
    ["  2. Las áreas temáticas de los cursos están disponibles en el reverso del formato y en www.stps.gob.mx"],
    ["  3. Cursos impartidos por el área competente de la Secretaría del Trabajo y Previsión Social."],
    ["  4. Para empresas con menos de 51 trabajadores firma el patrón o representante legal."],
    ["     Para empresas con más de 50 trabajadores firma el representante del patrón ante la Comisión Mixta"],
    ["     de capacitación, adiestramiento y productividad."],
    ["  5. El campo 'Representante de los Trabajadores' solo aplica para empresas con más de 50 trabajadores."],
    ["  *  El campo 'Puesto' es dato no obligatorio."],
    [""],
    ["Los datos se asientan bajo protesta de decir verdad, apercibidos de la responsabilidad en que incurre"],
    ["todo aquel que no se conduce con verdad."],
    [""],
    ["FUENTE: Formato DC-3 oficial STPS — www.stps.gob.mx"],
    ["Referencia: DC-3reforma-3 — Constancia de Competencias o de Habilidades Laborales"],
  ];
  const wsInst = XLSX.utils.aoa_to_sheet(instructions);
  wsInst["!cols"] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, wsInst, "Instrucciones Oficiales");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ─── Helper: exportar registros a Excel ──────────────────────────────────────

function buildDC3Export(records: typeof dc3Records.$inferSelect[]): Buffer {
  const wb = XLSX.utils.book_new();

  // Encabezados en el mismo orden que la plantilla oficial
  const headers = [
    "ID", "Folio", "Estado",
    // BLOQUE 1: DATOS DEL TRABAJADOR
    "Nombre del Trabajador", "CURP", "Clave CNO", "Descripción CNO", "Puesto",
    // BLOQUE 2: DATOS DE LA EMPRESA
    "Nombre o Razón Social Empresa", "RFC Empresa",
    // BLOQUE 3: DATOS DEL PROGRAMA DE CAPACITACIÓN
    "Nombre del Curso", "Duración (horas)", "Fecha Inicio", "Fecha Fin",
    "Clave Área Temática", "Descripción Área Temática", "Agente Capacitador o STPS",
    // FIRMANTES
    "Instructor o Tutor", "Patrón o Representante Legal", "Representante de los Trabajadores",
    // Control
    "Notas", "Fecha Creación",
  ];

  const rows = records.map((r) => [
    r.id,
    r.folioNumber ?? "",
    r.status === "issued" ? "Emitida" : r.status === "cancelled" ? "Cancelada" : "Borrador",
    // BLOQUE 1
    r.workerName,
    r.workerCurp ?? "",
    r.workerOccupationCnoKey ?? "",
    r.workerOccupationCnoDesc ?? "",
    r.workerPosition ?? "",
    // BLOQUE 2
    r.companyName,
    r.companyRfc ?? "",
    // BLOQUE 3
    r.courseName,
    r.courseDurationHours ?? "",
    r.periodStartDate ? String(r.periodStartDate).slice(0, 10) : "",
    r.periodEndDate ? String(r.periodEndDate).slice(0, 10) : "",
    r.thematicAreaKey ?? "",
    r.thematicAreaDesc ?? "",
    r.trainingAgentName ?? "",
    // Firmantes
    r.instructorName ?? "",
    r.employerRepName ?? "",
    r.workerRepName ?? "",
    // Control
    r.notes ?? "",
    r.createdAt ? new Date(r.createdAt).toLocaleDateString("es-MX") : "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 18) }));
  XLSX.utils.book_append_sheet(wb, ws, "DC-3 Registros");

  // Incluir catálogos de referencia en el export también
  const cnoCatalog = [
    ["CLAVE", "DESCRIPCIÓN OCUPACIÓN (CNO)"],
    ...CNO_AREAS.map((a) => [a.key, a.label]),
  ];
  const wsCno = XLSX.utils.aoa_to_sheet(cnoCatalog);
  wsCno["!cols"] = [{ wch: 12 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsCno, "Catálogo CNO");

  const thematicCatalog = [
    ["CLAVE", "ÁREA TEMÁTICA"],
    ...THEMATIC_AREAS.map((a) => [a.key, a.label]),
  ];
  const wsThematic = XLSX.utils.aoa_to_sheet(thematicCatalog);
  wsThematic["!cols"] = [{ wch: 12 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsThematic, "Áreas Temáticas");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ─── Router ───────────────────────────────────────────────────────────────────

// ─── Helper: lookup CURP en API externa ─────────────────────────────────────

async function lookupCurpExternal(curp: string): Promise<{
  nombres?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  sexo?: string;
  fechaNacimiento?: string;
  entidadNacimiento?: string;
  source: "api" | "local";
}> {
  const token = process.env.CURP_API_TOKEN;
  if (token) {
    try {
      const url = `https://api.valida-curp.com.mx/curp/obtener_datos/?token=${encodeURIComponent(token)}&curp=${encodeURIComponent(curp)}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const json = await res.json() as any;
        if (!json.error && json.response?.Solicitante) {
          const s = json.response.Solicitante;
          return {
            nombres: s.Nombres ?? undefined,
            apellidoPaterno: s.ApellidoPaterno ?? undefined,
            apellidoMaterno: s.ApellidoMaterno ?? undefined,
            sexo: s.ClaveSexo === "H" ? "Masculino" : s.ClaveSexo === "M" ? "Femenino" : undefined,
            fechaNacimiento: s.FechaNacimiento ?? undefined,
            entidadNacimiento: s.EntidadNacimiento ?? undefined,
            source: "api",
          };
        }
      }
    } catch {
      // Fallback silencioso a validación local
    }
  }
  return { source: "local" };
}

export const dc3Router = router({
  // Catálogos
  getCatalogs: protectedProcedure.query(() => ({
    cnoAreas: CNO_AREAS,
    thematicAreas: THEMATIC_AREAS,
  })),

  // Listar registros con paginación y búsqueda
  list: protectedProcedure
    .input(z.object({
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(100).default(20),
      search: z.string().optional(),
      status: z.enum(["draft", "issued", "cancelled", "all"]).default("all"),
      // Filtros avanzados
      companyFilter: z.string().optional(),
      courseFilter: z.string().optional(),
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      thematicAreaFilter: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const offset = (input.page - 1) * input.pageSize;

      const conditions = [];
      if (input.search) {
        conditions.push(
          or(
            like(dc3Records.workerName, `%${input.search}%`),
            like(dc3Records.courseName, `%${input.search}%`),
            like(dc3Records.companyName, `%${input.search}%`),
            like(dc3Records.folioNumber, `%${input.search}%`),
          )
        );
      }
      if (input.status !== "all") {
        conditions.push(eq(dc3Records.status, input.status));
      }
      // Filtros avanzados
      if (input.companyFilter) {
        conditions.push(like(dc3Records.companyName, `%${input.companyFilter}%`));
      }
      if (input.courseFilter) {
        conditions.push(like(dc3Records.courseName, `%${input.courseFilter}%`));
      }
      if (input.dateFrom) {
        conditions.push(gte(dc3Records.periodStartDate, new Date(input.dateFrom)));
      }
      if (input.dateTo) {
        conditions.push(lte(dc3Records.periodEndDate, new Date(input.dateTo)));
      }
      if (input.thematicAreaFilter) {
        conditions.push(eq(dc3Records.thematicAreaKey, input.thematicAreaFilter));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [records, countResult] = await Promise.all([
        db.select().from(dc3Records)
          .where(where)
          .orderBy(desc(dc3Records.createdAt))
          .limit(input.pageSize)
          .offset(offset),
        db.select({ count: sql<number>`COUNT(*)` }).from(dc3Records).where(where),
      ]);

      return {
        records,
        total: Number(countResult[0]?.count ?? 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  // Obtener un registro por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const [record] = await db.select().from(dc3Records).where(eq(dc3Records.id, input.id));
      if (!record) throw new Error("Registro no encontrado");
      return record;
    }),

  // Crear registro
  create: protectedProcedure
    .input(dc3RecordSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const [result] = await (db.insert(dc3Records) as any).values({
        ...input,
        periodStartDate: input.periodStartDate ? new Date(input.periodStartDate) : null,
        periodEndDate: input.periodEndDate ? new Date(input.periodEndDate) : null,
        createdBy: ctx.user.id,
      });
      const insertId = (result as { insertId: number }).insertId;
      // Auto-generar folio si se emite
      if (input.status === "issued") {
        const folio = generateDC3Folio(insertId);
        await db.update(dc3Records).set({ folioNumber: folio }).where(eq(dc3Records.id, insertId));
      }
      return { id: insertId, success: true };
    }),

  // Actualizar registro
  update: protectedProcedure
    .input(z.object({ id: z.number().int(), data: dc3RecordSchema.partial() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const updateData: Record<string, unknown> = {
        ...input.data,
        updatedBy: ctx.user.id,
      };
      if (input.data.periodStartDate !== undefined) {
        updateData.periodStartDate = input.data.periodStartDate ? new Date(input.data.periodStartDate) : null;
      }
      if (input.data.periodEndDate !== undefined) {
        updateData.periodEndDate = input.data.periodEndDate ? new Date(input.data.periodEndDate) : null;
      }
      // Auto-generar folio al emitir
      if (input.data.status === "issued") {
        const [existing] = await db.select({ folioNumber: dc3Records.folioNumber }).from(dc3Records).where(eq(dc3Records.id, input.id));
        if (!existing?.folioNumber) {
          updateData.folioNumber = generateDC3Folio(input.id);
        }
      }
      await db.update(dc3Records).set(updateData).where(eq(dc3Records.id, input.id));
      return { success: true };
    }),

  // Eliminar registro
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      await db.delete(dc3Records).where(eq(dc3Records.id, input.id));
      return { success: true };
    }),

  // Descargar plantilla Excel oficial DC-3
  downloadTemplate: protectedProcedure.mutation(() => {
    const buffer = buildDC3Template();
    return {
      filename: "plantilla_dc3_oficial_stps.xlsx",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      data: buffer.toString("base64"),
    };
  }),

  // Exportar registros a Excel
  exportToExcel: protectedProcedure
    .input(z.object({
      status: z.enum(["draft", "issued", "cancelled", "all"]).default("all"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const conditions = input.status !== "all" ? [eq(dc3Records.status, input.status)] : [];
      const records = await db.select().from(dc3Records)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(dc3Records.createdAt));

      const buffer = buildDC3Export(records);
      return {
        filename: `dc3_registros_${new Date().toISOString().slice(0, 10)}.xlsx`,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        data: buffer.toString("base64"),
        count: records.length,
      };
    }),

  // Importar desde Excel (compatible con la plantilla oficial)
  importFromExcel: protectedProcedure
    .input(z.object({
      fileBase64: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("DB no disponible");
      const buffer = Buffer.from(input.fileBase64, "base64");
      const wb = XLSX.read(buffer, { type: "buffer" });

      // Leer la primera hoja (DC-3 Plantilla o DC-3 Datos)
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];

      if (rows.length < 2) {
        throw new Error("El archivo no contiene datos. Asegúrese de usar la plantilla oficial DC-3.");
      }

      // Saltar encabezado (fila 0), ignorar filas vacías
      const dataRows = rows.slice(1).filter((row) => (row as unknown[])[0]);

      const results = { imported: 0, errors: [] as string[] };

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i] as (string | number | undefined)[];
        const rowNum = i + 2;

        try {
          // Columnas en el orden de la plantilla oficial:
          // A(0)=Nombre trabajador, B(1)=CURP, C(2)=Clave CNO, D(3)=Desc CNO, E(4)=Puesto
          // F(5)=Empresa, G(6)=RFC
          // H(7)=Curso, I(8)=Duración, J(9)=Fecha inicio, K(10)=Fecha fin
          // L(11)=Clave área, M(12)=Desc área, N(13)=Agente capacitador
          // O(14)=Instructor, P(15)=Patrón/rep legal, Q(16)=Rep trabajadores
          // R(17)=Estado, S(18)=Folio, T(19)=Notas

          const workerName = String(row[0] ?? "").trim();
          const companyName = String(row[5] ?? "").trim();
          const courseName = String(row[7] ?? "").trim();

          if (!workerName || !companyName || !courseName) {
            results.errors.push(`Fila ${rowNum}: Nombre del trabajador (col A), empresa (col F) y curso (col H) son obligatorios.`);
            continue;
          }

          const statusRaw = String(row[17] ?? "draft").trim().toLowerCase();
          const status = ["draft", "issued", "cancelled"].includes(statusRaw)
            ? (statusRaw as "draft" | "issued" | "cancelled")
            : "draft";

          const durationRaw = parseInt(String(row[8] ?? ""), 10);
          const duration = isNaN(durationRaw) ? null : durationRaw;

          const startDateRaw = String(row[9] ?? "").trim();
          const endDateRaw = String(row[10] ?? "").trim();

          const [insertResult] = await (db.insert(dc3Records) as any).values({
            // BLOQUE 1: DATOS DEL TRABAJADOR
            workerName,
            workerCurp: String(row[1] ?? "").trim() || null,
            workerOccupationCnoKey: String(row[2] ?? "").trim() || null,
            workerOccupationCnoDesc: String(row[3] ?? "").trim() || null,
            workerPosition: String(row[4] ?? "").trim() || null,
            // BLOQUE 2: DATOS DE LA EMPRESA
            companyName,
            companyRfc: String(row[6] ?? "").trim() || null,
            // BLOQUE 3: DATOS DEL PROGRAMA
            courseName,
            courseDurationHours: duration,
            periodStartDate: startDateRaw || null,
            periodEndDate: endDateRaw || null,
            thematicAreaKey: String(row[11] ?? "").trim() || null,
            thematicAreaDesc: String(row[12] ?? "").trim() || null,
            trainingAgentName: String(row[13] ?? "").trim() || null,
            // FIRMANTES
            instructorName: String(row[14] ?? "").trim() || null,
            employerRepName: String(row[15] ?? "").trim() || null,
            workerRepName: String(row[16] ?? "").trim() || null,
            // Control
            status,
            folioNumber: String(row[18] ?? "").trim() || null,
            notes: String(row[19] ?? "").trim() || null,
            createdBy: ctx.user.id,
          });

          // Auto-generar folio si se emite y no tiene folio
          const insertId = (insertResult as { insertId: number }).insertId;
          if (status === "issued" && !String(row[18] ?? "").trim()) {
            await db.update(dc3Records)
              .set({ folioNumber: generateDC3Folio(insertId) })
              .where(eq(dc3Records.id, insertId));
          }

          results.imported++;
        } catch (err) {
          results.errors.push(`Fila ${rowNum}: ${err instanceof Error ? err.message : "Error desconocido"}`);
        }
      }

      return results;
    }),

  // ─── Validar RFC ────────────────────────────────────────────────────────────
  validateRFC: protectedProcedure
    .input(z.object({ rfc: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const result = validateRFC(input.rfc.trim().toUpperCase());
      return {
        valid: result.valid,
        type: result.type,
        error: result.error,
        rfc: result.rfc,
        rfcFormatted: result.valid ? formatRFC(result.rfc) : null,
        homoclave: result.homoclave,
      };
    }),

  // ─── Exportar registro individual a PDF ──────────────────────────────────────
  exportToPdf: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const [record] = await db.select().from(dc3Records).where(eq(dc3Records.id, input.id));
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Registro DC-3 no encontrado" });

      const PDFDocument = (await import("pdfkit")).default;
      const doc = new PDFDocument({ size: "LETTER", margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      const finishPromise = new Promise<Buffer>((resolve) => { doc.on("end", () => resolve(Buffer.concat(chunks))); });

      // ── Generar / reutilizar hash de verificación SHA-256 ───────────────────────────────────────
      let verificationHash = record.verificationHash;
      if (!verificationHash) {
        // Construir la cadena canónica con los campos inmutables del registro
        const canonical = [
          record.id,
          record.workerName,
          record.workerCurp ?? "",
          record.companyName,
          record.companyRfc ?? "",
          record.courseName,
          record.courseDurationHours ?? "",
          record.periodStartDate ? String(record.periodStartDate).slice(0, 10) : "",
          record.periodEndDate ? String(record.periodEndDate).slice(0, 10) : "",
          record.thematicAreaKey ?? "",
          record.folioNumber ?? "",
          record.createdAt.toISOString(),
        ].join("|");
        verificationHash = createHash("sha256").update(canonical, "utf8").digest("hex");
        // Persistir el hash para que sea inmutable a partir de ahora
        await db.update(dc3Records)
          .set({ verificationHash })
          .where(eq(dc3Records.id, record.id));
      }

      // URL pública de verificación
      const appUrl = process.env.APP_PUBLIC_URL ?? "https://nom035mood-32dy4ksx.manus.space";
      const verifyUrl = `${appUrl}/verificar-dc3?hash=${verificationHash}`;

      // Generar QR como Buffer PNG (200x200 px)
      const qrBuffer: Buffer = await QRCode.toBuffer(verifyUrl, {
        type: "png",
        width: 200,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#ffffff" },
      });

      // Encabezado
      doc.fontSize(14).font("Helvetica-Bold").text("DC-3", { align: "center" });
      doc.fontSize(10).font("Helvetica").text("CONSTANCIA DE COMPETENCIAS O HABILIDADES LABORALES", { align: "center" });
      doc.fontSize(8).text("Formato oficial STPS — Artículo 153-A de la Ley Federal del Trabajo", { align: "center" });
      if (record.folioNumber) {
        doc.fontSize(9).font("Helvetica-Bold").text(`Folio: ${record.folioNumber}`, { align: "right" });
      }
      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(572, doc.y).stroke();
      doc.moveDown(0.5);

      const field = (label: string, value: string | null | undefined) => {
        doc.fontSize(8).font("Helvetica-Bold").text(`${label}: `, { continued: true });
        doc.font("Helvetica").text(value ?? "—");
      };

      // Bloque 1: Trabajador
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#1a5276").text("I. DATOS DEL TRABAJADOR");
      doc.fillColor("black");
      field("Nombre", record.workerName);
      field("CURP", record.workerCurp);
      field("Clave CNO", record.workerOccupationCnoKey ? `${record.workerOccupationCnoKey} — ${record.workerOccupationCnoDesc ?? ""}` : null);
      field("Puesto", record.workerPosition);
      doc.moveDown(0.5);

      // Bloque 2: Empresa
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#1a5276").text("II. DATOS DE LA EMPRESA");
      doc.fillColor("black");
      field("Nombre o Razón Social", record.companyName);
      field("RFC", record.companyRfc);
      doc.moveDown(0.5);

      // Bloque 3: Programa
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#1a5276").text("III. DATOS DEL PROGRAMA DE CAPACITACIÓN");
      doc.fillColor("black");
      field("Nombre del Curso", record.courseName);
      field("Duración", record.courseDurationHours ? `${record.courseDurationHours} horas` : null);
      const startDate = record.periodStartDate ? String(record.periodStartDate).slice(0, 10) : "—";
      const endDate = record.periodEndDate ? String(record.periodEndDate).slice(0, 10) : "—";
      field("Período", `${startDate} al ${endDate}`);
      field("Área Temática", record.thematicAreaKey ? `${record.thematicAreaKey} — ${record.thematicAreaDesc ?? ""}` : null);
      field("Agente Capacitador", record.trainingAgentName);
      doc.moveDown(0.5);

      // Bloque 4: Firmantes con imágenes de firma
      doc.fontSize(9).font("Helvetica-Bold").fillColor("#1a5276").text("IV. FIRMAS");
      doc.fillColor("black");
      doc.moveDown(0.5);

      // Descargar imágenes de firma desde S3 (en paralelo)
      const fetchSignatureBuffer = async (url: string | null | undefined): Promise<Buffer | null> => {
        if (!url) return null;
        try {
          const https = await import("https");
          const http = await import("http");
          return await new Promise<Buffer>((resolve, reject) => {
            const client = url.startsWith("https") ? https.default : http.default;
            client.get(url, (res) => {
              const bufs: Buffer[] = [];
              res.on("data", (d: Buffer) => bufs.push(d));
              res.on("end", () => resolve(Buffer.concat(bufs)));
              res.on("error", reject);
            }).on("error", reject);
          });
        } catch {
          return null;
        }
      };

      const [instrBuf, emplBuf, workerBuf] = await Promise.all([
        fetchSignatureBuffer(record.instructorSignatureUrl),
        fetchSignatureBuffer(record.employerSignatureUrl),
        fetchSignatureBuffer(record.workerRepSignatureUrl),
      ]);

      const colW = 160;
      const sigBoxH = 50; // altura reservada para la imagen de firma
      const labelH = 20;
      const startY = doc.y;

      const cols = [
        { x: 50, label: "Instructor o Tutor", name: record.instructorName, buf: instrBuf },
        { x: 50 + colW + 20, label: "Patrón o Rep. Legal", name: record.employerRepName, buf: emplBuf },
        { x: 50 + (colW + 20) * 2, label: "Rep. de Trabajadores", name: record.workerRepName, buf: workerBuf },
      ];

      for (const col of cols) {
        // Imagen de firma (si existe)
        if (col.buf) {
          doc.image(col.buf, col.x, startY, { width: colW, height: sigBoxH, fit: [colW, sigBoxH], align: "center", valign: "bottom" });
        }
        // Línea de firma
        const lineY = startY + sigBoxH;
        doc.moveTo(col.x, lineY).lineTo(col.x + colW, lineY).stroke();
        doc.fontSize(7).font("Helvetica-Bold").text(col.label, col.x, lineY + 3, { width: colW, align: "center" });
        doc.fontSize(7).font("Helvetica").text(col.name ?? "(No especificado)", col.x, lineY + 13, { width: colW, align: "center" });
      }

      doc.y = startY + sigBoxH + labelH + 15;
      doc.moveDown(0.5);

      // Nota legal + QR de verificación
      doc.moveTo(40, doc.y).lineTo(572, doc.y).stroke();
      doc.moveDown(0.3);

      // Bloque QR a la derecha, texto legal a la izquierda
      const qrSize = 70;
      const qrX = 572 - qrSize; // margen derecho
      const qrY = doc.y;

      // Texto legal (columna izquierda, ancho reducido para dejar espacio al QR)
      doc.fontSize(7).font("Helvetica").fillColor("#555")
        .text(
          "Los datos asentados en esta constancia se hacen bajo protesta de decir verdad. " +
          "La constancia debe entregarse al trabajador dentro de los 20 días hábiles siguientes al término del curso.",
          40, qrY, { width: 460, align: "justify" }
        );

      // QR incrustado
      doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

      // Leyenda bajo el QR
      doc.fontSize(5.5).fillColor("#444")
        .text("Verificar autenticidad", qrX, qrY + qrSize + 1, { width: qrSize, align: "center" });

      // Mover el cursor al final del bloque QR
      const blockBottom = qrY + qrSize + 12;
      if (doc.y < blockBottom) doc.y = blockBottom;

      doc.moveDown(0.3);
      doc.fontSize(7).fillColor("#888")
        .text(
          `Generado: ${new Date().toLocaleDateString("es-MX")} | ` +
          `Estado: ${record.status === "issued" ? "Emitida" : record.status === "draft" ? "Borrador" : "Cancelada"} | ` +
          `Hash: ${verificationHash.slice(0, 16)}…`,
          { align: "right" }
        );

      doc.end();
      const pdfBuffer = await finishPromise;
      return {
        pdfBase64: pdfBuffer.toString("base64"),
        folioNumber: record.folioNumber ?? `DC3-${record.id}`,
        verificationHash,
        verifyUrl,
      };
    }),

  // ─── Lookup CURP: valida formato + busca en empleados + llama API externa si hay token ───
  lookupCurp: protectedProcedure
    .input(z.object({ curp: z.string().min(18).max(18) }))
    .mutation(async ({ input }) => {
      const curp = input.curp.trim().toUpperCase();

      // 1. Validar formato localmente
      const localData = extractCURPData(curp);
      if (!localData.valid) {
        return {
          found: false as const,
          source: "local" as const,
          error: localData.errors?.[0] ?? "CURP inválida",
          localData: null,
          employeeData: null,
        };
      }

      // 2. Buscar en empleados existentes (coincidencia exacta por CURP)
      let employeeData: {
        workerName: string;
        workerPosition: string;
        workerOccupationCnoKey: string;
        workerOccupationCnoDesc: string;
      } | null = null;

      try {
        const employee = await employeesDb.getEmployeeByCURP(curp);
        if (employee) {
          // employees table: firstName (nombre), lastName (apellidos juntos)
          const fullName = [
            employee.lastName ?? "",
            employee.firstName ?? "",
          ].filter(Boolean).join(" ").toUpperCase();
          employeeData = {
            workerName: fullName,
            workerPosition: "", // positionId requiere join; se omite por simplicidad
            workerOccupationCnoKey: "",
            workerOccupationCnoDesc: "",
          };
        }
      } catch {
        // Ignorar errores de lookup en empleados
      }

      // 3. Intentar API externa (solo si hay token configurado)
      const apiData = await lookupCurpExternal(curp);

      // Construir nombre completo desde API si no hay empleado local
      let workerNameFromApi: string | undefined;
      if (apiData.source === "api" && apiData.apellidoPaterno) {
        workerNameFromApi = [
          apiData.apellidoPaterno,
          apiData.apellidoMaterno,
          apiData.nombres,
        ].filter(Boolean).join(" ").toUpperCase();
      }

      return {
        found: true as const,
        source: apiData.source,
        error: null,
        localData: {
          sexo: localData.sexo,
          genero: localData.genero,
          fechaNacimiento: localData.fechaNacimiento,
          estado: localData.estado,
          edad: localData.edad,
        },
        employeeData,
        apiData: apiData.source === "api" ? {
          nombres: apiData.nombres,
          apellidoPaterno: apiData.apellidoPaterno,
          apellidoMaterno: apiData.apellidoMaterno,
          sexo: apiData.sexo,
          fechaNacimiento: apiData.fechaNacimiento,
          entidadNacimiento: apiData.entidadNacimiento,
          workerName: workerNameFromApi,
        } : null,
      };
    }),

  // ─── Guardar firma digital en un registro DC-3 ───────────────────────────────────────────
  // Recibe el data-URL PNG del canvas, lo sube a S3 y actualiza el registro.
  saveSignature: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      role: z.enum(["instructor", "employer", "workerRep"]),
      signatureDataUrl: z.string().min(10, "Firma requerida"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const [record] = await db.select().from(dc3Records).where(eq(dc3Records.id, input.id));
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Registro DC-3 no encontrado" });

      // Subir imagen a S3
      const base64Data = input.signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
      const fileBuffer = Buffer.from(base64Data, "base64");
      const timestamp = Date.now();
      const sigKey = `dc3-signatures/dc3-${input.id}-${input.role}-${timestamp}.png`;
      const { url: sigUrl } = await storagePut(sigKey, fileBuffer, "image/png");

      // Actualizar la columna correspondiente
      const updateData: Record<string, string | Date> = { signaturesUpdatedAt: new Date() };
      if (input.role === "instructor") {
        updateData.instructorSignatureUrl = sigUrl;
        updateData.instructorSignatureKey = sigKey;
      } else if (input.role === "employer") {
        updateData.employerSignatureUrl = sigUrl;
        updateData.employerSignatureKey = sigKey;
      } else {
        updateData.workerRepSignatureUrl = sigUrl;
        updateData.workerRepSignatureKey = sigKey;
      }
      await db.update(dc3Records).set(updateData as any).where(eq(dc3Records.id, input.id));
      return { success: true, url: sigUrl };
    }),

  // ─── Obtener las firmas de un registro DC-3 ───────────────────────────────────────────────
  getSignatures: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const [record] = await db.select({
        instructorSignatureUrl: dc3Records.instructorSignatureUrl,
        employerSignatureUrl: dc3Records.employerSignatureUrl,
        workerRepSignatureUrl: dc3Records.workerRepSignatureUrl,
        signaturesUpdatedAt: dc3Records.signaturesUpdatedAt,
      }).from(dc3Records).where(eq(dc3Records.id, input.id));
      if (!record) throw new TRPCError({ code: "NOT_FOUND", message: "Registro DC-3 no encontrado" });
      return record;
    }),

  // ─── Borrar una firma de un registro DC-3 ─────────────────────────────────────────────────
  clearSignature: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      role: z.enum(["instructor", "employer", "workerRep"]),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const updateData: Record<string, null | Date> = { signaturesUpdatedAt: new Date() };
      if (input.role === "instructor") {
        updateData.instructorSignatureUrl = null;
        updateData.instructorSignatureKey = null;
      } else if (input.role === "employer") {
        updateData.employerSignatureUrl = null;
        updateData.employerSignatureKey = null;
      } else {
        updateData.workerRepSignatureUrl = null;
        updateData.workerRepSignatureKey = null;
      }
      await db.update(dc3Records).set(updateData as any).where(eq(dc3Records.id, input.id));
      return { success: true };
    }),

  // ─── Listar firmantes del catálogo companyDigitalSignature ──────────────────────────────

  // ─── Verificar autenticidad de una constancia DC-3 (endpoint público) ────────────────────
  verify: publicProcedure
    .input(z.object({ hash: z.string().min(1).max(64) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const [record] = await db.select({
        id: dc3Records.id,
        workerName: dc3Records.workerName,
        workerCurp: dc3Records.workerCurp,
        companyName: dc3Records.companyName,
        companyRfc: dc3Records.companyRfc,
        courseName: dc3Records.courseName,
        courseDurationHours: dc3Records.courseDurationHours,
        periodStartDate: dc3Records.periodStartDate,
        periodEndDate: dc3Records.periodEndDate,
        thematicAreaKey: dc3Records.thematicAreaKey,
        thematicAreaDesc: dc3Records.thematicAreaDesc,
        instructorName: dc3Records.instructorName,
        employerRepName: dc3Records.employerRepName,
        workerRepName: dc3Records.workerRepName,
        status: dc3Records.status,
        folioNumber: dc3Records.folioNumber,
        verificationHash: dc3Records.verificationHash,
        createdAt: dc3Records.createdAt,
        updatedAt: dc3Records.updatedAt,
        instructorSignatureUrl: dc3Records.instructorSignatureUrl,
        employerSignatureUrl: dc3Records.employerSignatureUrl,
        workerRepSignatureUrl: dc3Records.workerRepSignatureUrl,
      }).from(dc3Records).where(eq(dc3Records.verificationHash, input.hash));

      if (!record) {
        return { found: false as const, record: null };
      }
      return { found: true as const, record };
    }),

  listSigners: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
    return db.select({
      id: companyDigitalSignature.id,
      nombreFirmante: companyDigitalSignature.nombreFirmante,
      cargo: companyDigitalSignature.cargo,
      departamento: companyDigitalSignature.departamento,
      firmaUrl: companyDigitalSignature.firmaUrl,
      tipoFirmante: companyDigitalSignature.tipoFirmante,
      estadoAutorizacion: companyDigitalSignature.estadoAutorizacion,
      activo: companyDigitalSignature.activo,
    }).from(companyDigitalSignature)
      .where(and(
        eq(companyDigitalSignature.activo, true),
        eq(companyDigitalSignature.estadoAutorizacion, "autorizado"),
      ));
  }),
});
