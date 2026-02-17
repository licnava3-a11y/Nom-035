/**
 * Hook useNotifications
 * Gestiona conexión WebSocket y notificaciones en tiempo real
 */

import { useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  relatedEntityType?: string;
  relatedEntityId?: number;
}

export interface CriticalAlert {
  id: number;
  category: string;
  priority: string;
  title: string;
  message: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Conectar al servidor WebSocket
  useEffect(() => {
    if (!user) {
      return;
    }

    // Crear conexión WebSocket
    const socketInstance = io(window.location.origin, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      console.log("[WebSocket] Conectado al servidor");
      setIsConnected(true);

      // Unirse a sala de usuario específico
      if (user.id) {
        socketInstance.emit("join-user-room", user.id);
      }

      // Si es admin, unirse a sala de administradores
      if (user.role === "admin") {
        socketInstance.emit("join-admin-room");
      }
    });

    socketInstance.on("disconnect", () => {
      console.log("[WebSocket] Desconectado del servidor");
      setIsConnected(false);
    });

    // Escuchar nuevas notificaciones
    socketInstance.on("new-notification", (notification: Notification) => {
      console.log("[WebSocket] Nueva notificación recibida:", notification);
      
      // Agregar a lista de notificaciones
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Mostrar toast
      toast.info(notification.title, {
        description: notification.message,
        duration: 5000,
      });
    });

    // Escuchar alertas críticas (solo admins)
    socketInstance.on("critical-alert", (alert: CriticalAlert) => {
      console.log("[WebSocket] Alerta crítica recibida:", alert);

      // Mostrar toast con prioridad alta
      toast.error(alert.title, {
        description: alert.message,
        duration: 10000,
      });
    });

    setSocket(socketInstance);

    // Cleanup al desmontar
    return () => {
      socketInstance.disconnect();
    };
  }, [user]);

  // Marcar notificación como leída
  const markAsRead = useCallback((notificationId: number) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
    setUnreadCount(0);
  }, []);

  // Limpiar notificaciones
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return {
    socket,
    isConnected,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
  };
}
