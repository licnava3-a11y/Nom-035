/**
 * HR Integration Router — P4
 * Importación de empleados desde sistemas de nómina externos:
 *   - CONTPAQi Nóminas (layout estándar)
 *   - Aspel NOI (layout estándar)
 *   - SAP HCM (CSV/XLSX export)
 *   - Oracle HCM (CSV export)
 *   - Formato genérico NOM-035 (columnas en español)
 *
 * Flujo:
 *   1. El cliente sube el archivo (base64) e indica el sistema origen.
 *   2. El router normaliza las columnas al modelo interno de employees.
 *   3. Se devuelve una vista previa (preview) con los primeros 10 registros y
 *      el mapeo detectado, para que el usuario confirme antes de importar.
 *   4. Al confirmar, se llama a `confirmImport` con los datos ya normalizados.
 */

import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as employeesDb from "../db-employees";
import { getDb } from "../db";

// ─── Tipos de sistema origen ──────────────────────────────────────────────────

export const HR_SYSTEMS = [
  { id: "contpaqiNominas", label: "CONTPAQi Nóminas",          vendor: "Grupo Caminante" },
  { id: "aspelNoi",        label: "Aspel NOI",                vendor: "Aspel" },
  { id: "sapHcm",          label: "SAP HCM / SuccessFactors", vendor: "SAP" },
  { id: "oracleHcm",       label: "Oracle HCM Cloud",         vendor: "Oracle" },
  { id: "nomipaq",         label: "Nomipaq",                  vendor: "Computación en Acción" },
  { id: "suaImss",         label: "SUA / IMSS (TXT/CSV)",     vendor: "IMSS" },
  { id: "generic",         label: "Formato Genérico NOM-035", vendor: "Personalizado" },
] as const;

export type HrSystemId = typeof HR_SYSTEMS[number]["id"];

// ─── Mapeos de columnas por sistema ──────────────────────────────────────────
//
// Cada entrada mapea el nombre de columna del sistema externo al campo interno.
// Los valores son arreglos porque el mismo campo puede tener varios alias.

