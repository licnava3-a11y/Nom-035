import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, Trash2 } from 'lucide-react';
import ProtectedButton from '@/components/ProtectedButton';

export default function NotificationsDashboard() {
  const [limit, setLimit] = useState(50);
  const [unreadOnly, setUnreadOnly] = useState(false);

  // Queries
  const { data: notifications, isLoading, refetch } = trpc.notifications.getAll.useQuery({
    limit,
    unreadOnly,
  });
  const { data: unreadCount } = trpc.notifications.getUnreadCount.useQuery();

  // Mutations
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const handleMarkAsRead = (id: number) => {
    markAsReadMutation.mutate({ id });
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Está seguro de eliminar esta notificación?')) {
      deleteMutation.mutate({ id });
    }
  };

  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      new_case: { label: 'Nuevo Caso', variant: 'default' },
      case_status_change: { label: 'Cambio de Estado', variant: 'secondary' },
      case_assigned: { label: 'Caso Asignado', variant: 'default' },
      deadline_approaching: { label: 'Fecha Límite', variant: 'destructive' },
      new_mailbox_request: { label: 'Nueva Solicitud', variant: 'default' },
      mailbox_status_change: { label: 'Cambio de Estado', variant: 'secondary' },
      employee_hire: { label: 'Contratación', variant: 'default' },
      employee_termination: { label: 'Baja', variant: 'destructive' },
      department_change: { label: 'Cambio de Departamento', variant: 'secondary' },
      survey_expiring: { label: 'Encuesta por Vencer', variant: 'destructive' },
      training_due: { label: 'Capacitación Pendiente', variant: 'default' },
      system: { label: 'Sistema', variant: 'outline' },
    };

    const config = typeLabels[type] || { label: type, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando notificaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Panel de Notificaciones</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona tus notificaciones del sistema
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="secondary" className="text-lg px-4 py-2">
            <Bell className="w-4 h-4 mr-2" />
            {unreadCount?.count || 0} sin leer
          </Badge>
          {(unreadCount?.count || 0) > 0 && (
            <ProtectedButton 
              onClick={handleMarkAllAsRead} 
              variant="outline"
              requiredPermission="can_edit"
              fallbackMessage="No tienes permisos para marcar notificaciones"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Marcar todas como leídas
            </ProtectedButton>
          )}
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <Button
          variant={unreadOnly ? 'outline' : 'default'}
          onClick={() => setUnreadOnly(false)}
        >
          Todas
        </Button>
        <Button
          variant={unreadOnly ? 'default' : 'outline'}
          onClick={() => setUnreadOnly(true)}
        >
          No leídas
        </Button>
      </div>

      <div className="space-y-4">
        {notifications && notifications.length > 0 ? (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={notification.isRead ? 'opacity-60' : 'border-primary'}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getTypeBadge(notification.type)}
                      {!notification.isRead && (
                        <Badge variant="destructive">Nueva</Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg">{notification.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {notification.message}
                    </CardDescription>
                    <p className="text-sm text-muted-foreground mt-2">
                      {new Date(notification.createdAt).toLocaleString('es-MX', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!notification.isRead && (
                      <ProtectedButton
                        variant="ghost"
                        size="sm"
                        onClick={() => handleMarkAsRead(notification.id)}
                        requiredPermission="can_edit"
                        fallbackMessage="No tienes permisos para marcar notificaciones"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </ProtectedButton>
                    )}
                    <ProtectedButton
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(notification.id)}
                      requiredPermission="can_delete"
                      fallbackMessage="No tienes permisos para eliminar notificaciones"
                    >
                      <Trash2 className="w-4 h-4" />
                    </ProtectedButton>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {unreadOnly
                  ? 'No tienes notificaciones sin leer'
                  : 'No tienes notificaciones'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
