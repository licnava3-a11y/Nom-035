import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Target,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Info,
} from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Página de Tamaño de Muestra para Guía III
 *
 * Muestra estadísticas sobre el tamaño de muestra requerido según la NOM-035
 * y el progreso actual de respuestas completadas.
 */

export default function SampleSize() {
  // Obtener estadísticas para Guía III (surveyId = 3)
  const { data: stats, isLoading } = trpc.surveys.getSampleSizeStats.useQuery({
    surveyId: 3,
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <Breadcrumb
          items={[
            { label: "Encuestas NOM-035", href: "/surveys" },
            { label: "Tamaño de Muestra" },
          ]}
        />

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Cargando estadísticas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            No se pudieron cargar las estadísticas de tamaño de muestra.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Tamaño de Muestra - Guía III</h1>
        <p className="text-muted-foreground mt-2">
          Estadísticas de muestra requerida según NOM-035-STPS-2018 para Guía
          III (Cuestionario de evaluación del entorno organizacional)
        </p>
      </div>

      {/* Información sobre el cálculo */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Fórmula de Cálculo</AlertTitle>
        <AlertDescription>
          El tamaño de muestra se calcula con nivel de confianza del{" "}
          <strong>{stats.confidenceLevel}%</strong> y margen de error del{" "}
          <strong>{stats.marginOfError}%</strong> según la fórmula para
          población finita de la NOM-035.
        </AlertDescription>
      </Alert>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de trabajadores */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Total de Trabajadores
              </p>
              <p className="text-3xl font-bold">{stats.totalWorkers}</p>
            </div>
          </div>
        </Card>

        {/* Muestra requerida */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Muestra Requerida</p>
              <p className="text-3xl font-bold">{stats.sampleSize}</p>
            </div>
          </div>
        </Card>

        {/* Respuestas completadas */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Respuestas Completadas
              </p>
              <p className="text-3xl font-bold">{stats.completedResponses}</p>
            </div>
          </div>
        </Card>

        {/* Porcentaje completado */}
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">% Completado</p>
              <p className="text-3xl font-bold">
                {stats.percentageCompleted.toFixed(1)}%
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Barra de progreso */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Progreso de Aplicación</h2>
          {stats.sampleReached ? (
            <span className="flex items-center gap-2 text-green-600 font-semibold">
              <CheckCircle2 className="h-5 w-5" />
              Muestra Alcanzada
            </span>
          ) : (
            <span className="text-muted-foreground">
              Faltan {stats.sampleSize - stats.completedResponses} respuestas
            </span>
          )}
        </div>

        <div className="space-y-2">
          <Progress value={stats.percentageCompleted} className="h-4" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>0%</span>
            <span>{stats.percentageCompleted.toFixed(1)}%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-blue-600">
              {stats.totalWorkers}
            </p>
            <p className="text-sm text-muted-foreground">Población Total</p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-orange-600">
              {stats.sampleSize}
            </p>
            <p className="text-sm text-muted-foreground">Meta de Muestra</p>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <p className="text-2xl font-bold text-green-600">
              {stats.completedResponses}
            </p>
            <p className="text-sm text-muted-foreground">
              Respuestas Obtenidas
            </p>
          </div>
        </div>
      </Card>

      {/* Información adicional */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">
          Información sobre el Tamaño de Muestra
        </h2>

        <div className="space-y-3 text-sm">
          <p>
            <strong>¿Por qué es importante el tamaño de muestra?</strong>
          </p>
          <p className="text-muted-foreground">
            La NOM-035-STPS-2018 establece que para organizaciones con más de 50
            trabajadores, se debe aplicar la Guía III a una muestra
            representativa de la población. El tamaño de muestra calculado
            garantiza que los resultados sean estadísticamente significativos y
            representativos de toda la organización.
          </p>

          <p className="pt-4">
            <strong>Parámetros utilizados:</strong>
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>Nivel de confianza: {stats.confidenceLevel}% (Z = 1.96)</li>
            <li>Margen de error: ±{stats.marginOfError}%</li>
            <li>Variabilidad máxima: p = 0.5, q = 0.5</li>
            <li>Fórmula: n = (N × Z² × p × q) / (d² × (N-1) + Z² × p × q)</li>
          </ul>

          <p className="pt-4">
            <strong>Recomendaciones:</strong>
          </p>
          <ul className="list-disc list-inside text-muted-foreground space-y-1">
            <li>
              Asegúrese de que la muestra sea aleatoria y representativa de
              todos los departamentos
            </li>
            <li>
              Considere incluir trabajadores de diferentes turnos, puestos y
              antigüedades
            </li>
            <li>
              Garantice la confidencialidad de las respuestas para obtener
              resultados honestos
            </li>
            <li>
              Una vez alcanzado el tamaño de muestra, los resultados serán
              válidos para el reporte final
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
