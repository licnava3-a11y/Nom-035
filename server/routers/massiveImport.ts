import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { departments, positions, employees } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";

export const massiveImportRouter = router({
  // Import Departments
  importDepartments: protectedProcedure
    .input(
      z.array(
        z.object({
          name: z.string(),
          description: z.string().optional(),
        })
      )
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const results = [];
        for (const dept of input) {
          const [result] = await (db.insert(departments) as any).values({
            name: dept.name,
            description: dept.description || null,
            createdAt: new Date(),
          });
          results.push(result);
        }
        return {
          success: true,
          count: results.length,
          message: `${results.length} departamentos importados exitosamente`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error al importar departamentos: ${error instanceof Error ? error.message : "Error desconocido"}`,
        });
      }
    }),

  // Import Positions
  importPositions: protectedProcedure
    .input(
      z.array(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          departmentId: z.number(),
          level: z
            .enum([
              "executive",
              "management",
              "supervisor",
              "specialist",
              "entry",
            ])
            .optional(),
        })
      )
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const results = [];
        for (const position of input) {
          const [result] = await (db.insert(positions) as any).values({
            title: position.title,
            description: position.description || null,
            departmentId: position.departmentId,
            level: position.level || "specialist",
            createdAt: new Date(),
          });
          results.push(result);
        }
        return {
          success: true,
          count: results.length,
          message: `${results.length} puestos importados exitosamente`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error al importar puestos: ${error instanceof Error ? error.message : "Error desconocido"}`,
        });
      }
    }),

  // Import Employees — Sprint: Importación Masiva Mejorada
  importEmployees: protectedProcedure
    .input(
      z.array(
        z.object({
          firstName: z.string().min(1, "El nombre es obligatorio"),
          lastName: z.string().min(1, "El apellido es obligatorio"),
          email: z.string().email("Correo electrónico inválido"),
          phone: z.string().optional(),
          curp: z.string().min(18, "El CURP debe tener 18 caracteres").max(18),
          employeeNumber: z.string().optional(),
          departmentId: z.number().positive("Debe seleccionar un departamento"),
          positionId: z.number().positive("Debe seleccionar un puesto"),
          hireDate: z.string().min(1, "La fecha de ingreso es obligatoria"),
          isActive: z.boolean().optional(),
          // Campos opcionales extendidos
          rfc: z.string().max(13).optional(),
          nss: z.string().max(11).optional(),
          gender: z.enum(["male", "female", "other"]).optional(),
          educationLevel: z
            .enum([
              "primary",
              "secondary",
              "high_school",
              "technical",
              "bachelor",
              "master",
              "doctorate",
              "other",
            ])
            .optional(),
          contractType: z
            .enum([
              "permanent",
              "temporary",
              "project",
              "internship",
              "outsourcing",
            ])
            .optional(),
        })
      )
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const results = [];
        const duplicates = [];

        for (const employee of input) {
          // Check for duplicates by CURP if provided
          if (employee.curp) {
            const existing = await db
              .select()
              .from(employees)
              .where(sql`${employees.curp} = ${employee.curp}`)
              .limit(1);
            const existingEmployee = existing[0];

            if (existingEmployee) {
              duplicates.push({
                curp: employee.curp,
                name: `${employee.firstName} ${employee.lastName}`,
                reason: "CURP ya existe en el sistema",
              });
              continue;
            }
          }

          const [result] = await (db.insert(employees) as any).values({
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            phone: employee.phone || null,
            curp: employee.curp || null,
            employeeNumber: employee.employeeNumber || null,
            departmentId: employee.departmentId,
            positionId: employee.positionId,
            hireDate: employee.hireDate
              ? new Date(employee.hireDate)
              : new Date(),
            isActive:
              employee.isActive !== undefined ? employee.isActive : true,
            // Campos extendidos opcionales
            rfc: employee.rfc || null,
            nss: employee.nss || null,
            gender: employee.gender || null,
            educationLevel: employee.educationLevel || null,
            contractType: employee.contractType || null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          results.push(result);
        }

        return {
          success: true,
          count: results.length,
          duplicates: duplicates.length,
          duplicateDetails: duplicates,
          message: `${results.length} trabajadores importados exitosamente${duplicates.length > 0 ? `. ${duplicates.length} duplicados omitidos` : ""}`,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error al importar trabajadores: ${error instanceof Error ? error.message : "Error desconocido"}`,
        });
      }
    }),

  // Get all departments (for dropdown in positions/employees import)
  getDepartmentsForImport: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return await db
      .select({
        id: departments.id,
        name: departments.name,
      })
      .from(departments)
      .orderBy(departments.name);
  }),

  // Get all positions (for dropdown in employees import)
  getPositionsForImport: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    return await db
      .select({
        id: positions.id,
        title: positions.title,
        departmentId: positions.departmentId,
      })
      .from(positions)
      .orderBy(positions.title);
  }),
});
