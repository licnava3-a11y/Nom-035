import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, publicProcedure, router } from "./trpc";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),

  // Endpoint para notificar al administrador cuando el respaldo semanal a Google Drive se completa.
  // Puede ser llamado desde el script de respaldo sin autenticación de usuario (usa API key interna).
  backupCompleted: publicProcedure
    .input(
      z.object({
        fileName: z.string().min(1, "fileName is required"),
        fileUrl: z.string().url("fileUrl must be a valid URL"),
        fileSizeMB: z.number().positive("fileSizeMB must be positive"),
        apiKey: z.string().min(1, "apiKey is required"),
      })
    )
    .mutation(async ({ input }) => {
      // Validar API key interna para evitar llamadas no autorizadas
      const expectedKey = process.env.BUILT_IN_FORGE_API_KEY ?? '';
      if (!expectedKey || input.apiKey !== expectedKey) {
        return { success: false, error: 'Unauthorized' } as const;
      }
      const date = new Date().toLocaleDateString('es-MX', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        timeZone: 'America/Mexico_City',
      });
      const delivered = await notifyOwner({
        title: `✅ Respaldo semanal NOM-035 completado — ${date}`,
        content: `El respaldo automático del proyecto NOM-035 fue subido exitosamente a Google Drive.\n\n📁 Archivo: ${input.fileName}\n📦 Tamaño: ${input.fileSizeMB.toFixed(1)} MB\n🔗 Enlace: ${input.fileUrl}\n\nEl próximo respaldo se realizará el próximo lunes a las 9:00 AM (hora Ciudad de México).`,
      });
      return { success: delivered } as const;
    }),
});