const COLUMN_MAPS: Record<HrSystemId, Record<string, string>> = {
  contpaqiNominas: {
    // CONTPAQi Nóminas 18 — layout estándar de exportación de empleados
    "Clave":                    "employeeNumber",
    "Nombre":                   "nombre",        // "APELLIDO PATERNO APELLIDO MATERNO NOMBRE(S)"
    "RFC":                      "rfc",
    "CURP":                     "curp",
    "NSS":                      "nss",
    "Departamento":             "departamento",
    "Puesto":                   "puesto",
    "Fecha de Alta":            "fechaIngreso",
    "Fecha Alta":               "fechaIngreso",
    "Salario Diario":           "salarioDiario",
    "Tipo de Jornada":          "tipoJornada",
    "Sexo":                     "sexo",
    "Fecha de Nacimiento":      "fechaNacimiento",
    "Correo Electrónico":       "email",
    "Correo":                   "email",
    "Teléfono":                 "telefono",
    "Registro Patronal":        "registroPatronal",
  },
  aspelNoi: {
    // Aspel NOI — layout de importación/exportación de trabajadores
    "CLAVE":                    "employeeNumber",
    "NOMBRE":                   "nombre",
    "RFC":                      "rfc",
    "CURP":                     "curp",
    "NSS":                      "nss",
    "DEPARTAMENTO":             "departamento",
    "PUESTO":                   "puesto",
    "FECHA INGRESO":            "fechaIngreso",
    "FECHA DE INGRESO":         "fechaIngreso",
    "SALARIO DIARIO":           "salarioDiario",
    "SEXO":                     "sexo",
    "FECHA NACIMIENTO":         "fechaNacimiento",
    "EMAIL":                    "email",
    "CORREO":                   "email",
    "TELEFONO":                 "telefono",
    "CELULAR":                  "telefono",
  },
  sapHcm: {
    // SAP HCM — export CSV estándar
    "Personnel Number":         "employeeNumber",
    "Employee ID":              "employeeNumber",
    "Last Name":                "lastName",
    "First Name":               "firstName",
    "RFC":                      "rfc",
    "CURP":                     "curp",
    "Social Security Number":   "nss",
    "NSS":                      "nss",
    "Department":               "departamento",
    "Position":                 "puesto",
    "Job Title":                "puesto",
    "Hire Date":                "fechaIngreso",
    "Gender":                   "sexo",
    "Date of Birth":            "fechaNacimiento",
    "Email":                    "email",
    "Business Email":           "email",
    "Phone":                    "telefono",
    "Mobile":                   "telefono",
  },
  oracleHcm: {
    // Oracle HCM Cloud — export CSV estándar
    "Person Number":            "employeeNumber",
    "Last Name":                "lastName",
    "First Name":               "firstName",
    "RFC":                      "rfc",
    "CURP":                     "curp",
    "National Identifier":      "nss",
    "Department Name":          "departamento",
    "Job Name":                 "puesto",
    "Hire Date":                "fechaIngreso",
    "Gender":                   "sexo",
    "Date of Birth":            "fechaNacimiento",
    "Work Email":               "email",
    "Phone Number":             "telefono",
  },
  nomipaq: {
    // Nomipaq — layout de exportación
    "Clave Empleado":           "employeeNumber",
    "Nombre Completo":          "nombre",
    "RFC":                      "rfc",
    "CURP":                     "curp",
    "NSS":                      "nss",
    "Área":                     "departamento",
    "Puesto":                   "puesto",
    "Fecha Ingreso":            "fechaIngreso",
    "Sexo":                     "sexo",
    "Fecha Nacimiento":         "fechaNacimiento",
    "Email":                    "email",
    "Teléfono":                 "telefono",
  },
  suaImss: {
    // SUA (Sistema Único de Autodeterminación) / IMSS — layout CSV/TXT
    "NSS":                      "nss",
    "NOMBRE DEL TRABAJADOR":    "nombre",
    "NOMBRE":                   "nombre",
    "RFC":                      "rfc",
    "CURP":                     "curp",
    "SALARIO DIARIO INTEGRADO": "salarioDiario",
    "SDI":                      "salarioDiario",
    "FECHA DE ALTA":             "fechaIngreso",
    "FECHA ALTA":                "fechaIngreso",
    "TIPO DE TRABAJADOR":        "tipoTrabajador",
    "REGISTRO PATRONAL":         "registroPatronal",
    "SEXO":                      "sexo",
    "FECHA DE NACIMIENTO":       "fechaNacimiento",
    "CLAVE":                     "employeeNumber",
    "NO. TRABAJADOR":            "employeeNumber",
  },
  generic: {
    // Formato genérico NOM-035 (columnas en español)
    "nombre":                   "nombre",
    "apellidos":                "lastName",
    "nombre(s)":                "firstName",
    "email":                    "email",
    "correo":                   "email",
    "rfc":                      "rfc",
    "curp":                     "curp",
    "nss":                      "nss",
    "departamento":             "departamento",
    "area":                     "departamento",
    "puesto":                   "puesto",
    "cargo":                    "puesto",
    "fechaIngreso":             "fechaIngreso",
    "fechaAlta":                "fechaIngreso",
    "sexo":                     "sexo",
    "genero":                   "sexo",
    "telefono":                 "telefono",
    "celular":                  "telefono",
    "numeroEmpleado":           "employeeNumber",
    "claveEmpleado":            "employeeNumber",
    "nivelEducativo":           "educationLevel",
    "salario":                  "salarioDiario",
  },
};

// ─── Normalizar una fila cruda al modelo interno ──────────────────────────────

