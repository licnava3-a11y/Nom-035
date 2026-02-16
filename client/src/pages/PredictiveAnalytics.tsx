import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingUp, Users, AlertCircle } from "lucide-react";
import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PredictiveAnalytics() {
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>(undefined);
  const [riskThreshold, setRiskThreshold] = useState(70);

  const { data, isLoading } = trpc.predictiveAnalytics.getRiskPredictions.useQuery({
    departmentFilter,
    riskThreshold,
    limit: 50,
  });

  const predictions = data?.predictions || [];
  const statistics = data?.statistics;

  // Preparar datos para gráfico de distribución por nivel de riesgo
  const riskDistribution = predictions.reduce((acc, pred) => {
    const level = pred.riskLevel;
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = {
    labels: ['Bajo Riesgo', 'Riesgo Medio', 'Alto Riesgo', 'Riesgo Muy Alto'],
    datasets: [{
      data: [
        riskDistribution['low'] || 0,
        riskDistribution['medium'] || 0,
        riskDistribution['high'] || 0,
        riskDistribution['very_high'] || 0,
      ],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#7f1d1d'],
      borderWidth: 0,
    }],
  };

  const getRiskBadge = (level: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      low: "default",
      medium: "secondary",
      high: "destructive",
      very_high: "destructive",
    };
    const labels: Record<string, string> = {
      low: "Bajo",
      medium: "Medio",
      high: "Alto",
      very_high: "Muy Alto",
    };
    return <Badge variant={variants[level] || "default"}>{labels[level] || level}</Badge>;
  };

  // Extraer recomendaciones únicas
  const allRecommendations = predictions.flatMap(p => p.recommendations);
  const uniqueRecommendations = Array.from(new Set(allRecommendations)).slice(0, 5);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Análisis Predictivo de Riesgos</h1>
          <p className="text-muted-foreground mt-2">
            Identificación temprana de empleados en riesgo psicosocial
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Departamento</label>
            <Select value={departmentFilter} onValueChange={(val) => setDepartmentFilter(val === "all" ? undefined : val)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                <SelectItem value="Operaciones">Operaciones</SelectItem>
                <SelectItem value="Ventas">Ventas</SelectItem>
                <SelectItem value="Administración">Administración</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Umbral de Riesgo (%)</label>
            <Select value={riskThreshold.toString()} onValueChange={(val) => setRiskThreshold(Number(val))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50% - Muy Sensible</SelectItem>
                <SelectItem value="60">60% - Sensible</SelectItem>
                <SelectItem value="70">70% - Moderado</SelectItem>
                <SelectItem value="80">80% - Conservador</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Analizado</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{predictions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Empleados evaluados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Alto Riesgo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {predictions.filter(p => p.riskLevel === 'critical').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Requieren atención inmediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Riesgo Medio</CardTitle>
            <TrendingUp className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {riskDistribution['medium'] || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Monitoreo preventivo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bajo Riesgo</CardTitle>
            <AlertCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {riskDistribution['low'] || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Sin intervención requerida</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Distribución */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Distribución por Nivel de Riesgo</CardTitle>
            <CardDescription>Clasificación de empleados según score predictivo</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <div className="w-64 h-64">
              <Pie data={pieData} options={{ maintainAspectRatio: true }} />
            </div>
          </CardContent>
        </Card>

        {/* Panel de Recomendaciones */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recomendaciones Prioritarias</CardTitle>
            <CardDescription>Acciones sugeridas basadas en análisis predictivo</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {uniqueRecommendations.length > 0 ? (
                uniqueRecommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No hay recomendaciones disponibles</p>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Empleados de Alto Riesgo */}
      <Card>
        <CardHeader>
          <CardTitle>Empleados de Alto Riesgo</CardTitle>
          <CardDescription>
            Lista de empleados con score de riesgo ≥ {riskThreshold}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Cargando predicciones...</p>
          ) : predictions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Puesto</TableHead>
                  <TableHead className="text-center">Score de Riesgo</TableHead>
                  <TableHead className="text-center">Nivel de Riesgo</TableHead>
                  <TableHead>Factores Principales</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {predictions.map((pred) => (
                  <TableRow key={pred.userId}>
                    <TableCell className="font-medium">{pred.name}</TableCell>
                    <TableCell>{pred.department || "N/A"}</TableCell>
                    <TableCell>{pred.position || "N/A"}</TableCell>
                    <TableCell className="text-center">
                      <span className={`font-bold ${
                        pred.riskScore >= 80 ? 'text-red-600' :
                        pred.riskScore >= 60 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {pred.riskScore}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {getRiskBadge(pred.riskLevel)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {pred.recommendations.slice(0, 2).join('; ')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No se encontraron empleados con riesgo ≥ {riskThreshold}%
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
