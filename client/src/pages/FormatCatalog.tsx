import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  Loader2,
  Plus,
  CheckCircle2,
  Star,
  Pencil,
  Trash2,
  BookOpen,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface FormatEntry {
  id: number;
  code: string;
  name: string;
  version: string;
  versionDate: string | Date;
  reference: string | null;
  changeNotes: string | null;
  isActive: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

// ─── Formulario de nueva versión ──────────────────────────────────────────────

interface FormData {
  code: string;
  name: string;
  version: string;
  versionDate: string;
  reference: string;
  changeNotes: string;
  setActive: boolean;
}

const DEFAULT_FORM: FormData = {
  code: "DC-3",
  name: "Constancia de Competencias o Habilidades Laborales",
  version: "",
  versionDate: new Date().toISOString().slice(0, 10),
  reference: "NOM-035-STPS-2018",
  changeNotes: "",
  setActive: false,
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function FormatCatalog() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editEntry, setEditEntry] = useState<FormatEntry | null>(null);
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [filterCode, setFilterCode] = useState("DC-3");

  const utils = trpc.useUtils();

  const listQuery = trpc.formatCatalog.list.useQuery(
    { code: filterCode || undefined },
    { staleTime: 30_000 }
  );

  const createMutation = trpc.formatCatalog.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Versión creada",
        description: "La nueva versión fue registrada exitosamente.",
      });
      utils.formatCatalog.list.invalidate();
      setShowCreate(false);
      setForm(DEFAULT_FORM);
    },
    onError: e =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = trpc.formatCatalog.update.useMutation({
    onSuccess: () => {
      toast({ title: "Versión actualizada" });
      utils.formatCatalog.list.invalidate();
      setEditEntry(null);
    },
    onError: e =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const setActiveMutation = trpc.formatCatalog.setActive.useMutation({
    onSuccess: () => {
      toast({
        title: "Versión activada",
        description: "Esta versión se usará en los nuevos PDFs DC-3.",
      });
      utils.formatCatalog.list.invalidate();
    },
    onError: e =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = trpc.formatCatalog.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Versión eliminada" });
      utils.formatCatalog.list.invalidate();
    },
    onError: e =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleCreate = () => {
    if (!form.code || !form.name || !form.version || !form.versionDate) {
      toast({
        title: "Campos requeridos",
        description: "Complete todos los campos obligatorios.",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(form);
  };

  const handleUpdate = () => {
    if (!editEntry) return;
    updateMutation.mutate({
      id: editEntry.id,
      name: form.name,
      version: form.version,
      versionDate: form.versionDate,
      reference: form.reference || undefined,
      changeNotes: form.changeNotes || undefined,
    });
  };

  const openEdit = (entry: FormatEntry) => {
    setEditEntry(entry);
    setForm({
      code: entry.code,
      name: entry.name,
      version: entry.version,
      versionDate: String(entry.versionDate).slice(0, 10),
      reference: entry.reference ?? "",
      changeNotes: entry.changeNotes ?? "",
      setActive: false,
    });
  };

  const entries = (listQuery.data ?? []) as FormatEntry[];
  const activeEntry = entries.find(e => e.isActive);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" />
              Catálogo de Formatos
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gestione las versiones oficiales de los formatos DC-3 y otros
              documentos normativos. La versión activa se usa para generar el
              folio en los PDFs.
            </p>
          </div>
          <Button
            onClick={() => {
              setShowCreate(true);
              setForm(DEFAULT_FORM);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva versión
          </Button>
        </div>

        {/* Versión activa */}
        {activeEntry && (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800 text-sm">
                Versión activa: {activeEntry.code} v{activeEntry.version}
              </p>
              <p className="text-green-700 text-xs mt-0.5">
                Vigente desde {String(activeEntry.versionDate).slice(0, 10)} ·
                Referencia: {activeEntry.reference ?? "—"}
              </p>
              <p className="text-green-700 text-xs mt-0.5">
                Nomenclatura de folio:{" "}
                <strong>
                  {activeEntry.code}-XXXX/{new Date().getFullYear()}
                </strong>
              </p>
            </div>
          </div>
        )}

        {/* Filtro */}
        <div className="flex items-center gap-2">
          <Label className="text-sm shrink-0">Filtrar por código:</Label>
          <Input
            value={filterCode}
            onChange={e => setFilterCode(e.target.value)}
            placeholder="DC-3, DC-4, F-001…"
            className="max-w-[180px]"
          />
          {filterCode && (
            <Button variant="ghost" size="sm" onClick={() => setFilterCode("")}>
              Ver todos
            </Button>
          )}
        </div>

        {/* Tabla */}
        {listQuery.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando catálogo…
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No hay versiones registradas para este código.</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Versión</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Cambios</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map(entry => (
                  <TableRow
                    key={entry.id}
                    className={entry.isActive ? "bg-green-50/50" : ""}
                  >
                    <TableCell className="font-mono font-semibold">
                      {entry.code}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">v{entry.version}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {String(entry.versionDate).slice(0, 10)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">
                      {entry.reference ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {entry.changeNotes ?? "—"}
                    </TableCell>
                    <TableCell>
                      {entry.isActive ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          <Star className="w-3 h-3 mr-1" />
                          Activa
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Inactiva
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!entry.isActive && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-700 hover:text-green-900 hover:bg-green-50"
                            onClick={() =>
                              setActiveMutation.mutate({ id: entry.id })
                            }
                            disabled={setActiveMutation.isPending}
                            title="Activar esta versión"
                          >
                            <Star className="w-3.5 h-3.5 mr-1" />
                            Activar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(entry)}
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        {!entry.isActive && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-800 hover:bg-red-50"
                            onClick={() => {
                              if (
                                confirm(
                                  `¿Eliminar la versión ${entry.version} del formato ${entry.code}?`
                                )
                              ) {
                                deleteMutation.mutate({ id: entry.id });
                              }
                            }}
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Nota informativa */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            La <strong>versión activa</strong> se utiliza automáticamente al
            generar el PDF de las constancias DC-3. El folio del documento sigue
            la nomenclatura: <strong>CÓDIGO-CONSECUTIVO/AÑO</strong> (ej.
            DC-3-0001/2024).
          </p>
        </div>
      </div>

      {/* Dialog: Crear nueva versión */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva versión de formato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Código del formato *</Label>
                <Input
                  value={form.code}
                  onChange={e =>
                    setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))
                  }
                  placeholder="DC-3"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Versión *</Label>
                <Input
                  value={form.version}
                  onChange={e =>
                    setForm(f => ({ ...f, version: e.target.value }))
                  }
                  placeholder="2.1"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nombre del formato *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Fecha de vigencia *</Label>
                <Input
                  type="date"
                  value={form.versionDate}
                  onChange={e =>
                    setForm(f => ({ ...f, versionDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Referencia normativa</Label>
                <Input
                  value={form.reference}
                  onChange={e =>
                    setForm(f => ({ ...f, reference: e.target.value }))
                  }
                  placeholder="NOM-035-STPS-2018"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notas de cambios</Label>
              <Textarea
                value={form.changeNotes}
                onChange={e =>
                  setForm(f => ({ ...f, changeNotes: e.target.value }))
                }
                placeholder="Describa los cambios principales de esta versión…"
                rows={3}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.setActive}
                onChange={e =>
                  setForm(f => ({ ...f, setActive: e.target.checked }))
                }
                className="rounded"
              />
              <span className="text-sm">
                Activar esta versión inmediatamente
              </span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Guardar versión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar versión */}
      <Dialog
        open={!!editEntry}
        onOpenChange={open => !open && setEditEntry(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Editar versión: {editEntry?.code} v{editEntry?.version}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Versión</Label>
                <Input
                  value={form.version}
                  onChange={e =>
                    setForm(f => ({ ...f, version: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de vigencia</Label>
                <Input
                  type="date"
                  value={form.versionDate}
                  onChange={e =>
                    setForm(f => ({ ...f, versionDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nombre del formato</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Referencia normativa</Label>
              <Input
                value={form.reference}
                onChange={e =>
                  setForm(f => ({ ...f, reference: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Notas de cambios</Label>
              <Textarea
                value={form.changeNotes}
                onChange={e =>
                  setForm(f => ({ ...f, changeNotes: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntry(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Guardar cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
