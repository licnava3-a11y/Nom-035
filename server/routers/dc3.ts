import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { dc3Records } from "../../drizzle/schema";
import { eq, desc, and, like, or, sql } from "drizzle-orm";
import * as XLSX from "xlsx";

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
  workerName: z.string().min(1, "El nombre del trabajador es obligatorio"),
  workerCurp: z.string().max(18).optional().nullable(),
  workerOccupationCnoKey: z.string().max(10).optional().nullable(),
  workerOccupationCnoDesc: z.string().max(255).optional().nullable(),
  workerPosition: z.string().max(255).optional().nullable(),
  companyName: z.string().min(1, "El nombre de la empresa es obligatorio"),
  companyRfc: z.string().max(15).optional().nullable(),
  courseName: z.string().min(1, "El nombre del curso es obligatorio"),
  courseDurationHours: z.number().int().positive().optional().nullable(),
  periodStartDate: z.string().optional().nullable(),
  periodEndDate: z.string().optional().nullable(),
  thematicAreaKey: z.string().max(10).optional().nullable(),
  thematicAreaDesc: z.string().max(255).optional().nullable(),
  trainingAgentName: z.string().max(255).optional().nullable(),
  instructorName: z.string().max(255).optional().nullable(),
  employerRepName: z.string().max(255).optional().nullable(),
  workerRepName: z.string().max(255).optional().nullable(),
  status: z.enum(["draft", "issued", "cancelled"]).default("draft"),
  folioNumber: z.string().max(50).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// ─── Helper: generar folio ────────────────────────────────────────────────────

function generateDC3Folio(id: number): string {
  const year = new Date().getFullYear();
  return `DC3-${String(id).padStart(4, "0")}/${year}`;
}

// ─── Helper: generar plantilla Excel ─────────────────────────────────────────