function normalizeRow(raw: Record<string, any>, systemId: HrSystemId): Record<string, any> {
  const map = COLUMN_MAPS[systemId] ?? COLUMN_MAPS.generic;
  const normalized: Record<string, any> = {};

  // Aplicar mapeo de columnas (case-insensitive)
  for (const [rawKey, rawVal] of Object.entries(raw)) {
    const trimmedKey = rawKey.trim();
    // Buscar coincidencia exacta primero, luego case-insensitive
    const internalKey = map[trimmedKey]
      ?? map[trimmedKey.toLowerCase()]
      ?? map[Object.keys(map).find(k => k.toLowerCase() === trimmedKey.toLowerCase()) ?? ""];
    if (internalKey) {
      normalized[internalKey] = rawVal;
    } else {
      // Pasar columna desconocida tal cual (puede ser útil en preview)
      normalized[`_raw_${trimmedKey}`] = rawVal;
    }
  }

  // Resolver nombre completo → firstName + lastName
  if (normalized.nombre && !normalized.firstName) {
    const parts = String(normalized.nombre).trim().split(/\s+/);
    if (parts.length >= 3) {
      normalized.firstName = parts.slice(2).join(" ");
      normalized.lastName  = parts.slice(0, 2).join(" ");
    } else if (parts.length === 2) {
      normalized.firstName = parts[1];
      normalized.lastName  = parts[0];
    } else {
      normalized.firstName = parts[0];
      normalized.lastName  = "";
    }
  }

  // Normalizar género
  const sexoRaw = String(normalized.sexo ?? "").toLowerCase().trim();
  if (["m", "masculino", "male", "hombre", "h", "1"].includes(sexoRaw)) {
    normalized.gender = "male";
  } else if (["f", "femenino", "female", "mujer", "2"].includes(sexoRaw)) {
    normalized.gender = "female";
  } else {
    normalized.gender = null;
  }

  // Normalizar RFC y CURP a mayúsculas
  if (normalized.rfc)  normalized.rfc  = String(normalized.rfc).toUpperCase().trim();
  if (normalized.curp) normalized.curp = String(normalized.curp).toUpperCase().trim();
  if (normalized.nss)  normalized.nss  = String(normalized.nss).trim();
  if (normalized.employeeNumber) normalized.employeeNumber = String(normalized.employeeNumber).trim();

  return normalized;
}

// ─── Detectar columnas no mapeadas ───────────────────────────────────────────

