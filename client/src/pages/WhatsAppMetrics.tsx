import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { MessageCircle, TrendingUp, Users, CheckCircle, Calendar, X, Filter } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NORMATIVAS_MAP } from "@/lib/whatsapp";
import { Badge } from "@/components/ui/badge";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Title, Tooltip, Legend);

type EventType = "click" | "demo_request" | "contact_request" | undefined;
type ConversionStatus = "pending" | "converted" | "lost" | undefined;

export default function WhatsAppMetrics() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [eventType, setEventType] = useState<EventType>(undefined);
  const [conversionStatus, setConversionStatus] = useState<ConversionStatus>(undefined);

  // Construir filtros para queries
  const filters = {
    startDate: dateRange.from ? dateRange.from.toISOString() : undefined,
    endDate: dateRange.to ? dateRange.to.toISOString() : undefined,
    eventType,
    conversionStatus,
  };

  // Queries
  const { data: metrics, isLoading: metricsLoading } = trpc.whatsappTracking.getConversionMetrics.useQuery(filters);
  const { data: normativas, isLoading: normativasLoading } = trpc.whatsappTracking.getNormativasPopularity.useQuery(filters);
  const { data: trends, isLoading: trendsLoading } = trpc.whatsappTracking.getConversionTrends.useQuery({
    period,
    ...filters,
  });
  const { data: recentEvents, isLoading: eventsLoading } = trpc.whatsappTracking.getRecentEvents.useQuery({
    limit: 10,
    offset: 0,
    ...filters,
  });

  // Función para limpiar filtros
  const clearFilters = () => {
    setDateRange({});
    setEventType(undefined);
    setConversionStatus(undefined);
  };

  // Contar filtros activos
  const activeFiltersCount = [
    dateRange.from,
    dateRange.to,
    eventType,
    conversionStatus,
  ].filter(Boolean).length;

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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

      {/* Filtros Avanzados */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle>Filtros Avanzados</CardTitle>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary">{activeFiltersCount} activo{activeFiltersCount > 1 ? "s" : ""}</Badge>
              )}
            </div>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Limpiar Filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Range Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Inicio</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Fin</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                    initialFocus
                    disabled={(date) => dateRange.from ? date < dateRange.from : false}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Filtro por Tipo de Evento */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Evento</label>
              <Select value={eventType || "all"} onValueChange={(value) => setEventType(value === "all" ? undefined : value as EventType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="click">Clic Simple</SelectItem>
                  <SelectItem value="demo_request">Solicitud de Demo</SelectItem>
                  <SelectItem value="contact_request">Solicitud de Contacto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Estado de Conversión */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado de Conversión</label>
              <Select value={conversionStatus || "all"} onValueChange={(value) => setConversionStatus(value === "all" ? undefined : value as ConversionStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="converted">Convertido</SelectItem>
                  <SelectItem value="lost">Perdido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

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
