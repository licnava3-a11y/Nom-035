import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageSquare, Plus, AlertTriangle, ThumbsUp, BookOpen, HelpCircle, Send, X } from "lucide-react";

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  sugerencia:   { label: "Sugerencia",             color: "bg-blue-100 text-blue-800" },
  queja:        { label: "Queja",                  color: "bg-red-100 text-red-800" },
  felicitacion: { label: "Felicitacion",           color: "bg-green-100 text-green-800" },
  capacitacion: { label: "Solicitud Capacitacion", color: "bg-purple-100 text-purple-800" },
  otro:         { label: "Otro",                   color: "bg-gray-100 text-gray-800" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  nuevo:      { label: "Nuevo",      color: "bg-blue-100 text-blue-800" },
  en_proceso: { label: "En Proceso", color: "bg-yellow-100 text-yellow-800" },
  resuelto:   { label: "Resuelto",   color: "bg-green-100 text-green-800" },
  cerrado:    { label: "Cerrado",    color: "bg-gray-100 text-gray-600" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  baja:    { label: "Baja",    color: "text-gray-500" },
  normal:  { label: "Normal",  color: "text-blue-600" },
  alta:    { label: "Alta",    color: "text-orange-600" },
  urgente: { label: "Urgente", color: "text-red-600" },
};

export default function InternalMailbox() {
  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({ category: "sugerencia" as any, subject: "", body: "", priority: "normal" as any, isAnonymous: false });
  const [responseText, setResponseText] = useState("");

  const { data: stats } = trpc.internalMailbox.getStats.useQuery();
  const { data: messages, isLoading, refetch } = trpc.internalMailbox.list.useQuery({ category: "all", status: "all" });
  const { data: selectedMsg, refetch: refetchSelected } = trpc.internalMailbox.getById.useQuery(
    { id: selectedId! }, { enabled: selectedId !== null }
  );

  const createMutation = trpc.internalMailbox.create.useMutation({
    onSuccess: () => { toast.success("Mensaje enviado"); setShowNew(false); setForm({ category: "sugerencia", subject: "", body: "", priority: "normal", isAnonymous: false }); refetch(); },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });
  const updateStatusMutation = trpc.internalMailbox.updateStatus.useMutation({
    onSuccess: () => { toast.success("Estado actualizado"); refetch(); refetchSelected(); },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });
  const respondMutation = trpc.internalMailbox.respond.useMutation({
    onSuccess: () => { toast.success("Respuesta enviada"); setResponseText(""); refetch(); refetchSelected(); },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const filteredMessages = (messages || []).filter(m => {
    if (filterCategory !== "all" && m.category !== filterCategory) return false;
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              Buzon de Comunicacion Interna
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Sugerencias, quejas, felicitaciones y solicitudes de capacitacion</p>
          </div>
          <Button onClick={() => setShowNew(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />Nuevo Mensaje
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total", value: stats.total, color: "text-gray-700" },
              { label: "Nuevos", value: stats.nuevo, color: "text-blue-700" },
              { label: "En Proceso", value: stats.en_proceso, color: "text-yellow-700" },
              { label: "Resueltos", value: stats.resuelto, color: "text-green-700" },
              { label: "Cerrados", value: stats.cerrado, color: "text-gray-500" },
            ].map(s => (
              <Card key={s.label}><CardContent className="pt-4 pb-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent></Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <select className="text-xs border rounded px-2 py-1" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="all">Todas las categorias</option>
                {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <select className="text-xs border rounded px-2 py-1" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">Todos los estados</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground text-sm">Cargando...</div>
            ) : filteredMessages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No hay mensajes</div>
            ) : filteredMessages.map(msg => {
              const cat = CATEGORY_CONFIG[msg.category];
              const st = STATUS_CONFIG[msg.status];
              return (
                <div key={msg.id} onClick={() => setSelectedId(msg.id)}
                  className={`p-3 rounded-lg border cursor-pointer hover:border-blue-300 transition-all ${selectedId === msg.id ? "border-blue-500 bg-blue-50" : ""}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{msg.subject}</p>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cat?.color}`}>{cat?.label}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${st?.color}`}>{st?.label}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(msg.createdAt).toLocaleDateString("es-MX", { month: "short", day: "numeric" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="lg:col-span-2">
            {selectedMsg ? (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{selectedMsg.subject}</CardTitle>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_CONFIG[selectedMsg.category]?.color}`}>{CATEGORY_CONFIG[selectedMsg.category]?.label}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[selectedMsg.status]?.color}`}>{STATUS_CONFIG[selectedMsg.status]?.label}</span>
                        <span className={`text-xs font-medium ${PRIORITY_CONFIG[selectedMsg.priority]?.color}`}>Prioridad: {PRIORITY_CONFIG[selectedMsg.priority]?.label}</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}><X className="h-4 w-4" /></Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-muted/30 rounded p-3">
                    <p className="text-sm">{selectedMsg.body}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedMsg.isAnonymous ? "Enviado de forma anonima" : `Enviado el ${new Date(selectedMsg.createdAt).toLocaleDateString("es-MX")}`}
                    </p>
                  </div>
                  {selectedMsg.responseBody && (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <p className="text-xs font-medium text-green-700 mb-1">Respuesta:</p>
                      <p className="text-sm">{selectedMsg.responseBody}</p>
                      {selectedMsg.respondedAt && <p className="text-xs text-muted-foreground mt-1">{new Date(selectedMsg.respondedAt).toLocaleDateString("es-MX")}</p>}
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <Button key={k} variant="outline" size="sm" disabled={selectedMsg.status === k}
                        onClick={() => updateStatusMutation.mutate({ id: selectedMsg.id, status: k as any })} className="text-xs">
                        {v.label}
                      </Button>
                    ))}
                  </div>
                  {selectedMsg.status !== "cerrado" && (
                    <div className="space-y-2">
                      <textarea className="w-full text-sm border rounded p-2 resize-none" rows={3} placeholder="Escribir respuesta..." value={responseText} onChange={e => setResponseText(e.target.value)} />
                      <Button size="sm" onClick={() => respondMutation.mutate({ id: selectedMsg.id, responseBody: responseText })}
                        disabled={!responseText.trim() || respondMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Send className="h-4 w-4 mr-1" />{respondMutation.isPending ? "Enviando..." : "Enviar Respuesta"}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p>Seleccione un mensaje para ver el detalle</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {showNew && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Nuevo Mensaje</span>
                  <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}><X className="h-4 w-4" /></Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Categoria</label>
                    <select className="w-full text-sm border rounded px-2 py-1.5 mt-1" value={form.category} onChange={e => setForm((f: any) => ({ ...f, category: e.target.value }))}>
                      {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Prioridad</label>
                    <select className="w-full text-sm border rounded px-2 py-1.5 mt-1" value={form.priority} onChange={e => setForm((f: any) => ({ ...f, priority: e.target.value }))}>
                      {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Asunto</label>
                  <input className="w-full text-sm border rounded px-2 py-1.5 mt-1" placeholder="Asunto del mensaje" value={form.subject} onChange={e => setForm((f: any) => ({ ...f, subject: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Mensaje</label>
                  <textarea className="w-full text-sm border rounded px-2 py-1.5 mt-1 resize-none" rows={4} placeholder="Describa su mensaje con detalle..." value={form.body} onChange={e => setForm((f: any) => ({ ...f, body: e.target.value }))} />
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isAnonymous} onChange={e => setForm((f: any) => ({ ...f, isAnonymous: e.target.checked }))} />
                  Enviar de forma anonima
                </label>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
                  <Button onClick={() => createMutation.mutate(form)} disabled={!form.subject.trim() || !form.body.trim() || createMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {createMutation.isPending ? "Enviando..." : "Enviar Mensaje"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
