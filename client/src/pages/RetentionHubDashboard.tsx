/**
 * RetentionHubDashboard — Vista unificada de retención y rotación.
 * Fusiona: TurnoverDashboard + RetentionAnalytics + RetentionConsolidatedDashboard
 *          + RetentionInterventionsDashboard + PredictiveTurnoverDashboard
 * Ruta canónica: /retention-hub
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  TrendingDown,
  Users,
  AlertTriangle,
  Target,
  DollarSign,
  Zap,
  BarChart2,
  Activity,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from "recharts";

const PIE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6"];

// ─── Pestaña 1: Rotación histórica ──────────────────────────────────────────
function TabRotacion() {
  const [startDate] = useState(
    () =>
      new Date(new Date().setFullYear(new Date().getFullYear() - 1))
        .toISOString()
        .split("T")[0]
  );
  const [endDate] = useState(() => new Date().toISOString().split("T")[0]);
  const { data: stats } = trpc.employees.getTurnoverStats.useQuery({
    startDate,
    endDate,
  });
  const { data: trends } = trpc.employees.getMonthlyTrends.useQuery({
    months: 12,
  });
  const { data: byReason } = trpc.employees.getTerminationsByReason.useQuery({
    startDate,
    endDate,
  });
  const { data: byDept } = trpc.employees.getTerminationsByDepartment.useQuery({
    startDate,
    endDate,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Tasa de Rotación",
            value: stats?.turnoverRate != null ? `${stats.turnoverRate}%` : "—",
            cls: "text-red-600",
          },
          {
            label: "Total Bajas",
            value: stats?.totalTerminations ?? 0,
            cls: "text-orange-600",
          },
          {
            label: "Empleados Activos",
            value: stats?.activeEmployees ?? 0,
            cls: "text-green-600",
          },
          {
            label: "Tasa Rotación Mensual",
            value:
              stats?.averageMonthly != null ? `${stats.averageMonthly}%` : "—",
            cls: "",
          },
        ].map(({ label, value, cls }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${cls}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Tendencia mensual de bajas (12 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trends ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="terminations"
                  stroke="#ef4444"
                  name="Bajas"
                />
                <Line
                  type="monotone"
                  dataKey="hires"
                  stroke="#22c55e"
                  name="Altas"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribución por motivo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={byReason ?? []}
                  dataKey="count"
                  nameKey="reason"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ reason, percent }: any) =>
                    `${reason} ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {(byReason ?? []).map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {byDept && byDept.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Bajas por departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byDept} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="department"
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#f97316" name="Bajas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Pestaña 2: Empleados en riesgo ─────────────────────────────────────────
function TabRiesgo() {
  const [deptFilter, setDeptFilter] = useState("all");
  const [riskThreshold, setRiskThreshold] = useState(0.5);
  const { data: departments } = trpc.departments.list.useQuery({
    page: 1,
    pageSize: 100,
  });
  const { data: stats } = trpc.predictiveAnalytics.getRetentionStats.useQuery();
  const { data: atRisk, refetch } =
    trpc.predictiveAnalytics.identifyAtRiskEmployees.useQuery({
      minScore: Math.round(riskThreshold * 100),
      departmentId: deptFilter !== "all" ? parseInt(deptFilter) : undefined,
    });
  const generateAlerts =
    trpc.predictiveAnalytics.generateRetentionAlerts.useMutation({
      onSuccess: () => {
        toast.success("Alertas generadas");
        refetch();
      },
      onError: e => toast.error(e.message),
    });

  const getRiskBadge = (score: number) => {
    if (score >= 0.8)
      return <Badge className="bg-red-100 text-red-800">Crítico</Badge>;
    if (score >= 0.6)
      return <Badge className="bg-orange-100 text-orange-800">Alto</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-800">Medio</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Empleados Activos",
            value: stats?.totalActiveEmployees ?? 0,
          },
          {
            label: "Tasa Retención",
            value:
              stats?.retentionRate != null ? `${stats.retentionRate}%` : "—",
            cls: "text-green-600",
          },
          {
            label: "Riesgo Crítico",
            value: stats?.criticalRisk ?? 0,
            cls: "text-red-600",
          },
          {
            label: "Riesgo Alto",
            value: stats?.highRisk ?? 0,
            cls: "text-orange-600",
          },
        ].map(({ label, value, cls }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${cls ?? ""}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <Label className="text-xs mb-1 block">Departamento</Label>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {((departments as any)?.departments ?? departments ?? []).map(
                (d: any) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label className="text-xs mb-1 block">
            Umbral de riesgo ({(riskThreshold * 100).toFixed(0)}%)
          </Label>
          <input
            type="range"
            min={0.3}
            max={0.9}
            step={0.05}
            value={riskThreshold}
            onChange={e => setRiskThreshold(parseFloat(e.target.value))}
            className="w-full"
          />
        </div>
        <Button
          size="sm"
          onClick={() => generateAlerts.mutate({})}
          disabled={generateAlerts.isPending}
          className="gap-1"
        >
          <Zap className="h-4 w-4" />
          {generateAlerts.isPending ? "Generando..." : "Generar alertas"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Empleados en riesgo (
            {(atRisk as any)?.employees?.length ??
              (Array.isArray(atRisk) ? atRisk.length : 0)}
            )
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(Array.isArray(atRisk) ? atRisk : ((atRisk as any)?.employees ?? []))
            .length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead>Factores</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(Array.isArray(atRisk)
                  ? atRisk
                  : ((atRisk as any)?.employees ?? [])
                ).map((emp: any) => (
                  <TableRow key={emp.employeeId}>
                    <TableCell className="font-medium">
                      {emp.employeeName}
                    </TableCell>
                    <TableCell>{emp.department}</TableCell>
                    <TableCell>{emp.position}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRiskBadge(emp.riskScore)}
                        <span className="text-xs text-muted-foreground">
                          {(emp.riskScore * 100).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {emp.riskFactors?.join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No hay empleados en riesgo con el umbral seleccionado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Pestaña 3: Intervenciones y ROI ────────────────────────────────────────
function TabIntervenciones() {
  const { data: interventions = [] } =
    trpc.retentionInterventions.getInterventions.useQuery({ limit: 50 });
  const { data: highRisk = [] } =
    trpc.predictiveTurnoverDashboard.getHighRiskEmployees.useQuery({});
  const { data: payrollData = [] } =
    trpc.payrollIntegration.getAllPayrollData.useQuery();

  const activeCount = interventions.filter(
    (i: any) => i.outcome === "pending"
  ).length;
  const retainedCount = interventions.filter(
    (i: any) => i.outcome === "retained"
  ).length;
  const totalCost = interventions.reduce(
    (s: number, i: any) => s + parseFloat(i.cost || "0"),
    0
  );
  const roi =
    retainedCount > 0 && totalCost > 0
      ? (((retainedCount * 50000 - totalCost) / totalCost) * 100).toFixed(1)
      : "0";

  const priorityData = (highRisk as any[]).slice(0, 10).map((emp: any) => {
    const payroll = (payrollData as any[]).find(
      (p: any) => p.employeeId === emp.employeeId
    );
    return {
      name: emp.employeeName?.split(" ")[0] ?? "—",
      riesgo: parseFloat(emp.turnoverProbability ?? 0),
      brecha: payroll?.salaryGapPercentage
        ? Math.abs(parseFloat(payroll.salaryGapPercentage))
        : 0,
    };
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {[
          {
            label: "Intervenciones activas",
            value: activeCount,
            cls: "text-blue-600",
          },
          {
            label: "Empleados retenidos",
            value: retainedCount,
            cls: "text-green-600",
          },
          {
            label: "Costo total",
            value: `$${totalCost.toLocaleString()}`,
            cls: "",
          },
          {
            label: "ROI estimado",
            value: `${roi}%`,
            cls: parseFloat(roi) > 0 ? "text-green-600" : "text-red-600",
          },
        ].map(({ label, value, cls }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${cls}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Priorización: riesgo vs brecha salarial
            </CardTitle>
            <CardDescription>Top 10 empleados de alto riesgo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="riesgo"
                  name="Riesgo"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "Riesgo (%)",
                    position: "insideBottom",
                    offset: -5,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  dataKey="brecha"
                  name="Brecha salarial"
                  tick={{ fontSize: 11 }}
                  label={{
                    value: "Brecha (%)",
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 11,
                  }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(v: any) => `${v}%`}
                />
                <Scatter data={priorityData} fill="#ef4444" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Historial de intervenciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[220px] overflow-y-auto">
              {interventions.slice(0, 15).map((i: any) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between p-2 rounded border text-sm"
                >
                  <div>
                    <p className="font-medium">{i.employeeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {i.interventionType}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        i.outcome === "retained"
                          ? "default"
                          : i.outcome === "resigned"
                            ? "destructive"
                            : "secondary"
                      }
                      className="text-xs"
                    >
                      {i.outcome === "retained"
                        ? "Retenido"
                        : i.outcome === "resigned"
                          ? "Renunció"
                          : "Pendiente"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ${parseFloat(i.cost || "0").toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
              {!interventions.length && (
                <p className="text-center text-muted-foreground py-4">
                  Sin intervenciones registradas
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Pestaña 4: Análisis predictivo ─────────────────────────────────────────
function TabPredictivo() {
  const { data: predictions } =
    trpc.predictiveTurnoverDashboard.getHighRiskEmployees.useQuery({});
  const modelMetrics = null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <Activity className="h-4 w-4 shrink-0" />
        <span>
          El modelo predictivo analiza factores como antigüedad, desempeño,
          salario y ausencias para calcular la probabilidad de rotación de cada
          empleado.
        </span>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Empleados con mayor probabilidad de rotación
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(predictions as any[])?.length ? (
            <div className="space-y-2">
              {(predictions as any[]).slice(0, 15).map((emp: any) => (
                <div
                  key={emp.employeeId}
                  className="flex items-center gap-3 p-2 rounded border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{emp.employeeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {emp.department} · {emp.position}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${parseFloat(emp.turnoverProbability) * 100}%`,
                          backgroundColor:
                            parseFloat(emp.turnoverProbability) >= 0.8
                              ? "#ef4444"
                              : parseFloat(emp.turnoverProbability) >= 0.6
                                ? "#f97316"
                                : "#eab308",
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium w-12 text-right">
                      {(parseFloat(emp.turnoverProbability) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <TrendingDown className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>No hay predicciones disponibles</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
export default function RetentionHubDashboard() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingDown className="h-6 w-6 text-red-500" />
          Centro de Retención y Rotación
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vista unificada: rotación histórica, empleados en riesgo,
          intervenciones y análisis predictivo
        </p>
      </div>

      <Tabs defaultValue="rotacion">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="rotacion" className="gap-1.5">
            <BarChart2 className="h-4 w-4" />
            Rotación
          </TabsTrigger>
          <TabsTrigger value="riesgo" className="gap-1.5">
            <AlertTriangle className="h-4 w-4" />
            En Riesgo
          </TabsTrigger>
          <TabsTrigger value="intervenciones" className="gap-1.5">
            <Target className="h-4 w-4" />
            Intervenciones
          </TabsTrigger>
          <TabsTrigger value="predictivo" className="gap-1.5">
            <Activity className="h-4 w-4" />
            Predictivo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rotacion">
          <TabRotacion />
        </TabsContent>
        <TabsContent value="riesgo">
          <TabRiesgo />
        </TabsContent>
        <TabsContent value="intervenciones">
          <TabIntervenciones />
        </TabsContent>
        <TabsContent value="predictivo">
          <TabPredictivo />
        </TabsContent>
      </Tabs>
    </div>
  );
}
