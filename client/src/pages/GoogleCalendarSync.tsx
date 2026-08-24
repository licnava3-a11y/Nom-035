import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Download,
  ExternalLink,
  Users,
  FileText,
  AlertTriangle,
  Clock,
  Filter,
} from "lucide-react";

type EventType =
  | "meeting"
  | "contract_expiry"
  | "action_deadline"
  | "agreement_deadline";

const TYPE_CONFIG: Record<
  EventType,
  { label: string; color: string; icon: React.ReactNode }
> = {
  meeting: {
    label: "Reunión Comité",
    color: "bg-blue-100 text-blue-700",
    icon: <Users className="h-4 w-4" />,
  },
  contract_expiry: {
    label: "Vencimiento Contrato",
    color: "bg-orange-100 text-orange-700",
    icon: <FileText className="h-4 w-4" />,
  },
  action_deadline: {
    label: "Plazo Acción",
    color: "bg-purple-100 text-purple-700",
    icon: <Clock className="h-4 w-4" />,
  },
  agreement_deadline: {
    label: "Plazo Acuerdo",
    color: "bg-yellow-100 text-yellow-700",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
};

const PRIORITY_CONFIG = {
  high: { label: "Alta", color: "bg-red-100 text-red-700" },
  medium: { label: "Media", color: "bg-yellow-100 text-yellow-700" },
  low: { label: "Baja", color: "bg-green-100 text-green-700" },
};

export default function GoogleCalendarSync() {
  const { toast } = useToast();
  const [days, setDays] = useState(90);
  const [filterType, setFilterType] = useState<EventType | "all">("all");
  const [filterPriority, setFilterPriority] = useState<
    "all" | "high" | "medium" | "low"
  >("all");

  const { data, isLoading, refetch } =
    trpc.googleCalendarSync.getUpcomingEvents.useQuery({ days });
  const { data: stats } = trpc.googleCalendarSync.getCalendarStats.useQuery({
    days,
  });
  const exportMut = trpc.googleCalendarSync.exportAllEventsIcal.useMutation({
    onSuccess: data => {
      // Descargar el archivo .ics
      const blob = new Blob([data.ical], {
        type: "text/calendar;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nom035-eventos-${new Date().toISOString().split("T")[0]}.ics`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: `Exportados ${data.totalEvents} eventos a iCal` });
    },
    onError: e =>
      toast({
        title: "Error al exportar",
        description: e.message,
        variant: "destructive",
      }),
  });

  const generateEventMut =
    trpc.googleCalendarSync.generateEventIcal.useMutation({
      onSuccess: (data, variables) => {
        // Descargar el .ics individual
        const blob = new Blob([data.ical], {
          type: "text/calendar;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `evento-${variables.eventId}.ics`;
        a.click();
        URL.revokeObjectURL(url);
      },
    });

  const events = data?.events ?? [];

  const filtered = useMemo(() => {
    return events.filter(e => {
      if (filterType !== "all" && e.type !== filterType) return false;
      if (filterPriority !== "all" && e.priority !== filterPriority)
        return false;
      return true;
    });
  }, [events, filterType, filterPriority]);

  const openGoogleCalendar = (event: (typeof events)[0]) => {
    const fmt = (d: string) => d.replace(/[-:T]/g, "").replace(/\.\d{3}Z/, "Z");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: event.title,
      dates: `${fmt(event.startDate)}/${fmt(event.endDate)}`,
      details: event.description,
      location: event.location ?? "",
    });
    window.open(
      `https://calendar.google.com/calendar/render?${params.toString()}`,
      "_blank"
    );
  };

  const downloadEventIcal = (event: (typeof events)[0]) => {
    generateEventMut.mutate({
      eventId: event.id,
      title: event.title,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      location: event.location,
    });
  };

  const daysUntil = (dateStr: string) => {
    const diff = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(diff / 86_400_000);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            Sincronización Google Calendar
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Reuniones del Comité NOM-035, vencimientos de contratos y fechas
            límite de acuerdos
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={String(days)} onValueChange={v => setDays(Number(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">Próximos 30 días</SelectItem>
              <SelectItem value="60">Próximos 60 días</SelectItem>
              <SelectItem value="90">Próximos 90 días</SelectItem>
              <SelectItem value="180">Próximos 6 meses</SelectItem>
              <SelectItem value="365">Próximo año</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => exportMut.mutate({ days })}
            disabled={exportMut.isPending || events.length === 0}
            variant="outline"
            className="border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar iCal
          </Button>
        </div>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            {
              label: "Total Eventos",
              value: stats.total,
              color: "bg-gray-50 text-gray-700",
              icon: <Calendar className="h-5 w-5" />,
            },
            {
              label: "Reuniones Comité",
              value: stats.meetings,
              color: "bg-blue-50 text-blue-700",
              icon: <Users className="h-5 w-5" />,
            },
            {
              label: "Vencimientos Contrato",
              value: stats.contracts,
              color: "bg-orange-50 text-orange-700",
              icon: <FileText className="h-5 w-5" />,
            },
            {
              label: "Plazos Acuerdos",
              value: stats.agreements,
              color: "bg-yellow-50 text-yellow-700",
              icon: <AlertTriangle className="h-5 w-5" />,
            },
            {
              label: "Urgentes (7 días)",
              value: stats.urgent,
              color:
                stats.urgent > 0
                  ? "bg-red-50 text-red-700"
                  : "bg-green-50 text-green-700",
              icon: <Clock className="h-5 w-5" />,
            },
          ].map(kpi => (
            <Card key={kpi.label} className={`${kpi.color} border-0`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{kpi.value}</div>
                    <div className="text-xs mt-1">{kpi.label}</div>
                  </div>
                  <div className="opacity-60">{kpi.icon}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 items-center">
        <Filter className="h-4 w-4 text-gray-400" />
        <Select
          value={filterType}
          onValueChange={v => setFilterType(v as typeof filterType)}
        >
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="meeting">Reuniones Comité</SelectItem>
            <SelectItem value="contract_expiry">
              Vencimientos Contrato
            </SelectItem>
            <SelectItem value="agreement_deadline">Plazos Acuerdos</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={filterPriority}
          onValueChange={v => setFilterPriority(v as typeof filterPriority)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las prioridades</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="medium">Media</SelectItem>
            <SelectItem value="low">Baja</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-gray-500 ml-auto">
          {filtered.length} de {events.length} eventos
        </span>
      </div>

      {/* Lista de eventos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            Eventos Próximos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">
              Cargando eventos...
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No hay eventos próximos en el período seleccionado</p>
              <p className="text-xs mt-1">
                Los eventos aparecerán cuando haya reuniones del comité,
                vencimientos de contratos o plazos de acuerdos programados
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(event => {
                const days = daysUntil(event.startDate);
                const typeConfig = TYPE_CONFIG[event.type as EventType];
                const priorityConfig = PRIORITY_CONFIG[event.priority];
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 p-4 hover:bg-gray-50"
                  >
                    {/* Fecha */}
                    <div className="text-center min-w-[60px]">
                      <div className="text-xs text-gray-500 uppercase">
                        {new Date(event.startDate).toLocaleDateString("es-MX", {
                          month: "short",
                        })}
                      </div>
                      <div className="text-2xl font-bold text-gray-800">
                        {new Date(event.startDate).getDate()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(event.startDate).getFullYear()}
                      </div>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeConfig.color}`}
                        >
                          {typeConfig.icon}
                          {typeConfig.label}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig.color}`}
                        >
                          {priorityConfig.label}
                        </span>
                        {event.folio && (
                          <span className="font-mono text-xs text-gray-500">
                            {event.folio}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 mt-1 truncate">
                        {event.title}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 whitespace-pre-line">
                        {event.description}
                      </p>
                      {event.location && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          📍 {event.location}
                        </p>
                      )}
                    </div>

                    {/* Días restantes + acciones */}
                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm font-bold ${days <= 7 ? "text-red-600" : days <= 30 ? "text-yellow-600" : "text-green-600"}`}
                      >
                        {days === 0
                          ? "Hoy"
                          : days === 1
                            ? "Mañana"
                            : `${days} días`}
                      </div>
                      <div className="flex gap-1 mt-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Abrir en Google Calendar"
                          onClick={() => openGoogleCalendar(event)}
                          className="h-7 w-7 p-0 text-blue-600 hover:bg-blue-50"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Descargar .ics"
                          onClick={() => downloadEventIcal(event)}
                          className="h-7 w-7 p-0 text-gray-600 hover:bg-gray-100"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instrucciones de uso */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Cómo sincronizar con Google Calendar
          </h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-blue-700">
            <div>
              <p className="font-medium">1. Exportar todos los eventos</p>
              <p className="text-blue-600 mt-1">
                Usa el botón "Exportar iCal" para descargar todos los eventos en
                formato .ics compatible con Google Calendar, Outlook y Apple
                Calendar.
              </p>
            </div>
            <div>
              <p className="font-medium">2. Importar en Google Calendar</p>
              <p className="text-blue-600 mt-1">
                En Google Calendar, ve a Configuración → Importar y exportar →
                Importar, selecciona el archivo .ics descargado.
              </p>
            </div>
            <div>
              <p className="font-medium">3. Agregar evento individual</p>
              <p className="text-blue-600 mt-1">
                Usa el ícono <ExternalLink className="h-3 w-3 inline" /> para
                abrir directamente Google Calendar con el evento prellenado, o{" "}
                <Download className="h-3 w-3 inline" /> para descargar el .ics
                individual.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
