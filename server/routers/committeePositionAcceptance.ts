import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { committeePositionAcceptances, committeeMembers, employees, companyGeneralData, companyLogo, companyDigitalSignature, departments } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import { generatePositionAcceptancePDF } from "../pdfGenerators/committeePositionAcceptance";

const positionEnum = z.enum(["president", "secretary", "vocal", "alternate", "advisor"]);

export const committeePositionAcceptanceRouter = router({
  /**
   * Create position acceptance
   */
  create: protectedProcedure
    .input(
      z.object({
        committeeMemberId: z.number(),
        positionType: positionEnum,
        inePhotoBase64: z.string(),
        signatureBase64: z.string(),
        responsibilities: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Upload INE photo to S3
      const ineBuffer = Buffer.from(input.inePhotoBase64.split(",")[1], "base64");
      const ineKey = `committee/acceptances/ine-${input.committeeMemberId}-${Date.now()}.jpg`;
      const { url: ineUrl } = await storagePut(ineKey, ineBuffer, "image/jpeg");

      // Upload signature to S3
      const signatureBuffer = Buffer.from(input.signatureBase64.split(",")[1], "base64");
      const signatureKey = `committee/acceptances/signature-${input.committeeMemberId}-${Date.now()}.png`;
      const { url: signatureUrl } = await storagePut(signatureKey, signatureBuffer, "image/png");

      // Create acceptance record
      const [result] = await (db.insert(committeePositionAcceptances) as any).values({
        committeeMemberId: input.committeeMemberId,
        positionType: input.positionType,
        inePhotoUrl: ineUrl,
        inePhotoKey: ineKey,
        acceptanceDate: new Date(),
        signatureUrl: signatureUrl,
        signatureKey: signatureKey,
        responsibilities: input.responsibilities,
        status: "accepted",
      });

      const acceptanceId = Number(result.insertId);

      return { success: true, id: acceptanceId };
    }),

  /**
   * Generate PDF for position acceptance
   */
  generatePDF: protectedProcedure
    .input(z.object({ acceptanceId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      // Get acceptance data with member and employee info
      const [acceptance] = await db
        .select()
        .from(committeePositionAcceptances)
        .where(eq(committeePositionAcceptances.id, input.acceptanceId));

      if (!acceptance) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Acceptance not found" });
      }

      const [member] = await db
        .select()
        .from(committeeMembers)
        .where(eq(committeeMembers.id, acceptance.committeeMemberId));

      if (!member) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Committee member not found" });
      }

      const [employee] = await db
        .select({
          id: employees.id,
          firstName: employees.firstName,
          lastName: employees.lastName,
          employeeNumber: employees.employeeNumber,
          departmentName: departments.name,
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(sql`${employees.id} = ${member.employeeId}`);

      if (!employee) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Employee not found" });
      }

      // Get company info
      const [company] = await db.select().from(companyGeneralData);
      const [logo] = await db.select().from(companyLogo).limit(1);
      const [legalRep] = await db.select().from(companyDigitalSignature).limit(1);

      // Generate PDF
      const pdfBuffer = await generatePositionAcceptancePDF(
        {
          fullName: `${employee.firstName} ${employee.lastName}`,
          employeeNumber: employee.employeeNumber || "N/A",
          position: acceptance.positionType,
          department: employee.departmentName || "N/A",
          inePhotoUrl: acceptance.inePhotoUrl || undefined,
          signatureUrl: acceptance.signatureUrl || undefined,
          acceptanceDate: new Date(acceptance.acceptanceDate),
        },
        {
          name: company?.razonSocial || "Empresa",
          logoUrl: logo?.logoUrl || undefined,
          legalRepName: legalRep?.nombreFirmante || undefined,
          legalRepSignatureUrl: legalRep?.firmaUrl || undefined,
        },
        acceptance.id
      );

      // Upload PDF to S3
      const pdfKey = `committee/acceptances/acceptance-${acceptance.id}-${Date.now()}.pdf`;
      const { url: pdfUrl } = await storagePut(pdfKey, pdfBuffer, "application/pdf");

      // Update acceptance record with PDF info
      await db
        .update(committeePositionAcceptances)
        .set({ pdfUrl, pdfKey } as any)
        .where(eq(committeePositionAcceptances.id, acceptance.id));

      return { success: true, pdfUrl };
    }),

  /**
   * List all acceptances
   */
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

    const acceptances = await db
      .select()
      .from(committeePositionAcceptances);

    // Enrich with member data
    const enrichedAcceptances = await Promise.all(
      acceptances.map(async (acceptance: any) => {
        const [member] = await db
          .select()
          .from(committeeMembers)
          .where(eq(committeeMembers.id, acceptance.committeeMemberId))
          .limit(1);

        if (!member || !member.employeeId) {
          return {
            ...acceptance,
            memberName: "N/A",
            employeeNumber: "N/A",
          };
        }

        const [employee] = await db
          .select()
          .from(employees)
          .where(sql`${employees.id} = ${member.employeeId}`)
          .limit(1);

        return {
          ...acceptance,
          memberName: employee ? `${employee.firstName} ${employee.lastName}` : "N/A",
          employeeNumber: employee?.employeeNumber || "N/A",
        };
      })
    );

    return enrichedAcceptances;
  }),

  /**
   * Get acceptance by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      const [acceptance] = await db
        .select()
        .from(committeePositionAcceptances)
        .where(eq(committeePositionAcceptances.id, input.id));

      if (!acceptance) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Acceptance not found" });
      }

      return acceptance;
    }),

  /**
   * Delete acceptance
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden eliminar aceptaciones",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

      await db.delete(committeePositionAcceptances).where(eq(committeePositionAcceptances.id, input.id));

      return { success: true };
    }),

  /**
   * List committee members for selection
   */
  listMembers: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

    const members = await db
      .select({
        id: committeeMembers.id,
        employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
        position: committeeMembers.position,
      })
      .from(committeeMembers)
      .leftJoin(employees, sql`${committeeMembers.employeeId} = ${employees.id}`);

    return members;
  }),
});
