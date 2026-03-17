import { Bell, Check, CheckCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import ProtectedButton from "@/components/ProtectedButton";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Notifications() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  
  const { data: notifications = [], isLoading } = trpc.notifications.getAll.useQuery({ limit: 100 });
  
  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getAll.invalidate();
      utils.notifications.getUnreadCount.invalidate();
      toast.success("Notificación marcada como leída");
    },
  });
  
  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsRead.mutate({ id: notification.id });
    }
    
    // Navigate to related entity
    if (notification.relatedEntityType === "case" && notification.relatedEntityId) {
      setLocation(`/cases/${notification.relatedEntityId}`);
    } else if (notification.relatedEntityType === "mailbox" && notification.relatedEntityId) {
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
  
  const getNotificationTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      new_case: "Nuevo Caso",
      case_status_change: "Cambio de Estado",
      case_assigned: "Caso Asignado",
      deadline_approaching: "Plazo Próximo",
      new_mailbox_request: "Nueva Solicitud",
      mailbox_status_change: "Cambio en Buzón",
      system: "Sistema",
    };
    return labels[type] || type;
  };
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("es-MX", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  const unreadNotifications = notifications.filter((n: any) => !n.isRead);
  const readNotifications = notifications.filter((n: any) => n.isRead);
  
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando notificaciones...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notificaciones</h1>
          <p className="text-muted-foreground">
            Mantente al día con las actualizaciones del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">
            {unreadNotifications.length} sin leer
          </Badge>
        </div>
      </div>
      
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No hay notificaciones</p>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Cuando recibas notificaciones sobre casos, solicitudes o actualizaciones del sistema, aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {unreadNotifications.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Sin leer</h2>
                <Badge>{unreadNotifications.length}</Badge>
              </div>
              {unreadNotifications.map((notification: any) => (
                <Card 
                  key={notification.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors border-l-4 border-l-blue-500"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="text-2xl mt-1">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <CardTitle className="text-base">{notification.title}</CardTitle>
                            <Badge variant="outline" className="text-xs">
                              {getNotificationTypeLabel(notification.type)}
                            </Badge>
                          </div>
                          <CardDescription>{notification.message}</CardDescription>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDate(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                      <ProtectedButton
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead.mutate({ id: notification.id });
                        }}
                        requiredPermission="can_edit"
                        fallbackMessage="No tienes permisos para marcar notificaciones como leídas"
                      >
                        <Check className="h-4 w-4" />
                      </ProtectedButton>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
          
          {readNotifications.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">Leídas</h2>
                <CheckCheck className="h-5 w-5 text-muted-foreground" />
              </div>
              {readNotifications.map((notification: any) => (
                <Card 
                  key={notification.id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors opacity-70"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl mt-1">{getNotificationIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CardTitle className="text-base">{notification.title}</CardTitle>
                          <Badge variant="outline" className="text-xs">
                            {getNotificationTypeLabel(notification.type)}
                          </Badge>
                        </div>
                        <CardDescription>{notification.message}</CardDescription>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
