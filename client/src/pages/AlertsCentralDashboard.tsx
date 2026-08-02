/**
 * AlertsCentralDashboard — Vista unificada del sistema de alertas.
 * Fusiona: AlertsDashboard + AlertAdminDashboard + AlertMetricsDashboard + IntelligentAlertsDashboard
 * Rutas eliminadas: /alerts-dashboard, /alert-admin-dashboard, /alert-metrics, /intelligent-alerts
 * Ruta canónica: /alerts-central
 */
import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle, Bell, BellOff, CheckCircle2, ExternalLink, Filter,
  Settings, Mail, Users, Save, Plus, Trash2, Clock, Shield, Send,
  BarChart2, TrendingUp, Brain, Zap, Activity
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

// ─── Helpers ────────────────────────────────────────────────────────────────
const PRIORITY_BADGE: Record<string, React.ReactElement> = {
  critical: <Badge className="bg-red-100 text-red-800 border-red-300">Crítico</Badge>,
  high:     <Badge className="bg-orange-100 text-orange-800 border-orange-300">Alto</Badge>,
  medium:   <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Medio</Badge>,
  low:      <Badge className="bg-blue-100 text-blue-800 border-blue-300">Bajo</Badge>,
};
const CATEGORY_BADGE: Record<string, React.ReactElement> = {
  departmental: <Badge variant="outline">Departamental</Badge>,
  survey:       <Badge variant="outline">Encuesta</Badge>,
  case:         <Badge variant="outline">Caso</Badge>,
};
const fmt = (d: Date | string) =>
  new Date(d).toLocaleString("es-MX", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

const ALERT_TYPE_LABELS: Record<string, string> = {
  critical_cases: "Casos críticos abiertos",
  low_coverage: "Cobertura baja de encuestas (%)",
  excellent_compliance: "Cumplimiento excelente (%)",
};
const FREQ_OPTIONS = [
  { value: "disabled", label: "Desactivado" },
  { value: "daily", label: "Diario (09:00 AM)" },
  { value: "weekly", label: "Semanal (lunes 09:00 AM)" },
  { value: "monthly", label: "Mensual (día 1 a las 09:00 AM)" },
];
const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#3b82f6", "#6b7280"];

// ─── Pestaña 1: Alertas operativas ──────────────────────────────────────────
function TabAlertas() {
  const [category, setCategory] = useState<"all" | "departmental" | "survey" | "case">("all");
  const [priority, setPriority] = useState<"all" | "low" | "medium" | "high" | "critical">("all");
  const [status, setStatus] = useState<"all" | "active" | "resolved" | "silenced">("active");
  const { data, refetch } = trpc.alertsDashboard.getConsolidatedAlerts.useQuery({ category, priority, status });
  const resolveAlert = trpc.alertsDashboard.resolveAlert.useMutation({ onSuccess: () => { toast.success("Alerta resuelta"); refetch(); }, onError: (e) => toast.error(e.message) });
  const silenceAlert = trpc.alertsDashboard.silenceAlert.useMutation({ onSuccess: () => { toast.success("Alerta silenciada 24h"); refetch(); }, onError: (e) => toast.error(e.message) });

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold">{data?.total ?? 0}</div></CardContent></Card>
        <Card className="border-red-200 bg-red-50"><CardHeader className="pb-2"><CardTitle className="text-sm text-red-700">Críticas</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-red-700">{data?.criticalCount ?? 0}</div></CardContent></Card>
        <Card className="border-orange-200 bg-orange-50"><CardHeader className="pb-2"><CardTitle className="text-sm text-orange-700">Altas</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-orange-700">{data?.highCount ?? 0}</div></CardContent></Card>
        <Card className="border-yellow-200 bg-yellow-50"><CardHeader className="pb-2"><CardTitle className="text-sm text-yellow-700">Medias</CardTitle></CardHeader><CardContent><div className="text-3xl font-bold text-yellow-700">{data?.mediumCount ?? 0}</div></CardContent></Card>
      </div>
      {/* Filtros */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Filter className="h-4 w-4" />Filtros</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {[
              { label: "Categoría", value: category, setter: setCategory, opts: [["all","Todas"],["departmental","Departamental"],["survey","Encuesta"],["case","Caso"]] },
              { label: "Prioridad", value: priority, setter: setPriority, opts: [["all","Todas"],["critical","Crítico"],["high","Alto"],["medium","Medio"],["low","Bajo"]] },
              { label: "Estado", value: status, setter: setStatus, opts: [["all","Todos"],["active","Activas"],["resolved","Resueltas"],["silenced","Silenciadas"]] },
            ].map(({ label, value, setter, opts }) => (
              <div key={label} className="flex-1 min-w-[180px]">
                <label className="text-xs font-medium mb-1 block">{label}</label>
                <Select value={value} onValueChange={(v) => (setter as any)(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {/* Tabla */}
      <Card>
        <CardHeader><CardTitle>Alertas ({data?.total ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {data?.alerts?.length ? (
            <Table>
              <TableHeader><TableRow><TableHead>Prioridad</TableHead><TableHead>Categoría</TableHead><TableHead>Título</TableHead><TableHead>Fecha</TableHead><TableHead className="text-right">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {data.alerts.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell>{PRIORITY_BADGE[a.priority] ?? <Badge>{a.priority}</Badge>}</TableCell>
                    <TableCell>{CATEGORY_BADGE[a.category] ?? <Badge variant="outline">{a.category}</Badge>}</TableCell>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmt(a.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {a.actionUrl && <Link href={a.actionUrl}><Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4" /></Button></Link>}
                        <Button variant="ghost" size="sm" onClick={() => resolveAlert.mutate({ alertId: a.id })} disabled={resolveAlert.isPending}><CheckCircle2 className="h-4 w-4 text-green-600" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => silenceAlert.mutate({ alertId: a.id, duration: 24 })} disabled={silenceAlert.isPending}><BellOff className="h-4 w-4 text-gray-500" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No hay alertas con los filtros seleccionados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Pestaña 2: Métricas y tendencias ───────────────────────────────────────
function TabMetricas() {
  const [months, setMonths] = useState(6);
  const { data: stats } = trpc.alerts.getStats.useQuery();
  const { data: trends } = trpc.alerts.getTrends.useQuery({ months });
  const { data: resolution } = trpc.alerts.getResolutionMetrics.useQuery();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Alertas", value: stats?.totalAlerts ?? 0 },
          { label: "Activas", value: stats?.activeAlerts ?? 0, cls: "text-orange-600" },
          { label: "Resueltas", value: stats?.resolvedAlerts ?? 0, cls: "text-green-600" },
          { label: "Tasa Resolución", value: stats?.totalAlerts ? `${Math.round(((stats?.resolvedAlerts ?? 0) / stats.totalAlerts) * 100)}%` : "0%", cls: "text-blue-600" },
        ].map(({ label, value, cls }) => (
          <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><div className={`text-3xl font-bold ${cls ?? ""}`}>{value}</div></CardContent></Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tendencia histórica</CardTitle>
            <div className="flex gap-2">
              {[3, 6, 12].map(m => <Button key={m} size="sm" variant={months === m ? "default" : "outline"} onClick={() => setMonths(m)}>{m}m</Button>)}
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trends ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="total" stroke="#3b82f6" name="Total" />
                <Line type="monotone" dataKey="resolved" stroke="#22c55e" name="Resueltas" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Distribución por prioridad</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={[{ priority: "Críticos", count: stats?.criticalCases ?? 0 }, { priority: "Baja cobertura", count: stats?.lowCoverage ?? 0 }, { priority: "Excelente", count: stats?.excellentCompliance ?? 0 }]} dataKey="count" nameKey="priority" cx="50%" cy="50%" outerRadius={80} label={({ priority, percent }: any) => `${priority} ${(percent * 100).toFixed(0)}%`}>
                  {[0,1,2].map((i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {resolution && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Tiempo promedio de resolución (horas)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={resolution?.byType ? Object.entries(resolution.byType as Record<string, number>).map(([type, avgHours]) => ({ type, avgHours })) : []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="avgHours" fill="#6366f1" name="Horas promedio" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Pestaña 3: Alertas inteligentes con IA ─────────────────────────────────
function TabIA() {
  const utils = trpc.useUtils();
  const [filterType, setFilterType] = useState<"all" | "anomaly" | "pattern" | "prediction">("all");
  const [filterSeverity, setFilterSeverity] = useState<"all" | "low" | "medium" | "high" | "critical">("all");
  const { data: dashboard } = trpc.intelligentAlerts.getDashboard.useQuery();
  const { data: alerts, refetch } = trpc.intelligentAlerts.list.useQuery({ alertType: filterType === "all" ? undefined : (filterType as any), severity: filterSeverity === "all" ? undefined : filterSeverity });
  const runAnalysis = trpc.intelligentAlerts.runPredictiveAnalysis.useMutation({ onSuccess: () => { toast.success("Análisis completado"); utils.intelligentAlerts.getDashboard.invalidate(); refetch(); }, onError: (e) => toast.error(e.message) });
  const resolveAlert = trpc.intelligentAlerts.resolve.useMutation({ onSuccess: () => { toast.success("Alerta resuelta"); refetch(); }, onError: (e: any) => toast.error(e.message) });
  const dismissAlert = trpc.intelligentAlerts.dismiss.useMutation({ onSuccess: () => { toast.success("Alerta descartada"); refetch(); }, onError: (e: any) => toast.error(e.message) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Detección proactiva de patrones de riesgo emergentes mediante IA</p>
        <Button onClick={() => runAnalysis.mutate()} disabled={runAnalysis.isPending} className="gap-2">
          <Zap className="h-4 w-4" />{runAnalysis.isPending ? "Analizando..." : "Ejecutar análisis IA"}
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Activas", value: dashboard?.activeCount ?? 0, cls: "text-orange-600" },
          { label: "Críticas", value: dashboard?.criticalCount ?? 0, cls: "text-red-600" },
          { label: "Resueltas", value: dashboard?.resolvedCount ?? 0, cls: "text-green-600" },
          { label: "Tasa resolución", value: dashboard?.resolutionRate != null ? `${dashboard.resolutionRate}%` : "0%", cls: "text-blue-600" },
        ].map(({ label, value, cls }) => (
          <Card key={label}><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent><div className={`text-3xl font-bold ${cls}`}>{value}</div></CardContent></Card>
        ))}
      </div>
      <div className="flex gap-3">
        {[
          { label: "Tipo", value: filterType, setter: setFilterType, opts: [["all","Todos"],["anomaly","Anomalía"],["pattern","Patrón"],["prediction","Predicción"]] },
          { label: "Severidad", value: filterSeverity, setter: setFilterSeverity, opts: [["all","Todas"],["critical","Crítica"],["high","Alta"],["medium","Media"],["low","Baja"]] },
        ].map(({ label, value, setter, opts }) => (
          <div key={label} className="flex-1">
            <label className="text-xs font-medium mb-1 block">{label}</label>
            <Select value={value} onValueChange={(v) => (setter as any)(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{opts.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {alerts?.map((alert: any) => (
          <Card key={alert.id} className={alert.severity === "critical" ? "border-red-200 bg-red-50/30" : alert.severity === "high" ? "border-orange-200 bg-orange-50/30" : ""}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {PRIORITY_BADGE[alert.severity] ?? <Badge>{alert.severity}</Badge>}
                    <Badge variant="outline" className="text-xs">{alert.type}</Badge>
                    <span className="text-xs text-muted-foreground">{fmt(alert.createdAt)}</span>
                  </div>
                  <p className="font-medium text-sm">{alert.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                  {alert.recommendation && <p className="text-xs text-blue-700 mt-1 bg-blue-50 rounded px-2 py-1">💡 {alert.recommendation}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => resolveAlert.mutate({ id: alert.id, resolutionNotes: "Resuelta desde dashboard" })} disabled={resolveAlert.isPending}><CheckCircle2 className="h-4 w-4 text-green-600" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => dismissAlert.mutate({ id: alert.id, reason: "Descartada desde dashboard" })} disabled={dismissAlert.isPending}><BellOff className="h-4 w-4 text-gray-500" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {!alerts?.length && (
          <div className="text-center py-10 text-muted-foreground">
            <Brain className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>No hay alertas inteligentes activas</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pestaña 4: Configuración ────────────────────────────────────────────────
function TabConfiguracion() {
  const utils = trpc.useUtils();
  const { data: thresholds = [], isLoading: loadingThresholds } = trpc.alertThresholds.getAll.useQuery();
  const [thresholdValues, setThresholdValues] = useState<Record<string, number>>({});
    const [scheduleValues, setScheduleValues] = useState<Record<string, string>>({});
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState("");
  useEffect(() => {
    if (thresholds.length > 0) {
      const vals: Record<string, number> = {};
      thresholds.forEach((t: any) => { vals[t.alertType] = t.threshold; });
      setThresholdValues(vals);
    }
  }, [thresholds]);
  const updateThreshold = trpc.alertThresholds.update.useMutation({ onSuccess: () => { toast.success("Umbral actualizado"); utils.alertThresholds.getAll.invalidate(); }, onError: (e: any) => toast.error(e.message) });

  return (
    <div className="space-y-6">
      {/* Umbrales */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Shield className="h-4 w-4" />Umbrales de Alerta</CardTitle><CardDescription>Configura los valores que disparan cada tipo de alerta</CardDescription></CardHeader>
        <CardContent>
          {loadingThresholds ? <p className="text-sm text-muted-foreground">Cargando...</p> : (
            <div className="space-y-3">
              {thresholds.map((t: any) => (
                <div key={t.id} className="flex items-center gap-4">
                  <Label className="flex-1 text-sm">{ALERT_TYPE_LABELS[t.alertType] ?? t.alertType}</Label>
                  <Input type="number" className="w-28" value={thresholdValues[t.alertType] ?? t.threshold} onChange={(e) => setThresholdValues(p => ({ ...p, [t.alertType]: parseFloat(e.target.value) }))} />
                  <Button size="sm" onClick={() => updateThreshold.mutate({ alertType: t.alertType, threshold: thresholdValues[t.alertType] ?? t.threshold })} disabled={updateThreshold.isPending}><Save className="h-4 w-4" /></Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Frecuencia de reportes */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4" />Frecuencia de Reportes</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {FREQ_OPTIONS.filter(o => o.value !== "disabled").map(opt => (
              <div key={opt.value} className="flex items-center gap-4">
                <Label className="flex-1 text-sm">{opt.label}</Label>
                <Select value={scheduleValues[opt.value] ?? "disabled"} onValueChange={(v) => setScheduleValues(p => ({ ...p, [opt.value]: v }))}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQ_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Destinatarios */}
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4" />Destinatarios de Alertas</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="correo@empresa.com" value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newRecipient.trim()) { setRecipients(p => [...p, newRecipient.trim()]); setNewRecipient(""); } }} />
            <Button size="sm" onClick={() => { if (newRecipient.trim()) { setRecipients(p => [...p, newRecipient.trim()]); setNewRecipient(""); } }}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-1">
            {recipients.map((r, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded border bg-muted/30 text-sm">
                <span>{r}</span>
                <Button size="sm" variant="ghost" onClick={() => setRecipients(p => p.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3 text-red-500" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function AlertsCentralDashboard() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-orange-500" />
          Centro de Alertas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vista unificada: alertas operativas, métricas, IA predictiva y configuración
        </p>
      </div>

      <Tabs defaultValue="alertas">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="alertas" className="gap-1.5"><AlertCircle className="h-4 w-4" />Alertas</TabsTrigger>
          <TabsTrigger value="metricas" className="gap-1.5"><BarChart2 className="h-4 w-4" />Métricas</TabsTrigger>
          <TabsTrigger value="ia" className="gap-1.5"><Brain className="h-4 w-4" />IA Predictiva</TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5"><Settings className="h-4 w-4" />Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="alertas"><TabAlertas /></TabsContent>
        <TabsContent value="metricas"><TabMetricas /></TabsContent>
        <TabsContent value="ia"><TabIA /></TabsContent>
        <TabsContent value="config"><TabConfiguracion /></TabsContent>
      </Tabs>
    </div>
  );
}
