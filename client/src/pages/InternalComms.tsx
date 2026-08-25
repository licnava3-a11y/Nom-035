import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Plus,
  MessageSquare,
  CheckCircle,
  Eye,
  Trash2,
  Users,
  AlertTriangle,
  Lightbulb,
  Send,
} from "lucide-react";

type NoticeType = "aviso" | "comunicado" | "circular" | "urgente";
type Priority = "alta" | "media" | "baja";
type SuggestionStatus = "nueva" | "en_revision" | "atendida" | "archivada";
type SuggestionCategory =
  | "mejora_proceso"
  | "clima_laboral"
  | "seguridad"
  | "capacitacion"
  | "comunicacion"
  | "otro";

const NOTICE_TYPE_CONFIG: Record<NoticeType, { label: string; color: string }> =
  {
    aviso: { label: "Aviso", color: "bg-blue-100 text-blue-700" },
    comunicado: { label: "Comunicado", color: "bg-indigo-100 text-indigo-700" },
    circular: { label: "Circular", color: "bg-purple-100 text-purple-700" },
    urgente: { label: "Urgente", color: "bg-red-100 text-red-700" },
  };

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string }> = {
  alta: { label: "Alta", color: "bg-red-100 text-red-700" },
  media: { label: "Media", color: "bg-yellow-100 text-yellow-700" },
  baja: { label: "Baja", color: "bg-green-100 text-green-700" },
};

const SUGGESTION_STATUS_CONFIG: Record<
  SuggestionStatus,
  { label: string; color: string }
> = {
  nueva: { label: "Nueva", color: "bg-blue-100 text-blue-700" },
  en_revision: { label: "En Revisión", color: "bg-yellow-100 text-yellow-700" },
  atendida: { label: "Atendida", color: "bg-green-100 text-green-700" },
  archivada: { label: "Archivada", color: "bg-gray-100 text-gray-600" },
};

const CATEGORY_LABELS: Record<SuggestionCategory, string> = {
  mejora_proceso: "Mejora de Proceso",
  clima_laboral: "Clima Laboral",
  seguridad: "Seguridad",
  capacitacion: "Capacitación",
  comunicacion: "Comunicación",
  otro: "Otro",
};

