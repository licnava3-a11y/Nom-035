import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  UserX,
  ClipboardList,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  FileText,
  BarChart2,
  BookOpen,
  Pencil,
  Trash2,
  Save,
  X,
  Download,
  Upload,
  FileDown,
} from "lucide-react";

const TERMINATION_REASON_LABELS: Record<string, string> = {
  resignation: "Renuncia voluntaria",
  dismissal: "Despido",
  retirement: "Jubilación",
  contract_end: "Fin de contrato",
  mutual_agreement: "Mutuo acuerdo",
  death: "Fallecimiento",
  other: "Otro",
};

const CHART_COLORS = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#d97706",
  "#7c3aed",
  "#0891b2",
  "#be185d",
];

// ── Formulario de Entrevista ─────────────────────────────────────────────────
function InterviewForm({
  interviewId,
  onComplete,
}: {
  interviewId: number;
  onComplete: () => void;
}) {
  const { data: questions, isLoading } =
    trpc.exitInterviews.getQuestions.useQuery();
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [comments, setComments] = useState("");
  const submitMutation = trpc.exitInterviews.submitResponses.useMutation({
    onSuccess: () => {
      toast.success("Entrevista completada exitosamente");
      onComplete();
    },
    onError: e => toast.error(e.message),
  });

  if (isLoading)
    return (
      <div className="text-center py-8 text-muted-foreground">
        Cargando preguntas...
      </div>
    );
  if (!questions?.length)
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay preguntas disponibles
      </div>
    );

  const handleSubmit = () => {
    const answered = Object.keys(responses).length;
    if (answered < questions.length) {
      toast.error(
        `Por favor responde todas las preguntas (${answered}/${questions.length} respondidas)`
      );
      return;
    }
    submitMutation.mutate({
      interviewId,
      responses: Object.entries(responses).map(([qId, response]) => ({
        questionId: parseInt(qId),
        response,
      })),
      additionalComments: comments || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>Confidencialidad garantizada:</strong> Sus respuestas son
        estrictamente confidenciales y solo serán utilizadas para mejorar las
        condiciones laborales de la organización.
      </div>

      {questions.map((q, idx) => (
        <Card key={q.id} className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <p className="font-medium mb-3 text-sm">
              <span className="text-muted-foreground mr-2">{idx + 1}.</span>
              {q.questionText}
            </p>
            {q.questionType === "multiple_choice" &&
            Array.isArray(q.options) ? (
              <RadioGroup
                value={responses[q.id] ?? ""}
                onValueChange={val =>
                  setResponses(prev => ({ ...prev, [q.id]: val }))
                }
              >
                <div className="grid grid-cols-1 gap-2">
                  {(q.options as string[]).map(opt => (
                    <div key={opt} className="flex items-center space-x-2">
                      <RadioGroupItem value={opt} id={`q${q.id}-${opt}`} />
                      <Label
                        htmlFor={`q${q.id}-${opt}`}
                        className="cursor-pointer text-sm"
                      >
                        {opt}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            ) : (
              <Textarea
                placeholder="Escribe tu respuesta..."
                value={responses[q.id] ?? ""}
                onChange={e =>
                  setResponses(prev => ({ ...prev, [q.id]: e.target.value }))
                }
                rows={3}
              />
            )}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observaciones adicionales</CardTitle>
          <CardDescription>
            Espacio para comentarios puntuales que desee compartir (opcional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Escribe aquí cualquier comentario adicional..."
            value={comments}
            onChange={e => setComments(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <Button
        onClick={handleSubmit}
        disabled={submitMutation.isPending}
        className="w-full"
        size="lg"
      >
        {submitMutation.isPending ? "Enviando..." : "Enviar Entrevista"}
      </Button>
    </div>
  );
}

// ── Formulario de Registro de Baja ───────────────────────────────────────────
function RegisterTerminationDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [terminationDate, setTerminationDate] = useState("");
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [notes, setNotes] = useState("");

  const { data: employeesData } = trpc.employees.list.useQuery({
    page: 1,
    pageSize: 100,
  });
  const registerMutation = trpc.exitInterviews.registerTermination.useMutation({
    onSuccess: () => {
      toast.success("Baja registrada y entrevista de salida creada");
      setOpen(false);
      onSuccess();
    },
    onError: e => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (!employeeId || !terminationDate || !reason) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }
    registerMutation.mutate({
      employeeId: parseInt(employeeId),
      terminationDate,
      terminationReason: reason as any,
      terminationReasonDetails: details || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Registrar Baja
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Baja de Empleado</DialogTitle>
          <DialogDescription>
            Al registrar la baja se creará automáticamente una entrevista de
            salida pendiente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Empleado *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar empleado..." />
              </SelectTrigger>
              <SelectContent>
                {(employeesData?.employees ?? []).map((emp: any) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Fecha de baja *</Label>
            <Input
              type="date"
              value={terminationDate}
              onChange={e => setTerminationDate(e.target.value)}
            />
          </div>
          <div>
            <Label>Motivo de baja *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar motivo..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TERMINATION_REASON_LABELS).map(
                  ([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Detalles del motivo</Label>
            <Textarea
              placeholder="Descripción adicional..."
              value={details}
              onChange={e => setDetails(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label>Notas internas</Label>
            <Textarea
              placeholder="Notas para RH..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={registerMutation.isPending}
            className="w-full"
          >
            {registerMutation.isPending ? "Registrando..." : "Registrar Baja"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
// ── Botón Generar Plan de Acción con pre-llenado automático ─────────────────
function GenerateActionPlanButton({
  analytics,
  filterLabel,
}: {
  analytics: any;
  filterLabel: string;
}) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const oneMonthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  // Pre-fill: top 3 departments with most exits
  const topDepts = (analytics.departmentBreakdown ?? [])
    .slice(0, 3)
    .map((d: any) => d.department ?? "Sin departamento")
    .filter(Boolean);
  // Pre-fill: top 3 main reasons
  const topReasons = analytics.mainReasonDistribution
    .slice(0, 3)
    .map((r: any) => r.response)
    .filter(Boolean);
  // Pre-fill: top termination reasons
  const topTermReasons = analytics.terminationReasons
    .slice(0, 2)
    .map((r: any) => {
      const labels: Record<string, string> = {
        resignation: "Renuncia voluntaria",
        dismissal: "Despido",
        retirement: "Jubilación",
        contract_end: "Fin de contrato",
        mutual_agreement: "Mutuo acuerdo",
        other: "Otro",
      };
      return labels[r.reason ?? ""] ?? r.reason ?? "Desconocido";
    });
  const allCauses = Array.from(
    new Set([...topReasons, ...topTermReasons])
  ).slice(0, 4);
  const suggestedActions = [
    topDepts.length > 0
      ? `Realizar sesiones de retroalimentación en: ${topDepts.join(", ")}`
      : null,
    topReasons.length > 0
      ? `Atender la causa principal: "${topReasons[0]}"`
      : null,
    analytics.recommendationScore < 50
      ? "Implementar programa de mejora del clima laboral"
      : null,
    "Revisar política de compensaciones y beneficios",
    "Establecer programa de desarrollo y retención de talento",
  ]
    .filter(Boolean)
    .slice(0, 4) as string[];
  const [form, setForm] = useState({
    title: `Plan de Acción — Rotación de Personal (${filterLabel})`,
    description: `Plan derivado del análisis de ${analytics.totalCompleted} entrevistas de salida. Período: ${filterLabel}. Índice de recomendación: ${analytics.recommendationScore}%. Se identificaron ${analytics.terminationReasons.length} tipos de motivos de baja.`,
    primaryCauses: allCauses,
    proposedActions: suggestedActions,
    analysisStartDate: oneMonthAgo,
    analysisEndDate: today,
  });
  const createMutation = trpc.exitInterviews.createActionPlan.useMutation({
    onSuccess: () => {
      toast.success("Plan de acción creado exitosamente");
      utils.exitInterviews.list.invalidate();
      setOpen(false);
    },
    onError: e => toast.error(e.message),
  });
  const handleCauseChange = (idx: number, val: string) => {
    setForm(f => ({
      ...f,
      primaryCauses: f.primaryCauses.map((c, i) => (i === idx ? val : c)),
    }));
  };
  const handleActionChange = (idx: number, val: string) => {
    setForm(f => ({
      ...f,
      proposedActions: f.proposedActions.map((a, i) => (i === idx ? val : a)),
    }));
  };
  const handleSubmit = () => {
    const causes = form.primaryCauses.filter(c => c.trim().length > 0);
    const actions = form.proposedActions.filter(a => a.trim().length > 0);
    if (causes.length === 0 || actions.length === 0) {
      toast.error("Agrega al menos una causa y una acción propuesta");
      return;
    }
    createMutation.mutate({
      title: form.title,
      description: form.description,
      primaryCauses: causes,
      proposedActions: actions,
      analysisStartDate: form.analysisStartDate,
      analysisEndDate: form.analysisEndDate,
    });
  };
  return (
    <>
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div>
          <p className="text-sm font-semibold text-blue-900">
            ¿Listo para actuar?
          </p>
          <p className="text-xs text-blue-700 mt-0.5">
            Se detectaron <strong>{analytics.totalCompleted}</strong>{" "}
            entrevistas completadas.
            {topDepts.length > 0 && (
              <>
                {" "}
                Departamentos con más bajas:{" "}
                <strong>{topDepts.join(", ")}</strong>.
              </>
            )}
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setOpen(true)}
        >
          <FileText className="w-4 h-4" /> Generar Plan de Acción
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generar Plan de Acción</DialogTitle>
            <DialogDescription>
              Los campos están pre-llenados con los datos del análisis del
              período <strong>{filterLabel}</strong>. Puedes editarlos antes de
              guardar.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Título del Plan</Label>
              <Input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">
                Descripción / Contexto
              </Label>
              <Textarea
                value={form.description}
                onChange={e =>
                  setForm(f => ({ ...f, description: e.target.value }))
                }
                rows={3}
                className="mt-1 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">
                  Inicio del período analizado
                </Label>
                <Input
                  type="date"
                  value={form.analysisStartDate}
                  onChange={e =>
                    setForm(f => ({ ...f, analysisStartDate: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">
                  Fin del período analizado
                </Label>
                <Input
                  type="date"
                  value={form.analysisEndDate}
                  onChange={e =>
                    setForm(f => ({ ...f, analysisEndDate: e.target.value }))
                  }
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">
                Causas principales identificadas
              </Label>
              <div className="space-y-2 mt-1">
                {form.primaryCauses.map((cause, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={cause}
                      onChange={e => handleCauseChange(idx, e.target.value)}
                      className="text-sm"
                      placeholder={`Causa ${idx + 1}`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2 text-red-500"
                      onClick={() =>
                        setForm(f => ({
                          ...f,
                          primaryCauses: f.primaryCauses.filter(
                            (_, i) => i !== idx
                          ),
                        }))
                      }
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() =>
                    setForm(f => ({
                      ...f,
                      primaryCauses: [...f.primaryCauses, ""],
                    }))
                  }
                >
                  + Agregar causa
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">
                Acciones propuestas
              </Label>
              <div className="space-y-2 mt-1">
                {form.proposedActions.map((action, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={action}
                      onChange={e => handleActionChange(idx, e.target.value)}
                      className="text-sm"
                      placeholder={`Acción ${idx + 1}`}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="px-2 text-red-500"
                      onClick={() =>
                        setForm(f => ({
                          ...f,
                          proposedActions: f.proposedActions.filter(
                            (_, i) => i !== idx
                          ),
                        }))
                      }
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() =>
                    setForm(f => ({
                      ...f,
                      proposedActions: [...f.proposedActions, ""],
                    }))
                  }
                >
                  + Agregar acción
                </Button>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="gap-1"
              >
                {createMutation.isPending ? (
                  "Guardando..."
                ) : (
                  <>
                    <FileText className="w-4 h-4" /> Crear Plan de Acción
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
// ── Exportar reporte de entrevistas de salida a Excel ────────────────────────
function exportExitInterviewsReport(analytics: any, filterLabel: string) {
  if (!analytics) return;
  const rows: string[][] = [];
  rows.push([`Reporte de Entrevistas de Salida — ${filterLabel}`, "", "", ""]);
  rows.push(["Generado:", new Date().toLocaleString("es-MX"), "", ""]);
  rows.push(["", "", "", ""]);
  rows.push(["KPIs Generales", "", "", ""]);
  rows.push([
    "Entrevistas completadas",
    String(analytics.totalCompleted),
    "",
    "",
  ]);
  rows.push([
    "Índice de recomendación",
    `${analytics.recommendationScore}%`,
    "",
    "",
  ]);
  rows.push([
    "Tipos de motivos registrados",
    String(analytics.terminationReasons.length),
    "",
    "",
  ]);
  rows.push(["", "", "", ""]);
  rows.push(["Motivos de Baja", "Total", "", ""]);
  analytics.terminationReasons.forEach((r: any) => {
    const label: Record<string, string> = {
      resignation: "Renuncia voluntaria",
      dismissal: "Despido",
      retirement: "Jubilación",
      contract_end: "Fin de contrato",
      mutual_agreement: "Mutuo acuerdo",
      death: "Fallecimiento",
      other: "Otro",
    };
    rows.push([
      label[r.reason ?? ""] ?? r.reason ?? "Desconocido",
      String(r.total),
      "",
      "",
    ]);
  });
  rows.push(["", "", "", ""]);
  rows.push(["Razones Principales de Salida", "Total", "", ""]);
  analytics.mainReasonDistribution.forEach((r: any) =>
    rows.push([r.response, String(r.total), "", ""])
  );
  rows.push(["", "", "", ""]);
  rows.push(["Tendencia Mensual", "Mes", "Total", ""]);
  analytics.monthlyTrend.forEach((t: any) =>
    rows.push(["", t.month, String(t.total), ""])
  );
  rows.push(["", "", "", ""]);
  rows.push(["Desglose por Departamento", "Departamento", "Total", ""]);
  (analytics.departmentBreakdown ?? []).forEach((d: any) =>
    rows.push(["", d.department ?? "Sin departamento", String(d.total), ""])
  );
  const csv = rows
    .map(r => r.map(c => `"${(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const bom = "\uFEFF";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Reporte_EntrevistasSalida_${filterLabel.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
// ── Dashboard de Análisis ────────────────────────────────────────────────────
function AnalyticsDashboard() {
  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [trendView, setTrendView] = useState<"monthly" | "quarterly">(
    "monthly"
  );
  const yearInput = filterYear !== "all" ? parseInt(filterYear) : undefined;
  const monthInput = filterMonth !== "all" ? parseInt(filterMonth) : undefined;
  const { data: analytics, isLoading } =
    trpc.exitInterviews.getAnalytics.useQuery({
      year: yearInput,
      month: monthInput,
    });
  const filterLabel =
    filterYear === "all"
      ? "Todo el período"
      : filterMonth === "all"
        ? `Año ${filterYear}`
        : `${["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][parseInt(filterMonth) - 1]} ${filterYear}`;
  if (isLoading)
    return (
      <div className="text-center py-8 text-muted-foreground">
        Cargando análisis...
      </div>
    );
  if (!analytics) return null;
  const reasonData = analytics.terminationReasons.map(r => ({
    name:
      TERMINATION_REASON_LABELS[r.reason ?? ""] ?? r.reason ?? "Desconocido",
    value: r.total,
  }));
  const mainReasonData = analytics.mainReasonDistribution
    .slice(0, 6)
    .map(r => ({
      name:
        r.response.length > 22 ? r.response.substring(0, 22) + "…" : r.response,
      fullName: r.response,
      total: r.total,
    }));
  const [showPrevYear, setShowPrevYear] = useState(true);
  // Build interannual comparison data: merge current year and prev year by month-index (MM)
  const buildInterannualData = () => {
    const currMap: Record<string, number> = {};
    analytics.monthlyTrend.forEach(t => {
      currMap[t.month] = t.total;
    });
    const prevMap: Record<string, number> = {};
    (analytics.monthlyTrendPrevYear ?? []).forEach(t => {
      prevMap[t.month] = t.total;
    });
    // Collect all unique month labels (YYYY-MM), sort
    const allMonths = Array.from(
      new Set([...Object.keys(currMap), ...Object.keys(prevMap)])
    ).sort();
    return allMonths.map(m => ({
      periodo: m,
      "Año actual": currMap[m] ?? 0,
      "Año anterior": prevMap[m] ?? 0,
    }));
  };
  const trendData =
    trendView === "monthly"
      ? buildInterannualData()
      : (analytics.quarterlyTrend ?? []).map(t => ({
          periodo: t.quarter,
          "Año actual": t.total,
        }));
  const deptData = (analytics.departmentBreakdown ?? []).map(d => ({
    name: d.department ?? "Sin depto.",
    total: d.total,
  }));
  return (
    <div className="space-y-5">
      {/* Barra de filtros + exportar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/30 rounded-lg border">
        <span className="text-sm font-medium text-muted-foreground">
          Filtrar por período:
        </span>
        <Select
          value={filterYear}
          onValueChange={v => {
            setFilterYear(v);
            setFilterMonth("all");
          }}
        >
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue placeholder="Año" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los años</SelectItem>
            {[
              currentYear,
              currentYear - 1,
              currentYear - 2,
              currentYear - 3,
            ].map(y => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterYear !== "all" && (
          <Select value={filterMonth} onValueChange={setFilterMonth}>
            <SelectTrigger className="w-36 h-8 text-sm">
              <SelectValue placeholder="Mes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los meses</SelectItem>
              {[
                "Enero",
                "Febrero",
                "Marzo",
                "Abril",
                "Mayo",
                "Junio",
                "Julio",
                "Agosto",
                "Septiembre",
                "Octubre",
                "Noviembre",
                "Diciembre",
              ].map((m, i) => (
                <SelectItem key={i + 1} value={String(i + 1)}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground bg-background border rounded px-2 py-1">
            {filterLabel}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1"
            onClick={() => exportExitInterviewsReport(analytics, filterLabel)}
          >
            <Download className="w-3.5 h-3.5" /> Exportar Excel
          </Button>
        </div>
      </div>
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardList className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.totalCompleted}</p>
                <p className="text-xs text-muted-foreground">
                  Entrevistas completadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {analytics.recommendationScore}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Índice de recomendación
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <BarChart2 className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {analytics.terminationReasons.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tipos de motivos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UserX className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {(analytics.departmentBreakdown ?? []).length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Departamentos afectados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Distribución de motivos de baja */}
        {reasonData.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Distribución de Motivos de Baja
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={reasonData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={85}
                    label={({ name, percent }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                    labelLine={false}
                  >
                    {reasonData.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Sin datos de motivos
            </CardContent>
          </Card>
        )}
        {/* Razones principales de salida */}
        {mainReasonData.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Razones Principales de Salida
              </CardTitle>
              <CardDescription className="text-xs">
                Respuestas a la pregunta de motivo principal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={mainReasonData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={130}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    formatter={(val: any, _: any, props: any) => [
                      val,
                      props.payload.fullName,
                    ]}
                  />
                  <Bar dataKey="total" fill="#2563eb" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-40 text-muted-foreground text-sm">
              Sin datos de razones
            </CardContent>
          </Card>
        )}
      </div>
      {/* Tendencia + Departamentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Tendencia mensual/trimestral */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">
                Tendencia de Entrevistas
              </CardTitle>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant={trendView === "monthly" ? "default" : "outline"}
                  className="h-6 text-xs px-2"
                  onClick={() => setTrendView("monthly")}
                >
                  Mensual
                </Button>
                <Button
                  size="sm"
                  variant={trendView === "quarterly" ? "default" : "outline"}
                  className="h-6 text-xs px-2"
                  onClick={() => setTrendView("quarterly")}
                >
                  Trimestral
                </Button>
              </div>
            </div>
            <CardDescription className="text-xs">
              {trendView === "monthly"
                ? "Últimos 12 meses vs año anterior"
                : "Últimos 8 trimestres"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <>
                {trendView === "monthly" && (
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setShowPrevYear(v => !v)}
                      className={`text-xs px-2 py-0.5 rounded border transition-colors ${showPrevYear ? "bg-orange-100 border-orange-300 text-orange-700" : "bg-muted border-border text-muted-foreground"}`}
                    >
                      {showPrevYear ? "✓" : "○"} Año anterior
                    </button>
                    <span className="text-xs text-muted-foreground">
                      Comparativa interanual
                    </span>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    {trendView === "monthly" && (
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    )}
                    <Line
                      type="monotone"
                      dataKey="Año actual"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    {trendView === "monthly" && showPrevYear && (
                      <Line
                        type="monotone"
                        dataKey="Año anterior"
                        stroke="#f97316"
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        dot={{ r: 3 }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Sin datos de tendencia
              </div>
            )}
          </CardContent>
        </Card>
        {/* Desglose por departamento */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Bajas por Departamento
            </CardTitle>
            <CardDescription className="text-xs">
              Distribución de entrevistas completadas por área
            </CardDescription>
          </CardHeader>
          <CardContent>
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={deptData.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={110}
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip />
                  <Bar dataKey="total" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Sin datos por departamento
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Botón Generar Plan de Acción */}
      {analytics.totalCompleted > 0 && (
        <GenerateActionPlanButton
          analytics={analytics}
          filterLabel={filterLabel}
        />
      )}
      {/* Seguimiento de Planes de Acción */}
      <ActionPlansTracker />
      {trendData.length === 0 &&
        reasonData.length === 0 &&
        deptData.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No hay suficientes datos para mostrar el análisis.</p>
            <p className="text-sm">
              Completa entrevistas de salida para ver las estadísticas.
            </p>
          </div>
        )}
    </div>
  );
}

// ── Seguimiento de Planes de Acción ───────────────────────────────────────────────
function ActionPlansTracker() {
  const utils = trpc.useUtils();
  const { data: plans, isLoading } =
    trpc.exitInterviews.listActionPlans.useQuery(undefined, { retry: false });
  const updateStatus = trpc.exitInterviews.updateActionPlanStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado actualizado");
      utils.exitInterviews.listActionPlans.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const deletePlan = trpc.exitInterviews.deleteActionPlan.useMutation({
    onSuccess: () => {
      toast.success("Plan eliminado");
      utils.exitInterviews.listActionPlans.invalidate();
    },
    onError: e => toast.error(e.message),
  });

  const STATUS_CONFIG: Record<
    string,
    { label: string; color: string; bg: string }
  > = {
    draft: { label: "Borrador", color: "text-slate-600", bg: "bg-slate-100" },
    approved: {
      label: "Aprobado",
      color: "text-amber-700",
      bg: "bg-amber-100",
    },
    in_progress: {
      label: "En progreso",
      color: "text-blue-700",
      bg: "bg-blue-100",
    },
    completed: {
      label: "Completado",
      color: "text-emerald-700",
      bg: "bg-emerald-100",
    },
  };

  if (isLoading) return null;
  if (!plans || plans.length === 0) return null;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-violet-600" />
        Planes de Acción Activos
        <span className="ml-1 text-xs font-normal text-slate-400">
          ({plans.length} plan{plans.length !== 1 ? "es" : ""})
        </span>
      </h3>
      <div className="space-y-3">
        {plans.map(plan => {
          const sc =
            STATUS_CONFIG[plan.status ?? "pendiente"] ??
            STATUS_CONFIG["pendiente"];
          return (
            <div
              key={plan.id}
              className="border border-slate-200 rounded-lg p-4 bg-white"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-slate-800 truncate">
                      {plan.title}
                    </span>
                    <span
                      className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${sc.bg} ${sc.color}`}
                    >
                      {sc.label}
                    </span>
                  </div>
                  {plan.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {plan.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    {plan.analysisStartDate && (
                      <span>
                        Período: {String(plan.analysisStartDate)} –{" "}
                        {plan.analysisEndDate
                          ? String(plan.analysisEndDate)
                          : "hoy"}
                      </span>
                    )}
                    {plan.assignedToName && (
                      <span>Asignado a: {plan.assignedToName}</span>
                    )}
                    <span>
                      Creado:{" "}
                      {new Date(plan.createdAt as any).toLocaleDateString(
                        "es-MX"
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Select
                    value={plan.status ?? "pendiente"}
                    onValueChange={val =>
                      updateStatus.mutate({ id: plan.id, status: val as any })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="approved">Aprobado</SelectItem>
                      <SelectItem value="in_progress">En progreso</SelectItem>
                      <SelectItem value="completed">Completado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (confirm("\u00bfEliminar este plan de acción?"))
                        deletePlan.mutate({ id: plan.id });
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Gestor del Catálogo de Preguntas (admin) ──────────────────────────────────
const CATEGORIES = [
  "Clima Laboral",
  "Compensación",
  "Liderazgo",
  "Desarrollo",
  "Motivo de Salida",
  "Proceso de Salida",
  "Otro",
];

function QuestionsManager() {
  const utils = trpc.useUtils();
  const { data: questions, isLoading } =
    trpc.exitInterviews.getAllQuestions.useQuery();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editOrder, setEditOrder] = useState<number>(1);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newText, setNewText] = useState("");
  const [newCategory, setNewCategory] = useState("Clima Laboral");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const updateMutation = trpc.exitInterviews.updateQuestion.useMutation({
    onSuccess: () => {
      toast.success("Pregunta actualizada");
      setEditingId(null);
      utils.exitInterviews.getAllQuestions.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const deleteMutation = trpc.exitInterviews.deleteQuestion.useMutation({
    onSuccess: () => {
      toast.success("Pregunta desactivada");
      utils.exitInterviews.getAllQuestions.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const addMutation = trpc.exitInterviews.addQuestion.useMutation({
    onSuccess: () => {
      toast.success("Pregunta agregada");
      setShowAddForm(false);
      setNewText("");
      utils.exitInterviews.getAllQuestions.invalidate();
    },
    onError: e => toast.error(e.message),
  });
  const importMutation = trpc.exitInterviews.importQuestions.useMutation({
    onSuccess: res => {
      toast.success(
        `${res.inserted} preguntas importadas${res.skipped > 0 ? ` (${res.skipped} omitidas)` : ""}`
      );
      utils.exitInterviews.getAllQuestions.invalidate();
    },
    onError: e => toast.error(`Error al importar: ${e.message}`),
  });
  const handleImportXLSX = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async evt => {
      try {
        const { read, utils: xlsxUtils } = await import("xlsx");
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = xlsxUtils.sheet_to_json<Record<string, unknown>>(sheet, {
          defval: "",
        });
        const qs = rows
          .map(row => ({
            questionText: String(
              row["Pregunta"] ?? row["questionText"] ?? row["pregunta"] ?? ""
            ).trim(),
            category: String(
              row["Categor\u00eda"] ??
                row["Categoria"] ??
                row["category"] ??
                row["categoria"] ??
                "Otro"
            ).trim(),
            order: row["N\u00famero"] ? Number(row["N\u00famero"]) : undefined,
          }))
          .filter(q => q.questionText.length > 0);
        if (qs.length === 0) {
          toast.error(
            'No se encontraron preguntas. Verifica que la columna se llame "Pregunta".'
          );
          return;
        }
        const replaceAll = window.confirm(
          `Se importar\u00e1n ${qs.length} preguntas.\n\n\u00bfDeseas REEMPLAZAR todas las preguntas existentes?\n(Cancelar = agregar sin borrar las actuales)`
        );
        importMutation.mutate({ questions: qs, replaceAll });
      } catch {
        toast.error(
          "Error al leer el archivo. Aseg\u00farate de que sea un archivo Excel (.xlsx) v\u00e1lido."
        );
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const startEdit = (q: {
    id: number;
    questionText: string;
    category: string;
    isActive: boolean;
    order: number;
  }) => {
    setEditingId(q.id);
    setEditText(q.questionText);
    setEditCategory(q.category);
    setEditActive(q.isActive);
    setEditOrder(q.order ?? 1);
  };

  const exportToExcel = () => {
    if (!questions || questions.length === 0) {
      toast.error("No hay preguntas para exportar");
      return;
    }
    // Generar CSV con BOM UTF-8 para compatibilidad con Excel
    const bom = "\uFEFF";
    const headers = ["Número", "Categoría", "Pregunta", "Estado"];
    const rows = questions
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((q, i) => [
        i + 1,
        q.category ?? "Otro",
        `"${(q.questionText ?? "").replace(/"/g, '""')}"`,
        q.isActive ? "Activa" : "Inactiva",
      ]);
    const csvContent =
      bom + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Catalogo_Preguntas_EntrevistasSalida_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(
      `${questions.length} preguntas exportadas a CSV (compatible con Excel)`
    );
  };

  if (isLoading)
    return (
      <div className="text-center py-12 text-muted-foreground">
        Cargando catálogo...
      </div>
    );

  const allActive = questions?.filter(q => q.isActive) ?? [];
  const active =
    filterCategory === "all"
      ? allActive
      : allActive.filter(q => (q.category ?? "Otro") === filterCategory);
  const inactive = questions?.filter(q => !q.isActive) ?? [];
  const categoryCounts = CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat] = allActive.filter(q => (q.category ?? "Otro") === cat).length;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Catálogo de Preguntas
          </h2>
          <p className="text-sm text-muted-foreground">
            {allActive.length} preguntas activas &bull; {inactive.length}{" "}
            inactivas
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={exportToExcel}
            title="Exportar catálogo a Excel/CSV"
          >
            <Download className="w-4 h-4 mr-1" /> Exportar
          </Button>
          <Button
            size="sm"
            variant="outline"
            title="Descargar plantilla Excel para importar preguntas"
            onClick={() => {
              const bom = "\uFEFF";
              const headers = ["Pregunta", "Categor\u00eda", "N\u00famero"];
              const examples = [
                [
                  "\u00bfCu\u00e1l fue el motivo principal por el que decides dejar la empresa?",
                  "Clima Laboral",
                  "1",
                ],
                [
                  "\u00bfC\u00f3mo calificar\u00edas la relaci\u00f3n con tu jefe inmediato?",
                  "Relaci\u00f3n con Jefes",
                  "2",
                ],
                [
                  "\u00bfSentiste que tu trabajo era reconocido adecuadamente?",
                  "Reconocimiento",
                  "3",
                ],
                [
                  "\u00bfConsideras que tu carga de trabajo era equitativa?",
                  "Carga de Trabajo",
                  "4",
                ],
                [
                  "\u00bfRegresar\u00edas a trabajar con nosotros en el futuro?",
                  "Otro",
                  "5",
                ],
              ];
              const csvContent =
                bom +
                [
                  headers.join(","),
                  ...examples.map(r =>
                    r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")
                  ),
                ].join("\n");
              const blob = new Blob([csvContent], {
                type: "text/csv;charset=utf-8;",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "Plantilla_Preguntas_EntrevistasSalida.csv";
              a.click();
              URL.revokeObjectURL(url);
              toast.success(
                "Plantilla descargada. Abre con Excel y llena las columnas."
              );
            }}
          >
            <FileDown className="w-4 h-4 mr-1" /> Plantilla
          </Button>
          <label title="Importar preguntas desde Excel (.xlsx)">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleImportXLSX}
              disabled={importMutation.isPending}
            />
            <Button
              size="sm"
              variant="outline"
              asChild
              disabled={importMutation.isPending}
            >
              <span className="cursor-pointer">
                <Upload className="w-4 h-4 mr-1" />
                {importMutation.isPending ? "Importando..." : "Importar XLSX"}
              </span>
            </Button>
          </label>
          <Button size="sm" onClick={() => setShowAddForm(v => !v)}>
            <Plus className="w-4 h-4 mr-1" /> Agregar Pregunta
          </Button>
        </div>
      </div>

      {/* Filtro por categoría */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-sm text-muted-foreground font-medium">
          Filtrar:
        </span>
        <button
          onClick={() => setFilterCategory("all")}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            filterCategory === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
          }`}
        >
          Todas ({allActive.length})
        </button>
        {CATEGORIES.filter(cat => (categoryCounts[cat] ?? 0) > 0).map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              filterCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:border-primary hover:text-primary"
            }`}
          >
            {cat} ({categoryCounts[cat]})
          </button>
        ))}
      </div>

      {showAddForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Nueva Pregunta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Texto de la pregunta *</Label>
              <Textarea
                value={newText}
                onChange={e => setNewText(e.target.value)}
                placeholder="Escribe la pregunta aquí..."
                rows={2}
              />
            </div>
            <div>
              <Label>Categoría *</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  addMutation.mutate({
                    questionText: newText,
                    category: newCategory,
                  })
                }
                disabled={addMutation.isPending || newText.length < 5}
              >
                <Save className="w-4 h-4 mr-1" />{" "}
                {addMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {active.map(q => (
          <Card key={q.id} className="">
            <CardContent className="p-4">
              {editingId === q.id ? (
                <div className="space-y-3">
                  <Textarea
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    rows={2}
                  />
                  <div className="flex gap-2 items-center flex-wrap">
                    <Select
                      value={editCategory}
                      onValueChange={setEditCategory}
                    >
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center gap-1">
                      <label className="text-xs text-muted-foreground whitespace-nowrap">
                        Núm. orden:
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={editOrder}
                        onChange={e => setEditOrder(Number(e.target.value))}
                        className="w-16 h-9 rounded-md border border-input bg-background px-2 text-sm text-center"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={() =>
                        updateMutation.mutate({
                          id: q.id,
                          questionText: editText,
                          category: editCategory,
                          order: editOrder,
                        })
                      }
                      disabled={updateMutation.isPending}
                    >
                      <Save className="w-4 h-4 mr-1" /> Guardar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {q.order}. {q.questionText}
                    </p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {q.category}
                    </Badge>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() =>
                        startEdit({
                          ...q,
                          category: q.category ?? "Otro",
                          order: q.order ?? 1,
                        })
                      }
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteMutation.mutate({ id: q.id })}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {inactive.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
            {inactive.length} preguntas inactivas (clic para ver)
          </summary>
          <div className="mt-2 space-y-2">
            {inactive.map(q => (
              <Card key={q.id} className="opacity-50">
                <CardContent className="p-3 flex items-center justify-between">
                  <p className="text-sm">
                    {q.order}. {q.questionText}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      updateMutation.mutate({ id: q.id, isActive: true })
                    }
                  >
                    Reactivar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </details>
      )}

      {active.length === 0 && !showAddForm && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          {filterCategory !== "all" ? (
            <>
              <p>
                No hay preguntas activas en la categoría{" "}
                <strong>{filterCategory}</strong>.
              </p>
              <button
                onClick={() => setFilterCategory("all")}
                className="text-sm text-primary underline mt-1"
              >
                Ver todas las categorías
              </button>
            </>
          ) : (
            <>
              <p>No hay preguntas activas en el catálogo.</p>
              <p className="text-sm">
                Usa el botón "Cargar preguntas predeterminadas" o agrega una
                nueva.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Página Principal ───────────────────────────────────────────────
export default function ExitInterviews() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [activeInterviewId, setActiveInterviewId] = useState<number | null>(
    null
  );
  const [listRefresh, setListRefresh] = useState(0);

  const {
    data: listData,
    isLoading,
    refetch,
  } = trpc.exitInterviews.list.useQuery({
    status: "all",
    page: 1,
    pageSize: 50,
  });

  const initMutation = trpc.exitInterviews.initDefaultQuestions.useMutation({
    onSuccess: res => {
      if (res.initialized)
        toast.success(`${res.count} preguntas inicializadas correctamente`);
      else toast.info(res.message);
    },
    onError: e => toast.error(e.message),
  });

  const handleRefresh = () => {
    refetch();
    setListRefresh(p => p + 1);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumb
        items={[
          { label: "Gestión de Personal", href: "/employees" },
          { label: "Entrevistas de Salida" },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserX className="w-6 h-6 text-primary" />
            Entrevistas de Salida
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gestión confidencial del proceso de baja y análisis de causas de
            rotación
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => initMutation.mutate()}
              disabled={initMutation.isPending}
              title="Carga las 15 preguntas estándar NOM-035 sobre clima laboral, compensación, liderazgo y desarrollo"
            >
              <FileText className="w-4 h-4 mr-2" />
              {initMutation.isPending
                ? "Cargando..."
                : "Cargar preguntas predeterminadas (15)"}
            </Button>
            <RegisterTerminationDialog onSuccess={handleRefresh} />
          </div>
        )}
      </div>

      <Tabs defaultValue={isAdmin ? "list" : "pending"}>
        <TabsList className="mb-4">
          {isAdmin && (
            <TabsTrigger value="list">Todas las Entrevistas</TabsTrigger>
          )}
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="analytics">Análisis de Rotación</TabsTrigger>
          )}
          {isAdmin && (
            <TabsTrigger value="questions">
              <BookOpen className="w-4 h-4 mr-1" />
              Catálogo de Preguntas
            </TabsTrigger>
          )}
        </TabsList>

        {/* Lista de entrevistas (admin) */}
        {isAdmin && (
          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Registro de Entrevistas
                </CardTitle>
                <CardDescription>
                  Total: {listData?.total ?? 0} entrevistas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </div>
                ) : !listData?.rows?.length ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No hay entrevistas registradas aún.</p>
                    <p className="text-sm">
                      Registra una baja para crear la primera entrevista.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {listData.rows.map(row => (
                      <div
                        key={row.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {row.employeeName}
                            </span>
                            <Badge
                              variant={
                                row.status === "completed"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {row.status === "completed" ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Completada
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 mr-1" />
                                  Pendiente
                                </>
                              )}
                            </Badge>
                            {row.isConfidential && (
                              <Badge variant="outline" className="text-xs">
                                Confidencial
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground flex gap-3">
                            <span>{row.department ?? "Sin departamento"}</span>
                            <span>•</span>
                            <span>
                              {TERMINATION_REASON_LABELS[
                                row.terminationReason ?? ""
                              ] ?? row.terminationReason}
                            </span>
                            <span>•</span>
                            <span>
                              {row.terminationDate
                                ? new Date(
                                    row.terminationDate
                                  ).toLocaleDateString()
                                : "—"}
                            </span>
                          </div>
                        </div>
                        {row.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveInterviewId(row.id)}
                          >
                            Aplicar Entrevista
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Entrevistas pendientes del usuario actual */}
        <TabsContent value="pending">
          {activeInterviewId ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Formulario de Entrevista de Salida
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveInterviewId(null)}
                  >
                    ← Volver
                  </Button>
                </div>
                <CardDescription>
                  Responde con honestidad. Tus respuestas son completamente
                  confidenciales.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InterviewForm
                  interviewId={activeInterviewId}
                  onComplete={() => {
                    setActiveInterviewId(null);
                    handleRefresh();
                  }}
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Entrevistas Pendientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Cargando...
                  </div>
                ) : (
                  (() => {
                    const pending =
                      listData?.rows?.filter(r => r.status === "pending") ?? [];
                    return pending.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>No hay entrevistas pendientes.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pending.map(row => (
                          <div
                            key={row.id}
                            className="flex items-center justify-between p-4 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-sm">
                                {row.employeeName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {row.department} •{" "}
                                {row.terminationDate
                                  ? new Date(
                                      row.terminationDate
                                    ).toLocaleDateString()
                                  : "—"}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => setActiveInterviewId(row.id)}
                            >
                              Iniciar Entrevista
                            </Button>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Dashboard de análisis (solo admin) */}
        {isAdmin && (
          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
        )}

        {/* Catálogo de Preguntas (solo admin) */}
        {isAdmin && (
          <TabsContent value="questions">
            <QuestionsManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