function buildDC3Template(): Buffer {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Datos DC-3
  const headers = [
    "Nombre del Trabajador*",
    "CURP",
    "Clave CNO (Ocupación)",
    "Descripción Ocupación CNO",
    "Puesto",
    "Nombre o Razón Social Empresa*",
    "RFC Empresa",
    "Nombre del Curso*",
    "Duración (horas)",
    "Fecha Inicio (YYYY-MM-DD)",
    "Fecha Fin (YYYY-MM-DD)",
    "Clave Área Temática",
    "Descripción Área Temática",
    "Agente Capacitador / STPS",
    "Instructor o Tutor",
    "Patrón o Representante Legal",
    "Representante de los Trabajadores",
    "Estado (draft/issued/cancelled)",
    "Folio",
    "Notas",
  ];

  const exampleRows = [
    [
      "GARCÍA LÓPEZ JUAN CARLOS",
      "GALJ850101HDFXXX00",
      "08.2",
      "Administración",
      "Analista Administrativo",
      "EMPRESA EJEMPLO S.A. DE C.V.",
      "EEJ850101XXX",
      "Curso de Prevención de Riesgos Psicosociales NOM-035",
      "16",
      "2025-01-15",
      "2025-01-16",
      "6000",
      "Seguridad",
      "Consultoría NOM-035 S.C.",
      "LIC. PEDRO MARTÍNEZ SÁNCHEZ",
      "ING. ROBERTO FLORES HERNÁNDEZ",
      "MARÍA ELENA TORRES VEGA",
      "issued",
      "DC3-0001/2025",
      "",
    ],
    [
      "RODRÍGUEZ PÉREZ ANA LAURA",
      "ROPA900215MDFXXX01",
      "09.1",
      "Servicios médicos",
      "Enfermera",
      "EMPRESA EJEMPLO S.A. DE C.V.",
      "EEJ850101XXX",
      "Primeros Auxilios y Manejo de Emergencias",
      "8",
      "2025-02-10",
      "2025-02-10",
      "6000",
      "Seguridad",
      "Cruz Roja Mexicana",
      "DR. CARLOS MENDOZA RUIZ",
      "ING. ROBERTO FLORES HERNÁNDEZ",
      "",
      "issued",
      "DC3-0002/2025",
      "",
    ],
  ];

  const wsData = XLSX.utils.aoa_to_sheet([headers, ...exampleRows]);

  // Ancho de columnas
  wsData["!cols"] = [
    { wch: 35 }, { wch: 20 }, { wch: 15 }, { wch: 35 }, { wch: 30 },
    { wch: 40 }, { wch: 15 }, { wch: 50 }, { wch: 12 }, { wch: 18 },
    { wch: 18 }, { wch: 18 }, { wch: 35 }, { wch: 35 }, { wch: 35 },
    { wch: 35 }, { wch: 35 }, { wch: 20 }, { wch: 18 }, { wch: 30 },
  ];

  XLSX.utils.book_append_sheet(wb, wsData, "DC-3 Datos");

  // Hoja 2: Catálogo CNO
  const cnoCatalog = [
    ["CLAVE", "DESCRIPCIÓN OCUPACIÓN (CNO)"],
    ...CNO_AREAS.map((a) => [a.key, a.label]),
  ];
  const wsCno = XLSX.utils.aoa_to_sheet(cnoCatalog);
  wsCno["!cols"] = [{ wch: 10 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsCno, "Catálogo CNO");

  // Hoja 3: Catálogo Áreas Temáticas
  const thematicCatalog = [
    ["CLAVE", "ÁREA TEMÁTICA"],
    ...THEMATIC_AREAS.map((a) => [a.key, a.label]),
  ];
  const wsThematic = XLSX.utils.aoa_to_sheet(thematicCatalog);
  wsThematic["!cols"] = [{ wch: 10 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsThematic, "Áreas Temáticas");

  // Hoja 4: Instrucciones
  const instructions = [
    ["INSTRUCCIONES DE LLENADO — FORMATO DC-3 STPS"],
    [""],
    ["CAMPOS OBLIGATORIOS (marcados con *)"],
    ["  • Nombre del Trabajador: Apellido paterno, apellido materno y nombre(s)"],
    ["  • Nombre o Razón Social Empresa: En caso de persona física, anotar apellidos y nombre(s)"],
    ["  • Nombre del Curso"],
    [""],
    ["CAMPOS OPCIONALES"],
    ["  • CURP: 18 caracteres"],
    ["  • RFC Empresa: Con homoclave (SHCP)"],
    ["  • Clave CNO: Consultar hoja 'Catálogo CNO' — Catálogo Nacional de Ocupaciones (STPS)"],
    ["  • Clave Área Temática: Consultar hoja 'Áreas Temáticas'"],
    ["  • Duración: Número entero de horas"],
    ["  • Fechas: Formato YYYY-MM-DD (ej. 2025-01-15)"],
    ["  • Estado: draft (borrador) | issued (emitida) | cancelled (cancelada)"],
    [""],
    ["NOTAS LEGALES"],
    ["  • La constancia debe entregarse al trabajador dentro de los 20 días hábiles siguientes al término del curso."],
    ["  • Los datos se asientan bajo protesta de decir verdad."],
    ["  • Para empresas con más de 50 trabajadores firma el representante del patrón ante la Comisión Mixta."],
    ["  • El campo 'Representante de los Trabajadores' solo aplica para empresas con más de 50 trabajadores."],
    [""],
    ["FUENTE: Formato DC-3 oficial STPS — www.stps.gob.mx"],
  ];
  const wsInst = XLSX.utils.aoa_to_sheet(instructions);
  wsInst["!cols"] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsInst, "Instrucciones");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ─── Helper: exportar registros a Excel ──────────────────────────────────────

function buildDC3Export(records: typeof dc3Records.$inferSelect[]): Buffer {
  const wb = XLSX.utils.book_new();

  const headers = [
    "ID", "Folio", "Estado",
    "Nombre del Trabajador", "CURP", "Clave CNO", "Descripción CNO", "Puesto",
    "Empresa", "RFC Empresa",
    "Nombre del Curso", "Duración (hrs)", "Fecha Inicio", "Fecha Fin",
    "Clave Área Temática", "Descripción Área Temática", "Agente Capacitador",
    "Instructor", "Patrón/Rep. Legal", "Rep. Trabajadores",
    "Notas", "Fecha Creación",
  ];

  const rows = records.map((r) => [
    r.id,
    r.folioNumber ?? "",
    r.status,
    r.workerName,
    r.workerCurp ?? "",
    r.workerOccupationCnoKey ?? "",
    r.workerOccupationCnoDesc ?? "",
    r.workerPosition ?? "",
    r.companyName,
    r.companyRfc ?? "",
    r.courseName,
    r.courseDurationHours ?? "",
    r.periodStartDate ? String(r.periodStartDate) : "",
    r.periodEndDate ? String(r.periodEndDate) : "",
    r.thematicAreaKey ?? "",
    r.thematicAreaDesc ?? "",
    r.trainingAgentName ?? "",
    r.instructorName ?? "",
    r.employerRepName ?? "",
    r.workerRepName ?? "",
    r.notes ?? "",
    r.createdAt ? new Date(r.createdAt).toLocaleDateString("es-MX") : "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 18) }));
  XLSX.utils.book_append_sheet(wb, ws, "DC-3 Registros");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

// ─── Router ───────────────────────────────────────────────────────────────────

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
      if (!record) throw new Error("Registro DC-3 no encontrado");
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

  // Descargar plantilla Excel
  downloadTemplate: protectedProcedure.mutation(() => {
    const buffer = buildDC3Template();
    return {
      filename: "plantilla_dc3_stps.xlsx",
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

  // Importar desde Excel
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

      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 }) as unknown[][];

      if (rows.length < 2) {
        throw new Error("El archivo no contiene datos. Asegúrese de usar la plantilla oficial.");
      }

      const dataRows = rows.slice(1).filter((row) => (row as unknown[])[0]); // Saltar encabezado, ignorar vacíos

      const results = { imported: 0, errors: [] as string[] };

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i] as (string | number | undefined)[];
        const rowNum = i + 2;

        try {
          const workerName = String(row[0] ?? "").trim();
          const companyName = String(row[5] ?? "").trim();
          const courseName = String(row[7] ?? "").trim();

          if (!workerName || !companyName || !courseName) {
            results.errors.push(`Fila ${rowNum}: Nombre del trabajador, empresa y curso son obligatorios.`);
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
            workerName,
            workerCurp: String(row[1] ?? "").trim() || null,
            workerOccupationCnoKey: String(row[2] ?? "").trim() || null,
            workerOccupationCnoDesc: String(row[3] ?? "").trim() || null,
            workerPosition: String(row[4] ?? "").trim() || null,
            companyName,
            companyRfc: String(row[6] ?? "").trim() || null,
            courseName,
            courseDurationHours: duration,
            periodStartDate: startDateRaw || null,
            periodEndDate: endDateRaw || null,
            thematicAreaKey: String(row[11] ?? "").trim() || null,
            thematicAreaDesc: String(row[12] ?? "").trim() || null,
            trainingAgentName: String(row[13] ?? "").trim() || null,
            instructorName: String(row[14] ?? "").trim() || null,
            employerRepName: String(row[15] ?? "").trim() || null,
            workerRepName: String(row[16] ?? "").trim() || null,
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
});
