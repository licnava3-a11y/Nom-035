import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, TrendingUp, Users, FileText, BarChart3, CalendarClock, UserMinus, Target, Briefcase, DollarSign, Palmtree, ArrowRight, Clock, CheckCircle2, XCircle, Sun, Shield, Bug, Lightbulb, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlertBanner } from "@/components/AlertBanner";
import { WhatsAppDemoButton } from "@/components/WhatsAppButton";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type Period = 'today' | 'this_week' | 'this_month' | 'this_year' | 'last_week' | 'last_month' | 'last_year';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<Period>('this_month');
  const [alertMonths, setAlertMonths] = useState<6 | 12 | 24>(6);

  // Queries
  const { data: metrics, isLoading: metricsLoading } = trpc.executiveDashboard.getMetrics.useQuery();
  // Widget de calidad
  const { data: bugStats } = trpc.bugReports.getStats.useQuery();
  const { data: featureStats } = trpc.featureRequests.getStats.useQuery();
  const { data: activeAlerts } = trpc.alerts.getHistory.useQuery({ status: "active" });

  // Determinar si el usuario es supervisor/gerente/jefe_area
  const isSupervisor = ["supervisor", "gerente", "jefe_area", "admin", "rh", "recursos_humanos"].includes(user?.role ?? "");

  // Widget de vacaciones: solicitudes pendientes de aprobación (para supervisores)
  const { data: pendingVacations } = trpc.vacations.listByManager.useQuery(
    { status: "pending" },
    { enabled: isSupervisor }
  );

  // Widget de vacaciones: saldo disponible del usuario actual (para empleados)
  const { data: myEmployeeData } = trpc.employees.list.useQuery(
    { search: user?.name ?? "", isActive: true },
    { enabled: !!user }
  );
  const myEmployeeId = myEmployeeData?.employees?.[0]?.id;
  const { data: myVacationBalance } = trpc.vacations.getBalance.useQuery(
    { employeeId: myEmployeeId! },
    { enabled: !!myEmployeeId }
  );
  
  // Mutation para crear alertas
  const createAlertMutation = trpc.alerts.create.useMutation({
    onSuccess: (data) => {
      if (data.isDuplicate) {
        toast.info(`Esta alerta ya está activa`, {
          description: data.message || "Ya existe una alerta activa de este tipo",
          duration: 5000,
        });
      }
    },
  });
  
  // Mutation para resolver alertas
  const resolveAlertMutation = trpc.alerts.resolve.useMutation();
  
  // NOTA: Registro automático de alertas deshabilitado para evitar loop infinito
  // Las alertas deben crearse manualmente por el usuario o mediante jobs programados
  
  const { data: trendsData, isLoading: trendsLoading } = trpc.executiveDashboard.getTrendsData.useQuery({ period });
  const { data: alertTrends, isLoading: alertTrendsLoading } = trpc.alerts.getTrends.useQuery({ months: alertMonths });
  const { data: comparison, isLoading: comparisonLoading } = trpc.executiveDashboard.getHistoricalComparison.useQuery();

  // Configuración de gráficas
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
    },
  };

  // Datos para gráfica de tendencia de casos
  const casesTrendData = {
    labels: trendsData?.casesTrend.created.map(c => c.date) || [],
    datasets: [
      {
        label: 'Casos Creados',
        data: trendsData?.casesTrend.created.map(c => c.count) || [],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        tension: 0.3,
      },
      {
        label: 'Casos Cerrados',
        data: trendsData?.casesTrend.closed.map(c => c.count) || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        tension: 0.3,
      },
    ],
  };

  // Datos para gráfica de cobertura de encuestas
  const surveyCoverageData = {
    labels: trendsData?.surveyCompletion.map(s => s.date) || [],
    datasets: [
      {
        label: 'Encuestas Completadas',
        data: trendsData?.surveyCompletion.map(s => s.completed) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  // Datos para gráfica de distribución de riesgo
  const riskDistributionData = {
    labels: trendsData?.riskDistribution.map(r => r.level) || [],
    datasets: [
      {
        data: trendsData?.riskDistribution.map(r => r.count) || [],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',   // Rojo - Alto
          'rgba(251, 191, 36, 0.8)',  // Amarillo - Medio
          'rgba(34, 197, 94, 0.8)',   // Verde - Bajo
          'rgba(156, 163, 175, 0.8)', // Gris - Otros
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(251, 191, 36)',
          'rgb(34, 197, 94)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 1,
      },
    ],
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 flex flex-col">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
          <div className="mb-6 flex items-center justify-center gap-3">
            <ShieldCheck className="h-14 w-14 text-red-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-3">
            Plataforma NOM-035 STPS 2018
          </h1>
          <p className="text-lg text-red-200 mb-2 max-w-2xl">
            Gestión Integral de Riesgos Psicosociales en el Trabajo
          </p>
          <p className="text-sm text-slate-400 mb-8 max-w-xl">
            Sistema de cumplimiento normativo, trazabilidad documental y bienestar organizacional conforme a la NOM-035-STPS-2018 y estándares internacionales de seguridad de la información.
          </p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-lg text-base transition-colors shadow-lg shadow-red-900/40"
          >
            <Shield className="h-5 w-5" />
            Acceder a la Plataforma
          </a>
        </div>

        {/* Badges de Cumplimiento Normativo */}
        <div className="w-full bg-slate-900/80 border-t border-slate-700/60 py-8 px-6">
          <div className="max-w-4xl mx-auto">
            <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 mb-5">
              Cumplimiento y Estándares de Seguridad
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {/* NOM-151 */}
              <div className="flex items-center gap-2 bg-green-900/40 border border-green-700/60 rounded-lg px-4 py-2.5 min-w-[160px]">
                <ShieldCheck className="h-5 w-5 text-green-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-green-300">NOM-151-SCFI-2016</p>
                  <p className="text-xs text-green-500/80">Conservación de mensajes de datos</p>
                </div>
              </div>
              {/* LGPD */}
              <div className="flex items-center gap-2 bg-blue-900/40 border border-blue-700/60 rounded-lg px-4 py-2.5 min-w-[160px]">
                <Shield className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-blue-300">LGPD / LFPDPPP</p>
                  <p className="text-xs text-blue-500/80">Protección de datos personales</p>
                </div>
              </div>
              {/* GDPR */}
              <div className="flex items-center gap-2 bg-purple-900/40 border border-purple-700/60 rounded-lg px-4 py-2.5 min-w-[160px]">
                <Shield className="h-5 w-5 text-purple-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-purple-300">GDPR</p>
                  <p className="text-xs text-purple-500/80">Reglamento Europeo de Datos</p>
                </div>
              </div>
              {/* ISO 27001 */}
              <div className="flex items-center gap-2 bg-amber-900/40 border border-amber-700/60 rounded-lg px-4 py-2.5 min-w-[160px]">
                <ShieldCheck className="h-5 w-5 text-amber-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-300">ISO/IEC 27001</p>
                  <p className="text-xs text-amber-500/80">Sistema de Gestión de Seguridad</p>
                </div>
              </div>
              {/* ISO 27002 */}
              <div className="flex items-center gap-2 bg-orange-900/40 border border-orange-700/60 rounded-lg px-4 py-2.5 min-w-[160px]">
                <ShieldCheck className="h-5 w-5 text-orange-400 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-orange-300">ISO/IEC 27002</p>
                  <p className="text-xs text-orange-500/80">Controles de Seguridad de la Información</p>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-slate-600 mt-5">
              © {new Date().getFullYear()} Plataforma NOM-035 STPS 2018 — Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {user?.name}</h1>
          <p className="text-muted-foreground">
            {user?.role === 'admin' ? 'Administrador' : 'Usuario'} - Plataforma de Capacitación NOM-035 STPS 2018
          </p>
        </div>
        
        {/* Botón de WhatsApp */}
        <WhatsAppDemoButton
          nombre={user?.name || ""}
          email={user?.email || ""}
          normativasSeleccionadas={["NOM-035"]}
        />
        
        {/* Filtro de período */}
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="this_week">Esta semana</SelectItem>
            <SelectItem value="this_month">Este mes</SelectItem>
            <SelectItem value="this_year">Este año</SelectItem>
            <SelectItem value="last_week">Semana anterior</SelectItem>
            <SelectItem value="last_month">Mes anterior</SelectItem>
            <SelectItem value="last_year">Año anterior</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Badges de Cumplimiento Normativo — siempre visibles en el dashboard */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground font-medium mr-1">Cumplimiento:</span>
        <Badge variant="outline" className="text-xs border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 gap-1">
          <ShieldCheck className="h-3 w-3" /> NOM-151-SCFI-2016
        </Badge>
        <Badge variant="outline" className="text-xs border-blue-500 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 gap-1">
          <Shield className="h-3 w-3" /> LGPD / LFPDPPP
        </Badge>
        <Badge variant="outline" className="text-xs border-purple-500 text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 gap-1">
          <Shield className="h-3 w-3" /> GDPR
        </Badge>
        <Badge variant="outline" className="text-xs border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 gap-1">
          <ShieldCheck className="h-3 w-3" /> ISO 27001
        </Badge>
        <Badge variant="outline" className="text-xs border-orange-500 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/30 gap-1">
          <ShieldCheck className="h-3 w-3" /> ISO 27002
        </Badge>
      </div>
      {/* Sistema de Alertas Visuales */}
      {metrics && (
        <div className="space-y-2">
          {/* Alerta Crítica: Casos críticos > 10 */}
          {(metrics.nom035Compliance.casesOpen || 0) > 50 && (
            <AlertBanner
              level="critical"
              title="¡Alerta Crítica!"
              description={`Hay ${metrics.nom035Compliance.casesOpen} casos abiertos. Se recomienda revisar y atender los casos prioritarios inmediatamente.`}
              pulse={true}
              action={{
                label: "Ver Casos Críticos",
                onClick: () => setLocation("/cases?priority=critical"),
              }}
            />
          )}

          {/* Alerta Warning: Cobertura < 80% */}
          {metrics.nom035Compliance.surveyCoverage < 80 && (
            <AlertBanner
              level="warning"
              title="Cobertura de Encuestas Baja"
              description={`La cobertura actual es ${metrics.nom035Compliance.surveyCoverage.toFixed(1)}%. Se recomienda enviar recordatorios a los empleados pendientes.`}
            />
          )}

          {/* Alerta Info: Casos cerrados exitosamente */}
          {metrics.nom035Compliance.casesClosed > 0 && metrics.nom035Compliance.surveyCoverage >= 90 && (
            <AlertBanner
              level="info"
              title="Cumplimiento Excelente"
              description={`Se han cerrado ${metrics.nom035Compliance.casesClosed} casos y la cobertura de encuestas es ${metrics.nom035Compliance.surveyCoverage.toFixed(1)}%. ¡Buen trabajo!`}
            />
          )}
        </div>
      )}

      {/* ── Widget de Vacaciones ─────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Saldo de vacaciones del empleado */}
        {myVacationBalance && (
          <Card className="border-teal-200 dark:border-teal-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Palmtree className="h-4 w-4 text-teal-600" />
                  Mi Saldo de Vacaciones
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setLocation("/vacations")} className="text-xs text-teal-600 hover:text-teal-700">
                  Ver detalle <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-2 bg-teal-50 dark:bg-teal-950/30 rounded-lg">
                  <div className="text-2xl font-bold text-teal-700 dark:text-teal-400">{myVacationBalance.earnedDays}</div>
                  <div className="text-xs text-muted-foreground mt-1">Ganados</div>
                </div>
                <div className="text-center p-2 bg-gray-50 dark:bg-gray-900/30 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{myVacationBalance.usedDays}</div>
                  <div className="text-xs text-muted-foreground mt-1">Usados</div>
                </div>
                <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{myVacationBalance.pendingDays}</div>
                  <div className="text-xs text-muted-foreground mt-1">Pendientes</div>
                </div>
                <div className="text-center p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">{myVacationBalance.availableDays}</div>
                  <div className="text-xs text-muted-foreground mt-1">Disponibles</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Antigüedad: {myVacationBalance.yearsOfService} año{myVacationBalance.yearsOfService !== 1 ? "s" : ""} • LFT: {myVacationBalance.earnedDays} días/año
              </p>
            </CardContent>
          </Card>
        )}

        {/* Solicitudes pendientes de aprobación (supervisores) */}
        {isSupervisor && (
          <Card className="border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-500" />
                  Solicitudes de Vacaciones Pendientes
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setLocation("/vacations")} className="text-xs text-orange-600 hover:text-orange-700">
                  Revisar <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!pendingVacations || pendingVacations.length === 0 ? (
                <div className="flex items-center gap-2 text-green-600 py-2">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm">Sin solicitudes pendientes</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-bold">
                      {pendingVacations.length}
                    </span>
                    <span className="text-sm text-muted-foreground">solicitud{pendingVacations.length !== 1 ? "es" : ""} esperando aprobación</span>
                  </div>
                  {pendingVacations.slice(0, 3).map((req: any) => (
                    <div key={req.id} className="flex items-center justify-between text-xs border-b border-border pb-1 last:border-0">
                      <span className="font-medium truncate max-w-[140px]">{req.employeeName}</span>
                      <span className="text-muted-foreground">{req.requestedDays}d · {req.startDate}</span>
                    </div>
                  ))}
                  {pendingVacations.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">+{pendingVacations.length - 3} más</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Accesos Rápidos ─────────────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Accesos Rápidos</h2>
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Vencimientos de Contratos", icon: <CalendarClock className="h-5 w-5" />, href: "/contract-expiration-dashboard", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30" },
            { label: "Entrevistas de Salida", icon: <UserMinus className="h-5 w-5" />, href: "/exit-interviews", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30" },
            { label: "Comparativa DNC", icon: <Target className="h-5 w-5" />, href: "/job-profiles", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30" },
            { label: "Reclutamiento", icon: <Briefcase className="h-5 w-5" />, href: "/recruitment", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/30" },
            { label: "Historial de Salarios", icon: <DollarSign className="h-5 w-5" />, href: "/employees", color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950/30" },
            { label: "Gestión de Vacaciones", icon: <Palmtree className="h-5 w-5" />, href: "/vacations", color: "text-teal-600", bg: "bg-teal-50 dark:bg-teal-950/30" },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => setLocation(item.href)}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border border-border ${item.bg} hover:shadow-md transition-all text-center group`}
            >
              <span className={`${item.color} group-hover:scale-110 transition-transform`}>{item.icon}</span>
              <span className="text-xs font-medium leading-tight">{item.label}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </div>

      {/* Cards de métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casos Abiertos</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.nom035Compliance.casesOpen || 0}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Investigación</CardTitle>
            <FileText className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trendsData?.casesTrend.created.reduce((sum: any, c: any) => sum + c.count, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Casos en proceso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Casos</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics?.nom035Compliance.casesOpen || 0) + (metrics?.nom035Compliance.casesClosed || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Todos los registros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobertura Encuestas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.nom035Compliance.surveyCoverage.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">Cumplimiento NOM-035</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Tendencia de Casos */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Casos</CardTitle>
            <CardDescription>Casos creados vs cerrados en el período seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {trendsLoading ? (
                <div className="flex items-center justify-center h-full">Cargando...</div>
              ) : (
                <Line options={lineChartOptions} data={casesTrendData} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Distribución de Niveles de Riesgo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Niveles de Riesgo</CardTitle>
            <CardDescription>Casos por nivel de riesgo psicosocial</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {trendsLoading ? (
                <div className="flex items-center justify-center h-full">Cargando...</div>
              ) : (
                <Doughnut options={doughnutOptions} data={riskDistributionData} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cobertura de Encuestas */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Cobertura de Encuestas NOM-035</CardTitle>
            <CardDescription>Encuestas completadas por fecha</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {trendsLoading ? (
                <div className="flex items-center justify-center h-full">Cargando...</div>
              ) : (
                <Bar options={lineChartOptions} data={surveyCoverageData} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comparación Histórica: Mes Actual vs Anterior */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Comparación Histórica: Mes Actual vs Anterior</CardTitle>
            <CardDescription>Mejoras en cumplimiento NOM-035</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {comparisonLoading ? (
                <div className="flex items-center justify-center h-full">Cargando...</div>
              ) : (
                <Bar
                  options={{
                    ...lineChartOptions,
                    plugins: {
                      ...lineChartOptions.plugins,
                      legend: {
                        position: 'top' as const,
                      },
                    },
                  }}
                  data={{
                    labels: ['Casos Abiertos', 'Casos Cerrados', 'Casos Críticos', 'Cobertura (%)'],
                    datasets: [
                      {
                        label: 'Mes Anterior',
                        data: [
                          comparison?.lastMonth.casesOpen || 0,
                          comparison?.lastMonth.casesClosed || 0,
                          comparison?.lastMonth.criticalCases || 0,
                          comparison?.lastMonth.surveyCoverage || 0,
                        ],
                        backgroundColor: 'rgba(156, 163, 175, 0.5)',
                        borderColor: 'rgba(156, 163, 175, 1)',
                        borderWidth: 1,
                      },
                      {
                        label: 'Mes Actual',
                        data: [
                          comparison?.currentMonth.casesOpen || 0,
                          comparison?.currentMonth.casesClosed || 0,
                          comparison?.currentMonth.criticalCases || 0,
                          comparison?.currentMonth.surveyCoverage || 0,
                        ],
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1,
                      },
                    ],
                  }}
                />
              )}
            </div>
            {comparison && (
              <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">Casos Abiertos</p>
                  <p className={`font-bold ${comparison.changes.casesOpen > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {comparison.changes.casesOpen > 0 ? '+' : ''}{comparison.changes.casesOpen.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Casos Cerrados</p>
                  <p className={`font-bold ${comparison.changes.casesClosed > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {comparison.changes.casesClosed > 0 ? '+' : ''}{comparison.changes.casesClosed.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Casos Críticos</p>
                  <p className={`font-bold ${comparison.changes.criticalCases > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {comparison.changes.criticalCases > 0 ? '+' : ''}{comparison.changes.criticalCases.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Cobertura</p>
                  <p className={`font-bold ${comparison.changes.surveyCoverage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {comparison.changes.surveyCoverage > 0 ? '+' : ''}{comparison.changes.surveyCoverage.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tendencia de Alertas */}
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tendencia de Alertas</CardTitle>
              <CardDescription>Evolución de alertas activas vs resueltas</CardDescription>
            </div>
            <Select value={alertMonths.toString()} onValueChange={(v) => setAlertMonths(parseInt(v) as 6 | 12 | 24)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
                <SelectItem value="24">Últimos 24 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {alertTrendsLoading ? (
              <div className="flex items-center justify-center h-full">Cargando...</div>
            ) : (
              <Line
                options={lineChartOptions}
                data={{
                  labels: alertTrends?.map(t => {
                    const [year, month] = t.month.split('-');
                    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
                  }) || [],
                  datasets: [
                    {
                      label: 'Alertas Activas',
                      data: alertTrends?.map(t => t.activeAlerts) || [],
                      borderColor: 'rgba(239, 68, 68, 1)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      tension: 0.4,
                    },
                    {
                      label: 'Alertas Resueltas',
                      data: alertTrends?.map(t => t.resolvedAlerts) || [],
                      borderColor: 'rgba(34, 197, 94, 1)',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      tension: 0.4,
                    },
                  ],
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Widget de Calidad del Sistema ───────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Bug Reports */}
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Bug className="h-4 w-4 text-red-500" />
                Reportes de Errores (Bug Reports)
              </CardTitle>
              <a href="/bug-reports" className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todos <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </CardHeader>
          <CardContent>
            {bugStats ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-red-50 dark:bg-red-950/30 rounded-lg">
                    <div className="text-xl font-bold text-red-600 dark:text-red-400">{bugStats.pendiente}</div>
                    <div className="text-xs text-muted-foreground">Pendientes</div>
                  </div>
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg">
                    <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{bugStats.en_revision}</div>
                    <div className="text-xs text-muted-foreground">En revisión</div>
                  </div>
                  <div className="p-2 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">{bugStats.corregido}</div>
                    <div className="text-xs text-muted-foreground">Corregidos</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Total: <strong>{bugStats.total}</strong></span>
                  {bugStats.critico > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {bugStats.critico} crítico{bugStats.critico !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Cargando estadísticas...</div>
            )}
          </CardContent>
        </Card>

        {/* Feature Requests */}
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-blue-500" />
                Peticiones de Mejora (Feature Requests)
              </CardTitle>
              <a href="/feature-requests" className="text-xs text-primary hover:underline flex items-center gap-1">
                Ver todas <ArrowRight className="h-3 w-3" />
              </a>
            </div>
          </CardHeader>
          <CardContent>
            {featureStats ? (
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Mejoras implementadas</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">{featureStats.pctImplemented}%</span>
                  </div>
                  <Progress value={featureStats.pctImplemented} className="h-2" />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">En progreso (implementadas + en desarrollo)</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">{featureStats.pctInProgress}%</span>
                  </div>
                  <Progress value={featureStats.pctInProgress} className="h-2 [&>div]:bg-blue-500" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-1.5 bg-green-50 dark:bg-green-950/30 rounded">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">{featureStats.implementada}</div>
                    <div className="text-xs text-muted-foreground">Implementadas</div>
                  </div>
                  <div className="p-1.5 bg-blue-50 dark:bg-blue-950/30 rounded">
                    <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{featureStats.en_desarrollo}</div>
                    <div className="text-xs text-muted-foreground">En desarrollo</div>
                  </div>
                  <div className="p-1.5 bg-gray-50 dark:bg-gray-900/30 rounded">
                    <div className="text-lg font-bold text-gray-600 dark:text-gray-400">{featureStats.pendiente}</div>
                    <div className="text-xs text-muted-foreground">Pendientes</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Cargando estadísticas...</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distribución por Departamento */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Departamento</CardTitle>
            <CardDescription>Empleados por área organizacional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.employeesAndStructure.departmentDistribution.map((dept: any) => (
                <div key={dept.department} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{dept.department}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-[200px] bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${(dept.count / metrics.employeesAndStructure.totalEmployees) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">{dept.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
