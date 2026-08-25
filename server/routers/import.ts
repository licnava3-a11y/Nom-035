import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, or } from "drizzle-orm";
import {
  generateWorkersTemplate,
  parseWorkersFromExcel,
  type WorkerFromExcel,
  type ValidationError,
} from "../lib/excel-template";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Genera un reporte PDF con los errores de validación
 */
function generateErrorReportPDF(errors: ValidationError[]): Buffer {
  const doc = new jsPDF();

  // Título
  doc.setFontSize(18);
  doc.text("Reporte de Errores de Importación", 14, 20);

  doc.setFontSize(11);
  doc.text("Plataforma de Capacitación NOM-035 STPS 2018", 14, 28);
  doc.text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, 14, 34);

  // Resumen
  const errorCount = errors.filter((e: any) => e.severity === "error").length;
  const warningCount = errors.filter(
    (e: any) => e.severity === "warning"
  ).length;

  doc.setFontSize(12);
  doc.text("Resumen:", 14, 45);
  doc.setFontSize(10);
  doc.text(`Total de errores: ${errorCount}`, 20, 52);
  doc.text(`Total de advertencias: ${warningCount}`, 20, 58);

  // Tabla de errores
  const tableData = errors.map((error: any) => [
    error.row.toString(),
    error.field,
    error.value !== null && error.value !== undefined
      ? String(error.value)
      : "N/A",
    error.error,
    error.severity === "error" ? "Error" : "Advertencia",
  ]);

  autoTable(doc, {
    head: [["Fila", "Campo", "Valor", "Descripción del Error", "Tipo"]],
    body: tableData,
    startY: 65,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [220, 53, 69], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 15 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30 },
      3: { cellWidth: 80 },
      4: { cellWidth: 25 },
    },
    didDrawCell: (data: any) => {
      if (data.section === "body" && data.column.index === 4) {
        const severity = data.cell.raw as string;
        if (severity === "Error") {
          doc.setTextColor(220, 53, 69);
        } else {
          doc.setTextColor(255, 193, 7);
        }
      }
    },
  });

  // Pie de página
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Página ${i} de ${pageCount}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  return Buffer.from(doc.output("arraybuffer"));
}

/**
 * Convierte fecha DD/MM/YYYY a Date
 */
function parseDateDDMMYYYY(dateStr: string): Date | null {
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;

  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; // Los meses en JS van de 0-11
  const year = parseInt(parts[2], 10);

  const date = new Date(year, month, day);

  // Verificar que la fecha sea válida
  if (
    date.getDate() !== day ||
    date.getMonth() !== month ||
    date.getFullYear() !== year
  ) {
    return null;
  }

  return date;
}

