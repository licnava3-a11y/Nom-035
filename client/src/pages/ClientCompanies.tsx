import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Breadcrumb } from "@/components/Breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Plus, Pencil, Trash2, Star, StarOff, Search, ToggleLeft, ToggleRight, Upload } from "lucide-react";

const EMPTY_FORM = {
  razonSocial: "",
  rfc: "",
  representanteLegal: "",
  domicilio: "",
  municipio: "",
  estado: "",
  codigoPostal: "",
  telefono: "",
  email: "",
  registroPatronal: "",
  giro: "",
  scian: "",
  numTrabajadores: undefined as number | undefined,
  notas: "",
};

type FormState = typeof EMPTY_FORM;

export default function ClientCompanies() {
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data: companies, isLoading } = trpc.dc3ClientCompanies.list.useQuery({
    search: search || undefined,
    includeInactive: showInactive,
  });

  const createMutation = trpc.dc3ClientCompanies.create.useMutation({
    onSuccess: () => { utils.dc3ClientCompanies.list.invalidate(); setShowDialog(false); setForm(EMPTY_FORM); },
    onError: (e) => alert(e.message),
  });

  const updateMutation = trpc.dc3ClientCompanies.update.useMutation({
    onSuccess: () => { utils.dc3ClientCompanies.list.invalidate(); setShowDialog(false); setEditId(null); setForm(EMPTY_FORM); },
    onError: (e) => alert(e.message),
  });

  const deleteMutation = trpc.dc3ClientCompanies.delete.useMutation({
    onSuccess: () => { utils.dc3ClientCompanies.list.invalidate(); setDeleteId(null); },
    onError: (e) => alert(e.message),
  });

  const setDefaultMutation = trpc.dc3ClientCompanies.setDefault.useMutation({
    onSuccess: () => utils.dc3ClientCompanies.list.invalidate(),
    onError: (e) => alert(e.message),
  });

  const toggleActiveMutation = trpc.dc3ClientCompanies.toggleActive.useMutation({
    onSuccess: () => utils.dc3ClientCompanies.list.invalidate(),
    onError: (e) => alert(e.message),
  });

  const uploadLogoMutation = trpc.dc3ClientCompanies.uploadLogo.useMutation({
    onSuccess: () => { utils.dc3ClientCompanies.list.invalidate(); setUploadingLogo(null); setLogoFile(null); },
    onError: (e) => { alert(e.message); setUploadingLogo(null); },
  });

  const handleOpenNew = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowDialog(true);
  };

  const handleOpenEdit = (company: any) => {
    setEditId(company.id);
    setForm({
      razonSocial: company.razonSocial ?? "",
      rfc: company.rfc ?? "",
      representanteLegal: company.representanteLegal ?? "",
      domicilio: company.domicilio ?? "",
      municipio: company.municipio ?? "",
      estado: company.estado ?? "",
      codigoPostal: company.codigoPostal ?? "",
      telefono: company.telefono ?? "",
      email: company.email ?? "",
      registroPatronal: company.registroPatronal ?? "",
      giro: company.giro ?? "",
      scian: company.scian ?? "",
      numTrabajadores: company.numTrabajadores ?? undefined,
      notas: company.notas ?? "",
    });
    setShowDialog(true);
  };

  const handleSave = () => {
    const payload = {
      ...form,
      numTrabajadores: form.numTrabajadores ? Number(form.numTrabajadores) : undefined,
      email: form.email || undefined,
    };
    if (editId) {
      updateMutation.mutate({ id: editId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleLogoUpload = async (companyId: number) => {
    if (!logoFile) return;
    setUploadingLogo(companyId);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      uploadLogoMutation.mutate({
        id: companyId,
        fileData: base64,
        fileName: logoFile.name,
        mimeType: logoFile.type,
      });
    };
    reader.readAsDataURL(logoFile);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="container mx-auto py-8">
      <Breadcrumb items={[
        { label: "DC-3 / Constancias", href: "/dc3" },
        { label: "Catálogo de Empresas Cliente" },
      ]} />

      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            Catálogo de Empresas Cliente
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona las empresas para las que emites constancias DC-3. La empresa predeterminada se prellenará automáticamente en el formulario.
          </p>
        </div>
        <Button onClick={handleOpenNew}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Empresa
        </Button>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, RFC o representante..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant={showInactive ? "default" : "outline"}
          size="sm"
          onClick={() => setShowInactive((v) => !v)}
        >
          {showInactive ? <ToggleRight className="mr-2 h-4 w-4" /> : <ToggleLeft className="mr-2 h-4 w-4" />}
          {showInactive ? "Mostrando inactivas" : "Solo activas"}
        </Button>
      </div>

      {/* Lista de empresas */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : !companies || companies.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sin empresas registradas</h3>
            <p className="text-muted-foreground mb-4">
              Agrega empresas cliente para prellenar automáticamente los datos en el formulario DC-3.
            </p>
            <Button onClick={handleOpenNew}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Primera Empresa
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company: any) => (
            <Card
              key={company.id}
              className={`relative transition-shadow hover:shadow-lg ${company.isDefault ? "ring-2 ring-primary" : ""} ${!company.isActive ? "opacity-60" : ""}`}
            >
              {company.isDefault && (
                <div className="absolute top-3 right-3">
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    <Star className="mr-1 h-3 w-3" />
                    Predeterminada
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt="Logo" className="w-12 h-12 object-contain rounded border" />
                  ) : (
                    <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-tight truncate pr-20">{company.razonSocial}</CardTitle>
                    <CardDescription className="font-mono text-xs">{company.rfc}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-1 text-sm text-muted-foreground">
                {company.representanteLegal && (
                  <p><span className="font-medium text-foreground">Rep. Legal:</span> {company.representanteLegal}</p>
                )}
                {company.registroPatronal && (
                  <p><span className="font-medium text-foreground">Reg. Patronal:</span> {company.registroPatronal}</p>
                )}
                {company.giro && (
                  <p><span className="font-medium text-foreground">Giro:</span> {company.giro}</p>
                )}
                {company.municipio && company.estado && (
                  <p><span className="font-medium text-foreground">Ubicación:</span> {company.municipio}, {company.estado}</p>
                )}
                {company.numTrabajadores && (
                  <p><span className="font-medium text-foreground">Trabajadores:</span> {company.numTrabajadores.toLocaleString()}</p>
                )}

                {/* Acciones */}
                <div className="flex flex-wrap gap-1 pt-3 border-t mt-3">
                  <Button size="sm" variant="outline" onClick={() => handleOpenEdit(company)}>
                    <Pencil className="h-3 w-3 mr-1" />
                    Editar
                  </Button>
                  {!company.isDefault && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDefaultMutation.mutate({ id: company.id })}
                      title="Establecer como empresa predeterminada"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      Predeterminar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleActiveMutation.mutate({ id: company.id, isActive: !company.isActive })}
                  >
                    {company.isActive ? <ToggleRight className="h-3 w-3 mr-1" /> : <ToggleLeft className="h-3 w-3 mr-1" />}
                    {company.isActive ? "Desactivar" : "Activar"}
                  </Button>
                  {/* Upload logo */}
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) { setLogoFile(f); handleLogoUpload(company.id); }
                      }}
                    />
                    <Button size="sm" variant="outline" asChild>
                      <span>
                        <Upload className="h-3 w-3 mr-1" />
                        Logo
                      </span>
                    </Button>
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(company.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Diálogo Crear/Editar */}
      <Dialog open={showDialog} onOpenChange={(o) => { if (!o) { setShowDialog(false); setEditId(null); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Editar Empresa Cliente" : "Nueva Empresa Cliente"}</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            {/* Razón Social */}
            <div className="md:col-span-2 space-y-1">
              <Label>Razón Social *</Label>
              <Input value={form.razonSocial} onChange={(e) => setForm((f) => ({ ...f, razonSocial: e.target.value }))} placeholder="Empresa S.A. de C.V." />
            </div>
            {/* RFC */}
            <div className="space-y-1">
              <Label>RFC *</Label>
              <Input value={form.rfc} onChange={(e) => setForm((f) => ({ ...f, rfc: e.target.value.toUpperCase() }))} placeholder="XAXX010101000" maxLength={13} className="font-mono" />
            </div>
            {/* Registro Patronal */}
            <div className="space-y-1">
              <Label>Registro Patronal IMSS</Label>
              <Input value={form.registroPatronal} onChange={(e) => setForm((f) => ({ ...f, registroPatronal: e.target.value.toUpperCase() }))} placeholder="A1234567890" className="font-mono" />
            </div>
            {/* Representante Legal */}
            <div className="md:col-span-2 space-y-1">
              <Label>Representante Legal</Label>
              <Input value={form.representanteLegal} onChange={(e) => setForm((f) => ({ ...f, representanteLegal: e.target.value }))} placeholder="Nombre completo del representante" />
            </div>
            {/* Domicilio */}
            <div className="md:col-span-2 space-y-1">
              <Label>Domicilio Fiscal</Label>
              <Input value={form.domicilio} onChange={(e) => setForm((f) => ({ ...f, domicilio: e.target.value }))} placeholder="Calle, Número, Colonia" />
            </div>
            {/* Municipio */}
            <div className="space-y-1">
              <Label>Municipio / Alcaldía</Label>
              <Input value={form.municipio} onChange={(e) => setForm((f) => ({ ...f, municipio: e.target.value }))} />
            </div>
            {/* Estado */}
            <div className="space-y-1">
              <Label>Estado</Label>
              <Input value={form.estado} onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))} />
            </div>
            {/* CP */}
            <div className="space-y-1">
              <Label>Código Postal</Label>
              <Input value={form.codigoPostal} onChange={(e) => setForm((f) => ({ ...f, codigoPostal: e.target.value }))} maxLength={5} className="font-mono" />
            </div>
            {/* Teléfono */}
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} />
            </div>
            {/* Email */}
            <div className="space-y-1">
              <Label>Correo Electrónico</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </div>
            {/* Giro */}
            <div className="space-y-1">
              <Label>Giro / Actividad</Label>
              <Input value={form.giro} onChange={(e) => setForm((f) => ({ ...f, giro: e.target.value }))} />
            </div>
            {/* SCIAN */}
            <div className="space-y-1">
              <Label>Código SCIAN</Label>
              <Input value={form.scian} onChange={(e) => setForm((f) => ({ ...f, scian: e.target.value }))} placeholder="ej. 461110" className="font-mono" />
            </div>
            {/* Num trabajadores */}
            <div className="space-y-1">
              <Label>Número de Trabajadores</Label>
              <Input
                type="number"
                min={1}
                value={form.numTrabajadores ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, numTrabajadores: e.target.value ? parseInt(e.target.value) : undefined }))}
              />
            </div>
            {/* Notas */}
            <div className="md:col-span-2 space-y-1">
              <Label>Notas internas</Label>
              <Textarea value={form.notas} onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))} rows={2} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditId(null); setForm(EMPTY_FORM); }}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !form.razonSocial || !form.rfc}>
              {isSaving ? "Guardando..." : editId ? "Actualizar" : "Crear Empresa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <AlertDialog open={deleteId !== null} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar empresa?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente. Las constancias DC-3 ya emitidas no se verán afectadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate({ id: deleteId })}
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
