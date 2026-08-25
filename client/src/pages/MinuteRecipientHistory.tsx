import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Mail,
  User,
  Building2,
  Briefcase,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  FileText,
  CalendarDays,
  BarChart3,
} from "lucide-react";

const STATUS_MAP: Record<
  string,
  { label: string; icon: React.ReactNode; className: string }
> = {
  read: {
    label: "Leído",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    className: "bg-green-100 text-green-700 border-green-200",
  },
  sent: {
    label: "Enviado",
    icon: <Clock className="h-3.5 w-3.5" />,
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  bounced: {
    label: "Rebotado",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

const MEETING_TYPE_LABELS: Record<string, string> = {
  Ordinaria: "Reunión Ordinaria",
  Extraordinaria: "Reunión Extraordinaria",
  Comité: "Sesión de Comité",
  "Junta Directiva": "Junta Directiva",
  Capacitación: "Sesión de Capacitación",
  Evaluación: "Sesión de Evaluación",
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  return new Date(date).toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MinuteRecipientHistory() {
  const params = useParams<{ id: string }>();
  const recipientId = parseInt(params.id || "0", 10);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const { data, isLoading, error } =
    trpc.minuteRecipients.getDispatches.useQuery(
      { recipientId, page: 1, pageSize: 100 },
      { enabled: recipientId > 0 }
    );

  const markAsReadMutation = trpc.minuteRecipients.markAsRead.useMutation({
    onSuccess: () => {
      utils.minuteRecipients.getDispatches.invalidate({ recipientId });
      toast({ title: "Marcado como leído" });
    },
    onError: err =>
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      }),
  });

  if (!recipientId || isNaN(recipientId)) {
    return (
      <div className="p-6">
        <p className="text-destructive">ID de destinatario inválido.</p>
        <Button
          variant="outline"
          onClick={() => setLocation("/committee/minute-recipients")}
          className="mt-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-destructive">{error.message}</p>
        <Button
          variant="outline"
          onClick={() => setLocation("/committee/minute-recipients")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al catálogo
        </Button>
      </div>
    );
  }

  const recipient = data?.recipient;
  const dispatches = data?.dispatches ?? [];
  const stats = data?.stats ?? { total: 0, read: 0, unread: 0 };
  const readRate =
    stats.total > 0 ? Math.round((stats.read / stats.total) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      <Breadcrumb
        items={[
          { label: "Cumplimiento Normativo" },
          { label: "Comité de Seguridad" },
          {
            label: "Catálogo de Destinatarios",
            href: "/committee/minute-recipients",
          },
          {
            label: isLoading ? "Cargando..." : (recipient?.name ?? "Historial"),
          },
        ]}
      />

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => setLocation("/committee/minute-recipients")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Historial de Envíos
          </h1>
          <p className="text-sm text-muted-foreground">
            Trazabilidad documental de minutas enviadas a este destinatario
          </p>
        </div>
      </div>

      {/* Tarjeta del destinatario */}
      {isLoading ? (
        <div className="rounded-lg border bg-card p-5 animate-pulse">
          <div className="h-5 bg-muted rounded w-48 mb-3" />
          <div className="h-4 bg-muted rounded w-64" />
        </div>
      ) : recipient ? (
        <div className="rounded-lg border bg-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg leading-tight">
                    {recipient.name}
                  </p>
                  <Badge
                    className={`text-xs ${recipient.isActive ? "bg-green-100 text-green-700 border-green-200" : "bg-muted text-muted-foreground opacity-60"}`}
                  >
                    {recipient.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground pl-12">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {recipient.email}
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-3.5 w-3.5" />
                  {recipient.position}
                </span>
                {recipient.department && (
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    {recipient.department}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Estadísticas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            icon: <FileText className="h-5 w-5 text-primary" />,
            bg: "bg-primary/10",
            label: "Total enviadas",
            value: stats.total,
            color: "",
          },
          {
            icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
            bg: "bg-green-500/10",
            label: "Leídas",
            value: stats.read,
            color: "text-green-600",
          },
          {
            icon: <Clock className="h-5 w-5 text-blue-600" />,
            bg: "bg-blue-500/10",
            label: "Sin leer",
            value: stats.unread,
            color: "text-blue-600",
          },
          {
            icon: <BarChart3 className="h-5 w-5 text-amber-600" />,
            bg: "bg-amber-500/10",
            label: "Tasa de lectura",
            value: `${readRate}%`,
            color: "text-amber-600",
          },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-lg border bg-card p-4 flex items-center gap-3"
          >
            <div className={`p-2 rounded-md ${card.bg} shrink-0`}>
              {card.icon}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla de historial */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Minutas enviadas a este destinatario
          </span>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Folio</TableHead>
              <TableHead className="font-semibold">
                Título de la Minuta
              </TableHead>
              <TableHead className="font-semibold">Tipo</TableHead>
              <TableHead className="font-semibold">Fecha Reunión</TableHead>
              <TableHead className="font-semibold">Fecha Envío</TableHead>
              <TableHead className="font-semibold">Fecha Lectura</TableHead>
              <TableHead className="font-semibold text-center">
                Estado
              </TableHead>
              <TableHead className="font-semibold text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 bg-muted animate-pulse rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : dispatches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <FileText className="h-10 w-10 opacity-30" />
                    <p className="font-medium">
                      No se han enviado minutas a este destinatario aún.
                    </p>
                    <p className="text-xs">
                      Los envíos aparecerán aquí cuando se vinculen minutas a
                      este destinatario.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              dispatches.map(dispatch => {
                const statusInfo =
                  STATUS_MAP[dispatch.status] ?? STATUS_MAP.sent;
                return (
                  <TableRow
                    key={dispatch.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <TableCell>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {dispatch.minuteFolio ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell
                      className="font-medium max-w-xs truncate"
                      title={dispatch.minuteTitle ?? undefined}
                    >
                      {dispatch.minuteTitle ?? (
                        <span className="italic text-muted-foreground">
                          Sin título
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {dispatch.minuteType
                        ? (MEETING_TYPE_LABELS[dispatch.minuteType] ??
                          dispatch.minuteType)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(dispatch.minuteDate)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDateTime(dispatch.sentAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {dispatch.readAt ? (
                        <span className="text-green-700">
                          {formatDateTime(dispatch.readAt)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">
                          Sin confirmar
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`gap-1 ${statusInfo.className}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {dispatch.minuteId && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                  setLocation(
                                    `/meeting-minutes/${dispatch.minuteId}`
                                  )
                                }
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver minuta</TooltipContent>
                          </Tooltip>
                        )}
                        {dispatch.status !== "read" && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() =>
                                  markAsReadMutation.mutate({
                                    dispatchId: dispatch.id,
                                  })
                                }
                                disabled={markAsReadMutation.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Marcar como leído</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {dispatches.length > 0 && (
        <p className="text-xs text-muted-foreground text-right">
          {stats.total} minuta{stats.total !== 1 ? "s" : ""} enviada
          {stats.total !== 1 ? "s" : ""} · {stats.read} leída
          {stats.read !== 1 ? "s" : ""} ({readRate}%)
        </p>
      )}
    </div>
  );
}
