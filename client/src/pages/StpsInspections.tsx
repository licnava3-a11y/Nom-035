import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Plus, FileText, CheckCircle, XCircle, AlertCircle, MinusCircle, Download, Eye } from "lucide-react";

type InspectionStatus = "programada" | "en_proceso" | "concluida" | "con_observaciones";
type ItemStatus = "cumple" | "no_cumple" | "parcial" | "na";

const STATUS_LABELS: Record<InspectionStatus, string> = {
  programada: "Programada",
  en_proceso: "En Proceso",
  concluida: "Concluida",
  con_observaciones: "Con Observaciones",
};

const STATUS_COLORS: Record<InspectionStatus, string> = {
  programada: "bg-blue-100 text-blue-700",
  en_proceso: "bg-yellow-100 text-yellow-700",
  concluida: "bg-green-100 text-green-700",
  con_observaciones: "bg-red-100 text-red-700",
};

const ITEM_STATUS_CONFIG: Record<ItemStatus, { label: string; icon: React.ReactNode; color: string }> = {
  cumple: { label: "Cumple", icon: <CheckCircle className="h-4 w-4" />, color: "text-green-600" },
  no_cumple: { label: "No Cumple", icon: <XCircle className="h-4 w-4" />, color: "text-red-600" },
  parcial: { label: "Parcial", icon: <AlertCircle className="h-4 w-4" />, color: "text-yellow-600" },
  na: { label: "N/A", icon: <MinusCircle className="h-4 w-4" />, color: "text-gray-400" },
};