export default function InternalComms() {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Estado de diálogos
  const [showCreateNotice, setShowCreateNotice] = useState(false);
  const [showAcks, setShowAcks] = useState<number | null>(null);
  const [showRespondSuggestion, setShowRespondSuggestion] = useState<
    number | null
  >(null);
  const [showPublicForm, setShowPublicForm] = useState(false);

  // Formularios
  const [noticeForm, setNoticeForm] = useState({
    title: "",
    content: "",
    noticeType: "aviso" as NoticeType,
    priority: "media" as Priority,
    requiresAck: false,
    targetAudience: "todos" as
      | "todos"
      | "directivos"
      | "supervisores"
      | "operativos",
    publishedAt: new Date().toISOString().split("T")[0],
    expiresAt: "",
  });

  const [suggestionForm, setSuggestionForm] = useState({
    category: "otro" as SuggestionCategory,
    content: "",
  });

  const [respondForm, setRespondForm] = useState({
    status: "en_revision" as SuggestionStatus,
    adminResponse: "",
  });

  // Filtros
  const [noticeTypeFilter, setNoticeTypeFilter] = useState("");
  const [noticePriorityFilter, setNoticePriorityFilter] = useState("");
  const [noticeSearch, setNoticeSearch] = useState("");
  const [suggestionStatusFilter, setSuggestionStatusFilter] = useState("");

  // Queries
  const { data: stats } = trpc.internalComms.getCommsStats.useQuery();
  const { data: notices = [], isLoading: loadingNotices } =
    trpc.internalComms.listNotices.useQuery({
      type: noticeTypeFilter || undefined,
      priority: noticePriorityFilter || undefined,
      search: noticeSearch || undefined,
    });
  const { data: suggestions = [], isLoading: loadingSuggestions } =
    trpc.internalComms.listSuggestions.useQuery({
      status: suggestionStatusFilter || undefined,
    });
  const { data: acks = [] } = trpc.internalComms.getAcknowledgments.useQuery(
    { noticeId: showAcks! },
    { enabled: !!showAcks }
  );

  // Mutations
  const createNoticeMut = trpc.internalComms.createNotice.useMutation({
    onSuccess: data => {
      toast({ title: `Aviso creado — Folio: ${data.folio}` });
      utils.internalComms.listNotices.invalidate();
      utils.internalComms.getCommsStats.invalidate();
      setShowCreateNotice(false);
      setNoticeForm({
        title: "",
        content: "",
        noticeType: "aviso",
        priority: "media",
        requiresAck: false,
        targetAudience: "todos",
        publishedAt: new Date().toISOString().split("T")[0],
        expiresAt: "",
      });
    },
    onError: e =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteNoticeMut = trpc.internalComms.deleteNotice.useMutation({
    onSuccess: () => {
      toast({ title: "Aviso eliminado" });
      utils.internalComms.listNotices.invalidate();
      utils.internalComms.getCommsStats.invalidate();
    },
  });

  const submitSuggestionMut = trpc.internalComms.submitSuggestion.useMutation({
    onSuccess: data => {
      toast({
        title: `Sugerencia enviada — Folio: ${data.folio}`,
        description: "Tu sugerencia ha sido recibida de forma anónima.",
      });
      setShowPublicForm(false);
      setSuggestionForm({ category: "otro", content: "" });
    },
    onError: e =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const respondSuggestionMut = trpc.internalComms.respondSuggestion.useMutation(
    {
      onSuccess: () => {
        toast({ title: "Respuesta guardada" });
        utils.internalComms.listSuggestions.invalidate();
        utils.internalComms.getCommsStats.invalidate();
        setShowRespondSuggestion(null);
        setRespondForm({ status: "en_revision", adminResponse: "" });
      },
    }
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6 text-blue-600" />
            Comunicación Interna
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Tablero de avisos, comunicados con acuse de recibo y canal de
            sugerencias anónimas
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowPublicForm(true)}
          className="border-green-300 text-green-700 hover:bg-green-50"
        >
          <Lightbulb className="h-4 w-4 mr-2" />
          Enviar Sugerencia Anónima
        </Button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Avisos",
              value: stats.totalNotices,
              color: "bg-blue-50 text-blue-700",
            },
            {
              label: "Urgentes",
              value: stats.urgentNotices,
              color:
                stats.urgentNotices > 0
                  ? "bg-red-50 text-red-700"
                  : "bg-gray-50 text-gray-600",
            },
            {
              label: "Acuses Recibidos",
              value: stats.totalAcknowledgments,
              color: "bg-green-50 text-green-700",
            },
            {
              label: "Sugerencias Nuevas",
              value: stats.newSuggestions,
              color:
                stats.newSuggestions > 0
                  ? "bg-yellow-50 text-yellow-700"
                  : "bg-gray-50 text-gray-600",
            },
          ].map(kpi => (
            <Card key={kpi.label} className={`${kpi.color} border-0`}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="text-xs mt-1">{kpi.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="notices">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="notices" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Tablero de Avisos
            {stats && stats.urgentNotices > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {stats.urgentNotices}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Sugerencias Anónimas
            {stats && stats.newSuggestions > 0 && (
              <span className="bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {stats.newSuggestions}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Avisos ─────────────────────────────────────────────────── */}
        <TabsContent value="notices" className="space-y-4 mt-4">
          <div className="flex gap-3 flex-wrap items-center">
            <Input
              placeholder="Buscar aviso..."
              value={noticeSearch}
              onChange={e => setNoticeSearch(e.target.value)}
              className="w-56"
            />
            <Select
              value={noticeTypeFilter || "all"}
              onValueChange={v => setNoticeTypeFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="aviso">Aviso</SelectItem>
                <SelectItem value="comunicado">Comunicado</SelectItem>
                <SelectItem value="circular">Circular</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={noticePriorityFilter || "all"}
              onValueChange={v => setNoticePriorityFilter(v === "all" ? "" : v)}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="media">Media</SelectItem>
                <SelectItem value="baja">Baja</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowCreateNotice(true)}
              className="ml-auto bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" /> Nuevo Aviso
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingNotices ? (
                <div className="p-8 text-center text-gray-400">
                  Cargando avisos...
                </div>
              ) : notices.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No hay avisos publicados</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setShowCreateNotice(true)}
                  >
                    Publicar primer aviso
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {notices.map(notice => (
                    <div key={notice.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${NOTICE_TYPE_CONFIG[notice.noticeType as NoticeType]?.color ?? "bg-gray-100 text-gray-600"}`}
                            >
                              {NOTICE_TYPE_CONFIG[
                                notice.noticeType as NoticeType
                              ]?.label ?? notice.noticeType}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_CONFIG[notice.priority as Priority]?.color ?? "bg-gray-100 text-gray-600"}`}
                            >
                              {PRIORITY_CONFIG[notice.priority as Priority]
                                ?.label ?? notice.priority}
                            </span>
                            <span className="font-mono text-xs text-gray-500">
                              {notice.folio}
                            </span>
                            {notice.requiresAck && (
                              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                <CheckCircle className="h-3 w-3" /> Requiere
                                Acuse
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-gray-900">
                            {notice.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notice.content}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {notice.targetAudience}
                            </span>
                            <span>
                              {new Date(notice.createdAt!).toLocaleDateString(
                                "es-MX"
                              )}
                            </span>
                            {notice.expiresAt && (
                              <span className="text-orange-500">
                                Vence:{" "}
                                {new Date(notice.expiresAt).toLocaleDateString(
                                  "es-MX"
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {notice.requiresAck && (
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Ver acuses"
                              onClick={() => setShowAcks(notice.id)}
                              className="text-purple-600 hover:bg-purple-50"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Eliminar"
                            onClick={() => {
                              if (confirm("¿Eliminar este aviso?"))
                                deleteNoticeMut.mutate({ id: notice.id });
                            }}
                            className="text-red-500 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Sugerencias ─────────────────────────────────────────────── */}
        <TabsContent value="suggestions" className="space-y-4 mt-4">
          <div className="flex gap-3 items-center">
            <Select
              value={suggestionStatusFilter || "all"}
              onValueChange={v =>
                setSuggestionStatusFilter(v === "all" ? "" : v)
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="nueva">Nueva</SelectItem>
                <SelectItem value="en_revision">En Revisión</SelectItem>
                <SelectItem value="atendida">Atendida</SelectItem>
                <SelectItem value="archivada">Archivada</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500 ml-auto">
              {suggestions.length} sugerencias
            </span>
          </div>

          <Card>
            <CardContent className="p-0">
              {loadingSuggestions ? (
                <div className="p-8 text-center text-gray-400">
                  Cargando sugerencias...
                </div>
              ) : suggestions.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <Lightbulb className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No hay sugerencias recibidas</p>
                  <p className="text-xs mt-1">
                    Las sugerencias anónimas aparecerán aquí cuando los
                    trabajadores las envíen
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 font-medium text-gray-600">
                          Folio
                        </th>
                        <th className="text-left p-3 font-medium text-gray-600">
                          Categoría
                        </th>
                        <th className="text-left p-3 font-medium text-gray-600">
                          Contenido
                        </th>
                        <th className="text-left p-3 font-medium text-gray-600">
                          Estado
                        </th>
                        <th className="text-left p-3 font-medium text-gray-600">
                          Fecha
                        </th>
                        <th className="text-left p-3 font-medium text-gray-600">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {suggestions.map(sug => (
                        <tr key={sug.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-mono text-xs font-bold text-blue-700">
                            {sug.folio}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                              {CATEGORY_LABELS[
                                sug.category as SuggestionCategory
                              ] ?? sug.category}
                            </span>
                          </td>
                          <td className="p-3 max-w-xs">
                            <p className="line-clamp-2 text-gray-700">
                              {sug.content}
                            </p>
                            {sug.adminResponse && (
                              <p className="text-xs text-green-700 mt-1 italic">
                                ↩ {sug.adminResponse}
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${SUGGESTION_STATUS_CONFIG[sug.status as SuggestionStatus]?.color ?? "bg-gray-100 text-gray-600"}`}
                            >
                              {SUGGESTION_STATUS_CONFIG[
                                sug.status as SuggestionStatus
                              ]?.label ?? sug.status}
                            </span>
                          </td>
                          <td className="p-3 text-gray-500 text-xs">
                            {new Date(sug.createdAt!).toLocaleDateString(
                              "es-MX"
                            )}
                          </td>
                          <td className="p-3">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRespondForm({
                                  status: sug.status as SuggestionStatus,
                                  adminResponse: sug.adminResponse ?? "",
                                });
                                setShowRespondSuggestion(sug.id);
                              }}
                              className="text-blue-600 hover:bg-blue-50"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Diálogo: Crear Aviso ────────────────────────────────────────────── */}
      <Dialog open={showCreateNotice} onOpenChange={setShowCreateNotice}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Publicar Nuevo Aviso / Comunicado</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Tipo de Documento</Label>
                <Select
                  value={noticeForm.noticeType}
                  onValueChange={v =>
                    setNoticeForm({
                      ...noticeForm,
                      noticeType: v as NoticeType,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aviso">Aviso</SelectItem>
                    <SelectItem value="comunicado">Comunicado</SelectItem>
                    <SelectItem value="circular">Circular</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Prioridad</Label>
                <Select
                  value={noticeForm.priority}
                  onValueChange={v =>
                    setNoticeForm({ ...noticeForm, priority: v as Priority })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Título *</Label>
              <Input
                value={noticeForm.title}
                onChange={e =>
                  setNoticeForm({ ...noticeForm, title: e.target.value })
                }
                placeholder="Título del aviso o comunicado"
              />
            </div>
            <div>
              <Label>Contenido *</Label>
              <Textarea
                value={noticeForm.content}
                onChange={e =>
                  setNoticeForm({ ...noticeForm, content: e.target.value })
                }
                rows={4}
                placeholder="Redacta el contenido del aviso..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Audiencia</Label>
                <Select
                  value={noticeForm.targetAudience}
                  onValueChange={v =>
                    setNoticeForm({
                      ...noticeForm,
                      targetAudience: v as typeof noticeForm.targetAudience,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="directivos">Directivos</SelectItem>
                    <SelectItem value="supervisores">Supervisores</SelectItem>
                    <SelectItem value="operativos">Operativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha de Vencimiento</Label>
                <Input
                  type="date"
                  value={noticeForm.expiresAt}
                  onChange={e =>
                    setNoticeForm({ ...noticeForm, expiresAt: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                checked={noticeForm.requiresAck}
                onCheckedChange={v =>
                  setNoticeForm({ ...noticeForm, requiresAck: v })
                }
              />
              <Label className="cursor-pointer">
                Requiere acuse de recibo digital
              </Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowCreateNotice(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createNoticeMut.mutate(noticeForm)}
                disabled={
                  createNoticeMut.isPending ||
                  !noticeForm.title ||
                  !noticeForm.content
                }
                className="bg-blue-600 hover:bg-blue-700"
              >
                {createNoticeMut.isPending ? "Publicando..." : "Publicar Aviso"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: Acuses de Recibo ───────────────────────────────────────── */}
      <Dialog open={!!showAcks} onOpenChange={o => !o && setShowAcks(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Acuses de Recibo Digital
            </DialogTitle>
          </DialogHeader>
          {acks.length === 0 ? (
            <div className="p-4 text-center text-gray-400">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Ningún empleado ha confirmado la lectura aún</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                {acks.length} acuse(s) registrado(s)
              </p>
              <div className="divide-y border rounded-lg overflow-hidden">
                {acks.map(ack => (
                  <div
                    key={ack.id}
                    className="flex items-center justify-between p-3 bg-white hover:bg-gray-50"
                  >
                    <div>
                      <p className="font-medium text-sm text-gray-800">
                        {ack.employeeName}
                      </p>
                      <p className="text-xs text-gray-400">
                        ID: {ack.employeeId}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Confirmado
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(ack.acknowledgedAt!).toLocaleString("es-MX")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: Responder Sugerencia ────────────────────────────────────── */}
      <Dialog
        open={!!showRespondSuggestion}
        onOpenChange={o => !o && setShowRespondSuggestion(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-600" />
              Responder Sugerencia
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Estado</Label>
              <Select
                value={respondForm.status}
                onValueChange={v =>
                  setRespondForm({
                    ...respondForm,
                    status: v as SuggestionStatus,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nueva">Nueva</SelectItem>
                  <SelectItem value="en_revision">En Revisión</SelectItem>
                  <SelectItem value="atendida">Atendida</SelectItem>
                  <SelectItem value="archivada">Archivada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Respuesta del Administrador</Label>
              <Textarea
                value={respondForm.adminResponse}
                onChange={e =>
                  setRespondForm({
                    ...respondForm,
                    adminResponse: e.target.value,
                  })
                }
                rows={4}
                placeholder="Escribe una respuesta o seguimiento a esta sugerencia..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowRespondSuggestion(null)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() =>
                  respondSuggestionMut.mutate({
                    id: showRespondSuggestion!,
                    ...respondForm,
                  })
                }
                disabled={respondSuggestionMut.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {respondSuggestionMut.isPending
                  ? "Guardando..."
                  : "Guardar Respuesta"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: Enviar Sugerencia Anónima (público) ─────────────────────── */}
      <Dialog open={showPublicForm} onOpenChange={setShowPublicForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Canal de Sugerencias Anónimas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <p className="font-medium">
                🔒 Tu identidad es completamente anónima
              </p>
              <p className="mt-1 text-yellow-700">
                No se registra ningún dato personal. Solo se guarda el contenido
                de tu sugerencia.
              </p>
            </div>
            <div>
              <Label>Categoría</Label>
              <Select
                value={suggestionForm.category}
                onValueChange={v =>
                  setSuggestionForm({
                    ...suggestionForm,
                    category: v as SuggestionCategory,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mejora_proceso">
                    Mejora de Proceso
                  </SelectItem>
                  <SelectItem value="clima_laboral">Clima Laboral</SelectItem>
                  <SelectItem value="seguridad">Seguridad</SelectItem>
                  <SelectItem value="capacitacion">Capacitación</SelectItem>
                  <SelectItem value="comunicacion">Comunicación</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tu Sugerencia *</Label>
              <Textarea
                value={suggestionForm.content}
                onChange={e =>
                  setSuggestionForm({
                    ...suggestionForm,
                    content: e.target.value,
                  })
                }
                rows={5}
                placeholder="Describe tu sugerencia o propuesta de mejora (mínimo 20 caracteres)..."
              />
              <p className="text-xs text-gray-400 mt-1">
                {suggestionForm.content.length} caracteres
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowPublicForm(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => submitSuggestionMut.mutate(suggestionForm)}
                disabled={
                  submitSuggestionMut.isPending ||
                  suggestionForm.content.length < 20
                }
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4 mr-2" />
                {submitSuggestionMut.isPending
                  ? "Enviando..."
                  : "Enviar Sugerencia"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
