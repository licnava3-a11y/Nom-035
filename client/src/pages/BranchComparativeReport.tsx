import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";
import { FileDown, Building2, Users, TrendingDown, GraduationCap, ShieldCheck, AlertTriangle } from "lucide-react";

type BranchRow = {
  branchId: number;
  branchName: string;
  city: string;
  state: string;
  totalEmployees: number;
  activeEmployees: number;
  turnoverRate: number;
  trainingRate: number;
  trainingCompleted: number;
  trainingTotal: number;
  nom035Score: number;
  highRiskCount: number;
  rotationRate: number;
};

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_DATE_FROM = `${CURRENT_YEAR}-01-01`;
const DEFAULT_DATE_TO = `${CURRENT_YEAR}-12-31`;

const METRIC_COLORS = {
  turnover: "#ef4444",
  training: "#22c55e",
  nom035: "#3b82f6",
  employees: "#0f172a",
};

function getRiskBadge(score: number) {
  if (score >= 80) return <Badge className="bg-green-100 text-green-800 border-green-200">Bajo Riesgo</Badge>;
  if (score >= 60) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Riesgo Medio</Badge>;
  return <Badge className="bg-red-100 text-red-800 border-red-200">Alto Riesgo</Badge>;
}

function getTurnoverBadge(rate: number) {
  if (rate <= 5) return <Badge className="bg-green-100 text-green-800 border-green-200">{rate}%</Badge>;
  if (rate <= 15) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{rate}%</Badge>;
  return <Badge className="bg-red-100 text-red-800 border-red-200">{rate}%</Badge>;
}

function getTrainingBadge(rate: number) {
  if (rate >= 80) return <Badge className="bg-green-100 text-green-800 border-green-200">{rate}%</Badge>;
  if (rate >= 50) return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">{rate}%</Badge>;
  return <Badge className="bg-red-100 text-red-800 border-red-200">{rate}%</Badge>;
}

