import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface UseSocketOptions {
  onNotification?: (notification: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * Hook para gestionar la conexión WebSocket con Socket.IO
 * @param token - Token JWT para autenticación
 * @param options - Opciones de callbacks
 */
export function useSocket(
  token: string | null,
  options: UseSocketOptions = {}
) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // No conectar si no hay token
    if (!token) {
      return;
    }

    // Crear conexión Socket.IO
    const socket = io({
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Event listeners
    socket.on("connect", () => {
      console.log("[WebSocket] Conectado al servidor");
      setIsConnected(true);
      setConnectionError(null);
      options.onConnect?.();
    });

    socket.on("disconnect", reason => {
      console.log("[WebSocket] Desconectado:", reason);
      setIsConnected(false);
      options.onDisconnect?.();
    });

    socket.on("connect_error", error => {
      console.error("[WebSocket] Error de conexión:", error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Listener para notificaciones
    socket.on("notification", notification => {
      console.log("[WebSocket] Notificación recibida:", notification);
      options.onNotification?.(notification);
    });

    // Ping/pong para verificar conexión
    socket.on("pong", data => {
      console.log("[WebSocket] Pong recibido:", data);
    });

    // Cleanup al desmontar
    return () => {
      console.log("[WebSocket] Cerrando conexión");
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, options.onNotification, options.onConnect, options.onDisconnect]);

  /**
   * Envía un ping al servidor para verificar conexión
   */
  const sendPing = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("ping");
    }
  };

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    sendPing,
  };
}
