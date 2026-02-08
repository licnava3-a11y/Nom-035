import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Edit, Trash2, UserCheck, FileText } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function LegalRepresentative() {
  const toast = (opts: { title: string; description: string; variant?: string }) => {
    alert(`${opts.title}: ${opts.description}`);
  };

  const { data: representatives, isLoading, refetch } = trpc.company.legalRepresentative.list.useQuery();
  const createMutation = trpc.company.legalRepresentative.create.useMutation();
  const updateMutation = trpc.company.legalRepresentative.update.useMutation();
  const deleteMutation = trpc.company.legalRepresentative.delete.useMutation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    cargo: "",
    rfc: "",
    curp: "",
    domicilio: "",
    telefono: "",
    email: "",
    vigenciaInicio: "",
    vigenciaFin: "",
    actaConstitutiva: "",
    poderNotarial: "",
  });

  const resetForm = () => {
    setFormData({
      nombre: "",
      cargo: "",
      rfc: "",
      curp: "",
      domicilio: "",
      telefono: "",
      email: "",
      vigenciaInicio: "",
      vigenciaFin: "",
      actaConstitutiva: "",
      poderNotarial: "",
    });
    setEditingId(null);
  };

  const handleEdit = (rep: any) => {
    setFormData({
      nombre: rep.nombre,
      cargo: rep.cargo,
      rfc: rep.rfc || "",
      curp: rep.curp || "",
      domicilio: rep.domicilio || "",
      telefono: rep.telefono || "",
      email: rep.email || "",
      vigenciaInicio: rep.vigenciaInicio ? new Date(rep.vigenciaInicio).toISOString().split('T')[0] : "",
      vigenciaFin: rep.vigenciaFin ? new Date(rep.vigenciaFin).toISOString().split('T')[0] : "",
      actaConstitutiva: rep.actaConstitutiva || "",
      poderNotarial: rep.poderNotarial || "",
    });
    setEditingId(rep.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          nombre: formData.nombre,
          cargo: formData.cargo,
          telefono: formData.telefono || undefined,
          email: formData.email || undefined,
          activo: true,
        });
        toast({
          title: "Representante actualizado",
          description: "Los datos del representante legal se han actualizado correctamente",
        });
      } else {
        await createMutation.mutateAsync({
          nombre: formData.nombre,
          cargo: formData.cargo,
          email: formData.email || undefined,
          telefono: formData.telefono || undefined,
          rfc: formData.rfc || undefined,
          curp: formData.curp || undefined,
          domicilio: formData.domicilio || undefined,
          actaConstitutiva: formData.actaConstitutiva || undefined,
          poderNotarial: formData.poderNotarial || undefined,
          vigenciaInicio: formData.vigenciaInicio || undefined,
          vigenciaFin: formData.vigenciaFin || undefined,
        });
        toast({
          title: "Representante registrado",
          description: "El representante legal se ha registrado correctamente",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el representante legal",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar este representante legal?")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast({
        title: "Representante eliminado",
        description: "El representante legal se ha eliminado correctamente",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el representante legal",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-8">
      <Breadcrumbs items={[
        { label: "Empresa", path: "/company/general" },
        { label: "Representante Legal" }
      ]} />
      
      <div className="flex items-center justify-between mb-6 mt-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <UserCheck className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Representantes Legales</h1>
          </div>
          <p className="text-muted-foreground">
            Gestión de representantes legales de la empresa (NOM-035 Capítulo 5.1)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Representante
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Representante Legal" : "Nuevo Representante Legal"}
              </DialogTitle>
              <DialogDescription>
                Complete la información del representante legal de la empresa
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {/* Nombre Completo */}
                <div className="space-y-2">
                  <Label htmlFor="nombre">
                    Nombre Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Nombre completo del representante"
                    required
                  />
                </div>

                {/* Cargo */}
                <div className="space-y-2">
                  <Label htmlFor="cargo">
                    Cargo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    placeholder="Ej: Director General, Apoderado Legal"
                    required
                  />
                </div>

                {/* RFC */}
                <div className="space-y-2">
                  <Label htmlFor="rfc">RFC</Label>
                  <Input
                    id="rfc"
                    value={formData.rfc}
                    onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                    placeholder="ABCD123456XYZ"
                    maxLength={13}
                  />
                </div>

                {/* CURP */}
                <div className="space-y-2">
                  <Label htmlFor="curp">CURP</Label>
                  <Input
                    id="curp"
                    value={formData.curp}
                    onChange={(e) => setFormData({ ...formData, curp: e.target.value.toUpperCase() })}
                    placeholder="ABCD123456HDFRNN01"
                    maxLength={18}
                  />
                </div>

                {/* Domicilio */}
                <div className="space-y-2">
                  <Label htmlFor="domicilio">Domicilio</Label>
                  <Textarea
                    id="domicilio"
                    value={formData.domicilio}
                    onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                    placeholder="Dirección completa"
                    rows={2}
                  />
                </div>

                {/* Teléfono */}
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono de Contacto</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="(55) 1234-5678"
                  />
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email de Contacto</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="representante@empresa.com"
                  />
                </div>

                {/* Vigencia Desde */}
                <div className="space-y-2">
                  <Label htmlFor="vigenciaInicio">Vigencia Desde</Label>
                  <Input
                    id="vigenciaInicio"
                    type="date"
                    value={formData.vigenciaInicio}
                    onChange={(e) => setFormData({ ...formData, vigenciaInicio: e.target.value })}
                  />
                </div>

                {/* Vigencia Hasta */}
                <div className="space-y-2">
                  <Label htmlFor="vigenciaFin">Vigencia Hasta</Label>
                  <Input
                    id="vigenciaFin"
                    type="date"
                    value={formData.vigenciaFin}
                    onChange={(e) => setFormData({ ...formData, vigenciaFin: e.target.value })}
                  />
                </div>

                {/* Acta Constitutiva */}
                <div className="space-y-2">
                  <Label htmlFor="actaConstitutiva">Número de Acta Constitutiva</Label>
                  <Input
                    id="actaConstitutiva"
                    value={formData.actaConstitutiva}
                    onChange={(e) => setFormData({ ...formData, actaConstitutiva: e.target.value })}
                    placeholder="Número de acta"
                  />
                </div>

                {/* Poder Notarial */}
                <div className="space-y-2">
                  <Label htmlFor="poderNotarial">Número de Poder Notarial</Label>
                  <Input
                    id="poderNotarial"
                    value={formData.poderNotarial}
                    onChange={(e) => setFormData({ ...formData, poderNotarial: e.target.value })}
                    placeholder="Número de poder notarial"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Representantes */}
      {representatives && representatives.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {representatives.map((rep) => (
            <Card key={rep.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{rep.nombre}</CardTitle>
                    <CardDescription>{rep.cargo}</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(rep)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(rep.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {rep.rfc && (
                  <div>
                    <span className="font-medium">RFC:</span> {rep.rfc}
                  </div>
                )}
                {rep.curp && (
                  <div>
                    <span className="font-medium">CURP:</span> {rep.curp}
                  </div>
                )}
                {rep.email && (
                  <div>
                    <span className="font-medium">Email:</span> {rep.email}
                  </div>
                )}
                {rep.telefono && (
                  <div>
                    <span className="font-medium">Teléfono:</span> {rep.telefono}
                  </div>
                )}
                {rep.domicilio && (
                  <div>
                    <span className="font-medium">Domicilio:</span> {rep.domicilio}
                  </div>
                )}
                {(rep.vigenciaInicio || rep.vigenciaFin) && (
                  <div>
                    <span className="font-medium">Vigencia:</span>{" "}
                    {rep.vigenciaInicio ? new Date(rep.vigenciaInicio).toLocaleDateString("es-MX") : "N/A"} -{" "}
                    {rep.vigenciaFin ? new Date(rep.vigenciaFin).toLocaleDateString("es-MX") : "Indefinido"}
                  </div>
                )}
                {rep.actaConstitutiva && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Acta:</span> {rep.actaConstitutiva}
                  </div>
                )}
                {rep.poderNotarial && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Poder:</span> {rep.poderNotarial}
                  </div>
                )}
                {rep.firmaUrl && (
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span className="font-medium">Firma registrada</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCheck className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No hay representantes legales registrados</p>
            <p className="text-sm text-muted-foreground mb-4">
              Agregue el primer representante legal de la empresa
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
