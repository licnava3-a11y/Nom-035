import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export function AlertBadge() {
  const [, setLocation] = useLocation();
  const { data: activeAlerts } = trpc.alerts.getHistory.useQuery({ status: "active" });
  
  const alertCount = activeAlerts?.length || 0;
  const hasCriticalAlerts = activeAlerts?.some(a => a.alertType === "critical_cases");
  
  if (alertCount === 0) return null;
  
  return (
    <button
      onClick={() => setLocation("/alert-history")}
      className={`relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors ${
        hasCriticalAlerts ? "animate-pulse" : ""
      }`}
      title="Ver histórico de alertas"
    >
      <AlertCircle className={`h-5 w-5 ${hasCriticalAlerts ? "text-destructive" : "text-orange-500"}`} />
      <Badge 
        variant={hasCriticalAlerts ? "destructive" : "secondary"}
        className="h-5 min-w-[20px] px-1.5 text-xs font-semibold"
      >
        {alertCount}
      </Badge>
    </button>
  );
}
