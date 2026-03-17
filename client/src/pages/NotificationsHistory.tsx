import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, Search, Trash2, Filter, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function NotificationsHistory() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Query para obtener historial paginado
  const { data, isLoading, refetch } = trpc.notifications.getAll.useQuery({
    limit: pageSize * page,
    unreadOnly: false,
  });

  // Stats
  const { data: stats } = trpc.notifications.getUnreadCount.useQuery();

  // Mutations
  const markAsRead = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("La notificación se marcó como leída exitosamente.");
    },
  });

  const markAllAsRead = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Se marcaron todas las notificaciones como leídas.");
    },
  });

  const deleteNotification = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("La notificación se eliminó exitosamente.");
    },
  });

  // Filtrar datos localmente
  const filteredData = data?.filter((n: any) => {
    // Filtro por tipo
    if (typeFilter !== "all" && n.type !== typeFilter) return false;

    // Filtro por estado de lectura
    if (readFilter === "read" && !n.isRead) return false;
    if (readFilter === "unread" && n.isRead) return false;

    // Filtro por texto de búsqueda
    if (searchText.trim() !== "") {
      const search = searchText.toLowerCase();
      if (
        !n.title.toLowerCase().includes(search) &&
        !n.message.toLowerCase().includes(search)
      ) {
        return false;
      }
    }

    // Filtro por rango de fechas
    if (dateFrom && new Date(n.createdAt) < new Date(dateFrom)) return false;
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      if (new Date(n.createdAt) > endDate) return false;
    }

    return true;
  });

  const handleClearFilters = () => {
    setTypeFilter("all");
    setReadFilter("all");
    setSearchText("");
    setDateFrom("");
    setDateTo("");
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      new_case: { variant: "default", label: "Nuevo Caso" },
      case_status_change: { variant: "secondary", label: "Cambio de Estado" },
      case_assigned: { variant: "default", label: "Caso Asignado" },
      deadline_approaching: { variant: "destructive", label: "Fecha Límite" },
      new_mailbox_request: { variant: "default", label: "Nueva Solicitud" },
      mailbox_status_change: { variant: "secondary", label: "Cambio Buzón" },
      employee_hire: { variant: "default", label: "Nueva Contratación" },
      employee_termination: { variant: "destructive", label: "Baja" },
      department_change: { variant: "secondary", label: "Cambio Depto" },
      survey_expiring: { variant: "destructive", label: "Encuesta por Expirar" },
      training_due: { variant: "destructive", label: "Capacitación Pendiente" },
      recognition: { variant: "default", label: "Reconocimiento" },
      system: { variant: "outline", label: "Sistema" },
    };
    return badges[type] || { variant: "outline" as const, label: type };
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Historial de Notificaciones</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona y revisa todas tus notificaciones
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => markAllAsRead.mutate()}
            disabled={markAllAsRead.isPending}
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Marcar Todas como Leídas
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Notificaciones totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Leídas</CardTitle>
            <Bell className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.count || 0}</div>
            <p className="text-xs text-muted-foreground">Pendientes de leer</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leídas</CardTitle>
            <CheckCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(data?.length || 0) - (stats?.count || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Ya revisadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtra las notificaciones por tipo, estado, fecha o texto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Tipo de Notificación</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="new_case">Nuevo Caso</SelectItem>
                  <SelectItem value="case_assigned">Caso Asignado</SelectItem>
                  <SelectItem value="case_status_change">Cambio de Estado</SelectItem>
                  <SelectItem value="survey_expiring">Encuesta por Expirar</SelectItem>
                  <SelectItem value="deadline_approaching">Fecha Límite</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={readFilter} onValueChange={setReadFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="unread">No Leídas</SelectItem>
                  <SelectItem value="read">Leídas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Desde</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Hasta</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Buscar en Título o Mensaje</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar notificaciones..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="ghost" onClick={handleClearFilters}>
              <X className="mr-2 h-4 w-4" />
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Notificaciones ({filteredData?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando notificaciones...
            </div>
          ) : filteredData && filteredData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Estado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Mensaje</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((notification: any) => (
                  <TableRow
                    key={notification.id}
                    className={!notification.isRead ? "bg-blue-50/50" : ""}
                  >
                    <TableCell>
                      {notification.isRead ? (
                        <CheckCheck className="h-4 w-4 text-green-500" />
                      ) : (
                        <Bell className="h-4 w-4 text-blue-500" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTypeBadge(notification.type).variant}>
                        {getTypeBadge(notification.type).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {notification.title}
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {notification.message}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(notification.createdAt), "PPp", {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              markAsRead.mutate({ id: notification.id })
                            }
                            disabled={markAsRead.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            deleteNotification.mutate({ id: notification.id })
                          }
                          disabled={deleteNotification.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron notificaciones con los filtros aplicados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
