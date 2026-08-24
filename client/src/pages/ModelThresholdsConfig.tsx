import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2,
  RotateCcw,
  Save,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ModelThresholdsConfig() {
  const {
    data: activeConfig,
    isLoading,
    refetch,
  } = trpc.modelThresholds.getActiveThresholds.useQuery();
  const { data: correlationMetrics } =
    trpc.predictiveCorrelation.getModelAccuracy.useQuery({});
  const updateMutation = trpc.modelThresholds.updateThresholds.useMutation();
  const resetMutation = trpc.modelThresholds.resetToDefaults.useMutation();

  const [criticalCommentsWeight, setCriticalCommentsWeight] = useState(40);
  const [openCasesWeight, setOpenCasesWeight] = useState(30);
  const [highRiskSurveysWeight, setHighRiskSurveysWeight] = useState(30);
  const [highRiskThreshold, setHighRiskThreshold] = useState(70);
  const [mediumRiskThreshold, setMediumRiskThreshold] = useState(40);
  const [description, setDescription] = useState("");

  // Sincronizar con configuración activa
  useEffect(() => {
    if (activeConfig) {
      setCriticalCommentsWeight(activeConfig.criticalCommentsWeight);
      setOpenCasesWeight(activeConfig.openCasesWeight);
      setHighRiskSurveysWeight(activeConfig.highRiskSurveysWeight);
      setHighRiskThreshold(activeConfig.highRiskThreshold);
      setMediumRiskThreshold(activeConfig.mediumRiskThreshold);
      setDescription(activeConfig.description || "");
    }
  }, [activeConfig]);

  const totalWeight =
    criticalCommentsWeight + openCasesWeight + highRiskSurveysWeight;
  const isValidWeight = totalWeight === 100;
  const isValidThresholds = mediumRiskThreshold < highRiskThreshold;

  const handleSave = async () => {
    if (!isValidWeight) {
      toast.error("Los pesos deben sumar exactamente 100%");
      return;
    }

    if (!isValidThresholds) {
      toast.error(
        "El umbral de riesgo medio debe ser menor que el umbral de riesgo alto"
      );
      return;
    }

    try {
      await updateMutation.mutateAsync({
        criticalCommentsWeight,
        openCasesWeight,
        highRiskSurveysWeight,
        highRiskThreshold,
        mediumRiskThreshold,
        description,
      });
      toast.success("Configuración actualizada exitosamente");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar configuración");
    }
  };

  const handleReset = async () => {
    try {
      await resetMutation.mutateAsync();
      toast.success("Valores por defecto restaurados");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al restaurar valores por defecto");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Configuración de Umbrales del Modelo Predictivo
        </h1>
        <p className="text-muted-foreground mt-2">
          Ajusta los pesos de la fórmula predictiva de rotación para optimizar
          la precisión del modelo
        </p>
      </div>

      {/* Métricas actuales del modelo */}
      {correlationMetrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Precisión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {correlationMetrics.metrics.precision.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recall
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {correlationMetrics.metrics.recall.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                F1-Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {correlationMetrics.metrics.f1Score.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Accuracy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {correlationMetrics.metrics.accuracy.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Formulario de configuración */}
      <Card>
        <CardHeader>
          <CardTitle>Pesos de la Fórmula Predictiva</CardTitle>
          <CardDescription>
            Los pesos determinan la importancia de cada factor en el cálculo del
            riesgo de rotación
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Validación de suma de pesos */}
          {!isValidWeight && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Los pesos deben sumar exactamente 100%. Suma actual:{" "}
                {totalWeight}%
              </AlertDescription>
            </Alert>
          )}

          {/* Comentarios Críticos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="criticalComments">
                Comentarios Críticos (últimos 90 días)
              </Label>
              <span className="text-sm font-medium">
                {criticalCommentsWeight}%
              </span>
            </div>
            <Slider
              id="criticalComments"
              value={[criticalCommentsWeight]}
              onValueChange={value => setCriticalCommentsWeight(value[0])}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Peso de comentarios críticos detectados por análisis de
              sentimiento
            </p>
          </div>

          {/* Casos Abiertos */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="openCases">Casos Abiertos del Empleado</Label>
              <span className="text-sm font-medium">{openCasesWeight}%</span>
            </div>
            <Slider
              id="openCases"
              value={[openCasesWeight]}
              onValueChange={value => setOpenCasesWeight(value[0])}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Peso de casos psicosociales abiertos asociados al empleado
            </p>
          </div>

          {/* Encuestas de Alto Riesgo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="highRiskSurveys">Encuestas de Alto Riesgo</Label>
              <span className="text-sm font-medium">
                {highRiskSurveysWeight}%
              </span>
            </div>
            <Slider
              id="highRiskSurveys"
              value={[highRiskSurveysWeight]}
              onValueChange={value => setHighRiskSurveysWeight(value[0])}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Peso de encuestas NOM-035 con nivel de riesgo alto
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Umbrales de clasificación */}
      <Card>
        <CardHeader>
          <CardTitle>Umbrales de Clasificación de Riesgo</CardTitle>
          <CardDescription>
            Define los límites para clasificar empleados en niveles de riesgo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isValidThresholds && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                El umbral de riesgo medio debe ser menor que el umbral de riesgo
                alto
              </AlertDescription>
            </Alert>
          )}

          {/* Umbral Alto Riesgo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="highRiskThreshold">Umbral de Alto Riesgo</Label>
              <span className="text-sm font-medium">
                ≥ {highRiskThreshold} puntos
              </span>
            </div>
            <Slider
              id="highRiskThreshold"
              value={[highRiskThreshold]}
              onValueChange={value => setHighRiskThreshold(value[0])}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Empleados con score igual o superior se clasifican como alto
              riesgo
            </p>
          </div>

          {/* Umbral Riesgo Medio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="mediumRiskThreshold">
                Umbral de Riesgo Medio
              </Label>
              <span className="text-sm font-medium">
                ≥ {mediumRiskThreshold} puntos
              </span>
            </div>
            <Slider
              id="mediumRiskThreshold"
              value={[mediumRiskThreshold]}
              onValueChange={value => setMediumRiskThreshold(value[0])}
              max={100}
              step={5}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Empleados con score entre este valor y el umbral alto se
              clasifican como riesgo medio
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Descripción */}
      <Card>
        <CardHeader>
          <CardTitle>Descripción de la Configuración</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Describe los cambios realizados y el motivo..."
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Botones de acción */}
      <div className="flex gap-4">
        <Button
          onClick={handleSave}
          disabled={
            !isValidWeight || !isValidThresholds || updateMutation.isPending
          }
          className="flex-1"
        >
          {updateMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Guardar Configuración
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={resetMutation.isPending}
        >
          {resetMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Restaurando...
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restaurar Valores por Defecto
            </>
          )}
        </Button>
      </div>

      {/* Información adicional */}
      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertDescription>
          <strong>Recomendación:</strong> Después de ajustar los umbrales,
          monitorea las métricas de precisión en el dashboard de "Evolución del
          Modelo" para validar que los cambios mejoran el rendimiento
          predictivo.
        </AlertDescription>
      </Alert>
    </div>
  );
}
