import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, TrendingDown, DollarSign, Target, AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function RetentionConsolidatedDashboard() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [salaryAdjustment, setSalaryAdjustment] = useState<string>("");
  const [adjustmentType, setAdjustmentType] = useState<"percentage" | "fixed" | "market">("percentage");

  // Queries
  const { data: highRiskEmployees = [], isLoading: employeesLoading } = trpc.predictiveTurnoverDashboard.getHighRiskEmployees.useQuery({
    department: selectedDepartment === "all" ? undefined : selectedDepartment,
  });

  const { data: recommendations = [] } = trpc.interventionRecommendations.getRecommendations.useQuery(
    { employeeId: selectedEmployee ? parseInt(selectedEmployee) : 0 },
    { enabled: !!selectedEmployee }
  );

  const { data: payrollData = [] } = trpc.payrollIntegration.getAllPayrollData.useQuery();
  const { data: criticalGaps = [] } = trpc.payrollIntegration.getCriticalSalaryGaps.useQuery();
  const { data: interventions = [] } = trpc.retentionInterventions.getAllInterventions.useQuery();

  const { data: simulationResult } = trpc.salaryImpactSimulator.simulateImpact.useQuery(
    {
      employeeId: selectedEmployee ? parseInt(selectedEmployee) : 0,
      adjustmentType,
      adjustmentValue: salaryAdjustment ? parseFloat(salaryAdjustment) : 0,
    },
    { enabled: !!selectedEmployee && !!salaryAdjustment }
  );

  // Mutations
  const exportPDFMutation = trpc.compensationReports.generateCompensationPDF.useMutation({
    onSuccess: (data) => {
      if (data.pdfUrl) {
        window.open(data.pdfUrl, "_blank");
        toast.success("Reporte PDF generado exitosamente");
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al generar PDF");
    },
  });

  // Calcular métricas consolidadas
  const totalHighRisk = highRiskEmployees.length;
  const criticalSalaryGaps = criticalGaps.length;
  const activeInterventions = interventions.filter((i) => i.outcome === "pending").length;
  const successfulInterventions = interventions.filter((i) => i.outcome === "retained").length;
  const totalInterventionCost = interventions.reduce((sum, i) => sum + parseFloat(i.cost || "0"), 0);
  const retentionROI = successfulInterventions > 0 ? ((successfulInterventions * 50000 - totalInterventionCost) / totalInterventionCost) * 100 : 0;

  // Preparar datos para gráfico de priorización
  const priorityData = highRiskEmployees.slice(0, 10).map((emp) => {
    const payroll = payrollData.find((p) => p.employeeId === emp.employeeId);
    return {
      name: emp.employeeName,
      riesgo: parseFloat(emp.turnoverProbability),
      brecha: payroll?.salaryGapPercentage ? Math.abs(parseFloat(payroll.salaryGapPercentage)) : 0,
    };
  });

  // Preparar datos para gráfico de efectividad de intervenciones
  const effectivenessData = [
    { tipo: "Capacitación", exito: 75, costo: 5000 },
    { tipo: "Ajuste Salarial", exito: 85, costo: 15000 },
    { tipo: "Cambio de Puesto", exito: 60, costo: 8000 },
    { tipo: "Beneficios", exito: 70, costo: 10000 },
    { tipo: "Reconocimiento", exito: 55, costo: 2000 },
  ];

  const handleExportPDF = () => {
    exportPDFMutation.mutate();
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Consolidado de Retención</h1>
          <p className="text-muted-foreground mt-2">
            Vista unificada de riesgo, recomendaciones y análisis salarial
          </p>
        </div>
        <Button onClick={handleExportPDF} disabled={exportPDFMutation.isPending}>
          <Download className="h-4 w-4 mr-2" />
          {exportPDFMutation.isPending ? "Generando..." : "Exportar PDF"}
        </Button>
      </div>

      {/* Métricas Consolidadas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados en Riesgo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalHighRisk}</div>
            <p className="text-xs text-muted-foreground">Requieren atención inmediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brecha Salarial Crítica</CardTitle>
            <DollarSign className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{criticalSalaryGaps}</div>
            <p className="text-xs text-muted-foreground">Compensación por debajo del mercado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intervenciones Activas</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeInterventions}</div>
            <p className="text-xs text-muted-foreground">En proceso de ejecución</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI de Retención</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{retentionROI.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">Retorno de inversión en intervenciones</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs de contenido */}
      <Tabs defaultValue="priority" className="space-y-4">
        <TabsList>
          <TabsTrigger value="priority">Priorización</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
          <TabsTrigger value="simulator">Simulador Salarial</TabsTrigger>
          <TabsTrigger value="effectiveness">Efectividad</TabsTrigger>
        </TabsList>

        {/* Tab de Priorización */}
        <TabsContent value="priority" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Empleados Prioritarios para Retención</CardTitle>
              <CardDescription>
                Top 10 empleados con mayor riesgo de rotación y brecha salarial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>Filtrar por Departamento</Label>
                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los departamentos</SelectItem>
                    <SelectItem value="Ventas">Ventas</SelectItem>
                    <SelectItem value="Operaciones">Operaciones</SelectItem>
                    <SelectItem value="Soporte">Soporte</SelectItem>
                    <SelectItem value="Administración">Administración</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={priorityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="riesgo" name="Riesgo de Rotación (%)" fill="#dc2626" />
                  <Bar dataKey="brecha" name="Brecha Salarial (%)" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium">Nombre</th>
                      <th className="text-center p-3 font-medium">Departamento</th>
                      <th className="text-center p-3 font-medium">Riesgo</th>
                      <th className="text-center p-3 font-medium">Brecha Salarial</th>
                      <th className="text-center p-3 font-medium">Acción Recomendada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {highRiskEmployees.slice(0, 10).map((emp) => {
                      const payroll = payrollData.find((p) => p.employeeId === emp.employeeId);
                      return (
                        <tr key={emp.employeeId} className="border-b hover:bg-muted/50">
                          <td className="p-3">{emp.employeeName}</td>
                          <td className="p-3 text-center">{emp.department}</td>
                          <td className="p-3 text-center">
                            <Badge variant="destructive">{emp.turnoverProbability}%</Badge>
                          </td>
                          <td className="p-3 text-center">
                            {payroll?.salaryGapPercentage ? (
                              <Badge className="bg-orange-100 text-orange-800">
                                {payroll.salaryGapPercentage}%
                              </Badge>
                            ) : (
                              "N/A"
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedEmployee(emp.employeeId.toString())}
                            >
                              Ver Recomendaciones
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Recomendaciones */}
        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recomendaciones Inteligentes de Intervención</CardTitle>
              <CardDescription>
                Sugerencias basadas en efectividad histórica y perfil del empleado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label>Seleccionar Empleado</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {highRiskEmployees.map((emp) => (
                      <SelectItem key={emp.employeeId} value={emp.employeeId.toString()}>
                        {emp.employeeName} - {emp.department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedEmployee && recommendations.length > 0 ? (
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-600">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{rec.interventionType}</CardTitle>
                            <CardDescription>{rec.rationale}</CardDescription>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            {rec.successProbability}% probabilidad de éxito
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Costo Estimado</p>
                            <p className="font-semibold">${rec.estimatedCost.toLocaleString()} MXN</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">ROI Esperado</p>
                            <p className="font-semibold">{rec.expectedROI}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Efectividad Histórica</p>
                            <p className="font-semibold">{rec.historicalEffectiveness}%</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : selectedEmployee ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay recomendaciones disponibles para este empleado
                </p>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Seleccione un empleado para ver recomendaciones
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Simulador Salarial */}
        <TabsContent value="simulator" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simulador de Impacto Salarial</CardTitle>
              <CardDescription>
                Calcula cómo ajustes salariales reducirían el riesgo de rotación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 mb-6">
                <div>
                  <Label>Seleccionar Empleado</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {criticalGaps.map((emp) => (
                        <SelectItem key={emp.employeeId} value={emp.employeeId.toString()}>
                          {emp.employeeName} - Brecha: {emp.salaryGapPercentage}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo de Ajuste</Label>
                  <Select value={adjustmentType} onValueChange={(v: any) => setAdjustmentType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Aumento Porcentual</SelectItem>
                      <SelectItem value="fixed">Aumento Fijo (MXN)</SelectItem>
                      <SelectItem value="market">Ajustar a Tasa de Mercado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {adjustmentType !== "market" && (
                  <div>
                    <Label>
                      Valor del Ajuste {adjustmentType === "percentage" ? "(%)" : "(MXN)"}
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={salaryAdjustment}
                      onChange={(e) => setSalaryAdjustment(e.target.value)}
                      placeholder={adjustmentType === "percentage" ? "Ej: 10" : "Ej: 5000"}
                    />
                  </div>
                )}
              </div>

              {simulationResult && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Riesgo Actual</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-red-600">
                          {simulationResult.currentRisk}%
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Riesgo Proyectado</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-600">
                          {simulationResult.projectedRisk}%
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-blue-50">
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-sm text-muted-foreground">Reducción de Riesgo</p>
                          <p className="text-2xl font-bold text-blue-600">
                            {simulationResult.riskReduction}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Costo del Ajuste</p>
                          <p className="text-2xl font-bold">
                            ${simulationResult.adjustmentCost.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">ROI Estimado</p>
                          <p className="text-2xl font-bold text-green-600">
                            {simulationResult.estimatedROI}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div>
                    <h4 className="font-semibold mb-2">Análisis de Impacto</h4>
                    <p className="text-sm text-muted-foreground">{simulationResult.analysis}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Efectividad */}
        <TabsContent value="effectiveness" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Efectividad de Intervenciones por Tipo</CardTitle>
              <CardDescription>
                Comparación de tasa de éxito y costo promedio
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={effectivenessData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="tipo" />
                  <YAxis yAxisId="left" label={{ value: "Tasa de Éxito (%)", angle: -90, position: "insideLeft" }} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    label={{ value: "Costo (MXN)", angle: 90, position: "insideRight" }}
                  />
                  <Tooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="exito"
                    name="Tasa de Éxito (%)"
                    stroke="#22c55e"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="costo"
                    name="Costo Promedio (MXN)"
                    stroke="#3b82f6"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>

              <div className="mt-6">
                <h4 className="font-semibold mb-4">Resumen de Intervenciones Históricas</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Total Intervenciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{interventions.length}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Tasa de Éxito</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {interventions.length > 0
                          ? ((successfulInterventions / interventions.length) * 100).toFixed(0)
                          : 0}
                        %
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Inversión Total</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        ${totalInterventionCost.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
