import { useState, useEffect, useCallback } from "react";

export type NotificationPermission = "default" | "granted" | "denied";

interface BrowserNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
}

/**
 * Hook para gestionar notificaciones del navegador (Browser Notifications API)
 */
export function useBrowserNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    // Verificar si el navegador soporta notificaciones
    if ("Notification" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    } else {
      setIsSupported(false);
      console.warn("[BrowserNotifications] El navegador no soporta notificaciones");
    }
  }, []);

  /**
   * Solicita permiso al usuario para mostrar notificaciones
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn("[BrowserNotifications] Notificaciones no soportadas");
      return "denied";
    }

    if (permission === "granted") {
      return "granted";
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error("[BrowserNotifications] Error al solicitar permiso:", error);
      return "denied";
    }
  }, [isSupported, permission]);

  /**
   * Muestra una notificación del navegador
   */
  const showNotification = useCallback(
    (options: BrowserNotificationOptions) => {
      if (!isSupported) {
        console.warn("[BrowserNotifications] Notificaciones no soportadas");
        return null;
      }

      if (permission !== "granted") {
        console.warn("[BrowserNotifications] Permiso no otorgado");
        return null;
      }

      try {
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || "/favicon.ico",
          tag: options.tag,
          requireInteraction: options.requireInteraction || false,
          silent: options.silent || false,
        });

        // Auto-cerrar después de 5 segundos si no requiere interacción
        if (!options.requireInteraction) {
          setTimeout(() => {
            notification.close();
          }, 5000);
        }

        return notification;
      } catch (error) {
        console.error("[BrowserNotifications] Error al mostrar notificación:", error);
        return null;
      }
    },
    [isSupported, permission]
  );

  /**
   * Verifica si se debe mostrar notificación según el tipo
   */
  const shouldNotify = useCallback((type: string): boolean => {
    // Tipos críticos que siempre deben notificar
    const criticalTypes = [
      "new_case",
      "case_assigned",
      "deadline_approaching",
      "new_mailbox_request",
      "employee_termination",
      "survey_expiring",
    ];

    return criticalTypes.includes(type);
  }, []);

  return {
    permission,
    isSupported,
    requestPermission,
    showNotification,
    shouldNotify,
  };
}
