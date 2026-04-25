import { useState } from "react";
import * as XLSX from "xlsx";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen, Plus, Pencil, Trash2, Eye, FileText, Search,
  CheckCircle2, Clock, XCircle, PlayCircle, Download, ChevronLeft,
  Calendar, Users, DollarSign, BarChart3, FileDown, AlertTriangle,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  borrador:     { label: "Borrador",      color: "bg-slate-100 text-slate-700" },
  aprobado:     { label: "Aprobado",      color: "bg-blue-100 text-blue-700" },
  en_ejecucion: { label: "En Ejecución",  color: "bg-emerald-100 text-emerald-700" },
  cerrado:      { label: "Cerrado",       color: "bg-gray-100 text-gray-600" },
};
const ITEM_STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pendiente:  { label: "Pendiente",   color: "bg-amber-100 text-amber-700",   icon: Clock },
  en_proceso: { label: "En Proceso",  color: "bg-blue-100 text-blue-700",     icon: PlayCircle },
  completado: { label: "Completado",  color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  cancelado:  { label: "Cancelado",   color: "bg-red-100 text-red-700",       icon: XCircle },
};
const MODALITY_LABELS: Record<string, string> = {
  presencial: "Presencial", virtual: "Virtual", mixta: "Mixta", e_learning: "E-Learning",
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: "bg-slate-100 text-slate-700" };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>{s.label}</span>;
}
function ItemStatusBadge({ status }: { status: string }) {
  const s = ITEM_STATUS_LABELS[status] ?? { label: status, color: "bg-slate-100 text-slate-700", icon: Clock };
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${s.color}`}>
      <Icon className="w-3 h-3" />{s.label}
    </span>
  );
}

// ─── Días sin actualizar ─────────────────────────────────────────────────────
function diasSinActualizar(updatedAt: string | Date | null | undefined): number | null {
  if (!updatedAt) return null;
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
}
function StaleBadge({ dias }: { dias: number | null }) {
  if (dias === null) return <span className="text-slate-400 text-xs">—</span>;
  if (dias <= 7)  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">{dias}d</span>;
  if (dias <= 30) return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">{dias}d</span>;
  return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">{dias}d ⚠</span>;
}


// ─── Cuenta ítems con >30 días sin actualizar ─────────────────────────────────
function staleItemsCount(items: any[]): number {
  return items.filter(item => {
    if (!item.updatedAt) return false;
    const days = Math.floor((Date.now() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    return days > 30;
  }).length;
}

// ─── Exportar PAC a XLSX ──────────────────────────────────────────────────────
function exportXLSX(plan: any, items: any[]) {
  const MOD: Record<string, string> = { presencial: "Presencial", virtual: "Virtual", mixta: "Mixta", e_learning: "E-Learning" };
  const STA: Record<string, string> = { pendiente: "Pendiente", en_proceso: "En Proceso", completado: "Completado", cancelado: "Cancelado" };
  const rows = items.map((item) => ({
    "Curso": item.courseName ?? "",
    "Modalidad": MOD[item.modality] ?? item.modality ?? "",
    "Horas": item.durationHours ?? "",
    "Fecha Planeada": item.plannedDate ? new Date(item.plannedDate).toLocaleDateString("es-MX") : "",
    "Fecha Real": item.actualDate ? new Date(item.actualDate).toLocaleDateString("es-MX") : "",
    "Instructor": item.instructor ?? "",
    "Participantes Meta": item.participantsTarget ?? "",
    "Participantes Real": item.participantsActual ?? "",
    "Costo Estimado": item.estimatedCost ?? "",
    "Costo Real": item.actualCost ?? "",
    "Ref. Normativa": item.normativeReference ?? "",
    "Estatus": STA[item.status] ?? item.status ?? "",
    "Días sin actualizar": diasSinActualizar(item.updatedAt) ?? "",
    "Última actualización": item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("es-MX") : "",
  }));
  const resumen = [
    ["Plan", plan.title ?? ""], ["Año", plan.year ?? ""],
    ["Departamento", plan.departmentName ?? "General"], ["Estatus", plan.status ?? ""],
    ["Total cursos", items.length],
    ["Completados", items.filter((i: any) => i.status === "completado").length],
    ["En proceso", items.filter((i: any) => i.status === "en_proceso").length],
    ["Pendientes", items.filter((i: any) => i.status === "pendiente").length],
    ["Cancelados", items.filter((i: any) => i.status === "cancelado").length],
  ];
  const wb = XLSX.utils.book_new();
  const wsR = XLSX.utils.aoa_to_sheet(resumen);
  wsR["!cols"] = [{ wch: 20 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(wb, wsR, "Resumen");
  const wsC = XLSX.utils.json_to_sheet(rows);
  wsC["!cols"] = [{ wch: 35 }, { wch: 14 }, { wch: 8 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsC, "Cursos");
  XLSX.writeFile(wb, `PAC_${plan.year}_${(plan.title ?? "plan").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Exportar PDF ─────────────────────────────────────────────────────────────
async function exportPDF(plan: any, items: any[]) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const pageW = doc.internal.pageSize.getWidth();
  let y = 20;

  // Encabezado
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("PROGRAMA ANUAL DE CAPACITACIÓN (PAC)", pageW / 2, 9, { align: "center" });

  y = 22;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(plan.title, pageW / 2, y, { align: "center" });
  y += 7;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Año: ${plan.year}  |  Departamento: ${plan.departmentName ?? "General"}  |  Estatus: ${STATUS_LABELS[plan.status]?.label ?? plan.status}`, pageW / 2, y, { align: "center" });
  y += 8;

  // Descripción
  if (plan.description) {
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    const descLines = doc.splitTextToSize(plan.description, pageW - 30);
    doc.text(descLines, 15, y);
    y += descLines.length * 5 + 4;
  }

  // Línea separadora
  doc.setDrawColor(226, 232, 240);
  doc.line(15, y, pageW - 15, y);
  y += 6;

  // Tabla de cursos
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("CURSOS / ACTIVIDADES DE CAPACITACIÓN", 15, y);
  y += 5;

  const colWidths = [50, 20, 12, 20, 18, 24, 18];
  const headers = ["Curso", "Modalidad", "Horas", "Fecha Plan.", "Participantes", "Estatus", "D\u00edas s/act."];
  const startX = 15;

  // Cabecera de tabla
  doc.setFillColor(241, 245, 249);
  doc.rect(startX, y, pageW - 30, 7, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  let cx = startX + 2;
  headers.forEach((h, i) => { doc.text(h, cx, y + 5); cx += colWidths[i]; });
  y += 7;

  // Filas
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 41, 59);
  items.forEach((item, idx) => {
    if (y > 270) { doc.addPage(); y = 20; }
    const staleDays = item.updatedAt
      ? Math.floor((Date.now() - new Date(item.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;
    const isStale = staleDays !== null && staleDays > 30;
    if (isStale) {
      doc.setFillColor(254, 226, 226); // red-100
      doc.rect(startX, y, pageW - 30, 7, "F");
    } else if (idx % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(startX, y, pageW - 30, 7, "F");
    }
    doc.setTextColor(isStale ? 185 : 30, isStale ? 28 : 41, isStale ? 28 : 59);
    cx = startX + 2;
    const rowData = [
      item.courseName.substring(0, 28),
      MODALITY_LABELS[item.modality] ?? item.modality,
      item.durationHours ? String(item.durationHours) : "-",
      item.plannedDate ? new Date(item.plannedDate).toLocaleDateString("es-MX") : "-",
      item.participantsTarget ? String(item.participantsTarget) : "-",
      ITEM_STATUS_LABELS[item.status]?.label ?? item.status,
      staleDays !== null ? `${staleDays}d` : "-",
    ];
    rowData.forEach((cell, i) => { doc.text(String(cell), cx, y + 5); cx += colWidths[i]; });
    y += 7;
  });

  // Pie de página
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`NOM-035 STPS 2018 — PAC ${plan.year}`, 15, 290);
    doc.text(`Generado: ${new Date().toLocaleDateString("es-MX")}  |  Pág. ${i}/${totalPages}`, pageW - 15, 290, { align: "right" });
  }

  doc.save(`PAC_${plan.year}_${plan.title.replace(/\s+/g, "_")}.pdf`);
}

// ─── Formulario de Plan ───────────────────────────────────────────────────────
function PlanForm({ initial, onSave, onCancel }: {
  initial?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    year: initial?.year ?? new Date().getFullYear(),
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    departmentId: initial?.departmentId ? String(initial.departmentId) : "",
    totalBudget: initial?.totalBudget ? String(initial.totalBudget) : "",
  });
  const { data: deptList } = trpc.departments.list.useQuery({ page: 1, pageSize: 100, isActive: true }, { retry: false });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Año *</Label>
          <Input type="number" value={form.year} onChange={e => set("year", e.target.value)} min={2020} max={2099} />
        </div>
        <div>
          <Label>Departamento</Label>
          <Select value={form.departmentId || "none"} onValueChange={v => set("departmentId", v === "none" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Todos / General" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Todos / General</SelectItem>
              {deptList?.data?.map((d: any) => <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Título del PAC *</Label>
        <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="Ej: PAC 2025 - NOM-035 STPS" />
      </div>
      <div>
        <Label>Descripción</Label>
        <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} />
      </div>
      <div>
        <Label>Presupuesto estimado (MXN)</Label>
        <Input type="number" value={form.totalBudget} onChange={e => set("totalBudget", e.target.value)} placeholder="0" />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave({
          year: Number(form.year),
          title: form.title,
          description: form.description || undefined,
          departmentId: form.departmentId ? Number(form.departmentId) : undefined,
          totalBudget: form.totalBudget ? Number(form.totalBudget) : undefined,
        })} disabled={!form.title || !form.year}>
          {initial ? "Guardar cambios" : "Crear PAC"}
        </Button>
      </div>
    </div>
  );
}

// ─── Formulario de Item ───────────────────────────────────────────────────────
function ItemForm({ planId, initial, onSave, onCancel }: {
  planId: number;
  initial?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    courseName: initial?.courseName ?? "",
    objective: initial?.objective ?? "",
    targetAudience: initial?.targetAudience ?? "",
    modality: initial?.modality ?? "presencial",
    durationHours: initial?.durationHours ? String(initial.durationHours) : "",
    plannedDate: initial?.plannedDate ? new Date(initial.plannedDate).toISOString().split("T")[0] : "",
    instructor: initial?.instructor ?? "",
    estimatedCost: initial?.estimatedCost ? String(initial.estimatedCost) : "",
    participantsTarget: initial?.participantsTarget ? String(initial.participantsTarget) : "",
    normativeReference: initial?.normativeReference ?? "",
    notes: initial?.notes ?? "",
    status: initial?.status ?? "pendiente",
    actualCost: initial?.actualCost ? String(initial.actualCost) : "",
    participantsActual: initial?.participantsActual ? String(initial.participantsActual) : "",
    completedDate: initial?.completedDate ? new Date(initial.completedDate).toISOString().split("T")[0] : "",
    dncId: initial?.dncId ? String(initial.dncId) : "",
  });
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const { data: dncNeeds } = trpc.annualTrainingPlan.listDncNeeds.useQuery({}, { retry: false });

  return (
    <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <div>
        <Label>Nombre del Curso / Actividad *</Label>
        <Input value={form.courseName} onChange={e => set("courseName", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Modalidad</Label>
          <Select value={form.modality} onValueChange={v => set("modality", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="presencial">Presencial</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
              <SelectItem value="mixta">Mixta</SelectItem>
              <SelectItem value="e_learning">E-Learning</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Estatus</Label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="en_proceso">En Proceso</SelectItem>
              <SelectItem value="completado">Completado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Fecha Planeada</Label>
          <Input type="date" value={form.plannedDate} onChange={e => set("plannedDate", e.target.value)} />
        </div>
        <div>
          <Label>Fecha Completada</Label>
          <Input type="date" value={form.completedDate} onChange={e => set("completedDate", e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Label>Duración (horas)</Label>
          <Input type="number" value={form.durationHours} onChange={e => set("durationHours", e.target.value)} />
        </div>
        <div>
          <Label>Participantes meta</Label>
          <Input type="number" value={form.participantsTarget} onChange={e => set("participantsTarget", e.target.value)} />
        </div>
        <div>
          <Label>Participantes reales</Label>
          <Input type="number" value={form.participantsActual} onChange={e => set("participantsActual", e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Instructor / Proveedor</Label>
        <Input value={form.instructor} onChange={e => set("instructor", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Costo estimado (MXN)</Label>
          <Input type="number" value={form.estimatedCost} onChange={e => set("estimatedCost", e.target.value)} />
        </div>
        <div>
          <Label>Costo real (MXN)</Label>
          <Input type="number" value={form.actualCost} onChange={e => set("actualCost", e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Referencia Normativa</Label>
        <Input value={form.normativeReference} onChange={e => set("normativeReference", e.target.value)} placeholder="Ej: NOM-035-STPS-2018, Art. 8" />
      </div>
      <div>
        <Label>Objetivo</Label>
        <Textarea value={form.objective} onChange={e => set("objective", e.target.value)} rows={2} />
      </div>
      <div>
        <Label>Audiencia objetivo</Label>
        <Input value={form.targetAudience} onChange={e => set("targetAudience", e.target.value)} />
      </div>
      <div>
        <Label>Vincular a DNC (Detección de Necesidades) <span className="text-slate-400 font-normal text-xs">— opcional</span></Label>
        <Select value={form.dncId || "__none__"} onValueChange={v => set("dncId", v === "__none__" ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="Sin vinculación DNC" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Sin vinculación DNC</SelectItem>
            {(dncNeeds ?? []).map(n => (
              <SelectItem key={n.id} value={String(n.id)}>
                [{n.priority.toUpperCase()}] {n.competencyName} — brecha: {n.gap}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.dncId && (
          <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
            ✓ Vinculado a necesidad DNC #{form.dncId}
          </p>
        )}
      </div>
      <div>
        <Label>Notas</Label>
        <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
      </div>
      <div className="flex gap-2 justify-end pt-2">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSave({
          planId,
          courseName: form.courseName,
          objective: form.objective || undefined,
          targetAudience: form.targetAudience || undefined,
          modality: form.modality as any,
          durationHours: form.durationHours ? Number(form.durationHours) : undefined,
          plannedDate: form.plannedDate || undefined,
          completedDate: form.completedDate || undefined,
          instructor: form.instructor || undefined,
          estimatedCost: form.estimatedCost ? Number(form.estimatedCost) : undefined,
          actualCost: form.actualCost ? Number(form.actualCost) : undefined,
          participantsTarget: form.participantsTarget ? Number(form.participantsTarget) : undefined,
          participantsActual: form.participantsActual ? Number(form.participantsActual) : undefined,
          normativeReference: form.normativeReference || undefined,
          notes: form.notes || undefined,
          status: form.status as any,
          dncId: form.dncId ? Number(form.dncId) : undefined,
        })} disabled={!form.courseName}>
          {initial ? "Guardar cambios" : "Agregar curso"}
        </Button>
      </div>
    </div>
  );
}

// ─── Vista de detalle del plan ────────────────────────────────────────────────
function PlanDetail({ planId, onBack }: { planId: number; onBack: () => void }) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [showAddItem, setShowAddItem] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

  const { data, isLoading } = trpc.annualTrainingPlan.getById.useQuery({ id: planId }, { retry: false });
  const { data: stats } = trpc.annualTrainingPlan.getStats.useQuery({ planId }, { retry: false });

  const addItem = trpc.annualTrainingPlan.addItem.useMutation({
    onSuccess: () => { utils.annualTrainingPlan.getById.invalidate({ id: planId }); utils.annualTrainingPlan.getStats.invalidate({ planId }); setShowAddItem(false); toast({ title: "Curso agregado" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updItem = trpc.annualTrainingPlan.updateItem.useMutation({
    onSuccess: () => { utils.annualTrainingPlan.getById.invalidate({ id: planId }); utils.annualTrainingPlan.getStats.invalidate({ planId }); setEditItem(null); toast({ title: "Curso actualizado" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const delItem = trpc.annualTrainingPlan.deleteItem.useMutation({
    onSuccess: () => { utils.annualTrainingPlan.getById.invalidate({ id: planId }); utils.annualTrainingPlan.getStats.invalidate({ planId }); setDeleteItemId(null); toast({ title: "Curso eliminado" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" /></div>;
  if (!data) return <div className="text-center text-slate-500 py-12">Plan no encontrado</div>;

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-start gap-3">
        <Button variant="outline" size="sm" onClick={onBack} className="gap-1.5 mt-0.5">
          <ChevronLeft className="w-4 h-4" />Volver
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl font-bold text-slate-900">{data.title}</h2>
            <StatusBadge status={data.status} />
            <Badge variant="outline" className="text-xs">{data.year}</Badge>
          </div>
          {data.description && <p className="text-sm text-slate-500 mt-1">{data.description}</p>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportPDF(data, data.items)}>
            <Download className="w-4 h-4" />PDF
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={() => exportXLSX(data, data.items)}>
            <FileDown className="w-4 h-4" />XLSX
          </Button>
        </div>
      </div>

      {/* KPIs del plan */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total cursos", value: stats.total, icon: BookOpen, color: "#3b82f6" },
            { label: "Completados", value: stats.completed, icon: CheckCircle2, color: "#22c55e" },
            { label: "Avance", value: `${stats.completionRate}%`, icon: BarChart3, color: "#8b5cf6" },
            { label: "Horas planeadas", value: stats.totalHours, icon: Calendar, color: "#f59e0b" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-slate-200">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">{label}</p>
                    <p className="text-2xl font-bold mt-0.5" style={{ color }}>{value}</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ background: `${color}18` }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tabla de cursos */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-600" />Cursos / Actividades
            </CardTitle>
            <Button size="sm" className="gap-1.5" onClick={() => setShowAddItem(true)}>
              <Plus className="w-3.5 h-3.5" />Agregar curso
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead>Curso</TableHead>
                <TableHead>Modalidad</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>Fecha Plan.</TableHead>
                <TableHead>Instructor</TableHead>
                <TableHead>Participantes</TableHead>
                <TableHead>Ref. Normativa</TableHead>
                <TableHead>Estatus</TableHead>
                <TableHead className="w-28 text-center">Sin actualizar</TableHead>
                <TableHead className="w-20">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-slate-400 py-8">Sin cursos registrados. Haz clic en "Agregar curso".</TableCell></TableRow>
              )}
              {data.items.map((item: any) => (
                <TableRow key={item.id} className="hover:bg-slate-50">
                  <TableCell className="font-medium max-w-[180px] truncate" title={item.courseName}>{item.courseName}</TableCell>
                  <TableCell className="text-sm">{MODALITY_LABELS[item.modality] ?? item.modality}</TableCell>
                  <TableCell className="text-sm">{item.durationHours ?? "-"}</TableCell>
                  <TableCell className="text-sm">{item.plannedDate ? new Date(item.plannedDate).toLocaleDateString("es-MX") : "-"}</TableCell>
                  <TableCell className="text-sm max-w-[120px] truncate">{item.instructor ?? "-"}</TableCell>
                  <TableCell className="text-sm">{item.participantsActual ?? "-"}/{item.participantsTarget ?? "-"}</TableCell>
                  <TableCell className="text-xs text-slate-500">{item.normativeReference ?? "-"}</TableCell>
                  <TableCell><ItemStatusBadge status={item.status} /></TableCell>
                  <TableCell className="text-center"><StaleBadge dias={diasSinActualizar(item.updatedAt)} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setEditItem(item)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="w-7 h-7 text-red-500 hover:text-red-700" onClick={() => setDeleteItemId(item.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal agregar item */}
      <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Agregar Curso al PAC</DialogTitle></DialogHeader>
          <ItemForm planId={planId} onSave={(d) => addItem.mutate(d)} onCancel={() => setShowAddItem(false)} />
        </DialogContent>
      </Dialog>

      {/* Modal editar item */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Editar Curso</DialogTitle></DialogHeader>
          {editItem && <ItemForm planId={planId} initial={editItem} onSave={(d) => updItem.mutate({ id: editItem.id, ...d })} onCancel={() => setEditItem(null)} />}
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar item */}
      <Dialog open={deleteItemId !== null} onOpenChange={(o) => !o && setDeleteItemId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Eliminar Curso</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-600">¿Confirmas que deseas eliminar este curso del PAC? Esta acción no se puede deshacer.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItemId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteItemId && delItem.mutate({ id: deleteItemId })}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AnnualTrainingPlan() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editPlan, setEditPlan] = useState<any>(null);
  const [deletePlanId, setDeletePlanId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [onlyStalePlans, setOnlyStalePlans] = useState(false);
  const [page, setPage] = useState(1);

  const { data: availableYears } = trpc.annualTrainingPlan.getAvailableYears.useQuery(undefined, { retry: false });

  const { data, isLoading } = trpc.annualTrainingPlan.list.useQuery({
    page,
    pageSize: 15,
    search: search || undefined,
    year: filterYear !== "all" ? Number(filterYear) : undefined,
    status: filterStatus !== "all" ? filterStatus as any : undefined,
  }, { retry: false });

  const createMut = trpc.annualTrainingPlan.create.useMutation({
    onSuccess: () => { utils.annualTrainingPlan.list.invalidate(); setShowCreate(false); toast({ title: "PAC creado exitosamente" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateMut = trpc.annualTrainingPlan.update.useMutation({
    onSuccess: () => { utils.annualTrainingPlan.list.invalidate(); setEditPlan(null); toast({ title: "PAC actualizado" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteMut = trpc.annualTrainingPlan.delete.useMutation({
    onSuccess: () => { utils.annualTrainingPlan.list.invalidate(); setDeletePlanId(null); toast({ title: "PAC eliminado" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (selectedPlanId !== null) {
    return (
      <DashboardLayout>
        <div className="p-6 max-w-6xl mx-auto">
          <PlanDetail planId={selectedPlanId} onBack={() => setSelectedPlanId(null)} />
        </div>
      </DashboardLayout>
    );
  }

  const years = availableYears ?? [new Date().getFullYear()];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* Encabezado */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Programa Anual de Capacitación (PAC)
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Gestión de planes anuales de capacitación conforme a NOM-035 STPS 2018.
            </p>
          </div>
          <Button className="gap-1.5" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4" />Nuevo PAC
          </Button>
        </div>

        {/* Selector de año — historial rápido */}
        {years.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setFilterYear("all"); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full font-medium border transition-colors ${
                filterYear === "all"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"
              }`}
            >
              Todos los años
            </button>
            {years.map((y) => (
              <button
                key={y}
                onClick={() => { setFilterYear(String(y)); setPage(1); }}
                className={`px-3 py-1.5 text-xs rounded-full font-medium border transition-colors ${
                  filterYear === String(y)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input className="pl-9" placeholder="Buscar por título..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={filterYear} onValueChange={v => { setFilterYear(v); setPage(1); }}>
            <SelectTrigger className="w-32"><SelectValue placeholder="Año" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los años</SelectItem>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Estatus" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estatus</SelectItem>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="aprobado">Aprobado</SelectItem>
              <SelectItem value="en_ejecucion">En Ejecución</SelectItem>
              <SelectItem value="cerrado">Cerrado</SelectItem>
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => { setOnlyStalePlans(v => !v); setPage(1); }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
              onlyStalePlans
                ? "bg-red-600 text-white border-red-600 hover:bg-red-700"
                : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Solo rezagados
          </button>
        </div>

        {/* Tabla de planes */}
        <Card className="border-slate-200">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Año</TableHead>
                    <TableHead>Título del PAC</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead>Cursos</TableHead>
                    <TableHead>Presupuesto</TableHead>
                    <TableHead>Estatus</TableHead>
                    <TableHead className="w-28">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const filteredPlans = onlyStalePlans
                      ? (data?.plans ?? []).filter((p: any) => Number(p.staleItemsCount) > 0)
                      : (data?.plans ?? []);
                    if (filteredPlans.length === 0) return (
                      <TableRow><TableCell colSpan={8} className="text-center text-slate-400 py-10">
                        {onlyStalePlans ? "No hay planes con cursos rezagados." : "No se encontraron planes. Crea el primero con \"Nuevo PAC\"."}
                      </TableCell></TableRow>
                    );
                    return filteredPlans.map((plan: any) => (
                    <TableRow key={plan.id} className="hover:bg-slate-50">
                      <TableCell className="font-semibold text-blue-700">{plan.year}</TableCell>
                      <TableCell className="font-medium max-w-[220px] truncate" title={plan.title}>{plan.title}</TableCell>
                      <TableCell className="text-sm text-slate-600">{plan.departmentName ?? "General"}</TableCell>
                      <TableCell className="text-sm text-slate-600">
                        {plan.responsibleFirstName ? `${plan.responsibleFirstName} ${plan.responsibleLastName ?? ""}` : "-"}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-sm">
                          <BookOpen className="w-3.5 h-3.5 text-slate-400" />{plan.itemCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {plan.totalBudget ? `$${Number(plan.totalBudget).toLocaleString("es-MX")}` : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={plan.status} />
                          {Number(plan.staleItemsCount) > 0 && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200 cursor-help"
                              title={`Cursos rezagados (>30 d\u00edas sin actualizar): ${plan.staleItemsCount} curso${plan.staleItemsCount > 1 ? 's' : ''} en este plan requieren atenci\u00f3n.`}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              {plan.staleItemsCount}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="w-7 h-7" title="Ver detalle" onClick={() => setSelectedPlanId(plan.id)}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="w-7 h-7" title="Editar" onClick={() => setEditPlan(plan)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="w-7 h-7 text-red-500 hover:text-red-700" title="Eliminar" onClick={() => setDeletePlanId(plan.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ));
                  })()}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Paginación */}
        {data && data.total > 15 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Mostrando {Math.min((page - 1) * 15 + 1, data.total)}–{Math.min(page * 15, data.total)} de {data.total}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={page * 15 >= data.total} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}

        {/* Modal crear PAC */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Nuevo Programa Anual de Capacitación</DialogTitle></DialogHeader>
            <PlanForm onSave={(d) => createMut.mutate(d)} onCancel={() => setShowCreate(false)} />
          </DialogContent>
        </Dialog>

        {/* Modal editar PAC */}
        <Dialog open={!!editPlan} onOpenChange={(o) => !o && setEditPlan(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Editar PAC</DialogTitle></DialogHeader>
            {editPlan && <PlanForm initial={editPlan} onSave={(d) => updateMut.mutate({ id: editPlan.id, ...d })} onCancel={() => setEditPlan(null)} />}
          </DialogContent>
        </Dialog>

        {/* Confirmar eliminar PAC */}
        <Dialog open={deletePlanId !== null} onOpenChange={(o) => !o && setDeletePlanId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Eliminar PAC</DialogTitle></DialogHeader>
            <p className="text-sm text-slate-600">¿Confirmas que deseas eliminar este Programa Anual de Capacitación y todos sus cursos? Esta acción no se puede deshacer.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletePlanId(null)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => deletePlanId && deleteMut.mutate({ id: deletePlanId })}>Eliminar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
