import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Download, CheckCircle, Clock, XCircle } from "lucide-react";

export default function Policy() {
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    descripcion: "",
    fechaAprobacion: "",
    documentoUrl: "",
  });

  const utils = trpc.useUtils();
  const { data: currentPolicy, isLoading } = trpc.equality.policy.get.useQuery();
  const { data: policies = [] } = trpc.equality.policy.list.useQuery();

  const createMutation = trpc.equality.policy.create.useMutation({
    onSuccess: () => {
      alert("Política creada exitosamente");
      utils.equality.policy.get.invalidate();
      utils.equality.policy.list.invalidate();
      setIsCreating(false);
      setFormData({ titulo: "", descripcion: "", fechaAprobacion: "", documentoUrl: "" });
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.equality.policy.update.useMutation({
    onSuccess: () => {
      alert("Política actualizada exitosamente");
      utils.equality.policy.get.invalidate();
      utils.equality.policy.list.invalidate();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleApprove = (id: number) => {
    if (confirm("¿Aprobar esta política?")) {
      updateMutation.mutate({ id, estado: "vigente" });
    }
  };

  const getStatusBadge = (estado: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      borrador: { variant: "secondary", icon: Clock },
      vigente: { variant: "default", icon: CheckCircle },
      archivado: { variant: "outline", icon: XCircle },
    };
    const config = variants[estado] || variants.borrador;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {estado.charAt(0).toUpperCase() + estado.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return <div className="p-6">Cargando...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Política de Igualdad Laboral</h1>
          <p className="text-muted-foreground">NMX-025-SCFI-2015 - Requisito 4.1.1</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)}>
          {isCreating ? "Cancelar" : "Nueva Política"}
        </Button>
      </div>

      {/* Política Vigente */}
      {currentPolicy && !isCreating && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{currentPolicy.titulo}</CardTitle>
                <CardDescription>
                  Aprobada el {new Date(currentPolicy.fechaAprobacion).toLocaleDateString()}
                </CardDescription>
              </div>
              {getStatusBadge(currentPolicy.estado)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Descripción</Label>
              <p className="text-sm text-muted-foreground mt-1">{currentPolicy.descripcion}</p>
            </div>
            {currentPolicy.documentoUrl && (
              <div>
                <Label>Documento</Label>
                <a
                  href={currentPolicy.documentoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline mt-1"
                >
                  <FileText className="h-4 w-4" />
                  Ver documento oficial
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formulario de Nueva Política */}
      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Crear Nueva Política</CardTitle>
            <CardDescription>
              Registra la política de igualdad laboral y no discriminación de la organización
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="titulo">Título de la Política *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ej: Política de Igualdad Laboral y No Discriminación 2026"
                  required
                />
              </div>

              <div>
                <Label htmlFor="descripcion">Descripción *</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Describe los objetivos y alcance de la política..."
                  rows={5}
                  required
                />
              </div>

              <div>
                <Label htmlFor="fechaAprobacion">Fecha de Aprobación *</Label>
                <Input
                  id="fechaAprobacion"
                  type="date"
                  value={formData.fechaAprobacion}
                  onChange={(e) => setFormData({ ...formData, fechaAprobacion: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="documentoUrl">URL del Documento (opcional)</Label>
                <Input
                  id="documentoUrl"
                  type="url"
                  value={formData.documentoUrl}
                  onChange={(e) => setFormData({ ...formData, documentoUrl: e.target.value })}
                  placeholder="https://..."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Sube el documento a S3 y pega la URL aquí
                </p>
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Guardando..." : "Guardar Política"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setIsCreating(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Historial de Políticas */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Políticas</CardTitle>
          <CardDescription>Todas las políticas registradas en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay políticas registradas
            </p>
          ) : (
            <div className="space-y-3">
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{policy.titulo}</h3>
                      {getStatusBadge(policy.estado)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Aprobada: {new Date(policy.fechaAprobacion).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {policy.documentoUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={policy.documentoUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    {policy.estado === "borrador" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleApprove(policy.id)}
                        disabled={updateMutation.isPending}
                      >
                        Aprobar
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
