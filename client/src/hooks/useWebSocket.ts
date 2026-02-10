import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

interface CriticalAlert {
  id: number;
  alertType: string;
  description: string;
  priority: string;
  currentValue: number;
  threshold: number;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastAlert, setLastAlert] = useState<CriticalAlert | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Conectar al servidor WebSocket
    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[WebSocket] Conectado al servidor");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("[WebSocket] Desconectado del servidor");
      setIsConnected(false);
    });

    socket.on("critical-alert", (alert: CriticalAlert) => {
      console.log("[WebSocket] Alerta crítica recibida:", alert);
      setLastAlert(alert);
      
      // Mostrar notificación del navegador si está permitido
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("⚠️ Alerta Crítica NOM-035", {
          body: alert.description,
          icon: "/favicon.ico",
          tag: `alert-${alert.id}`,
        });
      }
    });

    // Limpiar al desmontar
    return () => {
      socket.disconnect();
    };
  }, []);

  // Solicitar permiso para notificaciones
  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
    return Notification.permission === "granted";
  };

  return {
    isConnected,
    lastAlert,
    requestNotificationPermission,
  };
}
