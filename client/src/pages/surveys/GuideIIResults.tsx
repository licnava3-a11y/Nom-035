import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from "recharts";
import {
  Download,
  AlertTriangle,
  CheckCircle2,
  Info,
  ArrowLeft,
} from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Dashboard de Resultados de Guía II NOM-035
 *
 * Visualiza resultados calculados de análisis de factores de riesgo psicosocial
 * para empresas de 16-50 trabajadores según NOM-035-STPS-2018.
 */

// Colores según nivel de riesgo (paleta institucional: verde, azul marino, rojo)
const RISK_COLORS = {
  "Nulo o despreciable": "#10B981", // Verde
  Bajo: "#3B82F6", // Azul
  Medio: "#F59E0B", // Amarillo
  Alto: "#EF4444", // Rojo
  "Muy alto": "#DC2626", // Rojo oscuro
};

// Mapeo de nombres de dominios a español
const DOMAIN_NAMES: Record<string, string> = {
  condicionesAmbiente: "Condiciones en el Ambiente",
  cargaTrabajo: "Carga de Trabajo",
  faltaControl: "Falta de Control",
  jornadasTrabajo: "Jornadas de Trabajo",
  interferenciaFamilia: "Interferencia Trabajo-Familia",
  liderazgo: "Liderazgo",
  relacionesTrabajo: "Relaciones en el Trabajo",
  violencia: "Violencia Laboral",
};

// Mapeo de nombres de categorías a español
const CATEGORY_NAMES: Record<string, string> = {
  ambienteTrabajo: "Ambiente de Trabajo",
  factoresPropios: "Factores Propios de la Actividad",
  organizacionTiempo: "Organización del Tiempo",
  liderazgoRelaciones: "Liderazgo y Relaciones",
};