export const importRouter = router({
  // Descargar plantilla Excel
  downloadTemplate: protectedProcedure.query(async () => {
    try {
      const buffer = generateWorkersTemplate();
      return {
        success: true,
        data: buffer.toString("base64"),
        filename: `Plantilla_Trabajadores_${new Date().toISOString().split("T")[0]}.xlsx`,
      };
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Error al generar plantilla: ${error instanceof Error ? error.message : "Error desconocido"}`,
      });
    }
  }),

  // Procesar archivo Excel y validar datos
  processExcel: protectedProcedure
    .input(
      z.object({
        fileData: z.string(), // Base64 encoded file
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Decodificar archivo
        const buffer = Buffer.from(input.fileData, "base64");

        // Parsear Excel
        const { workers, errors } = parseWorkersFromExcel(buffer);

        if (workers.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No se encontraron trabajadores en el archivo",
          });
        }

        // Validaciones adicionales con base de datos
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Base de datos no disponible",
          });
        }

        // Verificar duplicados de CURP y RFC en la base de datos
        for (let i = 0; i < workers.length; i++) {
          const worker = workers[i];
          const rowNumber = i + 2;

          // Verificar CURP duplicado
          if (worker.curp) {
            const existingByCurp = await db
              .select()
              .from(users)
              .where(eq(users.curp, worker.curp))
              .limit(1);

            if (existingByCurp.length > 0) {
              errors.push({
                row: rowNumber,
                field: "CURP",
                value: worker.curp,
                error: "Ya existe un trabajador con este CURP en el sistema",
                severity: "error",
              });
            }
          }

          // Verificar RFC duplicado
          if (worker.rfc) {
            const existingByRfc = await db
              .select()
              .from(users)
              .where(eq(users.rfc, worker.rfc))
              .limit(1);

            if (existingByRfc.length > 0) {
              errors.push({
                row: rowNumber,
                field: "RFC",
                value: worker.rfc,
                error: "Ya existe un trabajador con este RFC en el sistema",
                severity: "error",
              });
            }
          }

          // Verificar correo duplicado
          if (worker.correoElectronico) {
            const existingByEmail = await db
              .select()
              .from(users)
              .where(eq(users.email, worker.correoElectronico))
              .limit(1);

            if (existingByEmail.length > 0) {
              errors.push({
                row: rowNumber,
                field: "Correo Electrónico",
                value: worker.correoElectronico,
                error:
                  "Ya existe un trabajador con este correo electrónico en el sistema",
                severity: "warning",
              });
            }
          }
        }

        // Verificar duplicados dentro del mismo archivo
        const curps = new Set<string>();
        const rfcs = new Set<string>();
        const emails = new Set<string>();

        workers.forEach((worker: any, index: number) => {
          const rowNumber = index + 2;

          if (worker.curp) {
            if (curps.has(worker.curp)) {
              errors.push({
                row: rowNumber,
                field: "CURP",
                value: worker.curp,
                error: "CURP duplicado en el archivo",
                severity: "error",
              });
            }
            curps.add(worker.curp);
          }

          if (worker.rfc) {
            if (rfcs.has(worker.rfc)) {
              errors.push({
                row: rowNumber,
                field: "RFC",
                value: worker.rfc,
                error: "RFC duplicado en el archivo",
                severity: "error",
              });
            }
            rfcs.add(worker.rfc);
          }

          if (worker.correoElectronico) {
            if (emails.has(worker.correoElectronico)) {
              errors.push({
                row: rowNumber,
                field: "Correo Electrónico",
                value: worker.correoElectronico,
                error: "Correo electrónico duplicado en el archivo",
                severity: "warning",
              });
            }
            emails.add(worker.correoElectronico);
          }
        });

        // Generar reporte PDF si hay errores
        let errorReportPdf: string | null = null;
        if (errors.length > 0) {
          const pdfBuffer = generateErrorReportPDF(errors);
          errorReportPdf = pdfBuffer.toString("base64");
        }

        return {
          success: true,
          workers,
          errors,
          errorReportPdf,
          summary: {
            total: workers.length,
            errors: errors.filter((e: any) => e.severity === "error").length,
            warnings: errors.filter((e: any) => e.severity === "warning")
              .length,
          },
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error al procesar archivo: ${error instanceof Error ? error.message : "Error desconocido"}`,
        });
      }
    }),

  // Importar trabajadores a la base de datos
  importWorkers: protectedProcedure
    .input(
      z.object({
        workers: z.array(
          z.object({
            curp: z.string(),
            rfc: z.string(),
            nombre: z.string(),
            apellidoPaterno: z.string(),
            apellidoMaterno: z.string().optional(),
            fechaNacimiento: z.string(),
            sexo: z.string(),
            estadoCivil: z.string().optional(),
            puesto: z.string(),
            departamento: z.string(),
            fechaIngreso: z.string(),
            tipoContrato: z.string(),
            jornadaLaboral: z.string(),
            correoElectronico: z.string(),
            telefono: z.string().optional(),
            direccion: z.string().optional(),
            ultimoGradoEstudios: z.string().optional(),
            nombreCarrera: z.string().optional(),
            habilidadesTransversales: z.string().optional(),
            habilidadesLongitudinales: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Base de datos no disponible",
        });
      }

      let successCount = 0;
      const failedWorkers: Array<{ worker: WorkerFromExcel; error: string }> =
        [];

      for (const worker of input.workers) {
        try {
          // Convertir fechas
          const birthDate = parseDateDDMMYYYY(worker.fechaNacimiento);
          const hireDate = parseDateDDMMYYYY(worker.fechaIngreso);

          if (!birthDate || !hireDate) {
            failedWorkers.push({
              worker,
              error: "Formato de fecha inválido",
            });
            continue;
          }

          // Insertar trabajador
          await (db.insert(users) as any).values({
            openId: `imported_${worker.curp}_${Date.now()}`, // Generar openId temporal para importados
            curp: worker.curp,
            rfc: worker.rfc,
            name: `${worker.nombre} ${worker.apellidoPaterno} ${worker.apellidoMaterno || ""}`.trim(),
            email: worker.correoElectronico,
            telefono: worker.telefono,
            fechaNacimiento: birthDate,
            sexo: worker.sexo as "Masculino" | "Femenino" | "Otro",
            estadoCivil: worker.estadoCivil as
              | "Soltero(a)"
              | "Casado(a)"
              | "Divorciado(a)"
              | "Viudo(a)"
              | "Unión libre"
              | undefined,
            puesto: worker.puesto,
            departamento: worker.departamento || "Administración",
            fechaIngreso: hireDate,
            tipoContrato: worker.tipoContrato as
              | "Planta"
              | "Temporal"
              | "Por obra"
              | "Honorarios"
              | "Otro",
            jornadaLaboral: worker.jornadaLaboral as
              | "Diurna"
              | "Nocturna"
              | "Mixta"
              | "Por turnos",
            direccion: worker.direccion,
            ultimoGradoEstudios: worker.ultimoGradoEstudios,
            nombreCarrera: worker.nombreCarrera,
            habilidadesTransversales: worker.habilidadesTransversales,
            habilidadesLongitudinales: worker.habilidadesLongitudinales,
            role: "student",
          });

          successCount++;
        } catch (error) {
          failedWorkers.push({
            worker,
            error: error instanceof Error ? error.message : "Error desconocido",
          });
        }
      }

      return {
        success: true,
        imported: successCount,
        failed: failedWorkers.length,
        failedWorkers,
      };
    }),
});
