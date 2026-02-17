import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { MessageCircle, TrendingUp, Users, CheckCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NORMATIVAS_MAP } from "@/lib/whatsapp";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

export default function WhatsAppMetrics() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [dateRange, setDateRange] = useState<{ startDate?: string; endDate?: string }>({});

  // Queries
  const { data: metrics, isLoading: metricsLoading } = trpc.whatsappTracking.getConversionMetrics.useQuery(dateRange);
  const { data: normativas, isLoading: normativasLoading } = trpc.whatsappTracking.getNormativasPopularity.useQuery(dateRange);
  const { data: trends, isLoading: trendsLoading } = trpc.whatsappTracking.getConversionTrends.useQuery({
    period,
    ...dateRange,
  });
  const { data: recentEvents, isLoading: eventsLoading } = trpc.whatsappTracking.getRecentEvents.useQuery({
    limit: 10,
    offset: 0,
  });

  // Datos para gráfico de tendencias
  const trendsChartData = {
    labels: trends?.map((t) => t.period) || [],
    datasets: [
      {
        label: "Total de Clics",
        data: trends?.map((t) => t.totalEvents) || [],
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        tension: 0.4,
      },
      {
        label: "Conversiones",
        data: trends?.map((t) => t.conversions) || [],
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
      },
    ],
  };

  // Datos para gráfico de normativas
  const normativasChartData = {
    labels: normativas?.map((n) => NORMATIVAS_MAP[n.normativa] || n.normativa) || [],
    datasets: [
      {
        label: "Solicitudes",
        data: normativas?.map((n) => n.count) || [],
        backgroundColor: [
          "rgba(34, 197, 94, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(168, 85, 247, 0.8)",
        ],
        borderColor: [
          "rgb(34, 197, 94)",
          "rgb(59, 130, 246)",
          "rgb(239, 68, 68)",
          "rgb(245, 158, 11)",
          "rgb(168, 85, 247)",
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Métricas de Conversión WhatsApp</h1>
          <p className="text-muted-foreground">
            Seguimiento de clics, normativas solicitadas y conversiones
          </p>
        </div>
        <Select value={period} onValueChange={(value: "day" | "week" | "month") => setPeriod(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Por Día</SelectItem>
            <SelectItem value="week">Por Semana</SelectItem>
            <SelectItem value="month">Por Mes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clics</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">Eventos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversiones</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalConverted || 0}</div>
            <p className="text-xs text-muted-foreground">Clientes convertidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Conversión</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.conversionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">De clics a conversiones</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Normativa Top</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {normativas && normativas.length > 0
                ? NORMATIVAS_MAP[normativas[0].normativa]?.split(" ")[0] || normativas[0].normativa
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {normativas && normativas.length > 0 ? `${normativas[0].count} solicitudes` : "Sin datos"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de tendencias */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencias de Conversión</CardTitle>
            <CardDescription>Clics y conversiones por {period === "day" ? "día" : period === "week" ? "semana" : "mes"}</CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Cargando...</p>
              </div>
            ) : trends && trends.length > 0 ? (
              <div className="h-[300px]">
                <Line
                  data={trendsChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "top" as const,
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
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">No hay datos disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gráfico de normativas */}
        <Card>
          <CardHeader>
            <CardTitle>Normativas Más Solicitadas</CardTitle>
            <CardDescription>Distribución de interés por normativa</CardDescription>
          </CardHeader>
          <CardContent>
            {normativasLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">Cargando...</p>
              </div>
            ) : normativas && normativas.length > 0 ? (
              <div className="h-[300px]">
                <Pie
                  data={normativasChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: "right" as const,
                      },
                    },
                  }}
                />
              </div>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">No hay datos disponibles</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla de eventos recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Eventos Recientes</CardTitle>
          <CardDescription>Últimos 10 clics registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {eventsLoading ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">Cargando...</p>
            </div>
          ) : recentEvents && recentEvents.events.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Fecha</th>
                    <th className="text-left p-2">Tipo</th>
                    <th className="text-left p-2">Usuario</th>
                    <th className="text-left p-2">Normativas</th>
                    <th className="text-left p-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {recentEvents.events.map((event) => (
                    <tr key={event.id} className="border-b hover:bg-muted/50">
                      <td className="p-2 text-sm">
                        {new Date(event.createdAt).toLocaleDateString("es-MX", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-2 text-sm capitalize">{event.eventType.replace("_", " ")}</td>
                      <td className="p-2 text-sm">
                        {event.userData && typeof event.userData === "object" && "nombre" in event.userData
                          ? (event.userData as { nombre?: string }).nombre || "Anónimo"
                          : "Anónimo"}
                      </td>
                      <td className="p-2 text-sm">
                        {event.normativas && Array.isArray(event.normativas)
                          ? event.normativas.map((n) => NORMATIVAS_MAP[n] || n).join(", ")
                          : "N/A"}
                      </td>
                      <td className="p-2 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            event.conversionStatus === "converted"
                              ? "bg-green-100 text-green-800"
                              : event.conversionStatus === "lost"
                              ? "bg-red-100 text-red-800"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {event.conversionStatus === "converted"
                            ? "Convertido"
                            : event.conversionStatus === "lost"
                            ? "Perdido"
                            : "Pendiente"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No hay eventos registrados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
