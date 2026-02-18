import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter } from "recharts";
import { Target, TrendingUp, DollarSign, Activity, AlertCircle } from "lucide-react";

const interventionTypeLabels: Record<string, string> = {
  training: "Capacitación",
  salary_adjustment: "Ajuste Salarial",
  position_change: "Cambio de Puesto",
  benefits: "Beneficios",
  recognition: "Reconocimiento",
  other: "Otro",
};

export default function InterventionPredictionDashboard() {
  // Form state
  const [interventionType, setInterventionType] = useState<"training" | "salary_adjustment" | "position_change" | "benefits" | "recognition" | "other">("training");
  const [cost, setCost] = useState("5000");
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [riskScore, setRiskScore] = useState([50]);
  const [turnoverProbability, setTurnoverProbability] = useState([50]);

  // Query prediction
  const { data: prediction, isLoading, refetch } = trpc.interventionPrediction.predictEffectiveness.useQuery({
    interventionType,
    cost: parseFloat(cost) || 0,
    department: department || undefined,
    position: position || undefined,
    riskScore: riskScore[0],
    turnoverProbability: turnoverProbability[0],
  });

  // Generar datos para gráfico de costo vs probabilidad
  const costVsProbabilityData = [1000, 3000, 5000, 10000, 15000, 20000, 30000].map((c) => ({
    cost: c,
    probability: prediction ? prediction.successProbability * (c / (parseFloat(cost) || 5000)) * 0.95 : 50,
  }));

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Predicción de Efectividad de Intervenciones</h1>
        <p className="text-muted-foreground mt-2">
          Simula intervenciones y predice su probabilidad de éxito antes de aplicarlas
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Formulario de Simulación */}
        <Card>
          <CardHeader>
            <CardTitle>Simulador de Intervención</CardTitle>
            <CardDescription>Configura los parámetros de la intervención a evaluar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="interventionType">Tipo de Intervención</Label>
              <Select value={interventionType} onValueChange={(value: any) => setInterventionType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">Capacitación</SelectItem>
                  <SelectItem value="salary_adjustment">Ajuste Salarial</SelectItem>
                  <SelectItem value="position_change">Cambio de Puesto</SelectItem>
                  <SelectItem value="benefits">Beneficios</SelectItem>
                  <SelectItem value="recognition">Reconocimiento</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Costo Estimado (MXN)</Label>
              <Input
                id="cost"
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="5000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento (opcional)</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="Ej: Ventas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Puesto (opcional)</Label>
              <Input
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="Ej: Analista"
              />
            </div>

            <div className="space-y-2">
              <Label>Puntuación de Riesgo: {riskScore[0]}</Label>
              <Slider
                value={riskScore}
                onValueChange={setRiskScore}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Probabilidad de Rotación: {turnoverProbability[0]}%</Label>
              <Slider
                value={turnoverProbability}
                onValueChange={setTurnoverProbability}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            <Button onClick={() => refetch()} className="w-full">
              Calcular Predicción
            </Button>
          </CardContent>
        </Card>

        {/* Resultados de Predicción */}
        <Card>
          <CardHeader>
            <CardTitle>Resultados de Predicción</CardTitle>
            <CardDescription>
              {prediction?.historicalData.totalCases
                ? `Basado en ${prediction.historicalData.totalCases} casos históricos`
                : "Basado en estimaciones generales"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-center text-muted-foreground">Calculando predicción...</p>
            ) : prediction ? (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Probabilidad de Éxito</span>
                    </div>
                    <div className="text-3xl font-bold text-blue-600">
                      {prediction.successProbability}%
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">ROI Esperado</span>
                    </div>
                    <div className="text-3xl font-bold text-green-600">
                      {prediction.expectedROI > 0 ? "+" : ""}{prediction.expectedROI}%
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Reducción de Riesgo</span>
                    </div>
                    <div className="text-3xl font-bold text-purple-600">
                      {prediction.expectedRiskReduction}%
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium">Confianza</span>
                    </div>
                    <div className="text-3xl font-bold text-orange-600">
                      {prediction.confidence}%
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Recomendación</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {prediction.recommendation}
                      </p>
                    </div>
                  </div>
                </div>

                {prediction.historicalData.totalCases > 0 && (
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-2">Datos Históricos</p>
                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Casos totales:</span>
                        <span className="font-medium">{prediction.historicalData.totalCases}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Casos similares:</span>
                        <span className="font-medium">{prediction.historicalData.similarCases}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tasa de éxito base:</span>
                        <span className="font-medium">{prediction.historicalData.baseSuccessRate}%</span>
                      </div>
                      {prediction.historicalData.similarCases > 0 && (
                        <div className="flex justify-between">
                          <span>Tasa de éxito similar:</span>
                          <span className="font-medium">{prediction.historicalData.similarSuccessRate}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <p className="text-sm font-medium mb-2">Factores de Confianza</p>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Calidad de Datos</span>
                        <span>{prediction.confidenceFactors.dataQuality.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${prediction.confidenceFactors.dataQuality}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Similaridad</span>
                        <span>{prediction.confidenceFactors.similarity.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${prediction.confidenceFactors.similarity}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Alineación de Riesgo</span>
                        <span>{prediction.confidenceFactors.riskAlignment.toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-600 h-2 rounded-full"
                          style={{ width: `${prediction.confidenceFactors.riskAlignment}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground">Configura los parámetros y calcula la predicción</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Costo vs Probabilidad */}
      {prediction && (
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Costo vs Probabilidad de Éxito</CardTitle>
            <CardDescription>Relación entre inversión y efectividad esperada</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={costVsProbabilityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="cost"
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  label={{ value: "Costo (MXN)", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  label={{ value: "Probabilidad de Éxito (%)", angle: -90, position: "insideLeft" }}
                />
                <Tooltip
                  formatter={(value: any) => [`${value.toFixed(1)}%`, "Probabilidad"]}
                  labelFormatter={(label) => `Costo: $${label.toLocaleString()} MXN`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="probability"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Probabilidad de Éxito"
                  dot={{ fill: "#3b82f6", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
