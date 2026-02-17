import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Star, 
  TrendingUp, 
  Users, 
  Award,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Minus
} from "lucide-react";

export default function TrainingEvaluationsDashboard() {
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>("all");

  // Queries
  const { data: globalDashboard, isLoading: loadingGlobal } = trpc.trainingEvaluations.getGlobalDashboard.useQuery();
  const { data: trainingDashboard, isLoading: loadingTraining } = trpc.trainingEvaluations.getTrainingDashboard.useQuery(
    { trainingId: parseInt(selectedTrainingId) },
    { enabled: selectedTrainingId !== "all" }
  );
  const { data: comments } = trpc.trainingEvaluations.getImprovementComments.useQuery({
    trainingId: selectedTrainingId !== "all" ? parseInt(selectedTrainingId) : undefined,
  });

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
          />
        ))}
        <span className="ml-2 text-sm font-medium">{rating.toFixed(2)}</span>
      </div>
    );
  };

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "yes":
        return <ThumbsUp className="h-5 w-5 text-green-500" />;
      case "no":
        return <ThumbsDown className="h-5 w-5 text-red-500" />;
      case "maybe":
        return <Minus className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  if (loadingGlobal) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </div>
    );
  }

  const dashboard = selectedTrainingId !== "all" ? trainingDashboard : globalDashboard;
  const isGlobal = selectedTrainingId === "all";

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Evaluaciones de Capacitaciones</h1>
        <p className="text-muted-foreground mt-2">
          Análisis de calidad y efectividad de las capacitaciones del comité
        </p>
      </div>

      {/* Filtro de Capacitación */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Capacitación</Label>
              <Select value={selectedTrainingId} onValueChange={setSelectedTrainingId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las Capacitaciones</SelectItem>
                  {globalDashboard?.allTrainings?.map((item) => (
                    <SelectItem key={item.training.id} value={item.training.id.toString()}>
                      {item.training.title} ({item.totalEvaluations} evaluaciones)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Evaluaciones</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalEvaluations || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {isGlobal ? "Todas las capacitaciones" : "Capacitación seleccionada"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calificación Promedio</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isGlobal 
                ? globalDashboard?.globalAvgOverall?.toFixed(2) || "N/A"
                : trainingDashboard?.averages?.overallSatisfaction?.toFixed(2) || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Satisfacción general
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recomendarían</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isGlobal ? globalDashboard?.globalRecommendation?.yes || 0 : trainingDashboard?.recommendation?.yes || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isGlobal ? globalDashboard?.globalRecommendation?.no || 0 : trainingDashboard?.recommendation?.no || 0} no, {isGlobal ? globalDashboard?.globalRecommendation?.maybe || 0 : trainingDashboard?.recommendation?.maybe || 0} tal vez
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Capacitaciones</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{globalDashboard?.topTrainings?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Mejor calificadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Promedios Detallados (Solo para capacitación específica) */}
      {!isGlobal && trainingDashboard?.averages && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evaluación del Instructor</CardTitle>
              <CardDescription>Promedio de criterios del instructor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Conocimiento</span>
                  {renderStars(trainingDashboard.averages.instructorKnowledge)}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Comunicación</span>
                  {renderStars(trainingDashboard.averages.instructorCommunication)}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Engagement</span>
                  {renderStars(trainingDashboard.averages.instructorEngagement)}
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Promedio General</span>
                  {renderStars(trainingDashboard.averages.instructorAverage)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evaluación del Contenido</CardTitle>
              <CardDescription>Promedio de criterios del contenido</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Relevancia</span>
                  {renderStars(trainingDashboard.averages.contentRelevance)}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Claridad</span>
                  {renderStars(trainingDashboard.averages.contentClarity)}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Profundidad</span>
                  {renderStars(trainingDashboard.averages.contentDepth)}
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Promedio General</span>
                  {renderStars(trainingDashboard.averages.contentAverage)}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Aplicabilidad</CardTitle>
              <CardDescription>Promedio de criterios de aplicación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Aplicación Práctica</span>
                  {renderStars(trainingDashboard.averages.practicalApplication)}
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Relevancia Laboral</span>
                  {renderStars(trainingDashboard.averages.workplaceRelevance)}
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Promedio General</span>
                  {renderStars(trainingDashboard.averages.applicationAverage)}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Top 5 Capacitaciones (Solo vista global) */}
      {isGlobal && globalDashboard?.topTrainings && globalDashboard.topTrainings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Top 5 Capacitaciones Mejor Calificadas
            </CardTitle>
            <CardDescription>
              Capacitaciones con mayor satisfacción general
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {globalDashboard.topTrainings.map((item, index) => (
                <div key={item.training.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{item.training.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.totalEvaluations} evaluaciones
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {renderStars(item.avgOverall)}
                    <div className="flex gap-2 mt-2">
                      <Badge variant="outline">Instructor: {item.avgInstructor.toFixed(2)}</Badge>
                      <Badge variant="outline">Contenido: {item.avgContent.toFixed(2)}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Comentarios de Mejora */}
      {comments && comments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Comentarios y Retroalimentación
            </CardTitle>
            <CardDescription>
              Fortalezas, áreas de mejora y comentarios adicionales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {comments.map((item) => (
                <div key={item.evaluation.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{item.training?.title || "Capacitación"}</p>
                      <p className="text-sm text-muted-foreground">
                        Evaluado por: {item.evaluator?.name || "Anónimo"} • {item.evaluation.createdAt ? new Date(item.evaluation.createdAt).toLocaleDateString() : "Fecha no disponible"}
                      </p>
                    </div>
                    {renderStars(item.evaluation.overallSatisfaction)}
                  </div>

                  {item.evaluation.strengths && (
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-1">✓ Fortalezas:</p>
                      <p className="text-sm text-muted-foreground pl-4">{item.evaluation.strengths}</p>
                    </div>
                  )}

                  {item.evaluation.improvements && (
                    <div>
                      <p className="text-sm font-medium text-orange-700 mb-1">⚠ Áreas de Mejora:</p>
                      <p className="text-sm text-muted-foreground pl-4">{item.evaluation.improvements}</p>
                    </div>
                  )}

                  {item.evaluation.additionalComments && (
                    <div>
                      <p className="text-sm font-medium text-blue-700 mb-1">💬 Comentarios Adicionales:</p>
                      <p className="text-sm text-muted-foreground pl-4">{item.evaluation.additionalComments}</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <span className="text-sm text-muted-foreground">¿Recomendaría?</span>
                    {getRecommendationIcon(item.evaluation.wouldRecommend)}
                    <Badge variant={
                      item.evaluation.wouldRecommend === "yes" ? "default" :
                      item.evaluation.wouldRecommend === "no" ? "destructive" : "secondary"
                    }>
                      {item.evaluation.wouldRecommend === "yes" ? "Sí" :
                       item.evaluation.wouldRecommend === "no" ? "No" : "Tal vez"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensaje cuando no hay evaluaciones */}
      {dashboard?.totalEvaluations === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No hay evaluaciones disponibles</p>
            <p className="text-sm text-muted-foreground mt-2">
              Las evaluaciones aparecerán aquí una vez que los miembros completen las capacitaciones
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
