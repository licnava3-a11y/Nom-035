import { useState } from "react";
import { TableSkeleton } from "@/components/TableSkeleton";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Filter, FileText, User, AlertCircle, CheckCircle, Clock, UserCheck } from "lucide-react";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function CasesManagement() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState({
    departmentId: "",
    status: "",
    priority: "",
    search: ""
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCase, setNewCase] = useState({
    caseType: "mobbing" as const,
    priority: "medium" as const,
    departmentId: "",
    reporterName: "",
    reporterEmail: "",
    reporterPhone: "",
    description: "",
    reporterEmployeeId: "" // Nuevo campo para seleccionar empleado
  });

  const utils = trpc.useUtils();
  
  // Queries - Usar router optimizado
  const { data: casesData, isLoading } = trpc.casesPaginated.listPaginated.useQuery({
    page,
    pageSize,
    status: filters.status && filters.status !== "all" ? filters.status as "open" | "investigating" | "resolved" | "closed" : undefined,
    priority: filters.priority && filters.priority !== "all" ? filters.priority as "low" | "medium" | "high" | "critical" : undefined,
    departmentId: filters.departmentId && filters.departmentId !== "all" ? parseInt(filters.departmentId) : undefined,
    search: filters.search || undefined,
  });

  const { data: departments } = trpc.departments.list.useQuery({ page: 1, pageSize: 100 });
  const { data: stats } = trpc.casesManagement.getCasesStats.useQuery();
  
  // Nueva query para obtener empleados (para selector de reportante)
  const { data: employeesRaw } = trpc.employees.list.useQuery({ isActive: true });
  const employeesData = { employees: employeesRaw?.employees ?? [] };

  // Mutations
  const createCase = trpc.casesManagement.createCase.useMutation({
    onSuccess: () => {
      toast.success("Caso creado exitosamente");
      setIsCreateDialogOpen(false);
      setNewCase({
        caseType: "mobbing",
        priority: "medium",
        departmentId: "",
        reporterName: "",
        reporterEmail: "",
        reporterPhone: "",
        description: "",
        reporterEmployeeId: ""
      });
      utils.casesManagement.listCases.invalidate();
      utils.casesManagement.getCasesStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Error al crear caso: ${error.message}`);
    }
  });

  const assignCase = trpc.casesManagement.assignCase.useMutation({
    onSuccess: () => {
      toast.success("Caso asignado exitosamente");
      utils.casesManagement.listCases.invalidate();
    },
    onError: (error) => {
      toast.error(`Error al asignar caso: ${error.message}`);
    }
  });

  const updateCase = trpc.casesManagement.updateCase.useMutation({
    onSuccess: () => {
      toast.success("Caso actualizado exitosamente");
      utils.casesManagement.listCases.invalidate();
      utils.casesManagement.getCasesStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Error al actualizar caso: ${error.message}`);
    }
  });

  const handleCreateCase = () => {
    if (!newCase.reporterName || !newCase.reporterEmail || !newCase.description || !newCase.departmentId) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    createCase.mutate({
      ...newCase,
      departmentId: parseInt(newCase.departmentId),
    });
  };

  const handleAssignCase = (caseId: number) => {
    // TODO: Implementar selector de usuario para asignar
    const assignedTo = 1; // Placeholder
    assignCase.mutate({ caseId, assignedTo });
  };

  const handleUpdateStatus = (caseId: number, status: "open" | "investigating" | "resolved" | "closed") => {
    updateCase.mutate({ id: caseId, status });
  };

  // Nueva función para prellenar datos cuando se selecciona un empleado
  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employeesData?.employees?.find((emp: any) => emp.id.toString() === employeeId);
    
    if (employee) {
      // Solo prellenar si no es "manual"
      if (employeeId !== "manual") {
        setNewCase(prev => ({
          ...prev,
          reporterEmployeeId: employeeId,
          reporterName: `${employee.firstName} ${employee.lastName}`,
          reporterEmail: employee.email || "",
          reporterPhone: employee.phone || "",
          departmentId: employee.departmentId?.toString() || prev.departmentId
        }));
        
        toast.success("Datos del empleado prellenados automáticamente", {
          description: "Puedes modificar los campos si es necesario"
        });
      } else {
        // Limpiar campos si se selecciona "manual"
        setNewCase(prev => ({
          ...prev,
          reporterEmployeeId: "",
          reporterName: "",
          reporterEmail: "",
          reporterPhone: "",
          departmentId: ""
        }));
      }
    } else if (employeeId === "manual") {
      // Limpiar campos si se selecciona "manual" directamente
      setNewCase(prev => ({
        ...prev,
        reporterEmployeeId: "",
        reporterName: "",
        reporterEmail: "",
        reporterPhone: "",
        departmentId: ""
      }));
      
      toast.success("Datos del empleado prellenados automáticamente", {
        description: "Puedes modificar los campos si es necesario"
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "bg-red-100 text-red-800";
      case "high": return "bg-orange-100 text-orange-800";
      case "medium": return "bg-yellow-100 text-yellow-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-100 text-blue-800";
      case "investigating": return "bg-purple-100 text-purple-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "closed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: "Abierto",
      investigating: "Investigando",
      resolved: "Resuelto",
      closed: "Cerrado"
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      critical: "Crítica",
      high: "Alta",
      medium: "Media",
      low: "Baja"
    };
    return labels[priority] || priority;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Casos</h1>
          <p className="text-muted-foreground mt-1">
            Administra y da seguimiento a los casos de riesgos psicosociales
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Caso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Caso</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="caseType">Tipo de Caso *</Label>
                  <Select
                    value={newCase.caseType}
                    onValueChange={(value: any) => setNewCase({ ...newCase, caseType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobbing">Mobbing</SelectItem>
                      <SelectItem value="burnout">Burnout</SelectItem>
                      <SelectItem value="harassment">Acoso</SelectItem>
                      <SelectItem value="discrimination">Discriminación</SelectItem>
                      <SelectItem value="violence">Violencia</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority">Prioridad *</Label>
                  <Select
                    value={newCase.priority}
                    onValueChange={(value: any) => setNewCase({ ...newCase, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Crítica</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="low">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="departmentId">Departamento *</Label>
                <Select
                  value={newCase.departmentId}
                  onValueChange={(value) => setNewCase({ ...newCase, departmentId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.data?.map((dept: { id: number; name: string }) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Nuevo selector de empleado para prellenado automático */}
              <div className="space-y-2">
                <Label htmlFor="reporterEmployeeId">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Seleccionar Empleado (Opcional - Prellenado Automático)
                  </div>
                </Label>
                <Select
                  value={newCase.reporterEmployeeId}
                  onValueChange={handleEmployeeSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Buscar empleado existente..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">-- Captura manual --</SelectItem>
                    {employeesData?.employees?.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.firstName} {emp.lastName} - {emp.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Al seleccionar un empleado, se prellenarán automáticamente nombre, email, teléfono y departamento
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reporterName">Nombre del Reportante *</Label>
                  <Input
                    id="reporterName"
                    value={newCase.reporterName}
                    onChange={(e) => setNewCase({ ...newCase, reporterName: e.target.value })}
                    placeholder="Juan Pérez"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reporterEmail">Email *</Label>
                  <Input
                    id="reporterEmail"
                    type="email"
                    value={newCase.reporterEmail}
                    onChange={(e) => setNewCase({ ...newCase, reporterEmail: e.target.value })}
                    placeholder="juan@empresa.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reporterPhone">Teléfono</Label>
                <Input
                  id="reporterPhone"
                  value={newCase.reporterPhone}
                  onChange={(e) => setNewCase({ ...newCase, reporterPhone: e.target.value })}
                  placeholder="555-1234"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción *</Label>
                <Textarea
                  id="description"
                  value={newCase.description}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                  placeholder="Describe el caso en detalle..."
                  rows={4}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <LoadingButton 
                onClick={handleCreateCase} 
                loading={createCase.isPending}
                loadingText="Creando caso..."
              >
                Crear Caso
              </LoadingButton>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Casos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Casos Abiertos</p>
                <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-blue-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Investigación</p>
                <p className="text-2xl font-bold text-purple-600">{stats.investigating}</p>
              </div>
              <Search className="h-8 w-8 text-purple-600" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resueltos</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Buscar</Label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar casos..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="pl-8"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abierto</SelectItem>
                <SelectItem value="investigating">Investigando</SelectItem>
                <SelectItem value="resolved">Resuelto</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Prioridad</Label>
            <Select
              value={filters.priority}
              onValueChange={(value) => setFilters({ ...filters, priority: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Departamento</Label>
            <Select
              value={filters.departmentId}
              onValueChange={(value) => setFilters({ ...filters, departmentId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departments?.data?.map((dept: { id: number; name: string }) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Cases Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Folio</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Tipo</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Reportante</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Departamento</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Prioridad</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Fecha</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-0">
                    <TableSkeleton rows={5} columns={8} />
                  </td>
                </tr>
              ) : casesData?.cases?.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No se encontraron casos
                  </td>
                </tr>
              ) : (
                (casesData?.cases ?? (casesData as any)?.items)?.map((caso: any) => (
                  <tr key={caso.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm">{caso.folio}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{caso.caseType}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{caso.reporterName}</p>
                          <p className="text-xs text-muted-foreground">{caso.reporterEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{caso.departmentName || "N/A"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getPriorityColor(caso.priority)}>
                        {getPriorityLabel(caso.priority)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(caso.status)}>
                        {getStatusLabel(caso.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">
                        {new Date(caso.createdAt).toLocaleDateString('es-MX')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {!caso.assignedTo && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignCase(caso.id)}
                          >
                            Asignar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            // TODO: Implementar vista de detalle
                            toast.info("Vista de detalle próximamente");
                          }}
                        >
                          Ver Detalle
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination con componente reutilizable */}
        {casesData && casesData.pagination && (
          <div className="px-4">
            <Pagination
              pagination={casesData.pagination}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              showPageSizeSelector={true}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
