import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Building2, Briefcase, Users } from "lucide-react";

// Paleta de colores profesional: negro, verde, azul marino, rojo
const COLORS = ["#1e3a8a", "#16a34a", "#dc2626", "#0f172a", "#22c55e", "#ef4444"];

export default function OrganizationDashboard() {
  // @ts-expect-error - Router types will regenerate on server restart
  const { data: deptStats, isLoading: loadingDepts } = trpc.departments.getStats.useQuery();
  // @ts-expect-error - Router types will regenerate on server restart
  const { data: posStats, isLoading: loadingPos } = trpc.positions.getStats.useQuery();

  if (loadingDepts || loadingPos) {
    return (
      <div className="container py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
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
    .map((dept: { name: string; employeeCount: number }) => ({
      name: dept.name,
      empleados: dept.employeeCount,
    }))
    .sort((a: { empleados: number }, b: { empleados: number }) => b.empleados - a.empleados);

  // Preparar datos para gráfico de puestos (top 10)
  const posChartData = (posStats?.positions || [])
    .map((pos: { title: string; employeeCount: number }) => ({
      name: pos.title,
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

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Organizacional</h1>
        <p className="text-muted-foreground mt-2">
          Estadísticas visuales de empleados por departamento y puesto
        </p>
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
