import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Filter, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/Breadcrumb";

type Priority = "baja" | "media" | "alta" | "critica";
type Status = "pendiente" | "en_proceso" | "completada" | "cancelada";
type Category = "tecnica" | "soft_skill" | "organizational" | "leadership";

const priorityLabels: Record<Priority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  critica: "Crítica",
};

const priorityColors: Record<Priority, string> = {
  baja: "bg-blue-100 text-blue-800 border-blue-300",
  media: "bg-yellow-100 text-yellow-800 border-yellow-300",
  alta: "bg-orange-100 text-orange-800 border-orange-300",
  critica: "bg-red-100 text-red-800 border-red-300",
};

const statusLabels: Record<Status, string> = {
  pendiente: "Pendiente",
  en_proceso: "En Progreso",
  completada: "Completada",
  cancelada: "Cancelada",
};

const statusColors: Record<Status, string> = {
  pendiente: "bg-gray-100 text-gray-800",
  en_proceso: "bg-blue-100 text-blue-800",
  completada: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-800",
};

const categoryLabels: Record<Category, string> = {
  tecnica: "Técnica",
  soft_skill: "Habilidad Blanda",
  organizational: "Organizacional",
  leadership: "Liderazgo",
};

const categoryColors: Record<Category, string> = {
  tecnica: "bg-purple-100 text-purple-800",
  soft_skill: "bg-pink-100 text-pink-800",
  organizational: "bg-cyan-100 text-cyan-800",
  leadership: "bg-indigo-100 text-indigo-800",
};

