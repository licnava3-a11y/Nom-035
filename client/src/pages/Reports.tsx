import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Download, FileText, TrendingUp, Users, AlertCircle, Calendar } from "lucide-react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useState } from "react";

export default function Reports() {
  const { user } = useAuth();
  const [timePeriod, setTimePeriod] = useState("month");

  // Datos de ejemplo para las gráficas
  const trainingProgressData = [
    { name: "Ene", completadas: 12, enProgreso: 8 },
    { name: "Feb", completadas: 15, enProgreso: 10 },
    { name: "Mar", completadas: 18, enProgreso: 12 },
    { name: "Abr", completadas: 22, enProgreso: 15 },
    { name: "May", completadas: 25, enProgreso: 18 },
    { name: "Jun", completadas: 28, enProgreso: 20 },
  ];

  const casesData = [
    { name: "Mobbing", value: 5, color: "#ef4444" },
    { name: "Burnout", value: 8, color: "#f59e0b" },
    { name: "Violencia", value: 3, color: "#dc2626" },
    { name: "Estrés", value: 12, color: "#eab308" },
    { name: "Otro", value: 2, color: "#6b7280" },
  ];

  const complianceData = [
    { mes: "Ene", cumplimiento: 85 },
    { mes: "Feb", cumplimiento: 88 },
    { mes: "Mar", cumplimiento: 90 },
    { mes: "Abr", cumplimiento: 92 },
    { mes: "May", cumplimiento: 93 },
    { mes: "Jun", cumplimiento: 94 },
  ];

  const categoryData = [
    { categoria: "Fundamentos", participantes: 45 },
    { categoria: "Mobbing", participantes: 32 },
    { categoria: "Burnout", participantes: 28 },
    { categoria: "Protocolos", participantes: 38 },
    { categoria: "Comité", participantes: 15 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes y Métricas</h1>
          <p className="text-muted-foreground mt-2">
            Análisis y estadísticas del programa de capacitación NOM-035
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Periodo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última semana</SelectItem>
              <SelectItem value="month">Último mes</SelectItem>
              <SelectItem value="quarter">Último trimestre</SelectItem>
              <SelectItem value="year">Último año</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Capacitaciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">28</div>
            <p className="text-xs text-muted-foreground">Completadas este mes</p>
            <p className="text-xs text-green-600 mt-1">+12% vs mes anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Participantes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">158</div>
            <p className="text-xs text-muted-foreground">Empleados capacitados</p>
            <p className="text-xs text-green-600 mt-1">+8% vs mes anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casos Atendidos</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">30</div>
            <p className="text-xs text-muted-foreground">En el último trimestre</p>
            <p className="text-xs text-red-600 mt-1">+5% vs trimestre anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento NOM-035</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">Objetivo: 90%</p>
            <p className="text-xs text-green-600 mt-1">+2% vs mes anterior</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Training Progress Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Progreso de Capacitación</CardTitle>
            <CardDescription>Capacitaciones completadas y en progreso por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trainingProgressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completadas" fill="#10b981" name="Completadas" />
                <Bar dataKey="enProgreso" fill="#3b82f6" name="En Progreso" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Cases Distribution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Casos</CardTitle>
            <CardDescription>Casos de riesgo psicosocial por tipo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={casesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {casesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Compliance Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Cumplimiento</CardTitle>
            <CardDescription>Porcentaje de cumplimiento NOM-035 mensual</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={complianceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cumplimiento" stroke="#10b981" strokeWidth={2} name="Cumplimiento %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Participation Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Participación por Categoría</CardTitle>
            <CardDescription>Número de participantes por categoría de curso</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="categoria" type="category" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="participantes" fill="#3b82f6" name="Participantes" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Available Reports */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Reportes Disponibles</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          {/* Report 1 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Reporte de Capacitación</CardTitle>
                  <CardDescription className="mt-1">
                    Listado completo de capacitaciones, participantes y certificaciones
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open('/api/export/training/pdf', '_blank')}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open('/api/export/training/excel', '_blank')}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Report 2 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Reporte de Casos</CardTitle>
                  <CardDescription className="mt-1">
                    Estadísticas y seguimiento de casos de riesgo psicosocial
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open('/api/export/cases/pdf', '_blank')}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open('/api/export/cases/excel', '_blank')}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Report 3 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Reporte de Cumplimiento</CardTitle>
                  <CardDescription className="mt-1">
                    Indicadores de cumplimiento NOM-035 y áreas de mejora
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open('/api/export/compliance/pdf', '_blank')}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open('/api/export/compliance/excel', '_blank')}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Excel
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Report 4 */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Reporte de Participantes</CardTitle>
                  <CardDescription className="mt-1">
                    Progreso individual y certificaciones por empleado
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open('/api/export/training/pdf', '_blank')}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open('/api/export/training/excel', '_blank')}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Excel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
