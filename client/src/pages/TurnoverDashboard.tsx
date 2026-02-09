import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingDown, Users, Calendar, Download } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#ff7c7c"];

export default function TurnoverDashboard() {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");
  
  // Calculate date ranges based on period
  const getDateRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    
    if (period === "month") {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === "quarter") {
      startDate.setMonth(startDate.getMonth() - 3);
    } else {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  };

  const dateRange = getDateRange();

  // Fetch data
  const { data: stats, isLoading: statsLoading } = trpc.employees.getTurnoverStats.useQuery(dateRange);
  const { data: trends, isLoading: trendsLoading } = trpc.employees.getMonthlyTrends.useQuery({ months: 12 });
  const { data: byReason, isLoading: reasonLoading } = trpc.employees.getTerminationsByReason.useQuery(dateRange);
  const { data: byDepartment, isLoading: deptLoading } = trpc.employees.getTerminationsByDepartment.useQuery(dateRange);

  const isLoading = statsLoading || trendsLoading || reasonLoading || deptLoading;

  // Prepare data for charts
  const monthlyData = trends?.map((t: any) => ({
    month: t.month,
    bajas: t.count,
  })) || [];

  const reasonData = byReason?.map((r: any) => ({
    name: r.reason || "Sin especificar",
    value: r.count,
    category: r.category || "N/A",
  })) || [];

  const departmentData = byDepartment?.map((d: any) => ({
    name: d.departmentName || "Sin departamento",
    bajas: d.count,
  })) || [];

  const handleExportToExcel = () => {
    // TODO: Implement Excel export
    toast.info("Exportación a Excel", {
      description: "Esta funcionalidad estará disponible próximamente",
    });
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando estadísticas de rotación...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Rotación</h1>
          <p className="text-muted-foreground">Análisis de bajas y tendencias de personal</p>
        </div>
        <div className="flex gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Último mes</SelectItem>
              <SelectItem value="quarter">Último trimestre</SelectItem>
              <SelectItem value="year">Último año</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportToExcel} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar a Excel
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Rotación</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.turnoverRate.toFixed(2)}%</div>
            <p className="text-xs text-muted-foreground">
              {period === "month" ? "Último mes" : period === "quarter" ? "Último trimestre" : "Último año"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Bajas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalTerminations || 0}</div>
            <p className="text-xs text-muted-foreground">
              Empleados dados de baja
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalActive || 0}</div>
            <p className="text-xs text-muted-foreground">
              Plantilla actual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia Mensual de Bajas</CardTitle>
            <CardDescription>Últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="bajas" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Reason */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Motivo</CardTitle>
            <CardDescription>Clasificación de bajas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reasonData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {reasonData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* By Department */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Bajas por Departamento</CardTitle>
            <CardDescription>Distribución organizacional</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="bajas" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
