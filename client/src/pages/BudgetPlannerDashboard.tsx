import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DollarSign, TrendingUp, Users, Target } from "lucide-react";

export default function BudgetPlannerDashboard() {
  const { data: scenarios, refetch } = trpc.budgetPlanner.getScenarios.useQuery();
  const { data: highRiskEmployees } = trpc.predictiveTurnover.getHighRiskEmployees.useQuery({ limit: 50 });

  const createScenario = trpc.budgetPlanner.createScenario.useMutation({
    onSuccess: () => {
      toast.success("Escenario creado exitosamente");
      refetch();
      setShowCreateDialog(false);
    },
  });

  const deleteScenario = trpc.budgetPlanner.deleteScenario.useMutation({
    onSuccess: () => {
      toast.success("Escenario eliminado");
      refetch();
    },
  });

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [scenarioDescription, setScenarioDescription] = useState("");
  const [totalBudget, setTotalBudget] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<Set<number>>(new Set());

  const handleEmployeeToggle = (employeeId: number) => {
    const newSet = new Set(selectedEmployees);
    if (newSet.has(employeeId)) {
      newSet.delete(employeeId);
    } else {
      newSet.add(employeeId);
    }
    setSelectedEmployees(newSet);
  };

  const handleCreateScenario = () => {
    if (!scenarioName || !totalBudget || selectedEmployees.size === 0) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    const employeeAdjustments = highRiskEmployees
      ?.filter((emp: any) => selectedEmployees.has(emp.employee_id))
      .map((emp: any) => ({
        employeeId: emp.employee_id,
        employeeName: emp.employee_name,
        currentSalary: parseFloat(emp.salary || "0"),
        newSalary: parseFloat(emp.market_rate || emp.salary || "0"),
        turnoverProbability: parseFloat(emp.turnover_probability || "0"),
      })) || [];

    createScenario.mutate({
      scenarioName,
      description: scenarioDescription,
      totalBudget: parseFloat(totalBudget),
      employeeAdjustments,
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Planificador Presupuestario</h1>
          <p className="text-muted-foreground">Simula y optimiza ajustes salariales múltiples</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <DollarSign className="h-4 w-4 mr-2" />
              Crear Escenario
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Escenario Presupuestario</DialogTitle>
              <DialogDescription>
                Selecciona empleados y define el presupuesto disponible
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>Nombre del Escenario</Label>
                <Input
                  value={scenarioName}
                  onChange={(e) => setScenarioName(e.target.value)}
                  placeholder="Ej: Ajustes Q1 2026"
                />
              </div>

              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={scenarioDescription}
                  onChange={(e) => setScenarioDescription(e.target.value)}
                  placeholder="Descripción opcional del escenario..."
                />
              </div>

              <div>
                <Label>Presupuesto Total Disponible</Label>
                <Input
                  type="number"
                  value={totalBudget}
                  onChange={(e) => setTotalBudget(e.target.value)}
                  placeholder="Ej: 500000"
                />
              </div>

              <div>
                <Label>Empleados de Alto Riesgo ({selectedEmployees.size} seleccionados)</Label>
                <div className="border rounded-md max-h-64 overflow-y-auto mt-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Salario Actual</TableHead>
                        <TableHead>Mercado</TableHead>
                        <TableHead>Brecha</TableHead>
                        <TableHead>Riesgo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {highRiskEmployees?.map((emp: any) => (
                        <TableRow key={emp.employee_id}>
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedEmployees.has(emp.employee_id)}
                              onChange={() => handleEmployeeToggle(emp.employee_id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{emp.employee_name}</TableCell>
                          <TableCell>${parseFloat(emp.salary || "0").toLocaleString()}</TableCell>
                          <TableCell>${parseFloat(emp.market_rate || emp.salary || "0").toLocaleString()}</TableCell>
                          <TableCell>
                            <Badge variant={parseFloat(emp.salary_gap_percentage || "0") < -20 ? "destructive" : "default"}>
                              {parseFloat(emp.salary_gap_percentage || "0").toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell>{parseFloat(emp.turnover_probability || "0").toFixed(0)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <Button onClick={handleCreateScenario} className="w-full">
                Crear Escenario
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Escenarios */}
      <div className="grid gap-4">
        {scenarios?.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground text-center">
                No hay escenarios creados. Crea uno nuevo para comenzar.
              </p>
            </CardContent>
          </Card>
        ) : (
          scenarios?.map((scenario: any) => (
            <Card key={scenario.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{scenario.scenarioName}</CardTitle>
                    <CardDescription>{scenario.description}</CardDescription>
                  </div>
                  <Badge variant={scenario.status === "approved" ? "default" : "secondary"}>
                    {scenario.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4 mb-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Presupuesto Total</p>
                      <p className="text-lg font-semibold">${parseFloat(scenario.totalBudget).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Presupuesto Usado</p>
                      <p className="text-lg font-semibold">${parseFloat(scenario.budgetUsed).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Empleados Afectados</p>
                      <p className="text-lg font-semibold">{scenario.totalEmployeesAffected}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">ROI Estimado</p>
                      <p className={`text-lg font-semibold ${parseFloat(scenario.roi) > 0 ? "text-green-600" : "text-red-600"}`}>
                        {parseFloat(scenario.roi).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Ver Detalles
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteScenario.mutate({ scenarioId: scenario.id })}
                  >
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
