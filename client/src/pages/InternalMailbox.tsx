import { useState, useEffect, useRef } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Plus, Send, X, Users, BookOpen, ThumbsUp, AlertTriangle, HelpCircle, Paperclip, FileDown, Bell, FileText } from "lucide-react";

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

/**
 * Genera y descarga un PDF con el historial de notificaciones de un mensaje del buzón
 * Útil como evidencia documental para auditorías STPS
 */
function exportNotifHistoryToPDF(msg: any, history: any[]) {
  const now = new Date().toLocaleString("es-MX");
  const categoryLabels: Record<string, string> = {
    sugerencia: "Sugerencia", queja: "Queja", felicitacion: "Felicitación",
    capacitacion: "Solicitud de Capacitación", otro: "Mensaje",
  };
  const categoryLabel = categoryLabels[msg.category] || msg.category;

  const rows = history.map((n: any, i: number) => `
    <tr style="background:${i % 2 === 0 ? "#fffbeb" : "#ffffff"}">
      <td style="padding:6px 10px;border:1px solid #fcd34d;font-size:12px">${i + 1}</td>
      <td style="padding:6px 10px;border:1px solid #fcd34d;font-size:12px">${new Date(n.createdAt).toLocaleString("es-MX")}</td>
      <td style="padding:6px 10px;border:1px solid #fcd34d;font-size:12px">${n.title}</td>
      <td style="padding:6px 10px;border:1px solid #fcd34d;font-size:12px">${n.message || "—"}</td>
      <td style="padding:6px 10px;border:1px solid #fcd34d;font-size:12px;text-align:center">
        <span style="background:${n.isRead ? "#f3f4f6" : "#dbeafe"};color:${n.isRead ? "#6b7280" : "#1d4ed8"};padding:2px 8px;border-radius:9999px;font-size:11px">
          ${n.isRead ? "Leída" : "No leída"}
        </span>
      </td>
    </tr>`).join("");

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
  <title>Historial de Notificaciones — Evidencia STPS</title>
  <style>body{font-family:Arial,sans-serif;margin:32px;color:#1e293b}h1{font-size:18px;color:#1e3a5f;margin-bottom:4px}h2{font-size:14px;color:#78350f;margin:0 0 16px}table{width:100%;border-collapse:collapse}th{background:#1e3a5f;color:#fff;padding:8px 10px;font-size:12px;text-align:left;border:1px solid #1e3a5f}.meta{font-size:12px;color:#64748b;margin-bottom:16px}.footer{margin-top:24px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px}</style>
  </head><body>
  <h1>Plataforma NOM-035 STPS 2018 — Evidencia de Comunicación Interna</h1>
  <h2>Historial de Notificaciones Enviadas al Empleado</h2>
  <div class="meta">
    <strong>Asunto:</strong> ${msg.subject}<br>
    <strong>Categoría:</strong> ${categoryLabel}<br>
    <strong>Estado:</strong> ${msg.status}<br>
    <strong>Total de notificaciones:</strong> ${history.length}<br>
    <strong>Generado:</strong> ${now}
  </div>
  <table>
    <thead><tr>
      <th>#</th><th>Fecha y Hora</th><th>Título de Notificación</th><th>Mensaje Personalizado</th><th>Estado</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Documento generado automáticamente por la Plataforma NOM-035 STPS 2018. Conservar como evidencia de cumplimiento normativo.</div>
  </body></html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `historial-notificaciones-${msg.id}-${new Date().toISOString().slice(0, 10)}.html`;
  a.click();
  URL.revokeObjectURL(url);
  // Abrir en nueva pestaña para imprimir como PDF
  const win = window.open(url, "_blank");
  if (win) setTimeout(() => win.print(), 800);
}

export default function InternalMailbox() {
  const [showNew, setShowNew] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 300);
  const [showStatusTimeline, setShowStatusTimeline] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [responseText, setResponseText] = useState("");
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyCustomMsg, setNotifyCustomMsg] = useState("");
  const [showNotifHistory, setShowNotifHistory] = useState(false);
  const [blockCountdown, setBlockCountdown] = useState<string | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusReason, setStatusReason] = useState("");

  const { data: stats } = trpc.internalMailbox.getStats.useQuery();
  const { data: messages, isLoading, refetch } = trpc.internalMailbox.list.useQuery({ category: "all", status: "all" });
  const { data: selectedMsg, refetch: refetchSelected } = trpc.internalMailbox.getById.useQuery(
    { id: selectedId! }, { enabled: selectedId !== null }
  );
  const { data: notifHistory, refetch: refetchHistory } = trpc.internalMailbox.getNotificationHistory.useQuery(
    { messageId: selectedId! }, { enabled: selectedId !== null && showNotifHistory }
  );
  const { data: lastNotifData } = trpc.internalMailbox.getLastNotification.useQuery(
    { messageId: selectedId! }, { enabled: selectedId !== null && showNotifyModal }
  );
  const { data: statusTimeline = [] } = trpc.internalMailbox.getStatusTimeline.useQuery(
    { messageId: selectedId! }, { enabled: selectedId !== null && showStatusTimeline }
  );

  // Contador de tiempo restante del bloqueo 24h
  useEffect(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (!lastNotifData?.isBlocked || !lastNotifData.blockedUntil) {
      setBlockCountdown(null);
      return;
    }
    const update = () => {
      const diff = new Date(lastNotifData.blockedUntil!).getTime() - Date.now();
      if (diff <= 0) { setBlockCountdown(null); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setBlockCountdown(`${h}h ${m.toString().padStart(2, "0")}min ${s.toString().padStart(2, "0")}s`);
    };
    update();
    countdownRef.current = setInterval(update, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [lastNotifData]);

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
    onSuccess: () => {
      toast.success("Estado actualizado");
      setShowStatusModal(false);
      setPendingStatus(null);
      setStatusReason("");
      refetch();
      refetchSelected();
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });
  const requestStatusChange = (newStatus: string) => {
    setPendingStatus(newStatus);
    setStatusReason("");
    setShowStatusModal(true);
  };
  const confirmStatusChange = () => {
    if (!selectedId || !pendingStatus) return;
    updateStatusMutation.mutate({
      id: selectedId,
      status: pendingStatus as any,
      reason: statusReason.trim() || undefined,
    });
  };
  const respondMutation = trpc.internalMailbox.respond.useMutation({
    onSuccess: () => { toast.success("Respuesta enviada al remitente"); setResponseText(""); refetch(); refetchSelected(); },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });
  const notifyEmployeeMutation = trpc.internalMailbox.notifyEmployee.useMutation({
    onSuccess: () => {
      toast.success("Notificación push enviada al empleado correctamente");
      setShowNotifyModal(false);
      setNotifyCustomMsg("");
      if (showNotifHistory) refetchHistory();
    },
    onError: (e: any) => {
      // Mostrar el mensaje del servidor directamente (incluye la fecha del próximo envío)
      toast.error(e.message || "Error al notificar al empleado");
    },
  });

  const filteredMessages = (messages || []).filter(m => {
    if (filterCategory !== "all" && m.category !== filterCategory) return false;
    if (filterStatus !== "all" && m.status !== filterStatus) return false;
    if (filterPriority !== "all" && m.priority !== filterPriority) return false;
    if (filterDateFrom) {
      const msgDate = new Date(m.createdAt);
      const from = new Date(filterDateFrom + "T00:00:00");
      if (msgDate < from) return false;
    }
    if (filterDateTo) {
      const msgDate = new Date(m.createdAt);
      const to = new Date(filterDateTo + "T23:59:59");
      if (msgDate > to) return false;
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      const subject = (m.subject || "").toLowerCase();
      const body = (m.body || "").toLowerCase();
      if (!subject.includes(q) && !body.includes(q)) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setFilterCategory("all");
    setFilterStatus("all");
    setFilterPriority("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchText("");
  };

  const hasActiveFilters = filterCategory !== "all" || filterStatus !== "all" || filterPriority !== "all" || filterDateFrom !== "" || filterDateTo !== "" || searchText !== "";

  const exportToExcel = async () => {
    try {
      const { utils, writeFile } = await import("xlsx");
      const rows = (filteredMessages as any[]).map((m) => ({
        "ID": m.id,
        "Asunto": m.subject,
        "Categoría": CATEGORY_CONFIG[m.category]?.label || m.category,
        "Estado": STATUS_CONFIG[m.status]?.label || m.status,
        "Prioridad": PRIORITY_CONFIG[m.priority]?.label || m.priority,
        "Anónimo": m.isAnonymous ? "Sí" : "No",
        "Remitente ID": m.isAnonymous ? "Anónimo" : String(m.senderId || ""),
        "Asignado a ID": String(m.assignedTo || ""),
        "Respuesta": m.responseBody || "",
        "Fecha Creación": new Date(m.createdAt).toLocaleDateString("es-MX"),
        "Fecha Respuesta": m.respondedAt ? new Date(m.respondedAt).toLocaleDateString("es-MX") : "",
      }));
      const ws = utils.json_to_sheet(rows);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Buzón Interno");
      const catLabel = filterCategory !== "all" ? `_${CATEGORY_CONFIG[filterCategory]?.label || filterCategory}` : "";
      const stLabel = filterStatus !== "all" ? `_${STATUS_CONFIG[filterStatus]?.label || filterStatus}` : "";
      const prLabel = filterPriority !== "all" ? `_${PRIORITY_CONFIG[filterPriority]?.label || filterPriority}` : "";
      const dateLabel = filterDateFrom || filterDateTo ? `_${filterDateFrom || "inicio"}_a_${filterDateTo || "hoy"}` : "";
      writeFile(wb, `buzon_interno${catLabel}${stLabel}${prLabel}${dateLabel}_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success(`${rows.length} mensajes exportados a Excel`);
    } catch (err) {
      toast.error("Error al exportar a Excel");
    }
  };

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
            <div className="space-y-2">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="relative flex-1 min-w-[180px]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <input
                    type="text"
                    placeholder="Buscar por asunto o contenido..."
                    className="w-full text-xs border rounded pl-7 pr-2 py-1"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <select className="text-xs border rounded px-2 py-1" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                  <option value="all">Todas las categorías</option>
                  {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select className="text-xs border rounded px-2 py-1" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="all">Todos los estados</option>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <select className="text-xs border rounded px-2 py-1" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                  <option value="all">Todas las prioridades</option>
                  {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Desde:</span>
                  <input type="date" className="text-xs border rounded px-2 py-1" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">Hasta:</span>
                  <input type="date" className="text-xs border rounded px-2 py-1" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
                </div>
                <Button variant="outline" size="sm" className="text-xs h-7 px-2 border-green-600 text-green-700 hover:bg-green-50" onClick={exportToExcel}>
                  <FileDown className="h-3.5 w-3.5 mr-1" />Excel ({filteredMessages.length})
                </Button>
              </div>
              {/* Chips de filtros activos */}
              {hasActiveFilters && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {searchText && (
                    <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setSearchText("")}>Buscar: "{searchText.length > 12 ? searchText.slice(0,12)+'...' : searchText}" <X className="h-3 w-3" /></Badge>
                  )}
                  {filterCategory !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setFilterCategory("all")}>{CATEGORY_CONFIG[filterCategory]?.label ?? filterCategory} <X className="h-3 w-3" /></Badge>
                  )}
                  {filterStatus !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setFilterStatus("all")}>{STATUS_CONFIG[filterStatus]?.label ?? filterStatus} <X className="h-3 w-3" /></Badge>
                  )}
                  {filterPriority !== "all" && (
                    <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setFilterPriority("all")}>{PRIORITY_CONFIG[filterPriority]?.label ?? filterPriority} <X className="h-3 w-3" /></Badge>
                  )}
                  {filterDateFrom && (
                    <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setFilterDateFrom("")}>Desde: {filterDateFrom} <X className="h-3 w-3" /></Badge>
                  )}
                  {filterDateTo && (
                    <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setFilterDateTo("")}>Hasta: {filterDateTo} <X className="h-3 w-3" /></Badge>
                  )}
                  <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-destructive underline ml-1">Limpiar todo</button>
                </div>
              )}
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
                          onClick={() => requestStatusChange(k)} className="text-xs">
                          {v.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  {/* Notification history toggle */}
                  {!selectedMsg.isAnonymous && selectedMsg.senderId && (
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex-1"
                          onClick={() => { setShowNotifHistory(v => !v); }}
                        >
                          <Bell className="h-3.5 w-3.5" />
                          Historial de notificaciones enviadas
                          {notifHistory && notifHistory.total > 0 && (
                            <span className="bg-amber-100 text-amber-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">{notifHistory.total}</span>
                          )}
                          <span className="ml-auto">{showNotifHistory ? "▲" : "▼"}</span>
                        </button>
                        {showNotifHistory && notifHistory && notifHistory.history.length > 0 && (
                          <button
                            type="button"
                            title="Exportar historial a PDF (evidencia STPS)"
                            onClick={() => exportNotifHistoryToPDF(selectedMsg, notifHistory.history)}
                            className="shrink-0 flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded border border-red-200 hover:bg-red-50 transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5" />PDF
                          </button>
                        )}
                      </div>
                      {showNotifHistory && (
                        <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                          {!notifHistory || notifHistory.history.length === 0 ? (
                            <p className="text-xs text-muted-foreground italic">No se han enviado notificaciones aún para este mensaje.</p>
                          ) : notifHistory.history.map((n: any) => (
                            <div key={n.id} className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-100 rounded text-xs">
                              <Bell className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-amber-800 truncate">{n.title}</p>
                                {n.message && <p className="text-muted-foreground truncate">{n.message}</p>}
                                <p className="text-muted-foreground/70 mt-0.5">{new Date(n.createdAt).toLocaleString("es-MX")}</p>
                              </div>
                              <span className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full ${n.isRead ? "bg-gray-100 text-gray-500" : "bg-blue-100 text-blue-700 font-medium"}`}>
                                {n.isRead ? "Leída" : "No leída"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timeline de cambios de estado */}
                  <div className="border rounded p-3 bg-slate-50">
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 text-xs font-semibold text-slate-700"
                      onClick={() => setShowStatusTimeline(v => !v)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      Historial de cambios de estado
                      {statusTimeline.length > 0 && (
                        <span className="bg-slate-200 text-slate-700 text-xs px-1.5 py-0.5 rounded-full font-semibold">{statusTimeline.length}</span>
                      )}
                      <span className="ml-auto">{showStatusTimeline ? "▲" : "▼"}</span>
                    </button>
                    {showStatusTimeline && (
                      <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto">
                        {statusTimeline.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">No hay cambios de estado registrados.</p>
                        ) : statusTimeline.map((entry: any, i: number) => (
                          <div key={entry.id} className="flex items-start gap-2 p-2 bg-white border border-slate-200 rounded text-xs">
                            <div className="flex flex-col items-center">
                              <div className="h-2 w-2 rounded-full bg-slate-400 mt-1" />
                              {i < statusTimeline.length - 1 && <div className="w-px h-full bg-slate-200 mt-1" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800">{entry.title}</p>
                              {entry.message && <p className="text-muted-foreground mt-0.5">{entry.message}</p>}
                              <p className="text-muted-foreground/70 mt-0.5">{new Date(entry.createdAt).toLocaleString("es-MX")}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedMsg.status !== "cerrado" && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Responder al remitente:</p>
                      <textarea className="w-full text-sm border rounded p-2 resize-none" rows={3} placeholder="Escribir respuesta..." value={responseText} onChange={e => setResponseText(e.target.value)} />
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" onClick={() => respondMutation.mutate({ id: selectedMsg.id, responseBody: responseText })}
                          disabled={!responseText.trim() || respondMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                          <Send className="h-4 w-4 mr-1" />{respondMutation.isPending ? "Enviando..." : "Enviar Respuesta"}
                        </Button>
                        {!selectedMsg.isAnonymous && selectedMsg.senderId ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setShowNotifyModal(true)}
                            className="border-amber-500 text-amber-700 hover:bg-amber-50"
                            title="Enviar notificación push al empleado para que revise su buzón"
                          >
                            <Bell className="h-4 w-4 mr-1" />Notificar al empleado
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center gap-1 italic">
                            <Bell className="h-3 w-3" />Mensaje anónimo — no se puede notificar
                          </span>
                        )}
                      </div>
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

          {/* Notify employee modal */}
          {showNotifyModal && selectedMsg && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-md">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-amber-600" />
                      Notificar al Empleado
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => { setShowNotifyModal(false); setNotifyCustomMsg(""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="bg-amber-50 border border-amber-200 rounded p-3">
                    <p className="text-xs font-medium text-amber-800 mb-1">Mensaje seleccionado:</p>
                    <p className="text-sm font-medium truncate">{selectedMsg.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Se notificará al remitente para que revise su buzón en <strong>/mi-buzon</strong></p>
                  </div>
                  {lastNotifData?.isBlocked && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded p-3">
                      <span className="text-red-500 text-lg leading-none mt-0.5">⚠️</span>
                      <div>
                        <p className="text-xs font-semibold text-red-700">Límite de 24 horas activo</p>
                        <p className="text-xs text-red-600 mt-0.5">
                          Ya se envió una notificación a este empleado. Próximo envío permitido:
                        </p>
                        <p className="text-xs font-medium text-red-700 mt-0.5">
                          {lastNotifData.blockedUntil ? new Date(lastNotifData.blockedUntil).toLocaleString("es-MX") : ""}
                        </p>
                        {blockCountdown && (
                          <p className="text-xs font-bold text-red-800 mt-1 bg-red-100 px-2 py-0.5 rounded inline-block">
                            ⏱ Disponible en: {blockCountdown}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Mensaje personalizado <span className="text-muted-foreground/60">(opcional, máx. 300 caracteres)</span>
                    </label>
                    <textarea
                      className="w-full text-sm border rounded p-2 resize-none"
                      rows={3}
                      maxLength={300}
                      placeholder="Ej: Hemos revisado su mensaje y tenemos una respuesta para usted. Por favor revise su buzón..."
                      value={notifyCustomMsg}
                      onChange={e => setNotifyCustomMsg(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground text-right">{notifyCustomMsg.length}/300</p>
                  </div>
                  <div className="flex gap-2 justify-end pt-2 border-t">
                    <Button variant="outline" onClick={() => { setShowNotifyModal(false); setNotifyCustomMsg(""); }}>Cancelar</Button>
                    <Button
                      onClick={() => notifyEmployeeMutation.mutate({ id: selectedMsg.id, customMessage: notifyCustomMsg.trim() || undefined })}
                      disabled={notifyEmployeeMutation.isPending || lastNotifData?.isBlocked === true}
                      className="bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      title={lastNotifData?.isBlocked ? `Bloqueado hasta: ${lastNotifData.blockedUntil ? new Date(lastNotifData.blockedUntil).toLocaleString("es-MX") : ""}` : ""}
                    >
                      <Bell className="h-4 w-4 mr-1" />
                      {notifyEmployeeMutation.isPending ? "Enviando..." : lastNotifData?.isBlocked ? "Bloqueado (24h)" : "Enviar Notificación"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Status change reason modal */}
          {showStatusModal && pendingStatus && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <Card className="w-full max-w-md">
                <CardHeader className="pb-3 border-b">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2">
                      <span className="text-sm">Cambiar estado</span>
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => { setShowStatusModal(false); setPendingStatus(null); setStatusReason(""); }}>
                      <X className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="bg-blue-50 border border-blue-200 rounded p-3">
                    <p className="text-xs font-medium text-blue-800 mb-1">Nuevo estado:</p>
                    <p className="text-sm font-semibold">{STATUS_CONFIG[pendingStatus as keyof typeof STATUS_CONFIG]?.label ?? pendingStatus}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">
                      Motivo del cambio <span className="text-muted-foreground">(opcional)</span>
                    </label>
                    <textarea
                      className="w-full text-sm border rounded px-3 py-2 resize-none"
                      rows={3}
                      maxLength={500}
                      placeholder="Describe el motivo del cambio de estado (máx. 500 caracteres)..."
                      value={statusReason}
                      onChange={e => setStatusReason(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground text-right mt-0.5">{statusReason.length}/500</p>
                  </div>
                  <p className="text-xs text-muted-foreground">El motivo quedará registrado como evidencia de gestión en el historial del mensaje.</p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={() => { setShowStatusModal(false); setPendingStatus(null); setStatusReason(""); }}>Cancelar</Button>
                    <Button size="sm" onClick={confirmStatusChange} disabled={updateStatusMutation.isPending}>
                      {updateStatusMutation.isPending ? "Guardando..." : "Confirmar cambio"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

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
