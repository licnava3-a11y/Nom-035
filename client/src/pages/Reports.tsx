import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, BarChart3, Download, FileText, RefreshCw, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const pieColors = ["#dc2626", "#f59e0b", "#eab308", "#6b7280", "#2563eb"];

function ChartEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[300px] items-center justify-center px-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

export default function Reports() {
  const { data: metrics, isLoading, error, refetch } = trpc.dashboard.getReportsMetrics.useQuery();
  const stats = metrics?.stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes y Métricas</h1>
          <p className="mt-2 text-muted-foreground">Indicadores consolidados a partir de registros persistidos del sistema.</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          Actualizar métricas
        </Button>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col justify-between gap-3 pt-6 sm:flex-row sm:items-center">
            <p className="text-sm text-destructive">No fue posible cargar métricas verificables. Intenta actualizar de nuevo.</p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>Reintentar</Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard title="Capacitaciones" value={stats?.completedTrainings} description="Asignaciones completadas" icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} loading={isLoading} />
        <MetricCard title="Participantes" value={stats?.trainedParticipants} description="Asignaciones de personal completadas" icon={<Users className="h-4 w-4 text-muted-foreground" />} loading={isLoading} />
        <MetricCard title="Casos atendidos" value={stats?.resolvedCases} description="Resueltos o cerrados" icon={<AlertCircle className="h-4 w-4 text-muted-foreground" />} loading={isLoading} />
        <MetricCard title="Cumplimiento NOM-035" value={stats ? `${stats.nom035Compliance}%` : undefined} description="Respuestas concluidas / empleados activos" icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />} loading={isLoading} />
      </div>

      {!isLoading && !error && !metrics?.hasData && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aún no hay registros suficientes para calcular métricas. Las gráficas se habilitarán al registrar empleados, encuestas, capacitaciones o casos.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Progreso de Capacitación" description="Asignaciones completadas y en progreso registradas">
          {metrics?.training.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.training}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="completadas" fill="#10b981" name="Completadas" />
                <Bar dataKey="enProgreso" fill="#3b82f6" name="En progreso" />
              </BarChart>
            </ResponsiveContainer>
          ) : <ChartEmptyState message="No hay asignaciones de capacitación registradas." />}
        </ChartCard>

        <ChartCard title="Distribución de Casos" description="Casos de riesgo psicosocial por tipo">
          {metrics?.cases.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={metrics.cases} cx="50%" cy="50%" outerRadius={88} dataKey="value" nameKey="name" label>
                  {metrics.cases.map((entry, index) => <Cell key={`${entry.name}-${index}`} fill={pieColors[index % pieColors.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : <ChartEmptyState message="No hay casos registrados para visualizar." />}
        </ChartCard>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Cumplimiento NOM-035" description="Porcentaje actual de respuestas concluidas">
          {metrics?.compliance.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics.compliance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cumplimiento" stroke="#10b981" strokeWidth={2} name="Cumplimiento %" />
              </LineChart>
            </ResponsiveContainer>
          ) : <ChartEmptyState message="No hay respuestas NOM-035 concluidas." />}
        </ChartCard>

        <ChartCard title="Cursos por Categoría" description="Cursos publicados registrados por categoría">
          {metrics?.categories.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metrics.categories} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="categoria" type="category" width={120} />
                <Tooltip />
                <Legend />
                <Bar dataKey="cantidad" fill="#3b82f6" name="Cursos publicados" />
              </BarChart>
            </ResponsiveContainer>
          ) : <ChartEmptyState message="No hay cursos publicados registrados." />}
        </ChartCard>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Reportes Disponibles</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <ReportCard title="Reporte de Capacitación" description="Listado de capacitaciones, asignaciones y certificaciones" pdf="/api/export/training/pdf" excel="/api/export/training/excel" />
          <ReportCard title="Reporte de Casos" description="Estadísticas y seguimiento de casos de riesgo psicosocial" pdf="/api/export/cases/pdf" excel="/api/export/cases/excel" icon={<AlertCircle className="h-6 w-6 text-primary" />} />
          <ReportCard title="Reporte de Cumplimiento" description="Indicadores NOM-035 y áreas de mejora" pdf="/api/export/compliance/pdf" excel="/api/export/compliance/excel" icon={<BarChart3 className="h-6 w-6 text-primary" />} />
          <ReportCard title="Reporte de Participantes" description="Progreso individual y certificaciones por empleado" pdf="/api/export/training/pdf" excel="/api/export/training/excel" icon={<Users className="h-6 w-6 text-primary" />} />
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, description, icon, loading }: { title: string; value: string | number | undefined; description: string; icon: React.ReactNode; loading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">{title}</CardTitle>{icon}</CardHeader>
      <CardContent><div className="text-2xl font-bold">{loading ? "…" : value ?? "—"}</div><p className="text-xs text-muted-foreground">{description}</p></CardContent>
    </Card>
  );
}

function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent>{children}</CardContent></Card>;
}

function ReportCard({ title, description, pdf, excel, icon = <FileText className="h-6 w-6 text-primary" /> }: { title: string; description: string; pdf: string; excel: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><div className="flex items-start gap-4"><div className="rounded-lg bg-primary/10 p-2">{icon}</div><div><CardTitle className="text-lg">{title}</CardTitle><CardDescription className="mt-1">{description}</CardDescription></div></div></CardHeader>
      <CardContent><div className="flex gap-2"><Button variant="outline" size="sm" onClick={() => window.open(pdf, "_blank", "noopener,noreferrer")}><Download className="mr-2 h-4 w-4" />PDF</Button><Button variant="outline" size="sm" onClick={() => window.open(excel, "_blank", "noopener,noreferrer")}><Download className="mr-2 h-4 w-4" />Excel</Button></div></CardContent>
    </Card>
  );
}
