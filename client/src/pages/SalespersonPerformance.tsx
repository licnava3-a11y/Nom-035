import { useState } from "react";
import { useLocation } from "wouter";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  TrendingUp,
  TrendingDown,
  Award,
  Clock,
  DollarSign,
  Target,
  BarChart3,
  ArrowLeft,
  Building,
  Mail,
  Phone,
} from "lucide-react";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function SalespersonPerformance() {
  const [, navigate] = useLocation();
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>("");
  const [months, setMonths] = useState<number>(6);

  // Query para obtener todos los vendedores
  const { data: salespeople } = trpc.salespeople.getAll.useQuery();

  // Query para obtener rendimiento individual
  const { data: performance, isLoading } = trpc.salespeople.getIndividualPerformance.useQuery(
    {
      salespersonId: parseInt(selectedSalespersonId),
      months,
    },
    {
      enabled: !!selectedSalespersonId,
    }
  );

  // Obtener información del vendedor seleccionado
  const selectedSalesperson = salespeople?.find(
    (s) => s.id.toString() === selectedSalespersonId
  );

  // Preparar datos para gráfico de tendencias
  const trendData = performance?.monthlyTrends
    ? Object.entries(performance.monthlyTrends)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-months)
    : [];

  const lineChartData = {
    labels: trendData.map(([month]) => {
      const [year, monthNum] = month.split("-");
      return new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString("es", {
        month: "short",
        year: "numeric",
      });
    }),
    datasets: [
      {
        label: "Total Leads",
        data: trendData.map(([, data]) => data.total),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
      },
      {
        label: "Ganados",
        data: trendData.map(([, data]) => data.won),
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        tension: 0.4,
      },
      {
        label: "Perdidos",
        data: trendData.map(([, data]) => data.lost),
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
      },
    ],
  };

  // Preparar datos para gráfico de fuentes
  const sourceData = performance?.bySource
    ? Object.entries(performance.bySource).map(([source, data]) => ({
        source,
        ...data,
      }))
    : [];

  const pieChartData = {
    labels: sourceData.map((s: any) => s.source),
    datasets: [
      {
        label: "Leads por Fuente",
        data: sourceData.map((s: any) => s.total),
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(168, 85, 247, 0.8)",
          "rgba(236, 72, 153, 0.8)",
        ],
        borderWidth: 2,
        borderColor: "#fff",
      },
    ],
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/salespeople-management")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rendimiento Individual</h1>
            <p className="text-muted-foreground mt-1">
              Análisis detallado del desempeño por vendedor
            </p>
          </div>
        </div>
      </div>

      {/* Selectores */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Select value={selectedSalespersonId} onValueChange={setSelectedSalespersonId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un vendedor" />
            </SelectTrigger>
            <SelectContent>
              {salespeople?.map((salesperson: any) => (
                <SelectItem key={salesperson.id} value={salesperson.id.toString()}>
                  {salesperson.nombre} - {salesperson.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={months.toString()} onValueChange={(v) => setMonths(parseInt(v))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último año</SelectItem>
              <SelectItem value="24">Últimos 2 años</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedSalespersonId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Selecciona un vendedor para ver su rendimiento detallado
          </CardContent>
        </Card>
      )}

      {selectedSalespersonId && isLoading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Cargando datos de rendimiento...
          </CardContent>
        </Card>
      )}

      {selectedSalespersonId && performance && (
        <>
          {/* Cards de métricas */}
          <div className="grid gap-4 md:grid-cols-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance.totalLeads}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ganados</CardTitle>
                <Award className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{performance.leadsWon}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Perdidos</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{performance.leadsLost}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Activos</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{performance.leadsActive}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa Conversión</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance.conversionRate.toFixed(1)}%</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tiempo Respuesta</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{performance.avgResponseTime.toFixed(1)}h</div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Ingresos Generados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                ${performance.totalRevenue.toLocaleString()}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                De {performance.leadsWon} leads ganados
              </p>
            </CardContent>
          </Card>

          {/* Gráficos */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tendencias de Conversión</CardTitle>
                <CardDescription>
                  Evolución de leads en los últimos {months} meses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Line
                    data={lineChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "bottom",
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            precision: 0,
                          },
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Distribución por Fuente</CardTitle>
                <CardDescription>Leads por canal de adquisición</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  {sourceData.length > 0 ? (
                    <Pie
                      data={pieChartData}
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
                  ) : (
                    <p className="text-muted-foreground">No hay datos de fuentes disponibles</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de conversión por fuente */}
          <Card>
            <CardHeader>
              <CardTitle>Rendimiento por Fuente</CardTitle>
              <CardDescription>Tasa de conversión por canal</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fuente</TableHead>
                    <TableHead className="text-right">Total Leads</TableHead>
                    <TableHead className="text-right">Ganados</TableHead>
                    <TableHead className="text-right">Tasa Conversión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sourceData.map((source: any) => {
                    const conversionRate =
                      source.total > 0 ? (source.won / source.total) * 100 : 0;
                    return (
                      <TableRow key={source.source}>
                        <TableCell className="font-medium">{source.source}</TableCell>
                        <TableCell className="text-right">{source.total}</TableCell>
                        <TableCell className="text-right text-green-600 font-medium">
                          {source.won}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={conversionRate >= 30 ? "default" : "secondary"}>
                            {conversionRate.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Leads recientes */}
          <Card>
            <CardHeader>
              <CardTitle>Leads Recientes</CardTitle>
              <CardDescription>Últimos 10 leads asignados</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Fecha Creación</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {performance.recentLeads.map((lead: any) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.nombre}</TableCell>
                      <TableCell>
                        {lead.empresa ? (
                          <div className="flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {lead.empresa}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {lead.email && (
                            <div className="flex items-center gap-1 text-xs">
                              <Mail className="w-3 h-3" />
                              {lead.email}
                            </div>
                          )}
                          {lead.telefono && (
                            <div className="flex items-center gap-1 text-xs">
                              <Phone className="w-3 h-3" />
                              {lead.telefono}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            lead.estado === "ganado"
                              ? "default"
                              : lead.estado === "perdido"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {lead.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>{lead.origen || "-"}</TableCell>
                      <TableCell>
                        {new Date(lead.createdAt).toLocaleDateString("es", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
