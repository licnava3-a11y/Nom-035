import { useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Edit,
  Trash2,
  FileText,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import ProtectedButton from "@/components/ProtectedButton";

export default function DocumentFormats() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFormat, setEditingFormat] = useState<any>(null);
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    descripcion: "",
    version: "1.0",
    fechaVersion: new Date().toISOString().split("T")[0],
    referencia: "",
  });

  const {
    data: formats,
    isLoading,
    refetch,
  } = trpc.documentFormats.list.useQuery();
  const createMutation = trpc.documentFormats.create.useMutation();
  const updateMutation = trpc.documentFormats.update.useMutation();
  const deleteMutation = trpc.documentFormats.delete.useMutation();

  const handleOpenDialog = (format?: any) => {
    if (format) {
      setEditingFormat(format);
      setFormData({
        codigo: format.codigo,
        nombre: format.nombre,
        descripcion: format.descripcion || "",
        version: format.version,
        fechaVersion: format.fechaVersion
          ? new Date(format.fechaVersion).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        referencia: format.referencia || "",
      });
    } else {
      setEditingFormat(null);
      setFormData({
        codigo: "",
        nombre: "",
        descripcion: "",
        version: "1.0",
        fechaVersion: new Date().toISOString().split("T")[0],
        referencia: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingFormat) {
        await updateMutation.mutateAsync({
          id: editingFormat.id,
          ...formData,
        });
        toast.success("Formato actualizado exitosamente");
      } else {
        await createMutation.mutateAsync(formData);
        toast.success("Formato creado exitosamente");
      }

      setIsDialogOpen(false);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al guardar formato");
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const handleDelete = (id: number, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteMutation.mutateAsync({ id: deleteConfirm.id });
      toast.success("Formato eliminado exitosamente");
      setDeleteConfirm(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar formato");
    }
  };

  const handleToggleActive = async (format: any) => {
    try {
      await updateMutation.mutateAsync({
        id: format.id,
        activo: !format.activo,
      });
      toast.success(
        `Formato ${!format.activo ? "activado" : "desactivado"} exitosamente`
      );
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al cambiar estado del formato");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Cargando formatos...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catálogo de Formatos</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de nomenclatura de folios para documentos del sistema de
            gestión
          </p>
        </div>
        <ProtectedButton
          onClick={() => handleOpenDialog()}
          requiredPermission="can_create"
          fallbackMessage="No tienes permisos para crear formatos"
          hideIfNoPermission
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Formato
        </ProtectedButton>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formatos Registrados</CardTitle>
          <CardDescription>
            Nomenclatura: CÓDIGO-CONSECUTIVO/AÑO (Ejemplo: VN-001/2026)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!formats || formats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay formatos registrados</p>
              <p className="text-sm mt-2">
                Cree un nuevo formato para comenzar
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Versión</TableHead>
                  <TableHead>Consecutivo Actual</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formats.map((format: any) => (
                  <TableRow key={format.id}>
                    <TableCell className="font-mono font-semibold">
                      {format.codigo}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{format.nombre}</p>
                        {format.descripcion && (
                          <p className="text-sm text-muted-foreground">
                            {format.descripcion}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{format.version}</Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {format.consecutivoActual}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format.referencia || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(format)}
                        className="h-auto p-0"
                      >
                        {format.activo ? (
                          <Badge variant="default" className="bg-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Activo
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactivo
                          </Badge>
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ProtectedButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(format)}
                          requiredPermission="can_edit"
                          fallbackMessage="No tienes permisos para editar formatos"
                        >
                          <Edit className="h-4 w-4" />
                        </ProtectedButton>
                        <ProtectedButton
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(format.id, format.name)}
                          className="text-red-600 hover:text-red-700"
                          requiredPermission="can_delete"
                          fallbackMessage="No tienes permisos para eliminar formatos"
                        >
                          <Trash2 className="h-4 w-4" />
                        </ProtectedButton>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para crear/editar formato */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingFormat ? "Editar Formato" : "Nuevo Formato"}
            </DialogTitle>
            <DialogDescription>
              Configure la nomenclatura de folios para documentos del sistema de
              gestión
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      codigo: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="Ej: VN, AC, RN"
                  maxLength={20}
                  required
                  disabled={!!editingFormat}
                />
                <p className="text-xs text-muted-foreground">
                  Código único del formato (2-4 caracteres recomendados)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="version">Versión *</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={e =>
                    setFormData({ ...formData, version: e.target.value })
                  }
                  placeholder="1.0"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del Formato *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={e =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                placeholder="Ej: Verificación de Numerales NOM-035"
                maxLength={255}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={e =>
                  setFormData({ ...formData, descripcion: e.target.value })
                }
                placeholder="Descripción detallada del formato"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fechaVersion">Fecha de Versión *</Label>
                <Input
                  id="fechaVersion"
                  type="date"
                  value={formData.fechaVersion}
                  onChange={e =>
                    setFormData({ ...formData, fechaVersion: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referencia">Referencia</Label>
                <Input
                  id="referencia"
                  value={formData.referencia}
                  onChange={e =>
                    setFormData({ ...formData, referencia: e.target.value })
                  }
                  placeholder="Ej: NOM-035-STPS-2018"
                  maxLength={500}
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-900">
                Vista previa del folio:
              </p>
              <p className="text-lg font-mono font-bold text-blue-700 mt-1">
                {formData.codigo || "XXX"}-001/{new Date().getFullYear()}
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <ProtectedButton
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                requiredPermissions={["can_create", "can_edit"]}
                requireAll={false}
                fallbackMessage="No tienes permisos para guardar formatos"
              >
                {editingFormat ? "Actualizar" : "Crear"} Formato
              </ProtectedButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={open => !open && setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Eliminar Formato"
        description={`¿Estás seguro de eliminar el formato "${deleteConfirm?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
}
