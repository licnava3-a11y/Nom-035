import { Badge } from "@/components/ui/badge";
import { AlertCircle, Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  const prevAlertRef = useRef<typeof lastAlert>(null);

  // Acumular alertas WebSocket en tiempo real
  useEffect(() => {
    if (lastAlert && lastAlert !== prevAlertRef.current) {
      prevAlertRef.current = lastAlert;
      setRealtimeAlerts((prev) => {
        if (prev.some((a) => a.id === lastAlert.id)) return prev;
        return [...prev, { id: lastAlert.id, alertType: lastAlert.alertType, description: lastAlert.description, priority: lastAlert.priority, receivedAt: new Date() }];
      });
    }
  }, [lastAlert]);

  const { data: activeAlerts } = trpc.alerts.getHistory.useQuery({ status: "active" });
  const dbAlertCount = activeAlerts?.length ?? 0;
  const realtimeCount = realtimeAlerts.length;
  const totalCount = dbAlertCount + realtimeCount;
  const hasCriticalAlerts = activeAlerts?.some((a) => a.alertType === "critical_cases") || realtimeAlerts.some((a) => a.priority === "critical");

  if (totalCount === 0) return null;

  const tooltipLines = [
    ...(dbAlertCount > 0 ? [`${dbAlertCount} alerta${dbAlertCount !== 1 ? "s" : ""} activa${dbAlertCount !== 1 ? "s" : ""} en sistema`] : []),
    ...realtimeAlerts.slice(-3).map((a) => `⚡ ${a.description}`),
  ];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => { setRealtimeAlerts([]); setLocation("/alert-history"); }}
          className={`relative flex items-center gap-1.5 px-2.5 py-2 rounded-lg hover:bg-accent transition-colors ${hasCriticalAlerts ? "animate-pulse" : ""}`}
          title="Ver alertas"
        >
          {realtimeCount > 0
            ? <Bell className={`h-5 w-5 ${hasCriticalAlerts ? "text-destructive" : "text-orange-500"}`} />
            : <AlertCircle className={`h-5 w-5 ${hasCriticalAlerts ? "text-destructive" : "text-orange-500"}`} />}
          <Badge variant={hasCriticalAlerts ? "destructive" : "secondary"} className="h-5 min-w-[20px] px-1.5 text-xs font-semibold">
            {totalCount}
          </Badge>
          {realtimeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs">
        <div className="space-y-1 text-xs">
          {tooltipLines.map((line, i) => <p key={i}>{line}</p>)}
          {realtimeCount > 0 && <p className="text-muted-foreground pt-1">Haz clic para ver y limpiar alertas en tiempo real</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
