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
import { ShoppingCart, Plus, Edit, Trash2 } from "lucide-react";

export default function PurchaseOrders() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  // Form state
  const [folio, setFolio] = useState("");
  const [proveedor, setProveedor] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [estado, setEstado] = useState<"borrador" | "enviada" | "recibida" | "cancelada">("borrador");

  // Queries
  const { data: orders, refetch } = trpc.financial.getAllPurchaseOrders.useQuery();

  // Mutations
  const createMutation = trpc.financial.createPurchaseOrder.useMutation({
    onSuccess: () => {
      alert("Orden de compra creada exitosamente");
      setCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.financial.updatePurchaseOrder.useMutation({
    onSuccess: () => {
      alert("Orden de compra actualizada exitosamente");
      setEditDialogOpen(false);
      setSelectedOrder(null);
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.financial.deletePurchaseOrder.useMutation({
    onSuccess: () => {
      alert("Orden de compra eliminada exitosamente");
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFolio("");
    setProveedor("");
    setMonto("");
    setFecha("");
    setDescripcion("");
    setEstado("borrador");
  };

  const handleCreate = () => {
    if (!folio || !proveedor || !monto || !fecha) {
      alert("Por favor completa todos los campos obligatorios");
      return;
    }

    createMutation.mutate({
      folio,
      proveedor,
      monto: monto,
      fecha: fecha,
      descripcion,
      estado,
    });
  };

  const handleEdit = (order: any) => {
    setSelectedOrder(order);
    setFolio(order.folio);
    setProveedor(order.proveedor);
    setMonto(order.monto.toString());
    const orderDate = order.fecha instanceof Date ? order.fecha : new Date(order.fecha);
    setFecha(orderDate.toISOString().split("T")[0]);
    setDescripcion(order.descripcion || "");
    setEstado(order.estado);
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedOrder) return;

    updateMutation.mutate({
      id: selectedOrder.id,
      folio,
      proveedor,
      monto: monto,
      fecha: fecha,
      descripcion,
      estado,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta orden de compra?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      borrador: "secondary",
      enviada: "default",
      recibida: "default",
      cancelada: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb
        items={[
          { label: "Administración", href: "/administrative" },
          { label: "Órdenes de Compra" },
        ]}
      />

      <div className="flex justify-between items-center mb-6 mt-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Órdenes de Compra</h1>
          <p className="text-muted-foreground mt-2">Administra las órdenes de compra y proveedores</p>
        </div>
        <ProtectedButton
          onClick={() => setCreateDialogOpen(true)}
          requiredPermission="can_create"
          fallbackMessage="No tienes permisos para crear órdenes de compra"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Orden
        </ProtectedButton>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Compra Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Folio</th>
                  <th className="text-left p-4">Proveedor</th>
                  <th className="text-left p-4">Monto</th>
                  <th className="text-left p-4">Fecha</th>
                  <th className="text-left p-4">Estado</th>
                  <th className="text-left p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {orders?.map((order: any) => (
                  <tr key={order.id} className="border-b">
                    <td className="p-4">{order.folio}</td>
                    <td className="p-4">{order.proveedor}</td>
                    <td className="p-4">${order.monto.toFixed(2)}</td>
                    <td className="p-4">{new Date(order.fecha).toLocaleDateString()}</td>
                    <td className="p-4">{getStatusBadge(order.estado)}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <ProtectedButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(order)}
                          requiredPermission="can_edit"
                        >
                          <Edit className="w-4 h-4" />
                        </ProtectedButton>
                        <ProtectedButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(order.id)}
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
            {!orders || orders.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No hay órdenes de compra registradas</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Orden de Compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Folio</Label>
              <Input value={folio} onChange={(e) => setFolio(e.target.value)} />
            </div>
            <div>
              <Label>Proveedor</Label>
              <Input value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
            </div>
            <div>
              <Label>Monto</Label>
              <Input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(value: any) => setEstado(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                  <SelectItem value="recibida">Recibida</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
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
            <DialogTitle>Editar Orden de Compra</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Folio</Label>
              <Input value={folio} onChange={(e) => setFolio(e.target.value)} />
            </div>
            <div>
              <Label>Proveedor</Label>
              <Input value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
            </div>
            <div>
              <Label>Monto</Label>
              <Input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
            </div>
            <div>
              <Label>Descripción (opcional)</Label>
              <Input value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={estado} onValueChange={(value: any) => setEstado(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="borrador">Borrador</SelectItem>
                  <SelectItem value="enviada">Enviada</SelectItem>
                  <SelectItem value="recibida">Recibida</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
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
