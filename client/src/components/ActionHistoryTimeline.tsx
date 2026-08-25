/**
 * ActionHistoryTimeline.tsx
 * Línea de tiempo visual para la bitácora de cambios de una acción NOM-035.
 * Muestra cada modificación con ícono por tipo de campo, valores anterior/nuevo,
 * autor del cambio y fecha/hora. Incluye formulario para agregar notas manuales.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  User,
  Calendar,
  Flag,
  FileText,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Paperclip,
  Trash2,
  RefreshCw,
  History,
} from "lucide-react";
import { toast } from "sonner";

// ── Helpers de presentación ───────────────────────────────────────────────────

const CAMPO_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  estado: { label: "Estado", icon: CheckCircle2, color: "text-blue-600" },
  responsable: { label: "Responsable", icon: User, color: "text-violet-600" },
  plazo: { label: "Plazo", icon: Calendar, color: "text-orange-600" },
  prioridad: { label: "Prioridad", icon: Flag, color: "text-red-600" },
  objetivo: { label: "Objetivo", icon: FileText, color: "text-slate-600" },
  observaciones: {
    label: "Observación",
    icon: MessageSquare,
    color: "text-teal-600",
  },
  evidencia_agregada: {
    label: "Evidencia agregada",
    icon: Paperclip,
    color: "text-green-600",
  },
  evidencia_eliminada: {
    label: "Evidencia eliminada",
    icon: Trash2,
    color: "text-red-500",
  },
  creacion: { label: "Creación", icon: Plus, color: "text-emerald-600" },
};

const ESTADO_LABELS: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  no_iniciada: { label: "No iniciada", icon: Clock, color: "text-slate-500" },
  en_proceso: { label: "En proceso", icon: RefreshCw, color: "text-blue-600" },
  cumplida: { label: "Cumplida", icon: CheckCircle2, color: "text-green-600" },
  vencida: { label: "Vencida", icon: XCircle, color: "text-red-600" },
  cancelada: {
    label: "Cancelada",
    icon: AlertTriangle,
    color: "text-orange-500",
  },
};

const PRIORIDAD_LABELS: Record<string, { label: string; color: string }> = {
  alta: { label: "Alta", color: "bg-red-100 text-red-700" },
  media: { label: "Media", color: "bg-yellow-100 text-yellow-700" },
  baja: { label: "Baja", color: "bg-slate-100 text-slate-600" },
};

function formatearFecha(fecha: string | Date): string {
  return new Date(fecha).toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderValor(
  campo: string,
  valor: string | null | undefined
): React.ReactNode {
  if (!valor)
    return <span className="text-muted-foreground italic text-xs">—</span>;

  if (campo === "estado") {
    const cfg = ESTADO_LABELS[valor];
    if (cfg) {
      const Icon = cfg.icon;
      return (
        <span
          className={`inline-flex items-center gap-1 text-xs font-medium ${cfg.color}`}
        >
          <Icon className="w-3 h-3" />
          {cfg.label}
        </span>
      );
    }
  }

  if (campo === "prioridad") {
    const cfg = PRIORIDAD_LABELS[valor];
    if (cfg)
      return (
        <Badge className={`text-xs ${cfg.color} border-0`}>{cfg.label}</Badge>
      );
  }

  if (campo === "plazo") {
    return (
      <span className="text-xs font-medium text-orange-700">
        {new Date(valor + "T00:00:00").toLocaleDateString("es-MX", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </span>
    );
  }

  return (
    <span className="text-xs text-foreground">
      {valor.length > 80 ? valor.slice(0, 80) + "…" : valor}
    </span>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

interface ActionHistoryTimelineProps {
  actionId: number;
  accionId: string;
}

export default function ActionHistoryTimeline({
  actionId,
  accionId,
}: ActionHistoryTimelineProps) {
  const [nota, setNota] = useState("");
  const [showNoteForm, setShowNoteForm] = useState(false);

  const {
    data: history,
    isLoading,
    refetch,
  } = trpc.nom035Matrix.getActionHistory.useQuery(
    { actionId },
    { refetchOnWindowFocus: false }
  );

  const addNoteMutation = trpc.nom035Matrix.addHistoryNote.useMutation({
    onSuccess: () => {
      toast.success("Nota agregada a la bitácora");
      setNota("");
      setShowNoteForm(false);
      refetch();
    },
    onError: err => toast.error("Error al agregar nota: " + err.message),
  });

  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const entries = history ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="w-4 h-4" />
          <span>
            {entries.length} {entries.length === 1 ? "registro" : "registros"}{" "}
            en bitácora
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => setShowNoteForm(v => !v)}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Agregar nota
        </Button>
      </div>

      {/* Formulario de nota */}
      {showNoteForm && (
        <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            Nueva nota en bitácora
          </p>
          <Textarea
            value={nota}
            onChange={e => setNota(e.target.value)}
            placeholder="Escribe una observación, acuerdo o comentario de seguimiento..."
            className="text-sm min-h-[80px] resize-none"
            maxLength={1000}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {nota.length}/1000
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  setShowNoteForm(false);
                  setNota("");
                }}
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="h-7 text-xs"
                disabled={nota.trim().length === 0 || addNoteMutation.isPending}
                onClick={() =>
                  addNoteMutation.mutate({ actionId, nota: nota.trim() })
                }
              >
                {addNoteMutation.isPending ? "Guardando..." : "Guardar nota"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Línea de tiempo */}
      {entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Sin registros en la bitácora.</p>
          <p className="text-xs mt-1">
            Los cambios de estado, responsable y plazo se registrarán
            automáticamente.
          </p>
        </div>
      ) : (
        <div className="relative">
          {/* Línea vertical */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-0">
            {entries.map((entry, idx) => {
              const cfg = CAMPO_CONFIG[entry.campo] ?? {
                label: entry.campo,
                icon: FileText,
                color: "text-slate-500",
              };
              const Icon = cfg.icon;
              const isLast = idx === entries.length - 1;

              return (
                <div
                  key={entry.id}
                  className={`relative flex gap-3 ${isLast ? "" : "pb-4"}`}
                >
                  {/* Ícono del evento */}
                  <div
                    className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center ${cfg.color}`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>

                  {/* Contenido */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className={`text-xs font-semibold ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {entry.changedByName && (
                        <span className="text-xs text-muted-foreground">
                          por{" "}
                          <span className="font-medium text-foreground">
                            {entry.changedByName}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Cambio de valor */}
                    {(entry.valorAnterior !== null ||
                      entry.valorNuevo !== null) && (
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        {entry.valorAnterior !== null && (
                          <>
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-50 border border-red-100">
                              {renderValor(entry.campo, entry.valorAnterior)}
                            </span>
                            <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          </>
                        )}
                        {entry.valorNuevo !== null && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-green-50 border border-green-100">
                            {renderValor(entry.campo, entry.valorNuevo)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Nota adicional */}
                    {entry.nota && entry.campo !== "observaciones" && (
                      <p className="text-xs text-muted-foreground italic mt-0.5">
                        "
                        {entry.nota.length > 100
                          ? entry.nota.slice(0, 100) + "…"
                          : entry.nota}
                        "
                      </p>
                    )}

                    {/* Fecha */}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatearFecha(entry.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