function detectUnmappedColumns(rows: Record<string, any>[]): string[] {
  if (rows.length === 0) return [];
  const allKeys = new Set<string>();
  rows.forEach(r => Object.keys(r).filter(k => k.startsWith("_raw_")).forEach(k => allKeys.add(k.replace("_raw_", ""))));
  return Array.from(allKeys);
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const hrIntegrationRouter = router({
  /**
   * Listar sistemas HR disponibles
   */
  listSystems: protectedProcedure.query(() => {
    return HR_SYSTEMS;
  }),

  /**
   * Previsualizar importación: parsear archivo y devolver primeros 10 registros normalizados
   * sin guardar nada en BD.
   */
  previewImport: protectedProcedure
    .input(z.object({
      fileData: z.string(),       // base64
      fileName: z.string(),
      systemId: z.enum(["contpaqiNominas", "aspelNoi", "sapHcm", "oracleHcm", "nomipaq", "suaImss", "generic"]),
    }))
    .mutation(async ({ input }) => {
      const xlsx = await import("xlsx");
      const buffer = Buffer.from(input.fileData, "base64");
      const workbook = xlsx.read(buffer, { type: "buffer", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData: Record<string, any>[] = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

      if (rawData.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El archivo está vacío o no tiene datos." });
      }

      const normalized = rawData.map(r => normalizeRow(r, input.systemId));
      const unmappedColumns = detectUnmappedColumns(normalized);
      const preview = normalized.slice(0, 10).map(r => {
        // Limpiar claves _raw_ para el preview
        const clean: Record<string, any> = {};
        for (const [k, v] of Object.entries(r)) {
          if (!k.startsWith("_raw_")) clean[k] = v;
        }
        return clean;
      });

      return {
        totalRows: rawData.length,
        previewRows: preview,
        unmappedColumns,
        detectedSystem: input.systemId,
        columnMapping: COLUMN_MAPS[input.systemId],
      };
    }),

  /**
   * Confirmar e importar los datos normalizados a la BD
   */
  confirmImport: adminProcedure
    .input(z.object({
      fileData: z.string(),       // base64
      fileName: z.string(),
      systemId: z.enum(["contpaqiNominas", "aspelNoi", "sapHcm", "oracleHcm", "nomipaq", "suaImss", "generic"]),
      skipDuplicateEmails: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const xlsx = await import("xlsx");
      const buffer = Buffer.from(input.fileData, "base64");
      const workbook = xlsx.read(buffer, { type: "buffer", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData: Record<string, any>[] = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

      if (rawData.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "El archivo está vacío." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const { departments, positions } = await import("../../drizzle/schema");
      const allDepartments = await db.select().from(departments);
      const allPositions   = await db.select().from(positions);
      const deptMap = new Map(allDepartments.map((d: any) => [d.name.toLowerCase().trim(), d.id]));
      const posMap  = new Map(allPositions.map((p: any)  => [p.title.toLowerCase().trim(), p.id]));

      const results = {
        total: rawData.length,
        imported: 0,
        skipped: 0,
        failed: 0,
        errors: [] as Array<{ row: number; error: string; data: any }>,
      };

      for (let i = 0; i < rawData.length; i++) {
        const row = normalizeRow(rawData[i], input.systemId);
        const rowNumber = i + 2;

        try {
          const email: string = String(row.email ?? "").trim().toLowerCase();
          const firstName: string = String(row.firstName ?? "").trim();

          if (!firstName) {
            throw new Error("Nombre vacío — no se puede crear el empleado sin nombre.");
          }
          if (!email) {
            throw new Error("Email vacío — campo obligatorio.");
          }

          // Verificar duplicado
          const existing = await employeesDb.getEmployeeByEmail(email);
          if (existing) {
            if (input.skipDuplicateEmails) {
              results.skipped++;
              continue;
            }
            throw new Error(`Email duplicado: ${email}`);
          }

          // Resolver departamento y puesto
          const deptRaw = String(row.departamento ?? row.department ?? "").toLowerCase().trim();
          const posRaw  = String(row.puesto ?? row.position ?? "").toLowerCase().trim();
          const departmentId = deptRaw ? (deptMap.get(deptRaw) ?? null) : null;
          const positionId   = posRaw  ? (posMap.get(posRaw)   ?? null) : null;

          // Resolver fecha de ingreso
          let hireDate = new Date();
          const hireDateRaw = row.fechaIngreso ?? row.hireDate;
          if (hireDateRaw) {
            const parsed = new Date(hireDateRaw);
            if (!isNaN(parsed.getTime())) hireDate = parsed;
          }

          // Mapear nivel educativo
          const edLevelMap: Record<string, string> = {
            primaria: "primaria", secundaria: "secundaria",
            preparatoria: "preparatoria", bachillerato: "preparatoria",
            tecnico: "tecnico", técnico: "tecnico",
            licenciatura: "licenciatura", ingenieria: "licenciatura", ingeniería: "licenciatura",
            especialidad: "especialidad", maestria: "maestria", maestría: "maestria",
            doctorado: "doctorado",
          };
          const edRaw = String(row.educationLevel ?? row.nivelEducativo ?? "").toLowerCase();
          const educationLevel = (edLevelMap[edRaw] ?? null) as any;

          await employeesDb.createEmployee({
            firstName,
            lastName:       String(row.lastName ?? "").trim(),
            email,
            phone:          String(row.telefono ?? row.phone ?? "").trim() || null,
            departmentId,
            positionId,
            hireDate,
            gender:         row.gender ?? null,
            curp:           row.curp   || null,
            rfc:            row.rfc    || null,
            nss:            row.nss    || null,
            employeeNumber: row.employeeNumber || null,
            educationLevel,
            isActive: true,
          });

          results.imported++;
        } catch (err: any) {
          results.failed++;
          results.errors.push({ row: rowNumber, error: err.message, data: row });
        }
      }

      return results;
    }),

  /**
   * Exportar empleados en formato compatible con CONTPAQi Nóminas
   */
  exportForContpaqi: protectedProcedure.mutation(async () => {
    const xlsx = await import("xlsx");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

    const { employees, departments, positions } = await import("../../drizzle/schema");
    const { eq, isNotNull } = await import("drizzle-orm");

    const rows = await db
      .select({
        employeeNumber: employees.employeeNumber,
        firstName:      employees.firstName,
        lastName:       employees.lastName,
        rfc:            employees.rfc,
        curp:           employees.curp,
        nss:            employees.nss,
        email:          employees.email,
        phone:          employees.phone,
        gender:         employees.gender,
        hireDate:       employees.hireDate,
        departmentName: departments.name,
        positionTitle:  positions.title,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(positions,   eq(employees.positionId,   positions.id))
      .where(eq(employees.isActive, true));

    const data = rows.map((r: any) => ({
      "Clave":              r.employeeNumber ?? "",
      "Nombre":             `${r.lastName ?? ""} ${r.firstName ?? ""}`.trim().toUpperCase(),
      "RFC":                r.rfc  ?? "",
      "CURP":               r.curp ?? "",
      "NSS":                r.nss  ?? "",
      "Departamento":       r.departmentName ?? "",
      "Puesto":             r.positionTitle  ?? "",
      "Fecha de Alta":      r.hireDate ? new Date(r.hireDate).toISOString().split("T")[0] : "",
      "Sexo":               r.gender === "male" ? "M" : r.gender === "female" ? "F" : "",
      "Correo Electrónico": r.email ?? "",
      "Teléfono":           r.phone ?? "",
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 12 }, { wch: 40 }, { wch: 14 }, { wch: 20 }, { wch: 14 },
      { wch: 25 }, { wch: 30 }, { wch: 14 }, { wch: 8 }, { wch: 30 }, { wch: 14 },
    ];
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Empleados");
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    const base64 = buffer.toString("base64");

    return {
      filename: `empleados_contpaqi_${new Date().toISOString().split("T")[0]}.xlsx`,
      data: base64,
      count: data.length,
    };
  }),

  /**
   * Exportar empleados en formato Aspel NOI
   */
  exportForAspelNoi: protectedProcedure.mutation(async () => {
    const xlsx = await import("xlsx");
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

    const { employees, departments, positions } = await import("../../drizzle/schema");
    const { eq } = await import("drizzle-orm");

    const rows = await db
      .select({
        employeeNumber: employees.employeeNumber,
        firstName:      employees.firstName,
        lastName:       employees.lastName,
        rfc:            employees.rfc,
        curp:           employees.curp,
        nss:            employees.nss,
        email:          employees.email,
        phone:          employees.phone,
        gender:         employees.gender,
        hireDate:       employees.hireDate,
        departmentName: departments.name,
        positionTitle:  positions.title,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(positions,   eq(employees.positionId,   positions.id))
      .where(eq(employees.isActive, true));

    const data = rows.map((r: any) => ({
      "CLAVE":            r.employeeNumber ?? "",
      "NOMBRE":           `${r.lastName ?? ""} ${r.firstName ?? ""}`.trim().toUpperCase(),
      "RFC":              r.rfc  ?? "",
      "CURP":             r.curp ?? "",
      "NSS":              r.nss  ?? "",
      "DEPARTAMENTO":     r.departmentName ?? "",
      "PUESTO":           r.positionTitle  ?? "",
      "FECHA INGRESO":    r.hireDate ? new Date(r.hireDate).toISOString().split("T")[0] : "",
      "SEXO":             r.gender === "male" ? "M" : r.gender === "female" ? "F" : "",
      "EMAIL":            r.email ?? "",
      "TELEFONO":         r.phone ?? "",
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, "Trabajadores");
    const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
    const base64 = buffer.toString("base64");

    return {
      filename: `empleados_aspel_noi_${new Date().toISOString().split("T")[0]}.xlsx`,
      data: base64,
      count: data.length,
    };
  }),
});
