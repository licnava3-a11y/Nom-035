import { trpc } from "@/lib/trpc";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Calendar, AlertTriangle, MessageSquare, ClipboardCheck, TrendingUp, Printer } from "lucide-react";

export default function ExecutiveReport() {
  const { data: kpis, isLoading, refetch } = trpc.executiveReport.getKPIs.useQuery({});

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 animate-pulse" />
            <p>Generando reporte ejecutivo...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 print:p-4">
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
              Reporte Ejecutivo Consolidado
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              KPIs globales NOM-035 STPS — {new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>Actualizar</Button>
            <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Printer className="h-4 w-4 mr-2" />Imprimir / PDF
            </Button>
          </div>
        </div>

        <div className="hidden print:block border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold">Reporte Ejecutivo Consolidado NOM-035 STPS</h1>
          <p className="text-sm text-gray-600">Fecha: {new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        {kpis && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Empleados Activos",      value: kpis.employees.active,             total: kpis.employees.total,   icon: <Users className="h-5 w-5 text-blue-600" />,     color: "text-blue-700",   bg: "bg-blue-50" },
                { label: "Cursos Disponibles",     value: kpis.training.totalCourses,         total: null,                   icon: <BookOpen className="h-5 w-5 text-purple-600" />, color: "text-purple-700", bg: "bg-purple-50" },
                { label: "Tasa Capacitacion",      value: `${kpis.training.completionRate}%`, total: null,                   icon: <ClipboardCheck className="h-5 w-5 text-green-600" />, color: "text-green-700", bg: "bg-green-50" },
                { label: "Vacaciones Pendientes",  value: kpis.vacations.pending,             total: kpis.vacations.total,   icon: <Calendar className="h-5 w-5 text-orange-600" />, color: "text-orange-700", bg: "bg-orange-50" },
                { label: "Casos Abiertos NOM-035", value: kpis.cases.open,                   total: kpis.cases.total,       icon: <AlertTriangle className="h-5 w-5 text-red-600" />, color: "text-red-700",   bg: "bg-red-50" },
                { label: "Mensajes Pendientes",    value: kpis.mailbox.pending,               total: kpis.mailbox.total,     icon: <MessageSquare className="h-5 w-5 text-teal-600" />, color: "text-teal-700", bg: "bg-teal-50" },
              ].map(kpi => (
                <Card key={kpi.label} className={`${kpi.bg} border-0`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="mb-2">{kpi.icon}</div>
                    <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    {kpi.total !== null && <p className="text-xs text-muted-foreground">de {kpi.total} total</p>}
                    <p className="text-xs font-medium mt-1">{kpi.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />Fuerza Laboral
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Total de empleados",  value: kpis.employees.total },
                    { label: "Empleados activos",   value: `${kpis.employees.active} (${kpis.employees.total > 0 ? Math.round((kpis.employees.active / kpis.employees.total) * 100) : 0}%)` },
                    { label: "Empleados inactivos", value: `${kpis.employees.inactive} (${kpis.employees.total > 0 ? Math.round((kpis.employees.inactive / kpis.employees.total) * 100) : 0}%)` },
                    { label: "Tasa de rotacion",    value: `${kpis.employees.turnoverRate}%` },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className="text-sm font-semibold">{row.value}</span>
                    </div>
                  ))}
                  {kpis.employees.total > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Activos</span><span>{Math.round((kpis.employees.active / kpis.employees.total) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${(kpis.employees.active / kpis.employees.total) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-purple-600" />Capacitacion y Desarrollo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Cursos disponibles",        value: kpis.training.totalCourses },
                    { label: "Asignaciones totales",      value: kpis.training.totalAssignments },
                    { label: "Asignaciones completadas",  value: kpis.training.completedAssignments },
                    { label: "Tasa de completacion",      value: `${kpis.training.completionRate}%` },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className="text-sm font-semibold">{row.value}</span>
                    </div>
                  ))}
                  {kpis.training.totalAssignments > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Completadas</span><span>{kpis.training.completionRate}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-2 bg-purple-500 rounded-full" style={{ width: `${kpis.training.completionRate}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />Casos NOM-035 y Riesgo Psicosocial
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Total de casos",              value: kpis.cases.total,               alert: false },
                    { label: "Casos abiertos",              value: kpis.cases.open,                alert: kpis.cases.open > 0 },
                    { label: "Casos de alto riesgo",        value: kpis.cases.highRisk,            alert: kpis.cases.highRisk > 0 },
                    { label: "Evaluaciones psicometricas",  value: kpis.psychometric.total,        alert: false },
                    { label: "Riesgo alto/muy alto",        value: kpis.psychometric.highRisk,     alert: kpis.psychometric.highRisk > 0 },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className={`text-sm font-semibold ${row.alert ? "text-red-600" : ""}`}>{row.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-teal-600" />Buzon Interno y Vacaciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Mensajes totales",          value: kpis.mailbox.total,          alert: false },
                    { label: "Mensajes pendientes",       value: kpis.mailbox.pending,        alert: kpis.mailbox.pending > 0 },
                    { label: "Solicitudes de vacaciones", value: kpis.vacations.total,        alert: false },
                    { label: "Vacaciones pendientes",     value: kpis.vacations.pending,      alert: kpis.vacations.pending > 0 },
                    { label: "Vacaciones aprobadas",      value: kpis.vacations.approved,     alert: false },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className={`text-sm font-semibold ${row.alert ? "text-orange-600" : ""}`}>{row.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="hidden print:block border-t pt-4 mt-6 text-xs text-gray-500">
              <p>Plataforma de Capacitacion NOM-035 STPS 2018 — Reporte generado el {new Date().toLocaleString("es-MX")}</p>
              <p className="mt-1">Documento confidencial — uso exclusivo para auditoria interna y cumplimiento STPS.</p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
