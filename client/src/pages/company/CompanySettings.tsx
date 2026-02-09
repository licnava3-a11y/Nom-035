import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Loader2, Save, Building2, Upload, Image as ImageIcon, UserCheck, PenTool, FileText,
  Plus, Edit, Trash2, CheckCircle, Clock, XCircle
} from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AITextarea } from "@/components/AITextarea";

export default function CompanySettings() {
  const toast = (opts: { title: string; description: string; variant?: string }) => {
    alert(`${opts.title}: ${opts.description}`);
  };

  return (
    <div className="container max-w-7xl py-8">
      <Breadcrumbs items={[
        { label: "Empresa", path: "/company" },
        { label: "Configuración General" }
      ]} />
      
      <div className="mb-6 mt-4">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Configuración de la Empresa</h1>
        </div>
        <p className="text-muted-foreground">
          Gestión centralizada de datos generales, logo, representantes legales y firmas digitales
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">Datos Generales</TabsTrigger>
          <TabsTrigger value="logo">Logo</TabsTrigger>
          <TabsTrigger value="representatives">Representantes Legales</TabsTrigger>
          <TabsTrigger value="signatures">Firmas Digitales</TabsTrigger>
          <TabsTrigger value="reports">Datos de Reporte</TabsTrigger>
        </TabsList>

        {/* TAB 1: DATOS GENERALES */}
        <TabsContent value="general">
          <GeneralDataTab />
        </TabsContent>

        {/* TAB 2: LOGO */}
        <TabsContent value="logo">
          <LogoTab />
        </TabsContent>

        {/* TAB 3: REPRESENTANTES LEGALES */}
        <TabsContent value="representatives">
          <LegalRepresentativesTab />
        </TabsContent>

        {/* TAB 4: FIRMAS DIGITALES */}
        <TabsContent value="signatures">
          <DigitalSignaturesTab />
        </TabsContent>

        {/* TAB 5: DATOS DE REPORTE */}
        <TabsContent value="reports">
          <SurveyReportTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ========== TAB 1: DATOS GENERALES ==========
function GeneralDataTab() {
  const toast = (opts: { title: string; description: string; variant?: string }) => {
    alert(`${opts.title}: ${opts.description}`);
  };
  const { data: companyData, isLoading } = trpc.company.generalData.get.useQuery();
  const updateMutation = trpc.company.generalData.update.useMutation();

  const [formData, setFormData] = useState({
    razonSocial: "",
    rfc: "",
    direccionFiscal: "",
    giro: "",
    actividadesPreponderantes: "",
    numeroTrabajadores: "",
    representanteLegal: "",
    telefonoContacto: "",
    emailContacto: "",
    paginaWeb: "",
    notificationEmail: "",
    noreplyEmail: "",
  });

  useEffect(() => {
    if (companyData) {
      setFormData({
        razonSocial: companyData.razonSocial || "",
        rfc: companyData.rfc || "",
        direccionFiscal: companyData.direccionFiscal || "",
        giro: companyData.giro || "",
        actividadesPreponderantes: companyData.actividadesPreponderantes || "",
        numeroTrabajadores: companyData.numeroTrabajadores?.toString() || "",
        representanteLegal: companyData.representanteLegal || "",
        telefonoContacto: companyData.telefonoContacto || "",
        emailContacto: companyData.emailContacto || "",
        paginaWeb: companyData.paginaWeb || "",
        notificationEmail: companyData.notificationEmail || "",
        noreplyEmail: companyData.noreplyEmail || "",
      });
    }
  }, [companyData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateMutation.mutateAsync({
        razonSocial: formData.razonSocial,
        rfc: formData.rfc.toUpperCase(),
        direccionFiscal: formData.direccionFiscal,
        giro: formData.giro || undefined,
        actividadesPreponderantes: formData.actividadesPreponderantes || undefined,
        numeroTrabajadores: formData.numeroTrabajadores ? parseInt(formData.numeroTrabajadores) : undefined,
        representanteLegal: formData.representanteLegal || undefined,
        telefonoContacto: formData.telefonoContacto || undefined,
        emailContacto: formData.emailContacto || undefined,
        paginaWeb: formData.paginaWeb || undefined,
        notificationEmail: formData.notificationEmail || undefined,
        noreplyEmail: formData.noreplyEmail || undefined,
      });

      toast({
        title: "Datos actualizados",
        description: "Los datos generales de la empresa se han guardado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron guardar los datos",
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
    <Card>
      <CardHeader>
        <CardTitle>Datos Generales de la Empresa</CardTitle>
        <CardDescription>
          Información básica del centro de trabajo según NOM-035-STPS-2018 Capítulo 5.1
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="razonSocial">Razón Social *</Label>
              <Input
                id="razonSocial"
                value={formData.razonSocial}
                onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                placeholder="Nombre legal de la empresa"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rfc">RFC *</Label>
              <Input
                id="rfc"
                value={formData.rfc}
                onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                placeholder="XAXX010101000"
                maxLength={13}
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="direccionFiscal">Dirección Fiscal *</Label>
              <Textarea
                id="direccionFiscal"
                value={formData.direccionFiscal}
                onChange={(e) => setFormData({ ...formData, direccionFiscal: e.target.value })}
                placeholder="Calle, número, colonia, CP, ciudad, estado"
                rows={3}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="giro">Giro</Label>
              <Input
                id="giro"
                value={formData.giro}
                onChange={(e) => setFormData({ ...formData, giro: e.target.value })}
                placeholder="Sector o industria"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actividadesPreponderantes">Actividades Preponderantes</Label>
              <Input
                id="actividadesPreponderantes"
                value={formData.actividadesPreponderantes}
                onChange={(e) => setFormData({ ...formData, actividadesPreponderantes: e.target.value })}
                placeholder="Principales actividades económicas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="numeroTrabajadores">Número de Trabajadores</Label>
              <Input
                id="numeroTrabajadores"
                type="number"
                value={formData.numeroTrabajadores}
                onChange={(e) => setFormData({ ...formData, numeroTrabajadores: e.target.value })}
                placeholder="0"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="representanteLegal">Representante Legal</Label>
              <Input
                id="representanteLegal"
                value={formData.representanteLegal}
                onChange={(e) => setFormData({ ...formData, representanteLegal: e.target.value })}
                placeholder="Nombre completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefonoContacto">Teléfono de Contacto</Label>
              <Input
                id="telefonoContacto"
                type="tel"
                value={formData.telefonoContacto}
                onChange={(e) => setFormData({ ...formData, telefonoContacto: e.target.value })}
                placeholder="(000) 000-0000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailContacto">Email de Contacto</Label>
              <Input
                id="emailContacto"
                type="email"
                value={formData.emailContacto}
                onChange={(e) => setFormData({ ...formData, emailContacto: e.target.value })}
                placeholder="contacto@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paginaWeb">Página Web</Label>
              <Input
                id="paginaWeb"
                type="url"
                value={formData.paginaWeb}
                onChange={(e) => setFormData({ ...formData, paginaWeb: e.target.value })}
                placeholder="https://www.empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notificationEmail">Correo de Notificaciones</Label>
              <Input
                id="notificationEmail"
                type="email"
                value={formData.notificationEmail}
                onChange={(e) => setFormData({ ...formData, notificationEmail: e.target.value })}
                placeholder="notificaciones@empresa.com"
              />
              <p className="text-sm text-muted-foreground">
                Correo para recibir actualizaciones y alertas del sistema
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="noreplyEmail">Correo No-Reply para Encuestas</Label>
              <Input
                id="noreplyEmail"
                type="email"
                value={formData.noreplyEmail}
                onChange={(e) => setFormData({ ...formData, noreplyEmail: e.target.value })}
                placeholder="noreply@empresa.com"
              />
              <p className="text-sm text-muted-foreground">
                Correo remitente para envío automático de encuestas NOM-035
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Guardar Cambios
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ========== TAB 2: LOGO ==========
function LogoTab() {
  const toast = (opts: { title: string; description: string; variant?: string }) => {
    alert(`${opts.title}: ${opts.description}`);
  };
  const { data: logoData, isLoading, refetch } = trpc.company.logo.get.useQuery();
  const uploadMutation = trpc.company.logo.upload.useMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Por favor seleccione un archivo de imagen válido",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "El archivo excede el tamaño máximo de 5MB",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) return;

    const file = fileInputRef.current.files[0];
    const reader = new FileReader();

    reader.onloadend = async () => {
      try {
        await uploadMutation.mutateAsync({
          fileData: reader.result as string,
          fileName: file.name,
          mimeType: file.type,
        });

        toast({
          title: "Logo actualizado",
          description: "El logo de la empresa se ha subido correctamente",
        });

        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        refetch();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "No se pudo subir el logo",
          variant: "destructive",
        });
      }
    };

    reader.readAsDataURL(file);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logo de la Empresa</CardTitle>
        <CardDescription>
          Imagen corporativa utilizada en reportes y documentos oficiales
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo actual */}
        {logoData?.logoUrl && (
          <div>
            <Label>Logo Actual</Label>
            <div className="mt-2 p-4 border rounded-lg bg-muted/20 flex items-center justify-center">
              <img
                src={logoData.logoUrl}
                alt="Logo de la empresa"
                className="max-h-32 object-contain"
              />
            </div>
          </div>
        )}

        {/* Subir nuevo logo */}
        <div className="space-y-4">
          <Label>Subir Nuevo Logo</Label>
          <div className="flex items-center gap-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="flex-1"
            />
            <Button
              onClick={handleUpload}
              disabled={!previewUrl || uploadMutation.isPending}
            >
              {uploadMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Upload className="mr-2 h-4 w-4" />
              Subir
            </Button>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div>
              <Label>Vista Previa</Label>
              <div className="mt-2 p-4 border rounded-lg bg-muted/20 flex items-center justify-center">
                <img
                  src={previewUrl}
                  alt="Vista previa"
                  className="max-h-32 object-contain"
                />
              </div>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Formatos aceptados: JPG, PNG, SVG. Tamaño máximo: 5MB.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ========== TAB 3: REPRESENTANTES LEGALES ==========
function LegalRepresentativesTab() {
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
          email: formData.email || undefined,
          telefono: formData.telefono || undefined,
          activo: true,
        });
        toast({ title: "Actualizado", description: "Representante legal actualizado correctamente" });
      } else {
        await createMutation.mutateAsync({
          nombre: formData.nombre,
          cargo: formData.cargo,
          rfc: formData.rfc || undefined,
          curp: formData.curp || undefined,
          domicilio: formData.domicilio || undefined,
          telefono: formData.telefono || undefined,
          email: formData.email || undefined,
          vigenciaInicio: formData.vigenciaInicio || undefined,
          vigenciaFin: formData.vigenciaFin || undefined,
          actaConstitutiva: formData.actaConstitutiva || undefined,
          poderNotarial: formData.poderNotarial || undefined,
        });
        toast({ title: "Creado", description: "Representante legal agregado correctamente" });
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
      toast({ title: "Eliminado", description: "Representante legal eliminado correctamente" });
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Representantes Legales</CardTitle>
            <CardDescription>
              Personas autorizadas para firmar documentos oficiales de la empresa
            </CardDescription>
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
                  {editingId ? "Editar" : "Agregar"} Representante Legal
                </DialogTitle>
                <DialogDescription>
                  Complete los datos del representante legal de la empresa
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="nombre">Nombre Completo *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cargo">Cargo *</Label>
                    <Input
                      id="cargo"
                      value={formData.cargo}
                      onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rfc">RFC</Label>
                    <Input
                      id="rfc"
                      value={formData.rfc}
                      onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                      maxLength={13}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="curp">CURP</Label>
                    <Input
                      id="curp"
                      value={formData.curp}
                      onChange={(e) => setFormData({ ...formData, curp: e.target.value.toUpperCase() })}
                      maxLength={18}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="domicilio">Domicilio</Label>
                    <Textarea
                      id="domicilio"
                      value={formData.domicilio}
                      onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vigenciaInicio">Vigencia Inicio</Label>
                    <Input
                      id="vigenciaInicio"
                      type="date"
                      value={formData.vigenciaInicio}
                      onChange={(e) => setFormData({ ...formData, vigenciaInicio: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vigenciaFin">Vigencia Fin</Label>
                    <Input
                      id="vigenciaFin"
                      type="date"
                      value={formData.vigenciaFin}
                      onChange={(e) => setFormData({ ...formData, vigenciaFin: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="actaConstitutiva">Acta Constitutiva</Label>
                    <Input
                      id="actaConstitutiva"
                      value={formData.actaConstitutiva}
                      onChange={(e) => setFormData({ ...formData, actaConstitutiva: e.target.value })}
                      placeholder="Número de acta"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="poderNotarial">Poder Notarial</Label>
                    <Input
                      id="poderNotarial"
                      value={formData.poderNotarial}
                      onChange={(e) => setFormData({ ...formData, poderNotarial: e.target.value })}
                      placeholder="Número de poder"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {editingId ? "Actualizar" : "Crear"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {representatives && representatives.length > 0 ? (
          <div className="space-y-4">
            {representatives.map((rep: any) => (
              <Card key={rep.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{rep.nombre}</CardTitle>
                      <CardDescription>{rep.cargo}</CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(rep)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(rep.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 text-sm">
                    {rep.rfc && <div><span className="font-medium">RFC:</span> {rep.rfc}</div>}
                    {rep.email && <div><span className="font-medium">Email:</span> {rep.email}</div>}
                    {rep.telefono && <div><span className="font-medium">Teléfono:</span> {rep.telefono}</div>}
                    {rep.vigenciaInicio && (
                      <div>
                        <span className="font-medium">Vigencia:</span>{" "}
                        {new Date(rep.vigenciaInicio).toLocaleDateString('es-MX')}
                        {rep.vigenciaFin && ` - ${new Date(rep.vigenciaFin).toLocaleDateString('es-MX')}`}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay representantes legales registrados</p>
            <p className="text-sm">Agregue el primer representante legal de la empresa</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== TAB 4: FIRMAS DIGITALES ==========
function DigitalSignaturesTab() {
  const toast = (opts: { title: string; description: string; variant?: string }) => {
    alert(`${opts.title}: ${opts.description}`);
  };

  const { data: signatures, isLoading, refetch } = trpc.company.digitalSignature.list.useQuery();
  const createMutation = trpc.company.digitalSignature.create.useMutation();
  const authorizeMutation = trpc.company.digitalSignature.authorize.useMutation();
  const deleteMutation = trpc.company.digitalSignature.delete.useMutation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombreFirmante: "",
    cargo: "",
    departamento: "",
    tipoFirmante: "externo" as "interno" | "externo",
  });
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({
      nombreFirmante: "",
      cargo: "",
      departamento: "",
      tipoFirmante: "externo",
    });
    setSignatureFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Por favor seleccione un archivo de imagen válido",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "El archivo excede el tamaño máximo de 2MB",
        variant: "destructive",
      });
      return;
    }

    setSignatureFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signatureFile) {
      toast({
        title: "Error",
        description: "Por favor seleccione una imagen de firma",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await createMutation.mutateAsync({
          nombreFirmante: formData.nombreFirmante,
          cargo: formData.cargo,
          departamento: formData.departamento || undefined,
          tipoFirmante: formData.tipoFirmante,
          firmaData: reader.result as string,
        });

        toast({
          title: "Firma creada",
          description: formData.tipoFirmante === "externo" 
            ? "La firma externa ha sido enviada para autorización del administrador"
            : "La firma digital ha sido creada correctamente",
        });

        setIsDialogOpen(false);
        resetForm();
        refetch();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "No se pudo crear la firma digital",
          variant: "destructive",
        });
      }
    };

    reader.readAsDataURL(signatureFile);
  };

  const handleAuthorize = async (id: number) => {
    try {
      await authorizeMutation.mutateAsync({ id, approved: true });
      toast({
        title: "Firma autorizada",
        description: "La firma digital ha sido autorizada correctamente",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo autorizar la firma",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar esta firma digital?")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast({
        title: "Firma eliminada",
        description: "La firma digital ha sido eliminada correctamente",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la firma",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "autorizada":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" /> Autorizada</Badge>;
      case "pendiente":
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" /> Pendiente</Badge>;
      case "rechazada":
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" /> Rechazada</Badge>;
      default:
        return null;
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Firmas Digitales</CardTitle>
            <CardDescription>
              Catálogo de firmas autorizadas para documentos oficiales
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Firma
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Agregar Firma Digital</DialogTitle>
                <DialogDescription>
                  Complete los datos del firmante y suba la imagen de la firma
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nombreFirmante">Nombre del Firmante *</Label>
                  <Input
                    id="nombreFirmante"
                    value={formData.nombreFirmante}
                    onChange={(e) => setFormData({ ...formData, nombreFirmante: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo *</Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipoFirmante">Tipo de Firmante *</Label>
                  <Select
                    value={formData.tipoFirmante}
                    onValueChange={(value: any) => setFormData({ ...formData, tipoFirmante: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interno">Interno (empleado)</SelectItem>
                      <SelectItem value="externo">Externo (requiere autorización)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="firmaImagen">Imagen de Firma *</Label>
                  <Input
                    ref={fileInputRef}
                    id="firmaImagen"
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Formatos: JPG, PNG. Tamaño máximo: 2MB
                  </p>
                </div>

                {previewUrl && (
                  <div>
                    <Label>Vista Previa</Label>
                    <div className="mt-2 p-4 border rounded-lg bg-muted/20 flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Vista previa de firma"
                        className="max-h-24 object-contain"
                      />
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear Firma
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {signatures && signatures.length > 0 ? (
          <div className="space-y-4">
            {signatures.map((sig: any) => (
              <Card key={sig.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <CardTitle className="text-lg">{sig.nombreFirmante}</CardTitle>
                        <CardDescription>{sig.cargo}</CardDescription>
                      </div>
                      {getStatusBadge(sig.estatus)}
                    </div>
                    <div className="flex gap-2">
                      {sig.estatus === "pendiente" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAuthorize(sig.id)}
                          disabled={authorizeMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Autorizar
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(sig.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="flex-1 grid gap-2 text-sm">
                      {sig.departamento && <div><span className="font-medium">Departamento:</span> {sig.departamento}</div>}
                      <div><span className="font-medium">Tipo:</span> {sig.tipoFirmante === "interno" ? "Interno" : "Externo"}</div>
                      <div><span className="font-medium">Creada:</span> {new Date(sig.createdAt).toLocaleDateString('es-MX')}</div>
                    </div>
                    {sig.firmaImagenUrl && (
                      <div className="p-2 border rounded bg-muted/20">
                        <img
                          src={sig.firmaImagenUrl}
                          alt={`Firma de ${sig.nombreFirmante}`}
                          className="max-h-16 object-contain"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <PenTool className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay firmas digitales registradas</p>
            <p className="text-sm">Agregue la primera firma digital autorizada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ========== TAB 5: DATOS DE REPORTE ==========
function SurveyReportTab() {
  const toast = (opts: { title: string; description: string; variant?: string }) => {
    alert(`${opts.title}: ${opts.description}`);
  };

  const { data: reportData, isLoading } = trpc.company.surveyReport.list.useQuery();
  const createMutation = trpc.company.surveyReport.create.useMutation();
  const updateMutation = trpc.company.surveyReport.update.useMutation();

  // Obtener el reporte más reciente o crear uno nuevo
  const latestReport = reportData && reportData.length > 0 ? reportData[0] : null;

  const [formData, setFormData] = useState({
    // Datos básicos
    periodoAplicacion: "",
    fechaInicio: "",
    fechaFin: "",
    guiaAplicada: "guia-i" as "guia-i" | "guia-ii" | "guia-iii",
    tamañoMuestra: "",
    numeroTrabajadoresTotal: "",
    numeroTrabajadoresEncuestados: "",
    metodologiaAplicacion: "",
    // a) Datos del centro de trabajo
    nombreCentroTrabajo: "",
    domicilioCentroTrabajo: "",
    actividadPrincipal: "",
    // b) Objetivo
    objetivoInforme: "",
    // c) Principales actividades realizadas
    actividadesRealizadas: "",
    // d) Método utilizado
    metodoUtilizado: "",
    // e) Resultados obtenidos
    resultadosObtenidos: "",
    nivelRiesgoGeneral: "bajo" as "bajo" | "medio" | "alto" | "muy_alto",
    // f) Conclusiones
    conclusiones: "",
    // g) Recomendaciones y acciones de intervención
    recomendaciones: "",
    accionesIntervencion: "",
    // h) Datos del responsable de la evaluación
    nombreResponsableEvaluacion: "",
    cedulaProfesional: "",
    responsableAplicacion: "",
    observaciones: "",
  });

  useEffect(() => {
    if (latestReport) {
      setFormData({
        periodoAplicacion: latestReport.periodoAplicacion || "",
        fechaInicio: latestReport.fechaInicio ? new Date(latestReport.fechaInicio).toISOString().split('T')[0] : "",
        fechaFin: latestReport.fechaFin ? new Date(latestReport.fechaFin).toISOString().split('T')[0] : "",
        guiaAplicada: latestReport.guiaAplicada || "guia-i",
        tamañoMuestra: latestReport.tamañoMuestra?.toString() || "",
        numeroTrabajadoresTotal: latestReport.numeroTrabajadoresTotal?.toString() || "",
        numeroTrabajadoresEncuestados: latestReport.numeroTrabajadoresEncuestados?.toString() || "",
        metodologiaAplicacion: latestReport.metodologiaAplicacion || "",
        nombreCentroTrabajo: latestReport.nombreCentroTrabajo || "",
        domicilioCentroTrabajo: latestReport.domicilioCentroTrabajo || "",
        actividadPrincipal: latestReport.actividadPrincipal || "",
        objetivoInforme: latestReport.objetivoInforme || "",
        actividadesRealizadas: latestReport.actividadesRealizadas || "",
        metodoUtilizado: latestReport.metodoUtilizado || "",
        resultadosObtenidos: latestReport.resultadosObtenidos || "",
        nivelRiesgoGeneral: latestReport.nivelRiesgoGeneral || "bajo",
        conclusiones: latestReport.conclusiones || "",
        recomendaciones: latestReport.recomendaciones || "",
        accionesIntervencion: latestReport.accionesIntervencion || "",
        nombreResponsableEvaluacion: latestReport.nombreResponsableEvaluacion || "",
        cedulaProfesional: latestReport.cedulaProfesional || "",
        responsableAplicacion: latestReport.responsableAplicacion || "",
        observaciones: latestReport.observaciones || "",
      });
    }
  }, [latestReport]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        periodoAplicacion: formData.periodoAplicacion,
        fechaInicio: formData.fechaInicio,
        fechaFin: formData.fechaFin,
        guiaAplicada: formData.guiaAplicada,
        tamañoMuestra: formData.tamañoMuestra ? parseInt(formData.tamañoMuestra) : 0,
        numeroTrabajadoresTotal: formData.numeroTrabajadoresTotal ? parseInt(formData.numeroTrabajadoresTotal) : 0,
        numeroTrabajadoresEncuestados: formData.numeroTrabajadoresEncuestados ? parseInt(formData.numeroTrabajadoresEncuestados) : 0,
        metodologiaAplicacion: formData.metodologiaAplicacion || undefined,
        nombreCentroTrabajo: formData.nombreCentroTrabajo || undefined,
        domicilioCentroTrabajo: formData.domicilioCentroTrabajo || undefined,
        actividadPrincipal: formData.actividadPrincipal || undefined,
        objetivoInforme: formData.objetivoInforme || undefined,
        actividadesRealizadas: formData.actividadesRealizadas || undefined,
        metodoUtilizado: formData.metodoUtilizado || undefined,
        resultadosObtenidos: formData.resultadosObtenidos || undefined,
        nivelRiesgoGeneral: formData.nivelRiesgoGeneral,
        conclusiones: formData.conclusiones || undefined,
        recomendaciones: formData.recomendaciones || undefined,
        accionesIntervencion: formData.accionesIntervencion || undefined,
        nombreResponsableEvaluacion: formData.nombreResponsableEvaluacion || undefined,
        cedulaProfesional: formData.cedulaProfesional || undefined,
        responsableAplicacion: formData.responsableAplicacion || undefined,
        observaciones: formData.observaciones || undefined,
      };

      if (latestReport) {
        await updateMutation.mutateAsync({ id: latestReport.id, ...payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      toast({
        title: "Datos guardados",
        description: "Los datos del reporte se han guardado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron guardar los datos",
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
    <Card>
      <CardHeader>
        <CardTitle>Datos del Reporte de Encuesta NOM-035</CardTitle>
        <CardDescription>
          Información requerida para el informe del Numeral 7.5 NOM-035-STPS-2018
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECCIÓN 1: DATOS BÁSICOS */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Datos Básicos de la Evaluación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodoAplicacion">Período de Aplicación *</Label>
                <Input
                  id="periodoAplicacion"
                  value={formData.periodoAplicacion}
                  onChange={(e) => setFormData({ ...formData, periodoAplicacion: e.target.value })}
                  placeholder="Ej: 2024-Q1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="guiaAplicada">Guía Aplicada *</Label>
                <Select
                  value={formData.guiaAplicada}
                  onValueChange={(value: "guia-i" | "guia-ii" | "guia-iii") => setFormData({ ...formData, guiaAplicada: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="guia-i">Guía I - Acontecimientos Traumáticos</SelectItem>
                    <SelectItem value="guia-ii">Guía II - Factores de Riesgo</SelectItem>
                    <SelectItem value="guia-iii">Guía III - Entorno Organizacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaInicio">Fecha de Inicio *</Label>
                <Input
                  id="fechaInicio"
                  type="date"
                  value={formData.fechaInicio}
                  onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaFin">Fecha de Fin *</Label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={formData.fechaFin}
                  onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numeroTrabajadoresTotal">Número Total de Trabajadores *</Label>
                <Input
                  id="numeroTrabajadoresTotal"
                  type="number"
                  value={formData.numeroTrabajadoresTotal}
                  onChange={(e) => setFormData({ ...formData, numeroTrabajadoresTotal: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="numeroTrabajadoresEncuestados">Número de Trabajadores Evaluados *</Label>
                <Input
                  id="numeroTrabajadoresEncuestados"
                  type="number"
                  value={formData.numeroTrabajadoresEncuestados}
                  onChange={(e) => setFormData({ ...formData, numeroTrabajadoresEncuestados: e.target.value })}
                  required
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: DATOS DEL CENTRO DE TRABAJO */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">a) Identificación del Centro de Trabajo</h3>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombreCentroTrabajo">Nombre, Denominación o Razón Social</Label>
                <Input
                  id="nombreCentroTrabajo"
                  value={formData.nombreCentroTrabajo}
                  onChange={(e) => setFormData({ ...formData, nombreCentroTrabajo: e.target.value })}
                  placeholder="Nombre completo de la empresa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="domicilioCentroTrabajo">Domicilio Completo</Label>
                <Textarea
                  id="domicilioCentroTrabajo"
                  value={formData.domicilioCentroTrabajo}
                  onChange={(e) => setFormData({ ...formData, domicilioCentroTrabajo: e.target.value })}
                  placeholder="Calle, número, colonia, código postal, municipio/delegación, entidad federativa"
                  rows={3}
                />
              </div>

              <AITextarea
                id="actividadPrincipal"
                label="Actividad Económica Principal"
                value={formData.actividadPrincipal}
                onChange={(value) => setFormData({ ...formData, actividadPrincipal: value })}
                placeholder="Descripción de la actividad económica principal del centro de trabajo"
                rows={2}
                fieldType="descripcion"
              />
            </div>
          </div>

          {/* SECCIÓN 3: OBJETIVO */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">b) Objetivo del Informe</h3>
            <AITextarea
              id="objetivoInforme"
              label="Objetivo"
              value={formData.objetivoInforme}
              onChange={(value) => setFormData({ ...formData, objetivoInforme: value })}
              placeholder="Objetivo de la evaluación de riesgos psicosociales"
              rows={3}
              fieldType="descripcion"
            />
          </div>

          {/* SECCIÓN 4: ACTIVIDADES REALIZADAS */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">c) Principales Actividades Realizadas</h3>
            <div className="space-y-2">
              <Label htmlFor="actividadesRealizadas">Actividades</Label>
              <Textarea
                id="actividadesRealizadas"
                value={formData.actividadesRealizadas}
                onChange={(e) => setFormData({ ...formData, actividadesRealizadas: e.target.value })}
                placeholder="Descripción de las principales actividades realizadas durante la evaluación"
                rows={4}
              />
            </div>
          </div>

          {/* SECCIÓN 5: MÉTODO UTILIZADO */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">d) Método Utilizado</h3>
            <div className="space-y-2">
              <Label htmlFor="metodoUtilizado">Método</Label>
              <Textarea
                id="metodoUtilizado"
                value={formData.metodoUtilizado}
                onChange={(e) => setFormData({ ...formData, metodoUtilizado: e.target.value })}
                placeholder="Descripción del método utilizado para la identificación y análisis de factores de riesgo psicosocial"
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="metodologiaAplicacion">Metodología de Aplicación</Label>
              <Textarea
                id="metodologiaAplicacion"
                value={formData.metodologiaAplicacion}
                onChange={(e) => setFormData({ ...formData, metodologiaAplicacion: e.target.value })}
                placeholder="Ej: Aplicación en línea, presencial, mixta"
                rows={2}
              />
            </div>
          </div>

          {/* SECCIÓN 6: RESULTADOS OBTENIDOS */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">e) Resultados Obtenidos</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resultadosObtenidos">Resultados</Label>
                <Textarea
                  id="resultadosObtenidos"
                  value={formData.resultadosObtenidos}
                  onChange={(e) => setFormData({ ...formData, resultadosObtenidos: e.target.value })}
                  placeholder="Descripción detallada de los resultados obtenidos en la evaluación"
                  rows={5}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nivelRiesgoGeneral">Nivel de Riesgo General</Label>
                <Select
                  value={formData.nivelRiesgoGeneral}
                  onValueChange={(value: "bajo" | "medio" | "alto" | "muy_alto") => setFormData({ ...formData, nivelRiesgoGeneral: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bajo">Bajo / Nulo</SelectItem>
                    <SelectItem value="medio">Medio</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                    <SelectItem value="muy_alto">Muy Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 7: CONCLUSIONES */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">f) Conclusiones</h3>
            <AITextarea
              id="conclusiones"
              label="Conclusiones"
              value={formData.conclusiones}
              onChange={(value) => setFormData({ ...formData, conclusiones: value })}
              placeholder="Conclusiones derivadas de la evaluación"
              rows={4}
              fieldType="descripcion"
            />
          </div>

          {/* SECCIÓN 8: RECOMENDACIONES */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">g) Recomendaciones y Acciones de Intervención</h3>
            <div className="space-y-4">
              <AITextarea
                id="recomendaciones"
                label="Recomendaciones"
                value={formData.recomendaciones}
                onChange={(value) => setFormData({ ...formData, recomendaciones: value })}
                placeholder="Recomendaciones para la prevención y control de factores de riesgo"
                rows={4}
                fieldType="descripcion"
              />

              <div className="space-y-2">
                <Label htmlFor="accionesIntervencion">Acciones de Intervención</Label>
                <Textarea
                  id="accionesIntervencion"
                  value={formData.accionesIntervencion}
                  onChange={(e) => setFormData({ ...formData, accionesIntervencion: e.target.value })}
                  placeholder="Acciones específicas de intervención a implementar"
                  rows={4}
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 9: DATOS DEL RESPONSABLE */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">h) Datos del Responsable de la Evaluación</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombreResponsableEvaluacion">Nombre Completo</Label>
                <Input
                  id="nombreResponsableEvaluacion"
                  value={formData.nombreResponsableEvaluacion}
                  onChange={(e) => setFormData({ ...formData, nombreResponsableEvaluacion: e.target.value })}
                  placeholder="Nombre completo del responsable"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cedulaProfesional">Cédula Profesional</Label>
                <Input
                  id="cedulaProfesional"
                  value={formData.cedulaProfesional}
                  onChange={(e) => setFormData({ ...formData, cedulaProfesional: e.target.value })}
                  placeholder="Número de cédula profesional (si aplica)"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 10: OBSERVACIONES */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Observaciones Adicionales</h3>
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                placeholder="Observaciones adicionales sobre la evaluación"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              <Save className="mr-2 h-4 w-4" />
              {latestReport ? "Actualizar Datos" : "Guardar Datos"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
