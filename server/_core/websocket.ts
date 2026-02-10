import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { getDb } from "../db";
import { notificationHistory } from "../../drizzle/schema";

let io: SocketIOServer | null = null;

/**
 * Inicializar servidor WebSocket
 */
export function initializeWebSocket(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*", // En producción, especificar el dominio exacto
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    console.log(`[WebSocket] Cliente conectado: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`[WebSocket] Cliente desconectado: ${socket.id}`);
    });
  });

  console.log("[WebSocket] Servidor inicializado correctamente");
  return io;
}

/**
 * Obtener instancia del servidor WebSocket
 */
export function getWebSocketServer(): SocketIOServer | null {
  return io;
}

/**
 * Emitir notificación de alerta crítica a todos los clientes conectados
 */
export async function emitCriticalAlert(alert: {
  id: number;
  alertType: string;
  description: string;
  priority: string;
  currentValue: number;
  threshold: number;
}) {
  if (!io) {
    console.warn("[WebSocket] Servidor no inicializado, no se puede emitir alerta");
    return;
  }

  // Guardar notificación en BD para historial
  try {
    const db = await getDb();
    if (db) {
      await db.insert(notificationHistory).values({
        alertId: alert.id,
        alertType: alert.alertType as "critical_cases" | "low_coverage" | "excellent_compliance",
        priority: alert.priority as "info" | "warning" | "critical",
        description: alert.description,
        currentValue: alert.currentValue,
        threshold: alert.threshold,
      });
      console.log(`[WebSocket] Notificación guardada en BD: ${alert.id}`);
    }
  } catch (error) {
    console.error("[WebSocket] Error al guardar notificación en BD:", error);
  }

  // Emitir notificación por WebSocket
  io.emit("critical-alert", alert);
  console.log(`[WebSocket] Alerta crítica emitida: ${alert.id}`);
}
