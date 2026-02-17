import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Bell, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ITEMS_PER_PAGE = 20;

export default function NotificationHistory() {
  const [priority, setPriority] = useState<"info" | "warning" | "critical" | undefined>();
  const [currentPage, setCurrentPage] = useState(1);

  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const { data: notifications, isLoading } = trpc.notificationHistory.getHistory.useQuery({
    priority,
    limit: ITEMS_PER_PAGE,
    offset,
  });

  const { data: totalCount } = trpc.notificationHistory.getCount.useQuery({
    priority,
  });

  const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge variant="destructive">Crítica</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Advertencia</Badge>;
      case "info":
        return <Badge variant="secondary">Información</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case "critical_cases":
        return "Casos Críticos";
      case "low_coverage":
        return "Cobertura Baja";
      case "excellent_compliance":
        return "Cumplimiento Excelente";
      default:
        return type;
    }
  };

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <Breadcrumb
        items={[
          { label: "Administración", href: "/admin" },
          { label: "Historial de Notificaciones Push" },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-8 w-8" />
          Historial de Notificaciones Push
        </h1>
        <p className="text-muted-foreground mt-2">
          Registro completo de notificaciones enviadas en tiempo real para auditoría NOM-035
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridad</label>
              <Select
                value={priority || "all"}
                onValueChange={(value) => {
                  setPriority(value === "all" ? undefined : (value as "info" | "warning" | "critical"));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas las prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las prioridades</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                  <SelectItem value="warning">Advertencia</SelectItem>
                  <SelectItem value="info">Información</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de notificaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones Enviadas</CardTitle>
          <CardDescription>
            Total: {totalCount || 0} notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          {notifications && notifications.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">ID</th>
                      <th className="text-left p-2">Fecha/Hora</th>
                      <th className="text-left p-2">Tipo</th>
                      <th className="text-left p-2">Prioridad</th>
                      <th className="text-left p-2">Descripción</th>
                      <th className="text-right p-2">Valor Actual</th>
                      <th className="text-right p-2">Umbral</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notifications.map((notification) => (
                      <tr key={notification.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-mono text-sm">{notification.id}</td>
                        <td className="p-2 text-sm">
                          {new Date(notification.sentAt).toLocaleString("es-MX", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="p-2 text-sm">{getAlertTypeLabel(notification.alertType)}</td>
                        <td className="p-2">{getPriorityBadge(notification.priority)}</td>
                        <td className="p-2 text-sm max-w-md truncate" title={notification.description}>
                          {notification.description}
                        </td>
                        <td className="p-2 text-right font-semibold">{notification.currentValue}</td>
                        <td className="p-2 text-right text-muted-foreground">{notification.threshold}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron notificaciones con los filtros seleccionados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
