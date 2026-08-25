import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  sugerencia: {
    label: "Sugerencia",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
  },
  queja: {
    label: "Queja",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
  },
  felicitacion: {
    label: "Felicitación",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
  },
  capacitacion: {
    label: "Capacitación",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
  },
  otro: {
    label: "Otro",
    color: "text-gray-700",
    bg: "bg-gray-50 border-gray-200",
  },
};

const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  nuevo: { label: "Nuevo", variant: "default" },
  en_proceso: { label: "En Proceso", variant: "secondary" },
  resuelto: { label: "Resuelto", variant: "outline" },
  cerrado: { label: "Cerrado", variant: "outline" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  baja: { label: "Baja", color: "text-gray-500" },
  normal: { label: "Normal", color: "text-blue-600" },
  alta: { label: "Alta", color: "text-orange-600" },
  urgente: { label: "Urgente", color: "text-red-600" },
};

export default function MyMailbox() {
  const { toast } = useToast();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const { data: messages = [], refetch } =
    trpc.internalMailbox.myMessages.useQuery({ limit: 100 });
  const markReadMut = trpc.internalMailbox.markResponseRead.useMutation({
    onSuccess: () => refetch(),
  });

  const unreadCount = messages.filter(
    m => m.responseBody && !m.responseReadAt
  ).length;

  const selectedMsg = messages.find(m => m.id === selectedId) ?? null;

  function handleOpen(msg: (typeof messages)[0]) {
    setSelectedId(msg.id);
    // Mark as read if there's an unread response
    if (msg.responseBody && !msg.responseReadAt) {
      markReadMut.mutate({ id: msg.id });
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Mis Mensajes</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Historial de tus mensajes enviados al Buzón de Comunicación
              Interna
            </p>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <span className="text-sm font-medium text-blue-700">
                {unreadCount} respuesta{unreadCount > 1 ? "s" : ""} sin leer
              </span>
            </div>
          )}
        </div>

        {messages.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-muted-foreground font-medium">
                No has enviado mensajes aún
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Usa el Buzón de Comunicación Interna para enviar sugerencias,
                quejas o felicitaciones.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Message list */}
            <div className="lg:col-span-1 space-y-2">
              {messages.map(msg => {
                const cat =
                  CATEGORY_CONFIG[msg.category] ?? CATEGORY_CONFIG.otro;
                const hasUnread = !!(msg.responseBody && !msg.responseReadAt);
                const isSelected = selectedId === msg.id;
                return (
                  <button
                    key={msg.id}
                    onClick={() => handleOpen(msg)}
                    className={`w-full text-left rounded-lg border p-3 transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : hasUnread
                          ? "border-blue-300 bg-blue-50/50 hover:border-blue-400"
                          : "border-border hover:border-muted-foreground/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          {hasUnread && (
                            <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                          )}
                          <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded ${cat.bg} ${cat.color}`}
                          >
                            {cat.label}
                          </span>
                        </div>
                        <p
                          className={`text-sm truncate ${hasUnread ? "font-semibold" : "font-medium"}`}
                        >
                          {msg.subject}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(msg.createdAt).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <Badge
                        variant={
                          STATUS_CONFIG[msg.status]?.variant ?? "default"
                        }
                        className="text-xs flex-shrink-0"
                      >
                        {STATUS_CONFIG[msg.status]?.label ?? msg.status}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Message detail */}
            <div className="lg:col-span-2">
              {selectedMsg ? (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="text-base">
                          {selectedMsg.subject}
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded border ${
                              (
                                CATEGORY_CONFIG[selectedMsg.category] ??
                                CATEGORY_CONFIG.otro
                              ).bg
                            } ${(CATEGORY_CONFIG[selectedMsg.category] ?? CATEGORY_CONFIG.otro).color}`}
                          >
                            {
                              (
                                CATEGORY_CONFIG[selectedMsg.category] ??
                                CATEGORY_CONFIG.otro
                              ).label
                            }
                          </span>
                          <Badge
                            variant={
                              STATUS_CONFIG[selectedMsg.status]?.variant ??
                              "default"
                            }
                          >
                            {STATUS_CONFIG[selectedMsg.status]?.label ??
                              selectedMsg.status}
                          </Badge>
                          <span
                            className={`text-xs font-medium ${
                              (
                                PRIORITY_CONFIG[selectedMsg.priority] ??
                                PRIORITY_CONFIG.normal
                              ).color
                            }`}
                          >
                            Prioridad:{" "}
                            {
                              (
                                PRIORITY_CONFIG[selectedMsg.priority] ??
                                PRIORITY_CONFIG.normal
                              ).label
                            }
                          </span>
                          {selectedMsg.isAnonymous && (
                            <span className="text-xs text-muted-foreground italic">
                              Enviado anónimamente
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Enviado el{" "}
                          {new Date(selectedMsg.createdAt).toLocaleString(
                            "es-MX",
                            {
                              day: "2-digit",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Original message */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                        Tu Mensaje
                      </h4>
                      <div className="bg-muted/40 rounded-lg p-3 text-sm whitespace-pre-wrap">
                        {selectedMsg.body}
                      </div>
                    </div>

                    {/* Response */}
                    {selectedMsg.responseBody ? (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Respuesta del Responsable
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            {selectedMsg.respondedAt
                              ? new Date(
                                  selectedMsg.respondedAt
                                ).toLocaleString("es-MX", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : ""}
                          </span>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm whitespace-pre-wrap text-green-900">
                          {selectedMsg.responseBody}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                        <span className="font-medium">
                          En espera de respuesta.
                        </span>{" "}
                        El responsable revisará tu mensaje a la brevedad.
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-16 text-center">
                    <div className="text-4xl mb-3">👈</div>
                    <p className="text-muted-foreground">
                      Selecciona un mensaje para ver el detalle
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
