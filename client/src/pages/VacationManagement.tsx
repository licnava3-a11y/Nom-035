import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { loadXlsx } from "@/lib/loadXlsx";
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
  Download,
  FileSpreadsheet,
  Building2,
  Edit3,
  Save,
  X,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

function addBusinessDays(dateStr: string, _days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function VacationManagement() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isRH = ["admin", "rh", "recursos_humanos", "auxiliar_rh"].includes(user?.role ?? "");
  const isAdmin = user?.role === "admin";
  const isSupervisor = ["admin", "rh", "recursos_humanos", "auxiliar_rh", "jefe_area", "gerente", "supervisor"].includes(user?.role ?? "");

  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected" | "cancelled">("all");
  const [searchText, setSearchText] = useState("");
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [activeTab, setActiveTab] = useState<"requests" | "supervisor" | "balance">("requests");

  // Form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  // Rejection state
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Balance report state
  const [balanceDeptFilter, setBalanceDeptFilter] = useState<number | undefined>(undefined);

  // Seniority table edit state
  const [editingSeniority, setEditingSeniority] = useState(false);
  const [seniorityDraft, setSeniorityDraft] = useState<Array<{ yearsMin: number; yearsMax: number | null; vacationDays: number }>>([]);

  const DEFAULT_LFT_TABLE = [
    { yearsMin: 1, yearsMax: 1, vacationDays: 12 },
    { yearsMin: 2, yearsMax: 2, vacationDays: 14 },
    { yearsMin: 3, yearsMax: 3, vacationDays: 16 },
    { yearsMin: 4, yearsMax: 4, vacationDays: 18 },
    { yearsMin: 5, yearsMax: 9, vacationDays: 20 },
    { yearsMin: 10, yearsMax: 14, vacationDays: 22 },
    { yearsMin: 15, yearsMax: 19, vacationDays: 24 },
    { yearsMin: 20, yearsMax: 24, vacationDays: 26 },
    { yearsMin: 25, yearsMax: null, vacationDays: 28 },
  ];

  // Queries
  const { data: allRequests, isLoading: allLoading, refetch: refetchAll } = trpc.vacations.listAll.useQuery(
    { status: statusFilter },
    { enabled: isRH }
  );
  const { data: teamRequests, isLoading: teamLoading, refetch: refetchTeam } = trpc.vacations.listByManager.useQuery(
    { status: "pending" },
    { enabled: isSupervisor && !isRH }
  );
  const { data: balanceReport, isLoading: balanceLoading, refetch: refetchBalance } = trpc.vacations.getBalanceReport.useQuery(
    { departmentId: balanceDeptFilter },
    { enabled: isSupervisor && activeTab === "balance" }
  );
  const { data: employeesData } = trpc.employees.list.useQuery(
    { isActive: true },
    { enabled: isRH && showNewRequest }
  );
  const { data: departmentsData } = trpc.departments.list.useQuery(
    { page: 1, pageSize: 100, isActive: true },
    { enabled: isSupervisor }
  );
  const employees = employeesData?.employees;
  const { data: seniorityTable } = trpc.vacations.getSeniorityTable.useQuery();

  // Balance for selected employee
  const { data: balance, isLoading: balanceEmpLoading } = trpc.vacations.getBalance.useQuery(
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

  const updateSeniorityMutation = trpc.vacations.updateSeniorityTable.useMutation({
    onSuccess: () => {
      toast.success("Tabla de antigüedad actualizada correctamente.");
      setEditingSeniority(false);
      utils.vacations.getSeniorityTable.invalidate();
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const handleStartEditSeniority = () => {
    setSeniorityDraft(seniorityTable ? seniorityTable.map((r: any) => ({ yearsMin: r.yearsMin, yearsMax: r.yearsMax, vacationDays: r.vacationDays })) : [...DEFAULT_LFT_TABLE]);
    setEditingSeniority(true);
  };

  const handleSaveSeniority = () => {
    if (seniorityDraft.length === 0) { toast.error("La tabla no puede estar vacía."); return; }
    updateSeniorityMutation.mutate(seniorityDraft);
  };

  const handleRestoreLFT = () => {
    setSeniorityDraft([...DEFAULT_LFT_TABLE]);
    toast.info("Tabla restaurada a valores LFT. Guarda para aplicar.");
  };

  const updateSeniorityRow = (i: number, field: "yearsMin" | "yearsMax" | "vacationDays", value: string) => {
    setSeniorityDraft((prev) => prev.map((row, idx) => idx === i ? { ...row, [field]: field === "yearsMax" && value === "" ? null : parseInt(value) || 0 } : row));
  };

  const addSeniorityRow = () => {
    const last = seniorityDraft[seniorityDraft.length - 1];
    const newMin = last ? (last.yearsMax !== null ? last.yearsMax + 1 : last.yearsMin + 5) : 1;
    setSeniorityDraft((prev) => [...prev, { yearsMin: newMin, yearsMax: null, vacationDays: 6 }]);
  };

  const removeSeniorityRow = (i: number) => {
    setSeniorityDraft((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateStatusMutation = trpc.vacations.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado actualizado. Se notificó al empleado por correo.");
      setRejectingId(null);
      setRejectionReason("");
      refetchAll();
      refetchTeam();
    },
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
  const teamPendingCount = teamRequests?.length ?? 0;

  // ── Export requests to CSV ─────────────────────────────────────────────────
  const handleExportCSV = () => {
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

  // ── Export balance report to XLSX ──────────────────────────────────────────
  const handleExportBalanceXLSX = async () => {
    if (!balanceReport || balanceReport.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }
    const XLSX = await loadXlsx();

    const wb = XLSX.utils.book_new();

    // Sheet 1: Detalle por empleado
    const detailData = balanceReport.map((r: any) => ({
      "Departamento": r.department,
      "Empleado": r.name,
      "Puesto": r.position,
      "Fecha Ingreso": r.hireDate ? new Date(r.hireDate).toLocaleDateString("es-MX") : "—",
      "Antigüedad (años)": r.yearsOfService,
      "Días Ganados (LFT)": r.earnedDays,
      "Días Usados": r.usedDays,
      "Días Pendientes": r.pendingDays,
      "Días Disponibles": r.availableDays,
    }));
    const ws1 = XLSX.utils.json_to_sheet(detailData);
    ws1["!cols"] = [
      { wch: 22 }, { wch: 28 }, { wch: 22 }, { wch: 14 },
      { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 16 },
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Saldo por Empleado");

    // Sheet 2: Resumen por departamento
    const deptMap: Record<string, { total: number; used: number; pending: number; available: number; count: number }> = {};
    for (const r of balanceReport as any[]) {
      if (!deptMap[r.department]) deptMap[r.department] = { total: 0, used: 0, pending: 0, available: 0, count: 0 };
      deptMap[r.department].total += r.earnedDays;
      deptMap[r.department].used += r.usedDays;
      deptMap[r.department].pending += r.pendingDays;
      deptMap[r.department].available += r.availableDays;
      deptMap[r.department].count++;
    }
    const summaryData = Object.entries(deptMap).map(([dept, v]) => ({
      "Departamento": dept,
      "Empleados": v.count,
      "Total Días Ganados": v.total,
      "Total Días Usados": v.used,
      "Total Días Pendientes": v.pending,
      "Total Días Disponibles": v.available,
    }));
    const ws2 = XLSX.utils.json_to_sheet(summaryData);
    ws2["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 18 }, { wch: 16 }, { wch: 18 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Resumen por Departamento");

    XLSX.writeFile(wb, `saldo_vacaciones_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Reporte exportado correctamente");
  };

  // ── Render approval row ────────────────────────────────────────────────────
  const renderApprovalRow = (req: any) => (
    <tr key={req.id} className="border-b hover:bg-muted/30">
      <td className="py-2 px-3 font-medium">{req.employeeName}</td>
      <td className="py-2 px-3 text-muted-foreground text-sm">{req.department}</td>
      <td className="py-2 px-3 text-sm">{req.position}</td>
      <td className="py-2 px-3 text-sm">
        {req.startDate ? new Date(req.startDate).toLocaleDateString("es-MX") : "—"} —{" "}
        {req.endDate ? new Date(req.endDate).toLocaleDateString("es-MX") : "—"}
      </td>
      <td className="py-2 px-3 text-center font-medium">{req.requestedDays}</td>
      <td className="py-2 px-3 text-center">{statusBadge(req.status)}</td>
      <td className="py-2 px-3">
        {req.status === "pending" && (
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
              onClick={() => updateStatusMutation.mutate({ requestId: req.id, status: "approved" })}
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
        {req.status === "rejected" && (
          <span className="text-xs text-red-500 flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" /> Rechazada
          </span>
        )}
      </td>
    </tr>
  );

  // ── Grouped balance by department ─────────────────────────────────────────
  const balanceByDept = useMemo(() => {
    if (!balanceReport) return {};
    const map: Record<string, typeof balanceReport> = {};
    for (const r of balanceReport as any[]) {
      if (!map[r.department]) map[r.department] = [];
      map[r.department].push(r);
    }
    return map;
  }, [balanceReport]);

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
            Saldo calculado automáticamente según tabla LFT · Flujo de aprobación con notificación por correo
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { refetchAll(); refetchTeam(); refetchBalance(); }}
            className="gap-1"
          >
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
          {isRH && (
            <Button size="sm" onClick={() => setShowNewRequest(!showNewRequest)} className="gap-1">
              <Plus className="h-4 w-4" /> Nueva Solicitud
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {isSupervisor && (
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
              <p className="text-2xl font-bold mt-1 text-amber-600">{pendingCount || teamPendingCount}</p>
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

              {selectedEmployeeId && (
                <div className="col-span-2 p-3 rounded-lg bg-muted/40 border">
                  {balanceEmpLoading ? (
                    <p className="text-sm text-muted-foreground">Calculando saldo...</p>
                  ) : balance ? (
                    <div className="flex gap-6 text-sm flex-wrap">
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
                <div className="col-span-2 flex gap-6 text-sm p-3 rounded-lg bg-primary/5 border border-primary/20 flex-wrap">
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

      {/* Tab navigation */}
      {isSupervisor && (
        <div className="flex gap-1 border-b">
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "requests"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              Todas las Solicitudes
              {pendingCount > 0 && (
                <span className="bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-xs">{pendingCount}</span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("supervisor")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "supervisor"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              Aprobación de Equipo
              {teamPendingCount > 0 && !isRH && (
                <span className="bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-xs">{teamPendingCount}</span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("balance")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "balance"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4" />
              Reporte de Saldo
            </span>
          </button>
        </div>
      )}

      {/* ── TAB: All Requests ── */}
      {(activeTab === "requests" || !isSupervisor) && (
        <>
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
              <div className="flex gap-1 flex-wrap">
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
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1 ml-auto">
                <Download className="h-4 w-4" /> Exportar CSV
              </Button>
            </div>
          )}

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
                  {isRH && <p className="text-xs mt-1">Use el botón "Nueva Solicitud" para registrar la primera</p>}
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
        </>
      )}

      {/* ── TAB: Supervisor Approval ── */}
      {activeTab === "supervisor" && isSupervisor && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Solicitudes Pendientes — Mi Equipo
                </CardTitle>
                <CardDescription>
                  Solicitudes de vacaciones de empleados bajo su supervisión que requieren aprobación
                </CardDescription>
              </div>
              {(teamPendingCount > 0 || pendingCount > 0) && (
                <Badge variant="secondary" className="text-amber-700 bg-amber-100">
                  <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                  {isRH ? pendingCount : teamPendingCount} pendiente{(isRH ? pendingCount : teamPendingCount) !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {(isRH ? allLoading : teamLoading) ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Cargando solicitudes del equipo...</p>
            ) : (isRH ? (allRequests?.filter((r: any) => r.status === "pending") ?? []) : (teamRequests ?? [])).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30 text-green-500" />
                <p className="text-sm font-medium">No hay solicitudes pendientes</p>
                <p className="text-xs mt-1">Todas las solicitudes de su equipo han sido procesadas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Empleado</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Departamento</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Puesto</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Período</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Días</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Estado</th>
                      <th className="py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(isRH
                      ? (allRequests?.filter((r: any) => r.status === "pending") ?? [])
                      : (teamRequests ?? [])
                    ).map((req: any) => renderApprovalRow(req))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── TAB: Balance Report ── */}
      {activeTab === "balance" && isSupervisor && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-primary" />
                  Reporte de Saldo de Vacaciones
                </CardTitle>
                <CardDescription>
                  Saldo disponible por empleado agrupado por departamento — calculado según tabla LFT
                </CardDescription>
              </div>
              <div className="flex gap-2 items-center">
                {departmentsData && (
                  <select
                    value={balanceDeptFilter ?? ""}
                    onChange={(e) => setBalanceDeptFilter(e.target.value ? parseInt(e.target.value) : undefined)}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                  >
                    <option value="">Todos los departamentos</option>
                    {(departmentsData?.data ?? []).map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportBalanceXLSX}
                  disabled={!balanceReport || balanceReport.length === 0}
                  className="gap-1"
                >
                  <Download className="h-4 w-4" /> Exportar XLSX
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Calculando saldos...</p>
            ) : !balanceReport || balanceReport.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No hay empleados activos para mostrar</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(balanceByDept).map(([dept, emps]) => {
                  const deptEmps = emps as any[];
                  const totalAvailable = deptEmps.reduce((s, e) => s + e.availableDays, 0);
                  const totalUsed = deptEmps.reduce((s, e) => s + e.usedDays, 0);
                  return (
                    <div key={dept}>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          {dept}
                          <span className="text-muted-foreground font-normal">({deptEmps.length} empleado{deptEmps.length !== 1 ? "s" : ""})</span>
                        </h3>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span>Usados: <strong className="text-foreground">{totalUsed}</strong></span>
                          <span>Disponibles: <strong className="text-green-600">{totalAvailable}</strong></span>
                        </div>
                      </div>
                      <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-muted/50 border-b">
                              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Empleado</th>
                              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Puesto</th>
                              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Ingreso</th>
                              <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Antigüedad</th>
                              <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Ganados</th>
                              <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Usados</th>
                              <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Pendientes</th>
                              <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground uppercase">Disponibles</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deptEmps.map((emp: any) => (
                              <tr key={emp.employeeId} className="border-b hover:bg-muted/20">
                                <td className="py-2 px-3 font-medium">{emp.name}</td>
                                <td className="py-2 px-3 text-muted-foreground text-xs">{emp.position}</td>
                                <td className="py-2 px-3 text-xs">
                                  {emp.hireDate ? new Date(emp.hireDate).toLocaleDateString("es-MX") : "—"}
                                </td>
                                <td className="py-2 px-3 text-center text-xs">
                                  {emp.yearsOfService} año{emp.yearsOfService !== 1 ? "s" : ""}
                                </td>
                                <td className="py-2 px-3 text-center font-medium">{emp.earnedDays}</td>
                                <td className="py-2 px-3 text-center text-red-600">{emp.usedDays}</td>
                                <td className="py-2 px-3 text-center text-amber-600">{emp.pendingDays}</td>
                                <td className="py-2 px-3 text-center">
                                  <span className={`font-bold ${emp.availableDays <= 0 ? "text-red-600" : emp.availableDays <= 3 ? "text-amber-600" : "text-green-600"}`}>
                                    {emp.availableDays}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Rejection modal */}
      {rejectingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-base text-red-600">Rechazar Solicitud</CardTitle>
              <CardDescription>Ingrese el motivo del rechazo (se notificará al empleado por correo)</CardDescription>
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

      {/* Seniority table — editable for admin */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Tabla de Antigüedad — Días de Vacaciones
              </CardTitle>
              <CardDescription>Días de vacaciones según años de servicio. {isAdmin ? "Como administrador puedes personalizar esta tabla." : "Ley Federal del Trabajo Art. 76."}</CardDescription>
            </div>
            {isAdmin && !editingSeniority && (
              <Button size="sm" variant="outline" onClick={handleStartEditSeniority}>
                <Edit3 className="h-4 w-4 mr-2" /> Editar tabla
              </Button>
            )}
            {isAdmin && editingSeniority && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleRestoreLFT}>
                  <RotateCcw className="h-4 w-4 mr-2" /> Restaurar LFT
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingSeniority(false)}>
                  <X className="h-4 w-4 mr-2" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleSaveSeniority} disabled={updateSeniorityMutation.isPending}>
                  <Save className="h-4 w-4 mr-2" /> {updateSeniorityMutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!editingSeniority ? (
            seniorityTable ? (
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
            )
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
                <span>Años mín.</span>
                <span>Años máx. (vacío = sin límite)</span>
                <span>Días de vacaciones</span>
                <span></span>
              </div>
              {seniorityDraft.map((row, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                  <Input
                    type="number"
                    min={0}
                    value={row.yearsMin}
                    onChange={(e) => updateSeniorityRow(i, "yearsMin", e.target.value)}
                    placeholder="Año mín."
                  />
                  <Input
                    type="number"
                    min={1}
                    value={row.yearsMax ?? ""}
                    onChange={(e) => updateSeniorityRow(i, "yearsMax", e.target.value)}
                    placeholder="Sin límite"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={row.vacationDays}
                    onChange={(e) => updateSeniorityRow(i, "vacationDays", e.target.value)}
                    placeholder="Días"
                  />
                  <Button size="icon" variant="ghost" onClick={() => removeSeniorityRow(i)} className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addSeniorityRow} className="w-full mt-2">
                <Plus className="h-4 w-4 mr-2" /> Agregar fila
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                * Los cambios afectarán el cálculo de saldo de vacaciones de todos los empleados al guardar.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
