import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Edit, 
  CheckCircle, 
  XCircle, 
  RotateCcw, 
  Calendar,
  User,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface OperatingRulesTimelineProps {
  operatingRuleId: number;
}

type EventType = "created" | "updated" | "approved" | "rejected" | "restored";

const eventConfig: Record<EventType, { 
  icon: React.ComponentType<{ className?: string }>, 
  color: string, 
  bgColor: string, 
  label: string 
}> = {
  created: { 
    icon: FileText, 
    color: "text-blue-600", 
    bgColor: "bg-blue-100", 
    label: "Creación" 
  },
  updated: { 
    icon: Edit, 
    color: "text-purple-600", 
    bgColor: "bg-purple-100", 
    label: "Actualización" 
  },
  approved: { 
    icon: CheckCircle, 
    color: "text-green-600", 
    bgColor: "bg-green-100", 
    label: "Aprobación" 
  },
  rejected: { 
    icon: XCircle, 
    color: "text-red-600", 
    bgColor: "bg-red-100", 
    label: "Rechazo" 
  },
  restored: { 
    icon: RotateCcw, 
    color: "text-orange-600", 
    bgColor: "bg-orange-100", 
    label: "Restauración" 
  },
};

export function OperatingRulesTimeline({ operatingRuleId }: OperatingRulesTimelineProps) {
  const [selectedEventTypes, setSelectedEventTypes] = useState<EventType[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>();
  const [offset, setOffset] = useState(0);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const { data: historyData, isLoading } = trpc.committeeOperatingRules.getOperatingRulesHistory.useQuery({
    operatingRuleId,
    eventTypes: selectedEventTypes.length > 0 ? selectedEventTypes : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    userId: selectedUserId,
    limit: 50,
    offset,
  });

  // Obtener lista de usuarios únicos para el filtro
  const uniqueUsers = historyData?.events.reduce((acc, event) => {
    if (event.userId && !acc.find(u => u.id === event.userId)) {
      acc.push({ id: event.userId, name: event.userName || "Desconocido" });
    }
    return acc;
  }, [] as { id: number; name: string }[]) || [];

  const toggleEventType = (eventType: EventType) => {
    setSelectedEventTypes(prev =>
      prev.includes(eventType)
        ? prev.filter(t => t !== eventType)
        : [...prev, eventType]
    );
    setOffset(0); // Reset pagination
  };

  const toggleExpanded = (eventId: number) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const clearFilters = () => {
    setSelectedEventTypes([]);
    setStartDate("");
    setEndDate("");
    setSelectedUserId(undefined);
    setOffset(0);
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros de Historial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filtro por tipo de evento */}
          <div className="space-y-2">
            <Label>Tipo de Evento</Label>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(eventConfig) as EventType[]).map(eventType => {
                const config = eventConfig[eventType];
                const Icon = config.icon;
                return (
                  <div key={eventType} className="flex items-center space-x-2">
                    <Checkbox
                      id={`event-${eventType}`}
                      checked={selectedEventTypes.includes(eventType)}
                      onCheckedChange={() => toggleEventType(eventType)}
                    />
                    <Label
                      htmlFor={`event-${eventType}`}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <span>{config.label}</span>
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filtro por rango de fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Fecha Desde</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">Fecha Hasta</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setOffset(0);
                }}
              />
            </div>
          </div>

          {/* Filtro por usuario */}
          {uniqueUsers.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="user-filter">Usuario</Label>
              <Select
                value={selectedUserId?.toString() || "all"}
                onValueChange={(value) => {
                  setSelectedUserId(value === "all" ? undefined : parseInt(value));
                  setOffset(0);
                }}
              >
                <SelectTrigger id="user-filter">
                  <SelectValue placeholder="Todos los usuarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {uniqueUsers.map(user => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button variant="outline" onClick={clearFilters} className="w-full">
            Limpiar Filtros
          </Button>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Historial de Cambios</CardTitle>
            {historyData && (
              <Badge variant="secondary">
                {historyData.total} evento{historyData.total !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando historial...
            </div>
          ) : !historyData || historyData.events.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron eventos
            </div>
          ) : (
            <div className="relative">
              {/* Línea vertical */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

              {/* Eventos */}
              <div className="space-y-6">
                {historyData.events.map((event, index) => {
                  const config = eventConfig[event.eventType as EventType];
                  const Icon = config.icon;
                  const isExpanded = expandedEvents.has(event.id);

                  return (
                    <div key={`${event.id}-${index}`} className="relative pl-14">
                      {/* Icono del evento */}
                      <div
                        className={`absolute left-0 flex items-center justify-center w-12 h-12 rounded-full ${config.bgColor}`}
                      >
                        <Icon className={`h-6 w-6 ${config.color}`} />
                      </div>

                      {/* Tarjeta del evento */}
                      <Card className="border-l-4" style={{ borderLeftColor: config.color.replace("text-", "") }}>
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            {/* Header del evento */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge className={config.bgColor + " " + config.color}>
                                    {config.label}
                                  </Badge>
                                  {event.versionNumber && (
                                    <Badge variant="outline">
                                      V{event.versionNumber}
                                    </Badge>
                                  )}
                                </div>
                                <p className="font-medium">{event.description}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleExpanded(event.id)}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </Button>
                            </div>

                            {/* Metadata básica */}
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  {format(new Date(event.eventDate), "PPP 'a las' p", { locale: es })}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>{event.userName || "Desconocido"}</span>
                              </div>
                            </div>

                            {/* Detalles expandibles */}
                            {isExpanded && event.metadata && (
                              <div className="mt-4 pt-4 border-t space-y-2">
                                <p className="text-sm font-medium">Detalles Adicionales:</p>
                                <div className="text-sm text-muted-foreground space-y-1">
                                  {event.metadata.title && (
                                    <p><span className="font-medium">Título:</span> {event.metadata.title}</p>
                                  )}
                                  {event.metadata.role && (
                                    <p><span className="font-medium">Rol:</span> {event.metadata.role}</p>
                                  )}
                                  {event.metadata.roleDescription && (
                                    <p><span className="font-medium">Descripción del Rol:</span> {event.metadata.roleDescription}</p>
                                  )}
                                  {event.metadata.comments && (
                                    <p><span className="font-medium">Comentarios:</span> {event.metadata.comments}</p>
                                  )}
                                  {event.metadata.status && (
                                    <p><span className="font-medium">Estado:</span> {event.metadata.status}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
              </div>

              {/* Paginación */}
              {historyData.hasMore && (
                <div className="mt-6 text-center">
                  <Button
                    variant="outline"
                    onClick={() => setOffset(prev => prev + 50)}
                  >
                    Cargar Más Eventos
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
