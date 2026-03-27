import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Users, Network } from "lucide-react";
import ProtectedButton from "@/components/ProtectedButton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export default function Departments() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDepartment, setSelectedDepartment] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    code: "",
    parentId: null as number | null,
  });

  const { data, isLoading, refetch } = trpc.departments.list.useQuery({
    page,
    pageSize: 10,
    search: search || undefined,
  });

  const createMutation = trpc.departments.create.useMutation({
    onSuccess: () => {
      toast.success("Departamento creado exitosamente");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al crear departamento");
    },
  });

  const updateMutation = trpc.departments.update.useMutation({
    onSuccess: () => {
      toast.success("Departamento actualizado exitosamente");
      setIsEditOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar departamento");
    },
  });

  const deleteMutation = trpc.departments.delete.useMutation({
    onSuccess: () => {
      toast.success("Departamento eliminado exitosamente");
      setIsDeleteOpen(false);
      setSelectedDepartment(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar departamento");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", description: "", code: "", parentId: null });
    setSelectedDepartment(null);
  };

  const handleCreate = () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("El nombre y código son obligatorios");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (department: any) => {
    setSelectedDepartment(department);
    setFormData({
      name: department.name,
      description: department.description || "",
      code: department.code,
      parentId: department.parentId || null,
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error("El nombre y código son obligatorios");
      return;
    }
    updateMutation.mutate({
      id: selectedDepartment.id,
      ...formData,
    });
  };

  const handleDelete = (department: any) => {
    setSelectedDepartment(department);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedDepartment) {
      deleteMutation.mutate({ id: selectedDepartment.id });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Departamentos</h1>
          <p className="text-muted-foreground">
            Gestión de departamentos organizacionales
          </p>
        </div>
        <ProtectedButton
          onClick={() => setIsCreateOpen(true)}
          requiredPermission="can_create"
          fallbackMessage="Solo los administradores pueden crear departamentos"
          hideIfNoPermission
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Departamento
        </ProtectedButton>
      </div>

      {/* Búsqueda */}
      <div className="mb-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar departamentos..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg">
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
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No se encontraron departamentos
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((dept: any) => (
                <TableRow key={dept.id}>
                  <TableCell className="font-mono">{dept.code}</TableCell>
                  <TableCell className="font-medium">{dept.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {dept.description || "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {dept.employeeCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <ProtectedButton
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(dept)}
                      requiredPermission="can_edit"
                      fallbackMessage="Solo los administradores pueden editar departamentos"
                      hideIfNoPermission
                    >
                      <Pencil className="h-4 w-4" />
                    </ProtectedButton>
                    <ProtectedButton
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(dept)}
                      requiredPermission="can_delete"
                      fallbackMessage="Solo los administradores pueden eliminar departamentos"
                      hideIfNoPermission
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </ProtectedButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4">
            Página {page} de {data.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= data.pagination.totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Diálogo Crear */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Departamento</DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo departamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                placeholder="Ej: RRHH"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                placeholder="Ej: Recursos Humanos"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción del departamento"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="parentId">
                <Network className="inline h-4 w-4 mr-1" />
                Departamento Padre (opcional)
              </Label>
              <Select
                value={formData.parentId?.toString() || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parentId: value === "none" ? null : parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin departamento padre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin departamento padre (Raíz)</SelectItem>
                  {data?.data
                    .filter((d: any) => d.id !== selectedDepartment?.id)
                    .map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.code} - {dept.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Selecciona un departamento padre para crear una jerarquía
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleCreate}
              loading={createMutation.isPending} loadingText="Creando..."
            >Crear</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Editar */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Departamento</DialogTitle>
            <DialogDescription>
              Modifica los datos del departamento
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-code">Código *</Label>
              <Input
                id="edit-code"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-parentId">
                <Network className="inline h-4 w-4 mr-1" />
                Departamento Padre (opcional)
              </Label>
              <Select
                value={formData.parentId?.toString() || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    parentId: value === "none" ? null : parseInt(value),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin departamento padre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin departamento padre (Raíz)</SelectItem>
                  {data?.data
                    .filter((d: any) => d.id !== selectedDepartment?.id)
                    .map((dept: any) => (
                      <SelectItem key={dept.id} value={dept.id.toString()}>
                        {dept.code} - {dept.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Selecciona un departamento padre para crear una jerarquía
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleUpdate}
              loading={updateMutation.isPending} loadingText="Guardando..."
            >Guardar</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo Eliminar */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el departamento "
              {selectedDepartment?.name}" permanentemente.
              {selectedDepartment?.employeeCount > 0 && (
                <span className="block mt-2 text-destructive font-semibold">
                  Advertencia: Este departamento tiene {selectedDepartment.employeeCount} empleado(s) asignado(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
