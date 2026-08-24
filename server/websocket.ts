import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";

let io: SocketIOServer | null = null;

/**
 * Inicializa el servidor Socket.IO
 * @param httpServer - Servidor HTTP de Express
 */
export function initializeWebSocket(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === "development"
          ? ["http://localhost:3000", "http://127.0.0.1:3000"]
          : true,
      credentials: true,
    },
    path: "/socket.io/",
  });

  // Middleware de autenticación
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    try {
      const decoded = jwt.verify(token, ENV.cookieSecret) as {
        openId: string;
        name: string;
        email: string;
      };
      socket.data.user = decoded;
      socket.data.userId = decoded.openId;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // Manejo de conexiones
  io.on("connection", socket => {
    const userId = socket.data.userId;
    console.log(`[WebSocket] Usuario conectado: ${userId}`);

    // Unir al usuario a su room personal
    socket.join(`user:${userId}`);

    // Manejo de desconexión
    socket.on("disconnect", () => {
      console.log(`[WebSocket] Usuario desconectado: ${userId}`);
    });

    // Evento de prueba para verificar conexión
    socket.on("ping", () => {
      socket.emit("pong", { timestamp: Date.now() });
    });
  });

  console.log("[WebSocket] Servidor Socket.IO inicializado");
  return io;
}

/**
 * Obtiene la instancia del servidor Socket.IO
 */
export function getIO(): SocketIOServer {
  if (!io) {
    throw new Error(
      "Socket.IO no ha sido inicializado. Llama a initializeWebSocket primero."
    );
  }
  return io;
}

/**
 * Emite una notificación a un usuario específico
 * @param userId - ID del usuario destinatario
 * @param notification - Objeto de notificación
 */
export function emitNotification(
  userId: string,
  notification: {
    id: number;
    type: string;
    title: string;
    message: string;
    relatedEntityType?: string | null;
    relatedEntityId?: number | null;
    createdAt: Date;
  }
) {
  if (!io) {
    console.warn(
      "[WebSocket] Socket.IO no inicializado, no se puede emitir notificación"
    );
    return;
  }

  io.to(`user:${userId}`).emit("notification", notification);
  console.log(
    `[WebSocket] Notificación enviada a usuario ${userId}:`,
    notification.title
  );
}

/**
 * Emite una notificación a todos los usuarios conectados (broadcast)
 * @param notification - Objeto de notificación
 */
export function emitBroadcastNotification(notification: {
  id: number;
  type: string;
  title: string;
  message: string;
  relatedEntityType?: string | null;
  relatedEntityId?: number | null;
  createdAt: Date;
}) {
  if (!io) {
    console.warn(
      "[WebSocket] Socket.IO no inicializado, no se puede emitir notificación broadcast"
    );
    return;
  }

  io.emit("notification", notification);
  console.log(
    `[WebSocket] Notificación broadcast enviada:`,
    notification.title
  );
}

/**
 * Emite un evento personalizado a un usuario específico
 * @param userId - ID del usuario destinatario
 * @param event - Nombre del evento
 * @param data - Datos del evento
 */
export function emitToUser(userId: string, event: string, data: any) {
  if (!io) {
    console.warn("[WebSocket] Socket.IO no inicializado");
    return;
  }

  io.to(`user:${userId}`).emit(event, data);
}

/**
 * Obtiene el número de usuarios conectados
 */
export async function getConnectedUsersCount(): Promise<number> {
  if (!io) {
    return 0;
  }

  const sockets = await io.fetchSockets();
  return sockets.length;
}