export default function GuideIIResults() {
  const { responseId } = useParams<{ responseId: string }>();
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("all");

  // Obtener resultados individuales
  const { data: results, isLoading: loadingResults } =
    trpc.surveys.getGuideIIResults.useQuery(
      { responseId: parseInt(responseId || "0") },
      { enabled: !!responseId }
    );

  // Obtener resultados agregados
  const { data: aggregated, isLoading: loadingAggregated } =
    trpc.surveys.getGuideIIAggregatedResults.useQuery({
      departmentId:
        selectedDepartment !== "all" ? parseInt(selectedDepartment) : undefined,
      periodId: selectedPeriod !== "all" ? parseInt(selectedPeriod) : undefined,
    });

  if (loadingResults || loadingAggregated) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando resultados...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No se encontraron resultados. Asegúrese de que la encuesta haya sido
            completada y calculada.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Preparar datos para gráfico de radar (dominios)
  const radarData = Object.entries(results.domainScores).map(
    ([key, value]) => ({
      domain: DOMAIN_NAMES[key] || key,
      score: value,
      riskLevel: results.domainRiskLevels[key],
    })
  );

  // Preparar datos para gráfico de barras (categorías)
  const barData = Object.entries(results.categoryScores).map(
    ([key, value]) => ({
      category: CATEGORY_NAMES[key] || key,
      score: value,
      riskLevel: results.categoryRiskLevels[key],
    })
  );

  // Icono según nivel de riesgo
  const getRiskIcon = (level: string) => {
    if (level === "Nulo o despreciable" || level === "Bajo") {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    } else if (level === "Medio") {
      return <Info className="h-5 w-5 text-yellow-600" />;
    } else {
      return <AlertTriangle className="h-5 w-5 text-red-600" />;
    }
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/surveys")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Encuestas
          </Button>
          <h1 className="text-3xl font-bold">Resultados Guía II NOM-035</h1>
          <p className="text-muted-foreground mt-1">
            Análisis de Factores de Riesgo Psicosocial (16-50 trabajadores)
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Resultado General */}
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold mb-2">
              Nivel de Riesgo General
            </h2>
            <div className="flex items-center gap-3">
              {getRiskIcon(results.finalRiskLevel)}
              <span
                className="text-2xl font-bold"
                style={{
                  color:
                    RISK_COLORS[
                      results.finalRiskLevel as keyof typeof RISK_COLORS
                    ],
                }}
              >
                {results.finalRiskLevel}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Puntaje Final</p>
            <p className="text-4xl font-bold">{results.finalScore}</p>
            <p className="text-xs text-muted-foreground mt-1">
              de 184 puntos máximos
            </p>
          </div>
        </div>
      </Card>

      {/* Gráfico de Radar - Dominios */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Análisis por Dominio</h2>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="domain"
              tick={{ fill: "#6b7280", fontSize: 12 }}
              tickLine={false}
            />
            <PolarRadiusAxis angle={90} domain={[0, "auto"]} />
            <Radar
              name="Puntaje"
              dataKey="score"
              stroke="#1e40af"
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-white border rounded-lg p-3 shadow-lg">
                    <p className="font-semibold">{data.domain}</p>
                    <p className="text-sm">Puntaje: {data.score}</p>
                    <p
                      className="text-sm font-medium"
                      style={{
                        color:
                          RISK_COLORS[
                            data.riskLevel as keyof typeof RISK_COLORS
                          ],
                      }}
                    >
                      {data.riskLevel}
                    </p>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Card>

      {/* Gráfico de Barras - Categorías */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Análisis por Categoría</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="category"
              tick={{ fill: "#6b7280", fontSize: 11 }}
              angle={-15}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fill: "#6b7280" }} />
            <Tooltip
              content={({ payload }) => {
                if (!payload || payload.length === 0) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-white border rounded-lg p-3 shadow-lg">
                    <p className="font-semibold text-sm">{data.category}</p>
                    <p className="text-sm">Puntaje: {data.score}</p>
                    <p
                      className="text-sm font-medium"
                      style={{
                        color:
                          RISK_COLORS[
                            data.riskLevel as keyof typeof RISK_COLORS
                          ],
                      }}
                    >
                      {data.riskLevel}
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="score" radius={[8, 8, 0, 0]}>
              {barData.map((entry: any, index: number) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    RISK_COLORS[entry.riskLevel as keyof typeof RISK_COLORS]
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabla de Dominios */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Detalle por Dominio</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold">Dominio</th>
                <th className="text-center py-3 px-4 font-semibold">Puntaje</th>
                <th className="text-left py-3 px-4 font-semibold">
                  Nivel de Riesgo
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(results.domainScores).map(([key, score]) => (
                <tr key={key} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-4">{DOMAIN_NAMES[key] || key}</td>
                  <td className="py-3 px-4 text-center font-mono">
                    {String(score)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {getRiskIcon(results.domainRiskLevels[key])}
                      <span
                        className="font-medium"
                        style={{
                          color:
                            RISK_COLORS[
                              results.domainRiskLevels[
                                key
                              ] as keyof typeof RISK_COLORS
                            ],
                        }}
                      >
                        {results.domainRiskLevels[key]}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recomendaciones */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Recomendaciones</h2>
        <div className="space-y-3">
          {results.recommendations.map(
            (recommendation: string, index: number) => (
              <Alert
                key={index}
                className="border-l-4"
                style={{
                  borderLeftColor: recommendation.includes("🚨")
                    ? "#DC2626"
                    : recommendation.includes("⚠️")
                      ? "#EF4444"
                      : recommendation.includes("⚡")
                        ? "#F59E0B"
                        : "#10B981",
                }}
              >
                <AlertDescription className="text-sm leading-relaxed">
                  {recommendation}
                </AlertDescription>
              </Alert>
            )
          )}
        </div>
      </Card>

      {/* Resultados Agregados (si hay datos) */}
      {aggregated && aggregated.totalResponses > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Resultados Agregados</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Total de Respuestas
              </p>
              <p className="text-3xl font-bold">{aggregated.totalResponses}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">Puntaje Promedio</p>
              <p className="text-3xl font-bold">
                {aggregated.averageFinalScore.toFixed(1)}
              </p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Distribución de Riesgo
              </p>
              <div className="mt-2 space-y-1">
                {Object.entries(aggregated.riskDistribution).map(
                  ([level, count]) => (
                    <div key={level} className="flex justify-between text-xs">
                      <span>{level}:</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Información de Cálculo */}
      <Card className="p-4 bg-muted/30">
        <p className="text-xs text-muted-foreground">
          <strong>Fecha de cálculo:</strong>{" "}
          {new Date(results.calculatedAt).toLocaleString("es-MX")}
          <br />
          <strong>Algoritmo:</strong> Guía de Referencia II NOM-035-STPS-2018
          (Oficial)
          <br />
          <strong>Aplicable a:</strong> Centros de trabajo con 16 a 50
          trabajadores
        </p>
      </Card>
    </div>
  );
}
