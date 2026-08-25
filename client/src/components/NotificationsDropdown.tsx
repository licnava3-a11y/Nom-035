import { Bell, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/_core/hooks/useAuth";

export function NotificationsDropdown() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const { isAuthenticated } = useAuth();

  // Integrar websockets para notificaciones en tiempo real
  const { unreadCount: wsUnreadCount } = useNotifications();

  const { data: notifications = [] } = trpc.notifications.getAll.useQuery(
    {},
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      enabled: isAuthenticated, // ANTI-CICLO: no ejecutar sin sesión activa
    }
  );

  const { data: unreadCount = 0 } = trpc.notifications.getUnreadCount.useQuery(
    undefined,
    {
      refetchInterval: 30000,
      enabled: isAuthenticated, // ANTI-CICLO: no ejecutar sin sesión activa
    }
  );

  // Usar contador de websocket si está disponible, sino usar de tRPC
  const displayUnreadCount =
    wsUnreadCount > 0
      ? wsUnreadCount
      : typeof unreadCount === "object"
        ? unreadCount.count
        : 0;

  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getAll.invalidate();
      utils.notifications.getUnreadCount.invalidate();
    },
  });

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsRead.mutate({ id: notification.id });
    }

    // Navigate to related entity
    if (
      notification.relatedEntityType === "case" &&
      notification.relatedEntityId
    ) {
      setLocation(`/cases/${notification.relatedEntityId}`);
    } else if (
      notification.relatedEntityType === "mailbox" &&
      notification.relatedEntityId
    ) {
      setLocation("/mailbox");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "new_case":
      case "case_status_change":
      case "case_assigned":
        return "📋";
      case "new_mailbox_request":
      case "mailbox_status_change":
        return "📬";
      case "deadline_approaching":
        return "⏰";
      default:
        return "🔔";
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - new Date(date).getTime();
    const diffInMinutes = Math.floor(diffInMs / 60000);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return "Ahora mismo";
    if (diffInMinutes < 60) return `Hace ${diffInMinutes} min`;
    if (diffInHours < 24) return `Hace ${diffInHours} h`;
    if (diffInDays < 7) return `Hace ${diffInDays} d`;
    return new Date(date).toLocaleDateString();
  };

  // Mensajes no leídos del buzón interno del usuario
  const { data: myMessages = [] } = trpc.internalMailbox.myMessages.useQuery(
    { limit: 50 },
    {
      refetchInterval: 30000,
      enabled: isAuthenticated, // ANTI-CICLO: no ejecutar sin sesión activa
    }
  );
  const unreadMailboxCount = (myMessages as any[]).filter(
    (m: any) => m.responseBody && !m.responseReadAt
  ).length;

  const recentNotifications = notifications.slice(0, 5);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {displayUnreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {displayUnreadCount > 9 ? "9+" : displayUnreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {displayUnreadCount > 0 && (
            <Badge variant="secondary">{displayUnreadCount} nuevas</Badge>
          )}
        </DropdownMenuLabel>
        {unreadMailboxCount > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center gap-2 p-3 cursor-pointer bg-blue-50 hover:bg-blue-100"
              onClick={() => setLocation("/my-mailbox")}
            >
              <MessageSquare className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-blue-700">
                  {unreadMailboxCount} respuesta
                  {unreadMailboxCount > 1 ? "s" : ""} sin leer
                </p>
                <p className="text-xs text-blue-500">Ver en Mis Mensajes</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        {recentNotifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No hay notificaciones
          </div>
        ) : (
          <>
            {recentNotifications.map((notification: any) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex flex-col items-start p-3 cursor-pointer ${
                  !notification.isRead ? "bg-accent/50" : ""
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-2 w-full">
                  <span className="text-lg">
                    {getNotificationIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-none mb-1">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-center text-sm text-primary cursor-pointer"
              onClick={() => setLocation("/notifications")}
            >
              Ver todas las notificaciones
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
