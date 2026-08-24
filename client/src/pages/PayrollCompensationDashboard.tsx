import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Users,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

export default function PayrollCompensationDashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);

  // Form state
  const [formData, setFormData] = useState({
    employeeId: "",
    employeeName: "",
    department: "",
    position: "",
    salary: "",
    benefits: "",
    lastRaiseDate: "",
    lastRaisePercentage: "",
    marketRate: "",
  });

  const utils = trpc.useUtils();

  // Queries
  const { data: payrollData = [], isLoading: payrollLoading } =
    trpc.payrollIntegration.getAllPayrollData.useQuery();
  const { data: criticalGaps = [], isLoading: criticalLoading } =
    trpc.payrollIntegration.getCriticalSalaryGaps.useQuery();
  const { data: correlation, isLoading: correlationLoading } =
    trpc.payrollIntegration.getCompensationRiskCorrelation.useQuery();

  // Mutations
  const upsertMutation = trpc.payrollIntegration.upsertPayrollData.useMutation({
    onSuccess: () => {
      toast.success("Datos de nómina guardados exitosamente");
      utils.payrollIntegration.invalidate();
      setIsDialogOpen(false);
      resetForm();
    },
    onError: error => {
      toast.error(error.message || "Error al guardar datos de nómina");
    },
  });

  const deleteMutation = trpc.payrollIntegration.deletePayrollData.useMutation({
    onSuccess: () => {
      toast.success("Datos de nómina eliminados");
      utils.payrollIntegration.invalidate();
    },
    onError: error => {
      toast.error(error.message || "Error al eliminar datos de nómina");
    },
  });

  const resetForm = () => {
    setFormData({
      employeeId: "",
      employeeName: "",
      department: "",
      position: "",
      salary: "",
      benefits: "",
      lastRaiseDate: "",
      lastRaisePercentage: "",
      marketRate: "",
    });
    setEditingEmployee(null);
  };

  const handleEdit = (employee: any) => {
    setEditingEmployee(employee);
    setFormData({
      employeeId: employee.employeeId.toString(),
      employeeName: employee.employeeName,
      department: employee.department || "",
      position: employee.position || "",
      salary: employee.salary || "",
      benefits: employee.benefits || "",
      lastRaiseDate: employee.lastRaiseDate || "",
      lastRaisePercentage: employee.lastRaisePercentage || "",
      marketRate: employee.marketRate || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.employeeName || !formData.salary) {
      toast.error("Por favor complete los campos requeridos");
      return;
    }

    upsertMutation.mutate({
      employeeId: parseInt(formData.employeeId),
      employeeName: formData.employeeName,
      department: formData.department || undefined,
      position: formData.position || undefined,
      salary: parseFloat(formData.salary),
      benefits: formData.benefits ? parseFloat(formData.benefits) : undefined,
      lastRaiseDate: formData.lastRaiseDate || undefined,
      lastRaisePercentage: formData.lastRaisePercentage
        ? parseFloat(formData.lastRaisePercentage)
        : undefined,
      marketRate: formData.marketRate
        ? parseFloat(formData.marketRate)
        : undefined,
    });
  };

  const handleDelete = (employeeId: number) => {
    if (confirm("¿Está seguro de eliminar estos datos de nómina?")) {
      deleteMutation.mutate({ employeeId });
    }
  };

  // Preparar datos para gráfico de dispersión (salario vs brecha salarial)
  const scatterData = payrollData
    .filter((d: any) => d.salary && d.salaryGapPercentage)
    .map((d: any) => ({
      salary: parseFloat(d.salary),
      gap: parseFloat(d.salaryGapPercentage || "0"),
      name: d.employeeName,
    }));

  // Preparar datos para gráfico de barras (distribución por nivel de riesgo)
  const riskDistribution = [
    {
      level: "Crítico",
      count: correlation?.criticalCount || 0,
      fill: "#dc2626",
    },
    { level: "Alto", count: correlation?.highCount || 0, fill: "#f97316" },
    { level: "Medio", count: correlation?.mediumCount || 0, fill: "#eab308" },
    { level: "Bajo", count: correlation?.lowCount || 0, fill: "#22c55e" },
  ];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Compensación y Análisis Salarial
          </h1>
          <p className="text-muted-foreground mt-2">
            Correlación entre compensación y riesgo de rotación
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="h-4 w-4 mr-2" />
              Agregar Datos de Nómina
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingEmployee ? "Editar" : "Agregar"} Datos de Nómina
              </DialogTitle>
              <DialogDescription>
                Complete la información de compensación del empleado
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">ID Empleado *</Label>
                  <Input
                    id="employeeId"
                    type="number"
                    value={formData.employeeId}
                    onChange={e =>
                      setFormData({ ...formData, employeeId: e.target.value })
                    }
                    disabled={!!editingEmployee}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employeeName">Nombre *</Label>
                  <Input
                    id="employeeName"
                    value={formData.employeeName}
                    onChange={e =>
                      setFormData({ ...formData, employeeName: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={e =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Puesto</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={e =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salary">Salario Mensual (MXN) *</Label>
                  <Input
                    id="salary"
                    type="number"
                    step="0.01"
                    value={formData.salary}
                    onChange={e =>
                      setFormData({ ...formData, salary: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="benefits">Beneficios Mensuales (MXN)</Label>
                  <Input
                    id="benefits"
                    type="number"
                    step="0.01"
                    value={formData.benefits}
                    onChange={e =>
                      setFormData({ ...formData, benefits: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lastRaiseDate">Fecha Último Aumento</Label>
                  <Input
                    id="lastRaiseDate"
                    type="date"
                    value={formData.lastRaiseDate}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        lastRaiseDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastRaisePercentage">% Último Aumento</Label>
                  <Input
                    id="lastRaisePercentage"
                    type="number"
                    step="0.01"
                    value={formData.lastRaisePercentage}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        lastRaisePercentage: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marketRate">Tasa de Mercado (MXN)</Label>
                <Input
                  id="marketRate"
                  type="number"
                  step="0.01"
                  value={formData.marketRate}
                  onChange={e =>
                    setFormData({ ...formData, marketRate: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Métricas Generales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Empleados
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {correlation?.totalEmployees || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Con datos de compensación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Brecha Crítica
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {correlation?.criticalCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Requieren revisión urgente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Riesgo Alto</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {correlation?.highCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Compensación por debajo del mercado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Compensación Adecuada
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(correlation?.lowCount || 0) + (correlation?.mediumCount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">En rango de mercado</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Nivel de Riesgo</CardTitle>
            <CardDescription>
              Empleados agrupados por nivel de riesgo de compensación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={riskDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Empleados" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Salario vs Brecha Salarial</CardTitle>
            <CardDescription>
              Correlación entre salario actual y brecha con el mercado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="salary"
                  name="Salario"
                  label={{
                    value: "Salario (MXN)",
                    position: "insideBottom",
                    offset: -5,
                  }}
                />
                <YAxis
                  type="number"
                  dataKey="gap"
                  name="Brecha"
                  label={{
                    value: "Brecha Salarial (%)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(value: any, name: string) => {
                    if (name === "Salario")
                      return [`$${value.toLocaleString()} MXN`, name];
                    return [`${value.toFixed(1)}%`, "Brecha"];
                  }}
                />
                <Scatter name="Empleados" data={scatterData} fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Empleados con Brecha Crítica */}
      <Card>
        <CardHeader>
          <CardTitle>Empleados con Brecha Salarial Crítica</CardTitle>
          <CardDescription>
            Requieren revisión urgente de compensación para prevenir rotación
          </CardDescription>
        </CardHeader>
        <CardContent>
          {criticalLoading ? (
            <p className="text-center text-muted-foreground">Cargando...</p>
          ) : criticalGaps.length === 0 ? (
            <p className="text-center text-muted-foreground">
              No hay empleados con brecha salarial crítica
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Nombre</th>
                    <th className="text-left p-3 font-medium">Departamento</th>
                    <th className="text-center p-3 font-medium">
                      Salario Actual
                    </th>
                    <th className="text-center p-3 font-medium">
                      Tasa de Mercado
                    </th>
                    <th className="text-center p-3 font-medium">Brecha</th>
                    <th className="text-center p-3 font-medium">
                      Nivel de Riesgo
                    </th>
                    <th className="text-center p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalGaps.map((employee: any) => (
                    <tr
                      key={employee.id}
                      className="border-b hover:bg-muted/50"
                    >
                      <td className="p-3">{employee.employeeName}</td>
                      <td className="p-3">{employee.department}</td>
                      <td className="p-3 text-center">
                        ${parseFloat(employee.salary).toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        {employee.marketRate
                          ? `$${parseFloat(employee.marketRate).toLocaleString()}`
                          : "N/A"}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="destructive">
                          {employee.salaryGapPercentage}%
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          className={
                            employee.compensationRiskLevel === "critical"
                              ? "bg-red-100 text-red-800"
                              : "bg-orange-100 text-orange-800"
                          }
                        >
                          {employee.compensationRiskLevel === "critical"
                            ? "Crítico"
                            : "Alto"}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(employee)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(employee.employeeId)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
