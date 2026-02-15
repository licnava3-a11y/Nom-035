import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Filter, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function NotificationHistory() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    type: "",
    status: "",
    recipientEmail: "",
    dateFrom: "",
    dateTo: "",
  });

  const { data: logsData, isLoading, refetch } = trpc.notificationLogs.getAll.useQuery({
    page,
    pageSize: 50,
    type: filters.type || undefined,
    status: filters.status as "failed" | "sent" | "bounced" | undefined,
    recipientEmail: filters.recipientEmail || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
  });

  const { data: stats } = trpc.notificationLogs.getStats.useQuery({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  });
  const { data: recipients } = trpc.notificationLogs.getRecipients.useQuery();

  // Export mutation commented out - export procedure not implemented yet
  // const exportMutation = trpc.notificationLogs.export.useMutation({
  //   onSuccess: (data: any) => {
  //     const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8;" });
  //     const link = document.createElement("a");
  //     link.href = URL.createObjectURL(blob);
  //     link.download = `notificaciones_${new Date().toISOString().split("T")[0]}.csv`;
  //     link.click();
  //     toast.success("Historial exportado exitosamente");
  //   },
  //   onError: () => {
  //     toast.error("Error al exportar historial");
  //   },
  // });

  const handleExport = () => {
    // Export functionality not implemented yet
    toast.info("Funcionalidad de exportación en desarrollo");
    // exportMutation.mutate(filters);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-green-500">Enviada</Badge>;
      case "failed":
        return <Badge variant="destructive">Fallida</Badge>;
      case "bounced":
        return <Badge className="bg-yellow-500">Rebotada</Badge>;
      case "pending":
        return <Badge className="bg-blue-500">Pendiente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case "email":
        return <Badge variant="outline">📧 Email</Badge>;
      case "sms":
        return <Badge variant="outline">📱 SMS</Badge>;
      case "push":
        return <Badge variant="outline">🔔 Push</Badge>;
      default:
        return <Badge variant="outline">{channel}</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Historial de Notificaciones</h1>
          <p className="text-muted-foreground">Auditoría completa de todas las notificaciones enviadas</p>
        </div>
        <Button onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Dashboard de Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Enviadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.totalSent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Fallidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.totalFailed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-yellow-600">Rebotadas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.totalBounced}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-600">Tasa de Éxito</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.successRate}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
          <CardDescription>Filtra el historial por tipo, estado, destinatario y fechas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Notificación</Label>
              <Select value={filters.type} onValueChange={(value) => setFilters({ ...filters, type: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los tipos</SelectItem>
                  <SelectItem value="alert">Alertas</SelectItem>
                  <SelectItem value="survey">Encuestas</SelectItem>
                  <SelectItem value="training">Capacitación</SelectItem>
                  <SelectItem value="case">Casos</SelectItem>
                  <SelectItem value="compliance">Cumplimiento</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={filters.status} onValueChange={(value) => setFilters({ ...filters, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  <SelectItem value="sent">Enviada</SelectItem>
                  <SelectItem value="failed">Fallida</SelectItem>
                  <SelectItem value="bounced">Rebotada</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Destinatario</Label>
              <Select
                value={filters.recipientEmail}
                onValueChange={(value) => setFilters({ ...filters, recipientEmail: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los destinatarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los destinatarios</SelectItem>
                  {recipients?.map((r: any) => (
                    <SelectItem key={r} value={r || ""}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button onClick={() => refetch()} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualizar
            </Button>
            <Button
              onClick={() => {
                setFilters({
                  type: "",
                  status: "",
                  recipientEmail: "",
                  dateFrom: "",
                  dateTo: "",
                });
                setPage(1);
              }}
              variant="outline"
              size="sm"
            >
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Notificaciones</CardTitle>
          <CardDescription>
            Mostrando {logsData?.logs.length || 0} de {logsData?.pagination.total || 0} notificaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando historial...</div>
          ) : logsData?.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No se encontraron notificaciones</div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Destinatario</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha de Envío</TableHead>
                      <TableHead>Intentos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logsData?.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs">{log.queueId ? String(log.queueId).slice(0, 8) : 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.templateCode || "N/A"}</Badge>
                        </TableCell>
                        <TableCell>{getChannelBadge(log.channel || "email")}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{log.recipientEmail || "N/A"}</TableCell>
                        <TableCell>{getStatusBadge(log.status || "pending")}</TableCell>
                        <TableCell>
                          {log.sentAt ? new Date(log.sentAt).toLocaleString("es-MX") : "Pendiente"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            0
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Página {page} de {Math.ceil((logsData?.pagination.total || 0) / 50)}
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} variant="outline">
                    Anterior
                  </Button>
                  <Button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!logsData || page >= Math.ceil(logsData.pagination.total / 50)}
                    variant="outline"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
