import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { AlertCircle, CheckCircle, Download, RefreshCw, TrendingDown, TrendingUp } from "lucide-react";

export default function SalaryEquityDashboard() {
  const { data: latestAnalysis, refetch, isLoading } = trpc.salaryEquity.getLatestAnalysis.useQuery();
  const { data: history } = trpc.salaryEquity.getAnalysisHistory.useQuery();

  const generateAnalysis = trpc.salaryEquity.generateAnalysis.useMutation({
    onSuccess: () => {
      toast.success("Análisis de equidad generado exitosamente");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error al generar análisis: ${error.message}`);
    },
  });

  const generateReport = trpc.salaryEquity.generateEquityReport.useMutation({
    onSuccess: (data) => {
      toast.success("Reporte generado exitosamente");
      window.open(data.url, "_blank");
    },
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Cargando análisis de equidad...</p>
      </div>
    );
  }

  if (!latestAnalysis) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Análisis de Equidad Salarial</h1>
            <p className="text-muted-foreground">NMX-R-025-SCFI-2015</p>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                No hay análisis de equidad disponibles. Genera el primer análisis para comenzar.
              </p>
              <Button
                onClick={() => generateAnalysis.mutate()}
                disabled={generateAnalysis.isPending}
              >
                {generateAnalysis.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generando...
                  </>
                ) : (
                  "Generar Análisis de Equidad"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getComplianceColor = (status: string) => {
    switch (status) {
      case "compliant":
        return "bg-green-100 text-green-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      case "non_compliant":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getComplianceLabel = (status: string) => {
    switch (status) {
      case "compliant":
        return "Cumplimiento Total";
      case "partial":
        return "Cumplimiento Parcial";
      case "non_compliant":
        return "No Cumplimiento";
      default:
        return status;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Análisis de Equidad Salarial</h1>
          <p className="text-muted-foreground">NMX-R-025-SCFI-2015 - Igualdad Laboral y No Discriminación</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => generateAnalysis.mutate()}
            disabled={generateAnalysis.isPending}
          >
            {generateAnalysis.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualizar Análisis
              </>
            )}
          </Button>

          <Button
            onClick={() => generateReport.mutate({ analysisId: latestAnalysis.id })}
            disabled={generateReport.isPending}
          >
            {generateReport.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Generando PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar Reporte PDF
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Resumen Ejecutivo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Índice de Equidad Global</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{(latestAnalysis.globalEquityIndex ?? 0)}/100</div>
            <p className="text-xs text-muted-foreground mt-1">
              {(latestAnalysis.globalEquityIndex ?? 0) >= 80 ? "Excelente" : (latestAnalysis.globalEquityIndex ?? 0) >= 60 ? "Bueno" : "Requiere Atención"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento NMX-R-025</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className={getComplianceColor(latestAnalysis.nmxComplianceStatus)}>
              {getComplianceLabel(latestAnalysis.nmxComplianceStatus)}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Puntuación: {latestAnalysis.complianceScore}/100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Brecha Salarial de Género</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">
                {parseFloat(latestAnalysis.genderPayGapPercentage ?? "0").toFixed(1)}%
              </span>
              {parseFloat(latestAnalysis.genderPayGapPercentage ?? "0") > 10 ? (
                <TrendingDown className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {Math.abs(parseFloat(latestAnalysis.genderPayGapPercentage ?? "0")) < 5 ? "Equidad Aceptable" : "Requiere Ajuste"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Casos Críticos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{latestAnalysis.criticalCases.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Brechas salariales &gt;20%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de Análisis */}
      <Tabs defaultValue="gender" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gender">Análisis por Género</TabsTrigger>
          <TabsTrigger value="age">Análisis por Edad</TabsTrigger>
          <TabsTrigger value="tenure">Análisis por Antigüedad</TabsTrigger>
          <TabsTrigger value="critical">Casos Críticos</TabsTrigger>
        </TabsList>

        {/* Tab: Análisis por Género */}
        <TabsContent value="gender" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribución Salarial por Género</CardTitle>
              <CardDescription>Comparación de salarios promedio entre hombres y mujeres</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={[
                    {
                      gender: "Hombres",
                      salary: parseFloat(latestAnalysis.maleAverageSalary ?? "0"),
                    },
                    {
                      gender: "Mujeres",
                      salary: parseFloat(latestAnalysis.femaleAverageSalary ?? "0"),
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="gender" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="salary" name="Salario Promedio" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Salario Promedio Hombres</p>
                  <p className="text-2xl font-bold">${parseFloat(latestAnalysis.maleAverageSalary ?? "0").toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Salario Promedio Mujeres</p>
                  <p className="text-2xl font-bold">${parseFloat(latestAnalysis.femaleAverageSalary ?? "0").toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Puntuación de Equidad</p>
                  <p className="text-2xl font-bold">{latestAnalysis.genderEquityScore}/100</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Análisis por Edad */}
        <TabsContent value="age" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribución Salarial por Rango de Edad</CardTitle>
              <CardDescription>Análisis de equidad salarial por grupos etarios</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={latestAnalysis.ageGroupAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ageRange" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="averageSalary" name="Salario Promedio" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rango de Edad</TableHead>
                      <TableHead>Empleados</TableHead>
                      <TableHead>Salario Promedio</TableHead>
                      <TableHead>Brecha vs Promedio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestAnalysis.ageGroupAnalysis.map((group: any) => (
                      <TableRow key={group.ageRange}>
                        <TableCell className="font-medium">{group.ageRange} años</TableCell>
                        <TableCell>{group.employeeCount}</TableCell>
                        <TableCell>${group.averageSalary.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={Math.abs(group.gapPercentage) > 15 ? "destructive" : "default"}>
                            {group.gapPercentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Análisis por Antigüedad */}
        <TabsContent value="tenure" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribución Salarial por Antigüedad</CardTitle>
              <CardDescription>Análisis de equidad salarial por años de servicio</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={latestAnalysis.tenureGroupAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tenureRange" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="averageSalary" name="Salario Promedio" stroke="#8b5cf6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Antigüedad</TableHead>
                      <TableHead>Empleados</TableHead>
                      <TableHead>Salario Promedio</TableHead>
                      <TableHead>Brecha vs Promedio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestAnalysis.tenureGroupAnalysis.map((group: any) => (
                      <TableRow key={group.tenureRange}>
                        <TableCell className="font-medium">{group.tenureRange} años</TableCell>
                        <TableCell>{group.employeeCount}</TableCell>
                        <TableCell>${group.averageSalary.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={Math.abs(group.gapPercentage) > 15 ? "destructive" : "default"}>
                            {group.gapPercentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Casos Críticos */}
        <TabsContent value="critical" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Casos Críticos de Inequidad</CardTitle>
              <CardDescription>Empleados con brechas salariales superiores al 20%</CardDescription>
            </CardHeader>
            <CardContent>
              {latestAnalysis.criticalCases.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No se detectaron casos críticos de inequidad salarial
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Género</TableHead>
                      <TableHead>Salario Actual</TableHead>
                      <TableHead>Salario Esperado</TableHead>
                      <TableHead>Brecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestAnalysis.criticalCases.map((c: any) => (
                      <TableRow key={c.employeeId}>
                        <TableCell className="font-medium">{c.employeeName}</TableCell>
                        <TableCell>{c.department}</TableCell>
                        <TableCell>{c.position}</TableCell>
                        <TableCell>{c.gender === "male" ? "M" : "F"}</TableCell>
                        <TableCell>${c.currentSalary.toLocaleString()}</TableCell>
                        <TableCell>${c.expectedSalary.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {c.gapPercentage.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Recomendaciones */}
          {latestAnalysis.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recomendaciones de Acción Correctiva</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {latestAnalysis.recommendations.map((rec: any, i: number) => (
                    <div key={i} className="border-l-4 border-blue-500 pl-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={rec.priority === "high" ? "destructive" : "default"}>
                          {rec.priority.toUpperCase()}
                        </Badge>
                        <span className="font-semibold">{rec.category}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Costo Estimado: ${rec.estimatedCost.toLocaleString()}</span>
                        <span>Impacto: {rec.expectedImpact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Historial de Análisis */}
      {history && history.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de Análisis</CardTitle>
            <CardDescription>Evolución del índice de equidad salarial</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Índice de Equidad</TableHead>
                  <TableHead>Cumplimiento NMX</TableHead>
                  <TableHead>Brecha de Género</TableHead>
                  <TableHead>Casos Críticos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h: any) => (
                  <TableRow key={h.id}>
                    <TableCell>{new Date(h.analysisDate).toLocaleDateString("es-MX")}</TableCell>
                    <TableCell>{h.globalEquityIndex}/100</TableCell>
                    <TableCell>
                      <Badge className={getComplianceColor(h.nmxComplianceStatus)}>
                        {getComplianceLabel(h.nmxComplianceStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>{h.genderPayGapPercentage.toFixed(1)}%</TableCell>
                    <TableCell>{h.criticalCasesCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
