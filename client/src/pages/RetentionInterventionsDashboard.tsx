import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Plus, TrendingUp, TrendingDown, DollarSign, Users, Target } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const interventionTypeLabels: Record<string, string> = {
  training: "Capacitación",
  salary_adjustment: "Ajuste Salarial",
  position_change: "Cambio de Puesto",
  benefits: "Beneficios",
  recognition: "Reconocimiento",
  other: "Otro",
};

export default function RetentionInterventionsDashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<"all" | "retained" | "left" | "pending">("all");
  
  // Form state
  const [employeeId, setEmployeeId] = useState("");
  const [employeeName, setEmployeeName] = useState("");
  const [employeePosition, setEmployeePosition] = useState("");
  const [department, setDepartment] = useState("");
  const [interventionType, setInterventionType] = useState<"training" | "salary_adjustment" | "position_change" | "benefits" | "recognition" | "other">("training");
  const [interventionDescription, setInterventionDescription] = useState("");
  const [cost, setCost] = useState("");
  const [implementationDate, setImplementationDate] = useState("");
  const [riskScoreBefore, setRiskScoreBefore] = useState("");

  const { data: interventions = [], isLoading: loadingInterventions, refetch } = trpc.retentionInterventions.getInterventions.useQuery({ 
    limit: 50,
    outcome: selectedOutcome,
  });
  
  const { data: stats, isLoading: loadingStats } = trpc.retentionInterventions.getEffectivenessStats.useQuery();

  const createInterventionMutation = trpc.retentionInterventions.createIntervention.useMutation({
    onSuccess: () => {
      toast.success("Intervención registrada exitosamente");
      setIsDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Error al registrar intervención");
    },
  });

  const resetForm = () => {
    setEmployeeId("");
    setEmployeeName("");
    setEmployeePosition("");
    setDepartment("");
    setInterventionType("training");
    setInterventionDescription("");
    setCost("");
    setImplementationDate("");
    setRiskScoreBefore("");
  };

  const handleCreateIntervention = () => {
    if (!employeeId || !employeeName || !interventionDescription || !implementationDate) {
      toast.error("Completa los campos requeridos");
      return;
    }

    createInterventionMutation.mutate({
      employeeId: parseInt(employeeId),
      employeeName,
      employeePosition: employeePosition || undefined,
      department: department || undefined,
      interventionType,
      interventionDescription,
      cost: cost ? parseFloat(cost) : undefined,
      implementationDate,
      riskScoreBefore: riskScoreBefore ? parseFloat(riskScoreBefore) : undefined,
    });
  };

  if (loadingInterventions || loadingStats) {
    return (
      <div className="container mx-auto py-8">
        <p>Cargando dashboard de intervenciones...</p>
      </div>
    );
  }

  // Preparar datos para gráfico de efectividad por tipo
  const effectivenessChartData = stats?.effectivenessByType.map(item => ({
    type: interventionTypeLabels[item.type] || item.type,
    efectividad: parseFloat(item.avgEffectiveness),
    retenidos: item.retainedCount,
  })) || [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Impacto de Intervenciones de Retención</h1>
          <p className="text-muted-foreground mt-2">
            Visualiza cómo las acciones de retención afectan las métricas de rotación predicha vs real
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Intervención
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Registrar Nueva Intervención de Retención</DialogTitle>
              <DialogDescription>
                Documenta las acciones tomadas para retener empleados de alto riesgo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">ID Empleado *</Label>
                  <Input
                    id="employeeId"
                    type="number"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeName">Nombre Empleado *</Label>
                  <Input
                    id="employeeName"
                    value={employeeName}
                    onChange={(e) => setEmployeeName(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeePosition">Puesto</Label>
                  <Input
                    id="employeePosition"
                    value={employeePosition}
                    onChange={(e) => setEmployeePosition(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="interventionType">Tipo de Intervención *</Label>
                <Select value={interventionType} onValueChange={(value: any) => setInterventionType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="training">Capacitación</SelectItem>
                    <SelectItem value="salary_adjustment">Ajuste Salarial</SelectItem>
                    <SelectItem value="position_change">Cambio de Puesto</SelectItem>
                    <SelectItem value="benefits">Beneficios</SelectItem>
                    <SelectItem value="recognition">Reconocimiento</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="interventionDescription">Descripción *</Label>
                <Textarea
                  id="interventionDescription"
                  value={interventionDescription}
                  onChange={(e) => setInterventionDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cost">Costo (MXN)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="implementationDate">Fecha de Implementación *</Label>
                  <Input
                    id="implementationDate"
                    type="date"
                    value={implementationDate}
                    onChange={(e) => setImplementationDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="riskScoreBefore">Riesgo Antes de Intervención (%)</Label>
                <Input
                  id="riskScoreBefore"
                  type="number"
                  step="0.01"
                  value={riskScoreBefore}
                  onChange={(e) => setRiskScoreBefore(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateIntervention} disabled={createInterventionMutation.isPending}>
                {createInterventionMutation.isPending ? "Registrando..." : "Registrar Intervención"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Intervenciones</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Acciones de retención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Retenidos</CardTitle>
            <Users className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.retained || 0}</div>
            <p className="text-xs text-muted-foreground">Retención exitosa</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Retención</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats?.retentionRate || 0}%</div>
            <p className="text-xs text-muted-foreground">Efectividad general</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inversión Total</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.totalCost || 0}</div>
            <p className="text-xs text-muted-foreground">MXN invertidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo por Retención</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.avgCostPerRetention || 0}</div>
            <p className="text-xs text-muted-foreground">ROI promedio</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Efectividad por Tipo */}
      <Card>
        <CardHeader>
          <CardTitle>Efectividad por Tipo de Intervención</CardTitle>
          <CardDescription>Comparación de efectividad y empleados retenidos por tipo de acción</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={effectivenessChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="type" />
              <YAxis yAxisId="left" orientation="left" stroke="#3b82f6" />
              <YAxis yAxisId="right" orientation="right" stroke="#10b981" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="efectividad" fill="#3b82f6" name="Efectividad (%)" />
              <Bar yAxisId="right" dataKey="retenidos" fill="#10b981" name="Empleados Retenidos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Tabla de Intervenciones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Historial de Intervenciones</CardTitle>
              <CardDescription>Registro de acciones de retención y sus resultados</CardDescription>
            </div>
            <Select value={selectedOutcome} onValueChange={(value: any) => setSelectedOutcome(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="retained">Retenidos</SelectItem>
                <SelectItem value="left">Salieron</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {interventions.length === 0 ? (
            <div className="text-center py-12">
              <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay intervenciones registradas</p>
              <p className="text-sm text-muted-foreground mt-2">
                Comienza registrando acciones de retención para empleados de alto riesgo
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>Riesgo Antes</TableHead>
                  <TableHead>Riesgo Después</TableHead>
                  <TableHead>Reducción</TableHead>
                  <TableHead>Outcome</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {interventions.map((intervention) => (
                  <TableRow key={intervention.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{intervention.employeeName}</p>
                        <p className="text-sm text-muted-foreground">{intervention.employeePosition}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {interventionTypeLabels[intervention.interventionType]}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {intervention.interventionDescription}
                    </TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(intervention.implementationDate), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {intervention.cost ? `$${parseFloat(intervention.cost).toFixed(2)}` : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {intervention.riskScoreBefore ? `${intervention.riskScoreBefore}%` : "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {intervention.riskScoreAfter ? `${intervention.riskScoreAfter}%` : "-"}
                    </TableCell>
                    <TableCell>
                      {intervention.riskReduction ? (
                        <div className="flex items-center gap-1">
                          {parseFloat(intervention.riskReduction) > 0 ? (
                            <TrendingDown className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-red-600" />
                          )}
                          <span className="text-sm">{intervention.riskReduction}%</span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      {intervention.outcome ? (
                        <Badge
                          variant={
                            intervention.outcome === "retained"
                              ? "default"
                              : intervention.outcome === "left"
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {intervention.outcome === "retained"
                            ? "Retenido"
                            : intervention.outcome === "left"
                            ? "Salió"
                            : "Pendiente"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Pendiente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
