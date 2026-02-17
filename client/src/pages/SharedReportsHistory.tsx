import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Mail, Linkedin, FileDown, FileSpreadsheet, Calendar, User, Filter, Download } from "lucide-react";

export default function SharedReportsHistory() {
  const [shareChannel, setShareChannel] = useState<string>("all");
  const [reportType, setReportType] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading } = trpc.sharedReports.list.useQuery({
    shareChannel: shareChannel === "all" ? undefined : (shareChannel as any),
    reportType: reportType === "all" ? undefined : (reportType as any),
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    pageSize,
  });

  const { data: stats } = trpc.sharedReports.getStats.useQuery();

  const exportToExcelMutation = trpc.sharedReports.exportHistoryToExcel.useMutation({
    onSuccess: (result) => {
      // Descargar archivo automáticamente
      window.open(result.url, "_blank");
      alert(`Exportación exitosa\nHistorial exportado a ${result.fileName}`);
    },
    onError: (error) => {
      alert(`Error al exportar\n${error.message}`);
    },
  });

  const handleExportToExcel = () => {
    exportToExcelMutation.mutate({
      shareChannel: shareChannel === "all" ? undefined : (shareChannel as any),
      reportType: reportType === "all" ? undefined : (reportType as any),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="h-4 w-4" />;
      case "linkedin":
        return <Linkedin className="h-4 w-4" />;
      case "twitter":
        return (
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        );
      default:
        return <FileDown className="h-4 w-4" />;
    }
  };

  const getChannelBadgeColor = (channel: string) => {
    switch (channel) {
      case "email":
        return "bg-blue-100 text-blue-800";
      case "linkedin":
        return "bg-blue-600 text-white";
      case "twitter":
        return "bg-black text-white";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleClearFilters = () => {
    setShareChannel("all");
    setReportType("all");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando historial...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            Historial de Reportes Compartidos
          </h1>
          <p className="text-muted-foreground mt-1">
            Rastreo completo de reportes compartidos por canal, fecha y destinatarios
          </p>
        </div>
        <Button
          onClick={handleExportToExcel}
          disabled={exportToExcelMutation.isPending}
          className="flex items-center gap-2"
        >
          {exportToExcelMutation.isPending ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Generando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Exportar a Excel
            </>
          )}
        </Button>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Compartidos</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalShares || 0}</div>
            <p className="text-xs text-muted-foreground">Todos los canales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.byChannel?.find((c) => c.channel === "email")?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Envíos directos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Redes Sociales</CardTitle>
            <Linkedin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.byChannel?.find((c) => c.channel === "linkedin")?.count || 0) +
                (stats?.byChannel?.find((c) => c.channel === "twitter")?.count || 0)}
            </div>
            <p className="text-xs text-muted-foreground">LinkedIn + Twitter/X</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reportes PDF</CardTitle>
            <FileDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.byReportType?.find((t) => t.type === "pdf")?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">vs {stats?.byReportType?.find((t) => t.type === "excel")?.count || 0} Excel</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
          <CardDescription>Filtra el historial por canal, tipo de reporte y rango de fechas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="grid gap-2">
              <Label htmlFor="shareChannel">Canal</Label>
              <Select value={shareChannel} onValueChange={setShareChannel}>
                <SelectTrigger id="shareChannel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los canales</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="twitter">Twitter/X</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reportType">Tipo de Reporte</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="reportType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>&nbsp;</Label>
              <Button variant="outline" onClick={handleClearFilters} className="w-full">
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Comparticiones</CardTitle>
          <CardDescription>
            Mostrando {data?.logs?.length || 0} de {data?.total || 0} registros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Destinatarios</TableHead>
                  <TableHead>Asunto/Mensaje</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.logs && data.logs.length > 0 ? (
                  data.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {new Date(log.createdAt!).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(log.createdAt!).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{log.sharedByName}</div>
                            <div className="text-xs text-muted-foreground">{log.sharedByEmail}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getChannelBadgeColor(log.shareChannel)} flex items-center gap-1 w-fit`}>
                          {getChannelIcon(log.shareChannel)}
                          {log.shareChannel === "email" && "Email"}
                          {log.shareChannel === "linkedin" && "LinkedIn"}
                          {log.shareChannel === "twitter" && "Twitter/X"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="flex items-center gap-1 w-fit">
                          {log.reportType === "pdf" ? (
                            <FileDown className="h-3 w-3" />
                          ) : (
                            <FileSpreadsheet className="h-3 w-3" />
                          )}
                          {log.reportType.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.shareChannel === "email" ? (
                          <div>
                            <div className="font-medium">{log.recipientCount} destinatario(s)</div>
                            <div className="text-xs text-muted-foreground">
                              {log.recipients && Array.isArray(log.recipients) 
                                ? log.recipients.slice(0, 2).join(", ")
                                : "N/A"}
                              {log.recipients && Array.isArray(log.recipients) && log.recipients.length > 2 && "..."}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {log.emailSubject ? (
                          <div className="max-w-xs">
                            <div className="font-medium truncate">{log.emailSubject}</div>
                            {log.emailMessage && (
                              <div className="text-xs text-muted-foreground truncate">{log.emailMessage}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(log.reportUrl, "_blank")}
                        >
                          Ver Reporte
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      No se encontraron reportes compartidos con los filtros aplicados
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Página {data.page} de {data.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === data.totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
