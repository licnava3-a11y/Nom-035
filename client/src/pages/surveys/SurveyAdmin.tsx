import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Filter, TrendingUp, Users, BarChart3, PieChart } from 'lucide-react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

const RISK_LEVEL_COLORS = {
  nulo: '#10b981',
  bajo: '#3b82f6',
  medio: '#f59e0b',
  alto: '#ef4444',
  muy_alto: '#7f1d1d',
};

const RISK_LEVEL_LABELS = {
  nulo: 'Nulo',
  bajo: 'Bajo',
  medio: 'Medio',
  alto: 'Alto',
  muy_alto: 'Muy Alto',
};

export default function SurveyAdmin() {
  const utils = trpc.useContext();
  const [selectedSurvey, setSelectedSurvey] = useState<number>(1);
  const [department, setDepartment] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Comparación de periodos
  const [period1Start, setPeriod1Start] = useState<string>('');
  const [period1End, setPeriod1End] = useState<string>('');
  const [period2Start, setPeriod2Start] = useState<string>('');
  const [period2End, setPeriod2End] = useState<string>('');

  // Obtener encuestas disponibles
  const { data: surveys } = trpc.surveys.getAll.useQuery();

  // Obtener departamentos
  const { data: departments } = trpc.surveys.getDepartments.useQuery();

  // Obtener respuestas agregadas
  const { data: responses, isLoading: loadingResponses } = trpc.surveys.getAggregatedResponses.useQuery({
    surveyId: selectedSurvey,
    department: department === 'all' ? undefined : department || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Obtener estadísticas
  const { data: statistics, isLoading: loadingStats } = trpc.surveys.getSurveyStatistics.useQuery({
    surveyId: selectedSurvey,
    department: department === 'all' ? undefined : department || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Obtener comparación de periodos
  const { data: comparison, isLoading: loadingComparison } = trpc.surveys.comparePeriods.useQuery(
    {
      surveyId: selectedSurvey,
      period1Start,
      period1End,
      period2Start,
      period2End,
      department: department || undefined,
    },
    {
      enabled: !!(period1Start && period1End && period2Start && period2End),
    }
  );

  // Preparar datos para gráfica de distribución de riesgo
  const distributionChartData = useMemo(() => {
    if (!statistics) return null;

    return {
      labels: statistics.distribution.map(d => RISK_LEVEL_LABELS[d.level as keyof typeof RISK_LEVEL_LABELS]),
      datasets: [
        {
          label: 'Número de Respuestas',
          data: statistics.distribution.map(d => d.count),
          backgroundColor: statistics.distribution.map(d => RISK_LEVEL_COLORS[d.level as keyof typeof RISK_LEVEL_COLORS]),
        },
      ],
    };
  }, [statistics]);

  // Preparar datos para gráfica de dona
  const doughnutChartData = useMemo(() => {
    if (!statistics) return null;

    return {
      labels: statistics.distribution.map(d => RISK_LEVEL_LABELS[d.level as keyof typeof RISK_LEVEL_LABELS]),
      datasets: [
        {
          data: statistics.distribution.map(d => d.count),
          backgroundColor: statistics.distribution.map(d => RISK_LEVEL_COLORS[d.level as keyof typeof RISK_LEVEL_COLORS]),
        },
      ],
    };
  }, [statistics]);

  // Preparar datos para gráfica de comparación
  const comparisonChartData = useMemo(() => {
    if (!comparison) return null;

    const labels = Object.keys(comparison.period1.riskLevels).map(level => RISK_LEVEL_LABELS[level as keyof typeof RISK_LEVEL_LABELS]);

    return {
      labels,
      datasets: [
        {
          label: 'Periodo 1',
          data: Object.values(comparison.period1.riskLevels),
          backgroundColor: '#3b82f6',
        },
        {
          label: 'Periodo 2',
          data: Object.values(comparison.period2.riskLevels),
          backgroundColor: '#10b981',
        },
      ],
    };
  }, [comparison]);

  const handleExportExcel = async () => {
    if (!selectedSurvey) {
      alert('Por favor selecciona una encuesta primero');
      return;
    }

    try {
      const data = await utils.surveys.exportToExcel.fetch({
        surveyId: selectedSurvey,
        department: department || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });

      if (!data || data.length === 0) {
        alert('No hay datos para exportar con los filtros seleccionados');
        return;
      }

      // Importar xlsx dinámicamente
      const XLSX = await import('xlsx');
      
      // Crear libro de Excel
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');
      
      // Generar archivo y descargar
      const surveyName = selectedSurvey === 1 ? 'GuiaI' : selectedSurvey === 2 ? 'GuiaII' : 'GuiaIII';
      const fileName = `Encuesta_${surveyName}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar los datos a Excel');
    }
  };

  const handleClearFilters = () => {
    setDepartment('all');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Panel de Administración de Encuestas</h1>
          <p className="text-muted-foreground">
            Análisis y estadísticas de encuestas NOM-035
          </p>
        </div>
        <Button onClick={handleExportExcel} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar a Excel
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>
            Filtra los resultados por encuesta, departamento y periodo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="survey">Encuesta</Label>
              <Select value={selectedSurvey.toString()} onValueChange={(v) => setSelectedSurvey(parseInt(v))}>
                <SelectTrigger id="survey">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {surveys?.map((survey) => (
                    <SelectItem key={survey.id} value={survey.id.toString()}>
                      {survey.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Select value={department} onValueChange={(v) => setDepartment(v)}>
                <SelectTrigger id="department">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments?.filter(Boolean).map((dept) => (
                    <SelectItem key={dept!} value={dept!}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={handleClearFilters}>
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="statistics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="statistics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Estadísticas
          </TabsTrigger>
          <TabsTrigger value="responses" className="gap-2">
            <Users className="h-4 w-4" />
            Respuestas
          </TabsTrigger>
          <TabsTrigger value="comparison" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Comparación
          </TabsTrigger>
        </TabsList>

        {/* Tab de Estadísticas */}
        <TabsContent value="statistics" className="space-y-4">
          {loadingStats ? (
            <Card>
              <CardContent className="py-10">
                <p className="text-center text-muted-foreground">Cargando estadísticas...</p>
              </CardContent>
            </Card>
          ) : statistics ? (
            <>
              {/* Métricas principales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total de Respuestas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{statistics.totalResponses}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Puntaje Promedio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{statistics.averageScore.toFixed(2)}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Nivel de Riesgo Predominante
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge
                      style={{
                        backgroundColor:
                          RISK_LEVEL_COLORS[
                            statistics.distribution.reduce((prev, current) =>
                              current.count > prev.count ? current : prev
                            ).level as keyof typeof RISK_LEVEL_COLORS
                          ],
                      }}
                      className="text-white"
                    >
                      {
                        RISK_LEVEL_LABELS[
                          statistics.distribution.reduce((prev, current) =>
                            current.count > prev.count ? current : prev
                          ).level as keyof typeof RISK_LEVEL_LABELS
                        ]
                      }
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Gráficas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribución de Niveles de Riesgo</CardTitle>
                    <CardDescription>Número de respuestas por nivel</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {distributionChartData && (
                      <Bar
                        data={distributionChartData}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              display: false,
                            },
                          },
                        }}
                      />
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Proporción de Niveles de Riesgo</CardTitle>
                    <CardDescription>Porcentaje por nivel</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {doughnutChartData && (
                      <Doughnut
                        data={doughnutChartData}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: {
                              position: 'bottom',
                            },
                          },
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Tabla de distribución */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalle de Distribución</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nivel de Riesgo</TableHead>
                        <TableHead className="text-right">Cantidad</TableHead>
                        <TableHead className="text-right">Porcentaje</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statistics.distribution.map((item) => (
                        <TableRow key={item.level}>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: RISK_LEVEL_COLORS[item.level as keyof typeof RISK_LEVEL_COLORS],
                              }}
                              className="text-white"
                            >
                              {RISK_LEVEL_LABELS[item.level as keyof typeof RISK_LEVEL_LABELS]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{item.count}</TableCell>
                          <TableCell className="text-right">{item.percentage.toFixed(2)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-10">
                <p className="text-center text-muted-foreground">No hay datos disponibles</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab de Respuestas */}
        <TabsContent value="responses">
          <Card>
            <CardHeader>
              <CardTitle>Respuestas Agregadas</CardTitle>
              <CardDescription>
                {loadingResponses
                  ? 'Cargando...'
                  : `${responses?.length || 0} respuestas encontradas`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingResponses ? (
                <p className="text-center text-muted-foreground py-10">Cargando respuestas...</p>
              ) : responses && responses.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Usuario</TableHead>
                        <TableHead>CURP</TableHead>
                        <TableHead>Fecha Inicio</TableHead>
                        <TableHead>Fecha Completado</TableHead>
                        <TableHead>Nivel de Riesgo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {responses.map((response) => {
                        let riskLevel = 'N/A';
                        if (response.results) {
                          try {
                            const results = JSON.parse(response.results);
                            riskLevel = results.overallRiskLevel || 'N/A';
                          } catch (e) {
                            console.error('Error parsing results:', e);
                          }
                        }

                        return (
                          <TableRow key={response.id}>
                            <TableCell>{response.id}</TableCell>
                            <TableCell>{response.userId || '-'}</TableCell>
                            <TableCell>{response.curp || '-'}</TableCell>
                            <TableCell>
                              {response.startedAt
                                ? new Date(response.startedAt).toLocaleDateString('es-MX')
                                : '-'}
                            </TableCell>
                            <TableCell>
                              {response.completedAt
                                ? new Date(response.completedAt).toLocaleDateString('es-MX')
                                : 'En progreso'}
                            </TableCell>
                            <TableCell>
                              {riskLevel !== 'N/A' ? (
                                <Badge
                                  style={{
                                    backgroundColor: RISK_LEVEL_COLORS[riskLevel as keyof typeof RISK_LEVEL_COLORS],
                                  }}
                                  className="text-white"
                                >
                                  {RISK_LEVEL_LABELS[riskLevel as keyof typeof RISK_LEVEL_LABELS]}
                                </Badge>
                              ) : (
                                'N/A'
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-10">
                  No se encontraron respuestas con los filtros aplicados
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Comparación */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Comparación entre Periodos</CardTitle>
              <CardDescription>
                Compara las estadísticas de dos periodos diferentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold">Periodo 1</h3>
                  <div className="space-y-2">
                    <Label htmlFor="period1Start">Fecha Inicio</Label>
                    <Input
                      id="period1Start"
                      type="date"
                      value={period1Start}
                      onChange={(e) => setPeriod1Start(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period1End">Fecha Fin</Label>
                    <Input
                      id="period1End"
                      type="date"
                      value={period1End}
                      onChange={(e) => setPeriod1End(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold">Periodo 2</h3>
                  <div className="space-y-2">
                    <Label htmlFor="period2Start">Fecha Inicio</Label>
                    <Input
                      id="period2Start"
                      type="date"
                      value={period2Start}
                      onChange={(e) => setPeriod2Start(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="period2End">Fecha Fin</Label>
                    <Input
                      id="period2End"
                      type="date"
                      value={period2End}
                      onChange={(e) => setPeriod2End(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {loadingComparison ? (
            <Card>
              <CardContent className="py-10">
                <p className="text-center text-muted-foreground">Cargando comparación...</p>
              </CardContent>
            </Card>
          ) : comparison ? (
            <>
              {/* Métricas de comparación */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Diferencia en Respuestas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${comparison.comparison.responseDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {comparison.comparison.responseDiff >= 0 ? '+' : ''}
                      {comparison.comparison.responseDiff}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Diferencia en Puntaje Promedio
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className={`text-3xl font-bold ${comparison.comparison.scoreDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {comparison.comparison.scoreDiff >= 0 ? '+' : ''}
                      {comparison.comparison.scoreDiff.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Tendencia
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge variant={comparison.comparison.scoreDiff >= 0 ? 'default' : 'destructive'}>
                      {comparison.comparison.scoreDiff >= 0 ? 'Mejora' : 'Deterioro'}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Gráfica de comparación */}
              <Card>
                <CardHeader>
                  <CardTitle>Comparación de Distribución de Riesgo</CardTitle>
                </CardHeader>
                <CardContent>
                  {comparisonChartData && (
                    <Bar
                      data={comparisonChartData}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                        },
                      }}
                    />
                  )}
                </CardContent>
              </Card>

              {/* Tabla de cambios */}
              <Card>
                <CardHeader>
                  <CardTitle>Detalle de Cambios por Nivel de Riesgo</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nivel de Riesgo</TableHead>
                        <TableHead className="text-right">Periodo 1</TableHead>
                        <TableHead className="text-right">Periodo 2</TableHead>
                        <TableHead className="text-right">Diferencia</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.comparison.riskLevelChanges.map((change) => (
                        <TableRow key={change.level}>
                          <TableCell>
                            <Badge
                              style={{
                                backgroundColor: RISK_LEVEL_COLORS[change.level as keyof typeof RISK_LEVEL_COLORS],
                              }}
                              className="text-white"
                            >
                              {RISK_LEVEL_LABELS[change.level as keyof typeof RISK_LEVEL_LABELS]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{change.period1Count}</TableCell>
                          <TableCell className="text-right">{change.period2Count}</TableCell>
                          <TableCell className={`text-right font-semibold ${change.diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {change.diff >= 0 ? '+' : ''}
                            {change.diff}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-10">
                <p className="text-center text-muted-foreground">
                  Selecciona los periodos para ver la comparación
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
