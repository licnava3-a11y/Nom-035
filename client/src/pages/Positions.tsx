import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Plus, Pencil, Trash2, Search, Briefcase, Users } from "lucide-react";
import ProtectedButton from "@/components/ProtectedButton";
import { toast } from "sonner";

const LEVEL_LABELS: Record<string, string> = {
  executive: "Ejecutivo",
  management: "Gerencial",
  supervisor: "Supervisor",
  specialist: "Especialista",
  entry: "Operativo",
};

export default function Positions() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<number | undefined>();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<any>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    code: "",
    departmentId: 0,
    level: "specialist" as "executive" | "management" | "supervisor" | "specialist" | "entry",
  });

  const { data, isLoading, refetch } = trpc.positions.list.useQuery({
    page,
    pageSize: 10,
    search: search || undefined,
    departmentId: filterDepartment,
  });

  const { data: departments } = trpc.departments.list.useQuery({
    page: 1,
    pageSize: 100,
    isActive: true,
  });

  const createMutation = trpc.positions.create.useMutation({
    onSuccess: () => {
      toast.success("Puesto creado exitosamente");
      setIsCreateOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al crear puesto");
    },
  });

  const updateMutation = trpc.positions.update.useMutation({
    onSuccess: () => {
      toast.success("Puesto actualizado exitosamente");
      setIsEditOpen(false);
      resetForm();
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al actualizar puesto");
    },
  });

  const deleteMutation = trpc.positions.delete.useMutation({
    onSuccess: () => {
      toast.success("Puesto eliminado exitosamente");
      setIsDeleteOpen(false);
      setSelectedPosition(null);
      refetch();
    },
    onError: (error: any) => {
      toast.error(error.message || "Error al eliminar puesto");
    },
  });

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      code: "",
      departmentId: 0,
      level: "specialist",
    });
    setSelectedPosition(null);
  };

  const handleCreate = () => {
    if (!formData.title.trim() || !formData.code.trim() || !formData.departmentId) {
      toast.error("El título, código y departamento son obligatorios");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = (position: any) => {
    setSelectedPosition(position);
    setFormData({
      title: position.title,
      description: position.description || "",
      code: position.code,
      departmentId: position.departmentId,
      level: position.level || "specialist",
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!formData.title.trim() || !formData.code.trim()) {
      toast.error("El título y código son obligatorios");
      return;
    }
    updateMutation.mutate({
      id: selectedPosition.id,
      ...formData,
    });
  };

  const handleDelete = (position: any) => {
    setSelectedPosition(position);
    setIsDeleteOpen(true);
  };

  const confirmDelete = () => {
    if (selectedPosition) {
      deleteMutation.mutate({ id: selectedPosition.id });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Puestos</h1>
          <p className="text-muted-foreground">
            Gestión de puestos organizacionales
          </p>
        </div>
        <ProtectedButton
          onClick={() => setIsCreateOpen(true)}
          requiredPermission="can_create"
          fallbackMessage="Solo los administradores pueden crear puestos"
          hideIfNoPermission
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Puesto
        </ProtectedButton>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar puestos..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10"
          />
        </div>
        <Select modal={false}
          value={filterDepartment?.toString() || "all"}
          onValueChange={(value) => {
            setFilterDepartment(value === "all" ? undefined : Number(value));
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Filtrar por departamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los departamentos</SelectItem>
            {departments?.data.map((dept: any) => (
              <SelectItem key={dept.id} value={dept.id.toString()}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Título</TableHead>
              <TableHead>
                <Briefcase className="inline h-4 w-4 mr-1" />
                Departamento
              </TableHead>
              <TableHead>Nivel</TableHead>
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
                <TableCell colSpan={6} className="text-center py-8">
                  Cargando...
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No se encontraron puestos
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((pos: any) => (
                <TableRow key={pos.id}>
                  <TableCell className="font-mono">{pos.code}</TableCell>
                  <TableCell className="font-medium">{pos.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {pos.departmentName || "—"}
                  </TableCell>
                  <TableCell>
                    {pos.level ? LEVEL_LABELS[pos.level] : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {pos.employeeCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <ProtectedButton
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(pos)}
                      requiredPermission="can_edit"
                      fallbackMessage="Solo los administradores pueden editar puestos"
                      hideIfNoPermission
                    >
                      <Pencil className="h-4 w-4" />
                    </ProtectedButton>
                    <ProtectedButton
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(pos)}
                      requiredPermission="can_delete"
                      fallbackMessage="Solo los administradores pueden eliminar puestos"
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Puesto</DialogTitle>
            <DialogDescription>
              Ingresa los datos del nuevo puesto
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Código *</Label>
              <Input
                id="code"
                placeholder="Ej: GER-001"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ej: Gerente de Recursos Humanos"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="department">Departamento *</Label>
              <Select modal={false}
                value={formData.departmentId.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, departmentId: Number(value) })
                }
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Selecciona un departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departments?.data.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="level">Nivel</Label>
              <Select modal={false}
                value={formData.level}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, level: value })
                }
              >
                <SelectTrigger id="level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Descripción del puesto"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Puesto</DialogTitle>
            <DialogDescription>
              Modifica los datos del puesto
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="edit-title">Título *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="edit-department">Departamento *</Label>
              <Select modal={false}
                value={formData.departmentId.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, departmentId: Number(value) })
                }
              >
                <SelectTrigger id="edit-department">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments?.data.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-level">Nivel</Label>
              <Select modal={false}
                value={formData.level}
                onValueChange={(value: any) =>
                  setFormData({ ...formData, level: value })
                }
              >
                <SelectTrigger id="edit-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEVEL_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
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
              Esta acción no se puede deshacer. Se eliminará el puesto "
              {selectedPosition?.title}" permanentemente.
              {selectedPosition?.employeeCount > 0 && (
                <span className="block mt-2 text-destructive font-semibold">
                  Advertencia: Este puesto tiene {selectedPosition.employeeCount} empleado(s) asignado(s).
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