export default function StpsInspections() {
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState({
    inspectionDate: new Date().toISOString().split("T")[0],
    inspectorName: "",
    inspectorId: "",
    inspectionType: "ordinaria" as "ordinaria" | "extraordinaria" | "seguimiento",
    responsibleName: "",
    observations: "",
  });

  const utils = trpc.useUtils();
  const { data: inspections = [], isLoading } = trpc.stpsInspections.listInspections.useQuery();
  const { data: stats } = trpc.stpsInspections.getInspectionStats.useQuery();
  const { data: detail, isLoading: loadingDetail } = trpc.stpsInspections.getInspectionDetail.useQuery(
    { id: selectedId! },
    { enabled: !!selectedId }
  );

  const createMut = trpc.stpsInspections.createInspection.useMutation({
    onSuccess: (data) => {
      toast({ title: `Visita creada — Folio: ${data.folio}` });
      utils.stpsInspections.listInspections.invalidate();
      utils.stpsInspections.getInspectionStats.invalidate();
      setShowCreate(false);
      setSelectedId(data.id);
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateItemMut = trpc.stpsInspections.updateChecklistItem.useMutation({
    onSuccess: () => utils.stpsInspections.getInspectionDetail.invalidate({ id: selectedId! }),
  });

  const updateStatusMut = trpc.stpsInspections.updateInspectionStatus.useMutation({
    onSuccess: () => {
      utils.stpsInspections.listInspections.invalidate();
      utils.stpsInspections.getInspectionDetail.invalidate({ id: selectedId! });
    },
  });

  const pdfMut = trpc.stpsInspections.generateExpedientPdf.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast({ title: `Expediente generado — ${data.folio}` });
    },
    onError: (e) => toast({ title: "Error al generar PDF", description: e.message, variant: "destructive" }),
  });

  const handleCreate = () => {
    if (!form.inspectorName.trim()) return toast({ title: "El nombre del inspector es requerido", variant: "destructive" });
    createMut.mutate(form);
  };

  const complianceColor = (rate: number) =>
    rate >= 80 ? "text-green-600" : rate >= 50 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-blue-600" />
            Visitas de Verificación STPS
          </h1>
          <p className="text-sm text-gray-500 mt-1">Registro y seguimiento de inspecciones NOM-035-STPS-2018</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Nueva Visita
        </Button>
      </div>

      {/* KPIs */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Total", value: stats.total, color: "bg-gray-50 text-gray-700" },
            { label: "Programadas", value: stats.programadas, color: "bg-blue-50 text-blue-700" },
            { label: "En Proceso", value: stats.enProceso, color: "bg-yellow-50 text-yellow-700" },
            { label: "Concluidas", value: stats.concluidas, color: "bg-green-50 text-green-700" },
            { label: "Con Observaciones", value: stats.conObservaciones, color: "bg-red-50 text-red-700" },
          ].map((kpi) => (
            <Card key={kpi.label} className={`${kpi.color} border-0`}>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold">{kpi.value}</div>
                <div className="text-xs mt-1">{kpi.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Lista de visitas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de Visitas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Cargando...</div>
          ) : inspections.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <ClipboardCheck className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>No hay visitas registradas</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowCreate(true)}>
                Registrar primera visita
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3 font-medium text-gray-600">Folio</th>
                    <th className="text-left p-3 font-medium text-gray-600">Fecha</th>
                    <th className="text-left p-3 font-medium text-gray-600">Inspector</th>
                    <th className="text-left p-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-left p-3 font-medium text-gray-600">Estado</th>
                    <th className="text-left p-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inspections.map((insp) => (
                    <tr key={insp.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-mono text-xs font-bold text-blue-700">{insp.folio}</td>
                      <td className="p-3">{new Date(insp.inspectionDate).toLocaleDateString("es-MX")}</td>
                      <td className="p-3">{insp.inspectorName}</td>
                      <td className="p-3 capitalize">{insp.inspectionType}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[insp.status as InspectionStatus]}`}>
                          {STATUS_LABELS[insp.status as InspectionStatus]}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedId(insp.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => pdfMut.mutate({ id: insp.id })}
                            disabled={pdfMut.isPending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diálogo de creación */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Visita de Verificación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha de Visita *</Label>
                <Input type="date" value={form.inspectionDate} onChange={(e) => setForm({ ...form, inspectionDate: e.target.value })} />
              </div>
              <div>
                <Label>Tipo de Visita</Label>
                <Select value={form.inspectionType} onValueChange={(v) => setForm({ ...form, inspectionType: v as typeof form.inspectionType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordinaria">Ordinaria</SelectItem>
                    <SelectItem value="extraordinaria">Extraordinaria</SelectItem>
                    <SelectItem value="seguimiento">Seguimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Nombre del Inspector STPS *</Label>
              <Input value={form.inspectorName} onChange={(e) => setForm({ ...form, inspectorName: e.target.value })} placeholder="Nombre completo del inspector" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>ID / Credencial del Inspector</Label>
                <Input value={form.inspectorId} onChange={(e) => setForm({ ...form, inspectorId: e.target.value })} placeholder="Número de credencial" />
              </div>
              <div>
                <Label>Responsable de la Empresa</Label>
                <Input value={form.responsibleName} onChange={(e) => setForm({ ...form, responsibleName: e.target.value })} placeholder="Nombre del responsable" />
              </div>
            </div>
            <div>
              <Label>Observaciones Iniciales</Label>
              <Textarea value={form.observations} onChange={(e) => setForm({ ...form, observations: e.target.value })} rows={3} placeholder="Observaciones previas a la visita..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={createMut.isPending} className="bg-blue-600 hover:bg-blue-700">
                {createMut.isPending ? "Creando..." : "Crear Visita"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de checklist */}
      <Dialog open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
              Checklist NOM-035 — {detail?.inspection.folio}
            </DialogTitle>
          </DialogHeader>
          {loadingDetail ? (
            <div className="p-8 text-center text-gray-400">Cargando checklist...</div>
          ) : detail ? (
            <div className="space-y-4">
              {/* Stats del checklist */}
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: "Cumple", value: detail.stats.cumple, color: "bg-green-50 text-green-700" },
                  { label: "No Cumple", value: detail.stats.noCumple, color: "bg-red-50 text-red-700" },
                  { label: "Parcial", value: detail.stats.parcial, color: "bg-yellow-50 text-yellow-700" },
                  { label: "N/A", value: detail.stats.na, color: "bg-gray-50 text-gray-600" },
                  { label: "Cumplimiento", value: `${detail.stats.complianceRate}%`, color: `${detail.stats.complianceRate >= 80 ? "bg-green-100 text-green-800" : detail.stats.complianceRate >= 50 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}` },
                ].map((s) => (
                  <div key={s.label} className={`rounded-lg p-3 text-center ${s.color}`}>
                    <div className="text-xl font-bold">{s.value}</div>
                    <div className="text-xs">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Acciones rápidas */}
              <div className="flex gap-2 flex-wrap">
                {(["en_proceso", "concluida", "con_observaciones"] as InspectionStatus[]).map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    size="sm"
                    onClick={() => updateStatusMut.mutate({ id: selectedId!, status: s })}
                    className={detail.inspection.status === s ? "border-blue-500 text-blue-700" : ""}
                  >
                    Marcar como {STATUS_LABELS[s]}
                  </Button>
                ))}
                <Button
                  size="sm"
                  onClick={() => pdfMut.mutate({ id: selectedId! })}
                  disabled={pdfMut.isPending}
                  className="bg-blue-600 hover:bg-blue-700 ml-auto"
                >
                  <FileText className="h-4 w-4 mr-1" />
                  {pdfMut.isPending ? "Generando..." : "Generar Expediente PDF"}
                </Button>
              </div>

              {/* Checklist por categoría */}
              {Object.entries(detail.byCategory).map(([cat, items]) => (
                <div key={cat}>
                  <h3 className="font-semibold text-sm text-blue-800 bg-blue-50 px-3 py-2 rounded-t-lg">{cat}</h3>
                  <div className="border border-t-0 rounded-b-lg overflow-hidden">
                    {items.map((item, idx) => (
                      <div key={item.id} className={`flex items-start gap-3 p-3 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"} border-b last:border-b-0`}>
                        <span className="font-mono text-xs font-bold text-blue-700 w-14 shrink-0 mt-0.5">{item.numeral}</span>
                        <span className="flex-1 text-sm text-gray-700">{item.requirement}</span>
                        <div className="flex gap-1 shrink-0">
                          {(["cumple", "no_cumple", "parcial", "na"] as ItemStatus[]).map((s) => (
                            <button
                              key={s}
                              title={ITEM_STATUS_CONFIG[s].label}
                              onClick={() => updateItemMut.mutate({ itemId: item.id, status: s })}
                              className={`p-1.5 rounded transition-colors ${item.status === s ? "bg-gray-200 ring-2 ring-offset-1 ring-blue-400" : "hover:bg-gray-100"} ${ITEM_STATUS_CONFIG[s].color}`}
                            >
                              {ITEM_STATUS_CONFIG[s].icon}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
