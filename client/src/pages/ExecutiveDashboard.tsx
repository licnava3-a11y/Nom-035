import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Users, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const COLORS = {
  primary: "#1e40af", // Azul marino
  success: "#16a34a", // Verde
  danger: "#dc2626", // Rojo
  warning: "#f59e0b", // Naranja
  neutral: "#6b7280", // Gris
};

export default function ExecutiveDashboard() {
  const [period, setPeriod] = useState<"day" | "week" | "month" | "quarter" | "year">("month");

  const { toast } = useToast();

  // Obtener métricas del dashboard
  const { data: metrics, isLoading } = trpc.executiveDashboard.getMetrics.useQuery({});
  
  // Mutation para exportar a Excel
  const exportMutation = trpc.executiveDashboard.exportToExcel.useMutation({
    onSuccess: (data) => {
      // Descargar archivo Excel
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.data}`;
      link.download = data.filename;
      link.click();
      
      toast({
        title: "Exportación exitosa",
        description: "El dashboard se ha exportado a Excel correctamente.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error al exportar",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleExport = () => {
    exportMutation.mutate({});
  };
  
  // Obtener datos de tendencias
  const { data: trends } = trpc.executiveDashboard.getTrendsData.useQuery({
    period: "this_month",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando dashboard ejecutivo...</p>
        </div>
      </div>
    );
  }

  const nom035 = metrics?.nom035Compliance;
  const nmx025 = metrics?.nmx025Equality;
  const structure = metrics?.employeesAndStructure;

  // Preparar datos para gráficas
  const riskDistributionData = trends?.riskDistribution?.map((item: any) => ({
    name: item.level === "low" ? "Bajo" : item.level === "medium" ? "Medio" : item.level === "high" ? "Alto" : "Crítico",
    value: item.count,
  })) || [];

  const genderDistributionData = nmx025?.genderDistribution?.map((item: any) => ({
    name: item.sexo,
    value: item.count,
  })) || [];

  const casesTrendData = trends?.casesTrend?.created?.map((item, index) => ({
    date: item.date,
    created: item.count,
    closed: trends.casesTrend.closed[index]?.count || 0,
  })) || [];

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Ejecutivo NOM-035</h1>
          <p className="text-muted-foreground">Métricas clave de cumplimiento y riesgo psicosocial</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Hoy</SelectItem>
              <SelectItem value="week">Esta semana</SelectItem>
              <SelectItem value="month">Este mes</SelectItem>
              <SelectItem value="quarter">Este trimestre</SelectItem>
              <SelectItem value="year">Este año</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            onClick={handleExport} 
            disabled={exportMutation.isPending}
            variant="outline"
          >
            <Download className="mr-2 h-4 w-4" />
            {exportMutation.isPending ? "Exportando..." : "Exportar a Excel"}
          </Button>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Tasa de Cumplimiento */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Cumplimiento</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: COLORS.success }}>
              {nom035?.surveyCoverage?.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">Cobertura de encuestas</p>
          </CardContent>
        </Card>

        {/* KPI 2: Casos Críticos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casos Críticos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: COLORS.danger }}>
              {nom035?.casesOpen || 0}
            </div>
            <p className="text-xs text-muted-foreground">Casos abiertos</p>
          </CardContent>
        </Card>

        {/* KPI 3: Total de Empleados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
              {structure?.totalEmployees || 0}
            </div>
            <p className="text-xs text-muted-foreground">Plantilla activa</p>
          </CardContent>
        </Card>

        {/* KPI 4: Casos Cerrados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casos Cerrados</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" style={{ color: COLORS.success }}>
              {nom035?.casesClosed || 0}
            </div>
            <p className="text-xs text-muted-foreground">Resueltos exitosamente</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas de Tendencias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencia de Casos */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Casos</CardTitle>
            <CardDescription>Casos creados vs cerrados en el período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={casesTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="created" stroke={COLORS.danger} name="Creados" />
                <Line type="monotone" dataKey="closed" stroke={COLORS.success} name="Cerrados" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución de Riesgo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Riesgo</CardTitle>
            <CardDescription>Casos por nivel de riesgo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(COLORS)[index % Object.values(COLORS).length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución por Departamento */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Departamento</CardTitle>
            <CardDescription>Empleados por departamento</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={structure?.departmentDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="department" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill={COLORS.primary} name="Empleados" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Distribución de Género */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Género</CardTitle>
            <CardDescription>Equidad de género en la organización</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={genderDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {genderDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? COLORS.primary : COLORS.success} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Métricas NMX-025 */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Igualdad Laboral (NMX-025)</CardTitle>
          <CardDescription>Indicadores de equidad de género</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Mujeres en Puestos Directivos</p>
              <p className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                {nmx025?.femaleDirectivesPercentage?.toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Total de Quejas</p>
              <p className="text-2xl font-bold" style={{ color: COLORS.warning }}>
                {nmx025?.totalComplaints || 0}
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Representantes Legales</p>
              <p className="text-2xl font-bold" style={{ color: COLORS.success }}>
                {structure?.activeLegalReps || 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
