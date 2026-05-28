import { useState, useRef } from "react";
import { useLocation } from "wouter";
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
  Upload,
  Download,
  History,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
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

const emptyForm: FormData = { name: "", email: "", position: "", department: "" };

function downloadTemplate() {
  import("xlsx").then((XLSX) => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["nombre", "correo", "cargo", "area"],
      ["María González López", "m.gonzalez@empresa.com", "Coordinadora de RH", "Recursos Humanos"],
      ["Juan Pérez Ramírez", "j.perez@empresa.com", "Gerente de Operaciones", "Operaciones"],
      ["Ana Torres Vega", "a.torres@empresa.com", "Directora General", "Dirección"],
    ]);
    ws["!cols"] = [{ wch: 30 }, { wch: 35 }, { wch: 35 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Destinatarios");
    XLSX.writeFile(wb, "plantilla_destinatarios.xlsx");
  });
}

export default function MinuteRecipients() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState("");
  const [onlyActive, setOnlyActive] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<FormData>>({});
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importPreviewReady, setImportPreviewReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: recipients = [], isLoading } = trpc.minuteRecipients.list.useQuery({
    search: search.trim() || undefined,
    onlyActive,
  });

  const createMutation = trpc.minuteRecipients.create.useMutation({
    onSuccess: () => { utils.minuteRecipients.list.invalidate(); toast({ title: "Destinatario creado" }); handleCloseForm(); },
    onError: (err) => toast({ title: "Error al crear", description: err.message, variant: "destructive" }),
  });

  const updateMutation = trpc.minuteRecipients.update.useMutation({
    onSuccess: () => { utils.minuteRecipients.list.invalidate(); toast({ title: "Destinatario actualizado" }); handleCloseForm(); },
    onError: (err) => toast({ title: "Error al actualizar", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = trpc.minuteRecipients.delete.useMutation({
    onSuccess: () => { utils.minuteRecipients.list.invalidate(); toast({ title: "Destinatario eliminado" }); setDeleteId(null); },
    onError: (err) => toast({ title: "Error al eliminar", description: err.message, variant: "destructive" }),
  });

  const toggleActiveMutation = trpc.minuteRecipients.toggleActive.useMutation({
    onSuccess: (_, variables) => {
      utils.minuteRecipients.list.invalidate();
      toast({ title: variables.isActive ? "Destinatario activado" : "Destinatario desactivado" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const bulkImportMutation = trpc.minuteRecipients.bulkImport.useMutation({
    onSuccess: (result) => {
      utils.minuteRecipients.list.invalidate();
      toast({
        title: "Importación completada",
        description: `${result.created} creados, ${result.updated} actualizados${result.errors.length > 0 ? `, ${result.errors.length} errores` : ""}.`,
        variant: result.errors.length > 0 ? "destructive" : "default",
      });
      setIsImportOpen(false);
      setImportRows([]);
      setImportPreviewReady(false);
    },
    onError: (err) => toast({ title: "Error en importación", description: err.message, variant: "destructive" }),
  });

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {};
    if (!formData.name.trim() || formData.name.trim().length < 2) errors.name = "El nombre debe tener al menos 2 caracteres.";
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Ingresa un correo electrónico válido.";
    if (!formData.position.trim() || formData.position.trim().length < 2) errors.position = "El cargo debe tener al menos 2 caracteres.";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenCreate = () => { setEditingId(null); setFormData(emptyForm); setFormErrors({}); setIsFormOpen(true); };
  const handleOpenEdit = (r: Recipient) => { setEditingId(r.id); setFormData({ name: r.name, email: r.email, position: r.position, department: r.department ?? "" }); setFormErrors({}); setIsFormOpen(true); };
  const handleCloseForm = () => { setIsFormOpen(false); setEditingId(null); setFormData(emptyForm); setFormErrors({}); };

  const handleSubmit = () => {
    if (!validateForm()) return;
    const payload = { name: formData.name.trim(), email: formData.email.trim(), position: formData.position.trim(), department: formData.department.trim() || null };
    if (editingId !== null) { updateMutation.mutate({ id: editingId, data: payload }); }
    else { createMutation.mutate(payload); }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const XLSX = await import("xlsx");
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    const normalize = (row: any) => ({
      name: (row["nombre"] || row["name"] || row["Nombre"] || "").toString().trim(),
      email: (row["correo"] || row["email"] || row["Correo"] || row["Email"] || "").toString().trim(),
      position: (row["cargo"] || row["position"] || row["Cargo"] || row["puesto"] || "").toString().trim(),
      department: (row["area"] || row["área"] || row["department"] || row["Area"] || row["Área"] || "").toString().trim() || null,
    });
    const errors: string[] = [];
    const validRows: any[] = [];
    rawRows.forEach((row, i) => {
      const n = normalize(row);
      if (!n.name) { errors.push(`Fila ${i + 2}: nombre vacío`); return; }
      if (!n.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(n.email)) { errors.push(`Fila ${i + 2}: correo inválido (${n.email})`); return; }
      if (!n.position) { errors.push(`Fila ${i + 2}: cargo vacío`); return; }
      validRows.push(n);
    });
    setImportRows(validRows);
    setImportErrors(errors);
    setImportPreviewReady(true);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const activeCount = recipients.filter((r) => r.isActive).length;
  const totalCount = recipients.length;

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb items={[{ label: "Cumplimiento Normativo" }, { label: "Comité de Seguridad" }, { label: "Catálogo de Destinatarios" }]} />

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-foreground">Catálogo de Destinatarios</h1>
        <p className="text-sm text-muted-foreground">Gestiona los destinatarios para el envío formal de minutas de reunión.</p>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          { icon: <Users className="h-5 w-5 text-primary" />, bg: "bg-primary/10", label: "Total", value: totalCount, color: "" },
          { icon: <UserCheck className="h-5 w-5 text-green-600" />, bg: "bg-green-500/10", label: "Activos", value: activeCount, color: "text-green-600" },
          { icon: <UserX className="h-5 w-5 text-muted-foreground" />, bg: "bg-muted", label: "Inactivos", value: totalCount - activeCount, color: "text-muted-foreground" },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border bg-card p-4 flex items-center gap-3">
            <div className={`p-2 rounded-md ${card.bg}`}>{card.icon}</div>
            <div><p className="text-xs text-muted-foreground">{card.label}</p><p className={`text-2xl font-bold ${card.color}`}>{card.value}</p></div>
          </div>
        ))}
      </div>

      {/* Barra de herramientas */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nombre, correo, cargo o área..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={onlyActive ? "default" : "outline"} size="sm" onClick={() => setOnlyActive(!onlyActive)} className="gap-1.5">
                <Filter className="h-4 w-4" />{onlyActive ? "Solo activos" : "Todos"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{onlyActive ? "Mostrando solo activos. Clic para ver todos." : "Clic para mostrar solo activos."}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="gap-1.5">
                <Upload className="h-4 w-4" />Importar XLSX
              </Button>
            </TooltipTrigger>
            <TooltipContent>Cargar destinatarios desde archivo Excel</TooltipContent>
          </Tooltip>
          <Button onClick={handleOpenCreate} className="gap-2"><Plus className="h-4 w-4" />Agregar Destinatario</Button>
        </div>
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
                <TableRow key={i}>{Array.from({ length: 6 }).map((_, j) => (<TableCell key={j}><div className="h-4 bg-muted animate-pulse rounded" /></TableCell>))}</TableRow>
              ))
            ) : recipients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="h-10 w-10 opacity-30" />
                    <p className="font-medium">{search ? "No se encontraron destinatarios con ese criterio." : "No hay destinatarios registrados."}</p>
                    {!search && (
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={handleOpenCreate} className="gap-1.5"><Plus className="h-4 w-4" />Agregar el primero</Button>
                        <Button variant="outline" size="sm" onClick={() => setIsImportOpen(true)} className="gap-1.5"><Upload className="h-4 w-4" />Importar XLSX</Button>
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              recipients.map((recipient) => (
                <TableRow key={recipient.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-medium">{recipient.name}</TableCell>
                  <TableCell>
                    <a href={`mailto:${recipient.email}`} className="flex items-center gap-1.5 text-primary hover:underline text-sm">
                      <Mail className="h-3.5 w-3.5" />{recipient.email}
                    </a>
                  </TableCell>
                  <TableCell className="text-sm">{recipient.position}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{recipient.department || <span className="italic opacity-50">—</span>}</TableCell>
                  <TableCell className="text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => toggleActiveMutation.mutate({ id: recipient.id, isActive: !recipient.isActive })} disabled={toggleActiveMutation.isPending} className="inline-flex">
                          <Badge variant={recipient.isActive ? "default" : "secondary"} className={`cursor-pointer select-none transition-opacity ${recipient.isActive ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200" : "opacity-60 hover:opacity-80"}`}>
                            {recipient.isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{recipient.isActive ? "Clic para desactivar" : "Clic para activar"}</TooltipContent>
                    </Tooltip>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => setLocation(`/committee/minute-recipients/${recipient.id}/history`)}>
                            <History className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Ver historial de envíos</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(recipient)}><Pencil className="h-4 w-4" /></Button>
                        </TooltipTrigger>
                        <TooltipContent>Editar</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteId(recipient.id)}>
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

      {totalCount > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {totalCount} destinatario{totalCount !== 1 ? "s" : ""} en el catálogo{onlyActive && ` · ${activeCount} activo${activeCount !== 1 ? "s" : ""}`}
        </p>
      )}

      {/* Modal importación masiva */}
      <Dialog open={isImportOpen} onOpenChange={(open) => { if (!open) { setIsImportOpen(false); setImportRows([]); setImportErrors([]); setImportPreviewReady(false); } }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" />Importar Destinatarios desde Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-medium">Instrucciones:</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>El archivo debe tener las columnas: <strong>nombre, correo, cargo, area</strong></li>
                <li>Los registros existentes (mismo correo) serán actualizados automáticamente</li>
                <li>Los nuevos registros se crearán como activos</li>
              </ul>
              <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 mt-2"><Download className="h-4 w-4" />Descargar plantilla de ejemplo</Button>
            </div>
            <div className="space-y-2">
              <Label>Seleccionar archivo XLSX</Label>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" id="xlsx-import" />
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2"><Upload className="h-4 w-4" />Seleccionar archivo</Button>
                {importPreviewReady && <span className="text-sm text-muted-foreground">{importRows.length} fila(s) válidas cargadas</span>}
              </div>
            </div>
            {importErrors.length > 0 && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1">
                <div className="flex items-center gap-2 text-destructive text-sm font-medium"><AlertCircle className="h-4 w-4" />{importErrors.length} fila(s) con errores (serán omitidas):</div>
                <ul className="text-xs text-destructive/80 space-y-0.5 list-disc list-inside">
                  {importErrors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                  {importErrors.length > 5 && <li>... y {importErrors.length - 5} más</li>}
                </ul>
              </div>
            )}
            {importPreviewReady && importRows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-green-700"><CheckCircle2 className="h-4 w-4" />Vista previa — {importRows.length} destinatario(s) a importar:</div>
                <div className="rounded-lg border overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader><TableRow className="bg-muted/50"><TableHead className="text-xs">Nombre</TableHead><TableHead className="text-xs">Correo</TableHead><TableHead className="text-xs">Cargo</TableHead><TableHead className="text-xs">Área</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {importRows.slice(0, 10).map((row, i) => (
                          <TableRow key={i}><TableCell className="text-xs py-1.5">{row.name}</TableCell><TableCell className="text-xs py-1.5">{row.email}</TableCell><TableCell className="text-xs py-1.5">{row.position}</TableCell><TableCell className="text-xs py-1.5 text-muted-foreground">{row.department || "—"}</TableCell></TableRow>
                        ))}
                        {importRows.length > 10 && <TableRow><TableCell colSpan={4} className="text-xs text-center text-muted-foreground py-2">... y {importRows.length - 10} más</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsImportOpen(false); setImportRows([]); setImportErrors([]); setImportPreviewReady(false); }}>Cancelar</Button>
            <Button onClick={() => bulkImportMutation.mutate({ rows: importRows })} disabled={importRows.length === 0 || bulkImportMutation.isPending} className="gap-2">
              {bulkImportMutation.isPending ? "Importando..." : <><Upload className="h-4 w-4" />Importar {importRows.length > 0 ? `${importRows.length} registros` : ""}</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal formulario */}
      <Dialog open={isFormOpen} onOpenChange={(open) => !open && handleCloseForm()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingId !== null ? "Editar Destinatario" : "Agregar Destinatario"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre completo <span className="text-destructive">*</span></Label>
              <Input id="name" placeholder="Ej. María González López" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className={formErrors.name ? "border-destructive" : ""} />
              {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Correo electrónico <span className="text-destructive">*</span></Label>
              <Input id="email" type="email" placeholder="Ej. m.gonzalez@empresa.com" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className={formErrors.email ? "border-destructive" : ""} />
              {formErrors.email && <p className="text-xs text-destructive">{formErrors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="position">Cargo <span className="text-destructive">*</span></Label>
              <Input id="position" placeholder="Ej. Coordinadora de Recursos Humanos" value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className={formErrors.position ? "border-destructive" : ""} />
              {formErrors.position && <p className="text-xs text-destructive">{formErrors.position}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="department">Área / Departamento <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input id="department" placeholder="Ej. Recursos Humanos" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCloseForm}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? "Guardando..." : editingId !== null ? "Guardar cambios" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminación */}
      <AlertDialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar destinatario?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción no se puede deshacer. El destinatario será removido permanentemente del catálogo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
