import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Users,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Download,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────
function statusBadge(status: string) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    pending: { label: "Pendiente", variant: "secondary" },
    approved: { label: "Aprobada", variant: "default" },
    rejected: { label: "Rechazada", variant: "destructive" },
    cancelled: { label: "Cancelada", variant: "outline" },
  };
  const s = map[status] || { label: status, variant: "outline" as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function calcBusinessDays(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  let count = 0;
  const cur = new Date(s);
  while (cur <= e) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function addBusinessDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) added++;
  }
  // Skip one more business day for return
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VacationManagement() {
  const { user } = useAuth();
  const isRH = user?.role === "admin" || user?.role === "rh" || user?.role === "recursos_humanos" || user?.role === "jefe_area";

  const [activeView, setActiveView] = useState<"all" | "my" | "pending" | "seniority">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "cancelled">("all");
  const [searchText, setSearchText] = useState("");
  const [showNewRequest, setShowNewRequest] = useState(false);

  // Form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  // Rejection state
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Queries
  const { data: allRequests, isLoading: allLoading, refetch: refetchAll } = trpc.vacations.listAll.useQuery(
    { status: statusFilter },
    { enabled: isRH }
  );
  const { data: employeesData } = trpc.employees.list.useQuery(
    { isActive: true },
    { enabled: isRH && showNewRequest }
  );
  const employees = employeesData?.employees;
  const { data: seniorityTable } = trpc.vacations.getSeniorityTable.useQuery();

  // Balance for selected employee
  const { data: balance, isLoading: balanceLoading } = trpc.vacations.getBalance.useQuery(
    { employeeId: selectedEmployeeId! },
    { enabled: !!selectedEmployeeId }
  );

  // Computed days
  const requestedDays = useMemo(() => {
    if (!startDate || !endDate) return 0;
    return calcBusinessDays(startDate, endDate);
  }, [startDate, endDate]);

  const returnDate = useMemo(() => {
    if (!endDate) return "";
    return addBusinessDays(endDate, 0);
  }, [endDate]);

  // Mutations
  const createMutation = trpc.vacations.create.useMutation({
    onSuccess: () => {
      toast.success("Solicitud de vacaciones enviada. RH recibirá notificación.");
      setShowNewRequest(false);
      setSelectedEmployeeId(null);
      setStartDate("");
      setEndDate("");
      setNotes("");
      refetchAll();
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const updateStatusMutation = trpc.vacations.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado actualizado");
      setRejectingId(null);
      setRejectionReason("");
      refetchAll();
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const cancelMutation = trpc.vacations.cancel.useMutation({
    onSuccess: () => { toast.success("Solicitud cancelada"); refetchAll(); },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  // Filter requests
  const filteredRequests = useMemo(() => {
    if (!allRequests) return [];
    if (!searchText.trim()) return allRequests;
    const q = searchText.toLowerCase();
    return allRequests.filter(
      (r: any) =>
        r.employeeName?.toLowerCase().includes(q) ||
        r.department?.toLowerCase().includes(q)
    );
  }, [allRequests, searchText]);

  const pendingCount = allRequests?.filter((r: any) => r.status === "pending").length ?? 0;

  // ── Export to CSV ──────────────────────────────────────────────────────────
  const handleExport = () => {
    if (!filteredRequests.length) return;
    const headers = ["Empleado", "Departamento", "Inicio", "Fin", "Regreso", "Días", "Estado", "Fecha Solicitud"];
    const rows = filteredRequests.map((r: any) => [
      r.employeeName,
      r.department,
      r.startDate,
      r.endDate,
      r.returnDate,
      r.requestedDays,
      r.status,
      new Date(r.createdAt).toLocaleDateString("es-MX"),
    ]);
    const csv = [headers, ...rows].map((row) => row.map((c: any) => `"${c ?? ""}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `vacaciones_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Gestión de Vacaciones
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Saldo calculado automáticamente según tabla LFT · Flujo de aprobación RH
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetchAll()} className="gap-1">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
          {isRH && (
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1">
              <Download className="h-4 w-4" /> Exportar CSV
            </Button>
          )}
          {isRH && (
            <Button size="sm" onClick={() => setShowNewRequest(!showNewRequest)} className="gap-1">
              <Plus className="h-4 w-4" /> Nueva Solicitud
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {isRH && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Solicitudes</p>
              <p className="text-2xl font-bold mt-1">{allRequests?.length ?? 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendientes</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Aprobadas</p>
              <p className="text-2xl font-bold mt-1 text-green-600">
                {allRequests?.filter((r: any) => r.status === "approved").length ?? 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Días Aprobados</p>
              <p className="text-2xl font-bold mt-1 text-primary">
                {allRequests?.filter((r: any) => r.status === "approved").reduce((s: number, r: any) => s + r.requestedDays, 0) ?? 0}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New request form */}
      {showNewRequest && isRH && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">Nueva Solicitud de Vacaciones</CardTitle>
            <CardDescription>Registrar solicitud en nombre de un empleado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Empleado *</label>
                <select
                  value={selectedEmployeeId ?? ""}
                  onChange={(e) => setSelectedEmployeeId(e.target.value ? parseInt(e.target.value) : null)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar empleado...</option>
                  {employees?.map((emp: any) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} — {emp.department}
                    </option>
                  ))}
                </select>
              </div>

              {/* Balance preview */}
              {selectedEmployeeId && (
                <div className="col-span-2 p-3 rounded-lg bg-muted/40 border">
                  {balanceLoading ? (
                    <p className="text-sm text-muted-foreground">Calculando saldo...</p>
                  ) : balance ? (
                    <div className="flex gap-6 text-sm">
                      <div>
                        <span className="text-muted-foreground">Antigüedad:</span>{" "}
                        <strong>{balance.yearsOfService} año{balance.yearsOfService !== 1 ? "s" : ""}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Días ganados (LFT):</span>{" "}
                        <strong>{balance.earnedDays}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Usados:</span>{" "}
                        <strong className="text-red-600">{balance.usedDays}</strong>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Disponibles:</span>{" "}
                        <strong className={balance.availableDays <= 0 ? "text-red-600" : "text-green-600"}>
                          {balance.availableDays}
                        </strong>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha Inicio *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fecha Fin *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              {startDate && endDate && (
                <div className="col-span-2 flex gap-6 text-sm p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <div>
                    <span className="text-muted-foreground">Días hábiles solicitados:</span>{" "}
                    <strong className={requestedDays > (balance?.availableDays ?? 0) ? "text-red-600" : "text-primary"}>
                      {requestedDays}
                    </strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fecha de regreso:</span>{" "}
                    <strong>{returnDate ? new Date(returnDate).toLocaleDateString("es-MX") : "—"}</strong>
                  </div>
                  {requestedDays > (balance?.availableDays ?? 0) && (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertTriangle className="h-4 w-4" />
                      <span>Saldo insuficiente ({balance?.availableDays ?? 0} días disponibles)</span>
                    </div>
                  )}
                </div>
              )}

              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notas (opcional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Motivo o comentarios adicionales"
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (!selectedEmployeeId) { toast.error("Seleccione un empleado"); return; }
                  if (!startDate || !endDate) { toast.error("Ingrese las fechas"); return; }
                  if (requestedDays <= 0) { toast.error("Las fechas no generan días hábiles"); return; }
                  createMutation.mutate({
                    employeeId: selectedEmployeeId,
                    startDate,
                    endDate,
                    returnDate,
                    requestedDays,
                    notes: notes || undefined,
                  });
                }}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Enviando..." : "Enviar Solicitud"}
              </Button>
              <Button variant="outline" onClick={() => setShowNewRequest(false)}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      {isRH && (
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar empleado o departamento..."
              className="pl-9 pr-4 py-2 rounded-md border border-input bg-background text-sm w-64"
            />
          </div>
          <div className="flex gap-1">
            {(["all", "pending", "approved", "rejected", "cancelled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {s === "all" ? "Todas" : s === "pending" ? "Pendientes" : s === "approved" ? "Aprobadas" : s === "rejected" ? "Rechazadas" : "Canceladas"}
                {s === "pending" && pendingCount > 0 && (
                  <span className="ml-1 bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-xs">{pendingCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Requests table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Solicitudes de Vacaciones
          </CardTitle>
          <CardDescription>
            {filteredRequests.length} solicitud{filteredRequests.length !== 1 ? "es" : ""} encontrada{filteredRequests.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Cargando solicitudes...</p>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay solicitudes de vacaciones</p>
              <p className="text-xs mt-1">Use el botón "Nueva Solicitud" para registrar la primera</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Empleado</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Departamento</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Inicio</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Fin</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Regreso</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Días</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Estado</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Solicitud</th>
                    {isRH && <th className="py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((req: any) => (
                    <tr key={req.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 px-3 font-medium">{req.employeeName}</td>
                      <td className="py-2 px-3 text-muted-foreground">{req.department}</td>
                      <td className="py-2 px-3">{req.startDate ? new Date(req.startDate).toLocaleDateString("es-MX") : "—"}</td>
                      <td className="py-2 px-3">{req.endDate ? new Date(req.endDate).toLocaleDateString("es-MX") : "—"}</td>
                      <td className="py-2 px-3">{req.returnDate ? new Date(req.returnDate).toLocaleDateString("es-MX") : "—"}</td>
                      <td className="py-2 px-3 text-center font-medium">{req.requestedDays}</td>
                      <td className="py-2 px-3 text-center">{statusBadge(req.status)}</td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        {new Date(req.createdAt).toLocaleDateString("es-MX")}
                      </td>
                      {isRH && (
                        <td className="py-2 px-3">
                          {req.status === "pending" && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
                                onClick={() =>
                                  updateStatusMutation.mutate({ requestId: req.id, status: "approved" })
                                }
                                disabled={updateStatusMutation.isPending}
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Aprobar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => setRejectingId(req.id)}
                              >
                                <XCircle className="h-3.5 w-3.5 mr-1" /> Rechazar
                              </Button>
                            </div>
                          )}
                          {req.status === "approved" && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Aprobada
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-base text-red-600">Rechazar Solicitud</CardTitle>
              <CardDescription>Ingrese el motivo del rechazo (se notificará al empleado)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Motivo del rechazo..."
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => {
                    updateStatusMutation.mutate({
                      requestId: rejectingId,
                      status: "rejected",
                      rejectionReason: rejectionReason || undefined,
                    });
                  }}
                  disabled={updateStatusMutation.isPending}
                >
                  Confirmar Rechazo
                </Button>
                <Button variant="outline" onClick={() => { setRejectingId(null); setRejectionReason(""); }}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Seniority table reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Tabla de Antigüedad (LFT)
          </CardTitle>
          <CardDescription>Días de vacaciones según años de servicio — Ley Federal del Trabajo Art. 76</CardDescription>
        </CardHeader>
        <CardContent>
          {seniorityTable ? (
            <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
              {seniorityTable.map((row: any, i: number) => (
                <div key={i} className="text-center p-3 rounded-lg bg-muted/40 border">
                  <p className="text-xs text-muted-foreground">
                    {row.yearsMax ? `${row.yearsMin}–${row.yearsMax} años` : `${row.yearsMin}+ años`}
                  </p>
                  <p className="text-xl font-bold text-primary mt-1">{row.vacationDays}</p>
                  <p className="text-xs text-muted-foreground">días</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Cargando tabla...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
