/**
 * Panel de Estado de Jobs Automáticos — /admin/jobs
 * Muestra el historial de ejecución, notificaciones enviadas/omitidas,
 * duración promedio y permite ejecutar jobs manualmente.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Activity,
  Bell,
  BellOff,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  RefreshCw,
  AlertTriangle,
  Zap,
} from "lucide-react";

// Etiquetas legibles para cada job
const JOB_LABELS: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
  "stale-cases": {
    label: "Casos Estancados",
    description: "Detecta casos abiertos sin seguimiento por más de 7 días (críticos: 3 días). Deduplicación 24h.",
    icon: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  },
  "survey-alerts": {
    label: "Alertas de Encuestas",
    description: "Verifica cobertura de encuestas NOM-035 y trabajadores con respuestas pendientes por 2+ días.",
    icon: <Bell className="h-4 w-4 text-blue-500" />,
  },
  "departments-without-manager": {
    label: "Departamentos sin Manager",
    description: "Detecta departamentos activos sin responsable asignado por más de 30 días.",
    icon: <Activity className="h-4 w-4 text-purple-500" />,
  },
  "security-alerts": {
    label: "Alertas de Seguridad",
    description: "Analiza accesos sospechosos: descargas masivas, IPs desconocidas, accesos fuera de horario.",
    icon: <Zap className="h-4 w-4 text-red-500" />,
  },
};

function StatusBadge({ status }: { status: string }) {
  if (status === "success") return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Exitoso</Badge>;
  if (status === "error") return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-3 w-3 mr-1" />Error</Badge>;
  if (status === "skipped") return <Badge className="bg-gray-100 text-gray-600 border-gray-200"><BellOff className="h-3 w-3 mr-1" />Omitido</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminJobs() {
  const { toast } = useToast();
  const [selectedJob, setSelectedJob] = useState<string>("all");

  const { data: summary, refetch: refetchSummary, isLoading: summaryLoading } =
    trpc.jobMonitoring.getJobStatusSummary.useQuery(undefined, { refetchInterval: 30000 });

  const { data: logs, refetch: refetchLogs, isLoading: logsLoading } =
    trpc.jobMonitoring.getJobExecutionLog.useQuery(
      { jobName: selectedJob === "all" ? undefined : selectedJob, limit: 50 },
      { refetchInterval: 30000 }
    );

  const runStale = trpc.jobMonitoring.runStaleCasesJob.useMutation({
    onSuccess: () => { toast({ title: "Job ejecutado", description: "Casos estancados verificados." }); refetchSummary(); refetchLogs(); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const runSurvey = trpc.jobMonitoring.runSurveyAlertsJob.useMutation({
    onSuccess: () => { toast({ title: "Job ejecutado", description: "Alertas de encuestas verificadas." }); refetchSummary(); refetchLogs(); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const runDepts = trpc.jobMonitoring.runDepartmentsJob.useMutation({
    onSuccess: () => { toast({ title: "Job ejecutado", description: "Departamentos sin manager verificados." }); refetchSummary(); refetchLogs(); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const runSecurity = trpc.jobMonitoring.runSecurityJob.useMutation({
    onSuccess: () => { toast({ title: "Job ejecutado", description: "Alertas de seguridad verificadas." }); refetchSummary(); refetchLogs(); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const runMutations: Record<string, () => void> = {
    "stale-cases": () => runStale.mutate(),
    "survey-alerts": () => runSurvey.mutate(),
    "departments-without-manager": () => runDepts.mutate(),
    "security-alerts": () => runSecurity.mutate(),
  };

  const isRunning = (jobName: string) => {
    if (jobName === "stale-cases") return runStale.isPending;
    if (jobName === "survey-alerts") return runSurvey.isPending;
    if (jobName === "departments-without-manager") return runDepts.isPending;
    if (jobName === "security-alerts") return runSecurity.isPending;
    return false;
  };

  const handleRefresh = () => { refetchSummary(); refetchLogs(); };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Monitor de Jobs Automáticos</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Estado en tiempo real de los procesos automáticos del sistema NOM-035
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </div>

        {/* Tarjetas de resumen por job */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Object.entries(JOB_LABELS).map(([jobKey, jobInfo]) => {
            const stat = summary?.find((s) => s.jobName === jobKey);
            const running = isRunning(jobKey);
            return (
              <Card key={jobKey} className="border">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {jobInfo.icon}
                      <CardTitle className="text-sm font-semibold">{jobInfo.label}</CardTitle>
                    </div>
                    {stat && (
                      <StatusBadge status={stat.errorCount > 0 ? "error" : "success"} />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-tight">{jobInfo.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {summaryLoading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  ) : stat ? (
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />Última ejecución</span>
                        <span className="font-medium text-foreground">{formatDate(stat.lastExecutedAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1"><Bell className="h-3 w-3" />Enviadas (total)</span>
                        <span className="font-medium text-green-700">{stat.totalSent.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1"><BellOff className="h-3 w-3" />Omitidas (24h dedup)</span>
                        <span className="font-medium text-blue-700">{stat.totalSkipped.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ejecuciones</span>
                        <span className="font-medium">{stat.totalRuns} · {formatDuration(stat.avgDurationMs)} prom.</span>
                      </div>
                      {stat.errorCount > 0 && (
                        <div className="flex justify-between text-red-600">
                          <span>Errores</span>
                          <span className="font-medium">{stat.errorCount}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sin ejecuciones registradas aún</p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-2 mt-2"
                    onClick={() => runMutations[jobKey]?.()}
                    disabled={running}
                  >
                    {running ? (
                      <><RefreshCw className="h-3 w-3 animate-spin" />Ejecutando...</>
                    ) : (
                      <><Play className="h-3 w-3" />Ejecutar ahora</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Historial de ejecuciones */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Historial de Ejecuciones</CardTitle>
              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger className="w-52">
                  <SelectValue placeholder="Todos los jobs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los jobs</SelectItem>
                  {Object.entries(JOB_LABELS).map(([key, info]) => (
                    <SelectItem key={key} value={key}>{info.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse h-10 bg-muted rounded" />
                ))}
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Sin ejecuciones registradas aún.</p>
                <p className="text-xs mt-1">Los jobs se registrarán automáticamente en la próxima ejecución.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Enviadas</TableHead>
                      <TableHead className="text-right">Omitidas</TableHead>
                      <TableHead className="text-right">Procesados</TableHead>
                      <TableHead className="text-right">Duración</TableHead>
                      <TableHead>Ejecutado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium text-sm">
                          <div className="flex items-center gap-2">
                            {JOB_LABELS[log.jobName]?.icon}
                            {JOB_LABELS[log.jobName]?.label ?? log.jobName}
                          </div>
                        </TableCell>
                        <TableCell><StatusBadge status={log.status} /></TableCell>
                        <TableCell className="text-right text-green-700 font-medium">{log.notificationsSent}</TableCell>
                        <TableCell className="text-right text-blue-600">{log.notificationsSkipped}</TableCell>
                        <TableCell className="text-right">{log.itemsProcessed}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatDuration(log.durationMs)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{formatDate(log.executedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
