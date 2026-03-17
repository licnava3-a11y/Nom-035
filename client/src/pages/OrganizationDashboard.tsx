import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/DateRangePicker";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Building2, Briefcase, Users, FileSpreadsheet, Calendar } from "lucide-react";
import { DateRange } from "react-day-picker";
import { subWeeks, subMonths, subYears, format } from "date-fns";
import * as XLSX from 'xlsx';
// Paleta de colores profesional: negro, verde, azul marino, rojo
const COLORS = ["#1e3a8a", "#16a34a", "#dc2626", "#0f172a", "#22c55e", "#ef4444"];

export default function OrganizationDashboard() {
  // Estado de filtros temporales
  const [period, setPeriod] = useState<string>("all");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();

  // Calcular rango de fechas según periodo seleccionado
  const getDateRange = () => {
    const today = new Date();
    
    switch (period) {
      case "week":
        return {
          startDate: format(subWeeks(today, 1), "yyyy-MM-dd"),
          endDate: format(today, "yyyy-MM-dd"),
        };
      case "month":
        return {
          startDate: format(subMonths(today, 1), "yyyy-MM-dd"),
          endDate: format(today, "yyyy-MM-dd"),
        };
      case "year":
        return {
          startDate: format(subYears(today, 1), "yyyy-MM-dd"),
          endDate: format(today, "yyyy-MM-dd"),
        };
      case "custom":
        if (customRange?.from && customRange?.to) {
          return {
            startDate: format(customRange.from, "yyyy-MM-dd"),
            endDate: format(customRange.to, "yyyy-MM-dd"),
          };
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const dateRange = getDateRange();

  // Persistir filtro en localStorage
  useEffect(() => {
    localStorage.setItem('org-dashboard-period', period);
  }, [period]);

  // Restaurar filtro al cargar
  useEffect(() => {
    const savedPeriod = localStorage.getItem('org-dashboard-period');
    if (savedPeriod) setPeriod(savedPeriod);
  }, []);

  const { data: deptStats, isLoading: loadingDepts } = trpc.departments.getStats.useQuery(dateRange);
  const { data: posStats, isLoading: loadingPos } = trpc.positions.getStats.useQuery(dateRange);

  if (loadingDepts || loadingPos) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i: any) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const totalDepartments = deptStats?.totalDepartments || 0;
  const totalPositions = posStats?.totalPositions || 0;
  const totalEmployees = deptStats?.totalEmployees || 0;

  // Preparar datos para gráfico de departamentos
  const deptChartData = (deptStats?.departments || [])
    .map((dept: { departmentName: string; employeeCount: number }) => ({
      name: dept.departmentName,
      empleados: dept.employeeCount,
    }))
    .sort((a: { empleados: number }, b: { empleados: number }) => b.empleados - a.empleados);

  // Preparar datos para gráfico de puestos (top 10)
  const posChartData = (posStats?.positions || [])
    .map((pos: { positionTitle: string; employeeCount: number }) => ({
      name: pos.positionTitle,
      empleados: pos.employeeCount,
    }))
    .sort((a: { empleados: number }, b: { empleados: number }) => b.empleados - a.empleados)
    .slice(0, 10);

  // Preparar datos para gráfico de pie (distribución porcentual)
  const pieData = deptChartData.map((dept: { name: string; empleados: number }, index: number) => ({
    name: dept.name,
    value: dept.empleados,
    fill: COLORS[index % COLORS.length],
  }));

  // Exportar a Excel
  const handleExportExcel = () => {
    if (!deptStats || !posStats) return;

    // Hoja 1: KPIs
    const kpisData = [
      ['Indicador', 'Valor'],
      ['Total Departamentos', totalDepartments],
      ['Total Puestos', totalPositions],
      ['Total Empleados', totalEmployees],
      ['Promedio Empleados por Departamento', (totalEmployees / (totalDepartments || 1)).toFixed(2)],
    ];

    // Hoja 2: Empleados por Departamento
    const deptData = [
      ['Departamento', 'Empleados'],
      ...deptChartData.map((d: { name: string; empleados: number }) => [d.name, d.empleados]),
    ];

    // Hoja 3: Empleados por Puesto (Top 10)
    const posData = [
      ['Puesto', 'Empleados'],
      ...posChartData.map((p: { name: string; empleados: number }) => [p.name, p.empleados]),
    ];

    // Crear libro de Excel
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.aoa_to_sheet(kpisData);
    const ws2 = XLSX.utils.aoa_to_sheet(deptData);
    const ws3 = XLSX.utils.aoa_to_sheet(posData);

    XLSX.utils.book_append_sheet(wb, ws1, 'KPIs');
    XLSX.utils.book_append_sheet(wb, ws2, 'Por Departamento');
    XLSX.utils.book_append_sheet(wb, ws3, 'Por Puesto');

    // Descargar archivo
    XLSX.writeFile(wb, `dashboard-organizacional-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Organizacional</h1>
          <p className="text-muted-foreground mt-2">
            Estadísticas visuales de empleados por departamento y puesto
          </p>
          {period !== "all" && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Periodo: {period === "week" && "Semana anterior"}
              {period === "month" && "Mes anterior"}
              {period === "year" && "Año anterior"}
              {period === "custom" && customRange?.from && customRange?.to && (
                `${format(customRange.from, "dd/MM/yyyy")} - ${format(customRange.to, "dd/MM/yyyy")}`
              )}
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los periodos</SelectItem>
              <SelectItem value="week">Semana anterior</SelectItem>
              <SelectItem value="month">Mes anterior</SelectItem>
              <SelectItem value="year">Año anterior</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          
          {period === "custom" && (
            <DateRangePicker value={customRange} onChange={setCustomRange} />
          )}
          
          <Button
            onClick={handleExportExcel}
            className="bg-[#16a34a] hover:bg-[#15803d]"
          >
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Exportar a Excel
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-[#1e3a8a]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Departamentos</CardTitle>
            <Building2 className="h-4 w-4 text-[#1e3a8a]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDepartments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Áreas organizacionales activas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#16a34a]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Puestos</CardTitle>
            <Briefcase className="h-4 w-4 text-[#16a34a]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPositions}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Posiciones definidas en la organización
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#dc2626]">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
            <Users className="h-4 w-4 text-[#dc2626]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Plantilla laboral activa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Gráfico de barras: Empleados por departamento */}
        <Card>
          <CardHeader>
            <CardTitle>Empleados por Departamento</CardTitle>
            <CardDescription>Distribución de la plantilla laboral por área</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deptChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  tick={{ fontSize: 12 }}
                />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Bar dataKey="empleados" fill="#1e3a8a" name="Empleados" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de pie: Distribución porcentual */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución Porcentual</CardTitle>
            <CardDescription>Proporción de empleados por departamento</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: { name: string; percent: number }) => 
                    `${entry.name}: ${(entry.percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((_entry: unknown, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de barras horizontales: Top 10 puestos */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Puestos con Más Empleados</CardTitle>
          <CardDescription>Posiciones con mayor número de trabajadores asignados</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={posChartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" />
              <YAxis 
                dataKey="name" 
                type="category" 
                width={150}
                tick={{ fontSize: 12 }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#ffffff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px'
                }}
              />
              <Legend />
              <Bar dataKey="empleados" fill="#16a34a" name="Empleados" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
