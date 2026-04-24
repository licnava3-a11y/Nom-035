import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Bug, Plus, CheckCircle, Clock, AlertTriangle, XCircle, Download, X, Search } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

const SEV_COLOR: Record<string, string> = {
  critico: "bg-red-100 text-red-800",
  alto: "bg-orange-100 text-orange-800",
  medio: "bg-yellow-100 text-yellow-800",
  bajo: "bg-green-100 text-green-800",
};
const STATUS_COLOR: Record<string, string> = {
  pendiente: "bg-slate-100 text-slate-700",
  en_revision: "bg-blue-100 text-blue-700",
  corregido: "bg-green-100 text-green-700",
  descartado: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<string, string> = {
  pendiente: "Pendiente",
  en_revision: "En Revision",
  corregido: "Corregido",
  descartado: "Descartado",
};

const PAGE_SIZE = 10;
export default function BugReports() {
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [searchText, setSearchText] = useState("");
  const debouncedSearch = useDebounce(searchText, 300);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", stepsToReproduce: "", severity: "medio", module: "" });
  const [resolution, setResolution] = useState("");
  const utils = trpc.useUtils();
  const { data: bugs, isLoading } = trpc.bugReports.list.useQuery({ status: filterStatus as any });
  const { data: stats } = trpc.bugReports.getStats.useQuery();
  const filteredBugs = useMemo(() => {
    let list = bugs ?? [];
    if (filterSeverity !== "all") list = list.filter(b => b.severity === filterSeverity);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      list = list.filter(b => b.title.toLowerCase().includes(q) || b.description.toLowerCase().includes(q) || (b.module ?? "").toLowerCase().includes(q));
    }
    return list;
  }, [bugs, filterSeverity, debouncedSearch]);
  const totalPages = Math.max(1, Math.ceil(filteredBugs.length / PAGE_SIZE));
  const pagedBugs = filteredBugs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const hasFilters = filterStatus !== "all" || filterSeverity !== "all" || searchText !== "";
  const clearFilters = () => { setFilterStatus("all"); setFilterSeverity("all"); setSearchText(""); setPage(1); };
  const exportExcel = async () => {
    try {
      const { utils: xlsxUtils, writeFile } = await import("xlsx");
      const rows = filteredBugs.map(b => ({
        "Título": b.title,
        "Descripción": b.description,
        "Severidad": b.severity,
        "Estado": STATUS_LABEL[b.status] ?? b.status,
        "Módulo": b.module ?? "",
        "Resolución": b.resolution ?? "",
        "Fecha": new Date(b.createdAt).toLocaleDateString("es-MX"),
      }));
      const ws = xlsxUtils.json_to_sheet(rows);
      const wb = xlsxUtils.book_new();
      xlsxUtils.book_append_sheet(wb, ws, "Bug Reports");
      writeFile(wb, `bug-reports-${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch { toast({ title: "Error al exportar", variant: "destructive" }); }
  };

  const createMutation = trpc.bugReports.create.useMutation({
    onSuccess: () => {
      utils.bugReports.list.invalidate();
      utils.bugReports.getStats.invalidate();
      setShowCreate(false);
      setForm({ title: "", description: "", stepsToReproduce: "", severity: "medio", module: "" });
      toast({ title: "Reporte creado exitosamente" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMutation = trpc.bugReports.updateStatus.useMutation({
    onSuccess: () => {
      utils.bugReports.list.invalidate();
      utils.bugReports.getStats.invalidate();
      setSelected(null);
      toast({ title: "Estado actualizado" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bug className="h-6 w-6 text-red-500" />Informes de Errores
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Reporte y seguimiento de errores del sistema</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-red-600 hover:bg-red-700 text-white">
          <Plus className="h-4 w-4 mr-1" />Nuevo Reporte
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Pendientes", value: stats?.pendiente ?? 0, icon: Clock, color: "text-slate-600", bg: "bg-slate-100" },
          { label: "En Revision", value: stats?.en_revision ?? 0, icon: AlertTriangle, color: "text-blue-600", bg: "bg-blue-100" },
          { label: "Corregidos", value: stats?.corregido ?? 0, icon: CheckCircle, color: "text-green-600", bg: "bg-green-100" },
          { label: "Criticos", value: stats?.critico ?? 0, icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-center gap-3">
                <div className={bg + " p-2 rounded-lg"}><Icon className={"h-5 w-5 " + color} /></div>
                <div><p className="text-xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input type="text" placeholder="Buscar por título, descripción o módulo..." className="border rounded pl-7 pr-3 py-1.5 text-sm w-64" value={searchText} onChange={e => { setSearchText(e.target.value); setPage(1); }} />
          </div>
          <Select value={filterStatus} onValueChange={v => { setFilterStatus(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pendiente">Pendiente ({stats?.pendiente ?? 0})</SelectItem>
              <SelectItem value="en_revision">En Revisión ({stats?.en_revision ?? 0})</SelectItem>
              <SelectItem value="corregido">Corregido ({stats?.corregido ?? 0})</SelectItem>
              <SelectItem value="descartado">Descartado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSeverity} onValueChange={v => { setFilterSeverity(v); setPage(1); }}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Severidad" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las severidades</SelectItem>
              <SelectItem value="critico">Crítico</SelectItem>
              <SelectItem value="alto">Alto</SelectItem>
              <SelectItem value="medio">Medio</SelectItem>
              <SelectItem value="bajo">Bajo</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-auto">{filteredBugs.length} registros</span>
          <Button variant="outline" size="sm" onClick={exportExcel} className="text-green-700 border-green-600 hover:bg-green-50">
            <Download className="h-3.5 w-3.5 mr-1" />Excel
          </Button>
        </div>
        {hasFilters && (
          <div className="flex flex-wrap gap-1">
            {searchText && <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setSearchText("")}>Buscar: "{searchText.slice(0,15)}{searchText.length>15?'...':''}" <X className="h-3 w-3" /></Badge>}
            {filterStatus !== "all" && <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setFilterStatus("all")}>{STATUS_LABEL[filterStatus] ?? filterStatus} <X className="h-3 w-3" /></Badge>}
            {filterSeverity !== "all" && <Badge variant="secondary" className="text-xs gap-1 cursor-pointer" onClick={() => setFilterSeverity("all")}>{filterSeverity} <X className="h-3 w-3" /></Badge>}
            <button onClick={clearFilters} className="text-xs text-muted-foreground hover:text-destructive underline ml-1">Limpiar todo</button>
          </div>
        )}
      </div>

      <Card>
        <CardContent className="pt-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : pagedBugs.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-8">No hay reportes que coincidan con los filtros.</p>
          ) : (
            <div className="space-y-2">
              {pagedBugs.map(bug => (
                <div
                  key={bug.id}
                  className="border rounded-lg p-3 hover:bg-accent/30 cursor-pointer transition-colors"
                  onClick={() => { setSelected(bug); setResolution(bug.resolution ?? ""); }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{bug.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{bug.description}</p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + SEV_COLOR[bug.severity]}>{bug.severity}</span>
                      <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + STATUS_COLOR[bug.status]}>{STATUS_LABEL[bug.status]}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {bug.module && <span className="text-xs text-muted-foreground">Modulo: {bug.module}</span>}
                    <span className="text-xs text-muted-foreground ml-auto">{new Date(bug.createdAt).toLocaleDateString("es-MX")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-xs text-muted-foreground">Página {page} de {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>Siguiente</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nuevo Informe de Error</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium">Titulo *</label>
              <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Descripcion breve del error" />
            </div>
            <div>
              <label className="text-xs font-medium">Descripcion *</label>
              <textarea className="w-full border rounded px-3 py-2 text-sm mt-1 resize-none" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium">Pasos para reproducir</label>
              <textarea className="w-full border rounded px-3 py-2 text-sm mt-1 resize-none" rows={2} value={form.stepsToReproduce} onChange={e => setForm(f => ({ ...f, stepsToReproduce: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Severidad</label>
                <Select value={form.severity} onValueChange={v => setForm(f => ({ ...f, severity: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critico">Critico</SelectItem>
                    <SelectItem value="alto">Alto</SelectItem>
                    <SelectItem value="medio">Medio</SelectItem>
                    <SelectItem value="bajo">Bajo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Modulo</label>
                <input className="w-full border rounded px-3 py-2 text-sm mt-1" value={form.module} onChange={e => setForm(f => ({ ...f, module: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={() => createMutation.mutate({
                  title: form.title,
                  description: form.description,
                  stepsToReproduce: form.stepsToReproduce || undefined,
                  severity: form.severity as any,
                  module: form.module || undefined,
                })}
                disabled={form.title.trim().length === 0 || form.description.trim().length === 0 || createMutation.isPending}
              >Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selected != null && (
        <Dialog open={selected != null} onOpenChange={() => setSelected(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{selected.title}</DialogTitle></DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + SEV_COLOR[selected.severity]}>{selected.severity}</span>
                <span className={"text-xs px-2 py-0.5 rounded-full font-medium " + STATUS_COLOR[selected.status]}>{STATUS_LABEL[selected.status]}</span>
              </div>
              <p className="text-muted-foreground">{selected.description}</p>
              {selected.stepsToReproduce != null && (
                <div>
                  <p className="font-medium text-xs mb-1">Pasos para reproducir:</p>
                  <p className="text-muted-foreground text-xs whitespace-pre-wrap">{selected.stepsToReproduce}</p>
                </div>
              )}
              <div>
                <label className="text-xs font-medium">Resolucion / Notas</label>
                <textarea className="w-full border rounded px-3 py-2 text-sm mt-1 resize-none" rows={2} value={resolution} onChange={e => setResolution(e.target.value)} />
              </div>
              <div className="flex gap-2 flex-wrap pt-1">
                {(["pendiente", "en_revision", "corregido", "descartado"] as const).map(s => (
                  <Button
                    key={s}
                    size="sm"
                    variant={selected.status === s ? "default" : "outline"}
                    onClick={() => updateMutation.mutate({ id: selected.id, status: s, resolution: resolution || undefined })}
                    disabled={updateMutation.isPending}
                  >{STATUS_LABEL[s]}</Button>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
