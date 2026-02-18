/**
 * Dashboard de Correlación Análisis Predictivo vs Rotación Real
 * Evalúa la precisión del modelo predictivo comparando predicciones vs rotación real
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, XCircle, TrendingUp, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function PredictiveCorrelationDashboard() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateFilter, setDateFilter] = useState<{ startDate?: string; endDate?: string }>({});

  // Mutation: generar reporte PDF
  const generatePDF = trpc.predictiveReports.generatePredictivePDF.useMutation({
    onSuccess: (data) => {
      toast.success("Reporte PDF generado exitosamente");
      window.open(data.pdfUrl, "_blank");
    },
    onError: (error) => {
      toast.error(error.message || "Error al generar reporte PDF");
    },
  });

  const { data: accuracy, isLoading: loadingAccuracy } = trpc.predictiveCorrelation.getModelAccuracy.useQuery(dateFilter);
  const { data: truePositives, isLoading: loadingTP } = trpc.predictiveCorrelation.getTruePositives.useQuery();
  const { data: falsePositives, isLoading: loadingFP } = trpc.predictiveCorrelation.getFalsePositives.useQuery();
  const { data: falseNegatives, isLoading: loadingFN } = trpc.predictiveCorrelation.getFalseNegatives.useQuery();

  const handleApplyFilter = () => {
    if (startDate && endDate) {
      setDateFilter({ startDate, endDate });
    } else {
      setDateFilter({});
    }
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    setDateFilter({});
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard de Correlación Predictiva</h1>
          <p className="text-muted-foreground">
            Evalúa la precisión del modelo predictivo de rotación comparando predicciones vs rotación real
          </p>
        </div>
        <Button
          onClick={() => generatePDF.mutate({ includeConfusionMatrix: true, includeEvolution: true, includeRecommendations: true })}
          disabled={generatePDF.isPending}
          variant="outline"
        >
          {generatePDF.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar a PDF
            </>
          )}
        </Button>
      </div>

      {/* Filtro de Rango de Fechas */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtrar por Periodo</CardTitle>
          <CardDescription>Analiza la precisión del modelo en un rango de fechas específico</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleApplyFilter} disabled={!startDate || !endDate}>
                Aplicar Filtro
              </Button>
              <Button variant="outline" onClick={handleClearFilter}>
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Precisión</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAccuracy ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold">{accuracy?.metrics.precision.toFixed(1)}%</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              De los identificados como alto riesgo, cuántos rotaron
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recall</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAccuracy ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold">{accuracy?.metrics.recall.toFixed(1)}%</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              De los que rotaron, cuántos fueron identificados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">F1-Score</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAccuracy ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold">{accuracy?.metrics.f1Score.toFixed(1)}%</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Balance entre precisión y recall
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingAccuracy ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="text-3xl font-bold">{accuracy?.metrics.accuracy.toFixed(1)}%</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Precisión global del modelo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Matriz de Confusión */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Matriz de Confusión</CardTitle>
          <CardDescription>Visualización de la precisión del modelo predictivo</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAccuracy ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-6 w-6 text-green-600 mr-2" />
                  <span className="font-semibold text-green-900">Verdaderos Positivos</span>
                </div>
                <div className="text-4xl font-bold text-green-700">
                  {accuracy?.confusionMatrix.truePositives || 0}
                </div>
                <p className="text-sm text-green-600 mt-2">Alto riesgo + Rotaron</p>
              </div>

              <div className="bg-red-50 border-2 border-red-500 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <XCircle className="h-6 w-6 text-red-600 mr-2" />
                  <span className="font-semibold text-red-900">Falsos Positivos</span>
                </div>
                <div className="text-4xl font-bold text-red-700">
                  {accuracy?.confusionMatrix.falsePositives || 0}
                </div>
                <p className="text-sm text-red-600 mt-2">Alto riesgo + No rotaron</p>
              </div>

              <div className="bg-orange-50 border-2 border-orange-500 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <AlertCircle className="h-6 w-6 text-orange-600 mr-2" />
                  <span className="font-semibold text-orange-900">Falsos Negativos</span>
                </div>
                <div className="text-4xl font-bold text-orange-700">
                  {accuracy?.confusionMatrix.falseNegatives || 0}
                </div>
                <p className="text-sm text-orange-600 mt-2">Bajo riesgo + Rotaron</p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-500 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center mb-2">
                  <TrendingUp className="h-6 w-6 text-blue-600 mr-2" />
                  <span className="font-semibold text-blue-900">Verdaderos Negativos</span>
                </div>
                <div className="text-4xl font-bold text-blue-700">
                  {accuracy?.confusionMatrix.trueNegatives || 0}
                </div>
                <p className="text-sm text-blue-600 mt-2">Bajo riesgo + No rotaron</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs de Casos */}
      <Tabs defaultValue="true-positives" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="true-positives">
            Verdaderos Positivos ({truePositives?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="false-positives">
            Falsos Positivos ({(falsePositives as any)?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="false-negatives">
            Falsos Negativos ({falseNegatives?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="true-positives">
          <Card>
            <CardHeader>
              <CardTitle>Verdaderos Positivos</CardTitle>
              <CardDescription>
                Empleados identificados como alto riesgo que efectivamente rotaron
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTP ? (
                <Skeleton className="h-64 w-full" />
              ) : truePositives && truePositives.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Fecha de Salida</TableHead>
                      <TableHead>Razón</TableHead>
                      <TableHead>Puntuación de Riesgo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {truePositives.map((emp: any) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">
                          {emp.nombre} {emp.apellido}
                        </TableCell>
                        <TableCell>{emp.departamento}</TableCell>
                        <TableCell>{new Date(emp.exitDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={emp.exitReason === "voluntary" ? "default" : "destructive"}>
                            {emp.exitReason}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{emp.riskScoreAtExit || "N/A"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No hay verdaderos positivos registrados
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="false-positives">
          <Card>
            <CardHeader>
              <CardTitle>Falsos Positivos</CardTitle>
              <CardDescription>
                Empleados identificados como alto riesgo que NO rotaron
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFP ? (
                <Skeleton className="h-64 w-full" />
              ) : falsePositives && (falsePositives as any).length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Puntuación de Riesgo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(falsePositives as any).map((emp: any) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">
                          {emp.nombre} {emp.apellido}
                        </TableCell>
                        <TableCell>{emp.departamento}</TableCell>
                        <TableCell>{emp.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{emp.riskScore}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No hay falsos positivos registrados
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="false-negatives">
          <Card>
            <CardHeader>
              <CardTitle>Falsos Negativos</CardTitle>
              <CardDescription>
                Empleados NO identificados como alto riesgo que rotaron
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFN ? (
                <Skeleton className="h-64 w-full" />
              ) : falseNegatives && falseNegatives.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Fecha de Salida</TableHead>
                      <TableHead>Razón</TableHead>
                      <TableHead>Puntuación de Riesgo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {falseNegatives.map((emp: any) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">
                          {emp.nombre} {emp.apellido}
                        </TableCell>
                        <TableCell>{emp.departamento}</TableCell>
                        <TableCell>{new Date(emp.exitDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={emp.exitReason === "voluntary" ? "default" : "destructive"}>
                            {emp.exitReason}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{emp.riskScoreAtExit || "N/A"}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No hay falsos negativos registrados
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
