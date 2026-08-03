import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { cases, employees, departments, users } from "../../drizzle/schema";
import { eq, desc, and, or, like, isNull, sql } from "drizzle-orm";
import { sendEmail, getCaseCriticalTemplate, getCaseAssignedTemplate } from "../services/emailService";

export const casesManagementRouter = router({
  // Crear nuevo caso manualmente
  createCase: protectedProcedure
    .input(
      z.object({
        reporterName: z.string().min(1, "Nombre del reportante requerido"),
        reporterEmail: z.string().email("Email inválido").optional(),
        isAnonymous: z.boolean().default(false),
        caseType: z.enum(["mobbing", "burnout", "violence", "stress", "other"]),
        description: z.string().min(10, "Descripción debe tener al menos 10 caracteres"),
        priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
        departmentId: z.number({ message: "Departamento requerido" }),
        assignedTo: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        // Generar número de caso único
        const caseNumber = `CASE-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;

        // Crear caso
        const [newCase] = await (db.insert(cases) as any).values({
          caseNumber,
          reporterName: input.reporterName,
          reporterEmail: input.reporterEmail || null,
          isAnonymous: input.isAnonymous,
          caseType: input.caseType,
          description: input.description,
          status: "open",
          priority: input.priority,
          departmentId: input.departmentId,
          assignedTo: input.assignedTo || null,
          createdAt: new Date(),
        });

        // Enviar notificación por email si el caso es crítico o alto
        if (input.priority === "critical" || input.priority === "high") {
          try {
            // Obtener información del departamento
            const [department] = await db.select().from(departments).where(eq(departments.id, input.departmentId)).limit(1);
            
            // Obtener emails de administradores y responsables de NOM-035
            const admins = await db.select().from(users).where(
              or(
                eq(users.role, "admin"),
                eq(users.role, "responsable_nom035"),
                eq(users.role, "director")
              )
            );
            
            const adminEmails = admins
              .map(admin => admin.email)
              .filter((email): email is string => email !== null && email !== undefined);

            if (adminEmails.length > 0) {
              const emailHtml = getCaseCriticalTemplate({
                folio: caseNumber,
                caseType: input.caseType,
                reporterName: input.reporterName,
                description: input.description,
                priority: input.priority,
                departmentName: department?.name,
              });

              // Enviar email de forma asíncrona (no bloquear la respuesta)
              sendEmail({
                to: adminEmails,
                subject: `🚨 Caso Crítico: ${caseNumber} - ${input.caseType}`,
                html: emailHtml,
                template: "case_critical",
              }).catch(error => {
                console.error("[CasesManagement] Error al enviar email de caso crítico:", error);
              });
            }
          } catch (emailError) {
            console.error("[CasesManagement] Error al preparar email de notificación:", emailError);
            // No lanzar error, solo registrar - el caso ya fue creado exitosamente
          }
        }

        // Si se asignó a alguien, enviar notificación
        if (input.assignedTo) {
          try {
            const [assignedUser] = await db.select().from(users).where(eq(users.id, input.assignedTo)).limit(1);
            
            if (assignedUser && assignedUser.email) {
              const emailHtml = getCaseAssignedTemplate({
                folio: caseNumber,
                caseType: input.caseType,
                assignedToName: assignedUser.name || "Usuario",
                reporterName: input.reporterName,
                description: input.description,
              });

              sendEmail({
                to: assignedUser.email,
                subject: `📋 Nuevo Caso Asignado: ${caseNumber}`,
                html: emailHtml,
                template: "case_assigned",
              }).catch(error => {
                console.error("[CasesManagement] Error al enviar email de asignación:", error);
              });
            }
          } catch (emailError) {
            console.error("[CasesManagement] Error al preparar email de asignación:", emailError);
          }
        }

        return {
          success: true,
          caseId: newCase.insertId,
          caseNumber,
        };
      } catch (error) {
        console.error("[CasesManagement] Error creating case:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al crear caso",
        });
      }
    }),

  // Listar casos con filtros
  listCases: protectedProcedure
    .input(
      z.object({
        status: z.enum(["open", "investigating", "resolved", "closed", "all"]).default("all"),
        priority: z.enum(["low", "medium", "high", "critical", "all"]).default("all"),
        departmentId: z.number().optional(),
        search: z.string().optional(),
        dateFrom: z.string().optional(), // ISO date string YYYY-MM-DD
        dateTo: z.string().optional(),   // ISO date string YYYY-MM-DD
        page: z.number().default(1),
        pageSize: z.number().default(20),
      }).optional()
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const page = input?.page || 1;
        const pageSize = input?.pageSize || 20;
        const offset = (page - 1) * pageSize;

        let conditions = [];
        if (input?.status && input.status !== "all") {
          conditions.push(sql`${cases.status} = ${input.status}`);
        }
        if (input?.priority && input.priority !== "all") {
          conditions.push(sql`${cases.priority} = ${input.priority}`);
        }
        if (input?.departmentId) {
          conditions.push(eq(cases.departmentId, input.departmentId));
        }
        if (input?.search) {
          conditions.push(or(
            like(cases.reporterName, `%${input.search}%`),
            like(cases.caseNumber, `%${input.search}%`),
            like(cases.description, `%${input.search}%`),
          ) as any);
        }
        if (input?.dateFrom) {
          conditions.push(sql`${cases.createdAt} >= ${new Date(input.dateFrom)}`);
        }
        if (input?.dateTo) {
          const toDate = new Date(input.dateTo);
          toDate.setHours(23, 59, 59, 999);
          conditions.push(sql`${cases.createdAt} <= ${toDate}`);
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const [casesList, totalCount] = await Promise.all([
          db
            .select()
            .from(cases)
            .where(whereClause)
            .orderBy(desc(cases.createdAt))
            .limit(pageSize)
            .offset(offset),
          db
            .select({ count: sql<number>`count(*)` })
            .from(cases)
            .where(whereClause)
            .then(r => r[0]?.count || 0),
        ]);

        return {
          cases: casesList,
          pagination: {
            page,
            pageSize,
            totalCount,
            totalPages: Math.ceil(totalCount / pageSize),
          },
        };
      } catch (error) {
        console.error("[CasesManagement] Error listing cases:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al listar casos",
        });
      }
    }),

  // Obtener caso por ID
  getCaseById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const [caseData] = await db
          .select()
          .from(cases)
          .where(eq(cases.id, input.id))
          .limit(1);

        if (!caseData) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Caso no encontrado",
          });
        }

        return caseData;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[CasesManagement] Error getting case:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al obtener caso",
        });
      }
    }),

  // Actualizar caso
  updateCase: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["open", "investigating", "resolved", "closed"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        assignedTo: z.number().nullable().optional(),
        resolution: z.string().optional(),
        rootCause: z.string().optional(),
        actionPlan: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const updateData: any = {};
        if (input.status) updateData.status = input.status;
        if (input.priority) updateData.priority = input.priority;
        if (input.assignedTo !== undefined) updateData.assignedTo = input.assignedTo;
        if (input.resolution !== undefined) updateData.resolution = input.resolution;
        if (input.rootCause !== undefined) updateData.rootCause = input.rootCause;
        if (input.actionPlan !== undefined) updateData.actionPlan = input.actionPlan;

        if (input.status === "resolved" || input.status === "closed") {
          updateData.resolvedAt = new Date();
        }

        await db.update(cases).set(updateData).where(eq(cases.id, input.id));

        return { success: true };
      } catch (error) {
        console.error("[CasesManagement] Error updating case:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al actualizar caso",
        });
      }
    }),

  // Asignar caso a usuario
  assignCase: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
        assignedTo: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        await db
          .update(cases)
          .set({ assignedTo: input.assignedTo } as any)
          .where(eq(cases.id, input.caseId));

        return { success: true };
      } catch (error) {
        console.error("[CasesManagement] Error assigning case:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al asignar caso",
        });
      }
    }),

  // Sugerir contenido de campo con IA
  suggestCaseField: protectedProcedure
    .input(
      z.object({
        fieldType: z.enum(["description", "resolution", "rootCause", "actionPlan"]),
        context: z.string().optional(),
        currentValue: z.string().optional(),
        caseType: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const fieldLabels: Record<string, string> = {
        description: "descripción detallada del caso",
        resolution: "resolución y acciones tomadas para cerrar el caso",
        rootCause: "análisis de causa raíz del problema identificado",
        actionPlan: "plan de acción correctiva y preventiva para evitar recurrencia",
      };

      const fieldLabel = fieldLabels[input.fieldType] || input.fieldType;
      const contextInfo = input.context ? `\nContexto adicional: ${input.context}` : "";
      const currentValueInfo = input.currentValue
        ? `\nContenido actual del campo: ${input.currentValue}`
        : "";
      const caseTypeInfo = input.caseType
        ? `\nTipo de caso: ${input.caseType}`
        : "";

      const systemPrompt = `Eres un experto en gestión de casos de riesgos psicosociales en el trabajo según la NOM-035-STPS-2018.
Tu tarea es ayudar a redactar contenido profesional y preciso para los campos del sistema de gestión de casos.
Responde SOLO con el texto sugerido para el campo, sin explicaciones adicionales, sin comillas, sin formato markdown.
El texto debe ser claro, objetivo, profesional y en español.`;

      const userPrompt = `Sugiere un texto profesional para el campo "${fieldLabel}" de un caso de gestión de riesgos psicosociales.${caseTypeInfo}${contextInfo}${currentValueInfo}

El texto debe ser específico, accionable y seguir las mejores prácticas de la NOM-035-STPS-2018.`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "No se pudo generar sugerencia",
          });
        }

        return { suggestion: content as string };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al generar sugerencia con IA",
        });
      }
    }),

  // Obtener estadísticas de casos
  getCasesStats: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const [stats] = await db
        .select({
          total: sql<number>`count(*)`,
          open: sql<number>`sum(case when ${cases.status} = 'open' then 1 else 0 end)`,
          investigating: sql<number>`sum(case when ${cases.status} = 'investigating' then 1 else 0 end)`,
          resolved: sql<number>`sum(case when ${cases.status} = 'resolved' then 1 else 0 end)`,
          closed: sql<number>`sum(case when ${cases.status} = 'closed' then 1 else 0 end)`,
          critical: sql<number>`sum(case when ${cases.priority} = 'critical' then 1 else 0 end)`,
          unassigned: sql<number>`sum(case when ${cases.assignedTo} is null then 1 else 0 end)`,
        })
        .from(cases);

      return stats || {
        total: 0,
        open: 0,
        investigating: 0,
        resolved: 0,
        closed: 0,
        critical: 0,
        unassigned: 0,
      };
    } catch (error) {
      console.error("[CasesManagement] Error getting stats:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener estadísticas",
      });
    }
  }),

  // Generar PDF del detalle del caso
  generateCasePdf: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        const [caseData] = await db.select().from(cases).where(eq(cases.id, input.id)).limit(1);
        if (!caseData) throw new TRPCError({ code: "NOT_FOUND", message: "Caso no encontrado" });

        const statusLabels: Record<string, string> = {
          open: "Abierto", investigating: "Investigando", resolved: "Resuelto", closed: "Cerrado",
        };
        const priorityLabels: Record<string, string> = {
          low: "Baja", medium: "Media", high: "Alta", critical: "Crítica",
        };
        const caseTypeLabels: Record<string, string> = {
          mobbing: "Acoso Laboral", harassment: "Hostigamiento", stress: "Estrés Laboral",
          violence: "Violencia Laboral", burnout: "Burnout", other: "Otro",
        };

        const formatDate = (d: Date | string | null) =>
          d ? new Date(d).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" }) : "N/A";

        const section = (title: string, content: string, color = "#1e3a5f") => `
          <div style="margin-bottom:20px">
            <div style="background:${color};color:#fff;padding:8px 14px;border-radius:4px 4px 0 0;font-size:13px;font-weight:600;letter-spacing:.5px">${title}</div>
            <div style="border:1px solid #dde3ec;border-top:none;padding:14px;border-radius:0 0 4px 4px;background:#fff;font-size:13px;line-height:1.7;color:#2d3748;white-space:pre-wrap">${content || '<span style="color:#9ca3af;font-style:italic">Sin información registrada</span>'}</div>
          </div>`;

        const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
        <style>
          body{font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f7f9fc;color:#1a202c}
          .page{max-width:800px;margin:0 auto;padding:32px}
          .header{background:linear-gradient(135deg,#0f2d4a 0%,#1e3a5f 60%,#2d6a4f 100%);color:#fff;padding:28px 32px;border-radius:8px;margin-bottom:28px}
          .header h1{margin:0 0 4px;font-size:22px;font-weight:700}
          .header p{margin:0;font-size:12px;opacity:.8}
          .folio{font-family:monospace;font-size:14px;background:rgba(255,255,255,.15);padding:4px 10px;border-radius:4px;display:inline-block;margin-top:8px}
          .meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px}
          .meta-item{background:#fff;border:1px solid #dde3ec;border-radius:6px;padding:12px 14px}
          .meta-label{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
          .meta-value{font-size:13px;font-weight:600;color:#1a202c}
          .badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600}
          .badge-open{background:#dbeafe;color:#1d4ed8}
          .badge-investigating{background:#ede9fe;color:#7c3aed}
          .badge-resolved{background:#dcfce7;color:#15803d}
          .badge-closed{background:#f3f4f6;color:#374151}
          .badge-critical{background:#fee2e2;color:#dc2626}
          .badge-high{background:#ffedd5;color:#c2410c}
          .badge-medium{background:#fef9c3;color:#a16207}
          .badge-low{background:#f0fdf4;color:#15803d}
          .footer{margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;text-align:center}
          .ai-badge{background:#f3e8ff;color:#7c3aed;font-size:10px;padding:2px 7px;border-radius:10px;font-weight:600;margin-left:6px}
          @media print{body{background:#fff}.page{padding:16px}}
        </style></head><body><div class="page">
          <div class="header">
            <h1>Reporte de Caso NOM-035 STPS 2018</h1>
            <p>Plataforma de Gestión de Riesgos Psicosociales</p>
            <div class="folio">${caseData.caseNumber}</div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Tipo de Caso</div>
              <div class="meta-value">${caseTypeLabels[caseData.caseType] || caseData.caseType}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Estado</div>
              <div class="meta-value"><span class="badge badge-${caseData.status}">${statusLabels[caseData.status] || caseData.status}</span></div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Prioridad</div>
              <div class="meta-value"><span class="badge badge-${caseData.priority}">${priorityLabels[caseData.priority] || caseData.priority}</span></div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Fecha de Apertura</div>
              <div class="meta-value">${formatDate(caseData.createdAt)}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Reportado por</div>
              <div class="meta-value">${caseData.reporterName || "Anónimo"}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Correo del Reportante</div>
              <div class="meta-value">${caseData.reporterEmail || "N/A"}</div>
            </div>
          </div>

          ${section("Descripción del Caso", caseData.description || "")}
          ${section("Causa Raíz Identificada", caseData.rootCause || "", "#4c1d95")}
          ${section("Plan de Acción Correctiva", caseData.actionPlan || "", "#1e3a5f")}
          ${section("Resolución Final", caseData.resolution || "", "#14532d")}

          <div class="footer">
            Generado el ${new Date().toLocaleString("es-MX")} &nbsp;&bull;&nbsp; Folio: ${caseData.caseNumber} &nbsp;&bull;&nbsp; NOM-035-STPS-2018 &nbsp;&bull;&nbsp; Plataforma de Gestión de Riesgos Psicosociales
          </div>
        </div></body></html>`;

        const { generatePDFFromHTML } = await import("../_core/pdfGenerator");
        const fileName = `caso-${caseData.caseNumber}-${Date.now()}`;
        const pdfUrl = await generatePDFFromHTML(html, fileName, { format: "A4", orientation: "portrait" });
        return { url: pdfUrl, caseNumber: caseData.caseNumber };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[CasesManagement] Error generating PDF:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Error al generar el PDF del caso" });
      }
    }),
});
