import { useState } from "react";
import { TableSkeleton } from "@/components/TableSkeleton";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Search, FileText, User, AlertCircle, CheckCircle, Clock, UserCheck, Eye, Sparkles } from "lucide-react";
import { DateRangeFilter, type DateRange } from "@/components/DateRangeFilter";
import { startOfDay, endOfDay } from "date-fns";
import { Pagination } from "@/components/Pagination";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CaseAIAssistant } from "@/components/CaseAIAssistant";
import { Separator } from "@/components/ui/separator";

// ─── Modal de Detalle de Caso ─────────────────────────────────────────────────
function CaseDetailModal({ caseId, onClose }: { caseId: number; onClose: () => void }) {
  const { data: caseData, isLoading } = trpc.casesManagement.getCaseById.useQuery({ id: caseId });
  const utils = trpc.useUtils();

  const [editFields, setEditFields] = useState<{
    rootCause: string;
    actionPlan: string;
    resolution: string;
    status?: string;
  } | null>(null);

  // Inicializar editFields cuando llegan los datos
  const fields = editFields ?? {
    rootCause: caseData?.rootCause ?? "",
    actionPlan: caseData?.actionPlan ?? "",
    resolution: caseData?.resolution ?? "",
    status: caseData?.status ?? "open",
  };

  const updateCase = trpc.casesManagement.updateCase.useMutation({
    onSuccess: () => {
      toast.success("Caso actualizado exitosamente");
      utils.casesManagement.getCaseById.invalidate({ id: caseId });
      utils.casesManagement.listCases.invalidate();
      utils.casesManagement.getCasesStats.invalidate();
      setEditFields(null);
    },
    onError: (e) => toast.error("Error al actualizar: " + e.message),
  });

  const handleSave = () => {
    updateCase.mutate({
      id: caseId,
      rootCause: fields.rootCause,
      actionPlan: fields.actionPlan,
      resolution: fields.resolution,
      status: fields.status as "open" | "investigating" | "resolved" | "closed",
    });
  };

  const setField = (key: keyof typeof fields, value: string) => {
    setEditFields((prev) => ({
      ...(prev ?? {
        rootCause: caseData?.rootCause ?? "",
        actionPlan: caseData?.actionPlan ?? "",
        resolution: caseData?.resolution ?? "",
        status: caseData?.status ?? "open",
      }),
      [key]: value,
    }));
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
    const labels: Record<string, string> = { open: "Abierto", investigating: "Investigando", resolved: "Resuelto", closed: "Cerrado" };
    return labels[status] || status;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!caseData) return <p className="text-center text-muted-foreground py-8">Caso no encontrado</p>;

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground font-mono">{caseData.caseNumber}</p>
          <h3 className="font-semibold text-lg capitalize">{caseData.caseType} — {caseData.reporterName}</h3>
          <p className="text-sm text-muted-foreground">{caseData.reporterEmail}</p>
        </div>
        <Badge className={getStatusColor(caseData.status)}>{getStatusLabel(caseData.status)}</Badge>
      </div>

      <Separator />

      {/* Descripción (solo lectura) */}
      <div>
        <Label className="text-sm font-semibold">Descripción del caso</Label>
        <p className="mt-1 text-sm text-muted-foreground bg-muted/40 rounded-md p-3 leading-relaxed">
          {caseData.description || "Sin descripción"}
        </p>
      </div>

      <Separator />

      {/* Causa Raíz — con IA */}
      <div className="space-y-2">
        <Label htmlFor="rootCause" className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Causa Raíz
        </Label>
        <Textarea
          id="rootCause"
          value={fields.rootCause}
          onChange={(e) => setField("rootCause", e.target.value)}
          placeholder="Describe la causa raíz identificada del problema..."
          rows={3}
        />
        <CaseAIAssistant
          fieldType="rootCause"
          currentValue={fields.rootCause}
          caseType={caseData.caseType}
          context={caseData.description}
          onApply={(text) => setField("rootCause", text)}
        />
      </div>

      {/* Plan de Acción — con IA */}
      <div className="space-y-2">
        <Label htmlFor="actionPlan" className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Plan de Acción Correctiva
        </Label>
        <Textarea
          id="actionPlan"
          value={fields.actionPlan}
          onChange={(e) => setField("actionPlan", e.target.value)}
          placeholder="Describe las acciones correctivas y preventivas a implementar..."
          rows={3}
        />
        <CaseAIAssistant
          fieldType="actionPlan"
          currentValue={fields.actionPlan}
          caseType={caseData.caseType}
          context={`${caseData.description} Causa raíz: ${fields.rootCause}`}
          onApply={(text) => setField("actionPlan", text)}
        />
      </div>

      {/* Resolución — con IA */}
      <div className="space-y-2">
        <Label htmlFor="resolution" className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Resolución Final
        </Label>
        <Textarea
          id="resolution"
          value={fields.resolution}
          onChange={(e) => setField("resolution", e.target.value)}
          placeholder="Describe la resolución y acciones tomadas para cerrar el caso..."
          rows={3}
        />
        <CaseAIAssistant
          fieldType="resolution"
          currentValue={fields.resolution}
          caseType={caseData.caseType}
          context={`${caseData.description} Plan de acción: ${fields.actionPlan}`}
          onApply={(text) => setField("resolution", text)}
        />
      </div>

      {/* Cambio de estado */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Estado del caso</Label>
        <Select value={fields.status} onValueChange={(v) => setField("status", v)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Abierto</SelectItem>
            <SelectItem value="investigating">Investigando</SelectItem>
            <SelectItem value="resolved">Resuelto</SelectItem>
            <SelectItem value="closed">Cerrado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Acciones */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cerrar</Button>
        <LoadingButton
          onClick={handleSave}
          loading={updateCase.isPending}
          loadingText="Guardando..."
        >
          Guardar cambios
        </LoadingButton>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function CasesManagement() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState({
    departmentId: "",
    status: "",
    priority: "",
    search: ""
  });
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [detailCaseId, setDetailCaseId] = useState<number | null>(null);
  const [newCase, setNewCase] = useState({
    caseType: "mobbing" as const,
    priority: "medium" as const,
    departmentId: "",
    reporterName: "",
    reporterEmail: "",
    reporterPhone: "",
    description: "",
    reporterEmployeeId: ""
  });

  const utils = trpc.useUtils();

  // Queries
  const { data: casesData, isLoading } = trpc.casesPaginated.listPaginated.useQuery({
    page,
    pageSize,
    status: filters.status && filters.status !== "all" ? filters.status as "open" | "investigating" | "resolved" | "closed" : undefined,
    priority: filters.priority && filters.priority !== "all" ? filters.priority as "low" | "medium" | "high" | "critical" : undefined,
    departmentId: filters.departmentId && filters.departmentId !== "all" ? parseInt(filters.departmentId) : undefined,
    search: filters.search || undefined,
    dateFrom: dateRange?.from ? startOfDay(dateRange.from).toISOString().split("T")[0] : undefined,
    dateTo: dateRange?.to ? endOfDay(dateRange.to).toISOString().split("T")[0] : undefined,
  });

  const { data: departments } = trpc.departments.list.useQuery({ page: 1, pageSize: 100 });
  const { data: stats } = trpc.casesManagement.getCasesStats.useQuery();
  const { data: employeesRaw } = trpc.employees.list.useQuery({ isActive: true });
  const employeesData = { employees: employeesRaw?.employees ?? [] };

  // Mutations
  const createCase = trpc.casesManagement.createCase.useMutation({
    onSuccess: () => {
      toast.success("Caso creado exitosamente");
      setIsCreateDialogOpen(false);
      setNewCase({ caseType: "mobbing", priority: "medium", departmentId: "", reporterName: "", reporterEmail: "", reporterPhone: "", description: "", reporterEmployeeId: "" });
      utils.casesManagement.listCases.invalidate();
      utils.casesManagement.getCasesStats.invalidate();
    },
    onError: (error) => toast.error(`Error al crear caso: ${error.message}`)
  });

  const assignCase = trpc.casesManagement.assignCase.useMutation({
    onSuccess: () => {
      toast.success("Caso asignado exitosamente");
      utils.casesManagement.listCases.invalidate();
    },
    onError: (error) => toast.error(`Error al asignar caso: ${error.message}`)
  });

  const handleCreateCase = () => {
    if (!newCase.reporterName || !newCase.reporterEmail || !newCase.description || !newCase.departmentId) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }
    createCase.mutate({ ...newCase, departmentId: parseInt(newCase.departmentId) });
  };

  const handleAssignCase = (caseId: number) => {
    assignCase.mutate({ caseId, assignedTo: 1 });
  };

  const handleEmployeeSelect = (employeeId: string) => {
    if (employeeId === "manual" || !employeeId) {
      setNewCase(prev => ({ ...prev, reporterEmployeeId: "", reporterName: "", reporterEmail: "", reporterPhone: "", departmentId: "" }));
      return;
    }
    const employee = employeesData?.employees?.find((emp: any) => emp.id.toString() === employeeId);
    if (employee) {
      setNewCase(prev => ({
        ...prev,
        reporterEmployeeId: employeeId,
        reporterName: `${employee.firstName} ${employee.lastName}`,
        reporterEmail: employee.email || "",
        reporterPhone: employee.phone || "",
        departmentId: employee.departmentId?.toString() || prev.departmentId
      }));
      toast.success("Datos del empleado prellenados automáticamente");
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
    const labels: Record<string, string> = { open: "Abierto", investigating: "Investigando", resolved: "Resuelto", closed: "Cerrado" };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = { critical: "Crítica", high: "Alta", medium: "Media", low: "Baja" };
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

        {/* Modal Crear Caso */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nuevo Caso</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Caso</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Caso *</Label>
                  <Select value={newCase.caseType} onValueChange={(value: any) => setNewCase({ ...newCase, caseType: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mobbing">Mobbing</SelectItem>
                      <SelectItem value="burnout">Burnout</SelectItem>
                      <SelectItem value="violence">Violencia</SelectItem>
                      <SelectItem value="stress">Estrés laboral</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridad *</Label>
                  <Select value={newCase.priority} onValueChange={(value: any) => setNewCase({ ...newCase, priority: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>Departamento *</Label>
                <Select value={newCase.departmentId} onValueChange={(value) => setNewCase({ ...newCase, departmentId: value })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona un departamento" /></SelectTrigger>
                  <SelectContent>
                    {departments?.data?.map((dept: { id: number; name: string }) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Selector de empleado con prellenado */}
              <div className="space-y-2">
                <Label>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-muted-foreground" />
                    Seleccionar Empleado (Prellenado Automático)
                  </div>
                </Label>
                <Select value={newCase.reporterEmployeeId} onValueChange={handleEmployeeSelect}>
                  <SelectTrigger><SelectValue placeholder="Buscar empleado existente..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">— Captura manual —</SelectItem>
                    {employeesData?.employees?.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.firstName} {emp.lastName} — {emp.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Al seleccionar un empleado se prellenan nombre, email, teléfono y departamento</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre del Reportante *</Label>
                  <Input value={newCase.reporterName} onChange={(e) => setNewCase({ ...newCase, reporterName: e.target.value })} placeholder="Juan Pérez" />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input type="email" value={newCase.reporterEmail} onChange={(e) => setNewCase({ ...newCase, reporterEmail: e.target.value })} placeholder="juan@empresa.com" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={newCase.reporterPhone} onChange={(e) => setNewCase({ ...newCase, reporterPhone: e.target.value })} placeholder="555-1234" />
              </div>

              <div className="space-y-2">
                <Label>Descripción *</Label>
                <Textarea
                  value={newCase.description}
                  onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                  placeholder="Describe el caso en detalle..."
                  rows={4}
                />
                <CaseAIAssistant
                  fieldType="description"
                  currentValue={newCase.description}
                  caseType={newCase.caseType}
                  onApply={(text) => setNewCase({ ...newCase, description: text })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancelar</Button>
                <LoadingButton onClick={handleCreateCase} loading={createCase.isPending} loadingText="Creando caso...">
                  Crear Caso
                </LoadingButton>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Detalle de Caso */}
        <Dialog open={detailCaseId !== null} onOpenChange={(open) => { if (!open) setDetailCaseId(null); }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Detalle del Caso
              </DialogTitle>
            </DialogHeader>
            {detailCaseId !== null && (
              <CaseDetailModal caseId={detailCaseId} onClose={() => setDetailCaseId(null)} />
            )}
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
              <Clock className="h-8 w-8 text-purple-600" />
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

      {/* Filtros */}
      <Card className="p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <Label className="text-xs mb-1 block">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Folio, nombre, descripción..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
          <div className="w-40">
            <Label className="text-xs mb-1 block">Estado</Label>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="open">Abierto</SelectItem>
                <SelectItem value="investigating">Investigando</SelectItem>
                <SelectItem value="resolved">Resuelto</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Label className="text-xs mb-1 block">Prioridad</Label>
            <Select value={filters.priority || "all"} onValueChange={(v) => setFilters({ ...filters, priority: v === "all" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-48">
            <Label className="text-xs mb-1 block">Departamento</Label>
            <Select value={filters.departmentId || "all"} onValueChange={(v) => setFilters({ ...filters, departmentId: v === "all" ? "" : v })}>
              <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departments?.data?.map((dept: { id: number; name: string }) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs mb-1 block">Rango de fechas</Label>
            <DateRangeFilter value={dateRange} onChange={setDateRange} />
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
                      <span className="font-mono text-sm">{caso.folio || caso.caseNumber}</span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize">{caso.caseType}</Badge>
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
                      <Badge className={getPriorityColor(caso.priority)}>{getPriorityLabel(caso.priority)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={getStatusColor(caso.status)}>{getStatusLabel(caso.status)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{new Date(caso.createdAt).toLocaleDateString('es-MX')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {!caso.assignedTo && (
                          <Button size="sm" variant="outline" onClick={() => handleAssignCase(caso.id)}>
                            Asignar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDetailCaseId(caso.id)}
                          className="gap-1"
                        >
                          <Eye className="h-3 w-3" />
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
