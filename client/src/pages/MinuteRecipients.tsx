import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Mail,
  UserCheck,
  UserX,
  Users,
  Filter,
} from "lucide-react";

type Recipient = {
  id: number;
  name: string;
  email: string;
  position: string;
  department: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type FormData = {
  name: string;
  email: string;
  position: string;
  department: string;
};

const emptyForm: FormData = {
  name: "",
  email: "",
  position: "",
  department: "",
};

export default function MinuteRecipients() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Consulta de destinatarios
  const { data: recipients = [], isLoading } = trpc.minuteRecipients.list.useQuery({
    search: search.trim() || undefined,
    onlyActive,
  });

  // Mutaciones
  const createMutation = trpc.minuteRecipients.create.useMutation({
    onSuccess: () => {
      utils.minuteRecipients.list.invalidate();
      toast({ title: "Destinatario creado", description: "El destinatario fue agregado al catálogo." });
      handleCloseForm();
    },
    onError: (err) => {
      toast({ title: "Error al crear", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = trpc.minuteRecipients.update.useMutation({
    onSuccess: () => {
      utils.minuteRecipients.list.invalidate();
      toast({ title: "Destinatario actualizado", description: "Los datos fueron guardados correctamente." });
      handleCloseForm();
    },
    onError: (err) => {
      toast({ title: "Error al actualizar", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = trpc.minuteRecipients.delete.useMutation({
    onSuccess: () => {
      utils.minuteRecipients.list.invalidate();
      toast({ title: "Destinatario eliminado", description: "El destinatario fue removido del catálogo." });
      setDeleteId(null);
    },
    onError: (err) => {
      toast({ title: "Error al eliminar", description: err.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = trpc.minuteRecipients.toggleActive.useMutation({
    onSuccess: (_, variables) => {
      utils.minuteRecipients.list.invalidate();
      toast({
        title: variables.isActive ? "Destinatario activado" : "Destinatario desactivado",
        description: variables.isActive
          ? "El destinatario está activo y recibirá minutas."
          : "El destinatario fue desactivado.",
      });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Validación del formulario
  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errors.name = "El nombre debe tener al menos 2 caracteres.";
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Ingresa un correo electrónico válido.";
    }
    if (!formData.position.trim() || formData.position.trim().length < 2) {
      errors.position = "El cargo debe tener al menos 2 caracteres.";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setFormData(emptyForm);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (recipient: Recipient) => {
    setEditingId(recipient.id);
    setFormData({
      name: recipient.name,
      email: recipient.email,
      position: recipient.position,
      department: recipient.department ?? "",
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData(emptyForm);
    setFormErrors({});
  };

  const handleSubmit = () => {
    if (!validateForm()) return;
    const payload = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      position: formData.position.trim(),
      department: formData.department.trim() || null,
    };
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleToggleActive = (recipient: Recipient) => {
    toggleActiveMutation.mutate({ id: recipient.id, isActive: !recipient.isActive });
  };

  const activeCount = recipients.filter((r) => r.isActive).length;
  const totalCount = recipients.length;

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          { label: "Cumplimiento Normativo" },
          { label: "Comité de Seguridad" },
          { label: "Catálogo de Destinatarios" },
        ]}
      />

      {/* Encabezado */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Catálogo de Destinatarios</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona los destinatarios para el envío formal de minutas de reunión.
        </p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{totalCount}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-green-500/10">
            <UserCheck className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Activos</p>
            <p className="text-2xl font-bold text-green-600">{activeCount}</p>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4 flex items-center gap-3">
          <div className="p-2 rounded-md bg-muted">
            <UserX className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Inactivos</p>
            <p className="text-2xl font-bold text-muted-foreground">{totalCount - activeCount}</p>
          </div>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, correo, cargo o área..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={onlyActive ? "default" : "outline"}
                size="sm"
                onClick={() => setOnlyActive(!onlyActive)}
                className="gap-1.5"
              >
                <Filter className="h-4 w-4" />
                {onlyActive ? "Solo activos" : "Todos"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {onlyActive ? "Mostrando solo activos. Clic para ver todos." : "Clic para mostrar solo activos."}
            </TooltipContent>
          </Tooltip>
        </div>
        <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Agregar Destinatario
        </Button>
      </div>

      {/* Tabla */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Nombre</TableHead>
              <TableHead className="font-semibold">Correo Electrónico</TableHead>
              <TableHead className="font-semibold">Cargo</TableHead>
              <TableHead className="font-semibold">Área / Departamento</TableHead>
              <TableHead className="font-semibold text-center">Estado</TableHead>
              <TableHead className="font-semibold text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : recipients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="h-10 w-10 opacity-30" />
                    <p className="font-medium">
                      {search ? "No se encontraron destinatarios con ese criterio." : "No hay destinatarios registrados."}
                    </p>
                    {!search && (
                      <Button variant="outline" size="sm" onClick={handleOpenCreate} className="mt-2 gap-1.5">
                        <Plus className="h-4 w-4" />
                        Agregar el primero
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              recipients.map((recipient) => (
                <TableRow key={recipient.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{recipient.name}</TableCell>
                  <TableCell>
                    <a
                      href={`mailto:${recipient.email}`}
                      className="flex items-center gap-1.5 text-primary hover:underline text-sm"
                    >
                      <Mail className="h-3.5 w-3.5" />
                      {recipient.email}
                    </a>
                  </TableCell>
                  <TableCell className="text-sm">{recipient.position}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {recipient.department || <span className="italic opacity-50">—</span>}
                  </TableCell>
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleToggleActive(recipient)}
                          disabled={toggleActiveMutation.isPending}
                          className="inline-flex"
                        >
                          <Badge
                            variant={recipient.isActive ? "default" : "secondary"}
                            className={`cursor-pointer select-none transition-opacity ${
                              recipient.isActive
                                ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                                : "opacity-60 hover:opacity-80"
                            }`}
                          >
                            {recipient.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {recipient.isActive ? "Clic para desactivar" : "Clic para activar"}
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenEdit(recipient)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteId(recipient.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Eliminar</TooltipContent>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Nota informativa */}
      {totalCount > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {totalCount} destinatario{totalCount !== 1 ? "s" : ""} en el catálogo
          {onlyActive && ` · ${activeCount} activo${activeCount !== 1 ? "s" : ""}`}
        </p>
      )}

      {/* Modal de formulario */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? "Editar Destinatario" : "Agregar Destinatario"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Nombre */}
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Nombre completo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ej. María González López"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={formErrors.name ? "border-destructive" : ""}
              />
              {formErrors.name && (
                <p className="text-xs text-destructive">{formErrors.name}</p>
              )}
            </div>

            {/* Correo */}
            <div className="space-y-1.5">
              <Label htmlFor="email">
                Correo electrónico <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="Ej. m.gonzalez@empresa.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={formErrors.email ? "border-destructive" : ""}
              />
              {formErrors.email && (
                <p className="text-xs text-destructive">{formErrors.email}</p>
              )}
            </div>

            {/* Cargo */}
            <div className="space-y-1.5">
              <Label htmlFor="position">
                Cargo <span className="text-destructive">*</span>
              </Label>
              <Input
                id="position"
                placeholder="Ej. Coordinadora de Recursos Humanos"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className={formErrors.position ? "border-destructive" : ""}
              />
              {formErrors.position && (
                <p className="text-xs text-destructive">{formErrors.position}</p>
              )}
            </div>

            {/* Departamento */}
            <div className="space-y-1.5">
              <Label htmlFor="department">
                Área / Departamento <span className="text-muted-foreground text-xs">(opcional)</span>
              </Label>
              <Input
                id="department"
                placeholder="Ej. Recursos Humanos"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseForm}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Guardando..."
                : editingId !== null
                ? "Guardar cambios"
                : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar destinatario?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El destinatario será removido permanentemente del
              catálogo y no podrá ser seleccionado en futuras minutas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
