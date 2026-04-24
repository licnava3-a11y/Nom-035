import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, Plus, CheckCircle, Clock, TrendingUp, BarChart2 } from "lucide-react";

const PRI_COLOR: Record<string, string> = { critica: "bg-red-100 text-red-800", alta: "bg-orange-100 text-orange-800", normal: "bg-blue-100 text-blue-800", baja: "bg-slate-100 text-slate-700" };
const STATUS_COLOR: Record<string, string> = { pendiente: "bg-slate-100 text-slate-700", aprobada: "bg-blue-100 text-blue-700", en_desarrollo: "bg-yellow-100 text-yellow-800", implementada: "bg-green-100 text-green-700", descartada: "bg-red-100 text-red-700" };
const STATUS_LABEL: Record<string, string> = { pendiente: "Pendiente", aprobada: "Aprobada", en_desarrollo: "En Desarrollo", implementada: "Implementada", descartada: "Descartada" };

export default function FeatureRequests() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", justification: "", priority: "normal", module: "" });
  const [implNotes, setImplNotes] = useState("");
  const utils = trpc.useUtils();
  const { data: requests, isLoading } = trpc.featureRequests.list.useQuery({ status: filterStatus as any });
  const { data: stats } = trpc.featureRequests.getStats.useQuery();
  const createMutation = trpc.featureRequests.create.useMutation({
    onSuccess: () => { utils.featureRequests.list.invalidate(); utils.featureRequests.getStats.invalidate(); setShowCreate(false); setForm({ title: "", description: "", justification: "", priority: "normal", module: "" }); toast({ title: "Peticion creada" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateMutation = trpc.featureRequests.updateStatus.useMutation({
    onSuccess: () => { utils.featureRequests.list.invalidate(); utils.featureRequests.getStats.invalidate(); setSelected(null); toast({ title: "Estado actualizado" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Lightbulb className="h-6 w-6 text-yellow-500" />Peticiones de Mejora</h1>
          <p className="text-muted-foreground text-sm mt-1">Solicitudes de nuevas funcionalidades y mejoras del sistema</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-yellow-600 hover:bg-yellow-700 text-white"><Plus className="h-4 w-4 mr-1" />Nueva Peticion</Button>
      </div>

      {/* KPIs con % implementadas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="bg-slate-100 p-2 rounded-lg"><Clock className="h-5 w-5 text-slate-600" /></div><div><p className="text-xl font-bold">{stats?.pendiente ?? 0}</p><p className="text-xs text-muted-foreground">Pendientes</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="bg-yellow-100 p-2 rounded-lg"><TrendingUp className="h-5 w-5 text-yellow-600" /></div><div><p className="text-xl font-bold">{stats?.en_desarrollo ?? 0}</p><p className="text-xs text-muted-foreground">En Desarrollo</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5"><div className="flex items-center gap-3"><div className="bg-green-100 p-2 rounded-lg"><CheckCircle className="h-5 w-5 text-green-600" /></div><div><p className="text-xl font-bold">{stats?.implementada ?? 0}</p><p className="text-xs text-muted-foreground">Implementadas</p></div></div></CardContent></Card>
        <Card><CardContent className="pt-5">
          <div className="flex items-center gap-3"><div className="bg-indigo-100 p-2 rounded-lg"><BarChart2 className="h-5 w-5 text-indigo-600" /></div>
            <div>
              <p className="text-xl font-bold">{stats?.pctImplemented ?? 0}%</p>
              <p className="text-xs text-muted-foreground">% Implementadas</p>
            </div>
          </div>
          <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: (stats?.pctImplemented ?? 0) + "%" }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1">{stats?.pctInProgress ?? 0}% en progreso o implementadas</p>
        </CardContent></Card>
      </div>

      {/* Filtro */}
      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="aprobada">Aprobada</SelectItem>
            <SelectItem value="en_desarrollo">En Desarrollo</SelectItem>
            <SelectItem value="implementada">Implementada</SelectItem>
            <SelectItem value="descartada">Descartada</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">{requests?.length ?? 0} registros</span>
      </div>

      {/* Lista */}
      <Card><CardContent className="pt-4">
        {isLoading ? <p className="text-sm text-muted-foreground">Cargando...</p> : !(requests?.length) ? (
          <p className="text-sm text-muted-foreground italic text-center py-8">No hay peticiones en esta categoria.</p>
        ) : (
          <div className="space-y-2">
            {requests.map(req => (
              <div key={req.id} className="border rounded-lg p-3 hover:bg-accent/30 cursor-pointer transition-colors" onClick={() => { setSelected(req); setImplNotes(req.implementationNotes ?? ""); }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{req.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{req.description}</p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + PRI_COLOR[req.priority]}>{req.priority}</span>
                    <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + STATUS_COLOR[req.status]}>{STATUS_LABEL[req.status]}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  {req.module && <span className="text-xs text-muted-foreground">Modulo: {req.module}</span>}
                  <span className="text-xs text-muted-foreground ml-auto">{new Date(req.createdAt).toLocaleDateString("es-MX")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent></Card>

      {/* Modal Crear */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nueva Peticion de Mejora</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><label className="text-xs font-medium">Titulo *</label><input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Nombre de la mejora" /></div>
            <div><label className="text-xs font-medium">Descripcion *</label><textarea className="w-full border rounded px-3 py-2 text-sm mt-1 resize-none" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><label className="text-xs font-medium">Justificacion</label><textarea className="w-full border rounded px-3 py-2 text-sm mt-1 resize-none" rows={2} value={form.justification} onChange={e => setForm(f => ({ ...f, justification: e.target.value }))} placeholder="Por que es necesaria esta mejora?" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium">Prioridad</label><Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="critica">Critica</SelectItem><SelectItem value="alta">Alta</SelectItem><SelectItem value="normal">Normal</SelectItem><SelectItem value="baja">Baja</SelectItem></SelectContent></Select></div>
              <div><label className="text-xs font-medium">Modulo</label><input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.module} onChange={e => setForm(f => ({ ...f, module: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button className="bg-yellow-600 hover:bg-yellow-700 text-white" onClick={() => createMutation.mutate({ title: form.title, description: form.description, justification: form.justification || undefined, priority: form.priority as any, module: form.module || undefined })} disabled={!(form.title.trim()) || !(form.description.trim()) || createMutation.isPending}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Detalle */}
      {selected && (
        <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{selected.title}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2"><span className={"text-xs px-2 py-0.5 rounded-full font-medium " + PRI_COLOR[selected.priority]}>{selected.priority}</span><span className={"text-xs px-2 py-0.5 rounded-full font-medium " + STATUS_COLOR[selected.status]}>{STATUS_LABEL[selected.status]}</span></div>
              <p className="text-muted-foreground">{selected.description}</p>
              {selected.justification && <div><p className="font-medium text-xs mb-1">Justificacion:</p><p className="text-muted-foreground text-xs">{selected.justification}</p></div>}
              <div><label className="text-xs font-medium">Notas de implementacion</label><textarea className="w-full border rounded px-3 py-2 text-sm mt-1 resize-none" rows={2} value={implNotes} onChange={e => setImplNotes(e.target.value)} /></div>
              <div className="flex gap-2 flex-wrap pt-1">
                {(["pendiente","aprobada","en_desarrollo","implementada","descartada"] as const).map(s => (
                  <Button key={s} size="sm" variant={selected.status === s ? "default" : "outline"} onClick={() => updateMutation.mutate({ id: selected.id, status: s, implementationNotes: implNotes || undefined })} disabled={updateMutation.isPending}>{STATUS_LABEL[s]}</Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
