import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, Plus, Eye, Edit, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import ProtectedButton from "@/components/ProtectedButton";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DateRangeFilter, DateRange } from "@/components/DateRangeFilter";
import { CaseDialog } from "@/components/CaseDialog";
import { CaseFollowUpDialog } from "@/components/CaseFollowUpDialog";
import { Breadcrumb } from "@/components/Breadcrumb";
import { TableSkeleton } from "@/components/TableSkeleton";

export default function Cases() {
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const ITEMS_PER_PAGE = 20;
  
  const exportMutation = trpc.cases.exportToExcel.useMutation();
  const autoAssignMutation = trpc.cases.autoAssign.useMutation();
  const utils = trpc.useUtils();
  
  // Preparar filtros para query server-side
  const queryParams = useMemo(() => {
    const params: any = {
      page: currentPage,
      pageSize: ITEMS_PER_PAGE,
    };
    
    if (dateRange) {
      params.startDate = dateRange.from.toISOString();
      params.endDate = dateRange.to.toISOString();
    }
    
    if (filterType !== "all") {
      params.caseType = filterType as any;
    }
    
    if (filterPriority !== "all") {
      params.priority = filterPriority as any;
    }
    
    if (filterStatus !== "all") {
      params.status = filterStatus as any;
    }
    
    if (searchTerm.trim()) {
      params.search = searchTerm.trim();
    }
    
    return params;
  }, [dateRange, currentPage, filterType, filterPriority, filterStatus, searchTerm]);
  
  const { data: casesResponse, isLoading } = trpc.cases.list.useQuery(queryParams, {
    enabled: user?.role === "admin" || user?.role === "committee",
  });
  
  const cases = casesResponse?.cases || [];
  const totalCount = casesResponse?.totalCount || 0;
  const totalPages = casesResponse?.totalPages || 1;

  const clearFilters = () => {
    setFilterType("all");
    setFilterPriority("all");
    setFilterStatus("all");
    setSearchTerm("");
    setDateRange(undefined);
    setCurrentPage(1);
  };

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      
      // Preparar filtros para exportación (sin page/pageSize)
      const exportParams: any = {};
      if (dateRange) {
        exportParams.startDate = dateRange.from.toISOString();
        exportParams.endDate = dateRange.to.toISOString();
      }
      if (filterType !== "all") exportParams.caseType = filterType as any;
      if (filterPriority !== "all") exportParams.priority = filterPriority as any;
      if (filterStatus !== "all") exportParams.status = filterStatus as any;
      if (searchTerm.trim()) exportParams.search = searchTerm.trim();
      
      const result = await exportMutation.mutateAsync(exportParams);
      
      // Download file
      const blob = new Blob(
        [Uint8Array.from(atob(result.data), c => c.charCodeAt(0))],
        { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Show success toast (if available)
      console.log(`Exportados ${result.totalRecords} casos a Excel`);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar casos a Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleEditCase = (caseData: any) => {
    setSelectedCase(caseData);
    setEditDialogOpen(true);
  };

  const handleAddFollowUp = (caseData: any) => {
    setSelectedCase(caseData);
    setFollowUpDialogOpen(true);
  };

  const handleAutoAssign = async (caseId: number) => {
    try {
      const result = await autoAssignMutation.mutateAsync({ caseId });
      
      // Invalidar query para refrescar lista
      await utils.cases.list.invalidate();
      
      // Mostrar mensaje de éxito
      alert(`Caso asignado automáticamente a ${result.assignedTo.name} (${result.assignedTo.workload} casos activos)`);
    } catch (error: any) {
      console.error('Error al asignar automáticamente:', error);
      alert(error.message || 'Error al asignar caso automáticamente');
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: "Abierto",
      investigating: "En Investigación",
      resolved: "Resuelto",
      closed: "Cerrado",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-red-100 text-red-800",
      investigating: "bg-yellow-100 text-yellow-800",
      resolved: "bg-green-100 text-green-800",
      closed: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: "Baja",
      medium: "Media",
      high: "Alta",
      critical: "Crítica",
    };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  const getCaseTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mobbing: "Mobbing",
      burnout: "Burnout",
      violence: "Violencia Laboral",
      stress: "Estrés Laboral",
      other: "Otro",
    };
    return labels[type] || type;
  };

  if (user?.role !== "admin" && user?.role !== "committee") {
    return (
      <div className="space-y-6">
      <Breadcrumb items={[
        {
                label: "Prevención de Riesgos Psicosociales",
                href: "/"
        },
        {
                label: "Casos"
        }
]} />

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acceso Restringido</h3>
            <p className="text-sm text-muted-foreground text-center">
              Solo los miembros del comité y administradores pueden acceder a esta sección.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[
          { label: "Prevención de Riesgos Psicosociales", href: "/" },
          { label: "Casos" }
        ]} />
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Casos</h1>
            <p className="text-muted-foreground mt-2">Seguimiento de casos psicosociales</p>
          </div>
        </div>
        <TableSkeleton rows={8} columns={7} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Casos</h1>
          <p className="text-muted-foreground mt-2">
            Seguimiento y atención de casos de riesgo psicosocial
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={isExporting}
          >
            <FileText className="h-4 w-4 mr-2" />
            {isExporting ? 'Exportando...' : 'Exportar Excel'}
          </Button>
          <ProtectedButton
            onClick={() => setCreateDialogOpen(true)}
            requiredPermission="can_create"
            fallbackMessage="Solo los administradores pueden registrar casos"
            hideIfNoPermission
          >
            <Plus className="h-4 w-4 mr-2" />
            Registrar Caso
          </ProtectedButton>
        </div>
      </div>

      {/* Filtros Avanzados */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Filtro de Fecha */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Rango de Fechas</label>
              <DateRangeFilter
                value={dateRange}
                onChange={(range) => { setDateRange(range); setCurrentPage(1); }}
              />
            </div>
            
            {/* Otros Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">Buscar</label>
                <input
                  type="text"
                  placeholder="Buscar por folio, descripción, reportante..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Caso</label>
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="all">Todos</option>
                <option value="mobbing">Mobbing</option>
                <option value="burnout">Burnout</option>
                <option value="violence">Violencia Laboral</option>
                <option value="stress">Estrés Laboral</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridad</label>
              <select
                value={filterPriority}
                onChange={(e) => { setFilterPriority(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="all">Todas</option>
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="critical">Crítica</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="all">Todos</option>
                <option value="open">Abierto</option>
                <option value="investigating">En Investigación</option>
                <option value="resolved">Resuelto</option>
                <option value="closed">Cerrado</option>
              </select>
            </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Casos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Página Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {cases.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">de {totalCount} totales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Filtros Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {[filterType !== "all", filterPriority !== "all", filterStatus !== "all"].filter(Boolean).length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">aplicados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Páginas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {currentPage} / {totalPages}
            </div>
            <p className="text-xs text-muted-foreground mt-1">navegación</p>
          </CardContent>
        </Card>
      </div>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Casos Registrados</CardTitle>
          <CardDescription>Listado completo de casos de riesgo psicosocial</CardDescription>
        </CardHeader>
        <CardContent>
          {cases && cases.length > 0 ? (
            <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell className="font-medium">{caseItem.caseNumber}</TableCell>
                    <TableCell>{getCaseTypeLabel(caseItem.caseType)}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(caseItem.priority)}>
                        {getPriorityLabel(caseItem.priority)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(caseItem.status)}>
                        {getStatusLabel(caseItem.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(caseItem.createdAt), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Link href={`/cases/${caseItem.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalle
                          </Button>
                        </Link>
                        <ProtectedButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCase(caseItem)}
                          requiredPermission="can_edit"
                          fallbackMessage="Solo los administradores pueden editar casos"
                          hideIfNoPermission
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </ProtectedButton>
                        <ProtectedButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddFollowUp(caseItem)}
                          requiredPermission="can_edit"
                          fallbackMessage="Solo los administradores pueden agregar seguimiento"
                          hideIfNoPermission
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Seguimiento
                        </ProtectedButton>
                        {!caseItem.assignedTo && (
                          <ProtectedButton
                            variant="default"
                            size="sm"
                            onClick={() => handleAutoAssign(caseItem.id)}
                            requiredPermission="can_edit"
                            fallbackMessage="Solo los administradores pueden asignar casos"
                            hideIfNoPermission
                          >
                            Asignar Auto
                          </ProtectedButton>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-2 py-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Mostrando {(currentPage - 1) * ITEMS_PER_PAGE + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount} casos
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <div className="text-sm font-medium">
                    Página {currentPage} de {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay casos registrados</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Aún no se han reportado casos de riesgo psicosocial.
              </p>
              <ProtectedButton
                onClick={() => setCreateDialogOpen(true)}
                requiredPermission="can_create"
                fallbackMessage="Solo los administradores pueden registrar casos"
                hideIfNoPermission
              >
                <Plus className="h-4 w-4 mr-2" />
                Registrar Primer Caso
              </ProtectedButton>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CaseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
        }}
      />

      <CaseDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        caseData={selectedCase}
        onSuccess={() => {
          setEditDialogOpen(false);
          setSelectedCase(null);
        }}
      />

      <CaseFollowUpDialog
        open={followUpDialogOpen}
        onOpenChange={setFollowUpDialogOpen}
        caseId={selectedCase?.id || 0}
        onSuccess={() => {
          setFollowUpDialogOpen(false);
          setSelectedCase(null);
        }}
      />
    </div>
  );
}
