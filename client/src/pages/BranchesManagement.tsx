import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Plus,
  Pencil,
  PowerOff,
  Power,
  Search,
  MapPin,
  Phone,
} from "lucide-react";
import { toast } from "sonner";

interface BranchForm {
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
}

const emptyForm: BranchForm = {
  name: "",
  address: "",
  city: "",
  state: "",
  phone: "",
};

export default function BranchesManagement() {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<BranchForm>(emptyForm);
  const [confirmToggleId, setConfirmToggleId] = useState<number | null>(null);
  const [confirmToggleActive, setConfirmToggleActive] = useState(false);

  const { data: branches = [], isLoading } = trpc.branches.listAll.useQuery();

  const createMutation = trpc.branches.create.useMutation({
    onSuccess: () => {
      utils.branches.listAll.invalidate();
      utils.branches.list.invalidate();
      toast.success("Sucursal creada correctamente");
      setShowForm(false);
      setForm(emptyForm);
    },
    onError: e => toast.error(e.message),
  });

  const updateMutation = trpc.branches.update.useMutation({
    onSuccess: () => {
      utils.branches.listAll.invalidate();
      utils.branches.list.invalidate();
      toast.success("Sucursal actualizada");
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: e => toast.error(e.message),
  });

  const toggleMutation = trpc.branches.update.useMutation({
    onSuccess: () => {
      utils.branches.listAll.invalidate();
      utils.branches.list.invalidate();
      toast.success("Estado de la sucursal actualizado");
      setConfirmToggleId(null);
    },
    onError: e => toast.error(e.message),
  });

  const filtered = branches.filter(b =>
    [b.name, b.city, b.state, b.address].some(v =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(b: (typeof branches)[0]) {
    setEditingId(b.id);
    setForm({
      name: b.name,
      address: b.address ?? "",
      city: b.city ?? "",
      state: b.state ?? "",
      phone: b.phone ?? "",
    });
    setShowForm(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast.error("El nombre de la sucursal es obligatorio");
      return;
    }
    if (editingId !== null) {
      updateMutation.mutate({
        id: editingId,
        name: form.name.trim(),
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        phone: form.phone.trim() || null,
      });
    } else {
      createMutation.mutate({
        name: form.name.trim(),
        address: form.address.trim() || undefined,
        city: form.city.trim() || undefined,
        state: form.state.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
    }
  }

  function requestToggle(id: number, currentActive: boolean) {
    setConfirmToggleId(id);
    setConfirmToggleActive(currentActive);
  }

  function confirmToggle() {
    if (confirmToggleId === null) return;
    toggleMutation.mutate({
      id: confirmToggleId,
      isActive: !confirmToggleActive,
    });
  }

  const activeBranches = branches.filter(b => b.isActive).length;
  const inactiveBranches = branches.filter(b => !b.isActive).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sucursales</h1>
            <p className="text-sm text-slate-500">
              Gestión de sucursales y centros de trabajo
            </p>
          </div>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nueva Sucursal
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-slate-500">Total</p>
          <p className="text-3xl font-bold text-slate-900">{branches.length}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-slate-500">Activas</p>
          <p className="text-3xl font-bold text-green-600">{activeBranches}</p>
        </div>
        <div className="bg-white border rounded-lg p-4">
          <p className="text-sm text-slate-500">Inactivas</p>
          <p className="text-3xl font-bold text-slate-400">
            {inactiveBranches}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Buscar por nombre, ciudad, estado..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead>Nombre</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead>Ciudad / Estado</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-8 text-slate-400"
                >
                  Cargando sucursales...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-12 text-slate-400"
                >
                  <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No hay sucursales registradas</p>
                  <p className="text-sm mt-1">
                    Haz clic en "Nueva Sucursal" para comenzar
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(branch => (
                <TableRow
                  key={branch.id}
                  className={!branch.isActive ? "opacity-50" : ""}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-slate-400" />
                      {branch.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {branch.address ? (
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        {branch.address}
                      </div>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-slate-600">
                      {[branch.city, branch.state].filter(Boolean).join(", ") ||
                        "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {branch.phone ? (
                      <div className="flex items-center gap-1 text-sm text-slate-600">
                        <Phone className="h-3 w-3 text-slate-400" />
                        {branch.phone}
                      </div>
                    ) : (
                      <span className="text-slate-300 text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={branch.isActive ? "default" : "secondary"}>
                      {branch.isActive ? "Activa" : "Inactiva"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(branch)}
                        className="h-8 w-8 p-0"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          requestToggle(branch.id, branch.isActive)
                        }
                        className={`h-8 w-8 p-0 ${branch.isActive ? "text-red-500 hover:text-red-700" : "text-green-500 hover:text-green-700"}`}
                        title={branch.isActive ? "Desactivar" : "Activar"}
                      >
                        {branch.isActive ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={open => {
          setShowForm(open);
          if (!open) {
            setEditingId(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId !== null ? "Editar Sucursal" : "Nueva Sucursal"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="branch-name">
                Nombre <span className="text-red-500">*</span>
              </Label>
              <Input
                id="branch-name"
                placeholder="Ej. Sucursal Norte"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="branch-address">Dirección</Label>
              <Input
                id="branch-address"
                placeholder="Calle, número, colonia"
                value={form.address}
                onChange={e =>
                  setForm(f => ({ ...f, address: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="branch-city">Ciudad</Label>
                <Input
                  id="branch-city"
                  placeholder="Ciudad"
                  value={form.city}
                  onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="branch-state">Estado</Label>
                <Input
                  id="branch-state"
                  placeholder="Estado"
                  value={form.state}
                  onChange={e =>
                    setForm(f => ({ ...f, state: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="branch-phone">Teléfono</Label>
              <Input
                id="branch-phone"
                placeholder="614-000-0000"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {editingId !== null ? "Guardar cambios" : "Crear sucursal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle Confirm */}
      <AlertDialog
        open={confirmToggleId !== null}
        onOpenChange={open => {
          if (!open) setConfirmToggleId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmToggleActive ? "Desactivar sucursal" : "Activar sucursal"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmToggleActive
                ? "La sucursal quedará inactiva y no aparecerá en los filtros de empleados ni reportes. ¿Continuar?"
                : "La sucursal volverá a estar disponible en los filtros y reportes. ¿Continuar?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmToggle}
              className={
                confirmToggleActive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }
            >
              {confirmToggleActive ? "Desactivar" : "Activar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
