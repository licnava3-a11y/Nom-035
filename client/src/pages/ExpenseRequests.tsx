import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/Breadcrumb";
import ProtectedButton from "@/components/ProtectedButton";
import { Receipt, Plus, Edit, Trash2, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function ExpenseRequests() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<number | null>(null);
  
  // Form state
  const [folio, setFolio] = useState("");
  const [monto, setMonto] = useState("");
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState<"viaje" | "materiales" | "servicios" | "capacitacion" | "otro">("otro");
  const [fechaSolicitud, setFechaSolicitud] = useState("");

  // Queries
  const { data: requests, refetch } = trpc.financial.getAllExpenseRequests.useQuery();

  // Mutations
  const createMutation = trpc.financial.createExpenseRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitud de gasto creada exitosamente");
      setCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.financial.updateExpenseRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitud de gasto actualizada exitosamente");
      setEditDialogOpen(false);
      setSelectedRequest(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.financial.deleteExpenseRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitud de gasto eliminada exitosamente");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const approveMutation = trpc.financial.approveExpenseRequest.useMutation({
    onSuccess: () => {
      toast.success("Solicitud de gasto aprobada exitosamente");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFolio("");
    setMonto("");
    setConcepto("");
    setCategoria("otro");
    setFechaSolicitud("");
  };

  const handleCreate = () => {
    if (!folio || !monto || !concepto || !fechaSolicitud) {
      alert("Por favor completa todos los campos");
      return;
    }

    createMutation.mutate({
      folio,
      monto: monto,
      concepto,
      categoria,
      fechaSolicitud: fechaSolicitud,
    });
  };

  const handleEdit = (request: any) => {
    setSelectedRequest(request);
    setFolio(request.folio);
    setMonto(request.monto.toString());
    setConcepto(request.concepto);
    setCategoria(request.categoria || "otro");
    const requestDate = request.fechaSolicitud instanceof Date ? request.fechaSolicitud : new Date(request.fechaSolicitud);
    setFechaSolicitud(requestDate.toISOString().split("T")[0]);
    setEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedRequest) return;

    updateMutation.mutate({
      id: selectedRequest.id,
      folio,
      monto: monto,
      concepto,
      categoria,
      fechaSolicitud: fechaSolicitud,
    });
  };

  const handleDelete = (id: number) => {
    setRequestToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (requestToDelete) {
      deleteMutation.mutate({ id: requestToDelete });
    }
  };

  const handleApprove = (id: number) => {
    if (confirm("¿Estás seguro de aprobar esta solicitud de gasto?")) {
      approveMutation.mutate({ id, approved: true });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pendiente: "secondary",
      aprobada: "default",
      rechazada: "destructive",
      pagada: "default",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      viaje: "Viaje",
      materiales: "Materiales",
      servicios: "Servicios",
      capacitacion: "Capacitación",
      otro: "Otro",
    };
    return labels[category] || category;
  };

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb
        items={[
          { label: "Administración", href: "/administrative" },
          { label: "Solicitudes de Gasto" },
        ]}
      />

      <div className="flex justify-between items-center mb-6 mt-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Solicitudes de Gasto</h1>
          <p className="text-muted-foreground mt-2">Administra las solicitudes de gasto y aprobaciones</p>
        </div>
        <ProtectedButton
          onClick={() => setCreateDialogOpen(true)}
          requiredPermission="can_create"
          fallbackMessage="No tienes permisos para crear solicitudes de gasto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Solicitud
        </ProtectedButton>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes de Gasto Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Folio</th>
                  <th className="text-left p-4">Categoría</th>
                  <th className="text-left p-4">Monto</th>
                  <th className="text-left p-4">Concepto</th>
                  <th className="text-left p-4">Fecha Solicitud</th>
                  <th className="text-left p-4">Estado</th>
                  <th className="text-left p-4">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {requests?.map((request: any) => (
                  <tr key={request.id} className="border-b">
                    <td className="p-4">{request.folio}</td>
                    <td className="p-4">{getCategoryLabel(request.categoria)}</td>
                    <td className="p-4">${request.monto.toFixed(2)}</td>
                    <td className="p-4">{request.concepto}</td>
                    <td className="p-4">{new Date(request.fechaSolicitud).toLocaleDateString()}</td>
                    <td className="p-4">{getStatusBadge(request.estado)}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {request.estado === "pendiente" && (
                          <ProtectedButton
                            variant="outline"
                            size="sm"
                            onClick={() => handleApprove(request.id)}
                            requiredPermission="can_approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </ProtectedButton>
                        )}
                        <ProtectedButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(request)}
                          requiredPermission="can_edit"
                        >
                          <Edit className="w-4 h-4" />
                        </ProtectedButton>
                        <ProtectedButton
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(request.id)}
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
            {!requests || requests.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No hay solicitudes de gasto registradas</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Solicitud de Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Folio</Label>
              <Input value={folio} onChange={(e) => setFolio(e.target.value)} />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={categoria} onValueChange={(value: any) => setCategoria(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viaje">Viaje</SelectItem>
                  <SelectItem value="materiales">Materiales</SelectItem>
                  <SelectItem value="servicios">Servicios</SelectItem>
                  <SelectItem value="capacitacion">Capacitación</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto</Label>
              <Input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
            </div>
            <div>
              <Label>Concepto</Label>
              <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} />
            </div>
            <div>
              <Label>Fecha Solicitud</Label>
              <Input type="date" value={fechaSolicitud} onChange={(e) => setFechaSolicitud(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleCreate} loading={createMutation.isPending} loadingText="Creando...">Crear</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Solicitud de Gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Folio</Label>
              <Input value={folio} onChange={(e) => setFolio(e.target.value)} />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={categoria} onValueChange={(value: any) => setCategoria(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viaje">Viaje</SelectItem>
                  <SelectItem value="materiales">Materiales</SelectItem>
                  <SelectItem value="servicios">Servicios</SelectItem>
                  <SelectItem value="capacitacion">Capacitación</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto</Label>
              <Input type="number" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} />
            </div>
            <div>
              <Label>Concepto</Label>
              <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} />
            </div>
            <div>
              <Label>Fecha Solicitud</Label>
              <Input type="date" value={fechaSolicitud} onChange={(e) => setFechaSolicitud(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleUpdate} loading={updateMutation.isPending} loadingText="Actualizando...">Actualizar</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog para Eliminar */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="¿Eliminar solicitud de gasto?"
        description="Esta acción no se puede deshacer. La solicitud será eliminada permanentemente."
        impactMessage="Se eliminará la solicitud y todos sus documentos adjuntos"
        variant="destructive"
        confirmText="Eliminar"
      />
    </div>
  );
}
