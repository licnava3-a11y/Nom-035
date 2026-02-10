import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as employeesDb from "../db-employees";
import { TRPCError } from "@trpc/server";
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
    .input(
      z.object({
        firstName: z.string().min(1, "Nombre es requerido"),
        lastName: z.string().min(1, "Apellido es requerido"),
        email: z.string().email("Email inválido"),
        phone: z.string().optional(),
        curp: z.string().length(18, "CURP debe tener 18 caracteres").optional(),
        rfc: z.string().optional(),
        nss: z.string().optional(),
        birthDate: z.string().optional(),
        employeeNumber: z.string().optional(),
        department: z.string().optional(),
        position: z.string().optional(),
        hireDate: z.string().optional(), // ISO date string
        contractType: z.enum(["permanent", "temporary", "contract"]).default("permanent"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only admin can create employees
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden crear empleados",
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

      const employeeId = await employeesDb.createEmployee({
        ...input,
        hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
        reentryCount,
        previousHireDates: previousHireDates.length > 0 ? previousHireDates.map(d => d.toISOString()) : null,
      });

      // Registrar evento en historial
      if (input.curp) {
        await employeesDb.addEmployeeHistoryEvent({
          employeeId,
          curp: input.curp,
          eventType: isReentry ? 'reentry' : 'hire',
          eventDate: input.hireDate ? new Date(input.hireDate) : new Date(),
          processedBy: ctx.user.id,
          departmentId: input.department ? parseInt(input.department) : undefined,
          positionId: input.position ? parseInt(input.position) : undefined,
        });
      }

      return {
        success: true,
        employeeId,
        isReentry,
        reentryCount,
      };
    }),

  /**
   * Update employee
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        curp: z.string().length(18).optional(),
        employeeNumber: z.string().optional(),
        department: z.string().optional(),
        position: z.string().optional(),
        hireDate: z.string().optional(),
        contractType: z.enum(["permanent", "temporary", "contract"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Only admin can update employees
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden actualizar empleados",
        });
      }

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
    }),

  /**
   * Deactivate employee
   */
  deactivate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Only admin can deactivate employees
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden desactivar empleados",
        });
      }

      const employee = await employeesDb.deactivateEmployee(input.id);
      return {
        success: true,
        employee,
      };
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

      // Deactivate employee
      await employeesDb.deactivateEmployee(input.employeeId);

      // Register termination event in history
      if (employee.curp) {
        await employeesDb.addEmployeeHistoryEvent({
          employeeId: input.employeeId,
          curp: employee.curp,
          eventType: 'termination',
          eventDate: new Date(input.terminationDate),
          processedBy: ctx.user.id,
          terminationReason: input.terminationReason,
          terminationNotes: input.notes,
          evidenceUrls: input.documentUrls || [],
        });
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
});
