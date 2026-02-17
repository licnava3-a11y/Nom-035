import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { departments, departmentHistory, positions, employees, systemSettings, bulkReassignments, bulkReassignmentDetails } from "../../drizzle/schema";
import { sendEmail } from "../lib/email-sender";
import { eq, like, and, sql, count, desc, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const departmentsRouter = router({
  // Listar departamentos con paginación y filtros
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        search: z.string().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      const { page, pageSize, search, isActive } = input;
      const offset = (page - 1) * pageSize;

      const conditions = [];
      if (search) {
        conditions.push(like(departments.name, `%${search}%`));
      }
      if (isActive !== undefined) {
        conditions.push(eq(departments.isActive, isActive));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Obtener departamentos con conteo de empleados
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const results = await db
        .select({
          id: departments.id,
          name: departments.name,
          description: departments.description,
          code: departments.code,
          managerId: departments.managerId,

          isActive: departments.isActive,
          createdAt: departments.createdAt,
          employeeCount: sql<number>`(
            SELECT COUNT(*) 
            FROM ${employees} 
            WHERE ${employees.departmentId} = ${departments.id}
          )`,
        })
        .from(departments)
        .where(whereClause)
        .limit(pageSize)
        .offset(offset)
        .orderBy(desc(departments.createdAt));

      // Contar total
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [{ total }] = await db
        .select({ total: count() })
        .from(departments)
        .where(whereClause);

      return {
        data: results,
        pagination: {
          page,
          pageSize,
          total: Number(total),
          totalPages: Math.ceil(Number(total) / pageSize),
        },
      };
    }),

  // Obtener un departamento por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [department] = await db
        .select()
        .from(departments)
        .where(eq(departments.id, input.id))
        .limit(1);

      if (!department) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Departamento no encontrado",
        });
      }

      return department;
    }),

  // Crear departamento
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "El nombre es requerido"),
        description: z.string().optional(),
        code: z.string().min(1, "El código es requerido"),
        managerId: z.number().optional(),
        parentId: z.number().nullable().optional(),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Verificar código único
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [existing] = await db
        .select()
        .from(departments)
        .where(eq(departments.code, input.code))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe un departamento con este código",
        });
      }

      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [newDepartment] = await db
        .insert(departments)
        .values({
          name: input.name,
          description: input.description,
          code: input.code,
          managerId: input.managerId,
          parentId: input.parentId ?? null,
          isActive: input.isActive,
        })
        .$returningId();

      return { id: newDepartment.id, success: true };
    }),

  // Actualizar departamento
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        code: z.string().min(1).optional(),
        managerId: z.number().optional(),
        parentId: z.number().nullable().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { id, ...updates } = input;

      // Verificar que existe
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [existing] = await db
        .select()
        .from(departments)
        .where(eq(departments.id, id))
        .limit(1);

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Departamento no encontrado",
        });
      }

      // Si se actualiza el parentId, verificar que no cree un ciclo
      if (updates.parentId !== undefined && updates.parentId !== existing.parentId) {
        // Función recursiva para detectar ciclos
        const wouldCreateCycle = async (deptId: number, targetParentId: number | null): Promise<boolean> => {
          if (targetParentId === null) return false; // Raíz no crea ciclo
          if (targetParentId === deptId) return true; // Ciclo directo
          
          // @ts-expect-error - getDb() siempre retorna instancia válida
          const [parent] = await db
            .select()
            .from(departments)
            .where(eq(departments.id, targetParentId))
            .limit(1);
          
          if (!parent) return false; // Padre no existe
          if (parent.parentId === null) return false; // Llegó a la raíz
          
          // Verificar recursivamente hacia arriba
          return await wouldCreateCycle(deptId, parent.parentId);
        };
        
        const hasCycle = await wouldCreateCycle(id, updates.parentId);
        if (hasCycle) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No se puede asignar este departamento padre porque crearía un ciclo en la jerarquía. Un departamento no puede ser descendiente de sí mismo.",
          });
        }
      }

      // Si se actualiza el código, verificar que sea único
      if (updates.code && updates.code !== existing.code) {
        // @ts-expect-error - getDb() siempre retorna instancia válida
        const [duplicate] = await db
          .select()
          .from(departments)
          .where(eq(departments.code, updates.code))
          .limit(1);

        if (duplicate) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ya existe un departamento con este código",
          });
        }
      }

      // @ts-expect-error - getDb() siempre retorna instancia válida
      await db.update(departments).set(updates).where(eq(departments.id, id));

      // Guardar en historial
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [updated] = await db
        .select()
        .from(departments)
        .where(eq(departments.id, id))
        .limit(1);

      if (updated) {
        // @ts-expect-error - getDb() siempre retorna instancia válida
        await db.insert(departmentHistory).values({
          departmentId: updated.id,
          name: updated.name,
          description: updated.description,
          code: updated.code,
          parentId: updated.parentId,
          managerId: updated.managerId,
          isActive: updated.isActive,
          changeType: 'updated',
          changedBy: null,
        });
        
        // Notificar cambios críticos de estructura
        if (updates.parentId !== undefined && updates.parentId !== existing.parentId) {
          try {
            // Obtener configuración del sistema para correo de notificaciones
            // @ts-expect-error - getDb() siempre retorna instancia válida
            const [settings] = await db
              .select()
              .from(systemSettings)
              .where(eq(systemSettings.settingKey, 'hr_email'))
              .limit(1);
            
            const hrEmail = settings?.settingValue || process.env.OWNER_EMAIL;
            
            if (hrEmail) {
              // Obtener información del departamento padre anterior y nuevo
              let oldParentName = 'Raíz (sin padre)';
              let newParentName = 'Raíz (sin padre)';
              
              if (existing.parentId) {
                // @ts-expect-error - getDb() siempre retorna instancia válida
                const [oldParent] = await db
                  .select()
                  .from(departments)
                  .where(eq(departments.id, existing.parentId))
                  .limit(1);
                if (oldParent) oldParentName = oldParent.name;
              }
              
              if (updated.parentId) {
                // @ts-expect-error - getDb() siempre retorna instancia válida
                const [newParent] = await db
                  .select()
                  .from(departments)
                  .where(eq(departments.id, updated.parentId))
                  .limit(1);
                if (newParent) newParentName = newParent.name;
              }
              
              // Obtener empleados afectados
              // @ts-expect-error - getDb() siempre retorna instancia válida
              const affectedEmployees = await db
                .select({
                  id: employees.id,
                  firstName: employees.firstName,
                  lastName: employees.lastName,
                  email: employees.email,
                })
                .from(employees)
                .where(eq(employees.departmentId, updated.id));
              
              const employeeList = affectedEmployees.length > 0
                ? affectedEmployees.map(e => `- ${e.firstName} ${e.lastName} (${e.email})`).join('\n')
                : 'Ningún empleado asignado actualmente';
              
              await sendEmail({
                to: hrEmail,
                subject: `⚠️ Reestructuración Organizacional: ${updated.name}`,
                html: `
                  <h2 style="color: #1e3a8a;">⚠️ Cambio Crítico en Estructura Organizacional</h2>
                  <p>Se ha detectado un cambio en la jerarquía organizacional que requiere su atención:</p>
                  
                  <div style="background-color: #f3f4f6; padding: 15px; border-left: 4px solid #1e3a8a; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Detalles del Cambio</h3>
                    <p><strong>Departamento:</strong> ${updated.name} (${updated.code})</p>
                    <p><strong>Departamento Padre Anterior:</strong> ${oldParentName}</p>
                    <p><strong>Nuevo Departamento Padre:</strong> ${newParentName}</p>
                    <p><strong>Fecha del Cambio:</strong> ${new Date().toLocaleString('es-MX')}</p>
                  </div>
                  
                  <h3>Empleados Afectados (${affectedEmployees.length})</h3>
                  <pre style="background-color: #f9fafb; padding: 10px; border-radius: 4px;">${employeeList}</pre>
                  
                  <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                    Esta es una notificación automática del sistema de gestión de talento NOM-035.<br>
                    Para ver el historial completo de cambios, acceda al dashboard de Cambios Organizacionales.
                  </p>
                `,
              });
            }
          } catch (emailError) {
            // No fallar la operación si el correo falla, solo registrar
            console.error('Error al enviar notificación de cambio organizacional:', emailError);
          }
        }
      }

      return { success: true };
    }),

  // Eliminar departamento
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();

      // Verificar que no tenga empleados asignados
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [{ employeeCount }] = await db
        .select({ employeeCount: count() })
        .from(employees)
        .where(eq(employees.departmentId, input.id));

      if (Number(employeeCount) > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `No se puede eliminar el departamento porque tiene ${employeeCount} empleado(s) asignado(s)`,
        });
      }

      // Verificar que no tenga puestos asignados
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [{ positionCount }] = await db
        .select({ positionCount: count() })
        .from(positions)
        .where(eq(positions.departmentId, input.id));

      if (Number(positionCount) > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `No se puede eliminar el departamento porque tiene ${positionCount} puesto(s) asignado(s)`,
        });
      }

      // @ts-expect-error - getDb() siempre retorna instancia válida
      await db.delete(departments).where(eq(departments.id, input.id));

      return { success: true };
    }),

  // Obtener jerarquía organizacional
  getHierarchy: protectedProcedure.query(async () => {
    const db = await getDb();

    // @ts-expect-error - getDb() siempre retorna instancia válida
    const allDepartments = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        managerId: departments.managerId,
        parentId: departments.parentId,
        isActive: departments.isActive,
        employeeCount: sql<number>`(
          SELECT COUNT(*) 
          FROM ${employees} 
          WHERE ${employees.departmentId} = ${departments.id}
        )`,
      })
      .from(departments)
      .where(eq(departments.isActive, true));

    // Construir árbol jerárquico
    type DepartmentNode = typeof allDepartments[0] & { children?: DepartmentNode[] };
    
    const departmentMap = new Map<number, DepartmentNode>();
    const rootDepartments: DepartmentNode[] = [];

    // Crear mapa de departamentos
    allDepartments.forEach(dept => {
      departmentMap.set(dept.id, { ...dept, children: [] });
    });

    // Construir jerarquía
    allDepartments.forEach(dept => {
      const node = departmentMap.get(dept.id)!;
      
      if (dept.parentId === null) {
        // Es un departamento raíz
        rootDepartments.push(node);
      } else {
        // Es un subdepartamento, agregarlo al padre
        const parent = departmentMap.get(dept.parentId);
        if (parent) {
          parent.children!.push(node);
        } else {
          // Si el padre no existe, tratarlo como raíz
          rootDepartments.push(node);
        }
      }
    });

    return rootDepartments;
  }),

  // Obtener estadísticas por departamento
  getStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();

      // Construir condiciones de filtrado
      const conditions = [eq(departments.isActive, true)];
      
      if (input?.startDate && input?.endDate) {
        conditions.push(
          and(
            sql`${employees.hireDate} >= ${input.startDate}`,
            sql`${employees.hireDate} <= ${input.endDate}`
          ) as any
        );
      }

      // @ts-expect-error - getDb() siempre retorna instancia válida
      const stats = await db
        .select({
          departmentId: departments.id,
          departmentName: departments.name,
          employeeCount: count(employees.id),
        })
        .from(departments)
        .leftJoin(employees, eq(employees.departmentId, departments.id))
        .where(and(...conditions))
        .groupBy(departments.id, departments.name)
        .orderBy(desc(count(employees.id)));

      // Calcular totales
      const totalDepartments = stats.length;
      const totalEmployees = stats.reduce((sum, dept) => sum + dept.employeeCount, 0);

      return {
        totalDepartments,
        totalEmployees,
        departments: stats,
      };
    }),

  // Obtener jerarquía organizacional en una fecha específica
  getHierarchyAtDate: protectedProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();

      // Obtener el estado de cada departamento en la fecha especificada
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const historicalDepartments = await db
        .select({
          id: sql<number>`dh.departmentId`,
          name: sql<string>`dh.name`,
          code: sql<string>`dh.code`,
          managerId: sql<number | null>`dh.managerId`,
          parentId: sql<number | null>`dh.parentId`,
          isActive: sql<boolean>`dh.isActive`,
          employeeCount: sql<number>`0`, // No calculamos empleados históricos por simplicidad
        })
        .from(sql`(
          SELECT dh1.*
          FROM department_history dh1
          INNER JOIN (
            SELECT departmentId, MAX(changedAt) as maxChangedAt
            FROM department_history
            WHERE changedAt <= ${input.date}
            GROUP BY departmentId
          ) dh2 ON dh1.departmentId = dh2.departmentId AND dh1.changedAt = dh2.maxChangedAt
          WHERE dh1.changeType != 'deleted'
        ) as dh`);

      // Construir árbol jerárquico
      type DepartmentNode = typeof historicalDepartments[0] & { children?: DepartmentNode[] };
      
      const departmentMap = new Map<number, DepartmentNode>();
      const rootDepartments: DepartmentNode[] = [];

      // Crear mapa de departamentos
      historicalDepartments.forEach(dept => {
        departmentMap.set(dept.id, { ...dept, children: [] });
      });

      // Construir jerarquía
      historicalDepartments.forEach(dept => {
        const node = departmentMap.get(dept.id)!;
        
        if (dept.parentId === null) {
          rootDepartments.push(node);
        } else {
          const parent = departmentMap.get(dept.parentId);
          if (parent) {
            parent.children!.push(node);
          } else {
            rootDepartments.push(node);
          }
        }
      });

      return rootDepartments;
    }),

  // Obtener historial de cambios organizacionales
  getChangeHistory: protectedProcedure
    .input(
      z.object({
        changeType: z.enum(['created', 'updated', 'deleted', 'all']).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        departmentId: z.number().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();

      // Construir condiciones de filtrado
      const conditions: any[] = [];
      
      if (input?.changeType && input.changeType !== 'all') {
        conditions.push(eq(departmentHistory.changeType, input.changeType));
      }
      
      if (input?.startDate) {
        conditions.push(sql`${departmentHistory.changedAt} >= ${input.startDate}`);
      }
      
      if (input?.endDate) {
        conditions.push(sql`${departmentHistory.changedAt} <= ${input.endDate}`);
      }
      
      if (input?.departmentId) {
        conditions.push(eq(departmentHistory.departmentId, input.departmentId));
      }

      // @ts-expect-error - getDb() siempre retorna instancia válida
      const changes = await db
        .select()
        .from(departmentHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(departmentHistory.changedAt))
        .limit(500); // Limitar a 500 cambios más recientes

      return changes;
    }),

  // Obtener estadísticas de cambios
  getChangeStats: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();

      // Construir condiciones de filtrado
      const conditions: any[] = [];
      
      if (input?.startDate) {
        conditions.push(sql`${departmentHistory.changedAt} >= ${input.startDate}`);
      }
      
      if (input?.endDate) {
        conditions.push(sql`${departmentHistory.changedAt} <= ${input.endDate}`);
      }

      // Obtener conteo por tipo de cambio
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const statsByType = await db
        .select({
          changeType: departmentHistory.changeType,
          count: count(departmentHistory.id),
        })
        .from(departmentHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(departmentHistory.changeType);

      // Obtener conteo por mes
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const statsByMonth = await db
        .select({
          month: sql<string>`DATE_FORMAT(${departmentHistory.changedAt}, '%Y-%m')`,
          count: count(departmentHistory.id),
        })
        .from(departmentHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(sql`DATE_FORMAT(${departmentHistory.changedAt}, '%Y-%m')`)
        .orderBy(sql`DATE_FORMAT(${departmentHistory.changedAt}, '%Y-%m')`);

      return {
        byType: statsByType,
        byMonth: statsByMonth,
      };
    }),

  // Reasignación masiva de empleados a nuevo departamento
  bulkReassign: protectedProcedure
    .input(
      z.object({
        employeeIds: z.array(z.number()).min(1, "Debe seleccionar al menos un empleado"),
        newDepartmentId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Verificar que el departamento destino existe
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [targetDept] = await db
        .select()
        .from(departments)
        .where(eq(departments.id, input.newDepartmentId))
        .limit(1);

      if (!targetDept) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Departamento destino no encontrado",
        });
      }

      // Obtener información de empleados a reasignar
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const employeesToReassign = await db
        .select({
          id: employees.id,
          name: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          email: employees.email,
          departmentId: employees.departmentId,
        })
        .from(employees)
        .where(sql`${employees.id} IN (${sql.join(input.employeeIds.map(id => sql`${id}`), sql`, `)})`)
        .execute();

      if (employeesToReassign.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No se encontraron empleados para reasignar",
        });
      }

      // Actualizar departamento de empleados
      // @ts-expect-error - getDb() siempre retorna instancia válida
      await db
        .update(employees)
        .set({ departmentId: input.newDepartmentId })
        .where(sql`${employees.id} IN (${sql.join(input.employeeIds.map(id => sql`${id}`), sql`, `)})`)
        .execute();

      // Registrar reasignación masiva en tabla de auditoría
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [reassignmentRecord] = await db
        .insert(bulkReassignments)
        .values({
          sourceDepartmentId: employeesToReassign[0]?.departmentId || null,
          sourceDepartmentName: employeesToReassign[0]?.departmentId
            ? (await db.select({ name: departments.name }).from(departments).where(eq(departments.id, employeesToReassign[0].departmentId)).execute())[0]?.name || null
            : null,
          targetDepartmentId: input.newDepartmentId,
          targetDepartmentName: targetDept.name,
          performedBy: ctx.user.id,
          performedByName: ctx.user.name || 'Usuario',
          reason: input.reason || null,
          employeeCount: employeesToReassign.length,
        })
        .execute();

      const reassignmentId = reassignmentRecord.insertId;

      // Registrar detalles de empleados afectados
      const detailRecords = employeesToReassign.map((emp) => ({
        reassignmentId: Number(reassignmentId),
        employeeId: emp.id,
        employeeName: emp.name,
        employeeEmail: emp.email || null,
      }));

      // @ts-expect-error - getDb() siempre retorna instancia válida
      await db.insert(bulkReassignmentDetails).values(detailRecords);

      // Enviar notificaciones por email a empleados afectados (opcional)
      const emailPromises = employeesToReassign.map(async (emp) => {
        if (!emp.email) return;

        try {
          await sendEmail({
            to: emp.email,
            subject: "Cambio de Departamento",
            html: `
              <h2>Notificación de Cambio de Departamento</h2>
              <p>Estimado/a ${emp.name},</p>
              <p>Le informamos que ha sido reasignado/a al departamento: <strong>${targetDept.name}</strong>.</p>
              ${input.reason ? `<p><strong>Motivo:</strong> ${input.reason}</p>` : ""}
              <p>Si tiene alguna duda, por favor contacte a Recursos Humanos.</p>
              <br>
              <p>Saludos cordiales,<br>Equipo de Recursos Humanos</p>
            `,
          });
        } catch (error) {
          console.error(`Error al enviar email a ${emp.email}:`, error);
        }
      });

      await Promise.allSettled(emailPromises);

      return {
        success: true,
        reassignedCount: employeesToReassign.length,
        departmentName: targetDept.name,
      };
    }),

  /**
   * Obtener alertas activas de departamentos sin manager
   */
  getActiveAlerts: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Obtener departamentos activos sin manager
    // @ts-expect-error - getDb() siempre retorna instancia válida
    const deptsWithoutManager = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        createdAt: departments.createdAt,
        description: departments.description,
      })
      .from(departments)
      .where(
        and(
          eq(departments.isActive, true),
          isNull(departments.managerId)
        )
      );

    // Calcular días sin manager desde creación
    const alerts = deptsWithoutManager.map((dept) => {
      const daysSinceCreation = Math.floor(
        (Date.now() - new Date(dept.createdAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        ...dept,
        daysSinceCreation,
        urgency: daysSinceCreation > 60 ? "critical" : daysSinceCreation > 30 ? "high" : "medium",
      };
    });

    // Filtrar solo departamentos con más de 30 días
    const criticalAlerts = alerts.filter((alert) => alert.daysSinceCreation >= 30);

    return {
      alerts: criticalAlerts,
      totalCount: criticalAlerts.length,
    };
  }),

  /**
   * Obtener historial de reasignaciones masivas
   */
  getReassignmentHistory: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, pageSize } = input;
      const offset = (page - 1) * pageSize;

      // Obtener reasignaciones con paginación
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const reassignments = await db
        .select()
        .from(bulkReassignments)
        .orderBy(desc(bulkReassignments.createdAt))
        .limit(pageSize)
        .offset(offset)
        .execute();

      // Contar total de reasignaciones
      // @ts-expect-error - getDb() siempre retorna instancia válida
      const [{ total }] = await db
        .select({ total: count() })
        .from(bulkReassignments)
        .execute();

      // Obtener detalles de empleados para cada reasignación
      const reassignmentsWithDetails = await Promise.all(
        reassignments.map(async (reassignment) => {
          // @ts-expect-error - getDb() siempre retorna instancia válida
          const details = await db
            .select()
            .from(bulkReassignmentDetails)
            .where(eq(bulkReassignmentDetails.reassignmentId, reassignment.id))
            .execute();

          return {
            ...reassignment,
            affectedEmployees: details,
          };
        })
      );

      return {
        reassignments: reassignmentsWithDetails,
        totalCount: total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  /**
   * Exportar todos los departamentos a Excel
   * Genera archivo con 3 hojas: Departamentos, Empleados por Departamento, Managers
   */
  exportAll: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const XLSX = await import("xlsx");

    // Obtener todos los departamentos con manager
    // @ts-expect-error - getDb() siempre retorna instancia válida
    const allDepartments = await db
      .select({
        id: departments.id,
        name: departments.name,
        code: departments.code,
        managerId: departments.managerId,
        managerName: sql`(SELECT name FROM user WHERE id = ${departments.managerId})`
          .mapWith(String)
          .as("managerName"),
        createdAt: departments.createdAt,
        isActive: departments.isActive,
      })
      .from(departments)
      .execute();

    // Contar empleados por departamento
    const employeeCounts = await Promise.all(
      allDepartments.map(async (dept) => {
        // @ts-expect-error - getDb() siempre retorna instancia válida
        const [result] = await db
          .select({ count: count() })
          .from(employees)
          .where(eq(employees.departmentId, dept.id))
          .execute();

        return {
          departmentId: dept.id,
          employeeCount: result.count,
        };
      })
    );

    // Hoja 1: Departamentos
    const departmentsData = allDepartments.map((dept) => {
      const empCount = employeeCounts.find((ec) => ec.departmentId === dept.id);
      return {
        ID: dept.id,
        "Nombre": dept.name,
        "Código": dept.code,
        "Manager": dept.managerName || "Sin asignar",
        "Total Empleados": empCount?.employeeCount || 0,
        "Fecha Creación": dept.createdAt
          ? new Date(dept.createdAt).toLocaleDateString("es-MX")
          : "",
        "Estado": dept.isActive ? "Activo" : "Inactivo",
      };
    });

    // Hoja 2: Empleados por Departamento
    const employeesByDept = await Promise.all(
      allDepartments.map(async (dept) => {
        // @ts-expect-error - getDb() siempre retorna instancia válida
        const deptEmployees = await db
          .select({
            id: employees.id,
            name: employees.name,
            email: employees.email,
            position: employees.position,
            status: employees.status,
          })
          .from(employees)
          .where(eq(employees.departmentId, dept.id))
          .execute();

        return deptEmployees.map((emp) => ({
          "Departamento": dept.name,
          "ID Empleado": emp.id,
          "Nombre": emp.name,
          "Email": emp.email,
          "Puesto": emp.position,
          "Estado": emp.status,
        }));
      })
    );
    const flatEmployeesData = employeesByDept.flat();

    // Hoja 3: Managers
    const managersData = allDepartments
      .filter((dept) => dept.managerId)
      .map((dept) => ({
        "Departamento": dept.name,
        "Manager": dept.managerName || "",
        "ID Manager": dept.managerId,
      }));

    // Crear workbook
    const wb = XLSX.utils.book_new();

    // Agregar hojas
    const ws1 = XLSX.utils.json_to_sheet(departmentsData);
    XLSX.utils.book_append_sheet(wb, ws1, "Departamentos");

    const ws2 = XLSX.utils.json_to_sheet(flatEmployeesData);
    XLSX.utils.book_append_sheet(wb, ws2, "Empleados por Departamento");

    const ws3 = XLSX.utils.json_to_sheet(managersData);
    XLSX.utils.book_append_sheet(wb, ws3, "Managers");

    // Generar buffer
    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Convertir a base64
    const base64 = excelBuffer.toString("base64");

    return {
      filename: `departamentos_exportacion_${new Date().toISOString().split("T")[0]}.xlsx`,
      data: base64,
      departmentCount: allDepartments.length,
      employeeCount: flatEmployeesData.length,
      managerCount: managersData.length,
    };
  }),
});


