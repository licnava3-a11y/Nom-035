import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Download,
  TrendingUp,
  Users,
  Briefcase,
  Calendar,
  Heart,
  UserCheck,
  Clock,
  FileText,
  Award,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

/**
 * Plan de Acción Multinivel NOM-035
 *
 * Análisis de resultados de encuestas por diferentes segmentos:
 * - Organizacional (toda la empresa)
 * - Departamental/grupal
 * - Por puesto
 * - Por rango de edad
 * - Por género
 * - Por estado civil
 * - Por jornada laboral
 * - Por tipo de contrato
 * - Por antigüedad en el puesto
 */

const RISK_COLORS = {
  nulo: "#3B82F6", // Azul
  bajo: "#10B981", // Verde
  medio: "#F59E0B", // Amarillo
  alto: "#F97316", // Naranja
  muy_alto: "#EF4444", // Rojo
};

export default function ActionPlan() {
  const params = useParams();
  const surveyId = params.surveyId ? parseInt(params.surveyId) : 1; // Default a encuesta 1
  const [currentTab, setCurrentTab] = useState("organizational");

  // Mutation para exportar a Excel
  const exportMutation = trpc.actionPlan.exportToExcel.useMutation({
    onSuccess: data => {
      // Descargar archivo
      window.open(data.url, "_blank");
      toast.success("Reporte exportado exitosamente");
    },
    onError: error => {
      toast.error(`Error al exportar: ${error.message}`);
    },
  });

  // Mutation para exportar a PDF
  const exportPDFMutation = trpc.surveys.generateConsolidatedReport.useMutation(
    {
      onSuccess: result => {
        // Abrir PDF en nueva pestaña
        window.open(result.pdfUrl, "_blank");
        toast.success("Reporte PDF generado exitosamente");
      },
      onError: error => {
        toast.error(`Error al generar PDF: ${error.message}`);
      },
    }
  );

  const handleExport = () => {
    const analysisTypeMap: Record<string, any> = {
      organizational: "organizational",
      departmental: "departmental",
      position: "position",
      age: "age",
      gender: "gender",
      marital: "marital",
      schedule: "schedule",
      contract: "contract",
      tenure: "tenure",
    };

    exportMutation.mutate({
      surveyId,
      analysisType: analysisTypeMap[currentTab],
    });
  };

  // Queries para cada nivel de análisis
  const { data: orgAnalysis, isLoading: loadingOrg } =
    trpc.actionPlan.getOrganizationalAnalysis.useQuery({ surveyId });
  const { data: deptAnalysis, isLoading: loadingDept } =
    trpc.actionPlan.getDepartmentalAnalysis.useQuery({ surveyId });
  const { data: posAnalysis, isLoading: loadingPos } =
    trpc.actionPlan.getPositionAnalysis.useQuery({ surveyId });
  const { data: ageAnalysis, isLoading: loadingAge } =
    trpc.actionPlan.getAgeRangeAnalysis.useQuery({ surveyId });
  const { data: genderAnalysis, isLoading: loadingGender } =
    trpc.actionPlan.getGenderAnalysis.useQuery({ surveyId });
  const { data: maritalAnalysis, isLoading: loadingMarital } =
    trpc.actionPlan.getMaritalStatusAnalysis.useQuery({ surveyId });
  const { data: scheduleAnalysis, isLoading: loadingSchedule } =
    trpc.actionPlan.getWorkScheduleAnalysis.useQuery({ surveyId });
  const { data: contractAnalysis, isLoading: loadingContract } =
    trpc.actionPlan.getContractTypeAnalysis.useQuery({ surveyId });
  const { data: tenureAnalysis, isLoading: loadingTenure } =
    trpc.actionPlan.getTenureAnalysis.useQuery({ surveyId });

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plan de Acción Multinivel</h1>
          <p className="text-muted-foreground mt-2">
            Análisis de resultados de encuestas NOM-035 por diferentes segmentos
            organizacionales
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={exportMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            {exportMutation.isPending ? "Exportando..." : "Exportar Excel"}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              exportPDFMutation.mutate({
                surveyIds: [surveyId],
                includeMultilevelAnalysis: true,
              })
            }
            disabled={exportPDFMutation.isPending}
          >
            <Download className="h-4 w-4 mr-2" />
            {exportPDFMutation.isPending ? "Generando PDF..." : "Exportar PDF"}
          </Button>
        </div>
      </div>

      {/* Tabs para diferentes niveles de análisis */}
      <Tabs
        defaultValue="organizational"
        className="space-y-6"
        onValueChange={setCurrentTab}
      >
        <TabsList className="grid grid-cols-3 lg:grid-cols-9 gap-2 h-auto p-2">
          <TabsTrigger
            value="organizational"
            className="flex items-center gap-2"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Organizacional</span>
          </TabsTrigger>
          <TabsTrigger value="departmental" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Departamental</span>
          </TabsTrigger>
          <TabsTrigger value="position" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Por Puesto</span>
          </TabsTrigger>
          <TabsTrigger value="age" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">Por Edad</span>
          </TabsTrigger>
          <TabsTrigger value="gender" className="flex items-center gap-2">
            <UserCheck className="h-4 w-4" />
            <span className="hidden sm:inline">Por Género</span>
          </TabsTrigger>
          <TabsTrigger value="marital" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Estado Civil</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Jornada</span>
          </TabsTrigger>
          <TabsTrigger value="contract" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Contrato</span>
          </TabsTrigger>
          <TabsTrigger value="tenure" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Antigüedad</span>
          </TabsTrigger>
        </TabsList>

        {/* Análisis Organizacional */}
        <TabsContent value="organizational">
          {loadingOrg ? (
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Cargando análisis organizacional...
              </p>
            </Card>
          ) : orgAnalysis ? (
            <AnalysisView
              data={[orgAnalysis]}
              title="Análisis Organizacional"
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No hay datos disponibles</p>
            </Card>
          )}
        </TabsContent>

        {/* Análisis Departamental */}
        <TabsContent value="departmental">
          {loadingDept ? (
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Cargando análisis departamental...
              </p>
            </Card>
          ) : deptAnalysis && deptAnalysis.length > 0 ? (
            <AnalysisView
              data={deptAnalysis}
              title="Análisis por Departamento"
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No hay datos disponibles</p>
            </Card>
          )}
        </TabsContent>

        {/* Análisis por Puesto */}
        <TabsContent value="position">
          {loadingPos ? (
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Cargando análisis por puesto...
              </p>
            </Card>
          ) : posAnalysis && posAnalysis.length > 0 ? (
            <AnalysisView data={posAnalysis} title="Análisis por Puesto" />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No hay datos disponibles</p>
            </Card>
          )}
        </TabsContent>

        {/* Análisis por Edad */}
        <TabsContent value="age">
          {loadingAge ? (
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Cargando análisis por edad...
              </p>
            </Card>
          ) : ageAnalysis && ageAnalysis.length > 0 ? (
            <AnalysisView
              data={ageAnalysis}
              title="Análisis por Rango de Edad"
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No hay datos disponibles</p>
            </Card>
          )}
        </TabsContent>

        {/* Análisis por Género */}
        <TabsContent value="gender">
          {loadingGender ? (
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Cargando análisis por género...
              </p>
            </Card>
          ) : genderAnalysis && genderAnalysis.length > 0 ? (
            <AnalysisView data={genderAnalysis} title="Análisis por Género" />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No hay datos disponibles</p>
            </Card>
          )}
        </TabsContent>

        {/* Análisis por Estado Civil */}
        <TabsContent value="marital">
          {loadingMarital ? (
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Cargando análisis por estado civil...
              </p>
            </Card>
          ) : maritalAnalysis && maritalAnalysis.length > 0 ? (
            <AnalysisView
              data={maritalAnalysis}
              title="Análisis por Estado Civil"
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No hay datos disponibles</p>
            </Card>
          )}
        </TabsContent>

        {/* Análisis por Jornada */}
        <TabsContent value="schedule">
          {loadingSchedule ? (
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Cargando análisis por jornada...
              </p>
            </Card>
          ) : scheduleAnalysis && scheduleAnalysis.length > 0 ? (
            <AnalysisView
              data={scheduleAnalysis}
              title="Análisis por Jornada Laboral"
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No hay datos disponibles</p>
            </Card>
          )}
        </TabsContent>

        {/* Análisis por Contrato */}
        <TabsContent value="contract">
          {loadingContract ? (
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Cargando análisis por contrato...
              </p>
            </Card>
          ) : contractAnalysis && contractAnalysis.length > 0 ? (
            <AnalysisView
              data={contractAnalysis}
              title="Análisis por Tipo de Contrato"
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No hay datos disponibles</p>
            </Card>
          )}
        </TabsContent>

        {/* Análisis por Antigüedad */}
        <TabsContent value="tenure">
          {loadingTenure ? (
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                Cargando análisis por antigüedad...
              </p>
            </Card>
          ) : tenureAnalysis && tenureAnalysis.length > 0 ? (
            <AnalysisView
              data={tenureAnalysis}
              title="Análisis por Antigüedad"
            />
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No hay datos disponibles</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Componente para visualizar análisis
function AnalysisView({ data, title }: { data: any[]; title: string }) {
  // Preparar datos para gráficas
  const labels = data.map(d => d.segment);
  const avgScores = data.map(d => d.avgScore);
  const totalResponses = data.map(d => d.totalResponses);

  // Gráfica de scores promedio
  const scoresChartData = {
    labels,
    datasets: [
      {
        label: "Score Promedio",
        data: avgScores,
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
      },
    ],
  };

  // Gráfica de respuestas totales
  const responsesChartData = {
    labels,
    datasets: [
      {
        label: "Total de Respuestas",
        data: totalResponses,
        backgroundColor: "rgba(16, 185, 129, 0.5)",
        borderColor: "rgba(16, 185, 129, 1)",
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">{data.length}</p>
            <p className="text-sm text-muted-foreground">
              Segmentos Analizados
            </p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">
              {data.reduce((sum: any, d: any) => sum + d.totalResponses, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Total de Respuestas</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-primary">
              {(
                data.reduce((sum: any, d: any) => sum + d.avgScore, 0) /
                data.length
              ).toFixed(1)}
            </p>
            <p className="text-sm text-muted-foreground">
              Score Promedio General
            </p>
          </div>
        </div>
      </Card>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Score Promedio por Segmento
          </h3>
          <Bar
            data={scoresChartData}
            options={{
              responsive: true,
              plugins: {
                legend: {
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
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Respuestas por Segmento
          </h3>
          <Bar
            data={responsesChartData}
            options={{
              responsive: true,
              plugins: {
                legend: {
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
        </Card>
      </div>

      {/* Tabla de resultados */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Detalle por Segmento</h3>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar a Excel
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3">Segmento</th>
                <th className="text-center p-3">Respuestas</th>
                <th className="text-center p-3">Score Promedio</th>
                <th className="text-center p-3">Nulo</th>
                <th className="text-center p-3">Bajo</th>
                <th className="text-center p-3">Medio</th>
                <th className="text-center p-3">Alto</th>
                <th className="text-center p-3">Muy Alto</th>
              </tr>
            </thead>
            <tbody>
              {data.map((segment, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-3 font-medium">{segment.segment}</td>
                  <td className="text-center p-3">{segment.totalResponses}</td>
                  <td className="text-center p-3 font-semibold">
                    {segment.avgScore.toFixed(1)}
                  </td>
                  <td className="text-center p-3">
                    <span
                      className="inline-block px-2 py-1 rounded text-sm"
                      style={{
                        backgroundColor: RISK_COLORS.nulo,
                        color: "white",
                      }}
                    >
                      {segment.riskDistribution.nulo}
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <span
                      className="inline-block px-2 py-1 rounded text-sm"
                      style={{
                        backgroundColor: RISK_COLORS.bajo,
                        color: "white",
                      }}
                    >
                      {segment.riskDistribution.bajo}
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <span
                      className="inline-block px-2 py-1 rounded text-sm"
                      style={{
                        backgroundColor: RISK_COLORS.medio,
                        color: "white",
                      }}
                    >
                      {segment.riskDistribution.medio}
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <span
                      className="inline-block px-2 py-1 rounded text-sm"
                      style={{
                        backgroundColor: RISK_COLORS.alto,
                        color: "white",
                      }}
                    >
                      {segment.riskDistribution.alto}
                    </span>
                  </td>
                  <td className="text-center p-3">
                    <span
                      className="inline-block px-2 py-1 rounded text-sm"
                      style={{
                        backgroundColor: RISK_COLORS.muy_alto,
                        color: "white",
                      }}
                    >
                      {segment.riskDistribution.muy_alto}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
