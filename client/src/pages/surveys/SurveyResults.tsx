import { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, AlertTriangle, XCircle, FileText, ArrowLeft, Download } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Radar } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
);

type RiskLevel = 'Nulo' | 'Bajo' | 'Medio' | 'Alto' | 'Muy alto';

// Configuración de colores por nivel de riesgo
const RISK_COLORS: Record<RiskLevel, { bg: string; text: string; border: string; icon: any }> = {
  'Nulo': {
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200',
    icon: CheckCircle,
  },
  'Bajo': {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200',
    icon: CheckCircle,
  },
  'Medio': {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200',
    icon: AlertTriangle,
  },
  'Alto': {
    bg: 'bg-orange-50',
    text: 'text-orange-800',
    border: 'border-orange-200',
    icon: AlertCircle,
  },
  'Muy alto': {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200',
    icon: XCircle,
  },
};

const CHART_COLORS = {
  'Nulo': '#10b981',
  'Bajo': '#3b82f6',
  'Medio': '#f59e0b',
  'Alto': '#f97316',
  'Muy alto': '#ef4444',
};

export default function SurveyResults() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const responseId = params.responseId ? parseInt(params.responseId) : null;

  const { data, isLoading, error } = trpc.surveys.getResults.useQuery(responseId!, {
    enabled: !!responseId,
  });

  const exportPDFMutation = trpc.surveys.generateConsolidatedReport.useMutation({
    onSuccess: (result) => {
      // Abrir PDF en nueva pestaña
      window.open(result.pdfUrl, '_blank');
    },
    onError: (error) => {
      alert(`Error al generar PDF: ${error.message}`);
    },
  });

  const handleExportPDF = () => {
    if (!data) return;
    
    exportPDFMutation.mutate({
      surveyIds: [data.survey.id],
      includeMultilevelAnalysis: false,
    });
  };

  if (isLoading) {
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

  if (error || !data) {
    return (
      <div className="container py-8">
        <Card className="p-8 text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error al cargar resultados</h2>
          <p className="text-muted-foreground mb-4">
            {error?.message || 'No se pudieron cargar los resultados de la encuesta'}
          </p>
          <Button onClick={() => setLocation('/surveys/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const { survey, results } = data;

  if (!results) {
    return (
      <div className="container py-8">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Resultados no disponibles</h2>
          <p className="text-muted-foreground mb-4">
            Los resultados de esta encuesta aún no han sido calculados.
          </p>
          <Button onClick={() => setLocation('/surveys/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const riskLevel: RiskLevel = results.riskLevel;
  const riskConfig = RISK_COLORS[riskLevel];
  const Icon = riskConfig.icon;

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/surveys/dashboard">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <h1 className="text-3xl font-bold mt-2">Resultados de Encuesta</h1>
          <p className="text-muted-foreground">{survey.title}</p>
        </div>
        <Button 
          variant="outline"
          onClick={handleExportPDF}
          disabled={exportPDFMutation.isPending}
        >
          <Download className="h-4 w-4 mr-2" />
          {exportPDFMutation.isPending ? 'Generando PDF...' : 'Descargar PDF'}
        </Button>
      </div>

      {/* Nivel de Riesgo Principal */}
      <Card className={`p-8 ${riskConfig.bg} ${riskConfig.border} border-2`}>
        <div className="flex items-center gap-4">
          <div className={`p-4 rounded-full ${riskConfig.bg}`}>
            <Icon className={`h-12 w-12 ${riskConfig.text}`} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-1">Nivel de Riesgo Psicosocial</h2>
            <p className={`text-4xl font-bold ${riskConfig.text}`}>{riskLevel}</p>
            {results.category && (
              <p className="text-sm text-muted-foreground mt-1">{results.category}</p>
            )}
          </div>
          {results.totalScore !== undefined && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Puntaje Total</p>
              <p className="text-4xl font-bold">{results.totalScore}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Gráficas por Categoría */}
      {results.categoryScores && Object.keys(results.categoryScores).length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Puntajes por Categoría
          </h3>
          <div className="h-[400px]">
            <Bar
              data={{
                labels: Object.keys(results.categoryScores),
                datasets: [
                  {
                    label: 'Puntaje',
                    data: Object.values(results.categoryScores),
                    backgroundColor: CHART_COLORS[riskLevel],
                    borderColor: CHART_COLORS[riskLevel],
                    borderWidth: 2,
                  },
                ],
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                  title: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </Card>
      )}

      {/* Gráficas por Dominio (solo Guía III) */}
      {results.domainScores && Object.keys(results.domainScores).length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Puntajes por Dominio</h3>
            <div className="h-[400px]">
              <Radar
                data={{
                  labels: Object.keys(results.domainScores).map(label => 
                    label.length > 30 ? label.substring(0, 27) + '...' : label
                  ),
                  datasets: [
                    {
                      label: 'Puntaje',
                      data: Object.values(results.domainScores),
                      backgroundColor: `${CHART_COLORS[riskLevel]}33`,
                      borderColor: CHART_COLORS[riskLevel],
                      borderWidth: 2,
                      pointBackgroundColor: CHART_COLORS[riskLevel],
                      pointBorderColor: '#fff',
                      pointHoverBackgroundColor: '#fff',
                      pointHoverBorderColor: CHART_COLORS[riskLevel],
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    r: {
                      beginAtZero: true,
                    },
                  },
                }}
              />
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Distribución de Riesgo</h3>
            <div className="h-[400px] flex items-center justify-center">
              <Doughnut
                data={{
                  labels: Object.keys(results.domainScores),
                  datasets: [
                    {
                      data: Object.values(results.domainScores),
                      backgroundColor: [
                        '#ef4444',
                        '#f97316',
                        '#f59e0b',
                        '#10b981',
                        '#3b82f6',
                        '#8b5cf6',
                        '#ec4899',
                        '#6366f1',
                      ],
                      borderWidth: 2,
                      borderColor: '#fff',
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: {
                          size: 10,
                        },
                      },
                    },
                  },
                }}
              />
            </div>
          </Card>
        </div>
      )}

      {/* Recomendaciones */}
      {results.recommendations && results.recommendations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recomendaciones
          </h3>
          <div className="space-y-3">
            {results.recommendations.map((recommendation: string, index: number) => (
              <div key={index} className="flex gap-3 p-4 bg-muted rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xs font-bold text-primary">{index + 1}</span>
                  </div>
                </div>
                <p className="text-sm leading-relaxed">{recommendation}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Información Adicional */}
      <Card className="p-6 bg-muted/50">
        <h3 className="text-lg font-semibold mb-3">Información Importante</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            • Los resultados se calcularon según las tablas oficiales de la NOM-035-STPS-2018.
          </p>
          <p>
            • Estos resultados son confidenciales y solo pueden ser consultados por el trabajador y el coordinador de seguridad.
          </p>
          <p>
            • Las recomendaciones son orientativas y deben ser implementadas por el comité de seguridad y salud.
          </p>
          <p>
            • Fecha de cálculo: {new Date(results.calculatedAt).toLocaleString('es-MX')}
          </p>
        </div>
      </Card>
    </div>
  );
}
