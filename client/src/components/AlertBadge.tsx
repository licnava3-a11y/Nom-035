import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Bell, CheckCheck, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";

interface RealtimeAlert {
  id: number;
  alertType: string;
  description: string;
  priority: string;
  receivedAt: Date;
}

export function AlertBadge() {
  const [, setLocation] = useLocation();
  const { lastAlert } = useWebSocket();
  const [realtimeAlerts, setRealtimeAlerts] = useState<RealtimeAlert[]>([]);
  const [open, setOpen] = useState(false);
  const prevAlertRef = useRef<typeof lastAlert>(null);
  const utils = trpc.useUtils();

  // Acumular alertas WebSocket en tiempo real
  useEffect(() => {
    if (lastAlert && lastAlert !== prevAlertRef.current) {
      prevAlertRef.current = lastAlert;
      setRealtimeAlerts(prev => {
        if (prev.some(a => a.id === lastAlert.id)) return prev;
        return [
          ...prev,
          {
            id: lastAlert.id,
            alertType: lastAlert.alertType,
            description: lastAlert.description,
            priority: lastAlert.priority,
            receivedAt: new Date(),
          },
        ];
      });
    }
  }, [lastAlert]);

  const { data: activeAlertsData } = trpc.alerts.getHistory.useQuery({
    status: "active",
    pageSize: 20,
  });
  const activeAlerts = activeAlertsData?.alerts;

  const markAllReadMutation = trpc.alerts.markAllRead.useMutation({
    onSuccess: () => {
      setRealtimeAlerts([]);
      utils.alerts.getHistory.invalidate();
      setOpen(false);
      toast({
        title: "Alertas marcadas como leídas",
        description: "Todas las alertas activas han sido resueltas.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron marcar las alertas.",
        variant: "destructive",
      });
    },
  });

  const dbAlertCount = activeAlertsData?.total ?? 0;
  const realtimeCount = realtimeAlerts.length;
  const totalCount = dbAlertCount + realtimeCount;
  const hasCriticalAlerts =
    activeAlerts?.some(a => a.alertType === "critical_cases") ||
    realtimeAlerts.some(a => a.priority === "critical");

  if (totalCount === 0) return null;

  // Combinar alertas para el dropdown (máx. 5)
  const rtSlice = realtimeAlerts.slice(-3);
  const dbSlice = (activeAlerts ?? []).slice(
    0,
    Math.max(0, 5 - rtSlice.length)
  );
  const previewAlerts = [
    ...rtSlice.map(a => ({
      id: a.id,
      description: a.description,
      priority: a.priority,
      source: "realtime" as const,
    })),
    ...dbSlice.map(a => ({
      id: a.id,
      description: a.description ?? "",
      priority: a.priority ?? "info",
      source: "db" as const,
    })),
  ];

  const priorityColor = (p: string) => {
    if (p === "critical") return "text-red-600";
    if (p === "warning") return "text-amber-600";
    return "text-blue-600";
  };

  const priorityDot = (p: string) => {
    if (p === "critical") return "bg-red-500";
    if (p === "warning") return "bg-amber-500";
    return "bg-blue-500";
  };

  const priorityLabel = (p: string) => {
    if (p === "critical") return "Crítica";
    if (p === "warning") return "Advertencia";
    return "Informativa";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg hover:bg-accent transition-colors ${hasCriticalAlerts ? "animate-pulse" : ""}`}
          title="Ver alertas"
        >
          {realtimeCount > 0 ? (
            <Bell
              className={`h-5 w-5 ${hasCriticalAlerts ? "text-destructive" : "text-orange-500"}`}
            />
          ) : (
            <AlertCircle
              className={`h-5 w-5 ${hasCriticalAlerts ? "text-destructive" : "text-orange-500"}`}
            />
          )}
          <Badge
            variant={hasCriticalAlerts ? "destructive" : "secondary"}
            className="h-5 min-w-[20px] px-1.5 text-xs font-semibold"
          >
            {totalCount}
          </Badge>
          {realtimeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent side="bottom" align="end" className="w-80 p-0">
        {/* Encabezado */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <p className="text-sm font-semibold">Alertas activas</p>
            <p className="text-xs text-muted-foreground">
              {totalCount} sin resolver
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs h-7 px-2"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            {markAllReadMutation.isPending ? "Marcando..." : "Marcar todas"}
          </Button>
        </div>

        {/* Lista de alertas */}
        <div className="divide-y max-h-64 overflow-y-auto">
          {previewAlerts.map(alert => (
            <div
              key={`${alert.source}-${alert.id}`}
              className="flex items-start gap-3 px-4 py-3"
            >
              <span
                className={`mt-1.5 flex-shrink-0 h-2 w-2 rounded-full ${priorityDot(alert.priority)}`}
              />
              <div className="min-w-0 flex-1">
                <p
                  className={`text-xs font-medium ${priorityColor(alert.priority)}`}
                >
                  {priorityLabel(alert.priority)}
                  {alert.source === "realtime" && (
                    <span className="ml-1 text-[10px] bg-orange-100 text-orange-700 px-1 rounded">
                      ⚡ Nuevo
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {alert.description}
                </p>
              </div>
            </div>
          ))}
          {totalCount > 5 && (
            <div className="px-4 py-2 text-xs text-muted-foreground text-center">
              y {totalCount - 5} alerta{totalCount - 5 !== 1 ? "s" : ""} más...
            </div>
          )}
        </div>

        {/* Pie */}
        <div className="px-4 py-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 text-xs"
            onClick={() => {
              setOpen(false);
              setLocation("/alert-history");
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver historial completo
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
