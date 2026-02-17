import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Download, Home } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from "recharts";

const RISK_COLORS = {
  nulo: "#10b981", // green
  bajo: "#84cc16", // lime
  medio: "#eab308", // yellow
  alto: "#f97316", // orange
  muy_alto: "#ef4444", // red
};

const RISK_LABELS = {
  nulo: "Nulo o despreciable",
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto",
  muy_alto: "Muy alto",
};

export default function NOM035Results() {
  const [, setLocation] = useLocation();
  const [surveyPeriodId, setSurveyPeriodId] = useState<number | null>(null);

  // Obtener período activo
  const { data: activePeriod } = trpc.nom035.getActivePeriod.useQuery();

  // Obtener resultados
  const { data: results, isLoading, error } = trpc.nom035.getResults.useQuery(
    { surveyPeriodId: surveyPeriodId! },
    { enabled: !!surveyPeriodId }
  );

  useEffect(() => {
    if (activePeriod) {
      setSurveyPeriodId(activePeriod.id);
    }
  }, [activePeriod]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Cargando resultados...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se encontraron resultados. Por favor completa el cuestionario primero.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => setLocation("/nom035/questionnaire")}>
            Ir al cuestionario
          </Button>
        </div>
      </div>
    );
  }

  // Preparar datos para gráficos
  const categoryData = Object.entries(results.categoryScores || {}).map(([category, score]) => ({
    category: category.length > 30 ? category.substring(0, 30) + "..." : category,
    puntaje: score,
  }));

  const domainData = Object.entries(results.domainScores || {}).map(([domain, score]) => ({
    domain: domain.length > 25 ? domain.substring(0, 25) + "..." : domain,
    puntaje: score,
  }));

  const dimensionData = Object.entries(results.dimensionScores || {})
    .slice(0, 8) // Mostrar solo las 8 dimensiones principales
    .map(([dimension, score]) => ({
      dimension: dimension.length > 20 ? dimension.substring(0, 20) + "..." : dimension,
      puntaje: score,
    }));

  const riskColor = RISK_COLORS[results.globalRiskLevel as keyof typeof RISK_COLORS];
  const riskLabel = RISK_LABELS[results.globalRiskLevel as keyof typeof RISK_LABELS];

  return (
    <div className="container mx-auto py-8 max-w-7xl">
      <div className="space-y-6">
        {/* Encabezado */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Resultados del Cuestionario NOM-035</CardTitle>
                <CardDescription>
                  Análisis de factores de riesgo psicosocial en el trabajo
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setLocation("/")}>
                  <Home className="h-4 w-4 mr-2" />
                  Inicio
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Nivel de riesgo global */}
        <Card>
          <CardHeader>
            <CardTitle>Nivel de Riesgo Global</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div
                className="w-32 h-32 rounded-full flex items-center justify-center"
                style={{ backgroundColor: riskColor + "20", border: `4px solid ${riskColor}` }}
              >
                <div className="text-center">
                  <p className="text-3xl font-bold" style={{ color: riskColor }}>
                    {results.globalScore}
                  </p>
                  <p className="text-xs text-muted-foreground">puntos</p>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-2xl font-bold mb-2" style={{ color: riskColor }}>
                  {riskLabel}
                </p>
                <p className="text-muted-foreground">
                  {results.globalRiskLevel === "muy_alto" &&
                    "Se requiere intervención inmediata con acciones correctivas urgentes."}
                  {results.globalRiskLevel === "alto" &&
                    "Se requieren acciones correctivas prioritarias para reducir los factores de riesgo."}
                  {results.globalRiskLevel === "medio" &&
                    "Se recomienda implementar medidas preventivas para evitar el incremento del riesgo."}
                  {results.globalRiskLevel === "bajo" &&
                    "Mantener las condiciones actuales y realizar evaluaciones periódicas."}
                  {results.globalRiskLevel === "nulo" &&
                    "Las condiciones actuales son favorables. Continuar con las prácticas actuales."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de categorías */}
        <Card>
          <CardHeader>
            <CardTitle>Puntajes por Categoría</CardTitle>
            <CardDescription>
              Distribución de riesgo en las diferentes categorías evaluadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="category" type="category" width={200} />
                <Tooltip />
                <Legend />
                <Bar dataKey="puntaje" fill="#8b5cf6" name="Puntaje">
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${250 - index * 20}, 70%, 60%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico radar de dominios */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis por Dominio</CardTitle>
            <CardDescription>
              Visualización multidimensional de los dominios evaluados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={domainData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="domain" />
                <PolarRadiusAxis />
                <Radar
                  name="Puntaje"
                  dataKey="puntaje"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de dimensiones */}
        <Card>
          <CardHeader>
            <CardTitle>Dimensiones Principales</CardTitle>
            <CardDescription>
              Puntajes en las dimensiones específicas de riesgo psicosocial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={dimensionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dimension" angle={-45} textAnchor="end" height={120} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="puntaje" fill="#06b6d4" name="Puntaje" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Recomendaciones */}
        <Card>
          <CardHeader>
            <CardTitle>Recomendaciones</CardTitle>
            <CardDescription>
              Acciones sugeridas según los resultados obtenidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <div className="whitespace-pre-line text-sm">
                {results.recommendations || "No hay recomendaciones disponibles."}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leyenda de niveles de riesgo */}
        <Card>
          <CardHeader>
            <CardTitle>Interpretación de Niveles de Riesgo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {Object.entries(RISK_LABELS).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: RISK_COLORS[key as keyof typeof RISK_COLORS] }}
                  />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
