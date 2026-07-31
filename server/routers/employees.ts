import { z } from "zod";
import { emailValidator, phoneValidatorMXOptional } from "../validators/contact";
import { router, protectedProcedure } from "../_core/trpc";
import * as employeesDb from "../db-employees";
import { TRPCError } from "@trpc/server";
import { requirePermission, requireDelete, requireAnyPermission } from "../permissions";
import { validateCURP, validateRFC, validateNSS, validateEmail, validateHireDate, validateAge } from "../../shared/validators";
import { getAddressByPostalCode } from "../lib/postal-code-api";
import { getDb } from "../db";
import { employees, employeePortalTokens, departments, positions } from "../../drizzle/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import * as XLSX from "xlsx";

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
          incompleteOnly: z.boolean().optional(),
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
        cedulaProfesional: z.string().max(20).optional().nullable(),
        rfc: z.string().optional(),
        nss: z.string().optional(),
        educationLevel: z.enum(["primaria","secundaria","preparatoria","tecnico","licenciatura","especialidad","maestria","doctorado","otro"]).optional().nullable(),
        birthDate: z.string().optional(),
        sexo: z.enum(["Masculino", "Femenino", "Otro"]).optional(),
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

        // Solo administradores pueden crear empleados
        if (ctx.user.role !== 'admin') {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'Solo los administradores pueden crear empleados',
          });
        }
        
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
        cedulaProfesional: z.string().max(20).optional().nullable(),
        rfc: z.string().max(13).optional().nullable(),
        nss: z.string().max(11).optional().nullable(),
        educationLevel: z.enum(["primaria","secundaria","preparatoria","tecnico","licenciatura","especialidad","maestria","doctorado","otro"]).optional().nullable(),
        contract1ExpirationDate: z.string().optional().nullable(),
        contract2ExpirationDate: z.string().optional().nullable(),
        contract3ExpirationDate: z.string().optional().nullable(),
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
        contract1ExpirationDate: updateData.contract1ExpirationDate ? new Date(updateData.contract1ExpirationDate) : (updateData.contract1ExpirationDate === null ? null : undefined),
        contract2ExpirationDate: updateData.contract2ExpirationDate ? new Date(updateData.contract2ExpirationDate) : (updateData.contract2ExpirationDate === null ? null : undefined),
        contract3ExpirationDate: updateData.contract3ExpirationDate ? new Date(updateData.contract3ExpirationDate) : (updateData.contract3ExpirationDate === null ? null : undefined),
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
        const allDepartments = await db.select().from(departments);
        const departmentMap = new Map(
          allDepartments.map((d: any) => [d.name.toLowerCase(), d.id])
        );

        // Obtener posiciones para mapeo por nombre
        const allPositions = await db.select().from((await import('../../drizzle/schema')).positions);
        const positionMap = new Map(
          allPositions.map((p: any) => [p.name.toLowerCase(), p.id])
        );

        for (let i = 0; i < data.length; i++) {
          const row: any = data[i];
          const rowNumber = i + 2; // +2 porque Excel empieza en 1 y tiene header

          try {
            // Normalizar columnas: soportar español e inglés
            // Columnas en español: nombre (apellido nombre), email, departamento, puesto,
            //   telefono, fechaNacimiento, sexo, curp, rfc, nss, fechaIngreso,
            //   nivelEducativo, numeroEmpleado
            // Columnas en inglés (legado): firstName, lastName, email, department, positionId,
            //   phone, hireDate, gender, curp, rfc, nss
            let firstName: string = row.firstName || "";
            let lastName: string = row.lastName || "";
            if (!firstName && row.nombre) {
              // Formato CONTPAQi/NOI: "APELLIDO PATERNO APELLIDO MATERNO NOMBRE(S)"
              // o "Nombre Apellido" — dividir en partes
              const parts = String(row.nombre).trim().split(/\s+/);
              if (parts.length >= 3) {
                // Asumir: últimas 2 partes = nombre(s), primeras = apellidos
                firstName = parts.slice(2).join(" ");
                lastName = parts.slice(0, 2).join(" ");
              } else if (parts.length === 2) {
                firstName = parts[1];
                lastName = parts[0];
              } else {
                firstName = parts[0];
                lastName = "";
              }
            }
            const email: string = row.email || row.correo || row.correoElectronico || "";
            const phone: string = row.phone || row.telefono || row.celular || "";
            const curp: string = (row.curp || row.CURP || "").toString().toUpperCase().trim();
            const rfc: string = (row.rfc || row.RFC || "").toString().toUpperCase().trim();
            const nss: string = (row.nss || row.NSS || row.numeroSeguroSocial || "").toString().trim();
            const employeeNumber: string = (row.numeroEmpleado || row.employeeNumber || row.claveEmpleado || row.clave || "").toString().trim();
            const hireDateRaw: string = row.hireDate || row.fechaIngreso || row.fechaAlta || "";
            // Mapear género (español/inglés/CONTPAQi)
            let gender: "male" | "female" | "other" | "prefer_not_to_say" | null = null;
            const sexoRaw = (row.gender || row.sexo || row.genero || "").toString().toLowerCase();
            if (["m", "masculino", "male", "hombre", "h"].includes(sexoRaw)) gender = "male";
            else if (["f", "femenino", "female", "mujer"].includes(sexoRaw)) gender = "female";
            // Mapear nivel educativo
            const edLevelMap: Record<string, string> = {
              primaria: "primaria", secundaria: "secundaria",
              preparatoria: "preparatoria", bachillerato: "preparatoria",
              tecnico: "tecnico", técnico: "tecnico",
              licenciatura: "licenciatura", ingenieria: "licenciatura", ingeniería: "licenciatura",
              especialidad: "especialidad", maestria: "maestria", maestría: "maestria",
              doctorado: "doctorado", otro: "otro",
            };
            const edRaw = (row.educationLevel || row.nivelEducativo || row.nivelEstudios || "").toString().toLowerCase();
            const educationLevel = (edLevelMap[edRaw] || null) as any;

            // Validar campos obligatorios
            if (!firstName || !email) {
              throw new Error(
                `Campos obligatorios faltantes: ${!firstName ? 'nombre' : ''} ${!email ? 'email' : ''}`.trim()
              );
            }

            // Validar email único
            const existingEmployee = await employeesDb.getEmployeeByEmail(email);
            if (existingEmployee) {
              throw new Error(`Email duplicado: ${email}`);
            }

            // Asignar departamento automáticamente por nombre
            let departmentId = null;
            const deptRaw = row.department || row.departamento || row.area || "";
            if (deptRaw) {
              const deptId = departmentMap.get(deptRaw.toLowerCase());
              if (deptId) {
                departmentId = deptId;
              } else {
                console.warn(`Departamento no encontrado: ${deptRaw}, usando null`);
              }
            }

            // Asignar puesto automáticamente por nombre
            let positionId = row.positionId || null;
            const puestoRaw = row.puesto || row.position || row.cargo || "";
            if (!positionId && puestoRaw) {
              const posId = positionMap.get(puestoRaw.toLowerCase());
              if (posId) positionId = posId;
            }

            // Crear empleado con todos los campos
            await employeesDb.createEmployee({
              firstName,
              lastName,
              email,
              phone: phone || null,
              departmentId,
              positionId: positionId || null,
              hireDate: hireDateRaw ? new Date(hireDateRaw) : new Date(),
              gender,
              curp: curp || null,
              rfc: rfc || null,
              nss: nss || null,
              employeeNumber: employeeNumber || null,
              educationLevel,
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

  /**
   * Obtener empleados con título clínico (médico, psicólogo, psiquiatra)
   * Usado para el selector de responsable clínico en acciones correctivas Nivel 3
   */
  getClinicalEmployees: protectedProcedure
    .query(async () => {
      const dbInstance = await (await import('../db')).getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      const { employees, positions } = await import('../../drizzle/schema');
      const { eq, or, like, and, isNotNull, ne } = await import('drizzle-orm');
      // Buscar empleados activos que sean responsables técnicos potenciales:
      // (1) Tienen cédula profesional registrada, o
      // (2) Su puesto tiene perfil técnico/clínico/directivo
      const results = await dbInstance
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          positionTitle: positions.title,
          cedulaProfesional: employees.cedulaProfesional,
        })
        .from(employees)
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .where(
          and(
            eq(employees.isActive, true),
            or(
              // Prioridad 1: empleados con cédula profesional (responsables técnicos NOM-035)
              and(isNotNull(employees.cedulaProfesional), ne(employees.cedulaProfesional, '')),
              // Prioridad 2: puestos clínicos
              like(positions.title, '%médico%'),
              like(positions.title, '%medico%'),
              like(positions.title, '%psicólogo%'),
              like(positions.title, '%psicologo%'),
              like(positions.title, '%psiquiatra%'),
              like(positions.title, '%psicóloga%'),
              like(positions.title, '%psicologa%'),
              like(positions.title, '%terapeuta%'),
              like(positions.title, '%enfermero%'),
              like(positions.title, '%enfermera%'),
              // Prioridad 3: puestos de responsabilidad técnica/directiva
              like(positions.title, '%responsable%'),
              like(positions.title, '%coordinador%'),
              like(positions.title, '%supervisor%'),
              like(positions.title, '%jefe%'),
              like(positions.title, '%director%'),
              like(positions.title, '%gerente%'),
            )
          )
        );
      // Deduplicar por id
      const seen = new Set<number>();
      const unique = results.filter(emp => {
        if (seen.has(emp.id)) return false;
        seen.add(emp.id);
        return true;
      });
      return unique.map(emp => ({
        id: emp.id,
        fullName: `${emp.firstName} ${emp.lastName}`,
        email: emp.email,
        positionTitle: emp.positionTitle || 'Sin puesto',
        cedulaProfesional: emp.cedulaProfesional || null,
        // Inferir el clinicalTitle desde el puesto
        clinicalTitle: emp.positionTitle
          ? emp.positionTitle.toLowerCase().includes('psiquiatra')
            ? 'Psiq.'
            : emp.positionTitle.toLowerCase().includes('psicologo') || emp.positionTitle.toLowerCase().includes('psicólogo') || emp.positionTitle.toLowerCase().includes('psicologa') || emp.positionTitle.toLowerCase().includes('psicóloga')
              ? 'Psic.'
              : emp.positionTitle.toLowerCase().includes('medico') || emp.positionTitle.toLowerCase().includes('médico')
                ? 'Dr.'
                : null
          : null,
      }));
    }),
    /**
   * Get completed courses history for an employee (for PDF export)
   */
  getCoursesHistory: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .query(async ({ input }) => {
      const dbInstance = await (await import('../db')).getDb();
      if (!dbInstance) return [];
      const { employees, studentProgress, courses } = await import('../../drizzle/schema');
      const { eq, and } = await import('drizzle-orm');

      // Find the userId linked to this employee
      const empRow = await dbInstance
        .select({ userId: employees.userId })
        .from(employees)
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!empRow[0]?.userId) return [];

      const userId = empRow[0].userId;

      const completedCourses = await dbInstance
        .select({
          courseId: studentProgress.courseId,
          courseName: courses.title,
          completedAt: studentProgress.completedAt,
          progressPercentage: studentProgress.progressPercentage,
        })
        .from(studentProgress)
        .innerJoin(courses, eq(studentProgress.courseId, courses.id))
        .where(
          and(
            eq(studentProgress.userId, userId),
            eq(studentProgress.status, 'completed')
          )
        )
        .orderBy(studentProgress.completedAt);

      return completedCourses.map(c => ({
        courseId: c.courseId,
        courseName: c.courseName,
        completedAt: c.completedAt
          ? new Date(c.completedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
          : 'Sin fecha',
        progressPercentage: c.progressPercentage,
      }));
    }),

  /**
   * Generar enlace de portal público para empleado
   */
  generatePortalLink: protectedProcedure
    .input(z.object({ employeeId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verificar que el empleado existe
      const employee = await db
        .select({ id: employees.id, email: employees.email, firstName: employees.firstName, lastName: employees.lastName })
        .from(employees)
        .where(eq(employees.id, input.employeeId))
        .limit(1);

      if (!employee.length) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empleado no encontrado",
        });
      }

      // Generar token único
      const token = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 días

      // Guardar token en BD
      await db.insert(employeePortalTokens).values({
        token,
        employeeId: input.employeeId,
        employeeEmail: employee[0].email,
        expiresAt,
        isActive: true,
      });

      // Generar URL del portal
      const portalUrl = `${process.env.VITE_FRONTEND_URL || "https://nom035.manus.space"}/employee-portal/${token}`;

      // Enviar correo al empleado
      try {
        const { sendEmail: sendEmailFn } = await import("../_core/email");
        await sendEmailFn({
          to: employee[0].email,
          subject: "Acceso a tu Portal de Empleado — NOM-035 STPS",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Acceso a tu Portal de Empleado</h2>
              <p>Hola <strong>${employee[0].firstName} ${employee[0].lastName}</strong>,</p>
              <p>Se ha generado un enlace de acceso a tu portal personal donde puedes:</p>
              <ul>
                <li>Consultar encuestas pendientes</li>
                <li>Ver cursos asignados</li>
                <li>Gestionar solicitudes de vacaciones</li>
                <li>Revisar y firmar documentos</li>
              </ul>
              <p style="margin-top: 20px;">
                <a href="${portalUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Acceder a mi Portal
                </a>
              </p>
              <p style="color: #666; font-size: 12px; margin-top: 20px;">
                Este enlace expira en 30 días. Si no puedes acceder, contacta a Recursos Humanos.
              </p>
            </div>
          `,
        });
      } catch (err) {
        console.error("Error enviando correo de portal:", err);
        // No fallar si el correo no se envía
      }

      return {
        ok: true,
        token,
        portalUrl,
        expiresAt: expiresAt.toISOString(),
      };
    }),

  /**
   * Exportar catálogo de empleados en formato CONTPAQi, NOI, SAP o genérico
   */
  exportToExcel: protectedProcedure
    .input(z.object({
      format: z.enum(["contpaqui", "noi", "sap", "generic"]).default("generic"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "BD no disponible" });

      const rows = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          email: employees.email,
          phone: employees.phone,
          curp: employees.curp,
          rfc: employees.rfc,
          nss: employees.nss,
          employeeNumber: employees.employeeNumber,
          hireDate: employees.hireDate,
          gender: employees.gender,
          educationLevel: employees.educationLevel,
          contractType: employees.contractType,
          isActive: employees.isActive,
          departmentName: departments.name,
          positionTitle: positions.title,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(positions, eq(employees.positionId, positions.id))
        .orderBy(employees.lastName);

      let data: Record<string, any>[];
      let sheetName: string;
      let filename: string;

      if (input.format === "contpaqui" || input.format === "noi") {
        // Formato CONTPAQi NOI
        data = rows.map((r: any) => ({
          "Código": r.employeeNumber ?? "",
          "Nombre": r.firstName ?? "",
          "Apellido Paterno": r.lastName?.split(" ")[0] ?? "",
          "Apellido Materno": r.lastName?.split(" ").slice(1).join(" ") ?? "",
          "RFC": r.rfc ?? "",
          "CURP": r.curp ?? "",
          "NSS": r.nss ?? "",
          "Puesto": r.positionTitle ?? "",
          "Departamento": r.departmentName ?? "",
          "Fecha Alta": r.hireDate ? new Date(r.hireDate).toLocaleDateString("es-MX") : "",
          "Sexo": r.gender === "male" ? "M" : r.gender === "female" ? "F" : "",
          "Correo": r.email ?? "",
          "Teléfono": r.phone ?? "",
          "Activo": r.isActive ? "Sí" : "No",
        }));
        sheetName = "Empleados CONTPAQi";
        filename = `empleados_contpaqui_${new Date().toISOString().split("T")[0]}.xlsx`;
      } else {
        // Formato genérico
        data = rows.map((r: any) => ({
          "ID": r.id,
          "Nombre": r.firstName ?? "",
          "Apellidos": r.lastName ?? "",
          "Correo": r.email ?? "",
          "Teléfono": r.phone ?? "",
          "CURP": r.curp ?? "",
          "RFC": r.rfc ?? "",
          "NSS": r.nss ?? "",
          "Núm. Empleado": r.employeeNumber ?? "",
          "Departamento": r.departmentName ?? "",
          "Puesto": r.positionTitle ?? "",
          "Fecha Ingreso": r.hireDate ? new Date(r.hireDate).toLocaleDateString("es-MX") : "",
          "Género": r.gender ?? "",
          "Escolaridad": r.educationLevel ?? "",
          "Tipo Contrato": r.contractType ?? "",
          "Activo": r.isActive ? "Sí" : "No",
        }));
        sheetName = "Empleados";
        filename = `empleados_${new Date().toISOString().split("T")[0]}.xlsx`;
      }

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      const base64 = (buffer as Buffer).toString("base64");

      return {
        filename,
        data: base64,
        count: rows.length,
      };
    }),
});

