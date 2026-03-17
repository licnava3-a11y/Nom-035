import { useState, useEffect, useCallback } from "react";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useSocket } from "@/hooks/useSocket";
import { getAuthToken } from "@/lib/cookies";
import { useAuth } from "@/_core/hooks/useAuth";
import { useBrowserNotifications } from "@/hooks/useBrowserNotifications";

type Notification = {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  isRead: boolean;
  createdAt: Date;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  
  // Obtener token JWT de cookies
  useEffect(() => {
    if (isAuthenticated) {
      const authToken = getAuthToken();
      setToken(authToken);
    }
  }, [isAuthenticated]);
  
  // Queries (sin polling, se actualizará vía WebSocket)
  const { data: unreadData, refetch: refetchUnread } = trpc.notifications.getUnreadCount.useQuery(undefined, {
    refetchInterval: false, // Deshabilitado: usamos WebSocket
  });
  
  const { data: notifications, refetch: refetchNotifications } = trpc.notifications.getAll.useQuery(
    { limit: 20, unreadOnly: false },
    { enabled: open }
  );

  // Mutations
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetchUnread();
      refetchNotifications();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetchUnread();
      refetchNotifications();
    },
  });

  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      refetchUnread();
      refetchNotifications();
    },
  });

  // Browser Notifications
  const { permission, showNotification, shouldNotify, requestPermission } = useBrowserNotifications();

  // Solicitar permiso de notificaciones al montar (solo si está autenticado)
  useEffect(() => {
    if (isAuthenticated && permission === "default") {
      // Esperar 2 segundos antes de solicitar para no ser intrusivo
      const timer = setTimeout(() => {
        requestPermission();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, permission, requestPermission]);

  // Callback para notificaciones en tiempo real
  const handleNewNotification = useCallback((notification: any) => {
    console.log("[NotificationBell] Nueva notificación recibida:", notification);
    
    // Mostrar notificación del navegador si es crítica
    if (shouldNotify(notification.type)) {
      showNotification({
        title: notification.title,
        body: notification.message,
        tag: `notification-${notification.id}`,
        requireInteraction: notification.type === "deadline_approaching",
      });
    }
    
    // Refrescar contadores y lista
    refetchUnread();
    if (open) {
      refetchNotifications();
    }
  }, [refetchUnread, refetchNotifications, open, shouldNotify, showNotification]);

  // Conectar WebSocket
  const { isConnected } = useSocket(token, {
    onNotification: handleNewNotification,
    onConnect: () => console.log("[NotificationBell] WebSocket conectado"),
    onDisconnect: () => console.log("[NotificationBell] WebSocket desconectado"),
  });

  const unreadCount = unreadData?.count || 0;

  const handleMarkAsRead = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsReadMutation.mutate({ id });
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMutation.mutate({ id });
  };

  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, string> = {
      employee_hire: "👤",
      employee_termination: "🚪",
      department_change: "🏢",
      survey_expiring: "📋",
      training_due: "📚",
      deadline_approaching: "⏰",
      system: "ℹ️",
    };
    return iconMap[type] || "🔔";
  };

  const getNotificationColor = (type: string) => {
    const colorMap: Record<string, string> = {
      employee_hire: "text-green-600",
      employee_termination: "text-red-600",
      department_change: "text-blue-600",
      survey_expiring: "text-orange-600",
      training_due: "text-purple-600",
      deadline_approaching: "text-yellow-600",
      system: "text-gray-600",
    };
    return colorMap[type] || "text-gray-600";
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="h-auto p-1 text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Marcar todas como leídas
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {!notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No hay notificaciones</p>
            </div>
          ) : (
            notifications.map((notification: any) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-4 cursor-pointer ${
                  !notification.isRead ? "bg-blue-50 dark:bg-blue-950" : ""
                }`}
                onSelect={(e) => e.preventDefault()}
              >
                <div className="flex items-start justify-between w-full">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-2xl">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-sm font-semibold truncate">
                          {notification.title}
                        </h4>
                        {!notification.isRead && (
                          <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {notification.message}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => handleMarkAsRead(notification.id, e)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={(e) => handleDelete(notification.id, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
