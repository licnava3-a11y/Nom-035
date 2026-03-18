/**
 * Hook useNotifications
 * Maneja conexión websocket y notificaciones en tiempo real
 */

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../_core/hooks/useAuth";
import { toast } from "sonner";

export interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
}

interface CriticalAlert {
  id: number;
  category: string;
  priority: string;
  title: string;
  message: string;
}

export function useNotifications() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;

    // Conectar a websocket
    const socketUrl = window.location.origin;
    const newSocket = io(socketUrl);

    newSocket.on("connect", () => {
      console.log("[WebSocket] Conectado");
      
      // Unirse a sala de usuario
      newSocket.emit("join-user-room", user.id);
      
      // Si es admin, unirse a sala de administradores
      if (user.role === "admin") {
        newSocket.emit("join-admin-room");
      }
    });

    // Escuchar nuevas notificaciones
    newSocket.on("new-notification", (notification: Notification) => {
      console.log("[WebSocket] Nueva notificación:", notification);
      
      // Agregar a lista
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Mostrar toast
      toast.info(notification.title, {
        description: notification.message,
        duration: 5000,
      });
    });

    // Escuchar alertas críticas (solo admins)
    if (user.role === "admin") {
      newSocket.on("critical-alert", (alert: CriticalAlert) => {
        console.log("[WebSocket] Alerta crítica:", alert);
        
        // Mostrar toast con prioridad alta
        toast.error(alert.title, {
          description: alert.message,
          duration: 10000,
        });
      });
    }

    newSocket.on("disconnect", () => {
      console.log("[WebSocket] Desconectado");
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  const markAsRead = (notificationId: number) => {
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const isConnected = socket?.connected ?? false;
  const clearNotifications = () => setNotifications([]);
  return {
    socket,
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    isConnected,
    clearNotifications,
  };
}
