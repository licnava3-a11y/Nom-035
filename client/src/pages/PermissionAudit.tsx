import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Filter, TrendingUp } from "lucide-react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

export default function PermissionAudit() {
  const [page, setPage] = useState(1);
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [changeType, setChangeType] = useState<"role_change" | "custom_permission_update" | "custom_permission_reset" | undefined>(undefined);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [trendMonths, setTrendMonths] = useState(6);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const pieChartInstanceRef = useRef<Chart | null>(null);

  const { data: historyData, isLoading } = trpc.permissionAudit.getHistory.useQuery({
    userId,
    changeType,
    startDate,
    endDate,
    page,
    limit: 20,
  });

  const { data: stats } = trpc.permissionAudit.getStatistics.useQuery();

  const { data: trendsData } = trpc.permissionAudit.getChangesTrends.useQuery({ months: trendMonths });
  const { data: monthlyChanges } = trpc.permissionAudit.getMonthlyChangesCount.useQuery();
  const { data: customPermissionsCount } = trpc.permissionAudit.getUsersWithCustomPermissionsCount.useQuery();
  const { data: topAdmins } = trpc.permissionAudit.getTopAdministrators.useQuery();
  const { data: criticalChanges } = trpc.permissionAudit.getRecentCriticalChanges.useQuery();

  // Renderizar pie chart de distribución de tipos de cambios
  useEffect(() => {
    if (!stats || !pieChartRef.current) return;

    // Destruir gráfico anterior si existe
    if (pieChartInstanceRef.current) {
      pieChartInstanceRef.current.destroy();
    }

    const ctx = pieChartRef.current.getContext("2d");
    if (!ctx) return;

    const labels = stats.map((stat) => {
      if (stat.changeType === "role_change") return "Cambios de Rol";
      if (stat.changeType === "custom_permission_update") return "Actualizaciones";
      return "Resets";
    });
    const data = stats.map((stat) => Number(stat.count));

    pieChartInstanceRef.current = new Chart(ctx, {
      type: "pie",
      data: {
        labels,
        datasets: [
          {
            data: stats.map((s) => s.count),
            backgroundColor: ["#10b981", "#1e3a8a", "#dc2626"],
            borderWidth: stats.map((s) => (changeType === s.changeType ? 4 : 2)),
            borderColor: "#ffffff",
            hoverBorderWidth: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        animation: {
          duration: 500,
          easing: "easeInOutQuart",
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const clickedType = stats[index].changeType;
            // Si ya está filtrado por este tipo, limpiar filtro
            if (changeType === clickedType) {
              setChangeType(undefined);
            } else {
              setChangeType(clickedType);
            }
            setPage(1); // Resetear a página 1
          }
        },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              font: {
                size: 11,
              },
              padding: 10,
            },
          },
          tooltip: {
            callbacks: {
              title: function(context) {
                return context[0].label || "";
              },
              label: function(context) {
                const value = context.parsed;
                const total = stats.reduce((sum, s) => sum + s.count, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
                return `${value} cambios (${percentage}%)`;
              },
              afterLabel: function() {
                return "\nℹ️ Haz clic para filtrar";
              },
            },
          },
        },
      },
    });

    return () => {
      if (pieChartInstanceRef.current) {
        pieChartInstanceRef.current.destroy();
      }
    };
  }, [stats, changeType]);

  // Renderizar gráfico Chart.js cuando cambien los datos
  useEffect(() => {
    if (!trendsData || !chartRef.current) return;

    // Destruir gráfico anterior si existe
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Preparar datos para Chart.js
    const months = Array.from(new Set(trendsData.map((t) => t.month))).sort();
    const roleChanges = months.map((month) => {
      const item = trendsData.find((t) => t.month === month && t.changeType === "role_change");
      return item ? Number(item.count) : 0;
    });
    const permissionUpdates = months.map((month) => {
      const item = trendsData.find((t) => t.month === month && t.changeType === "custom_permission_update");
      return item ? Number(item.count) : 0;
    });
    const permissionResets = months.map((month) => {
      const item = trendsData.find((t) => t.month === month && t.changeType === "custom_permission_reset");
      return item ? Number(item.count) : 0;
    });

    // Crear gráfico
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInstanceRef.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: months,
        datasets: [
          {
            label: "Cambios de Rol",
            data: roleChanges,
            borderColor: "#10b981", // Verde
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            tension: 0.4,
          },
          {
            label: "Actualizaciones de Permisos",
            data: permissionUpdates,
            borderColor: "#1e3a8a", // Azul marino
            backgroundColor: "rgba(30, 58, 138, 0.1)",
            tension: 0.4,
          },
          {
            label: "Resets de Permisos",
            data: permissionResets,
            borderColor: "#dc2626", // Rojo
            backgroundColor: "rgba(220, 38, 38, 0.1)",
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
          title: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    });

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [trendsData]);

  const getChangeTypeBadge = (type: string) => {
    switch (type) {
      case "role_change":
        return <Badge variant="default">Cambio de Rol</Badge>;
      case "custom_permission_update":
        return <Badge variant="secondary">Actualización de Permisos</Badge>;
      case "custom_permission_reset":
        return <Badge variant="outline">Reset de Permisos</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  const formatChange = (oldValue: any, newValue: any, type: string) => {
    if (type === "role_change") {
      return (
        <div className="text-sm">
          <span className="text-muted-foreground">{oldValue?.role || "N/A"}</span>
          {" → "}
          <span className="font-medium">{newValue?.role || "N/A"}</span>
        </div>
      );
    } else {
      return (
        <div className="text-sm">
          <span className="text-muted-foreground">Permisos modificados</span>
        </div>
      );
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Auditoría de Permisos</h1>
        <p className="text-muted-foreground">
          Historial completo de cambios de roles y permisos personalizados
        </p>
      </div>

      {/* KPIs Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Cambios de Rol por Mes */}
        {monthlyChanges && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cambios de Rol (Mes Actual)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{monthlyChanges.currentCount}</div>
                {monthlyChanges.trend === "up" && (
                  <Badge className="bg-green-600">↑ {monthlyChanges.currentCount - monthlyChanges.previousCount}</Badge>
                )}
                {monthlyChanges.trend === "down" && (
                  <Badge className="bg-red-600">↓ {monthlyChanges.previousCount - monthlyChanges.currentCount}</Badge>
                )}
                {monthlyChanges.trend === "stable" && (
                  <Badge variant="secondary">→ Sin cambios</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Mes anterior: {monthlyChanges.previousCount}
              </p>
            </CardContent>
          </Card>
        )}

        {/* KPI 2: Usuarios con Permisos Personalizados */}
        {customPermissionsCount !== undefined && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Usuarios con Permisos Personalizados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customPermissionsCount}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Usuarios con permisos específicos
              </p>
            </CardContent>
          </Card>
        )}

        {/* KPI 3: Administradores Más Activos */}
        {topAdmins && topAdmins.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Administrador Más Activo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold truncate">{topAdmins[0].adminName}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {topAdmins[0].changeCount} cambios (últimos 30 días)
                {Number(topAdmins[0].changeCount) > 10 && (
                  <Badge className="ml-2 bg-red-600">Alta actividad</Badge>
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {/* KPI 4: Cambios Críticos (24 horas) */}
        {criticalChanges && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cambios Recientes (24h)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold">{criticalChanges.count}</div>
                {criticalChanges.count > 0 && (
                  <Badge className="bg-red-600">Nuevos</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Últimas 24 horas
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Statistics Cards and Pie Chart */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <Card key={stat.changeType}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.changeType === "role_change" && "Cambios de Rol"}
                    {stat.changeType === "custom_permission_update" && "Actualizaciones de Permisos"}
                    {stat.changeType === "custom_permission_reset" && "Resets de Permisos"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.count}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Distribución de Cambios</CardTitle>
              <CardDescription className="text-xs mt-1">
                Haz clic en un segmento para filtrar la tabla
                {changeType && (
                  <Badge variant="secondary" className="ml-2">
                    Filtrado: {changeType === "role_change" && "Cambios de Rol"}
                    {changeType === "custom_permission_update" && "Actualizaciones"}
                    {changeType === "custom_permission_reset" && "Resets"}
                  </Badge>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <canvas ref={pieChartRef} style={{ maxHeight: "200px", cursor: "pointer" }}></canvas>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráfico de Tendencias */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tendencias de Cambios de Permisos
              </CardTitle>
              <CardDescription>Evolución mensual de cambios de roles y permisos</CardDescription>
            </div>
            <Select value={trendMonths.toString()} onValueChange={(value) => setTrendMonths(Number(value))}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Último año</SelectItem>
                <SelectItem value="24">Últimos 2 años</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ height: "400px" }}>
            <canvas ref={chartRef}></canvas>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>Filtrar historial por usuario, tipo de cambio o fecha</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="userId">ID de Usuario</Label>
              <Input
                id="userId"
                type="number"
                placeholder="Ej: 123"
                value={userId || ""}
                onChange={(e) => setUserId(e.target.value ? parseInt(e.target.value) : undefined)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="changeType">Tipo de Cambio</Label>
              <Select
                value={changeType || "all"}
                onValueChange={(value) =>
                  setChangeType(value === "all" ? undefined : value as any)
                }
              >
                <SelectTrigger id="changeType">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="role_change">Cambio de Rol</SelectItem>
                  <SelectItem value="custom_permission_update">Actualización de Permisos</SelectItem>
                  <SelectItem value="custom_permission_reset">Reset de Permisos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setUserId(undefined);
                setChangeType(undefined);
                setStartDate("");
                setEndDate("");
                setPage(1);
              }}
            >
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Cambios</CardTitle>
          <CardDescription>
            {historyData?.pagination.total || 0} cambios registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando historial...</div>
          ) : !historyData || historyData.history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron cambios con los filtros seleccionados
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario Afectado</TableHead>
                    <TableHead>Tipo de Cambio</TableHead>
                    <TableHead>Cambio</TableHead>
                    <TableHead>Modificado Por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.history.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString("es-MX")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{entry.userName || "Usuario desconocido"}</div>
                          <div className="text-sm text-muted-foreground">{entry.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>{getChangeTypeBadge(entry.changeType)}</TableCell>
                      <TableCell>{formatChange(entry.oldValue, entry.newValue, entry.changeType)}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{entry.changedByName || "Sistema"}</div>
                          <div className="text-sm text-muted-foreground">{entry.changedByEmail}</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {historyData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Página {historyData.pagination.page} de {historyData.pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= historyData.pagination.totalPages}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
