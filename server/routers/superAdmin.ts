import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { companies, users } from "../../drizzle/schema";
import { eq, isNull, like, or, and, count, desc } from "drizzle-orm";

// Middleware: solo super_admin puede acceder
const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "super_admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acceso restringido al Super Administrador",
    });
  }
  return next({ ctx });
});

export const superAdminRouter = router({
  // ─── Empresas ────────────────────────────────────────────────────────────────

  /** Listar todas las empresas con conteo de usuarios */
  listCompanies: superAdminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z
          .enum(["active", "suspended", "cancelled", "all"])
          .default("all"),
        plan: z
          .enum(["trial", "basic", "professional", "enterprise", "all"])
          .default("all"),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      const { search, status, plan, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (search) {
        conditions.push(
          or(
            like(companies.razonSocial, `%${search}%`),
            like(companies.rfc, `%${search}%`),
            like(companies.emailContacto, `%${search}%`)
          )
        );
      }
      if (status !== "all") conditions.push(eq(companies.status, status));
      if (plan !== "all") conditions.push(eq(companies.plan, plan));

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, [{ total }]] = await Promise.all([
        db
          .select()
          .from(companies)
          .where(where)
          .orderBy(desc(companies.createdAt))
          .limit(pageSize)
          .offset(offset),
        db.select({ total: count() }).from(companies).where(where),
      ]);

      // Conteo de usuarios por empresa
      const userCounts = await db
        .select({
          companyId: users.companyId,
          userCount: count(),
        })
        .from(users)
        .groupBy(users.companyId);

      const userCountMap = new Map(
        userCounts.map(r => [r.companyId, r.userCount])
      );

      return {
        data: rows.map(c => ({
          ...c,
          userCount: userCountMap.get(c.id) ?? 0,
        })),
        total: Number(total),
        page,
        pageSize,
        totalPages: Math.ceil(Number(total) / pageSize),
      };
    }),

  /** Obtener una empresa por ID */
  getCompany: superAdminProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      const [company] = await db
        .select()
        .from(companies)
        .where(eq(companies.id, input.id))
        .limit(1);
      if (!company)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empresa no encontrada",
        });
      return company;
    }),

  /** Crear una nueva empresa */
  createCompany: superAdminProcedure
    .input(
      z.object({
        razonSocial: z.string().min(1).max(255),
        rfc: z.string().min(12).max(13),
        direccionFiscal: z.string().optional(),
        giro: z.string().optional(),
        actividadesPreponderantes: z.string().optional(),
        numeroTrabajadores: z.number().int().optional(),
        representanteLegal: z.string().optional(),
        telefonoContacto: z.string().optional(),
        emailContacto: z.string().email().optional(),
        paginaWeb: z.string().optional(),
        plan: z
          .enum(["trial", "basic", "professional", "enterprise"])
          .default("trial"),
        conflictThreshold: z.number().min(0).max(100).default(30),
        notificationEmail: z.string().email().optional(),
        internalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      const [result] = await (db.insert(companies) as any).values({
        razonSocial: input.razonSocial,
        rfc: input.rfc.toUpperCase(),
        direccionFiscal: input.direccionFiscal,
        giro: input.giro,
        actividadesPreponderantes: input.actividadesPreponderantes,
        numeroTrabajadores: input.numeroTrabajadores,
        representanteLegal: input.representanteLegal,
        telefonoContacto: input.telefonoContacto,
        emailContacto: input.emailContacto,
        paginaWeb: input.paginaWeb,
        plan: input.plan,
        conflictThreshold: String(input.conflictThreshold),
        notificationEmail: input.notificationEmail,
        internalNotes: input.internalNotes,
      });
      return { id: (result as any).insertId };
    }),

  /** Actualizar datos de una empresa */
  updateCompany: superAdminProcedure
    .input(
      z.object({
        id: z.number().int(),
        razonSocial: z.string().min(1).max(255).optional(),
        rfc: z.string().min(12).max(13).optional(),
        direccionFiscal: z.string().optional(),
        giro: z.string().optional(),
        actividadesPreponderantes: z.string().optional(),
        numeroTrabajadores: z.number().int().optional(),
        representanteLegal: z.string().optional(),
        telefonoContacto: z.string().optional(),
        emailContacto: z.string().email().optional(),
        paginaWeb: z.string().optional(),
        plan: z
          .enum(["trial", "basic", "professional", "enterprise"])
          .optional(),
        status: z.enum(["active", "suspended", "cancelled"]).optional(),
        conflictThreshold: z.number().min(0).max(100).optional(),
        notificationEmail: z.string().email().optional(),
        internalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      const { id, conflictThreshold, ...rest } = input;
      const updateData: Record<string, unknown> = { ...rest };
      if (conflictThreshold !== undefined) {
        updateData.conflictThreshold = String(conflictThreshold);
      }
      if (rest.rfc) updateData.rfc = rest.rfc.toUpperCase();
      await db.update(companies).set(updateData).where(eq(companies.id, id));
      return { success: true };
    }),

  /** Suspender o reactivar una empresa */
  setCompanyStatus: superAdminProcedure
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["active", "suspended", "cancelled"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      await db
        .update(companies)
        .set({ status: input.status })
        .where(eq(companies.id, input.id));
      return { success: true };
    }),

  // ─── Usuarios cross-tenant ────────────────────────────────────────────────

  /** Listar usuarios de una empresa específica */
  listCompanyUsers: superAdminProcedure
    .input(
      z.object({
        companyId: z.number().int(),
        search: z.string().optional(),
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      const { companyId, search, page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      const conditions: ReturnType<typeof eq>[] = [
        eq(users.companyId, companyId),
      ];
      if (search) {
        conditions.push(
          or(
            like(users.name, `%${search}%`),
            like(users.email, `%${search}%`)
          ) as ReturnType<typeof eq>
        );
      }

      const where = and(...conditions);

      const [rows, [{ total }]] = await Promise.all([
        db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
            role: users.role,
            companyId: users.companyId,
            createdAt: users.createdAt,
            lastSignedIn: users.lastSignedIn,
          })
          .from(users)
          .where(where)
          .orderBy(desc(users.createdAt))
          .limit(pageSize)
          .offset(offset),
        db.select({ total: count() }).from(users).where(where),
      ]);

      return {
        data: rows,
        total: Number(total),
        page,
        pageSize,
        totalPages: Math.ceil(Number(total) / pageSize),
      };
    }),

  /** Asignar un usuario a una empresa */
  assignUserToCompany: superAdminProcedure
    .input(
      z.object({
        userId: z.number().int(),
        companyId: z.number().int().nullable(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      await db
        .update(users)
        .set({ companyId: input.companyId })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),

  /** Cambiar el rol de un usuario */
  setUserRole: superAdminProcedure
    .input(
      z.object({
        userId: z.number().int(),
        role: z.enum([
          "super_admin",
          "admin",
          "instructor",
          "student",
          "committee",
          "committee_member",
          "committee_coordinator",
          "administrativo",
          "director",
          "responsable_nom035",
          "gerente",
          "rh",
          "supervisor",
          "jefe_area",
          "empleado",
          "auxiliar_rh",
          "recursos_humanos",
          "demo",
        ]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      await db
        .update(users)
        .set({ role: input.role })
        .where(eq(users.id, input.userId));
      return { success: true };
    }),

  /** Listar usuarios sin empresa asignada */
  listUnassignedUsers: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB no disponible",
      });

    const unassigned = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(isNull(users.companyId))
      .orderBy(users.name);
    return unassigned;
  }),

  // ─── Estadísticas globales ────────────────────────────────────────────────

  /** Estadísticas globales del sistema */
  getGlobalStats: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB no disponible",
      });

    const [
      [{ totalCompanies }],
      [{ activeCompanies }],
      [{ totalUsers }],
      planBreakdown,
    ] = await Promise.all([
      db.select({ totalCompanies: count() }).from(companies),
      db
        .select({ activeCompanies: count() })
        .from(companies)
        .where(eq(companies.status, "active")),
      db.select({ totalUsers: count() }).from(users),
      db
        .select({ plan: companies.plan, cnt: count() })
        .from(companies)
        .groupBy(companies.plan),
    ]);

    return {
      totalCompanies: Number(totalCompanies),
      activeCompanies: Number(activeCompanies),
      totalUsers: Number(totalUsers),
      planBreakdown: planBreakdown.map(r => ({
        plan: r.plan,
        count: Number(r.cnt),
      })),
    };
  }),

  /** Listado simple de empresas activas para selectores en el frontend (accesible para todos los usuarios autenticados) */
  listCompaniesSimple: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "DB no disponible",
      });
    const rows = await db
      .select({
        id: companies.id,
        name: companies.razonSocial,
        rfc: companies.rfc,
      })
      .from(companies)
      .where(eq(companies.status, "active"))
      .orderBy(companies.razonSocial);
    return rows;
  }),
});
