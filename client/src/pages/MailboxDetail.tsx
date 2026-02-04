import { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, ArrowLeft, FileText, MessageSquare, ThumbsUp, GraduationCap, Send } from "lucide-react";
import { Link } from "wouter";

export default function MailboxDetail() {
  const [, params] = useRoute("/mailbox/:id");
  const mailboxId = params?.id ? parseInt(params.id) : 0;
  
  const [response, setResponse] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const { data: mailboxItem, isLoading, refetch } = trpc.mailbox.getById.useQuery(
    { id: mailboxId },
    { enabled: mailboxId > 0 }
  );

  const updateStatusMutation = trpc.mailbox.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado actualizado correctamente");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error al actualizar estado: ${error.message}`);
    },
  });

  const addResponseMutation = trpc.mailbox.addResponse.useMutation({
    onSuccess: () => {
      toast.success("Respuesta agregada correctamente");
      setResponse("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error al agregar respuesta: ${error.message}`);
    },
  });

  const handleUpdateStatus = (status: "recibido" | "asignado" | "en_proceso" | "concluido") => {
    updateStatusMutation.mutate({ id: mailboxId, status });
  };

  const handleAddResponse = () => {
    if (!response.trim()) {
      toast.error("La respuesta no puede estar vacía");
      return;
    }
    addResponseMutation.mutate({ mailboxId, response: response.trim() });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      recibido: { variant: "outline", label: "Recibido" },
      asignado: { variant: "secondary", label: "Asignado" },
      en_proceso: { variant: "default", label: "En Proceso" },
      concluido: { variant: "default", label: "Concluido" },
    };
    const config = variants[status] || variants.recibido;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactElement> = {
      complaint: <FileText className="h-5 w-5" />,
      suggestion: <MessageSquare className="h-5 w-5" />,
      congratulation: <ThumbsUp className="h-5 w-5" />,
      training_request: <GraduationCap className="h-5 w-5" />,
    };
    return icons[type] || <FileText className="h-5 w-5" />;
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      complaint: "Queja",
      suggestion: "Sugerencia",
      congratulation: "Felicitación",
      training_request: "Solicitud de Capacitación",
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!mailboxItem) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Mensaje no encontrado</CardTitle>
            <CardDescription>
              El mensaje que intentas ver no existe o ha sido eliminado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/mailbox">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al Buzón
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/mailbox">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Buzón
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mt-2">Detalle del Mensaje</h1>
        </div>
        <div className="flex items-center gap-2">
          {getTypeIcon(mailboxItem.requestType)}
          <span className="text-lg font-medium">{getTypeLabel(mailboxItem.requestType)}</span>
        </div>
      </div>

      {/* Información principal */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{mailboxItem.subject}</CardTitle>
              <CardDescription className="mt-2">
                Folio: {mailboxItem.folio} | Fecha: {new Date(mailboxItem.createdAt).toLocaleDateString("es-MX")}
              </CardDescription>
            </div>
            {getStatusBadge(mailboxItem.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Información del remitente */}
          <div>
            <h3 className="font-semibold mb-2">Información del Remitente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Nombre:</span>
                <p className="font-medium">
                  {mailboxItem.isAnonymous ? (
                    <Badge variant="outline">Anónimo</Badge>
                  ) : (
                    mailboxItem.senderName || "N/A"
                  )}
                </p>
              </div>
              {!mailboxItem.isAnonymous && (
                <>
                  <div>
                    <span className="text-sm text-muted-foreground">Email:</span>
                    <p className="font-medium">{mailboxItem.senderEmail || "N/A"}</p>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Teléfono:</span>
                    <p className="font-medium">{mailboxItem.senderPhone || "N/A"}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Mensaje */}
          <div>
            <h3 className="font-semibold mb-2">Mensaje</h3>
            <p className="text-sm whitespace-pre-wrap">{mailboxItem.message}</p>
          </div>

          {/* Tipo de queja (si aplica) */}
          {mailboxItem.complaintType && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Tipo de Queja</h3>
                <p className="text-sm">{mailboxItem.complaintType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Gestión del estado */}
      <Card>
        <CardHeader>
          <CardTitle>Gestión del Mensaje</CardTitle>
          <CardDescription>Actualiza el estado del mensaje según su progreso</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={mailboxItem.status === "recibido" ? "default" : "outline"}
              onClick={() => handleUpdateStatus("recibido")}
              disabled={updateStatusMutation.isPending}
            >
              Recibido
            </Button>
            <Button
              variant={mailboxItem.status === "asignado" ? "default" : "outline"}
              onClick={() => handleUpdateStatus("asignado")}
              disabled={updateStatusMutation.isPending}
            >
              Asignado
            </Button>
            <Button
              variant={mailboxItem.status === "en_proceso" ? "default" : "outline"}
              onClick={() => handleUpdateStatus("en_proceso")}
              disabled={updateStatusMutation.isPending}
            >
              En Proceso
            </Button>
            <Button
              variant={mailboxItem.status === "concluido" ? "default" : "outline"}
              onClick={() => handleUpdateStatus("concluido")}
              disabled={updateStatusMutation.isPending}
            >
              Concluido
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Respuestas */}
      <Card>
        <CardHeader>
          <CardTitle>Respuestas y Seguimiento</CardTitle>
          <CardDescription>Historial de respuestas y acciones realizadas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agregar nueva respuesta */}
          <div className="space-y-2">
            <Textarea
              placeholder="Escribe una respuesta o comentario..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={4}
            />
            <Button
              onClick={handleAddResponse}
              disabled={addResponseMutation.isPending || !response.trim()}
            >
              {addResponseMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar Respuesta
            </Button>
          </div>

          <Separator />

          {/* Historial de respuestas */}
          <div className="space-y-4">
            <h4 className="font-semibold">Historial</h4>
            {mailboxItem.responses && mailboxItem.responses.length > 0 ? (
              <>
                {mailboxItem.responses.map((resp: any, index: number) => (
                  <div key={`response-${resp.id || index}`} className="border-l-2 border-primary pl-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{resp.responderName || 'Usuario'}</span>
                      <span className="text-xs text-muted-foreground">
                        {resp.createdAt ? new Date(resp.createdAt).toLocaleString("es-MX") : 'Fecha no disponible'}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{resp.response || ''}</p>
                  </div>
                ))}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay respuestas registradas aún
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
