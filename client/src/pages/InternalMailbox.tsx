import { useState } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageSquare, Plus, Send, X, Users, BookOpen, ThumbsUp, AlertTriangle, HelpCircle, Paperclip } from "lucide-react";

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode; description: string }> = {
  sugerencia:   { label: "Sugerencia",             color: "bg-blue-100 text-blue-800",   icon: <HelpCircle className="h-4 w-4" />,    description: "Propuesta de mejora para la organización" },
  queja:        { label: "Queja",                  color: "bg-red-100 text-red-800",     icon: <AlertTriangle className="h-4 w-4" />, description: "Reporte de situación que afecta el ambiente laboral" },
  felicitacion: { label: "Felicitación",           color: "bg-green-100 text-green-800", icon: <ThumbsUp className="h-4 w-4" />,      description: "Reconocimiento a un compañero o área" },
  capacitacion: { label: "Solicitud Capacitación", color: "bg-purple-100 text-purple-800", icon: <BookOpen className="h-4 w-4" />,   description: "Solicitud de curso o programa de formación" },
  otro:         { label: "Otro",                   color: "bg-gray-100 text-gray-800",   icon: <MessageSquare className="h-4 w-4" />, description: "Otro tipo de comunicación" },
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

// Extra fields per category
interface ExtraFields {
  // queja
  involvedPersons?: string;
  incidentDate?: string;
  incidentLocation?: string;
  hasEvidence?: boolean;
  // capacitacion
  courseName?: string;
  proposedDate?: string;
  justification?: string;
  modality?: string;
  // felicitacion
  recognizedPerson?: string;
  recognitionReason?: string;
  // sugerencia
  impactArea?: string;
  estimatedBenefit?: string;
}

const defaultForm = {
  category: "sugerencia" as "sugerencia" | "queja" | "felicitacion" | "capacitacion" | "otro",
  subject: "",
  body: "",
  priority: "normal" as "baja" | "normal" | "alta" | "urgente",
  isAnonymous: false,
  extra: {} as ExtraFields,
};

function CategoryFormFields({ category, extra, onChange }: { category: string; extra: ExtraFields; onChange: (e: ExtraFields) => void }) {
  const set = (key: keyof ExtraFields, value: any) => onChange({ ...extra, [key]: value });

  if (category === "queja") {
    return (
      <div className="space-y-3 border-t pt-3 mt-1">
        <p className="text-xs font-semibold text-red-700 uppercase tracking-wide">Detalles de la queja</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Persona(s) involucrada(s)</label>
            <input className="w-full text-sm border rounded px-2 py-1.5 mt-1" placeholder="Nombre(s) o área(s)" value={extra.involvedPersons || ""} onChange={e => set("involvedPersons", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Fecha del incidente</label>
            <input type="date" className="w-full text-sm border rounded px-2 py-1.5 mt-1" value={extra.incidentDate || ""} onChange={e => set("incidentDate", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Lugar del incidente</label>
          <input className="w-full text-sm border rounded px-2 py-1.5 mt-1" placeholder="Área, sala, ubicación..." value={extra.incidentLocation || ""} onChange={e => set("incidentLocation", e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={!!extra.hasEvidence} onChange={e => set("hasEvidence", e.target.checked)} />
          <span>Cuento con evidencias (fotos, correos, testigos)</span>
        </label>
        {extra.hasEvidence && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
            <Paperclip className="h-3 w-3 flex-shrink-0" />
            Las evidencias deberán entregarse físicamente o por correo al responsable de RH al momento de dar seguimiento.
          </div>
        )}
      </div>
    );
  }

  if (category === "capacitacion") {
    return (
      <div className="space-y-3 border-t pt-3 mt-1">
        <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Detalles de la solicitud</p>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Nombre del curso o tema solicitado <span className="text-red-500">*</span></label>
          <input className="w-full text-sm border rounded px-2 py-1.5 mt-1" placeholder="Ej. Excel avanzado, Primeros auxilios, NOM-035..." value={extra.courseName || ""} onChange={e => set("courseName", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Fecha propuesta</label>
            <input type="date" className="w-full text-sm border rounded px-2 py-1.5 mt-1" value={extra.proposedDate || ""} onChange={e => set("proposedDate", e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Modalidad preferida</label>
            <select className="w-full text-sm border rounded px-2 py-1.5 mt-1" value={extra.modality || ""} onChange={e => set("modality", e.target.value)}>
              <option value="">Seleccionar...</option>
              <option value="presencial">Presencial</option>
              <option value="en_linea">En línea</option>
              <option value="hibrido">Híbrido</option>
              <option value="autoestudio">Autoestudio</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Justificación y beneficio esperado <span className="text-red-500">*</span></label>
          <textarea className="w-full text-sm border rounded px-2 py-1.5 mt-1 resize-none" rows={3} placeholder="¿Por qué es necesaria esta capacitación? ¿Qué habilidades desarrollará?" value={extra.justification || ""} onChange={e => set("justification", e.target.value)} />
        </div>
      </div>
    );
  }

  if (category === "felicitacion") {
    return (
      <div className="space-y-3 border-t pt-3 mt-1">
        <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">Detalles del reconocimiento</p>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Persona o área reconocida <span className="text-red-500">*</span></label>
          <input className="w-full text-sm border rounded px-2 py-1.5 mt-1" placeholder="Nombre del colaborador o nombre del área" value={extra.recognizedPerson || ""} onChange={e => set("recognizedPerson", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Motivo del reconocimiento</label>
          <input className="w-full text-sm border rounded px-2 py-1.5 mt-1" placeholder="Ej. Apoyo en proyecto, actitud de servicio, logro destacado..." value={extra.recognitionReason || ""} onChange={e => set("recognitionReason", e.target.value)} />
        </div>
      </div>
    );
  }

  if (category === "sugerencia") {
    return (
      <div className="space-y-3 border-t pt-3 mt-1">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Detalles de la sugerencia</p>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Área o proceso de impacto</label>
          <input className="w-full text-sm border rounded px-2 py-1.5 mt-1" placeholder="Ej. Producción, Atención a clientes, Seguridad..." value={extra.impactArea || ""} onChange={e => set("impactArea", e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Beneficio estimado</label>
          <input className="w-full text-sm border rounded px-2 py-1.5 mt-1" placeholder="Ej. Reducción de tiempos, ahorro de costos, mejora de clima laboral..." value={extra.estimatedBenefit || ""} onChange={e => set("estimatedBenefit", e.target.value)} />
        </div>
      </div>
    );
  }

  return null;
}

export default function InternalMailbox() {
  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState(defaultForm);
  const [responseText, setResponseText] = useState("");

  const { data: stats } = trpc.internalMailbox.getStats.useQuery();
  const { data: messages, isLoading, refetch } = trpc.internalMailbox.list.useQuery({ category: "all", status: "all" });
  const { data: selectedMsg, refetch: refetchSelected } = trpc.internalMailbox.getById.useQuery(
    { id: selectedId! }, { enabled: selectedId !== null }
  );

  const createMutation = trpc.internalMailbox.create.useMutation({
    onSuccess: () => {
      toast.success("Mensaje enviado correctamente");
      setShowNew(false);
      setForm(defaultForm);
      refetch();
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });
  const updateStatusMutation = trpc.internalMailbox.updateStatus.useMutation({
    onSuccess: () => { toast.success("Estado actualizado"); refetch(); refetchSelected(); },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });
  const respondMutation = trpc.internalMailbox.respond.useMutation({
    onSuccess: () => { toast.success("Respuesta enviada al remitente"); setResponseText(""); refetch(); refetchSelected(); },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const filteredMessages = (messages || []).filter(m => {
    if (filterCategory !== "all" && m.category !== filterCategory) return false;
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    return true;
  });

  // Build body with extra fields appended
  const buildBody = () => {
    let body = form.body;
    const e = form.extra;
    const lines: string[] = [];
    if (form.category === "queja") {
      if (e.involvedPersons) lines.push(`Personas involucradas: ${e.involvedPersons}`);
      if (e.incidentDate) lines.push(`Fecha del incidente: ${e.incidentDate}`);
      if (e.incidentLocation) lines.push(`Lugar: ${e.incidentLocation}`);
      if (e.hasEvidence) lines.push("Cuenta con evidencias: Sí");
    } else if (form.category === "capacitacion") {
      if (e.courseName) lines.push(`Curso solicitado: ${e.courseName}`);
      if (e.proposedDate) lines.push(`Fecha propuesta: ${e.proposedDate}`);
      if (e.modality) lines.push(`Modalidad: ${e.modality}`);
      if (e.justification) lines.push(`Justificación: ${e.justification}`);
    } else if (form.category === "felicitacion") {
      if (e.recognizedPerson) lines.push(`Persona/área reconocida: ${e.recognizedPerson}`);
      if (e.recognitionReason) lines.push(`Motivo: ${e.recognitionReason}`);
    } else if (form.category === "sugerencia") {
      if (e.impactArea) lines.push(`Área de impacto: ${e.impactArea}`);
      if (e.estimatedBenefit) lines.push(`Beneficio estimado: ${e.estimatedBenefit}`);
    }
    if (lines.length > 0) body += "\n\n--- Información adicional ---\n" + lines.join("\n");
    return body;
  };

  const isFormValid = () => {
    if (!form.subject.trim() || !form.body.trim()) return false;
    if (form.category === "capacitacion" && !form.extra.courseName?.trim()) return false;
    if (form.category === "felicitacion" && !form.extra.recognizedPerson?.trim()) return false;
    return true;
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6 text-blue-600" />
              Buzón de Comunicación Interna
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Sugerencias, quejas, felicitaciones y solicitudes de capacitación</p>
          </div>
          <Button onClick={() => setShowNew(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="h-4 w-4 mr-2" />Nuevo Mensaje
          </Button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total",       value: stats.total,      color: "text-gray-700" },
              { label: "Nuevos",      value: stats.nuevo,      color: "text-blue-700" },
              { label: "En Proceso",  value: stats.en_proceso, color: "text-yellow-700" },
              { label: "Resueltos",   value: stats.resuelto,   color: "text-green-700" },
              { label: "Cerrados",    value: stats.cerrado,    color: "text-gray-500" },
            ].map(s => (
              <Card key={s.label}><CardContent className="pt-4 pb-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent></Card>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Message list */}
          <div className="lg:col-span-1 space-y-3">
            <div className="flex gap-2 flex-wrap">
              <select className="text-xs border rounded px-2 py-1" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                <option value="all">Todas las categorías</option>
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

          {/* Message detail */}
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
                    <p className="text-sm whitespace-pre-wrap">{selectedMsg.body}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {selectedMsg.isAnonymous ? "Enviado de forma anónima" : `Enviado el ${new Date(selectedMsg.createdAt).toLocaleDateString("es-MX")}`}
                    </p>
                  </div>
                  {selectedMsg.responseBody && (
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <p className="text-xs font-medium text-green-700 mb-1">Respuesta del responsable:</p>
                      <p className="text-sm">{selectedMsg.responseBody}</p>
                      {selectedMsg.respondedAt && <p className="text-xs text-muted-foreground mt-1">{new Date(selectedMsg.respondedAt).toLocaleDateString("es-MX")}</p>}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Cambiar estado:</p>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                        <Button key={k} variant="outline" size="sm" disabled={selectedMsg.status === k}
                          onClick={() => updateStatusMutation.mutate({ id: selectedMsg.id, status: k as any })} className="text-xs">
                          {v.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {selectedMsg.status !== "cerrado" && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Responder al remitente:</p>
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

        {/* New message modal */}
        {showNew && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="pb-3 sticky top-0 bg-card z-10 border-b">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    {CATEGORY_CONFIG[form.category]?.icon}
                    Nuevo Mensaje — {CATEGORY_CONFIG[form.category]?.label}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setShowNew(false)}><X className="h-4 w-4" /></Button>
                </CardTitle>
                <p className="text-xs text-muted-foreground">{CATEGORY_CONFIG[form.category]?.description}</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {/* Category selector as visual cards */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">Categoría</label>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                      <button key={k} type="button"
                        onClick={() => setForm(f => ({ ...f, category: k as "sugerencia" | "queja" | "felicitacion" | "capacitacion" | "otro", extra: {} }))}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-all ${form.category === k ? "border-blue-500 bg-blue-50 text-blue-700" : "border-muted hover:border-blue-300"}`}>
                        {v.icon}
                        <span>{v.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-muted-foreground">Asunto <span className="text-red-500">*</span></label>
                    <input className="w-full text-sm border rounded px-2 py-1.5 mt-1" placeholder="Asunto del mensaje" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Prioridad</label>
                    <select className="w-full text-sm border rounded px-2 py-1.5 mt-1" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as "baja" | "normal" | "alta" | "urgente" }))}>
                      {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Descripción <span className="text-red-500">*</span></label>
                  <textarea className="w-full text-sm border rounded px-2 py-1.5 mt-1 resize-none" rows={4}
                    placeholder={
                      form.category === "queja" ? "Describa detalladamente la situación que desea reportar..." :
                      form.category === "capacitacion" ? "Describa brevemente su necesidad de capacitación..." :
                      form.category === "felicitacion" ? "Describa el logro o comportamiento que desea reconocer..." :
                      form.category === "sugerencia" ? "Describa su propuesta de mejora con el mayor detalle posible..." :
                      "Describa su mensaje con detalle..."
                    }
                    value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
                </div>

                {/* Category-specific extra fields */}
                <CategoryFormFields
                  category={form.category}
                  extra={form.extra}
                  onChange={extra => setForm(f => ({ ...f, extra }))}
                />

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isAnonymous} onChange={e => setForm(f => ({ ...f, isAnonymous: e.target.checked }))} />
                  Enviar de forma anónima
                </label>

                <div className="flex gap-2 justify-end pt-2 border-t">
                  <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
                  <Button
                    onClick={() => createMutation.mutate({ ...form, body: buildBody() })}
                    disabled={!isFormValid() || createMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white">
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
