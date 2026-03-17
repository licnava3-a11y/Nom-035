import { z } from "zod";
import { emailValidator, phoneValidatorMXOptional } from "../validators/contact";
import { router, protectedProcedure } from "../_core/trpc";
import * as employeesDb from "../db-employees";
import { TRPCError } from "@trpc/server";
import { requirePermission, requireDelete, requireAnyPermission } from "../permissions";
import { validateCURP, validateRFC, validateNSS, validateEmail, validateHireDate, validateAge } from "../../shared/validators";
import { getAddressByPostalCode } from "../lib/postal-code-api";

export const employeesRouter = router({
  /**
   * List all employees with optional filters
   */
  list: protectedProcedure
    .input(
      z
        .object({
          isActive: z.boolean().optional(),
          department: z.string().optional(),
          search: z.string().optional(),
          page: z.number().min(1).default(1),
          pageSize: z.number().min(10).max(100).default(20),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await employeesDb.getAllEmployees(input);
    }),

  /**
   * Get employee by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const employee = await employeesDb.getEmployeeById(input.id);
      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }
      return employee;
    }),

  /**
   * Get employee history
   */
  getHistory: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }) => {
      const history = await employeesDb.getEmployeeHistory(input.employeeId);
      // Convert Date to string for frontend compatibility
      return (history || []).map(event => ({
        ...event,
        eventDate: event.eventDate instanceof Date 
          ? event.eventDate.toISOString().split('T')[0] 
          : event.eventDate
      }));
    }),

  /**
   * Get employee with user info
   */
  getWithUser: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const result = await employeesDb.getEmployeeWithUser(input.id);
      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }
      return result;
    }),

  /**
   * Create new employee
   */
  create: protectedProcedure
    .use(requirePermission('can_create'))
    .input(
      z.object({
        firstName: z.string().min(1, "Nombre es requerido"),
        lastName: z.string().min(1, "Apellido es requerido"),
        email: emailValidator,
        phone: phoneValidatorMXOptional,
        curp: z.string().length(18, "CURP debe tener 18 caracteres").optional(),
        rfc: z.string().optional(),
        nss: z.string().optional(),
        birthDate: z.string().optional(),
        sexo: z.enum(["Masculino", "Femenino", "Otro"]).refine(val => val !== undefined, {
          message: "El campo sexo es obligatorio"
        }),
        employeeNumber: z.string().optional(),
        department: z.string().optional(),
        position: z.string().optional(),
        hireDate: z.string().optional(), // ISO date string
        contractType: z.enum(["permanent", "temporary", "contract"]).default("permanent"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        if (!ctx.user) throw new Error('User not authenticated');
        
        // Validar CURP si se proporciona
      if (input.curp) {
        const curpValidation = validateCURP(input.curp);
        if (!curpValidation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: curpValidation.error || "CURP inválido",
          });
        }
      }

      // Validar RFC si se proporciona
      if (input.rfc) {
        const rfcValidation = validateRFC(input.rfc, 'fisica');
        if (!rfcValidation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: rfcValidation.error || "RFC inválido",
          });
        }
      }

      // Validar NSS si se proporciona
      if (input.nss) {
        const nssValidation = validateNSS(input.nss);
        if (!nssValidation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: nssValidation.error || "NSS inválido",
          });
        }
      }

      // Validar edad si se proporciona fecha de nacimiento
      if (input.birthDate) {
        const ageValidation = validateAge(input.birthDate);
        if (!ageValidation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: ageValidation.error || "Edad inválida",
          });
        }
      }

      // Validar fecha de ingreso si se proporciona
      if (input.hireDate) {
        const hireDateValidation = validateHireDate(input.hireDate);
        if (!hireDateValidation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: hireDateValidation.error || "Fecha de ingreso inválida",
          });
        }
      }

      // Validar que el correo no exista
      const existingEmployee = await employeesDb.getEmployeeByEmail(input.email);
      if (existingEmployee) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe un empleado con este correo electrónico",
        });
      }

      // Detectar reingresos por CURP
      let isReentry = false;
      let reentryCount = 0;
      let previousHireDates: Date[] = [];
      
      if (input.curp) {
        const existingByCURP = await employeesDb.getEmployeeByCURP(input.curp);
        if (existingByCURP) {
          isReentry = true;
          reentryCount = (existingByCURP.reentryCount || 0) + 1;
          
          // Obtener fechas previas de contratación
          const history = await employeesDb.getEmployeeHistoryByCURP(input.curp);
          previousHireDates = history
            .filter((h: any) => h.eventType === 'hire' || h.eventType === 'reentry')
            .map((h: any) => new Date(h.eventDate));
        }
      }

      // Use transaction to ensure atomicity
      const employeeId = input.curp
        ? await employeesDb.createEmployeeWithHistory(
            {
              ...input,
              hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
              reentryCount,
              previousHireDates: previousHireDates.length > 0 ? previousHireDates.map(d => d.toISOString()) : null,
            },
            {
              curp: input.curp,
              eventType: isReentry ? 'reentry' : 'hire',
              eventDate: input.hireDate ? new Date(input.hireDate) : new Date(),
              processedBy: ctx.user.id,
              departmentId: input.department ? parseInt(input.department) : undefined,
              positionId: input.position ? parseInt(input.position) : undefined,
            }
          )
        : await employeesDb.createEmployee({
            ...input,
            hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
            reentryCount,
            previousHireDates: previousHireDates.length > 0 ? previousHireDates.map(d => d.toISOString()) : null,
          });

      return {
        success: true,
        employeeId,
        isReentry,
        reentryCount,
      };
      } catch (error) {
        console.error('[Employees] Error creating employee:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al crear empleado",
        });
      }
    }),

  /**
   * Update employee
   */
  update: protectedProcedure
    .use(requirePermission('can_edit'))
    .input(
      z.object({
        id: z.number(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: emailValidator.optional(),
        phone: phoneValidatorMXOptional,
        curp: z.string().length(18).optional(),
        sexo: z.enum(["Masculino", "Femenino", "Otro"]).optional(),
        employeeNumber: z.string().optional(),
        department: z.string().optional(),
        position: z.string().optional(),
        hireDate: z.string().optional(),
        contractType: z.enum(["permanent", "temporary", "contract"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const { id, ...updateData } = input;

        // Check if employee exists
      const existing = await employeesDb.getEmployeeById(id);
      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }

      // If email is being updated, check for conflicts
      if (updateData.email && updateData.email !== existing.email) {
        const emailExists = await employeesDb.getEmployeeByEmail(updateData.email);
        if (emailExists) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ya existe un empleado con este correo electrónico",
          });
        }
      }

      const updated = await employeesDb.updateEmployee(id, {
        ...updateData,
        hireDate: updateData.hireDate ? new Date(updateData.hireDate) : undefined,
      });

      return {
        success: true,
        employee: updated,
      };
      } catch (error) {
        console.error('[Employees] Error updating employee:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al actualizar empleado",
        });
      }
    }),

  /**
   * Deactivate employee
   */
  deactivate: protectedProcedure
    .use(requireDelete())
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const employee = await employeesDb.getEmployeeById(input.id);
      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }

      await employeesDb.deactivateEmployee(input.id);

      return {
        success: true,
        message: "Empleado desactivado exitosamente",
      };
      } catch (error) {
        console.error('[Employees] Error deactivating employee:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al desactivar empleado",
        });
      }
    }),

  /**
   * Reactivate employee
   */
  reactivate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Only admin can reactivate employees
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden reactivar empleados",
        });
      }

      const employee = await employeesDb.reactivateEmployee(input.id);
      return {
        success: true,
        employee,
      };
    }),

  /**
   * Get all departments
   */
  getDepartments: protectedProcedure.query(async () => {
    return await employeesDb.getAllDepartments();
  }),

  /**
   * Get all positions
   */
  getPositions: protectedProcedure.query(async () => {
    return await employeesDb.getAllPositions();
  }),

  /**
   * Get positions by department
   */
  getPositionsByDepartment: protectedProcedure
    .input(z.object({ department: z.number() }))
    .query(async ({ input }) => {
      return await employeesDb.getPositionsByDepartment(input.department);
    }),

  /**
   * Get address information by postal code
   * Returns state, municipality and colonies for Mexican postal codes
   */
  getAddressByPostalCode: protectedProcedure
    .input(z.object({ postalCode: z.string().length(5, "Código postal debe tener 5 dígitos") }))
    .query(async ({ input }) => {
      try {
        const addressData = await getAddressByPostalCode(input.postalCode);
        
        if (!addressData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Código postal no encontrado",
          });
        }

        return addressData;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al consultar código postal",
        });
      }
    }),

  /**
   * Get employee statistics
   */
  getStats: protectedProcedure.query(async ({ ctx }) => {
    // Only admin can view stats
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Solo administradores pueden ver estadísticas",
      });
    }

    return await employeesDb.getEmployeeStats();
  }),

  /**
   * Check if employee is committee member
   */
  isCommitteeMember: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await employeesDb.isCommitteeMember(input.id);
    }),

  /**
   * Validate CURP and extract data
   */
  validateCURP: protectedProcedure
    .input(z.object({ curp: z.string() }))
    .query(async ({ input }) => {
      const { validateCURP } = await import('../lib/curp-validator');
      return validateCURP(input.curp);
    }),

  /**
   * Terminate employee (baja)
   */
  terminate: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        terminationReason: z.string().min(1, "Motivo de terminación es requerido"),
        terminationDate: z.string(),
        notes: z.string().optional(),
        documentUrls: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only admin can terminate employees
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden dar de baja empleados",
        });
      }

      // Check if employee exists
      const employee = await employeesDb.getEmployeeById(input.employeeId);
      if (!employee) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }

      // Use transaction to ensure atomicity
      if (employee.curp) {
        await employeesDb.terminateEmployeeWithHistory(
          input.employeeId,
          {
            terminationDate: new Date(input.terminationDate),
            terminationReason: input.terminationReason,
            terminationNotes: input.notes,
            evidenceUrls: input.documentUrls || [],
          },
          {
            curp: employee.curp,
            processedBy: ctx.user.id,
            departmentId: employee.departmentId || undefined,
            positionId: employee.positionId || undefined,
          }
        );
      } else {
        // Fallback for employees without CURP
        await employeesDb.deactivateEmployee(input.employeeId);
      }

      return {
        success: true,
        message: "Empleado dado de baja exitosamente",
      };
    }),

  // Turnover statistics
  getTurnoverStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      return await employeesDb.getTurnoverStats(startDate, endDate);
    }),

  getMonthlyTrends: protectedProcedure
    .input(
      z.object({
        months: z.number().default(12),
      })
    )
    .query(async ({ input }) => {
      return await employeesDb.getMonthlyTerminationTrends(input.months);
    }),

  getTerminationsByReason: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      return await employeesDb.getTerminationsByReason(startDate, endDate);
    }),

  getTerminationsByDepartment: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);
      return await employeesDb.getTerminationsByDepartment(startDate, endDate);
    }),

  // Importación masiva de empleados desde archivo Excel/CSV
  importFromFile: protectedProcedure
    .input(
      z.object({
        fileData: z.string(), // Base64 encoded file
        fileName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const xlsx = await import("xlsx");
      const { getDb } = await import("../db");
      const { departments } = await import("../../drizzle/schema");
      const { eq, sql } = await import("drizzle-orm");

      try {
        // Decodificar archivo base64
        const buffer = Buffer.from(input.fileData, "base64");
        const workbook = xlsx.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        if (data.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "El archivo está vacío",
          });
        }

        const db = await getDb();
      if (!db) throw new Error("Database not available");
        const results = {
          total: data.length,
          successful: 0,
          failed: 0,
          errors: [] as Array<{ row: number; error: string; data: any }>,
        };

        // Obtener todos los departamentos para mapeo
        // @ts-ignore - getDb() siempre retorna instancia válida
        const allDepartments = await db.select().from(departments);
        const departmentMap = new Map(
          allDepartments.map((d) => [d.name.toLowerCase(), d.id])
        );

        for (let i = 0; i < data.length; i++) {
          const row: any = data[i];
          const rowNumber = i + 2; // +2 porque Excel empieza en 1 y tiene header

          try {
            // Validar campos obligatorios
            if (!row.firstName || !row.lastName || !row.email) {
              throw new Error(
                "Campos obligatorios faltantes: firstName, lastName, email"
              );
            }

            // Validar email único
            const existingEmployee = await employeesDb.getEmployeeByEmail(
              row.email
            );
            if (existingEmployee) {
              throw new Error(`Email duplicado: ${row.email}`);
            }

            // Asignar departamento automáticamente por nombre
            let departmentId = null;
            if (row.department) {
              const deptId = departmentMap.get(row.department.toLowerCase());
              if (deptId) {
                departmentId = deptId;
              } else {
                // Departamento no encontrado, usar valor por defecto
                console.warn(
                  `Departamento no encontrado: ${row.department}, usando null`
                );
              }
            }

            // Crear empleado
            await employeesDb.createEmployee({
              firstName: row.firstName,
              lastName: row.lastName,
              email: row.email,
              phone: row.phone || null,
              departmentId: departmentId,
              position: row.position || null,
              hireDate: row.hireDate ? new Date(row.hireDate) : new Date(),
              gender: row.gender || null,
              birthDate: row.birthDate ? new Date(row.birthDate) : null,
              curp: row.curp || null,
              rfc: row.rfc || null,
              nss: row.nss || null,
              address: row.address || null,
              city: row.city || null,
              state: row.state || null,
              postalCode: row.postalCode || null,
              emergencyContactName: row.emergencyContactName || null,
              emergencyContactPhone: row.emergencyContactPhone || null,
              maritalStatus: row.maritalStatus || null,
              educationLevel: row.educationLevel || null,
              isActive: true,
            });

            results.successful++;
          } catch (error: any) {
            results.failed++;
            results.errors.push({
              row: rowNumber,
              error: error.message,
              data: row,
            });
          }
        }

        return results;
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Error al procesar archivo: ${error.message}`,
        });
      }
    }),

  /**
   * Generar plantilla Excel para importación de empleados
   */
  generateImportTemplate: protectedProcedure.mutation(async () => {
    const XLSX = await import("xlsx");

    // Definir columnas de la plantilla
    const headers = [
      "nombre",
      "email",
      "departamento",
      "puesto",
      "telefono",
      "fechaNacimiento",
      "sexo",
      "curp",
      "rfc",
      "nss",
      "fechaIngreso",
      "salario",
      "nivelJerarquico",
      "calle",
      "numeroExterior",
      "colonia",
      "ciudad",
      "estado",
      "codigoPostal",
      "nombreContactoEmergencia",
      "telefonoContactoEmergencia",
      "estadoCivil",
      "nivelEducativo",
    ];

    // Datos de ejemplo
    const exampleRow = {
      nombre: "Juan Pérez García",
      email: "juan.perez@empresa.com",
      departamento: "Recursos Humanos",
      puesto: "Analista de Nómina",
      telefono: "6141234567",
      fechaNacimiento: "1990-05-15",
      sexo: "Masculino",
      curp: "PEGJ900515HCHRRN01",
      rfc: "PEGJ900515ABC",
      nss: "12345678901",
      fechaIngreso: "2020-01-10",
      salario: "25000",
      nivelJerarquico: "Operativo",
      calle: "Av. Principal",
      numeroExterior: "123",
      colonia: "Centro",
      ciudad: "Chihuahua",
      estado: "Chihuahua",
      codigoPostal: "31000",
      nombreContactoEmergencia: "María Pérez",
      telefonoContactoEmergencia: "6149876543",
      estadoCivil: "Casado",
      nivelEducativo: "Licenciatura",
    };

    // Crear hoja de trabajo con headers y ejemplo
    const worksheet = XLSX.utils.json_to_sheet([exampleRow], { header: headers });

    // Agregar nota informativa en la primera fila
    XLSX.utils.sheet_add_aoa(
      worksheet,
      [
        [
          "PLANTILLA DE IMPORTACIÓN DE EMPLEADOS - Complete los datos siguiendo el ejemplo. Elimine esta fila antes de importar.",
        ],
      ],
      { origin: "A1" }
    );

    // Ajustar ancho de columnas
    const columnWidths = headers.map(() => ({ wch: 20 }));
    worksheet["!cols"] = columnWidths;

    // Crear libro de trabajo
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empleados");

    // Generar buffer
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    // Convertir a base64 para descarga
    const base64 = buffer.toString("base64");

    return {
      filename: `plantilla_importacion_empleados_${Date.now()}.xlsx`,
      data: base64,
    };
  }),
});

