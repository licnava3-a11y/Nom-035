/**
 * Router: dc3RemoteSign
 * Gestión de tokens de firma remota para constancias DC-3.
 *
 * Flujo:
 *  1. Admin/usuario autenticado llama createToken → recibe URL única de firma
 *  2. Firmante abre la URL en su dispositivo (sin login) → ve los datos del registro
 *  3. Firmante dibuja su firma en el canvas y envía → submitSignature guarda en S3
 *     y marca el token como usado
 */
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { dc3RemoteSignTokens, dc3Records } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import { randomUUID } from "crypto";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  instructor: "Instructor o Tutor",
  employer: "Patrón o Representante Legal",
  workerRep: "Representante de los Trabajadores",
};

// ─── Router ───────────────────────────────────────────────────────────────────

export const dc3RemoteSignRouter = router({
  // ─── Crear token de firma remota ────────────────────────────────────────────
  createToken: protectedProcedure
    .input(
      z.object({
        dc3RecordId: z.number().int(),
        role: z.enum(["instructor", "employer", "workerRep"]),
        signerName: z.string().min(1).max(255).optional(),
        signerEmail: z.string().email().optional(),
        // Horas de expiración: 1–168 (1 hora a 7 días). Default: 72 horas.
        expiresInHours: z.number().int().min(1).max(168).default(72),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      // Verificar que el registro DC-3 existe
      const [record] = await db
        .select({
          id: dc3Records.id,
          workerName: dc3Records.workerName,
          courseName: dc3Records.courseName,
          companyName: dc3Records.companyName,
          status: dc3Records.status,
        })
        .from(dc3Records)
        .where(eq(dc3Records.id, input.dc3RecordId));

      if (!record)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registro DC-3 no encontrado",
        });
      if (record.status === "cancelled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No se puede solicitar firma en una constancia cancelada",
        });
      }

      // Generar token UUID v4
      const token = randomUUID();
      const expiresAt = new Date(
        Date.now() + input.expiresInHours * 60 * 60 * 1000
      );

      await db.insert(dc3RemoteSignTokens).values({
        dc3RecordId: input.dc3RecordId,
        role: input.role,
        token,
        signerName: input.signerName ?? null,
        signerEmail: input.signerEmail ?? null,
        expiresAt,
        createdBy: ctx.user.id,
      });

      const appUrl =
        process.env.APP_PUBLIC_URL ?? "https://nom035mood-32dy4ksx.manus.space";
      const signUrl = `${appUrl}/firmar-dc3/${token}`;

      return {
        token,
        signUrl,
        expiresAt,
        roleLabel: ROLE_LABELS[input.role] ?? input.role,
        record: {
          id: record.id,
          workerName: record.workerName,
          courseName: record.courseName,
          companyName: record.companyName,
        },
      };
    }),

  // ─── Obtener datos del token (página pública de firma) ──────────────────────
  getToken: publicProcedure
    .input(z.object({ token: z.string().uuid() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      const [tokenRow] = await db
        .select()
        .from(dc3RemoteSignTokens)
        .where(eq(dc3RemoteSignTokens.token, input.token));

      if (!tokenRow) return { status: "not_found" as const };
      if (tokenRow.usedAt)
        return { status: "used" as const, usedAt: tokenRow.usedAt };
      if (new Date() > tokenRow.expiresAt)
        return { status: "expired" as const, expiresAt: tokenRow.expiresAt };

      // Obtener datos del registro DC-3
      const [record] = await db
        .select({
          id: dc3Records.id,
          workerName: dc3Records.workerName,
          workerCurp: dc3Records.workerCurp,
          companyName: dc3Records.companyName,
          courseName: dc3Records.courseName,
          courseDurationHours: dc3Records.courseDurationHours,
          periodStartDate: dc3Records.periodStartDate,
          periodEndDate: dc3Records.periodEndDate,
          thematicAreaKey: dc3Records.thematicAreaKey,
          thematicAreaDesc: dc3Records.thematicAreaDesc,
          instructorName: dc3Records.instructorName,
          employerRepName: dc3Records.employerRepName,
          workerRepName: dc3Records.workerRepName,
          folioNumber: dc3Records.folioNumber,
          status: dc3Records.status,
        })
        .from(dc3Records)
        .where(eq(dc3Records.id, tokenRow.dc3RecordId));

      if (!record) return { status: "not_found" as const };

      return {
        status: "valid" as const,
        token: {
          id: tokenRow.id,
          role: tokenRow.role,
          roleLabel: ROLE_LABELS[tokenRow.role] ?? tokenRow.role,
          signerName: tokenRow.signerName,
          signerEmail: tokenRow.signerEmail,
          expiresAt: tokenRow.expiresAt,
        },
        record,
      };
    }),

  // ─── Enviar firma (desde la página pública) ─────────────────────────────────
  submitSignature: publicProcedure
    .input(
      z.object({
        token: z.string().uuid(),
        // Firma en formato data URL base64 (image/png)
        signatureDataUrl: z.string().min(100).max(500_000),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      // Verificar token
      const [tokenRow] = await db
        .select()
        .from(dc3RemoteSignTokens)
        .where(
          and(
            eq(dc3RemoteSignTokens.token, input.token),
            gt(dc3RemoteSignTokens.expiresAt, new Date())
          )
        );

      if (!tokenRow) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Token inválido o expirado",
        });
      }
      if (tokenRow.usedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este enlace de firma ya fue utilizado",
        });
      }

      // Decodificar base64 y subir a S3
      const base64Data = input.signatureDataUrl.replace(
        /^data:image\/\w+;base64,/,
        ""
      );
      const signatureBuffer = Buffer.from(base64Data, "base64");
      const fileKey = `dc3-remote-signatures/${tokenRow.dc3RecordId}-${tokenRow.role}-${Date.now()}.png`;
      const { url: signatureUrl } = await storagePut(
        fileKey,
        signatureBuffer,
        "image/png"
      );

      // Actualizar el registro DC-3 con la URL de la firma
      const updateData: Record<string, string | Date | null> = {
        signaturesUpdatedAt: new Date(),
      };
      if (tokenRow.role === "instructor") {
        updateData.instructorSignatureUrl = signatureUrl;
        updateData.instructorSignatureKey = fileKey;
      } else if (tokenRow.role === "employer") {
        updateData.employerSignatureUrl = signatureUrl;
        updateData.employerSignatureKey = fileKey;
      } else {
        updateData.workerRepSignatureUrl = signatureUrl;
        updateData.workerRepSignatureKey = fileKey;
      }
      await db
        .update(dc3Records)
        .set(updateData as any)
        .where(eq(dc3Records.id, tokenRow.dc3RecordId));

      // Marcar el token como usado
      await db
        .update(dc3RemoteSignTokens)
        .set({ usedAt: new Date() })
        .where(eq(dc3RemoteSignTokens.id, tokenRow.id));

      return {
        success: true,
        role: tokenRow.role,
        roleLabel: ROLE_LABELS[tokenRow.role] ?? tokenRow.role,
        signatureUrl,
      };
    }),

  // ─── Listar tokens activos de un registro DC-3 ──────────────────────────────
  listTokens: protectedProcedure
    .input(z.object({ dc3RecordId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      const tokens = await db
        .select({
          id: dc3RemoteSignTokens.id,
          role: dc3RemoteSignTokens.role,
          signerName: dc3RemoteSignTokens.signerName,
          signerEmail: dc3RemoteSignTokens.signerEmail,
          expiresAt: dc3RemoteSignTokens.expiresAt,
          usedAt: dc3RemoteSignTokens.usedAt,
          createdAt: dc3RemoteSignTokens.createdAt,
        })
        .from(dc3RemoteSignTokens)
        .where(eq(dc3RemoteSignTokens.dc3RecordId, input.dc3RecordId))
        .orderBy(dc3RemoteSignTokens.createdAt);

      const appUrl =
        process.env.APP_PUBLIC_URL ?? "https://nom035mood-32dy4ksx.manus.space";

      return tokens.map(t => ({
        ...t,
        roleLabel: ROLE_LABELS[t.role] ?? t.role,
        signUrl: `${appUrl}/firmar-dc3/${t.id}`, // El token real no se expone aquí
        isExpired: new Date() > t.expiresAt,
        isUsed: !!t.usedAt,
      }));
    }),

  // ─── Renovar token expirado o usado (Reenviar enlace) ────────────────────────────────────────
  renewToken: protectedProcedure
    .input(
      z.object({
        // ID del token anterior (no el UUID, sino el PK de la tabla)
        tokenId: z.number().int(),
        // Nuevo correo del firmante (opcional — si se omite, se conserva el anterior)
        signerEmail: z.string().email().optional(),
        // Nuevo nombre del firmante (opcional)
        signerName: z.string().min(1).max(255).optional(),
        // Horas de expiración del nuevo token. Default: 72 h.
        expiresInHours: z.number().int().min(1).max(168).default(72),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "DB no disponible",
        });

      // Obtener el token anterior
      const [oldToken] = await db
        .select()
        .from(dc3RemoteSignTokens)
        .where(eq(dc3RemoteSignTokens.id, input.tokenId));

      if (!oldToken)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Token no encontrado",
        });

      // Solo se puede renovar si está expirado o ya fue usado
      const isExpired = new Date() > oldToken.expiresAt;
      const isUsed = !!oldToken.usedAt;
      if (!isExpired && !isUsed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "El token aún es válido. Solo se puede renovar un token expirado o ya utilizado.",
        });
      }

      // Verificar que el registro DC-3 no esté cancelado
      const [record] = await db
        .select({
          id: dc3Records.id,
          workerName: dc3Records.workerName,
          courseName: dc3Records.courseName,
          companyName: dc3Records.companyName,
          status: dc3Records.status,
        })
        .from(dc3Records)
        .where(eq(dc3Records.id, oldToken.dc3RecordId));

      if (!record)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Registro DC-3 no encontrado",
        });
      if (record.status === "cancelled") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No se puede renovar firma en una constancia cancelada",
        });
      }

      // Generar nuevo token
      const newToken = randomUUID();
      const expiresAt = new Date(
        Date.now() + input.expiresInHours * 60 * 60 * 1000
      );

      // Conservar datos del firmante del token anterior si no se proporcionan nuevos
      const signerName = input.signerName ?? oldToken.signerName ?? undefined;
      const signerEmail =
        input.signerEmail ?? oldToken.signerEmail ?? undefined;

      await db.insert(dc3RemoteSignTokens).values({
        dc3RecordId: oldToken.dc3RecordId,
        role: oldToken.role,
        token: newToken,
        signerName: signerName ?? null,
        signerEmail: signerEmail ?? null,
        expiresAt,
        createdBy: ctx.user.id,
      });

      const appUrl =
        process.env.APP_PUBLIC_URL ?? "https://nom035mood-32dy4ksx.manus.space";
      const signUrl = `${appUrl}/firmar-dc3/${newToken}`;

      return {
        token: newToken,
        signUrl,
        expiresAt,
        roleLabel: ROLE_LABELS[oldToken.role] ?? oldToken.role,
        signerName: signerName ?? null,
        signerEmail: signerEmail ?? null,
        record: {
          id: record.id,
          workerName: record.workerName,
          courseName: record.courseName,
          companyName: record.companyName,
        },
      };
    }),
});
