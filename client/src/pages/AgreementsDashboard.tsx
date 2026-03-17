import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Filter } from "lucide-react";

export default function AgreementsDashboard() {
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Obtener acuerdos
  const { data: agreements, isLoading, refetch } = trpc.committeeMinutes.getAgreements.useQuery({
    responsible: responsibleFilter || undefined,
    priority: priorityFilter !== "all" ? (priorityFilter as "baja" | "media" | "alta" | "urgente") : undefined,
    status: statusFilter !== "all" ? (statusFilter as "completado" | "pendiente" | "en_proceso" | "cancelado") : undefined,
  });

  // Mutación para actualizar estado de acuerdo
  const updateStatusMutation = trpc.committeeMinutes.updateAgreementStatus.useMutation({
    onSuccess: () => {
      refetch();
      alert("Estado actualizado exitosamente");
    },
  });

  const handleStatusChange = (agreementId: number, newStatus: string) => {
    updateStatusMutation.mutate({ agreementId, status: newStatus as "completado" | "pendiente" | "en_proceso" | "cancelado" });
  };

  // Calcular indicadores
  const totalAgreements = agreements?.length || 0;
  const overdueAgreements = agreements?.filter(a => {
    if (!a.dueDate) return false;
    return new Date(a.dueDate) < new Date() && a.status !== "completado";
  }).length || 0;
  const dueSoonAgreements = agreements?.filter(a => {
    if (!a.dueDate) return false;
    const dueDate = new Date(a.dueDate);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 7 && diffDays >= 0 && a.status !== "completado";
  }).length || 0;

  const getPriorityBadge = (priority: string) => {
    const colors = {
      alta: "bg-red-100 text-red-800",
      media: "bg-yellow-100 text-yellow-800",
      baja: "bg-green-100 text-green-800",
    };
    return colors[priority as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      pendiente: "bg-gray-100 text-gray-800",
      "en-proceso": "bg-blue-100 text-blue-800",
      completado: "bg-green-100 text-green-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      pendiente: "Pendiente",
      "en-proceso": "En Proceso",
      completado: "Completado",
    };
    return labels[status as keyof typeof labels] || status;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Seguimiento de Acuerdos</h1>
        <p className="text-gray-600 mt-2">
          Monitorea el cumplimiento de acuerdos de minutas de comité
        </p>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Acuerdos</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAgreements}</div>
            <p className="text-xs text-muted-foreground">Acuerdos registrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overdueAgreements}</div>
            <p className="text-xs text-muted-foreground">Requieren atención inmediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Vencer (7 días)</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{dueSoonAgreements}</div>
            <p className="text-xs text-muted-foreground">Próximos a vencer</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
          <CardDescription>Filtra los acuerdos por responsable, prioridad o estado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Responsable</label>
              <Input
                placeholder="Buscar por responsable..."
                value={responsibleFilter}
                onChange={(e) => setResponsibleFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Prioridad</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="en-proceso">En Proceso</SelectItem>
                  <SelectItem value="completado">Completado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Acuerdos */}
      <Card>
        <CardHeader>
          <CardTitle>Acuerdos</CardTitle>
          <CardDescription>
            {isLoading ? "Cargando..." : `${agreements?.length || 0} acuerdos encontrados`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Cargando acuerdos...</div>
          ) : agreements && agreements.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Fecha de Cumplimiento</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agreements.map((agreement: any) => (
                    <TableRow key={agreement.id}>
                      <TableCell className="font-medium max-w-md">
                        {agreement.description}
                      </TableCell>
                      <TableCell>{agreement.responsibleName || 'Sin asignar'}</TableCell>
                      <TableCell>
                        {agreement.dueDate
                          ? new Date(agreement.dueDate).toLocaleDateString("es-MX")
                          : "Sin fecha"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPriorityBadge(agreement.priority)}>
                          {agreement.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusBadge(agreement.status)}>
                          {getStatusLabel(agreement.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={agreement.status}
                          onValueChange={(value) => handleStatusChange(agreement.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="en-proceso">En Proceso</SelectItem>
                            <SelectItem value="completado">Completado</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No se encontraron acuerdos con los filtros seleccionados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
