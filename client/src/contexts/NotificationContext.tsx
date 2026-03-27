/**
 * NotificationContext
 * Proveedor de contexto para notificaciones en tiempo real
 */

import { createContext, useContext, ReactNode } from "react";
import { useNotifications } from "@/hooks/useNotifications"
type Notification = any;
import type { Socket } from "socket.io-client";

interface NotificationContextValue {
  socket: Socket | null;
  
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: number) => void;
  markAllAsRead: () => void;
  
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const notificationData = useNotifications();

  return (
    <NotificationContext.Provider value={notificationData}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotificationContext must be used within NotificationProvider");
  }
  return context;
}
