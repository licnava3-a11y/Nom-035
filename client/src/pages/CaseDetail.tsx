import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

import { ArrowLeft, Clock, User, AlertCircle, FileText, MessageSquare, Users } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

export default function CaseDetail() {
  const { user } = useAuth();
  const [, params] = useRoute("/cases/:id");
  const [, setLocation] = useLocation();
  const caseId = params?.id ? parseInt(params.id) : 0;

  const [newComment, setNewComment] = useState("");
  const [newStatus, setNewStatus] = useState<"open" | "investigating" | "resolved" | "closed" | "">("");

  // Obtener el caso
  const { data: caseData, isLoading: caseLoading } = trpc.cases.getById.useQuery({ id: caseId });

  // Obtener seguimientos del caso
  const { data: followUps, isLoading: followUpsLoading, refetch: refetchFollowUps } = trpc.cases.getFollowUps.useQuery({ caseId });

  // Mutation para agregar seguimiento
  const addFollowUpMutation = trpc.cases.addFollowUp.useMutation({
    onSuccess: () => {
      toast.success("Seguimiento agregado exitosamente");
      setNewComment("");
      setNewStatus("");
      refetchFollowUps();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleAddFollowUp = () => {
    if (!newComment.trim()) {
      toast.error("El comentario no puede estar vacío");
      return;
    }

    addFollowUpMutation.mutate({
      caseId,
      action: newComment,
      notes: newComment, // Guardar el comentario en notes también
      newStatus: newStatus ? (newStatus as "open" | "investigating" | "resolved" | "closed") : undefined,
    });
  };

  if (caseLoading || followUpsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando caso...</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-lg font-semibold">Caso no encontrado</p>
          <Button className="mt-4" onClick={() => setLocation("/cases")}>
            Volver a Casos
          </Button>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "destructive",
      investigating: "default",
      resolved: "secondary",
      closed: "outline",
    };
    const labels: Record<string, string> = {
      open: "Abierto",
      investigating: "En Investigación",
      resolved: "Resuelto",
      closed: "Cerrado",
    };
    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      low: "secondary",
      medium: "default",
      high: "destructive",
    };
    const labels: Record<string, string> = {
      low: "Baja",
      medium: "Media",
      high: "Alta",
    };
    return <Badge variant={variants[priority] || "default"}>{labels[priority] || priority}</Badge>;
  };

  const getCaseTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mobbing: "Mobbing",
      burnout: "Burnout",
      violence: "Violencia Laboral",
      stress: "Estrés Laboral",
      other: "Otro",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setLocation("/cases")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Detalle del Caso</h1>
          <p className="text-muted-foreground mt-1">Folio: {caseData.caseNumber}</p>
        </div>
        {getStatusBadge(caseData.status)}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Case Information */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Caso</CardTitle>
              <CardDescription>Detalles generales del caso reportado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo de Caso</p>
                  <p className="text-base font-semibold">{getCaseTypeLabel(caseData.caseType)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prioridad</p>
                  <div className="mt-1">{getPriorityBadge(caseData.priority)}</div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha de Registro</p>
                  <p className="text-base">{new Date(caseData.createdAt).toLocaleDateString("es-MX")}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Anónimo</p>
                  <p className="text-base">{caseData.isAnonymous ? "Sí" : "No"}</p>
                </div>
              </div>

              {!caseData.isAnonymous && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Información del Reportante</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {caseData.reporterName && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                          <p className="text-base">{caseData.reporterName}</p>
                        </div>
                      )}
                      {caseData.reporterEmail && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Email</p>
                          <p className="text-base">{caseData.reporterEmail}</p>
                        </div>
                      )}
                      {caseData.reporterPhone && (
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                          <p className="text-base">{caseData.reporterPhone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div>
                <h3 className="text-sm font-semibold mb-2">Descripción</h3>
                <p className="text-base text-muted-foreground whitespace-pre-wrap">{caseData.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Timeline de Seguimiento
              </CardTitle>
              <CardDescription>Historial completo de acciones y actualizaciones</CardDescription>
            </CardHeader>
            <CardContent>
              {followUps && followUps.length > 0 ? (
                <div className="space-y-4">
                  {followUps.map((followUp: any, index: number) => (
                    <div key={followUp.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        {index < followUps.length - 1 && <div className="w-0.5 h-full bg-border mt-2"></div>}
                      </div>
                      <div className="flex-1 pb-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium">{followUp.action}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {new Date(followUp.createdAt).toLocaleString("es-MX")}
                            </p>
                          </div>
                          {followUp.newStatus && (
                            <div className="ml-4">{getStatusBadge(followUp.newStatus)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No hay seguimientos registrados</p>
              )}
            </CardContent>
          </Card>

          {/* Add Follow-up */}
          {(user?.role === "admin" || user?.role === "committee") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Agregar Seguimiento
                </CardTitle>
                <CardDescription>Registra una nueva acción o actualización del caso</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Comentario / Acción</label>
                  <Textarea
                    placeholder="Describe la acción realizada o el comentario sobre el caso..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={4}
                  />
                </div>

                <div>
                  <label htmlFor="newStatus" className="text-sm font-medium mb-2 block">Cambiar Estado (opcional)</label>
                  <select
                    id="newStatus"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as "" | "open" | "investigating" | "resolved" | "closed")}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Mantener estado actual</option>
                    <option value="open">Abierto</option>
                    <option value="investigating">En Investigación</option>
                    <option value="resolved">Resuelto</option>
                    <option value="closed">Cerrado</option>
                  </select>
                </div>

                <Button onClick={handleAddFollowUp} disabled={addFollowUpMutation.isPending} className="w-full">
                  {addFollowUpMutation.isPending ? "Guardando..." : "Agregar Seguimiento"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setLocation(`/cases/assign?caseId=${caseId}`)}
              >
                <Users className="h-4 w-4 mr-2" />
                Asignar Comité
              </Button>
            </CardContent>
          </Card>

          {/* Case Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Estadísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Seguimientos</span>
                <span className="text-lg font-bold">{followUps?.length || 0}</span>
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Días abierto</span>
                <span className="text-lg font-bold">
                  {Math.floor((Date.now() - new Date(caseData.createdAt).getTime()) / (1000 * 60 * 60 * 24))}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
