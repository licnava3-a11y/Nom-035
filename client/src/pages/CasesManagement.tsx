import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, Filter, FileText, User, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export default function CasesManagement() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    departmentId: "",
    status: "",
    priority: "",
    search: ""
  });
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCase, setNewCase] = useState({
    caseType: "harassment" as const,
    priority: "medium" as const,
    departmentId: "",
    reporterName: "",
    reporterEmail: "",
    reporterPhone: "",
    description: ""
  });

  const utils = trpc.useUtils();
  
  // Queries
  const { data: casesData, isLoading } = trpc.casesManagement.listCases.useQuery({
    page,
    pageSize: 20,
    ...filters
  });

  const { data: departments } = trpc.departments.list.useQuery();
  const { data: stats } = trpc.casesManagement.getCasesStats.useQuery();

  // Mutations
  const createCase = trpc.casesManagement.createCase.useMutation({
    onSuccess: () => {
      toast.success("Caso creado exitosamente");
      setIsCreateDialogOpen(false);
      setNewCase({
        caseType: "harassment",
        priority: "medium",
        departmentId: "",
        reporterName: "",
        reporterEmail: "",
        reporterPhone: "",
        description: ""
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

    createCase.mutate(newCase);
  };

  const handleAssignCase = (caseId: number) => {
    assignCase.mutate({ caseId });
  };

  const handleUpdateStatus = (caseId: number, status: "open" | "investigating" | "resolved" | "closed") => {
    updateCase.mutate({ caseId, status });
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

  const getCaseTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      harassment: "Acoso",
      violence: "Violencia",
      discrimination: "Discriminación",
      stress: "Estrés",
      other: "Otro"
    };
    return labels[type] || type;
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Casos</h1>
          <p className="text-muted-foreground">Administra y da seguimiento a casos de riesgos psicosociales</p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Crear Caso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Caso</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
                      <SelectItem value="harassment">Acoso</SelectItem>
                      <SelectItem value="violence">Violencia</SelectItem>
                      <SelectItem value="discrimination">Discriminación</SelectItem>
                      <SelectItem value="stress">Estrés</SelectItem>
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
                    {departments?.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              <Button onClick={handleCreateCase} disabled={createCase.isPending}>
                {createCase.isPending ? "Creando..." : "Crear Caso"}
              </Button>
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
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Casos Abiertos</p>
                <p className="text-2xl font-bold">{stats.open}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">En Investigación</p>
                <p className="text-2xl font-bold">{stats.investigating}</p>
              </div>
              <Clock className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resueltos</p>
                <p className="text-2xl font-bold">{stats.resolved}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4" />
          <h3 className="font-semibold">Filtros</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por folio, nombre..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10"
            />
          </div>

          <Select
            value={filters.departmentId}
            onValueChange={(value) => setFilters({ ...filters, departmentId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los departamentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {departments?.map((dept) => (
                <SelectItem key={dept.id} value={dept.id.toString()}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status}
            onValueChange={(value) => setFilters({ ...filters, status: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="open">Abierto</SelectItem>
              <SelectItem value="investigating">Investigando</SelectItem>
              <SelectItem value="resolved">Resuelto</SelectItem>
              <SelectItem value="closed">Cerrado</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={filters.priority}
            onValueChange={(value) => setFilters({ ...filters, priority: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todas las prioridades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todas</SelectItem>
              <SelectItem value="critical">Crítica</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Media</SelectItem>
              <SelectItem value="low">Baja</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Cases Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold">Folio</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Tipo</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Prioridad</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Estado</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Departamento</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Reportante</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Fecha</th>
                <th className="px-4 py-3 text-left text-sm font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    Cargando casos...
                  </td>
                </tr>
              ) : casesData?.cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                    No se encontraron casos
                  </td>
                </tr>
              ) : (
                casesData?.cases.map((caso) => (
                  <tr key={caso.id} className="border-b hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm font-mono">{caso.folio}</td>
                    <td className="px-4 py-3 text-sm">{getCaseTypeLabel(caso.caseType)}</td>
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
                    <td className="px-4 py-3 text-sm">{caso.departmentName || "N/A"}</td>
                    <td className="px-4 py-3 text-sm">{caso.reporterName}</td>
                    <td className="px-4 py-3 text-sm">
                      {new Date(caso.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {!caso.assignedTo && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignCase(caso.id)}
                            disabled={assignCase.isPending}
                          >
                            <User className="h-3 w-3 mr-1" />
                            Asignar
                          </Button>
                        )}
                        {caso.status === "open" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(caso.id, "investigating")}
                            disabled={updateCase.isPending}
                          >
                            Investigar
                          </Button>
                        )}
                        {caso.status === "investigating" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(caso.id, "resolved")}
                            disabled={updateCase.isPending}
                          >
                            Resolver
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {casesData && casesData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <div className="text-sm text-muted-foreground">
              Página {page} de {casesData.pagination.totalPages} ({casesData.pagination.total} casos en total)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === casesData.pagination.totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
