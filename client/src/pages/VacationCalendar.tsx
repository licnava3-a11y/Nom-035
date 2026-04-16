import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Palmtree, Users, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ── Paleta de colores por departamento ──────────────────────────────────────
const DEPT_COLORS = [
  { bg: "bg-blue-500", light: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300", border: "border-blue-300" },
  { bg: "bg-green-500", light: "bg-green-100 dark:bg-green-900/40", text: "text-green-700 dark:text-green-300", border: "border-green-300" },
  { bg: "bg-purple-500", light: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-700 dark:text-purple-300", border: "border-purple-300" },
  { bg: "bg-orange-500", light: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-300", border: "border-orange-300" },
  { bg: "bg-pink-500", light: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-700 dark:text-pink-300", border: "border-pink-300" },
  { bg: "bg-teal-500", light: "bg-teal-100 dark:bg-teal-900/40", text: "text-teal-700 dark:text-teal-300", border: "border-teal-300" },
  { bg: "bg-red-500", light: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300", border: "border-red-300" },
  { bg: "bg-indigo-500", light: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-700 dark:text-indigo-300", border: "border-indigo-300" },
];

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DAY_NAMES_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function VacationCalendar() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(undefined);
  const [viewMode, setViewMode] = useState<"gantt" | "monthly">("gantt");

  // Datos del calendario
  const { data: calendarData, isLoading } = trpc.vacations.getCalendar.useQuery({
    year,
    month,
    departmentId: selectedDeptId,
  });

  // Lista de departamentos para el filtro
  const { data: deptsData } = trpc.departments.list.useQuery({ page: 1, pageSize: 100, isActive: true });

  // Navegar mes anterior / siguiente
  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  // Agrupar entradas por departamento
  const byDept = useMemo(() => {
    if (!calendarData) return {};
    const map: Record<string, typeof calendarData.entries> = {};
    for (const entry of calendarData.entries) {
      if (!map[entry.department]) map[entry.department] = [];
      map[entry.department].push(entry);
    }
    return map;
  }, [calendarData]);

  const deptNames = Object.keys(byDept).sort();

  // Calcular posición y ancho de barra Gantt para un rango de fechas
  const getGanttBar = (startDate: string, endDate: string, daysInMonth: number) => {
    const firstOfMonth = new Date(year, month - 1, 1);
    const lastOfMonth = new Date(year, month, 0);

    const start = new Date(String(startDate) + "T00:00:00");
    const end = new Date(String(endDate) + "T00:00:00");

    const clampedStart = start < firstOfMonth ? firstOfMonth : start;
    const clampedEnd = end > lastOfMonth ? lastOfMonth : end;

    const startDay = clampedStart.getDate(); // 1-based
    const endDay = clampedEnd.getDate();     // 1-based

    const left = ((startDay - 1) / daysInMonth) * 100;
    const width = ((endDay - startDay + 1) / daysInMonth) * 100;

    return { left: `${left.toFixed(2)}%`, width: `${Math.max(width, 1).toFixed(2)}%` };
  };

  // Vista mensual tipo calendario (grid)
  const getMonthlyEntries = (day: number) => {
    if (!calendarData) return [];
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return calendarData.entries.filter(e => String(e.startDate) <= dateStr && String(e.endDate) >= dateStr);
  };

  const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0=Dom
  const daysInMonth = calendarData?.daysInMonth ?? new Date(year, month, 0).getDate();

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Palmtree className="h-6 w-6 text-teal-600" />
            Calendario de Vacaciones
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visualización de períodos aprobados y pendientes por departamento
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Selector de vista */}
          <div className="flex rounded-md border border-input overflow-hidden">
            <button
              onClick={() => setViewMode("gantt")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "gantt" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              Gantt
            </button>
            <button
              onClick={() => setViewMode("monthly")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${viewMode === "monthly" ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
            >
              Mensual
            </button>
          </div>
        </div>
      </div>

      {/* Controles de navegación y filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Navegación mes */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-lg font-semibold min-w-[160px] text-center">
                {MONTH_NAMES[month - 1]} {year}
              </span>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }}>
                Hoy
              </Button>
            </div>

            {/* Filtro por departamento */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <select
                value={selectedDeptId ?? ""}
                onChange={(e) => setSelectedDeptId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="">Todos los departamentos</option>
                {(deptsData?.data ?? []).map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {/* Leyenda */}
            <div className="flex items-center gap-3 ml-auto">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-green-500" />
                <span className="text-xs text-muted-foreground">Aprobada</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-yellow-400" />
                <span className="text-xs text-muted-foreground">Pendiente</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Cargando calendario...</div>
          </CardContent>
        </Card>
      ) : !calendarData || calendarData.entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No hay vacaciones registradas para {MONTH_NAMES[month - 1]} {year}</p>
          </CardContent>
        </Card>
      ) : viewMode === "gantt" ? (
        /* ── Vista Gantt ─────────────────────────────────────────────────── */
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vista Gantt — {MONTH_NAMES[month - 1]} {year}</CardTitle>
            <CardDescription>{calendarData.entries.length} período(s) en este mes</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Encabezado con días del mes */}
            <div className="overflow-x-auto">
              <div style={{ minWidth: "700px" }}>
                {/* Fila de días */}
                <div className="flex mb-2">
                  <div className="w-48 shrink-0 text-xs text-muted-foreground font-medium pr-2">Empleado / Depto.</div>
                  <div className="flex-1 relative">
                    <div className="flex">
                      {Array.from({ length: daysInMonth }, (_, i) => {
                        const d = i + 1;
                        const dayOfWeek = new Date(year, month - 1, d).getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const isToday = d === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
                        return (
                          <div
                            key={d}
                            className={`flex-1 text-center text-xs font-medium py-1 border-r border-border last:border-r-0 ${isWeekend ? "text-muted-foreground bg-muted/30" : ""} ${isToday ? "text-primary font-bold" : ""}`}
                          >
                            {d}
                          </div>
                        );
                      })}
                    </div>
                    {/* Línea de hoy */}
                    {month === today.getMonth() + 1 && year === today.getFullYear() && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-primary/60 z-10"
                        style={{ left: `${((today.getDate() - 0.5) / daysInMonth) * 100}%` }}
                      />
                    )}
                  </div>
                </div>

                {/* Filas por departamento */}
                {deptNames.map((deptName, dIdx) => {
                  const color = DEPT_COLORS[dIdx % DEPT_COLORS.length];
                  const entries = byDept[deptName];
                  return (
                    <div key={deptName} className="mb-4">
                      {/* Cabecera de departamento */}
                      <div className="flex items-center mb-1">
                        <div className={`w-48 shrink-0 pr-2 flex items-center gap-1.5`}>
                          <div className={`w-2 h-2 rounded-full ${color.bg}`} />
                          <span className="text-xs font-semibold truncate">{deptName}</span>
                          <Badge variant="secondary" className="text-xs ml-auto">{entries.length}</Badge>
                        </div>
                        <div className={`flex-1 h-px ${color.border} border-t`} />
                      </div>

                      {/* Filas de empleados */}
                      {entries.map((entry) => {
                        const bar = getGanttBar(String(entry.startDate), String(entry.endDate), daysInMonth);
                        const isApproved = entry.status === "approved";
                        return (
                          <div key={entry.id} className="flex items-center mb-1 group">
                            <div className="w-48 shrink-0 pr-2">
                              <span className="text-xs truncate block text-muted-foreground group-hover:text-foreground transition-colors">
                                {entry.employeeName}
                              </span>
                            </div>
                            <div className="flex-1 relative h-6 bg-muted/20 rounded">
                              {/* Fondo de días del mes */}
                              <div className="absolute inset-0 flex">
                                {Array.from({ length: daysInMonth }, (_, i) => {
                                  const dayOfWeek = new Date(year, month - 1, i + 1).getDay();
                                  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                  return (
                                    <div
                                      key={i}
                                      className={`flex-1 border-r border-border/30 last:border-r-0 ${isWeekend ? "bg-muted/30" : ""}`}
                                    />
                                  );
                                })}
                              </div>
                              {/* Barra de vacaciones */}
                              <div
                                className={`absolute top-0.5 bottom-0.5 rounded-sm flex items-center px-1 z-10 ${isApproved ? color.light : "bg-yellow-100 dark:bg-yellow-900/40"}`}
                                style={{ left: bar.left, width: bar.width }}
                                title={`${entry.employeeName}: ${entry.startDate} al ${entry.endDate} (${entry.requestedDays} días) — ${isApproved ? "Aprobada" : "Pendiente"}`}
                              >
                                <span className={`text-xs font-medium truncate ${isApproved ? color.text : "text-yellow-700 dark:text-yellow-300"}`}>
                                  {entry.requestedDays}d
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* ── Vista Mensual (grid de calendario) ─────────────────────────── */
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vista Mensual — {MONTH_NAMES[month - 1]} {year}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Cabecera de días de la semana */}
            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES_SHORT.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>

            {/* Grid de días */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {/* Celdas vacías antes del primer día */}
              {Array.from({ length: firstDayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} className="bg-muted/30 min-h-[80px] p-1" />
              ))}

              {/* Días del mes */}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1;
                const entries = getMonthlyEntries(day);
                const isToday = day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear();
                const dayOfWeek = new Date(year, month - 1, day).getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                return (
                  <div
                    key={day}
                    className={`bg-background min-h-[80px] p-1 ${isWeekend ? "bg-muted/20" : ""}`}
                  >
                    <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {entries.slice(0, 3).map((entry, eIdx) => {
                        const deptIdx = deptNames.indexOf(entry.department);
                        const color = DEPT_COLORS[deptIdx >= 0 ? deptIdx % DEPT_COLORS.length : 0];
                        const isApproved = entry.status === "approved";
                        return (
                          <div
                            key={entry.id}
                            className={`text-xs px-1 py-0.5 rounded truncate ${isApproved ? `${color.light} ${color.text}` : "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"}`}
                            title={`${entry.employeeName} (${entry.department}) — ${isApproved ? "Aprobada" : "Pendiente"}`}
                          >
                            {entry.employeeName.split(" ")[0]}
                          </div>
                        );
                      })}
                      {entries.length > 3 && (
                        <div className="text-xs text-muted-foreground px-1">+{entries.length - 3} más</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Leyenda de departamentos */}
            {deptNames.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-3">
                {deptNames.map((deptName, idx) => {
                  const color = DEPT_COLORS[idx % DEPT_COLORS.length];
                  return (
                    <div key={deptName} className="flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-sm ${color.bg}`} />
                      <span className="text-xs text-muted-foreground">{deptName}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resumen del mes */}
      {calendarData && calendarData.entries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resumen del mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-teal-600">{calendarData.entries.length}</div>
                <div className="text-xs text-muted-foreground">Total períodos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {calendarData.entries.filter(e => e.status === "approved").length}
                </div>
                <div className="text-xs text-muted-foreground">Aprobados</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {calendarData.entries.filter(e => e.status === "pending").length}
                </div>
                <div className="text-xs text-muted-foreground">Pendientes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {calendarData.entries.reduce((sum, e) => sum + e.requestedDays, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Días totales</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
