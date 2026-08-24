import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";

export default function TrendsCharts() {
  const [period, setPeriod] = useState<"weekly" | "monthly">("monthly");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setMonth(date.getMonth() - 3);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );

  // Queries para obtener datos de tendencias
  const { data: casesTrends, isLoading: loadingCases } =
    trpc.trends.getCasesTrends.useQuery({
      period,
      startDate,
      endDate,
    });

  const { data: surveyCoverageTrends, isLoading: loadingSurveys } =
    trpc.trends.getSurveyCoverageTrends.useQuery({
      period,
      startDate,
      endDate,
    });

  const { data: complianceTrends, isLoading: loadingCompliance } =
    trpc.trends.getComplianceTrends.useQuery({
      period,
      startDate,
      endDate,
    });

  // Función para renderizar badge de tendencia
  const renderTrendBadge = (
    trend: "up" | "down" | "stable",
    change: number
  ) => {
    if (trend === "up") {
      return (
        <Badge variant="default" className="bg-green-500">
          <TrendingUp className="w-3 h-3 mr-1" />+{change}%
        </Badge>
      );
    } else if (trend === "down") {
      return (
        <Badge variant="destructive">
          <TrendingDown className="w-3 h-3 mr-1" />
          {change}%
        </Badge>
      );
    } else {
      return (
        <Badge variant="secondary">
          <Minus className="w-3 h-3 mr-1" />
          {change}%
        </Badge>
      );
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Gráficas de Tendencias Temporales
          </h1>
          <p className="text-muted-foreground">
            Visualización de evolución de casos NOM-035, cobertura de encuestas
            y cumplimiento normativo
          </p>
        </div>
      </div>

      {/* Filtros de período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Filtros de Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Tipo de Período
              </label>
              <Select
                value={period}
                onValueChange={(value: "weekly" | "monthly") =>
                  setPeriod(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Fecha Fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs de gráficas */}
      <Tabs defaultValue="cases" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cases">Casos NOM-035</TabsTrigger>
          <TabsTrigger value="surveys">Cobertura de Encuestas</TabsTrigger>
          <TabsTrigger value="compliance">Cumplimiento Normativo</TabsTrigger>
        </TabsList>

        {/* Tab de Casos NOM-035 */}
        <TabsContent value="cases" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Evolución de Casos NOM-035</CardTitle>
                  <CardDescription>
                    Casos abiertos, en investigación y cerrados por período
                  </CardDescription>
                </div>
                {casesTrends?.comparison && (
                  <div className="flex gap-2">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Período Actual
                      </p>
                      <p className="text-2xl font-bold">
                        {casesTrends.comparison.currentTotal}
                      </p>
                    </div>
                    {renderTrendBadge(
                      casesTrends.comparison.trend as "up" | "down" | "stable",
                      casesTrends.comparison.percentageChange
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingCases ? (
                <div className="h-[400px] flex items-center justify-center">
                  <p className="text-muted-foreground">Cargando datos...</p>
                </div>
              ) : casesTrends?.current && casesTrends.current.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={casesTrends.current}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="total"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Total"
                    />
                    <Line
                      type="monotone"
                      dataKey="abiertos"
                      stroke="#ef4444"
                      strokeWidth={2}
                      name="Abiertos"
                    />
                    <Line
                      type="monotone"
                      dataKey="enInvestigacion"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name="En Investigación"
                    />
                    <Line
                      type="monotone"
                      dataKey="cerrados"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Cerrados"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center">
                  <p className="text-muted-foreground">
                    No hay datos disponibles para el período seleccionado
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Cobertura de Encuestas */}
        <TabsContent value="surveys" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Cobertura de Encuestas NOM-035</CardTitle>
                  <CardDescription>
                    Encuestas completadas por guía y período
                  </CardDescription>
                </div>
                {surveyCoverageTrends?.comparison && (
                  <div className="flex gap-2">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Período Actual
                      </p>
                      <p className="text-2xl font-bold">
                        {surveyCoverageTrends.comparison.currentTotal}
                      </p>
                    </div>
                    {renderTrendBadge(
                      surveyCoverageTrends.comparison.trend as
                        | "up"
                        | "down"
                        | "stable",
                      surveyCoverageTrends.comparison.percentageChange
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingSurveys ? (
                <div className="h-[400px] flex items-center justify-center">
                  <p className="text-muted-foreground">Cargando datos...</p>
                </div>
              ) : surveyCoverageTrends?.current &&
                surveyCoverageTrends.current.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={surveyCoverageTrends.current}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="completadas"
                      fill="#8884d8"
                      name="Total Completadas"
                    />
                    <Bar dataKey="guiaI" fill="#82ca9d" name="Guía I" />
                    <Bar dataKey="guiaII" fill="#ffc658" name="Guía II" />
                    <Bar dataKey="guiaIII" fill="#ff8042" name="Guía III" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center">
                  <p className="text-muted-foreground">
                    No hay datos disponibles para el período seleccionado
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Cumplimiento Normativo */}
        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Cumplimiento Normativo NOM-035</CardTitle>
                  <CardDescription>
                    Porcentaje de cumplimiento basado en encuestas completadas
                  </CardDescription>
                </div>
                {complianceTrends?.comparison && (
                  <div className="flex gap-2">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Período Actual
                      </p>
                      <p className="text-2xl font-bold">
                        {complianceTrends.comparison.currentPercentage}%
                      </p>
                    </div>
                    {renderTrendBadge(
                      complianceTrends.comparison.trend as
                        | "up"
                        | "down"
                        | "stable",
                      complianceTrends.comparison.percentageChange
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingCompliance ? (
                <div className="h-[400px] flex items-center justify-center">
                  <p className="text-muted-foreground">Cargando datos...</p>
                </div>
              ) : complianceTrends?.current &&
                complianceTrends.current.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={complianceTrends.current}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="porcentajeCumplimiento"
                      stroke="#8884d8"
                      fill="#8884d8"
                      fillOpacity={0.6}
                      name="% Cumplimiento"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[400px] flex items-center justify-center">
                  <p className="text-muted-foreground">
                    No hay datos disponibles para el período seleccionado
                  </p>
                </div>
              )}

              {/* Información adicional */}
              {complianceTrends?.totalEmployees && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Total de empleados activos:{" "}
                    <span className="font-bold">
                      {complianceTrends.totalEmployees}
                    </span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
