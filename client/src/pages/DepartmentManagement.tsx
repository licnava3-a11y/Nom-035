import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Edit, Trash2, Users, AlertCircle, UserCog, FileText, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function DepartmentManagement() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<any>(null);
  const [isReassignDialogOpen, setIsReassignDialogOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [reassignReason, setReassignReason] = useState("");
  const [targetDepartmentId, setTargetDepartmentId] = useState<number | "">("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
  });

  // Obtener lista de departamentos con paginación
  const { data: departmentsData, isLoading, refetch } = trpc.departments.list.useQuery({
    page,
    pageSize: 20,
    search: searchTerm || undefined,
    isActive: true,
  });

  const utils = trpc.useUtils();

  // Mutation para crear departamento
  const createMutation = trpc.departments.create.useMutation({
    onSuccess: async () => {
      await utils.departments.list.invalidate();
      setIsCreateDialogOpen(false);
      resetForm();
      alert("Departamento creado exitosamente");
    },
    onError: (error: any) => {
      alert(`Error al crear departamento: ${error.message}`);
    },
  });

  // Mutation para actualizar departamento
  const updateMutation = trpc.departments.update.useMutation({
    onSuccess: async () => {
      await utils.departments.list.invalidate();
      setIsEditDialogOpen(false);
      resetForm();
      setSelectedDepartment(null);
      alert("Departamento actualizado exitosamente");
    },
    onError: (error: any) => {
      alert(`Error al actualizar departamento: ${error.message}`);
    },
  });

  // Query para obtener historial de reasignaciones
  const [historyPage, setHistoryPage] = useState(1);
  const { data: reassignmentHistory, isLoading: historyLoading } = trpc.departments.getReassignmentHistory.useQuery({
    page: historyPage,
    pageSize: 10,
  });

  // Query para obtener lista de empleados
  const { data: employeesData } = trpc.employees.list.useQuery(
    { page: 1, pageSize: 1000 },
    { enabled: isReassignDialogOpen }
  );

  // Mutation para generar reporte PDF
   const exportAllMutation = trpc.departments.exportAll.useMutation({
    onSuccess: (data) => {
      // Descargar archivo Excel
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.data}`;
      link.download = data.filename;
      link.click();
      toast(`Exportación completada: ${data.departmentCount} departamentos, ${data.employeeCount} empleados`);
    },
    onError: (error) => {
      toast.error(error.message || 'Error al exportar datos');
    },
  });

  const generateReportMutation = trpc.reports.generateOrgStructurePDF.useMutation({
    onSuccess: (data) => {
      // Descargar PDF
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${data.data}`;
      link.download = data.filename;
      link.click();
      alert(`Reporte generado exitosamente: ${(data as any).totalDepartments} departamentos, ${(data as any).totalEmployees} empleados`);
    },
    onError: (error: any) => {
      alert(`Error al generar reporte: ${error.message}`);
    },
  });
  const handleGenerateReport = () => {
    generateReportMutation.mutate();
  };

  // Mutation para reasignación masiva
  const bulkReassignMutation = trpc.departments.bulkReassign.useMutation({
    onSuccess: async (result) => {
      await utils.departments.list.invalidate();
      setIsReassignDialogOpen(false);
      setSelectedEmployees([]);
      setTargetDepartmentId("");
      setReassignReason("");
      alert(
        `${result.reassignedCount} empleado(s) reasignado(s) exitosamente al departamento "${result.departmentName}"`
      );
    },
    onError: (error: any) => {
      alert(`Error al reasignar empleados: ${error.message}`);
    },
  });

  // Mutation para eliminar departamento
  const deleteMutation = trpc.departments.delete.useMutation({
    onSuccess: async () => {
      await utils.departments.list.invalidate();
      setIsDeleteDialogOpen(false);
      setSelectedDepartment(null);
      alert("Departamento eliminado exitosamente");
    },
    onError: (error: any) => {
      alert(`Error al eliminar departamento: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      description: "",
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      alert("El nombre y código del departamento son requeridos");
      return;
    }

    createMutation.mutate({
      name: formData.name.trim(),
      code: formData.code.trim(),
      description: formData.description.trim() || undefined,
    });
  };

  const handleEdit = (dept: any) => {
    setSelectedDepartment(dept);
    setFormData({
      name: dept.name,
      code: dept.code || "",
      description: dept.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedDepartment || !formData.name.trim()) {
      alert("El nombre del departamento es requerido");
      return;
    }

    updateMutation.mutate({
      id: selectedDepartment.id,
      name: formData.name.trim(),
      code: formData.code.trim() || undefined,
      description: formData.description.trim() || undefined,
    });
  };

  const handleDeleteClick = (dept: any) => {
    setDepartmentToDelete(dept);
    setDeleteConfirmOpen(true);
  }
  const handleDelete = () => {
    if (selectedDepartment) {
      deleteMutation.mutate({ id: selectedDepartment.id });
    }
  };;

  const confirmDelete = () => {
    if (!departmentToDelete) return;

    deleteMutation.mutate({
      id: departmentToDelete.id,
    });
  };

  const handleBulkReassign = () => {
    if (selectedEmployees.length === 0) {
      alert("Debe seleccionar al menos un empleado");
      return;
    }

    if (!targetDepartmentId) {
      alert("Debe seleccionar un departamento destino");
      return;
    }

    bulkReassignMutation.mutate({
      employeeIds: selectedEmployees,
      newDepartmentId: targetDepartmentId as number,
      reason: reassignReason.trim() || undefined,
    });
  };

  const toggleEmployeeSelection = (employeeId: number) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id: any) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Gestión de Departamentos</h1>
        <p className="text-muted-foreground mt-1">
          Administre los departamentos de la organización
        </p>
      </div>

      {/* Header con búsqueda y botón crear */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1">
              <Input
                placeholder="Buscar departamento por nombre..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="max-w-md"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsReassignDialogOpen(true)}
              >
                <UserCog className="mr-2 h-4 w-4" />
                Reasignación Masiva
              </Button>
              <Button
                variant="outline"
                onClick={handleGenerateReport}
                disabled={generateReportMutation.isPending}
              >
                <FileText className="mr-2 h-4 w-4" />
                {generateReportMutation.isPending ? "Generando..." : "Generar Reporte PDF"}
              </Button>
              <Button
                variant="outline"
                onClick={() => exportAllMutation.mutate()}
                disabled={exportAllMutation.isPending}
              >
                <FileText className="mr-2 h-4 w-4" />
                {exportAllMutation.isPending ? "Exportando..." : "Exportar Todo (Excel)"}
              </Button>
              <Button
                onClick={() => {
                  resetForm();
                  setIsCreateDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Departamento
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabla de departamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Departamentos Registrados</CardTitle>
          <CardDescription>
            {departmentsData?.pagination.total || 0} departamento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Cargando departamentos...</p>
            </div>
          ) : departmentsData && departmentsData.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-center">
                      <Users className="inline h-4 w-4 mr-1" />
                      Empleados
                    </TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(departmentsData as any)?.employees.map((dept: any) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-mono text-sm">
                        <Badge variant="outline">{dept.code || "N/A"}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {dept.description || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {dept.employeeCount || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(dept)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(dept)}
                            disabled={dept.employeeCount > 0}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Paginación */}
              {departmentsData.pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {departmentsData.pagination.page} de{" "}
                    {departmentsData.pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={page >= departmentsData.pagination.totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No se encontraron departamentos
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear departamento */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear Nuevo Departamento</DialogTitle>
            <DialogDescription>
              Complete la información del nuevo departamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="createName">
                Nombre del Departamento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="createName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Recursos Humanos"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="createCode">
                Código <span className="text-destructive">*</span>
              </Label>
              <Input
                id="createCode"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ej: RH"
                maxLength={10}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="createDescription">Descripción (opcional)</Label>
              <Textarea
                id="createDescription"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descripción del departamento..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <LoadingButton type="button"
              onClick={handleCreate}
              loading={createMutation.isPending} loadingText="Creando..."
            >Crear Departamento</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para editar departamento */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Departamento</DialogTitle>
            <DialogDescription>
              Actualice la información del departamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">
                Nombre del Departamento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="editName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Recursos Humanos"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editCode">Código</Label>
              <Input
                id="editCode"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="Ej: RH"
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="editDescription">Descripción (opcional)</Label>
              <Textarea
                id="editDescription"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Descripción del departamento..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                resetForm();
                setSelectedDepartment(null);
              }}
            >
              Cancelar
            </Button>
            <LoadingButton type="button"
              onClick={handleUpdate}
              loading={updateMutation.isPending} loadingText="Actualizando..."
            >Actualizar</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para confirmar eliminación */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea eliminar el departamento "
              {selectedDepartment?.name}"?
            </DialogDescription>
          </DialogHeader>

          {selectedDepartment && selectedDepartment.employeeCount > 0 ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <p className="font-semibold text-destructive">
                  No se puede eliminar este departamento
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Este departamento tiene {selectedDepartment.employeeCount} empleado(s)
                  asignado(s). Primero debe reasignar o eliminar a todos los empleados.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Esta acción no se puede deshacer. El departamento será eliminado
              permanentemente.
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setSelectedDepartment(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={
                deleteMutation.isPending ||
                (selectedDepartment && selectedDepartment.employeeCount > 0)
              }
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

        {/* Historial de Reasignaciones Masivas */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Historial de Reasignaciones Masivas</CardTitle>
          <CardDescription>
            Registro de todas las reasignaciones masivas de empleados entre departamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : reassignmentHistory && reassignmentHistory.reassignments.length > 0 ? (
            <>
              <div className="space-y-4">
                {reassignmentHistory.reassignments.map((reassignment: any) => (
                  <div key={reassignment.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">
                            {reassignment.sourceDepartmentName || 'Varios departamentos'} →{' '}
                            {reassignment.targetDepartmentName}
                          </h4>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                            {reassignment.employeeCount} empleado(s)
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            <strong>Realizado por:</strong> {reassignment.performedByName}
                          </p>
                          <p>
                            <strong>Fecha:</strong>{' '}
                            {new Date(reassignment.createdAt).toLocaleString('es-MX')}
                          </p>
                          {reassignment.reason && (
                            <p>
                              <strong>Motivo:</strong> {reassignment.reason}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {reassignment.affectedEmployees && reassignment.affectedEmployees.length > 0 && (
                      <details className="mt-3">
                        <summary className="cursor-pointer text-sm font-medium text-primary hover:underline">
                          Ver empleados afectados ({reassignment.affectedEmployees.length})
                        </summary>
                        <div className="mt-2 pl-4 space-y-1">
                          {reassignment.affectedEmployees.map((emp: any) => (
                            <div key={emp.id} className="text-sm text-muted-foreground">
                              • {emp.employeeName} {emp.employeeEmail && `(${emp.employeeEmail})`}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>

              {/* Paginación */}
              {reassignmentHistory.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Página {reassignmentHistory.page} de {reassignmentHistory.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((prev) => Math.max(1, prev - 1))}
                      disabled={historyPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setHistoryPage((prev) => prev + 1)}
                      disabled={historyPage >= reassignmentHistory.totalPages}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay reasignaciones masivas registradas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Reasignación Masiva */}
      <Dialog open={isReassignDialogOpen} onOpenChange={setIsReassignDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reasignación Masiva de Empleados</DialogTitle>
            <DialogDescription>
              Seleccione los empleados y el departamento destino para la reasignación
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Selector de departamento destino */}
            <div className="space-y-2">
              <Label htmlFor="targetDept">
                Departamento Destino <span className="text-destructive">*</span>
              </Label>
              <select
                id="targetDept"
                value={targetDepartmentId}
                onChange={(e) =>
                  setTargetDepartmentId(e.target.value ? parseInt(e.target.value) : "")
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Seleccionar departamento</option>
                {(departmentsData as any)?.employees.map((dept: any) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Motivo/Razón */}
            <div className="space-y-2">
              <Label htmlFor="reassignReason">Motivo (opcional)</Label>
              <Textarea
                id="reassignReason"
                value={reassignReason}
                onChange={(e) => setReassignReason(e.target.value)}
                placeholder="Ej: Reestructuración organizacional, cambio de proyecto..."
                rows={2}
              />
            </div>

            {/* Lista de empleados con checkboxes */}
            <div className="space-y-2">
              <Label>
                Seleccionar Empleados <span className="text-destructive">*</span>
              </Label>
              <div className="border rounded-md p-4 max-h-64 overflow-y-auto">
                {employeesData && (employeesData as any)?.data.length > 0 ? (
                  <div className="space-y-2">
                    {employeesData.employees.map((emp: any) => (
                      <label
                        key={emp.id}
                        className="flex items-center gap-3 p-2 hover:bg-accent rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp.id)}
                          onChange={() => toggleEmployeeSelection(emp.id)}
                          className="h-4 w-4"
                        />
                        <div className="flex-1">
                          <p className="font-medium">
                            {emp.firstName} {emp.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {emp.email} - {emp.departmentName || "Sin departamento"}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay empleados disponibles
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedEmployees.length} empleado(s) seleccionado(s)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsReassignDialogOpen(false);
                setSelectedEmployees([]);
                setTargetDepartmentId("");
                setReassignReason("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleBulkReassign}
              disabled={
                bulkReassignMutation.isPending ||
                selectedEmployees.length === 0 ||
                !targetDepartmentId
              }
            >
              {bulkReassignMutation.isPending
                ? "Reasignando..."
                : `Reasignar ${selectedEmployees.length} Empleado(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog para Eliminar */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="¿Eliminar departamento?"
        description="Esta acción no se puede deshacer. El departamento será eliminado permanentemente."
        impactMessage={departmentToDelete ? `Se eliminarán ${departmentToDelete.employeeCount || 0} empleados asignados y sus relaciones jerárquicas` : ""}
        variant="destructive"
        confirmText="Eliminar"
      />
    </div>
  );
}