export default function BranchComparativeReport() {
  const [dateFrom, setDateFrom] = useState(DEFAULT_DATE_FROM);
  const [dateTo, setDateTo] = useState(DEFAULT_DATE_TO);
  const [sortBy, setSortBy] = useState<"branchName" | "totalEmployees" | "turnoverRate" | "trainingRate" | "nom035Score">("branchName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const { data: rows = [], isLoading } = trpc.executiveReport.getBranchComparative.useQuery({ dateFrom, dateTo });

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const va = a[sortBy];
      const vb = b[sortBy];
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortDir === "asc" ? (va as number) - (vb as number) : (vb as number) - (va as number);
    });
  }, [rows, sortBy, sortDir]);

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  }

  async function exportToExcel() {
    const XLSX = await import("xlsx");
    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen comparativo
    const summaryData = [
      ["Reporte Comparativo por Sucursal", "", "", "", "", "", "", "", "", ""],
      [`Periodo: ${dateFrom || "Inicio"} al ${dateTo || "Hoy"}`, "", "", "", "", "", "", "", "", ""],
      [`Generado: ${new Date().toLocaleString("es-MX")}`, "", "", "", "", "", "", "", "", ""],
      [],
      [
        "Sucursal", "Ciudad", "Estado",
        "Total Empleados", "Activos", "Inactivos",
        "Rotación (%)", "Capacitación (%)", "Completadas", "Total Asignaciones",
        "Puntaje NOM-035", "Alto Riesgo"
      ],
      ...sorted.map(r => [
        r.branchName, r.city, r.state,
        r.totalEmployees, r.activeEmployees, r.totalEmployees - r.activeEmployees,
        r.turnoverRate, r.trainingRate, r.trainingCompleted, r.trainingTotal,
        r.nom035Score, r.highRiskCount
      ]),
    ];

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);

    // Estilo de encabezados (ancho de columnas)
    ws1["!cols"] = [
      { wch: 28 }, { wch: 16 }, { wch: 16 },
      { wch: 14 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 18 },
      { wch: 14 }, { wch: 14 }, { wch: 16 }
    ];

    XLSX.utils.book_append_sheet(wb, ws1, "Comparativo Sucursales");

    // Hoja 2: Ranking por rotación
    const rankTurnover = [...sorted].sort((a, b) => a.turnoverRate - b.turnoverRate);
    const ws2 = XLSX.utils.aoa_to_sheet([
      ["Ranking por Rotación (menor es mejor)"],
      ["#", "Sucursal", "Ciudad", "Rotación (%)"],
      ...rankTurnover.map((r, i) => [i + 1, r.branchName, r.city, r.turnoverRate])
    ]);
    ws2["!cols"] = [{ wch: 5 }, { wch: 28 }, { wch: 16 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Ranking Rotación");

    // Hoja 3: Ranking por capacitación
    const rankTraining = [...sorted].sort((a, b) => b.trainingRate - a.trainingRate);
    const ws3 = XLSX.utils.aoa_to_sheet([
      ["Ranking por Capacitación (mayor es mejor)"],
      ["#", "Sucursal", "Ciudad", "Capacitación (%)", "Completadas", "Total"],
      ...rankTraining.map((r, i) => [i + 1, r.branchName, r.city, r.trainingRate, r.trainingCompleted, r.trainingTotal])
    ]);
    ws3["!cols"] = [{ wch: 5 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Ranking Capacitación");

    // Hoja 4: Ranking NOM-035
    const rankNom = [...sorted].sort((a, b) => b.nom035Score - a.nom035Score);
    const ws4 = XLSX.utils.aoa_to_sheet([
      ["Ranking NOM-035 (mayor puntaje = menor riesgo)"],
      ["#", "Sucursal", "Ciudad", "Puntaje NOM-035", "Nivel de Riesgo"],
      ...rankNom.map((r, i) => [
        i + 1, r.branchName, r.city, r.nom035Score,
        r.nom035Score >= 80 ? "Bajo" : r.nom035Score >= 60 ? "Medio" : "Alto"
      ])
    ]);
    ws4["!cols"] = [{ wch: 5 }, { wch: 28 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, ws4, "Ranking NOM-035");

    XLSX.writeFile(wb, `Reporte_Comparativo_Sucursales_${dateFrom}_${dateTo}.xlsx`);
  }

  const chartData = sorted.map(r => ({
    name: r.branchName.length > 14 ? r.branchName.substring(0, 14) + "…" : r.branchName,
    "Rotación %": r.turnoverRate,
    "Capacitación %": r.trainingRate,
    "NOM-035": r.nom035Score,
    "Empleados": r.totalEmployees,
  }));

  const totals = useMemo(() => {
    if (!rows.length) return null;
    const total = rows.reduce((acc, r) => ({
      employees: acc.employees + r.totalEmployees,
      active: acc.active + r.activeEmployees,
      inactive: acc.inactive + (r.totalEmployees - r.activeEmployees),
    }), { employees: 0, active: 0, inactive: 0 });
    const avgTurnover = Math.round(rows.reduce((s, r) => s + r.turnoverRate, 0) / rows.length);
    const avgTraining = Math.round(rows.reduce((s, r) => s + r.trainingRate, 0) / rows.length);
    const avgNom035 = Math.round(rows.reduce((s, r) => s + r.nom035Score, 0) / rows.length);
    return { ...total, avgTurnover, avgTraining, avgNom035 };
  }, [rows]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-green-600" />
              Reporte Comparativo por Sucursal
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Análisis de métricas de rotación, capacitación y NOM-035 por sucursal
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500 whitespace-nowrap">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="border border-slate-200 rounded-md px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <Button
              onClick={exportToExcel}
              disabled={isLoading || rows.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <FileDown className="w-4 h-4" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {totals && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="border-0 shadow-sm bg-slate-900 text-white">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 className="w-4 h-4 text-green-400" />
                  <span className="text-xs text-slate-400">Sucursales</span>
                </div>
                <p className="text-2xl font-bold">{rows.length}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-slate-500">Total Empleados</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{totals.employees}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-slate-500">Activos</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{totals.active}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-slate-500">Rotación Prom.</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{totals.avgTurnover}%</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <GraduationCap className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-slate-500">Capacitación Prom.</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{totals.avgTraining}%</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-slate-500">NOM-035 Prom.</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{totals.avgNom035}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gráficas */}
        {!isLoading && rows.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfica: Rotación vs Capacitación */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  Rotación vs Capacitación por Sucursal (%)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Rotación %" fill={METRIC_COLORS.turnover} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Capacitación %" fill={METRIC_COLORS.training} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Gráfica: Puntaje NOM-035 */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  Puntaje NOM-035 por Sucursal (0–100)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="NOM-035" radius={[3, 3, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry["NOM-035"] >= 80 ? "#22c55e" : entry["NOM-035"] >= 60 ? "#f59e0b" : "#ef4444"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabla comparativa */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Tabla Comparativa Detallada
              <span className="text-xs font-normal text-slate-400 ml-2">
                Haz clic en los encabezados para ordenar
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-slate-400">Cargando datos...</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No hay sucursales activas registradas.</p>
                <p className="text-xs mt-1">Agrega sucursales en el panel de Administración → Sucursales.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th
                        className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer hover:text-slate-900 whitespace-nowrap"
                        onClick={() => toggleSort("branchName")}
                      >
                        Sucursal {sortBy === "branchName" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Ubicación</th>
                      <th
                        className="text-center px-4 py-3 font-semibold text-slate-600 cursor-pointer hover:text-slate-900 whitespace-nowrap"
                        onClick={() => toggleSort("totalEmployees")}
                      >
                        Empleados {sortBy === "totalEmployees" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Activos</th>
                      <th
                        className="text-center px-4 py-3 font-semibold text-slate-600 cursor-pointer hover:text-slate-900 whitespace-nowrap"
                        onClick={() => toggleSort("turnoverRate")}
                      >
                        Rotación {sortBy === "turnoverRate" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th
                        className="text-center px-4 py-3 font-semibold text-slate-600 cursor-pointer hover:text-slate-900 whitespace-nowrap"
                        onClick={() => toggleSort("trainingRate")}
                      >
                        Capacitación {sortBy === "trainingRate" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th
                        className="text-center px-4 py-3 font-semibold text-slate-600 cursor-pointer hover:text-slate-900 whitespace-nowrap"
                        onClick={() => toggleSort("nom035Score")}
                      >
                        NOM-035 {sortBy === "nom035Score" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                      </th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Vac. Pend.</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600 whitespace-nowrap">Alto Riesgo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map((row, idx) => (
                      <tr
                        key={row.branchId}
                        className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? "" : "bg-slate-50/40"}`}
                      >
                        <td className="px-4 py-3 font-medium text-slate-900">{row.branchName}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {row.city}{row.state ? `, ${row.state}` : ""}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold text-slate-900">{row.totalEmployees}</td>
                        <td className="px-4 py-3 text-center text-green-700">{row.activeEmployees}</td>
                        <td className="px-4 py-3 text-center">{getTurnoverBadge(row.turnoverRate)}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {getTrainingBadge(row.trainingRate)}
                            <span className="text-xs text-slate-400">{row.trainingCompleted}/{row.trainingTotal}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {getRiskBadge(row.nom035Score)}
                            <span className="text-xs text-slate-400">{row.nom035Score} pts</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.highRiskCount > 0 ? (
                            <Badge className="bg-red-100 text-red-700 border-red-200">{row.highRiskCount}</Badge>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leyenda */}
        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500 inline-block"></span>
            Bajo riesgo / Alta capacitación (≥80%)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-400 inline-block"></span>
            Riesgo medio (60–79%)
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
            Alto riesgo / Baja capacitación (&lt;60%)
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
