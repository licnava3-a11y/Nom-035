import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Calendar,
  BarChart3,
  Brain,
  Clock
} from "lucide-react";

const alertTypeLabels = {
  critical_cases: "Casos Críticos",
  low_coverage: "Baja Cobertura",
  excellent_compliance: "Cumplimiento Excelente",
};

const confidenceBadgeVariant = {
  high: "default" as const,
  medium: "secondary" as const,
  low: "outline" as const,
};

const confidenceLabels = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const trendIcons = {
  increasing: TrendingUp,
  stable: Minus,
  decreasing: TrendingDown,
};

const trendLabels = {
  increasing: "Frecuencia creciente",
  stable: "Frecuencia estable",
  decreasing: "Frecuencia decreciente",
};

const trendColors = {
  increasing: "text-red-600",
  stable: "text-blue-600",
  decreasing: "text-green-600",
};

type AlertType = "critical_cases" | "low_coverage" | "excellent_compliance";

interface PredictionCardProps {
  alertType: AlertType;
  prediction: {
    hasSufficientData: boolean;
    historicalCount?: number;
    analysis?: {
      averageIntervalDays: number;
      standardDeviation: number;
      confidenceLevel: "high" | "medium" | "low";
      trend: "increasing" | "stable" | "decreasing";
      coefficientOfVariation: number;
    };
    prediction?: {
      predictedDate: string;
      daysUntilPredicted: number;
      shouldNotify: boolean;
      notificationMessage: string | null;
    };
    message?: string;
  };
  borderColor?: string;
}

function PredictionCard({ alertType, prediction, borderColor }: PredictionCardProps) {
  if (!prediction.hasSufficientData || !prediction.analysis || !prediction.prediction) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <BarChart3 className="h-5 w-5" />
            <p className="text-sm">
              {prediction.message || `Recopilando datos históricos para análisis predictivo de ${alertTypeLabels[alertType]}...`}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { analysis, prediction: pred } = prediction;
  const TrendIcon = trendIcons[analysis.trend];

  return (
    <Card className={pred.shouldNotify && borderColor ? `${borderColor} border-2` : ""}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <span>{alertTypeLabels[alertType]}</span>
          <Badge variant={confidenceBadgeVariant[analysis.confidenceLevel]}>
            {confidenceLabels[analysis.confidenceLevel]}
          </Badge>
        </CardTitle>
        <CardDescription>
          Basado en {prediction.historicalCount} alertas históricas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Próxima predicción</span>
          </div>
          <span className="font-semibold">
            {pred.daysUntilPredicted > 0
              ? `En ${pred.daysUntilPredicted} días`
              : `Hace ${Math.abs(pred.daysUntilPredicted)} días`}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Intervalo promedio</span>
          </div>
          <span className="font-semibold">
            {analysis.averageIntervalDays} días
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendIcon className={`h-4 w-4 ${trendColors[analysis.trend]}`} />
            <span className="text-sm text-muted-foreground">Tendencia</span>
          </div>
          <span className={`font-semibold ${trendColors[analysis.trend]}`}>
            {trendLabels[analysis.trend]}
          </span>
        </div>

        {pred.shouldNotify && pred.notificationMessage && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              {pred.notificationMessage}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default function PredictiveDashboard() {
  const { data: predictions, isLoading } = trpc.predictiveAlerts.getAllPredictions.useQuery({
    daysAhead: 30,
  });

  const { data: criticalPrediction } = trpc.predictiveAlerts.getPrediction.useQuery({
    alertType: "critical_cases",
    daysAhead: 30,
  });

  const { data: coveragePrediction } = trpc.predictiveAlerts.getPrediction.useQuery({
    alertType: "low_coverage",
    daysAhead: 30,
  });

  const { data: compliancePrediction } = trpc.predictiveAlerts.getPrediction.useQuery({
    alertType: "excellent_compliance",
    daysAhead: 30,
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="max-w-6xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const urgentPredictions = predictions?.filter((p) => p.shouldNotify) || [];

  return (
    <div className="container py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              Análisis Predictivo de Alertas
            </h1>
            <p className="text-muted-foreground mt-2">
              Predicción basada en datos históricos para notificación proactiva
            </p>
          </div>
        </div>

        {/* Urgent Notifications */}
        {urgentPredictions.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Alertas Predictivas Urgentes</AlertTitle>
            <AlertDescription>
              Se predicen {urgentPredictions.length} alerta(s) en los próximos 7 días. Toma acción preventiva ahora.
            </AlertDescription>
          </Alert>
        )}

        {/* Prediction Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {criticalPrediction && (
            <PredictionCard 
              alertType="critical_cases" 
              prediction={criticalPrediction} 
              borderColor="border-red-500"
            />
          )}

          {coveragePrediction && (
            <PredictionCard 
              alertType="low_coverage" 
              prediction={coveragePrediction} 
              borderColor="border-orange-500"
            />
          )}

          {compliancePrediction && (
            <PredictionCard 
              alertType="excellent_compliance" 
              prediction={compliancePrediction} 
              borderColor="border-green-500"
            />
          )}
        </div>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              ¿Cómo Funciona el Análisis Predictivo?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <strong>Análisis de Patrones:</strong> El sistema analiza los últimos 180 días de alertas históricas
              para identificar patrones temporales y calcular intervalos promedio entre ocurrencias.
            </p>
            <p>
              <strong>Nivel de Confianza:</strong> Se calcula basándose en la consistencia de los intervalos históricos.
              Alta confianza indica patrones predecibles, baja confianza sugiere variabilidad significativa.
            </p>
            <p>
              <strong>Notificaciones Proactivas:</strong> Cuando una alerta se predice en los próximos 7 días con
              confianza media o alta, el sistema envía una notificación preventiva automáticamente.
            </p>
            <p>
              <strong>Tendencias:</strong> El análisis identifica si las alertas están ocurriendo con mayor o menor
              frecuencia, permitiendo ajustar estrategias preventivas.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
