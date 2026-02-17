import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Line, Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { MessageCircle, TrendingUp, TrendingDown, Users, CheckCircle, Calendar, X, Filter, GitCompare, Download, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subMonths, subYears } from "date-fns";
import { es } from "date-fns/locale";
import { NORMATIVAS_MAP } from "@/lib/whatsapp";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ComparisonMetricCard } from "@/components/ComparisonMetricCard";
import { exportComparisonToExcel } from "@/lib/excelExport";
import { useToast } from "@/hooks/use-toast";
import { ConvertToLeadModal } from "@/components/ConvertToLeadModal";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend);

type EventType = "click" | "demo_request" | "contact_request" | undefined;
type ConversionStatus = "pending" | "converted" | "lost" | undefined;

// Tipos para filtros rápidos
type QuickFilterType = "today" | "thisWeek" | "thisMonth" | "last7Days" | "last30Days" | "lastYear" | "lastWeek" | "lastMonth" | "lastYearPeriod" | null;

// Tipos para comparación
type ComparisonMode = "auto-previous" | "auto-year" | "manual";

export default function WhatsAppMetrics() {
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [eventType, setEventType] = useState<EventType>(undefined);
  const [conversionStatus, setConversionStatus] = useState<ConversionStatus>(undefined);
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilterType>(null);
  
  // Estado para comparación
  const [comparisonEnabled, setComparisonEnabled] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>("auto-previous");
  const [comparisonDateRange, setComparisonDateRange] = useState<{ from?: Date; to?: Date }>({});

  // Estado para conversión a lead
  const [convertModalOpen, setConvertModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Funciones helper para períodos predefinidos
  const applyQuickFilter = (filterType: QuickFilterType) => {
    const now = new Date();
    let from: Date;
    let to: Date;

    switch (filterType) {
      case "today":
        from = startOfDay(now);
        to = endOfDay(now);
        break;
      case "thisWeek":
        from = startOfWeek(now, { weekStartsOn: 1 }); // Lunes
        to = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "thisMonth":
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case "last7Days":
        from = startOfDay(subDays(now, 6)); // Últimos 7 días incluyendo hoy
        to = endOfDay(now);
        break;
      case "last30Days":
        from = startOfDay(subDays(now, 29)); // Últimos 30 días incluyendo hoy
        to = endOfDay(now);
        break;
      case "lastYear":
        from = startOfDay(subYears(now, 1));
        to = endOfDay(now);
        break;
      case "lastWeek":
        const lastWeekStart = subDays(startOfWeek(now, { weekStartsOn: 1 }), 7);
        from = lastWeekStart;
        to = endOfWeek(lastWeekStart, { weekStartsOn: 1 });
        break;
      case "lastMonth":
        const lastMonthDate = subMonths(now, 1);
        from = startOfMonth(lastMonthDate);
        to = endOfMonth(lastMonthDate);
        break;
      case "lastYearPeriod":
        const lastYearDate = subYears(now, 1);
        from = startOfYear(lastYearDate);
        to = endOfYear(lastYearDate);
        break;
      default:
        return;
    }

    setDateRange({ from, to });
    setActiveQuickFilter(filterType);
  };

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

  // Query de comparación (solo si está habilitada y hay fechas)
  const { data: comparisonData, isLoading: comparisonLoading } = trpc.whatsappTracking.getComparisonMetrics.useQuery(
    {
      currentStartDate: dateRange.from?.toISOString() || "",
      currentEndDate: dateRange.to?.toISOString() || "",
      comparisonStartDate: effectiveComparisonPeriod.from?.toISOString() || "",
      comparisonEndDate: effectiveComparisonPeriod.to?.toISOString() || "",
      eventType,
      conversionStatus,
    },
    {
      enabled: comparisonEnabled && !!dateRange.from && !!dateRange.to && !!effectiveComparisonPeriod.from && !!effectiveComparisonPeriod.to,
    }
  );

  // Queries para gráficos de comparación
  const comparisonFilters = {
    startDate: effectiveComparisonPeriod.from?.toISOString(),
    endDate: effectiveComparisonPeriod.to?.toISOString(),
    eventType,
    conversionStatus,
  };

  const { data: comparisonTrends } = trpc.whatsappTracking.getConversionTrends.useQuery(
    {
      period,
      ...comparisonFilters,
    },
    {
      enabled: comparisonEnabled && !!effectiveComparisonPeriod.from && !!effectiveComparisonPeriod.to,
    }
  );

  const { data: comparisonNormativas } = trpc.whatsappTracking.getNormativasPopularity.useQuery(
    comparisonFilters,
    {
      enabled: comparisonEnabled && !!effectiveComparisonPeriod.from && !!effectiveComparisonPeriod.to,
    }
  );

  // Mutation para verificar cambios significativos
  const checkChangesMutation = trpc.whatsappTracking.checkSignificantChanges.useMutation({
    onSuccess: (data) => {
      if (data.hasSignificantChanges) {
        // Mostrar alertas en toast
        data.alerts.forEach((alert) => {
          toast({
            title: `Alerta: ${alert.type}`,
            description: alert.message,
            variant: alert.severity === "high" ? "destructive" : "default",
          });
        });

        // Mostrar recomendaciones
        if (data.recommendations.length > 0) {
          setTimeout(() => {
            toast({
              title: "Recomendaciones",
              description: data.recommendations.join(". "),
            });
          }, 2000);
        }
      }
    },
  });

  // Ejecutar verificación de cambios al activar comparación
  useEffect(() => {
    if (
      comparisonEnabled &&
      dateRange.from &&
      dateRange.to &&
      effectiveComparisonPeriod.from &&
      effectiveComparisonPeriod.to
    ) {
      checkChangesMutation.mutate({
        currentStartDate: dateRange.from.toISOString(),
        currentEndDate: dateRange.to.toISOString(),
        comparisonStartDate: effectiveComparisonPeriod.from.toISOString(),
        comparisonEndDate: effectiveComparisonPeriod.to.toISOString(),
      });
    }
  }, [comparisonEnabled, dateRange.from, dateRange.to, effectiveComparisonPeriod.from, effectiveComparisonPeriod.to]);

  // Función para limpiar filtros
  const clearFilters = () => {
    setDateRange({});
    setEventType(undefined);
    setConversionStatus(undefined);
    setActiveQuickFilter(null);
  };

  // Limpiar filtro rápido si se cambian las fechas manualmente
  const handleDateChange = (type: 'from' | 'to', date: Date | undefined) => {
    setDateRange(prev => ({ ...prev, [type]: date }));
    setActiveQuickFilter(null);
  };

  // Función para exportar comparación a Excel
  const handleExport = () => {
    if (!comparisonData || !comparisonEnabled) {
      toast({
        title: "Error",
        description: "Debes habilitar la comparación primero",
        variant: "destructive",
      });
      return;
    }

    try {
      exportComparisonToExcel({
        comparisonData,
        currentEvents: recentEvents?.events || [],
        comparisonEvents: [], // Usar los mismos eventos actuales por ahora
        currentNormativas: normativas || [],
        comparisonNormativas: comparisonNormativas || [],
        dateRange,
        comparisonDateRange: effectiveComparisonPeriod,
      });

      toast({
        title: "Éxito",
        description: "Comparación exportada a Excel correctamente",
      });
    } catch (error) {
      console.error("Error al exportar:", error);
      toast({
        title: "Error",
        description: "No se pudo exportar la comparación",
        variant: "destructive",
      });
    }
  };

  // Función para abrir modal de conversión a lead
  const handleConvertToLead = (event: any) => {
    setSelectedEvent(event);
    setConvertModalOpen(true);
  };

  // Calcular período de comparación automáticamente
  const calculateComparisonPeriod = () => {
    if (!dateRange.from || !dateRange.to) return { from: undefined, to: undefined };

    const duration = dateRange.to.getTime() - dateRange.from.getTime();
    const durationDays = duration / (1000 * 60 * 60 * 24);

    if (comparisonMode === "auto-previous") {
      // Período anterior del mismo tamaño
      const compFrom = new Date(dateRange.from.getTime() - duration);
      const compTo = new Date(dateRange.to.getTime() - duration);
      return { from: compFrom, to: compTo };
    } else if (comparisonMode === "auto-year") {
      // Mismo período del año anterior
      const compFrom = subYears(dateRange.from, 1);
      const compTo = subYears(dateRange.to, 1);
      return { from: compFrom, to: compTo };
    } else {
      // Manual
      return comparisonDateRange;
    }
  };

  // Obtener período de comparación efectivo
  const effectiveComparisonPeriod = comparisonEnabled
    ? comparisonMode === "manual"
      ? comparisonDateRange
      : calculateComparisonPeriod()
    : { from: undefined, to: undefined };

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
    datasets: comparisonEnabled && comparisonTrends
      ? [
          // Período actual - líneas sólidas azul y verde
          {
            label: `Total de Clics (${dateRange.from && dateRange.to ? format(dateRange.from, "dd/MM", { locale: es }) + " - " + format(dateRange.to, "dd/MM", { locale: es }) : "Actual"})`,
            data: trends?.map((t) => t.totalEvents) || [],
            borderColor: "rgb(34, 197, 94)",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            tension: 0.4,
            borderWidth: 2,
          },
          {
            label: `Conversiones (${dateRange.from && dateRange.to ? format(dateRange.from, "dd/MM", { locale: es }) + " - " + format(dateRange.to, "dd/MM", { locale: es }) : "Actual"})`,
            data: trends?.map((t) => t.conversions) || [],
            borderColor: "rgb(59, 130, 246)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            tension: 0.4,
            borderWidth: 2,
          },
          // Período de comparación - líneas punteadas grises
          {
            label: `Total de Clics (${effectiveComparisonPeriod.from && effectiveComparisonPeriod.to ? format(effectiveComparisonPeriod.from, "dd/MM", { locale: es }) + " - " + format(effectiveComparisonPeriod.to, "dd/MM", { locale: es }) : "Comparación"})`,
            data: comparisonTrends?.map((t) => t.totalEvents) || [],
            borderColor: "rgb(156, 163, 175)",
            backgroundColor: "rgba(156, 163, 175, 0.05)",
            tension: 0.4,
            borderWidth: 2,
            borderDash: [5, 5],
          },
          {
            label: `Conversiones (${effectiveComparisonPeriod.from && effectiveComparisonPeriod.to ? format(effectiveComparisonPeriod.from, "dd/MM", { locale: es }) + " - " + format(effectiveComparisonPeriod.to, "dd/MM", { locale: es }) : "Comparación"})`,
            data: comparisonTrends?.map((t) => t.conversions) || [],
            borderColor: "rgb(107, 114, 128)",
            backgroundColor: "rgba(107, 114, 128, 0.05)",
            tension: 0.4,
            borderWidth: 2,
            borderDash: [5, 5],
          },
        ]
      : [
          // Vista normal sin comparación
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
  // Combinar normativas de ambos períodos para etiquetas completas
  const allNormativas = comparisonEnabled && comparisonNormativas
    ? Array.from(new Set([
        ...(normativas?.map(n => n.normativa) || []),
        ...(comparisonNormativas?.map(n => n.normativa) || [])
      ]))
    : normativas?.map(n => n.normativa) || [];

  const normativasChartData = {
    labels: allNormativas.map((n) => NORMATIVAS_MAP[n] || n),
    datasets: comparisonEnabled && comparisonNormativas
      ? [
          {
            label: `Período Actual (${dateRange.from && dateRange.to ? format(dateRange.from, "dd/MM", { locale: es }) + " - " + format(dateRange.to, "dd/MM", { locale: es }) : "Actual"})`,
            data: allNormativas.map(norm => {
              const found = normativas?.find(n => n.normativa === norm);
              return found ? found.count : 0;
            }),
            backgroundColor: "rgba(59, 130, 246, 0.8)",
            borderColor: "rgb(59, 130, 246)",
            borderWidth: 1,
          },
          {
            label: `Período de Comparación (${effectiveComparisonPeriod.from && effectiveComparisonPeriod.to ? format(effectiveComparisonPeriod.from, "dd/MM", { locale: es }) + " - " + format(effectiveComparisonPeriod.to, "dd/MM", { locale: es }) : "Comparación"})`,
            data: allNormativas.map(norm => {
              const found = comparisonNormativas?.find(n => n.normativa === norm);
              return found ? found.count : 0;
            }),
            backgroundColor: "rgba(156, 163, 175, 0.8)",
            borderColor: "rgb(156, 163, 175)",
            borderWidth: 1,
          },
        ]
      : [
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
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!comparisonEnabled || !comparisonData}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Comparación
          </Button>
          <div className="flex items-center space-x-2">
            <Switch
              id="comparison-mode"
              checked={comparisonEnabled}
              onCheckedChange={setComparisonEnabled}
            />
            <Label htmlFor="comparison-mode" className="flex items-center gap-2 cursor-pointer">
              <GitCompare className="h-4 w-4" />
              Comparar Períodos
            </Label>
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
      </div>

      {/* Filtros Rápidos Predefinidos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros Rápidos</CardTitle>
          <CardDescription>Selecciona un período predefinido para análisis rápido</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={activeQuickFilter === "today" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-primary/90 transition-colors"
              onClick={() => applyQuickFilter("today")}
            >
              Hoy
            </Badge>
            <Badge
              variant={activeQuickFilter === "thisWeek" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-primary/90 transition-colors"
              onClick={() => applyQuickFilter("thisWeek")}
            >
              Esta Semana
            </Badge>
            <Badge
              variant={activeQuickFilter === "thisMonth" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-primary/90 transition-colors"
              onClick={() => applyQuickFilter("thisMonth")}
            >
              Este Mes
            </Badge>
            <Badge
              variant={activeQuickFilter === "last7Days" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-primary/90 transition-colors"
              onClick={() => applyQuickFilter("last7Days")}
            >
              Últimos 7 Días
            </Badge>
            <Badge
              variant={activeQuickFilter === "last30Days" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-primary/90 transition-colors"
              onClick={() => applyQuickFilter("last30Days")}
            >
              Últimos 30 Días
            </Badge>
            <Badge
              variant={activeQuickFilter === "lastYear" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-primary/90 transition-colors"
              onClick={() => applyQuickFilter("lastYear")}
            >
              Último Año
            </Badge>
            <Badge
              variant={activeQuickFilter === "lastWeek" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-primary/90 transition-colors"
              onClick={() => applyQuickFilter("lastWeek")}
            >
              Semana Anterior
            </Badge>
            <Badge
              variant={activeQuickFilter === "lastMonth" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-primary/90 transition-colors"
              onClick={() => applyQuickFilter("lastMonth")}
            >
              Mes Anterior
            </Badge>
            <Badge
              variant={activeQuickFilter === "lastYearPeriod" ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm hover:bg-primary/90 transition-colors"
              onClick={() => applyQuickFilter("lastYearPeriod")}
            >
              Año Anterior
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de Comparación */}
      {comparisonEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <GitCompare className="h-5 w-5" />
              Configuración de Comparación
            </CardTitle>
            <CardDescription>
              Selecciona cómo comparar el período actual con otro período
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={comparisonMode} onValueChange={(value: ComparisonMode) => setComparisonMode(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto-previous" id="auto-previous" />
                <Label htmlFor="auto-previous" className="cursor-pointer">
                  Período Anterior (mismo tamaño)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="auto-year" id="auto-year" />
                <Label htmlFor="auto-year" className="cursor-pointer">
                  Mismo Período del Año Anterior
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="cursor-pointer">
                  Selección Manual
                </Label>
              </div>
            </RadioGroup>

            {comparisonMode === "manual" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="space-y-2">
                  <Label>Fecha Inicio (Comparación)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {comparisonDateRange.from ? format(comparisonDateRange.from, "PPP", { locale: es }) : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={comparisonDateRange.from}
                        onSelect={(date) => setComparisonDateRange({ ...comparisonDateRange, from: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Fecha Fin (Comparación)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <Calendar className="mr-2 h-4 w-4" />
                        {comparisonDateRange.to ? format(comparisonDateRange.to, "PPP", { locale: es }) : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={comparisonDateRange.to}
                        onSelect={(date) => setComparisonDateRange({ ...comparisonDateRange, to: date })}
                        initialFocus
                        disabled={(date) => comparisonDateRange.from ? date < comparisonDateRange.from : false}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            {comparisonMode !== "manual" && dateRange.from && dateRange.to && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  <strong>Período de comparación:</strong>{" "}
                  {effectiveComparisonPeriod.from && effectiveComparisonPeriod.to
                    ? `${format(effectiveComparisonPeriod.from, "PPP", { locale: es })} - ${format(effectiveComparisonPeriod.to, "PPP", { locale: es })}`
                    : "Selecciona un período actual primero"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                    onSelect={(date) => handleDateChange('from', date)}
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
                    onSelect={(date) => handleDateChange('to', date)}
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
        <ComparisonMetricCard
          title="Total de Clics"
          icon={MessageCircle}
          currentValue={metrics?.totalEvents || 0}
          comparisonValue={comparisonData?.comparison.totalEvents}
          change={comparisonData?.changes.totalEvents}
          subtitle="Eventos registrados"
          comparisonSubtitle="Eventos en comparación"
          comparisonEnabled={comparisonEnabled}
        />

        <ComparisonMetricCard
          title="Conversiones"
          icon={CheckCircle}
          currentValue={metrics?.totalConverted || 0}
          comparisonValue={comparisonData?.comparison.totalConverted}
          change={comparisonData?.changes.totalConverted}
          subtitle="Clientes convertidos"
          comparisonSubtitle="Conversiones en comparación"
          comparisonEnabled={comparisonEnabled}
        />

        <ComparisonMetricCard
          title="Tasa de Conversión"
          icon={TrendingUp}
          currentValue={metrics?.conversionRate || 0}
          comparisonValue={comparisonData?.comparison.conversionRate}
          change={comparisonData?.changes.conversionRate}
          subtitle="De clics a conversiones"
          comparisonSubtitle="Tasa en comparación"
          format="percentage"
          comparisonEnabled={comparisonEnabled}
        />

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
                {comparisonEnabled && comparisonNormativas ? (
                  <Bar
                    data={normativasChartData}
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
                          ticks: {
                            precision: 0,
                          },
                        },
                      },
                    }}
                  />
                ) : (
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
                )}
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
                    <th className="text-left p-2">Acciones</th>
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
                      <td className="p-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleConvertToLead(event)}
                          disabled={event.conversionStatus === "converted"}
                          className="gap-1"
                        >
                          <UserPlus className="h-3 w-3" />
                          {event.conversionStatus === "converted" ? "Ya Convertido" : "Convertir a Lead"}
                        </Button>
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

      {/* Modal de conversión a lead */}
      <ConvertToLeadModal
        open={convertModalOpen}
        onOpenChange={setConvertModalOpen}
        event={selectedEvent}
        onSuccess={() => {
          // Invalidar queries para actualizar la tabla
          utils.whatsappTracking.getRecentEvents.invalidate();
        }}
      />
    </div>
  );
}
