import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, RefreshCw, CheckCircle2, XCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function JobMonitoringDashboard() {
  const [selectedJob, setSelectedJob] = useState<string | undefined>(undefined);
  const [selectedStatus, setSelectedStatus] = useState<"running" | "success" | "failed" | undefined>(undefined);
  const [page, setPage] = useState(0);
  const limit = 20;

  // Queries
  const { data: executions, refetch: refetchExecutions } = trpc.jobMonitoring.getJobExecutions.useQuery({
    jobName: selectedJob,
    status: selectedStatus,
    limit,
    offset: page * limit,
  });

  const { data: stats, refetch: refetchStats } = trpc.jobMonitoring.getJobStats.useQuery();

  // Mutations
  const runPostCaseSurveys = trpc.jobMonitoring.runPostCaseSurveysJob.useMutation({
    onSuccess: () => {
      toast.success("Job ejecutado exitosamente");
      refetchExecutions();
      refetchStats();
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const runDepartmentalAlerts = trpc.jobMonitoring.runDepartmentalAlertsJob.useMutation({
    onSuccess: () => {
      toast.success("Job ejecutado exitosamente");
      refetchExecutions();
      refetchStats();
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const runSurveyReminders = trpc.jobMonitoring.runSurveyRemindersJob.useMutation({
    onSuccess: () => {
      toast.success("Job ejecutado exitosamente");
      refetchExecutions();
      refetchStats();
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "success":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="w-3 h-3 mr-1" />Éxito</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Fallido</Badge>;
      case "running":
        return <Badge className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Ejecutando</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "N/A";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Monitoreo de Jobs</h1>
        <p className="text-muted-foreground mt-2">
          Historial de ejecuciones, estadísticas y control manual de jobs automáticos
        </p>
      </div>

      {/* Estadísticas por Job */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats?.map((stat) => (
          <Card key={stat.jobName}>
            <CardHeader>
              <CardTitle className="text-lg">{stat.jobName}</CardTitle>
              <CardDescription>Últimas 24 horas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ejecuciones</span>
                <span className="font-semibold">{stat.totalExecutions}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Tasa de éxito</span>
                <span className="font-semibold text-green-600">{stat.successRate}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Duración promedio</span>
                <span className="font-semibold">{formatDuration(stat.avgDuration)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Última ejecución</span>
                <span className="text-xs">{stat.lastExecution ? formatDate(stat.lastExecution) : "N/A"}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Botones de Ejecución Manual */}
      <Card>
        <CardHeader>
          <CardTitle>Ejecución Manual de Jobs</CardTitle>
          <CardDescription>
            Ejecutar jobs manualmente para testing o troubleshooting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => runPostCaseSurveys.mutate()}
              disabled={runPostCaseSurveys.isPending}
            >
              {runPostCaseSurveys.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Post-Case Surveys
            </Button>
            <Button
              onClick={() => runDepartmentalAlerts.mutate()}
              disabled={runDepartmentalAlerts.isPending}
            >
              {runDepartmentalAlerts.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Departmental Alerts
            </Button>
            <Button
              onClick={() => runSurveyReminders.mutate()}
              disabled={runSurveyReminders.isPending}
            >
              {runSurveyReminders.isPending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Survey Reminders
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Historial de Ejecuciones */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Ejecuciones</CardTitle>
          <CardDescription>
            Registro detallado de todas las ejecuciones de jobs
          </CardDescription>
          <div className="flex gap-3 mt-4">
            <Select value={selectedJob || "all"} onValueChange={(v) => setSelectedJob(v === "all" ? undefined : v)}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filtrar por job" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los jobs</SelectItem>
                <SelectItem value="post-case-surveys-job">Post-Case Surveys</SelectItem>
                <SelectItem value="departmental-alerts-job">Departmental Alerts</SelectItem>
                <SelectItem value="survey-reminders-job">Survey Reminders</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedStatus || "all"} onValueChange={(v) => setSelectedStatus(v === "all" ? undefined : v as any)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="success">Éxito</SelectItem>
                <SelectItem value="failed">Fallido</SelectItem>
                <SelectItem value="running">Ejecutando</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Inicio</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions?.executions.map((exec) => (
                <TableRow key={exec.id}>
                  <TableCell className="font-medium">{exec.jobName}</TableCell>
                  <TableCell>{getStatusBadge(exec.status)}</TableCell>
                  <TableCell>{formatDate(exec.startedAt)}</TableCell>
                  <TableCell>{formatDuration(exec.duration)}</TableCell>
                  <TableCell>
                    {exec.status === "failed" && exec.error ? (
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-sm truncate max-w-[300px]" title={exec.error}>
                          {exec.error}
                        </span>
                      </div>
                    ) : exec.result ? (
                      <span className="text-sm text-muted-foreground">
                        {JSON.stringify(exec.result).substring(0, 50)}...
                      </span>
                    ) : (
                      "N/A"
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Paginación */}
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-muted-foreground">
              Mostrando {page * limit + 1}-{Math.min((page + 1) * limit, executions?.total || 0)} de {executions?.total || 0}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!executions?.hasMore}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
