import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, AlertCircle, CheckCircle, Clock, XCircle, AlertTriangle } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function Complaints() {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<{
    tipo: "discriminacion_genero" | "acoso_laboral" | "acoso_sexual" | "discriminacion_edad" | "discriminacion_discapacidad" | "otro" | "";
    descripcion: string;
    denuncianteNombre: string;
    denuncianteEmail: string;
  }>({
    tipo: "",
    descripcion: "",
    denuncianteNombre: "",
    denuncianteEmail: "",
  });

  const utils = trpc.useUtils();
  const { data: complaints = [], isLoading } = trpc.equality.complaints.list.useQuery();

  const createMutation = trpc.equality.complaints.create.useMutation({
    onSuccess: () => {
      alert("Queja registrada exitosamente");
      utils.equality.complaints.list.invalidate();
      setIsCreating(false);
      setFormData({ tipo: "", descripcion: "", denuncianteNombre: "", denuncianteEmail: "" });
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateStatusMutation = trpc.equality.complaints.updateStatus.useMutation({
    onSuccess: () => {
      alert("Estado actualizado exitosamente");
      utils.equality.complaints.list.invalidate();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tipo) {
      alert("Por favor seleccione un tipo de queja");
      return;
    }
    createMutation.mutate({
      tipo: formData.tipo as "discriminacion_genero" | "acoso_laboral" | "acoso_sexual" | "discriminacion_edad" | "discriminacion_discapacidad" | "otro",
      descripcion: formData.descripcion,
      denuncianteNombre: formData.denuncianteNombre || undefined,
      denuncianteEmail: formData.denuncianteEmail || undefined,
    });
  };

  const handleStatusChange = (id: number, estado: "recibida" | "en_investigacion" | "resuelta" | "cerrada" | "desestimada") => {
    if (confirm(`¿Cambiar estado a "${estado}"?`)) {
      updateStatusMutation.mutate({ id, estado });
    }
  };

  const getStatusBadge = (estado: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      recibida: { variant: "secondary", icon: Clock },
      "en_investigacion": { variant: "default", icon: AlertCircle },
      resuelta: { variant: "default", icon: CheckCircle },
      cerrada: { variant: "outline", icon: XCircle },
      desestimada: { variant: "destructive", icon: XCircle },
    };
    const config = variants[estado] || variants.recibida;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {estado.replace("_", " ").charAt(0).toUpperCase() + estado.replace("_", " ").slice(1)}
      </Badge>
    );
  };

  const getPriorityBadge = (prioridad: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive"; color: string }> = {
      baja: { variant: "secondary", color: "text-gray-600" },
      media: { variant: "default", color: "text-yellow-600" },
      alta: { variant: "destructive", color: "text-red-600" },
    };
    const config = variants[prioridad] || variants.baja;
    return (
      <Badge variant={config.variant}>
        {prioridad.charAt(0).toUpperCase() + prioridad.slice(1)}
      </Badge>
    );
  };

  // Calcular estadísticas
  const totalComplaints = complaints.length;
  const pending = complaints.filter(c => c.estado === "recibida").length;
  const investigating = complaints.filter(c => c.estado === "en_investigacion").length;
  const resolved = complaints.filter(c => c.estado === "resuelta").length;

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <Breadcrumbs items={[
        { label: "Igualdad Laboral y No Discriminación", path: "/equality/policy" },
        { label: "Quejas y Denuncias" }
      ]} />
      
      <div className="flex items-center justify-between mt-4">
        <div>
          <h1 className="text-3xl font-bold">Quejas y Denuncias</h1>
          <p className="text-muted-foreground">NMX-025-SCFI-2015 - Requisito 4.3.2</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)}>
          <Plus className="h-4 w-4 mr-2" />
          {isCreating ? "Cancelar" : "Nueva Queja"}
        </Button>
      </div>

      {/* Dashboard de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Quejas</CardDescription>
            <CardTitle className="text-3xl">{totalComplaints}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pendientes</CardDescription>
            <CardTitle className="text-3xl text-gray-600">{pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>En Investigación</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{investigating}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Resueltas</CardDescription>
            <CardTitle className="text-3xl text-green-600">{resolved}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Formulario de Nueva Queja */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar Nueva Queja</CardTitle>
            <CardDescription>
              Registra quejas relacionadas con discriminación o falta de igualdad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo">Tipo de Queja *</Label>
                  <select
                    id="tipo"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    required
                  >
                    <option value="">Seleccione un tipo...</option>
                    <option value="discriminacion_genero">Discriminación de Género</option>
                    <option value="acoso_laboral">Acoso Laboral</option>
                    <option value="acoso_sexual">Acoso Sexual</option>
                    <option value="discriminacion_edad">Discriminación por Edad</option>
                    <option value="discriminacion_discapacidad">Discriminación por Discapacidad</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="denuncianteEmail">Email del Denunciante (opcional)</Label>
                  <Input
                    id="denuncianteEmail"
                    type="email"
                    value={formData.denuncianteEmail}
                    onChange={(e) => setFormData({ ...formData, denuncianteEmail: e.target.value })}
                    placeholder="email@ejemplo.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="descripcion">Descripción *</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Describe los hechos de manera detallada..."
                  rows={5}
                  required
                />
              </div>

              <div>
                <Label htmlFor="denuncianteNombre">Nombre del Denunciante (opcional)</Label>
                <Input
                  id="denuncianteNombre"
                  value={formData.denuncianteNombre}
                  onChange={(e) => setFormData({ ...formData, denuncianteNombre: e.target.value })}
                  placeholder="Nombre del denunciante (puede ser anónimo)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Dejar en blanco para denuncias anónimas
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Guardando..." : "Registrar Queja"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Quejas */}
      <Card>
        <CardHeader>
          <CardTitle>Quejas Registradas</CardTitle>
          <CardDescription>Sistema de seguimiento de quejas y denuncias</CardDescription>
        </CardHeader>
        <CardContent>
          {complaints.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay quejas registradas
            </p>
          ) : (
            <div className="space-y-3">
              {complaints.map((complaint) => (
                <div
                  key={complaint.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm text-muted-foreground">
                        {complaint.folio}
                      </span>
                      {getStatusBadge(complaint.estado)}
                      {getPriorityBadge(complaint.prioridad)}
                    </div>
                    <h3 className="font-medium mb-1">{complaint.tipo}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{complaint.descripcion}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      {complaint.denuncianteNombre && (
                        <span>Denunciante: {complaint.denuncianteNombre}</span>
                      )}
                      {complaint.esAnonima && (
                        <span className="text-yellow-600">Denuncia Anónima</span>
                      )}
                      <span>Fecha: {new Date(complaint.createdAt).toLocaleDateString()}</span>
                    </div>
                    {complaint.resolucion && (
                      <div className="mt-2 p-2 bg-muted rounded text-sm">
                        <strong>Resolución:</strong> {complaint.resolucion}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    {complaint.estado === "recibida" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(complaint.id, "en_investigacion")}
                        disabled={updateStatusMutation.isPending}
                      >
                        Investigar
                      </Button>
                    )}
                    {complaint.estado === "en_investigacion" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(complaint.id, "resuelta")}
                        disabled={updateStatusMutation.isPending}
                      >
                        Resolver
                      </Button>
                    )}
                    {complaint.estado === "resuelta" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusChange(complaint.id, "cerrada")}
                        disabled={updateStatusMutation.isPending}
                      >
                        Cerrar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
