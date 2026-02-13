import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/Breadcrumb";
import ProtectedButton from "@/components/ProtectedButton";
import { DollarSign, Plus, Edit, Trash2, FileText } from "lucide-react";

export default function Payments() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  
  // Form state
  const [folio, setFolio] = useState("");
  const [clienteId, setClienteId] = useState("");
  const [monto, setMonto] = useState("");
  const [fechaEmision, setFechaEmision] = useState("");
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [estado, setEstado] = useState<"pendiente" | "pagada" | "vencida">("pendiente");

  // Queries
  const { data: invoices, refetch } = trpc.financial.getAllInvoices.useQuery();

  // Mutations
  const createMutation = trpc.financial.createInvoice.useMutation({
    onSuccess: () => {
      alert("Factura creada exitosamente");
      setCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.financial.updateInvoice.useMutation({
    onSuccess: () => {
      alert("Factura actualizada exitosamente");
      setEditDialogOpen(false);
      setSelectedInvoice(null);
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.financial.deleteInvoice.useMutation({
    onSuccess: () => {
      alert("Factura eliminada exitosamente");
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFolio("");
    setClienteId("");
    setMonto("");
    setFechaEmision("");
    setFechaVencimiento("");
    setEstado("pendiente");
  };

  const handleCreate = () => {
    if (!folio || !clienteId || !monto || !fechaEmision || !fechaVencimiento) {
      alert("Por favor completa todos los campos");
      return;
    }

    createMutation.mutate({
      folio,
      clienteNombre: clienteId, // TODO: Cambiar a nombre de cliente
      monto: monto,
      fechaEmision: fechaEmision,
      fechaVencimiento: fechaVencimiento,
      estado,
    });
  };

  const handleEdit = (invoice: any) => {
    setSelectedInvoice(invoice);
    setFolio(invoice.folio);
    setClienteId(invoice.clienteId.toString());
    setMonto(invoice.monto.toString());
    const emisionDate = invoice.fechaEmision instanceof Date ? invoice.fechaEmision : new Date(invoice.fechaEmision);
    const vencimientoDate = invoice.fechaVencimiento instanceof Date ? invoice.fechaVencimiento : new Date(invoice.fechaVencimiento);
    setFechaEmision(emisionDate.toISOString().split("T")[0]);
    setFechaVencimiento(vencimientoDate.toISOString().split("T")[0]);
    setEstado(invoice.estado);
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedInvoice) return;

    updateMutation.mutate({
      id: selectedInvoice.id,
      folio,
      clienteNombre: clienteId, // TODO: Cambiar a nombre de cliente
      monto: monto,
      fechaEmision: fechaEmision,
      fechaVencimiento: fechaVencimiento,
      estado,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta factura?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pendiente: "secondary",
      pagada: "default",
      vencida: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb
        items={[
          { label: "Administración", href: "/administrative" },
          { label: "Facturas" },
        ]}
      />

      <div className="flex justify-between items-center mb-6 mt-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Facturas</h1>
          <p className="text-muted-foreground mt-2">Administra las facturas y pagos</p>
        </div>
        <ProtectedButton
          onClick={() => setCreateDialogOpen(true)}
          requiredPermission="can_create"
          fallbackMessage="No tienes permisos para crear facturas"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Factura
        </ProtectedButton>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Facturas Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Folio</th>
                  <th className="text-left p-4">Cliente ID</th>
                  <th className="text-left p-4">Monto</th>
                  <th className="text-left p-4">Fecha Emisión</th>
                  <th className="text-left p-4">Fecha Vencimiento</th>
                  <th className="text-left p-4">Estado</th>
                  <th className="text-left p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {invoices?.map((invoice: any) => (
                  <tr key={invoice.id} className="border-b">
                    <td className="p-4">{invoice.folio}</td>
                    <td className="p-4">{invoice.clienteId}</td>
                    <td className="p-4">${invoice.monto.toFixed(2)}</td>
                    <td className="p-4">{new Date(invoice.fechaEmision).toLocaleDateString()}</td>
                    <td className="p-4">{new Date(invoice.fechaVencimiento).toLocaleDateString()}</td>
                    <td className="p-4">{getStatusBadge(invoice.estado)}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <ProtectedButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(invoice)}
                          requiredPermission="can_edit"
                        >
                          <Edit className="w-4 h-4" />
                        </ProtectedButton>
                        <ProtectedButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(invoice.id)}
                          requiredPermission="can_delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </ProtectedButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!invoices || invoices.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No hay facturas registradas</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Factura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Folio</Label>
              <Input value={folio} onChange={(e) => setFolio(e.target.value)} />
            </div>
            <div>
              <Label>Cliente ID</Label>
              <Input type="number" value={clienteId} onChange={(e) => setClienteId(e.target.value)} />
            </div>
            <div>
              <Label>Monto</Label>
              <Input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
            </div>
            <div>
              <Label>Fecha Emisión</Label>
              <Input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} />
            </div>
            <div>
              <Label>Fecha Vencimiento</Label>
              <Input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(value: any) => setEstado(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="pagada">Pagada</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creando..." : "Crear"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Factura</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Folio</Label>
              <Input value={folio} onChange={(e) => setFolio(e.target.value)} />
            </div>
            <div>
              <Label>Cliente ID</Label>
              <Input type="number" value={clienteId} onChange={(e) => setClienteId(e.target.value)} />
            </div>
            <div>
              <Label>Monto</Label>
              <Input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
            </div>
            <div>
              <Label>Fecha Emisión</Label>
              <Input type="date" value={fechaEmision} onChange={(e) => setFechaEmision(e.target.value)} />
            </div>
            <div>
              <Label>Fecha Vencimiento</Label>
              <Input type="date" value={fechaVencimiento} onChange={(e) => setFechaVencimiento(e.target.value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(value: any) => setEstado(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="pagada">Pagada</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Actualizando..." : "Actualizar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