export default function DNCDashboard() {
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch all training needs
  const { data: trainingNeeds, isLoading, refetch } = trpc.jobProfiles.getAllTrainingNeeds.useQuery();

  // Fetch employees for department filter
  const { data: employeesData } = trpc.employees.list.useQuery();
  const employees = (employeesData as any) as Array<{ id: number; firstName: string; lastName: string; department: string; position: string }> | undefined;

  // Get unique departments
  const departments = useMemo(() => {
    if (!employees) return [];
    const depts = Array.from(new Set(employees.map((e) => e.department)));
    return depts.filter((d) => d);
  }, [employees]);

  // Filter training needs
  const filteredNeeds = useMemo(() => {
    if (!trainingNeeds) return [];

    return trainingNeeds.filter((need) => {
      const employee = employees?.find((e) => e.id === need.employeeId);
      const departmentMatch = selectedDepartment === "all" || employee?.department === selectedDepartment;
      const priorityMatch = selectedPriority === "all" || need.priority === selectedPriority;
      const statusMatch = selectedStatus === "all" || need.status === selectedStatus;
      const categoryMatch = selectedCategory === "all" || need.competencyType === selectedCategory;

      return departmentMatch && priorityMatch && statusMatch && categoryMatch;
    });
  }, [trainingNeeds, employees, selectedDepartment, selectedPriority, selectedStatus, selectedCategory]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (!filteredNeeds) return { total: 0, pendiente: 0, en_progreso: 0, completada: 0, critica: 0 };

    return {
      total: filteredNeeds.length,
      pendiente: filteredNeeds.filter((n) => n.status === "pendiente").length,
      en_progreso: filteredNeeds.filter((n) => n.status === "en_proceso").length,
      completada: filteredNeeds.filter((n) => n.status === "completada").length,
      critica: filteredNeeds.filter((n) => n.priority === "critica").length,
    };
  }, [filteredNeeds]);

  // Calculate distribution by category
  const categoryDistribution = useMemo(() => {
    if (!filteredNeeds) return [];

    const distribution: Record<Category, number> = {
      tecnica: 0,
      soft_skill: 0,
      organizational: 0,
      leadership: 0,
    };

    filteredNeeds.forEach((need) => {
      const category = need.competencyType as Category;
      if (category in distribution) {
        distribution[category]++;
      }
    });

    return Object.entries(distribution).map(([category, count]) => ({
      category: categoryLabels[category as Category],
      count,
      percentage: filteredNeeds.length > 0 ? Math.round((count / filteredNeeds.length) * 100) : 0,
    }));
  }, [filteredNeeds]);

  // Calculate distribution by priority
  const priorityDistribution = useMemo(() => {
    if (!filteredNeeds) return [];

    const distribution: Record<Priority, number> = {
      baja: 0,
      media: 0,
      alta: 0,
      critica: 0,
    };

    filteredNeeds.forEach((need) => {
      const priority = need.priority as Priority;
      if (priority in distribution) {
        distribution[priority]++;
      }
    });

    return Object.entries(distribution).map(([priority, count]) => ({
      priority: priorityLabels[priority as Priority],
      count,
      percentage: filteredNeeds.length > 0 ? Math.round((count / filteredNeeds.length) * 100) : 0,
      color: priorityColors[priority as Priority],
    }));
  }, [filteredNeeds]);

  const handleExportToExcel = () => {
    toast.info("Funcionalidad de exportación en desarrollo");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
      <Breadcrumb items={[
        {
                label: "Gestión de Talento",
                href: "/"
        },
        {
                label: "DNC Consolidada"
        }
]} />

        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Detección de Necesidades de Capacitación (DNC)</h1>
          <p className="text-gray-600 mt-1">
            Vista consolidada de necesidades técnicas, blandas y transversales
          </p>
        </div>
        <Button onClick={handleExportToExcel} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar a Excel
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold">{stats.pendiente}</p>
            </div>
            <Clock className="h-8 w-8 text-gray-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Progreso</p>
              <p className="text-2xl font-bold">{stats.en_progreso}</p>
            </div>
            <Filter className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completadas</p>
              <p className="text-2xl font-bold">{stats.completada}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6 border-red-200 bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600">Críticas</p>
              <p className="text-2xl font-bold text-red-700">{stats.critica}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Departamento</label>
            <select
              className="w-full p-2 border rounded-lg"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="all">Todos los departamentos</option>
              {departments.map((dept) => (
                <option key={dept} value={dept || ""}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Categoría</label>
            <select
              className="w-full p-2 border rounded-lg"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="all">Todas las categorías</option>
              <option value="tecnica">Técnica</option>
              <option value="soft_skill">Habilidad Blanda</option>
              <option value="organizational">Organizacional</option>
              <option value="leadership">Liderazgo</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Prioridad</label>
            <select
              className="w-full p-2 border rounded-lg"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
            >
              <option value="all">Todas las prioridades</option>
              <option value="baja">Baja</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Estado</label>
            <select
              className="w-full p-2 border rounded-lg"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="all">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_proceso">En Progreso</option>
              <option value="completada">Completada</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Distribución por Categoría</h2>
          <div className="space-y-4">
            {categoryDistribution.map((item) => (
              <div key={item.category}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{item.category}</span>
                  <span className="text-sm text-gray-600">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Priority Distribution */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Distribución por Prioridad</h2>
          <div className="space-y-4">
            {priorityDistribution.map((item) => (
              <div key={item.priority}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{item.priority}</span>
                  <span className="text-sm text-gray-600">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      item.priority === "Crítica"
                        ? "bg-red-600"
                        : item.priority === "Alta"
                        ? "bg-orange-600"
                        : item.priority === "Media"
                        ? "bg-yellow-600"
                        : "bg-blue-600"
                    }`}
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Training Needs Table */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold mb-4">
          Necesidades de Capacitación ({filteredNeeds.length})
        </h2>
        {filteredNeeds.length === 0 ? (
          <div className="text-center text-gray-600 py-8">
            No hay necesidades de capacitación con los filtros seleccionados
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-sm font-semibold">Empleado</th>
                  <th className="text-left p-3 text-sm font-semibold">Competencia</th>
                  <th className="text-left p-3 text-sm font-semibold">Categoría</th>
                  <th className="text-left p-3 text-sm font-semibold">Brecha</th>
                  <th className="text-left p-3 text-sm font-semibold">Prioridad</th>
                  <th className="text-left p-3 text-sm font-semibold">Estado</th>
                  <th className="text-left p-3 text-sm font-semibold">Fecha Límite</th>
                </tr>
              </thead>
              <tbody>
                {filteredNeeds.map((need) => {
                  const employee = employees?.find((e) => e.id === need.employeeId);
                  return (
                    <tr key={need.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-sm">
                        <div>
                          <div className="font-medium">
                            {employee?.firstName} {employee?.lastName}
                          </div>
                          <div className="text-gray-600 text-xs">{employee?.department}</div>
                        </div>
                      </td>
                      <td className="p-3 text-sm">{need.competencyName}</td>
                      <td className="p-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            categoryColors[need.competencyType as Category]
                          }`}
                        >
                          {categoryLabels[need.competencyType as Category]}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        <span className="font-semibold text-red-600">{need.gap}</span>
                      </td>
                      <td className="p-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-lg border text-xs font-medium ${
                            priorityColors[need.priority as Priority]
                          }`}
                        >
                          {priorityLabels[need.priority as Priority]}
                        </span>
                      </td>
                      <td className="p-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            statusColors[need.status as Status]
                          }`}
                        >
                          {statusLabels[need.status as Status]}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {need.dueDate ? new Date(need.dueDate).toLocaleDateString("es-MX") : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
