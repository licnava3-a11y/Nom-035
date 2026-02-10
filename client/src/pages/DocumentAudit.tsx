import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, Eye, CheckCircle, Users, Activity, FileSpreadsheet } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import * as XLSX from "xlsx";
import { Line, Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function DocumentAudit() {
  const [filters, setFilters] = useState({
    action: undefined as "view" | "download" | "verify" | undefined,
    startDate: "",
    endDate: "",
    search: "",
    page: 1,
    pageSize: 50,
  });

  const [trendsPeriod, setTrendsPeriod] = useState<"day" | "week" | "month">("day");

  // Obtener log de auditoría
  const { data: auditData, isLoading } = trpc.documentAudit.getAuditLog.useQuery(filters);

  // Obtener estadísticas
  const { data: stats } = trpc.documentAudit.getStatistics.useQuery({
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  // Obtener datos de tendencias
  const { data: trendsData } = trpc.documentAudit.getTrends.useQuery({
    startDate: filters.startDate,
    endDate: filters.endDate,
    period: trendsPeriod,
  });

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "view":
        return <Eye className="h-4 w-4 text-blue-500" />;
      case "download":
        return <Download className="h-4 w-4 text-green-500" />;
      case "verify":
        return <CheckCircle className="h-4 w-4 text-purple-500" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleExportToExcel = () => {
    if (!auditData || auditData.logs.length === 0) {
      return;
    }

    // Preparar datos para Excel
    const excelData = auditData.logs.map((log) => ({
      "Fecha y Hora": format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: es }),
      "Acción": getActionLabel(log.action),
      "Usuario": log.userName,
      "Email": log.userEmail || "N/A",
      "Reporte ID": log.reportId,
      "Dirección IP": log.ipAddress || "N/A",
      "User Agent": log.userAgent || "N/A",
    }));

    // Crear libro de Excel
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Log de Auditoría");

    // Ajustar ancho de columnas
    const maxWidth = 50;
    const columnWidths = [
      { wch: 20 }, // Fecha y Hora
      { wch: 15 }, // Acción
      { wch: 25 }, // Usuario
      { wch: 30 }, // Email
      { wch: 12 }, // Reporte ID
      { wch: 15 }, // IP
      { wch: maxWidth }, // User Agent
    ];
    worksheet["!cols"] = columnWidths;

    // Generar nombre de archivo con fecha
    const fileName = `log_auditoria_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`;

    // Descargar archivo
    XLSX.writeFile(workbook, fileName);
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "view":
        return "Visualización";
      case "download":
        return "Descarga";
      case "verify":
        return "Verificación";
      default:
        return action;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Auditoría de Documentos</h1>
        <p className="text-muted-foreground mt-2">
          Registro completo de accesos, visualizaciones y descargas de documentos según ISO 9001
        </p>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Accesos</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAccesses}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visualizaciones</CardTitle>
              <Eye className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.views}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Descargas</CardTitle>
              <Download className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.downloads}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verificaciones</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.verifications}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Usuarios Únicos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráficas de Tendencias */}
      {trendsData && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Gráfica de Accesos por Periodo */}
          <Card className="col-span-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Accesos por Periodo</CardTitle>
                  <CardDescription>Tendencia de accesos a documentos</CardDescription>
                </div>
                <Select
                  value={trendsPeriod}
                  onValueChange={(value: "day" | "week" | "month") => setTrendsPeriod(value)}
                >
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Por Día</SelectItem>
                    <SelectItem value="week">Por Semana</SelectItem>
                    <SelectItem value="month">Por Mes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div style={{ height: "300px" }}>
                <Line
                  data={{
                    labels: trendsData.accessesByPeriod.map((item) => item.period),
                    datasets: [
                      {
                        label: "Accesos",
                        data: trendsData.accessesByPeriod.map((item) => item.count),
                        borderColor: "rgb(59, 130, 246)",
                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                        tension: 0.4,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Gráfica de Distribución por Acción */}
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Tipo de Acción</CardTitle>
              <CardDescription>Proporción de acciones realizadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: "300px" }}>
                <Doughnut
                  data={{
                    labels: ["Visualizaciones", "Descargas", "Verificaciones"],
                    datasets: [
                      {
                        data: [
                          trendsData.actionDistribution.view,
                          trendsData.actionDistribution.download,
                          trendsData.actionDistribution.verify,
                        ],
                        backgroundColor: [
                          "rgba(59, 130, 246, 0.8)",
                          "rgba(34, 197, 94, 0.8)",
                          "rgba(168, 85, 247, 0.8)",
                        ],
                        borderColor: [
                          "rgb(59, 130, 246)",
                          "rgb(34, 197, 94)",
                          "rgb(168, 85, 247)",
                        ],
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "bottom",
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Gráfica de Usuarios Más Activos */}
          <Card className="col-span-full lg:col-span-2">
            <CardHeader>
              <CardTitle>Usuarios Más Activos</CardTitle>
              <CardDescription>Top 10 usuarios con más accesos</CardDescription>
            </CardHeader>
            <CardContent>
              <div style={{ height: "300px" }}>
                <Bar
                  data={{
                    labels: trendsData.topUsers.map((user) => user.userName),
                    datasets: [
                      {
                        label: "Accesos",
                        data: trendsData.topUsers.map((user) => user.count),
                        backgroundColor: "rgba(59, 130, 246, 0.8)",
                        borderColor: "rgb(59, 130, 246)",
                        borderWidth: 1,
                      },
                    ],
                  }}
                  options={{
                    indexAxis: "y",
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: false,
                      },
                    },
                    scales: {
                      x: {
                        beginAtZero: true,
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
          <CardDescription>Filtra el log de auditoría por acción, fecha o usuario</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="action">Tipo de Acción</Label>
              <Select
                value={filters.action || "all"}
                onValueChange={(value) => handleFilterChange("action", value === "all" ? undefined : value)}
              >
                <SelectTrigger id="action">
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  <SelectItem value="view">Visualización</SelectItem>
                  <SelectItem value="download">Descarga</SelectItem>
                  <SelectItem value="verify">Verificación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="search">Buscar Usuario</Label>
              <Input
                id="search"
                type="text"
                placeholder="Nombre o email..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() =>
                setFilters({
                  action: undefined,
                  startDate: "",
                  endDate: "",
                  search: "",
                  page: 1,
                  pageSize: 50,
                })
              }
            >
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registro de Auditoría</CardTitle>
              <CardDescription>
                {auditData ? `${auditData.total} registros encontrados` : "Cargando..."}
              </CardDescription>
            </div>
            <Button
              onClick={handleExportToExcel}
              disabled={!auditData || auditData.logs.length === 0}
              variant="outline"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar a Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando registros...</div>
          ) : auditData && auditData.logs.length > 0 ? (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha y Hora</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Folio</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>IP</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditData.logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <span>{getActionLabel(log.action)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{log.reportTitle || "Sin título"}</TableCell>
                        <TableCell>
                          <span className="font-mono text-sm">{log.reportFolio || "N/A"}</span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{log.userName}</div>
                            {log.userEmail && (
                              <div className="text-sm text-muted-foreground">{log.userEmail}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs">{log.ipAddress || "N/A"}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Paginación */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Página {auditData.page} de {auditData.totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={auditData.page === 1}
                    onClick={() => handleFilterChange("page", filters.page - 1)}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={auditData.page === auditData.totalPages}
                    onClick={() => handleFilterChange("page", filters.page + 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron registros con los filtros aplicados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
