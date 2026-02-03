import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as employeesDb from "../db-employees";
import { TRPCError } from "@trpc/server";

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

      // Check if email already exists
      const existing = await employeesDb.getEmployeeByEmail(input.email);
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe un empleado con este correo electrónico",
        });
      }

      const employeeId = await employeesDb.createEmployee({
        ...input,
        hireDate: input.hireDate ? new Date(input.hireDate) : undefined,
      });

      return {
        success: true,
        employeeId,
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
});
