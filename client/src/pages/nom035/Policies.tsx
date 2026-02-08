import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Download, Edit, Trash2, CheckCircle2, XCircle } from "lucide-react";

import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Policies() {

  const utils = trpc.useUtils();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    fechaPublicacion: new Date().toISOString().split('T')[0],
    representanteLegalId: undefined as number | undefined,
  });

  // Queries
  const { data: policies, isLoading } = trpc.nom035Policies.list.useQuery();

  // Mutations
  const createMutation = trpc.nom035Policies.create.useMutation({
    onSuccess: () => {
      alert("Política creada exitosamente");
      utils.nom035Policies.list.invalidate();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.nom035Policies.update.useMutation({
    onSuccess: () => {
      alert("Política actualizada exitosamente");
      utils.nom035Policies.list.invalidate();
      setIsEditDialogOpen(false);
      setSelectedPolicy(null);
      resetForm();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.nom035Policies.delete.useMutation({
    onSuccess: () => {
      alert("Política eliminada exitosamente");
      utils.nom035Policies.list.invalidate();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const generatePDFMutation = trpc.nom035Policies.generatePDF.useMutation({
    onSuccess: (data) => {
      alert("PDF generado exitosamente");
      // Abrir PDF en nueva ventana
      window.open(data.pdfUrl, '_blank');
      utils.nom035Policies.list.invalidate();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      nombre: "",
      descripcion: "",
      fechaPublicacion: new Date().toISOString().split('T')[0],
      representanteLegalId: undefined,
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedPolicy) return;
    updateMutation.mutate({
      id: selectedPolicy.id,
      ...formData,
    });
  };

  const handleEdit = (policy: any) => {
    setSelectedPolicy(policy);
    setFormData({
      nombre: policy.nombre,
      descripcion: policy.descripcion,
      fechaPublicacion: format(new Date(policy.fechaPublicacion), 'yyyy-MM-dd'),
      representanteLegalId: policy.representanteLegalId || undefined,
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Está seguro de eliminar esta política?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleGeneratePDF = (id: number) => {
    generatePDFMutation.mutate({ id });
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Políticas NOM-035</h1>
          <p className="text-muted-foreground mt-1">
            Gestión de políticas de prevención de riesgos psicosociales
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Política
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Crear Nueva Política</DialogTitle>
              <DialogDescription>
                Complete los datos de la política de prevención de riesgos psicosociales
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre de la Política *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Ej: Política de Prevención del Acoso Laboral"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descripcion">Descripción *</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Describa el contenido de la política..."
                  rows={8}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fechaPublicacion">Fecha de Publicación *</Label>
                <Input
                  id="fechaPublicacion"
                  type="date"
                  value={formData.fechaPublicacion}
                  onChange={(e) => setFormData({ ...formData, fechaPublicacion: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creando..." : "Crear Política"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Políticas existentes */}
      <Card>
        <CardHeader>
          <CardTitle>Políticas Registradas</CardTitle>
          <CardDescription>
            Listado de políticas de prevención de riesgos psicosociales
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando políticas...</div>
          ) : !policies || policies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay políticas registradas. Cree una nueva política para comenzar.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Fecha de Publicación</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>PDF</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell className="font-medium">{policy.nombre}</TableCell>
                    <TableCell>
                      {format(new Date(policy.fechaPublicacion), "d 'de' MMMM 'de' yyyy", { locale: es })}
                    </TableCell>
                    <TableCell>
                      {policy.activo ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Activa
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <XCircle className="h-3 w-3" />
                          Inactiva
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {policy.pdfUrl ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => policy.pdfUrl && window.open(policy.pdfUrl, '_blank')}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          Ver PDF
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGeneratePDF(policy.id)}
                          disabled={generatePDFMutation.isPending}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Generar PDF
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(policy)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(policy.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Política</DialogTitle>
            <DialogDescription>
              Modifique los datos de la política de prevención de riesgos psicosociales
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nombre">Nombre de la Política *</Label>
              <Input
                id="edit-nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-descripcion">Descripción *</Label>
              <Textarea
                id="edit-descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-fechaPublicacion">Fecha de Publicación *</Label>
              <Input
                id="edit-fechaPublicacion"
                type="date"
                value={formData.fechaPublicacion}
                onChange={(e) => setFormData({ ...formData, fechaPublicacion: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Actualizando..." : "Actualizar Política"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
