import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  DollarSign,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function SalaryTrendsDashboard() {
  const { data: departmentTrends, isLoading: loadingDeptTrends } =
    trpc.salaryTrends.getTrendsByDepartment.useQuery();
  const { data: positionTrends, isLoading: loadingPosTrends } =
    trpc.salaryTrends.getTrendsByPosition.useQuery();
  const { data: marketProjections, isLoading: loadingProjections } =
    trpc.salaryTrends.getMarketProjections.useQuery();
  const { data: departmentSummary, isLoading: loadingSummary } =
    trpc.salaryTrends.getDepartmentSummary.useQuery();

  // Procesar datos para gráficos
  const processedDeptTrends =
    departmentTrends?.reduce((acc: any[], row: any) => {
      const existing = acc.find((item: any) => item.month === row.month);
      if (existing) {
        existing[row.department] = parseFloat(row.avg_salary);
      } else {
        acc.push({
          month: row.month,
          [row.department]: parseFloat(row.avg_salary),
        });
      }
      return acc;
    }, []) || [];

  const processedPosTrends =
    positionTrends?.reduce((acc: any[], row: any) => {
      const existing = acc.find((item: any) => item.month === row.month);
      if (existing) {
        existing[row.position] = parseFloat(row.avg_salary);
      } else {
        acc.push({
          month: row.month,
          [row.position]: parseFloat(row.avg_salary),
        });
      }
      return acc;
    }, []) || [];

  // Extraer departamentos únicos para líneas del gráfico
  const departments = Array.from(
    new Set(departmentTrends?.map((row: any) => row.department))
  );
  const positions = Array.from(
    new Set(positionTrends?.map((row: any) => row.position))
  );

  const colors = [
    "#3b82f6",
    "#10b981",
    "#f59e0b",
    "#ef4444",
    "#8b5cf6",
    "#ec4899",
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tendencias Salariales</h1>
        <p className="text-muted-foreground">
          Análisis histórico y proyecciones de mercado
        </p>
      </div>

      {/* Resumen por Departamento */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loadingSummary ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                Cargando resumen...
              </p>
            </CardContent>
          </Card>
        ) : (
          departmentSummary?.slice(0, 4).map((dept: any, index: number) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {dept.department}
                </CardTitle>
                <CardDescription>
                  {dept.total_employees} empleados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${parseFloat(dept.avg_current_salary).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Brecha promedio: {parseFloat(dept.avg_gap).toFixed(1)}%
                </p>
                {dept.critical_count > 0 && (
                  <Badge variant="destructive" className="mt-2">
                    {dept.critical_count} críticos
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Tabs defaultValue="department" className="space-y-4">
        <TabsList>
          <TabsTrigger value="department">Por Departamento</TabsTrigger>
          <TabsTrigger value="position">Por Puesto</TabsTrigger>
          <TabsTrigger value="projections">Proyecciones de Mercado</TabsTrigger>
        </TabsList>

        <TabsContent value="department" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolución Salarial por Departamento</CardTitle>
              <CardDescription>Últimos 12 meses</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDeptTrends ? (
                <p className="text-sm text-muted-foreground">
                  Cargando datos...
                </p>
              ) : processedDeptTrends.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay datos históricos disponibles
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={processedDeptTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any) =>
                        `$${parseFloat(value).toLocaleString()}`
                      }
                    />
                    <Legend />
                    {departments.map((dept: any, index: number) => (
                      <Line
                        key={dept}
                        type="monotone"
                        dataKey={dept}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="position" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Evolución Salarial por Puesto</CardTitle>
              <CardDescription>Últimos 12 meses</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPosTrends ? (
                <p className="text-sm text-muted-foreground">
                  Cargando datos...
                </p>
              ) : processedPosTrends.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay datos históricos disponibles
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={processedPosTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any) =>
                        `$${parseFloat(value).toLocaleString()}`
                      }
                    />
                    <Legend />
                    {positions.slice(0, 5).map((pos: any, index: number) => (
                      <Line
                        key={pos}
                        type="monotone"
                        dataKey={pos}
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Proyecciones de Mercado</CardTitle>
              <CardDescription>
                Próximos 6 meses y ajustes recomendados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingProjections ? (
                <p className="text-sm text-muted-foreground">
                  Cargando proyecciones...
                </p>
              ) : marketProjections?.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No hay datos de mercado disponibles
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Salario Actual</TableHead>
                      <TableHead>Mercado Actual</TableHead>
                      <TableHead>Proyección 6m</TableHead>
                      <TableHead>Brecha</TableHead>
                      <TableHead>Recomendación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {marketProjections
                      ?.slice(0, 20)
                      .map((proj: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {proj.department}
                          </TableCell>
                          <TableCell>{proj.position}</TableCell>
                          <TableCell>
                            $
                            {parseFloat(
                              proj.current_avg_salary
                            ).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            $
                            {parseFloat(
                              proj.current_market_rate
                            ).toLocaleString()}
                          </TableCell>
                          <TableCell className="font-semibold text-blue-600">
                            $
                            {parseFloat(
                              proj.projected_market_rate_6m
                            ).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                parseFloat(proj.avg_gap) < -20
                                  ? "destructive"
                                  : parseFloat(proj.avg_gap) < -10
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              {parseFloat(proj.avg_gap).toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {proj.recommendation.includes("CRÍTICO") && (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertCircle className="h-4 w-4" />
                                <span className="font-semibold">CRÍTICO</span>
                              </div>
                            )}
                            {proj.recommendation.includes("ALTO") && (
                              <div className="flex items-center gap-1 text-orange-600">
                                <TrendingUp className="h-4 w-4" />
                                <span className="font-semibold">ALTO</span>
                              </div>
                            )}
                            {proj.recommendation.includes("MEDIO") && (
                              <div className="flex items-center gap-1 text-yellow-600">
                                <TrendingDown className="h-4 w-4" />
                                <span>MEDIO</span>
                              </div>
                            )}
                            {proj.recommendation.includes("BAJO") && (
                              <div className="flex items-center gap-1 text-green-600">
                                <DollarSign className="h-4 w-4" />
                                <span>BAJO</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
