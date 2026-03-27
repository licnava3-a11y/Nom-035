/**
 * Página: TurnoverManagementPanel
 * Gestión manual de registros de rotación de empleados
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Users } from "lucide-react";

export default function TurnoverManagementPanel() {
  const [formData, setFormData] = useState({
    userId: "",
    exitDate: "",
    exitReason: "" as "voluntary" | "involuntary" | "retirement" | "",
    riskScoreAtExit: 50,
  });

  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Queries
  const { data: recordsData, isLoading, refetch } = trpc.turnoverManagement.getAllTurnoverRecords.useQuery({
    limit: 50,
    offset: 0,
  });

  const { data: employeesData } = trpc.employees.list.useQuery({ pageSize: 1000 });
  const employees = employeesData?.employees;

  // Mutations
  const createMutation = trpc.turnoverManagement.createTurnoverRecord.useMutation({
    onSuccess: () => {
      toast.success("Registro de rotación creado exitosamente");
      refetch();
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear registro de rotación");
    },
  });

  const updateMutation = trpc.turnoverManagement.updateTurnoverRecord.useMutation({
    onSuccess: () => {
      toast.success("Registro actualizado exitosamente");
      refetch();
      setIsEditDialogOpen(false);
      setEditingRecord(null);
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar registro");
    },
  });

  const deleteMutation = trpc.turnoverManagement.deleteTurnoverRecord.useMutation({
    onSuccess: () => {
      toast.success("Registro eliminado exitosamente");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar registro");
    },
  });

  const resetForm = () => {
    setFormData({
      userId: "",
      exitDate: "",
      exitReason: "",
      riskScoreAtExit: 50,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userId || !formData.exitDate || !formData.exitReason) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    createMutation.mutate({
      userId: parseInt(formData.userId),
      exitDate: formData.exitDate,
      exitReason: formData.exitReason as "voluntary" | "involuntary" | "retirement",
      riskScoreAtExit: formData.riskScoreAtExit,
    });
  };

  const handleEdit = (record: any) => {
    setEditingRecord({
      ...record,
      exitDate: new Date(record.exitDate).toISOString().split("T")[0],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingRecord) return;

    updateMutation.mutate({
      id: editingRecord.id,
      exitDate: editingRecord.exitDate,
      exitReason: editingRecord.exitReason,
      riskScoreAtExit: editingRecord.riskScoreAtExit,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar este registro?")) {
      deleteMutation.mutate({ id });
    }
  };

  const getExitReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      voluntary: "Voluntaria",
      involuntary: "Involuntaria",
      retirement: "Jubilación",
    };
    return labels[reason] || reason;
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Gestión de Rotación de Empleados</h1>
          <p className="text-muted-foreground">Registra manualmente empleados que han rotado para mejorar la precisión del modelo predictivo</p>
        </div>
      </div>

      {/* Formulario de Registro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Registrar Nueva Rotación
          </CardTitle>
          <CardDescription>Completa los campos para agregar un nuevo registro de rotación</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userId">Empleado *</Label>
                <Select value={formData.userId} onValueChange={(value) => setFormData({ ...formData, userId: value })}>
                  <SelectTrigger id="userId">
                    <SelectValue placeholder="Selecciona un empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.nombre} - {emp.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="exitDate">Fecha de Salida *</Label>
                <Input
                  id="exitDate"
                  type="date"
                  value={formData.exitDate}
                  onChange={(e) => setFormData({ ...formData, exitDate: e.target.value })}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exitReason">Razón de Salida *</Label>
                <Select value={formData.exitReason} onValueChange={(value: any) => setFormData({ ...formData, exitReason: value })}>
                  <SelectTrigger id="exitReason">
                    <SelectValue placeholder="Selecciona una razón" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voluntary">Voluntaria</SelectItem>
                    <SelectItem value="involuntary">Involuntaria</SelectItem>
                    <SelectItem value="retirement">Jubilación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="riskScore">Puntuación de Riesgo (0-100)</Label>
                <Input
                  id="riskScore"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.riskScoreAtExit}
                  onChange={(e) => setFormData({ ...formData, riskScoreAtExit: parseInt(e.target.value) || 0 })}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.riskScoreAtExit >= 70 ? "Alto riesgo (≥70)" : "Bajo riesgo (<70)"}
                </p>
              </div>
            </div>

            <Button type="submit" disabled={createMutation.isPending} className="w-full md:w-auto">
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Rotación
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Tabla de Registros */}
      <Card>
        <CardHeader>
          <CardTitle>Registros de Rotación ({recordsData?.total || 0})</CardTitle>
          <CardDescription>Historial de empleados que han rotado</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : recordsData?.records.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No hay registros de rotación</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Fecha Salida</TableHead>
                    <TableHead>Razón</TableHead>
                    <TableHead>Puntuación Riesgo</TableHead>
                    <TableHead>Nivel Riesgo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordsData?.records.map((record: any) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.userName}</TableCell>
                      <TableCell>{record.userEmail}</TableCell>
                      <TableCell>{new Date(record.exitDate).toLocaleDateString("es-MX")}</TableCell>
                      <TableCell>{getExitReasonLabel(record.exitReason)}</TableCell>
                      <TableCell>{record.riskScoreAtExit}</TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            record.wasHighRisk ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
                          }`}
                        >
                          {record.wasHighRisk ? "Alto" : "Bajo"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(record)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(record.id)} disabled={deleteMutation.isPending}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Registro de Rotación</DialogTitle>
            <DialogDescription>Modifica los datos del registro de rotación</DialogDescription>
          </DialogHeader>
          {editingRecord && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-exitDate">Fecha de Salida</Label>
                <Input
                  id="edit-exitDate"
                  type="date"
                  value={editingRecord.exitDate}
                  onChange={(e) => setEditingRecord({ ...editingRecord, exitDate: e.target.value })}
                  max={new Date().toISOString().split("T")[0]}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-exitReason">Razón de Salida</Label>
                <Select value={editingRecord.exitReason} onValueChange={(value) => setEditingRecord({ ...editingRecord, exitReason: value })}>
                  <SelectTrigger id="edit-exitReason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="voluntary">Voluntaria</SelectItem>
                    <SelectItem value="involuntary">Involuntaria</SelectItem>
                    <SelectItem value="retirement">Jubilación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-riskScore">Puntuación de Riesgo (0-100)</Label>
                <Input
                  id="edit-riskScore"
                  type="number"
                  min="0"
                  max="100"
                  value={editingRecord.riskScoreAtExit}
                  onChange={(e) => setEditingRecord({ ...editingRecord, riskScoreAtExit: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
