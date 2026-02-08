import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { committeeMembers, employees, companyGeneralData, companyLogo } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import { generateConstitutiveActPDF } from "../pdfGenerators/committeeConstitutiveAct";
import { generateOperatingRulesPDF } from "../pdfGenerators/committeeOperatingRules";
import { logConstitutiveActEvidence, logOperatingRulesEvidence } from "../helpers/evidenceLogger";

export const committeeDocumentsRouter = router({
  /**
   * Generate Constitutive Act PDF
   */
  generateConstitutiveAct: protectedProcedure
    .input(
      z.object({
        constitutionDate: z.string(),
        constitutionPlace: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden generar el acta constitutiva",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Get company data
      const companyData = await db.select().from(companyGeneralData).limit(1);
      if (!companyData || companyData.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Datos de la empresa no encontrados. Configure los datos generales primero.",
        });
      }

      const company = companyData[0];

      // Get company logo
      const logoData = await db.select().from(companyLogo).limit(1);
      const logoUrl = logoData && logoData.length > 0 ? logoData[0].logoUrl : undefined;

      // Get committee members
      const members = await db
        .select({
          name: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          position: committeeMembers.position,
          department: employees.department,
        })
        .from(committeeMembers)
        .leftJoin(employees, sql`${committeeMembers.employeeId} = ${employees.id}`);

      if (!members || members.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No hay miembros del comité registrados. Agregue miembros primero.",
        });
      }

      // Generate folio
      const folio = `ACTA-CONST-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      // Generate PDF
      const pdfBuffer = await generateConstitutiveActPDF({
        companyName: company.razonSocial || "Empresa",
        companyRFC: company.rfc || "",
        companyAddress: company.direccionFiscal || "",
        constitutionDate: input.constitutionDate,
        constitutionPlace: input.constitutionPlace,
        members: members.map(m => ({
          name: m.name || "Sin nombre",
          position: m.position || "Sin cargo",
          department: m.department || "Sin departamento",
        })),
        logoUrl,
        folio,
      });

      // Upload PDF to S3
      const { url: pdfUrl, key: pdfKey } = await storagePut(
        `committee-documents/constitutive-act-${folio}.pdf`,
        pdfBuffer,
        "application/pdf"
      );

      // Register evidence automatically
      await logConstitutiveActEvidence(folio, pdfUrl, pdfKey, ctx.user.id);

      return {
        success: true,
        pdfUrl,
        pdfKey,
        folio,
      };
    }),

  /**
   * Generate Operating Rules PDF
   */
  generateOperatingRules: protectedProcedure
    .input(
      z.object({
        approvalDate: z.string(),
        approvalPlace: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden generar las bases de funcionamiento",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Get company data
      const companyData = await db.select().from(companyGeneralData).limit(1);
      if (!companyData || companyData.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Datos de la empresa no encontrados. Configure los datos generales primero.",
        });
      }

      const company = companyData[0];

      // Get company logo
      const logoData = await db.select().from(companyLogo).limit(1);
      const logoUrl = logoData && logoData.length > 0 ? logoData[0].logoUrl : undefined;

      // Get committee members
      const members = await db
        .select({
          name: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          position: committeeMembers.position,
          department: employees.department,
        })
        .from(committeeMembers)
        .leftJoin(employees, sql`${committeeMembers.employeeId} = ${employees.id}`);

      if (!members || members.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No hay miembros del comité registrados. Agregue miembros primero.",
        });
      }

      // Generate folio
      const folio = `BASES-FUNC-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

      // Generate PDF
      const pdfBuffer = await generateOperatingRulesPDF({
        companyName: company.razonSocial || "Empresa",
        companyRFC: company.rfc || "",
        companyAddress: company.direccionFiscal || "",
        approvalDate: input.approvalDate,
        approvalPlace: input.approvalPlace,
        members: members.map(m => ({
          name: m.name || "Sin nombre",
          position: m.position || "Sin cargo",
          department: m.department || "Sin departamento",
        })),
        logoUrl,
        folio,
      });

      // Upload PDF to S3
      const { url: pdfUrl, key: pdfKey } = await storagePut(
        `committee-documents/operating-rules-${folio}.pdf`,
        pdfBuffer,
        "application/pdf"
      );

      // Register evidence automatically
      await logOperatingRulesEvidence(folio, pdfUrl, pdfKey, ctx.user.id);

      return {
        success: true,
        pdfUrl,
        pdfKey,
        folio,
      };
    }),
});
