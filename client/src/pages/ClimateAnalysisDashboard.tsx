import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  ZAxis
} from "recharts";
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ClimateAnalysisDashboard() {
  const [selectedPeriod] = useState("2026-Q1");
  
  const { data: analytics, isLoading: analyticsLoading } = trpc.climateAnalysis.getCurrentAnalytics.useQuery({
    surveyId: 1,
    period: selectedPeriod,
  });

  const { data: correlations } = trpc.climateAnalysis.getDetailedCorrelations.useQuery({
    period: selectedPeriod,
  });

  const { data: trends } = trpc.climateAnalysis.getHistoricalTrends.useQuery({
    surveyId: 1,
    startPeriod: "2025-Q1",
    endPeriod: "2026-Q1",
  });

  if (analyticsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando análisis de clima laboral...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Sin Datos Disponibles</CardTitle>
            <CardDescription>
              No hay análisis de clima laboral para el periodo seleccionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Asegúrate de que los empleados hayan completado las encuestas de clima organizacional.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getClimateStatus = (index: number) => {
    if (index >= 80) return { label: "Excelente", color: "bg-green-500", icon: CheckCircle2 };
    if (index >= 60) return { label: "Bueno", color: "bg-blue-500", icon: TrendingUp };
    if (index >= 40) return { label: "Regular", color: "bg-yellow-500", icon: Minus };
    return { label: "Crítico", color: "bg-red-500", icon: AlertCircle };
  };

  const climateStatus = getClimateStatus(analytics.climateIndex);
  const StatusIcon = climateStatus.icon;

  // Preparar datos para gráficos
  const dimensionData = Object.values(analytics.dimensionScores || {}).map((dim: any) => ({
    dimension: dim.dimensionName,
    score: dim.score,
    participationRate: dim.participationRate,
  }));

  const historicalData = trends?.map(t => ({
    period: t.period,
    climateIndex: t.climateIndex,
  })) || [];

  const correlationData = correlations ? [
    { metric: "Rotación", correlation: correlations.correlations?.climateVsRotation?.correlation || 0, value: correlations.turnover?.rate || 0 },
    { metric: "Equidad", correlation: correlations.correlations?.climateVsEquity?.correlation || 0, value: correlations.equity?.index || 0 },
    { metric: "Productividad", correlation: correlations.correlations?.climateVsProductivity?.correlation || 0, value: 75 },
  ] : [];

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard de Clima Laboral</h1>
            <p className="text-muted-foreground mt-1">
              Análisis de satisfacción organizacional y correlaciones con métricas clave
            </p>
          </div>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar Reporte
          </Button>
        </div>

        {/* Índice de Clima Global */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <StatusIcon className={`h-5 w-5 text-white ${climateStatus.color} rounded-full p-1`} />
              Índice de Clima Laboral Global
            </CardTitle>
            <CardDescription>Periodo: {selectedPeriod}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="text-6xl font-bold">{analytics.climateIndex}</div>
              <div>
                <Badge className={climateStatus.color}>{climateStatus.label}</Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Promedio de satisfacción organizacional en escala 0-100
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="current" className="space-y-4">
          <TabsList>
            <TabsTrigger value="current">Resultados Actuales</TabsTrigger>
            <TabsTrigger value="trends">Tendencias Históricas</TabsTrigger>
            <TabsTrigger value="correlations">Correlaciones</TabsTrigger>
          </TabsList>

          {/* Tab: Resultados Actuales */}
          <TabsContent value="current" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Satisfacción por Dimensión</CardTitle>
                <CardDescription>
                  Desglose de scores por área organizacional
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={dimensionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dimension" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="score" fill="#3b82f6" name="Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Áreas Críticas */}
            {analytics.criticalAreas && analytics.criticalAreas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Áreas Críticas Detectadas
                  </CardTitle>
                  <CardDescription>
                    Dimensiones con score inferior a 60 que requieren atención inmediata
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dimensión</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Empleados Afectados</TableHead>
                        <TableHead>Recomendaciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.criticalAreas.map((area, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{area.dimension}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">{area.score}</Badge>
                          </TableCell>
                          <TableCell>{area.affectedEmployees}</TableCell>
                          <TableCell>
                            <ul className="text-sm space-y-1">
                              {area.recommendations.map((rec, i) => (
                                <li key={i}>• {rec}</li>
                              ))}
                            </ul>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab: Tendencias Históricas */}
          <TabsContent value="trends" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Evolución del Índice de Clima Laboral</CardTitle>
                <CardDescription>
                  Tendencia temporal del clima organizacional
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="climateIndex" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Índice de Clima"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Correlaciones */}
          <TabsContent value="correlations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Correlación Clima vs Métricas Clave</CardTitle>
                <CardDescription>
                  Relación entre clima laboral y rotación/equidad/productividad
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="correlation" domain={[-1, 1]} name="Correlación" />
                    <YAxis type="number" dataKey="value" name="Valor" />
                    <ZAxis range={[100, 400]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Legend />
                    <Scatter name="Métricas" data={correlationData} fill="#3b82f6" />
                  </ScatterChart>
                </ResponsiveContainer>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {correlationData.map((item, idx) => (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle className="text-sm">{item.metric}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {item.correlation > 0 ? "+" : ""}{(item.correlation * 100).toFixed(0)}%
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {item.correlation > 0.5 ? "Correlación positiva fuerte" : 
                           item.correlation < -0.5 ? "Correlación negativa fuerte" : 
                           "Correlación moderada"}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
