import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Shield,
  Building2,
  FileText,
  Users,
  AlertTriangle,
  TrendingUp,
  Download,
  ChevronRight,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SurveysDashboard() {
  const [, setLocation] = useLocation();

  // Obtener estadísticas de riesgo
  const { data: stats, isLoading } = (trpc as any).surveys.getRiskStatistics.useQuery();

  const surveys = [
    {
      id: 1,
      title: "Guía I",
      description: "Acontecimientos Traumáticos Severos",
      icon: Shield,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      path: "/surveys/guide-i",
      questions: 4,
    },
    {
      id: 2,
      title: "Guía II",
      description: "Factores de Riesgo Psicosocial (16-50 trabajadores)",
      icon: Building2,
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
      path: "/surveys/guide-ii",
      questions: 46,
    },
    {
      id: 3,
      title: "Guía III",
      description: "Factores de Riesgo Psicosocial y Entorno Organizacional (51+ trabajadores)",
      icon: FileText,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      path: "/surveys/guide-iii",
      questions: 72,
    },
  ];

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'nulo':
        return 'bg-blue-500';
      case 'bajo':
        return 'bg-green-500';
      case 'medio':
        return 'bg-yellow-500';
      case 'alto':
        return 'bg-orange-500';
      case 'muy_alto':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getRiskLevelLabel = (level: string) => {
    switch (level) {
      case 'nulo':
        return 'Nulo o despreciable';
      case 'bajo':
        return 'Bajo';
      case 'medio':
        return 'Medio';
      case 'alto':
        return 'Alto';
      case 'muy_alto':
        return 'Muy Alto';
      default:
        return level;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Encuestas NOM-035-STPS-2018</h1>
        <p className="text-muted-foreground mt-2">
          Identificación y análisis de los factores de riesgo psicosocial en el trabajo
        </p>
      </div>

      {/* Alert de información */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Cumplimiento Normativo</AlertTitle>
        <AlertDescription>
          La NOM-035-STPS-2018 establece los elementos para identificar, analizar y prevenir los factores de riesgo psicosocial, así como para promover un entorno organizacional favorable en los centros de trabajo.
        </AlertDescription>
      </Alert>

      {/* Estadísticas generales */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Respuestas</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalResponses || 0}</div>
              <p className="text-xs text-muted-foreground">
                Trabajadores evaluados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Riesgo Muy Alto</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.riskDistribution?.muy_alto || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Requieren atención inmediata
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Riesgo Alto</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.riskDistribution?.alto || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Requieren intervención
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Riesgo Bajo/Nulo</CardTitle>
              <BarChart3 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {(stats.riskDistribution?.bajo || 0) + (stats.riskDistribution?.nulo || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Sin riesgo significativo
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Distribución de niveles de riesgo */}
      {stats && stats.riskDistribution && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Distribución de Niveles de Riesgo
            </CardTitle>
            <CardDescription>
              Clasificación de trabajadores según nivel de riesgo psicosocial detectado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.riskDistribution).map(([level, count]) => {
                const total = stats.totalResponses || 1;
                const percentage = ((count as number / total) * 100).toFixed(1);
                
                return (
                  <div key={level} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{getRiskLevelLabel(level)}</span>
                      <span className="text-muted-foreground">
                        {String(count)} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${getRiskLevelColor(level)} transition-all`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Riesgos promedio por categoría */}
      {stats && stats.averageRiskByCategory && stats.averageRiskByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Riesgo Promedio por Categoría
            </CardTitle>
            <CardDescription>
              Análisis de factores de riesgo por categoría según NOM-035
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.averageRiskByCategory.map((cat: any, idx: number) => {
                const maxScore = 100; // Escala de 0-100
                const percentage = ((cat.averageScore / maxScore) * 100).toFixed(1);
                
                return (
                  <div key={cat.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cat.category}</span>
                      <span className="text-muted-foreground">
                        {cat.averageScore.toFixed(1)} puntos
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guías de referencia disponibles */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Cuestionarios Disponibles</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {surveys.map((survey) => {
            const Icon = survey.icon;
            return (
              <Card key={survey.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-2 ${survey.iconBg} rounded-lg`}>
                      <Icon className={`h-6 w-6 ${survey.iconColor}`} />
                    </div>
                    <CardTitle className="text-lg">{survey.title}</CardTitle>
                  </div>
                  <CardDescription className="min-h-[40px]">
                    {survey.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {survey.questions} preguntas
                    </span>
                    <Button
                      onClick={() => setLocation(survey.path)}
                      size="sm"
                    >
                      Responder
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Acciones rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>
            Herramientas para análisis y reportes de cumplimiento NOM-035
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Button variant="outline" className="justify-start h-auto py-4">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Descargar Reporte Individual</div>
                <div className="text-sm text-muted-foreground">
                  Resultados detallados por trabajador
                </div>
              </div>
            </div>
          </Button>
          <Button variant="outline" className="justify-start h-auto py-4">
            <div className="flex items-center gap-3">
              <Download className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Descargar Reporte Agregado</div>
                <div className="text-sm text-muted-foreground">
                  Estadísticas generales de la organización
                </div>
              </div>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
