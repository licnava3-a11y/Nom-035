import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Download,
  RefreshCw,
  Building2,
  User,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { loadXlsx } from "@/lib/loadXlsx";

type DaysFilter = 7 | 15 | 30;

function getDaysUntil(dateStr: string | Date | null): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgencyBadge(days: number | null) {
  if (days === null) return null;
  if (days < 0) return <Badge className="bg-gray-200 text-gray-700 text-xs">Vencido</Badge>;
  if (days <= 2) return <Badge className="bg-red-600 text-white text-xs animate-pulse">⚠ {days}d</Badge>;
  if (days <= 7) return <Badge className="bg-red-100 text-red-700 text-xs">🔴 {days}d</Badge>;
  if (days <= 15) return <Badge className="bg-amber-100 text-amber-700 text-xs">🟡 {days}d</Badge>;
  return <Badge className="bg-green-100 text-green-700 text-xs">🟢 {days}d</Badge>;
}

export default function ContractExpirationDashboard() {
  const [daysFilter, setDaysFilter] = useState<DaysFilter>(30);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const { data: contracts, isLoading, refetch } = trpc.hiring.getExpiringContracts.useQuery(
    { daysAhead: daysFilter },
    { refetchOnWindowFocus: false }
  );

  const sendReportMutation = trpc.hiring.sendExpiringContractsReport.useMutation({
    onSuccess: () => toast.success("Reporte enviado a RH por correo electrónico"),
    onError: (e: any) => toast.error(`Error al enviar: ${e.message}`),
  });

  // Flatten contracts into rows for the table
  const rows = useMemo(() => {
    if (!contracts) return [];
    const result: any[] = [];
    for (const emp of contracts) {
      for (const contract of (emp as any).expiringContracts) {
        const daysUntil = getDaysUntil(contract.expirationDate);
        result.push({
          employeeId: emp.id,
          employeeNumber: (emp as any).employeeNumber,
          name: `${emp.firstName} ${emp.lastName}`,
          email: emp.email,
          department: (emp as any).departmentName ?? "Sin departamento",
          position: (emp as any).positionName ?? "Sin puesto",
          contractType: contract.type,
          expirationDate: contract.expirationDate,
          daysUntil,
        });
      }
    }
    // Sort by days ascending (most urgent first)
    return result.sort((a, b) => (a.daysUntil ?? 999) - (b.daysUntil ?? 999));
  }, [contracts]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const depts = new Set(rows.map(r => r.department));
    return Array.from(depts).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const matchSearch = !searchTerm || 
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.employeeNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.department.toLowerCase().includes(searchTerm.toLowerCase());
      const matchDept = departmentFilter === "all" || r.department === departmentFilter;
      return matchSearch && matchDept;
    });
  }, [rows, searchTerm, departmentFilter]);

  // Summary stats
  const stats = useMemo(() => ({
    total: filteredRows.length,
    critical: filteredRows.filter(r => r.daysUntil !== null && r.daysUntil <= 7).length,
    warning: filteredRows.filter(r => r.daysUntil !== null && r.daysUntil > 7 && r.daysUntil <= 15).length,
    safe: filteredRows.filter(r => r.daysUntil !== null && r.daysUntil > 15).length,
  }), [filteredRows]);

  const handleExportExcel = async () => {
    if (filteredRows.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const XLSX = await loadXlsx();

    const wsData = [
      ["Dashboard de Vencimientos de Contratos"],
      [`Generado el: ${new Date().toLocaleDateString("es-MX")} | Horizonte: ${daysFilter} días`],
      [],
      ["No. Empleado", "Nombre", "Departamento", "Puesto", "Tipo de Contrato", "Fecha de Vencimiento", "Días Restantes", "Urgencia"],
      ...filteredRows.map(r => [
        r.employeeNumber ?? "",
        r.name,
        r.department,
        r.position,
        r.contractType,
        r.expirationDate ? new Date(r.expirationDate).toLocaleDateString("es-MX") : "",
        r.daysUntil ?? "",
        r.daysUntil === null ? "" :
          r.daysUntil <= 0 ? "VENCIDO" :
          r.daysUntil <= 7 ? "CRÍTICO" :
          r.daysUntil <= 15 ? "ALERTA" : "NORMAL",
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws["!cols"] = [
      { wch: 14 }, { wch: 30 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 20 }, { wch: 14 }, { wch: 10 },
    ];

    // Merge title cells
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Vencimientos");

    // Summary sheet
    const summaryData = [
      ["Resumen Ejecutivo"],
      [],
      ["Indicador", "Cantidad"],
      ["Total de contratos próximos a vencer", stats.total],
      ["Críticos (≤ 7 días)", stats.critical],
      ["Alerta (8-15 días)", stats.warning],
      ["Normal (16-30 días)", stats.safe],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary["!cols"] = [{ wch: 40 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen");

    const fileName = `vencimientos_contratos_${daysFilter}d_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    toast.success(`Archivo exportado: ${fileName}`);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            Dashboard de Vencimientos de Contratos
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Vista consolidada de contratos próximos a vencer — Auditoría STPS
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <Download className="h-4 w-4 mr-1.5" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Horizon filter */}
      <div className="flex gap-2">
        {([7, 15, 30] as DaysFilter[]).map(d => (
          <button
            key={d}
            onClick={() => setDaysFilter(d)}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              daysFilter === d
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background border-border hover:bg-muted/50"
            }`}
          >
            {d} días
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground font-medium">Total</span>
            </div>
            <p className="text-3xl font-bold">{isLoading ? "…" : stats.total}</p>
            <p className="text-xs text-muted-foreground mt-0.5">contratos próximos</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-xs text-red-700 font-medium">Crítico (≤7d)</span>
            </div>
            <p className="text-3xl font-bold text-red-600">{isLoading ? "…" : stats.critical}</p>
            <p className="text-xs text-muted-foreground mt-0.5">requieren acción inmediata</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-amber-700 font-medium">Alerta (8-15d)</span>
            </div>
            <p className="text-3xl font-bold text-amber-600">{isLoading ? "…" : stats.warning}</p>
            <p className="text-xs text-muted-foreground mt-0.5">en seguimiento</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs text-green-700 font-medium">Normal (16-30d)</span>
            </div>
            <p className="text-3xl font-bold text-green-600">{isLoading ? "…" : stats.safe}</p>
            <p className="text-xs text-muted-foreground mt-0.5">tiempo suficiente</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full border rounded-md pl-9 pr-3 py-2 text-sm bg-background"
            placeholder="Buscar empleado o número..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={departmentFilter}
          onChange={e => setDepartmentFilter(e.target.value)}
        >
          <option value="all">Todos los departamentos</option>
          {departments.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Contratos próximos a vencer — {daysFilter} días
            <Badge variant="secondary" className="ml-auto">{filteredRows.length} registros</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin opacity-40" />
              <p>Cargando datos...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-green-500 opacity-60" />
              <p className="font-medium">Sin vencimientos en los próximos {daysFilter} días</p>
              <p className="text-xs mt-1">Todos los contratos están al corriente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium">No. Emp.</th>
                    <th className="text-left px-4 py-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" />
                        Empleado
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        Departamento
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">Puesto</th>
                    <th className="text-left px-4 py-3 font-medium">Contrato</th>
                    <th className="text-left px-4 py-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Vencimiento
                      </div>
                    </th>
                    <th className="text-left px-4 py-3 font-medium">Días restantes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, idx) => (
                    <tr
                      key={`${row.employeeId}-${row.contractType}-${idx}`}
                      className={`border-b transition-colors hover:bg-muted/20 ${
                        row.daysUntil !== null && row.daysUntil <= 7 ? "bg-red-50/40" :
                        row.daysUntil !== null && row.daysUntil <= 15 ? "bg-amber-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {row.employeeNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm">{row.department}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{row.position}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">{row.contractType}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {row.expirationDate
                          ? new Date(row.expirationDate).toLocaleDateString("es-MX", {
                              day: "2-digit", month: "short", year: "numeric",
                            })
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {getUrgencyBadge(row.daysUntil)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center">
        Datos actualizados en tiempo real · Exportación en formato XLSX para auditoría STPS ·
        Alertas automáticas enviadas a RH 7 días antes del vencimiento
      </p>
    </div>
  );
}
