import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ClipboardCheck, AlertTriangle, CheckCircle2, XCircle, Clock, FileText, ExternalLink, Download } from "lucide-react";
import { useLocation } from "wouter";

interface Props {
  employeeId: number;
  employeeName: string;
}

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  nulo:     { label: "Nulo",     color: "text-gray-600",   bg: "bg-gray-50",    icon: <CheckCircle2 className="h-5 w-5 text-gray-500" /> },
  bajo:     { label: "Bajo",     color: "text-green-700",  bg: "bg-green-50",   icon: <CheckCircle2 className="h-5 w-5 text-green-600" /> },
  medio:    { label: "Medio",    color: "text-yellow-700", bg: "bg-yellow-50",  icon: <Clock className="h-5 w-5 text-yellow-600" /> },
  alto:     { label: "Alto",     color: "text-orange-700", bg: "bg-orange-50",  icon: <AlertTriangle className="h-5 w-5 text-orange-600" /> },
  muy_alto: { label: "Muy Alto", color: "text-red-700",    bg: "bg-red-50",     icon: <XCircle className="h-5 w-5 text-red-600" /> },
};

const DOMAIN_LABELS: Record<string, string> = {
  work_conditions: "Condiciones del ambiente",
  workload: "Carga de trabajo",
  lack_control: "Falta de control",
  workday_hours: "Jornada de trabajo",
  interference: "Interferencia trabajo-familia",
  leadership: "Liderazgo",
  relationships: "Relaciones en el trabajo",
  violence: "Violencia",
};

export function PsychometricTab({ employeeId, employeeName }: Props) {
  const [mode, setMode] = useState<"history" | "questionnaire">("history");
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const PAGE_SIZE = 5;
  const [, setLocation] = useLocation();

  const { data: questData } = trpc.psychometric.getQuestions.useQuery();
  const { data: history, isLoading: hLoading, refetch } = trpc.psychometric.getHistory.useQuery({ employeeId });
  const { data: latest } = trpc.psychometric.getLatest.useQuery({ employeeId });
  const { data: relatedCases = [] } = trpc.cases.getByEmployeeId.useQuery({ employeeId });

  const submitMutation = trpc.psychometric.submit.useMutation({
    onSuccess: (data) => {
      const riskLabel = RISK_CONFIG[data.riskLevel]?.label || data.riskLevel;
      if (data.autoCaseCreated) {
        toast.warning(
          `⚠️ Riesgo ${riskLabel} detectado (Puntaje: ${data.scoreTotal}). Se creó automáticamente un caso NOM-035 y se notificó al administrador de RH.`,
          { duration: 8000 }
        );
      } else {
        toast.success(`Evaluación completada — Riesgo: ${riskLabel} (Puntaje: ${data.scoreTotal})`);
      }
      setMode("history");
      setAnswers({});
      setNotes("");
      setCurrentPage(0);
      refetch();
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const questions = questData?.questions || [];
  const answerOptions = questData?.answerOptions || [];
  const totalPages = Math.ceil(questions.length / PAGE_SIZE);
  const pageQuestions = questions.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === questions.length;

  const exportPDF = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("No se pudo abrir la ventana de impresión"); return; }

    const riskColors: Record<string, string> = {
      nulo: "#6b7280", bajo: "#16a34a", medio: "#ca8a04", alto: "#ea580c", muy_alto: "#dc2626"
    };
    const riskLabels: Record<string, string> = {
      nulo: "Nulo", bajo: "Bajo", medio: "Medio", alto: "Alto", muy_alto: "Muy Alto"
    };

    const historyRows = (history || []).map((rec: any) => `
      <tr>
        <td>${new Date(rec.createdAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</td>
        <td style="color:${riskColors[rec.riskLevel || "nulo"]};font-weight:bold">${riskLabels[rec.riskLevel || "nulo"]}</td>
        <td style="text-align:center">${rec.scoreTotal}</td>
        <td>${rec.notes || "—"}</td>
      </tr>
    `).join("");

    const domainRows = latest ? Object.entries(DOMAIN_LABELS).map(([key, label]) => {
      const camel = "score" + key.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
      const score = (latest as any)[camel] as number || 0;
      const color = score > 8 ? "#dc2626" : score > 4 ? "#ca8a04" : "#16a34a";
      return `<tr><td>${label}</td><td style="text-align:center;color:${color};font-weight:bold">${score}</td></tr>`;
    }).join("") : "";

    const casesRows = (relatedCases as any[]).map((c: any) => `
      <tr>
        <td>${c.caseNumber}</td>
        <td>${c.caseType === "stress" ? "Estrés laboral" : c.caseType === "burnout" ? "Burnout" : c.caseType}</td>
        <td>${c.priority === "critical" ? "Crítico" : c.priority === "high" ? "Alto" : "Medio"}</td>
        <td>${c.status === "open" ? "Abierto" : c.status === "investigating" ? "En investigación" : c.status === "resolved" ? "Resuelto" : "Cerrado"}</td>
        <td>${new Date(c.createdAt).toLocaleDateString("es-MX")}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html><html lang="es"><head>
      <meta charset="UTF-8">
      <title>Expediente Psicométrico — ${employeeName}</title>
      <style>
        @page { size: A4; margin: 20mm 15mm; }
        body { font-family: Arial, sans-serif; font-size: 11px; color: #1f2937; }
        h1 { font-size: 18px; color: #1e1b4b; margin: 0 0 4px; }
        h2 { font-size: 13px; color: #4338ca; border-bottom: 2px solid #4338ca; padding-bottom: 4px; margin: 20px 0 10px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
        .header-info { color: #6b7280; font-size: 10px; }
        .risk-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th { background: #4338ca; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
        td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) td { background: #f9fafb; }
        .footer { margin-top: 30px; font-size: 9px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
        .no-data { color: #9ca3af; font-style: italic; padding: 8px; }
      </style>
      </head><body>
      <div class="header">
        <div>
          <h1>Expediente Psicométrico NOM-035</h1>
          <p style="margin:4px 0;color:#6b7280">Guía de Referencia III — Evaluación del Entorno Organizacional</p>
          <p style="margin:4px 0;font-size:13px;font-weight:bold">${employeeName}</p>
        </div>
        <div class="header-info" style="text-align:right">
          <p>Generado: ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</p>
          <p>Conforme a NOM-035-STPS-2018</p>
        </div>
      </div>

      ${latest ? `
      <h2>Evaluación Más Reciente</h2>
      <p>Fecha: <strong>${new Date(latest.createdAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</strong> &nbsp;|&nbsp;
         Puntaje total: <strong>${latest.scoreTotal}</strong> &nbsp;|&nbsp;
         Nivel de riesgo: <span class="risk-badge" style="background:${riskColors[latest.riskLevel || "nulo"]}22;color:${riskColors[latest.riskLevel || "nulo"]}">${riskLabels[latest.riskLevel || "nulo"]}</span>
      </p>
      <h2>Puntajes por Dominio</h2>
      <table><thead><tr><th>Dominio</th><th style="text-align:center">Puntaje</th></tr></thead><tbody>${domainRows}</tbody></table>
      ` : "<p class='no-data'>Sin evaluaciones registradas</p>"}

      <h2>Historial de Evaluaciones</h2>
      ${historyRows ? `<table><thead><tr><th>Fecha</th><th>Nivel de Riesgo</th><th style="text-align:center">Puntaje</th><th>Notas</th></tr></thead><tbody>${historyRows}</tbody></table>` : "<p class='no-data'>Sin historial</p>"}

      <h2>Casos NOM-035 Generados Automáticamente</h2>
      ${casesRows ? `<table><thead><tr><th>Número de Caso</th><th>Tipo</th><th>Prioridad</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>${casesRows}</tbody></table>` : "<p class='no-data'>Sin casos generados</p>"}

      <div class="footer">
        <p>Este documento es confidencial y forma parte del expediente de cumplimiento NOM-035-STPS-2018.</p>
        <p>Generado automáticamente por el Sistema de Gestión de Talento — ${new Date().toLocaleString("es-MX")}</p>
      </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  const handleSubmit = () => {
    if (!allAnswered) {
      toast.error(`Faltan ${questions.length - answeredCount} preguntas por responder`);
      return;
    }
    submitMutation.mutate({
      employeeId,
      answers: Object.entries(answers).map(([qId, ans]) => ({ questionId: parseInt(qId), answer: ans })),
      notes: notes || undefined,
    });
  };

  if (mode === "questionnaire") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Evaluacion Psicometrica NOM-035</h3>
            <p className="text-sm text-muted-foreground">Guia de Referencia III — {employeeName}</p>
          </div>
          <Button variant="outline" onClick={() => setMode("history")}>Cancelar</Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 bg-muted rounded-full h-2">
            <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${(answeredCount / Math.max(questions.length, 1)) * 100}%` }} />
          </div>
          <span className="text-sm text-muted-foreground">{answeredCount}/{questions.length}</span>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pagina {currentPage + 1} de {totalPages}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {pageQuestions.map((q) => (
              <div key={q.id} className="space-y-2">
                <p className="text-sm font-medium"><span className="text-muted-foreground mr-2">{q.id}.</span>{q.text}</p>
                <div className="flex flex-wrap gap-2">
                  {answerOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.value }))}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        answers[q.id] === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background border-border hover:border-primary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}>Anterior</Button>
          {currentPage < totalPages - 1 ? (
            <Button onClick={() => setCurrentPage(p => p + 1)}>Siguiente</Button>
          ) : (
            <div className="space-y-2 text-right">
              <textarea className="w-64 text-sm border rounded p-2 resize-none" rows={2} placeholder="Notas adicionales (opcional)" value={notes} onChange={e => setNotes(e.target.value)} />
              <div>
                <Button onClick={handleSubmit} disabled={!allAnswered || submitMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
                  {submitMutation.isPending ? "Guardando..." : "Finalizar Evaluacion"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-purple-600" />
            Expediente Psicometrico NOM-035
          </h3>
          <p className="text-sm text-muted-foreground">{employeeName} — Guia de Referencia III</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPDF}>
            <Download className="h-4 w-4 mr-1" />Exportar PDF
          </Button>
          <Button size="sm" onClick={() => setMode("questionnaire")} className="bg-purple-600 hover:bg-purple-700 text-white">
            Nueva Evaluacion
          </Button>
        </div>
      </div>

      {latest && (
        <Card className={`border-2 ${latest.riskLevel === "alto" || latest.riskLevel === "muy_alto" ? "border-red-300" : latest.riskLevel === "medio" ? "border-yellow-300" : "border-green-300"}`}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Nivel de Riesgo Actual</p>
                <div className="flex items-center gap-2 mt-1">
                  {RISK_CONFIG[latest.riskLevel || "nulo"]?.icon}
                  <span className={`text-2xl font-bold ${RISK_CONFIG[latest.riskLevel || "nulo"]?.color}`}>
                    {RISK_CONFIG[latest.riskLevel || "nulo"]?.label}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Puntaje total: <strong>{latest.scoreTotal}</strong> — {new Date(latest.createdAt).toLocaleDateString("es-MX")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                {Object.entries(DOMAIN_LABELS).map(([key, label]) => {
                  const camel = "score" + key.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
                  const score = (latest as any)[camel] as number || 0;
                  return (
                    <div key={key} className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${score > 8 ? "bg-red-500" : score > 4 ? "bg-yellow-500" : "bg-green-500"}`} />
                      <span className="text-muted-foreground">{label}: <strong>{score}</strong></span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {hLoading ? (
        <div className="text-center py-8 text-muted-foreground">Cargando historial...</div>
      ) : !history || history.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No hay evaluaciones registradas</p>
            <p className="text-sm text-muted-foreground mt-1">Haga clic en "Nueva Evaluacion" para comenzar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Historial de Evaluaciones</h4>
          {history.map((rec) => {
            const risk = RISK_CONFIG[rec.riskLevel || "nulo"];
            return (
              <div key={rec.id} className={`flex items-center justify-between p-3 rounded-lg border ${risk.bg}`}>
                <div className="flex items-center gap-3">
                  {risk.icon}
                  <div>
                    <p className={`font-medium text-sm ${risk.color}`}>{risk.label}</p>
                    <p className="text-xs text-muted-foreground">{new Date(rec.createdAt).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">{rec.scoreTotal}</p>
                  <p className="text-xs text-muted-foreground">puntos</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Casos NOM-035 generados automáticamente */}
      {(relatedCases as any[]).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Casos NOM-035 Generados Automáticamente
          </h4>
          {(relatedCases as any[]).map((c: any) => (
            <div
              key={c.id}
              className="flex items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50 cursor-pointer hover:bg-orange-100 transition-colors"
              onClick={() => setLocation(`/cases/${c.id}`)}
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-orange-800">{c.caseNumber}</p>
                  <p className="text-xs text-orange-600">
                    {c.caseType === "stress" ? "Estrés laboral" : c.caseType === "burnout" ? "Burnout" : c.caseType} — {c.status === "open" ? "Abierto" : c.status === "investigating" ? "En investigación" : c.status === "resolved" ? "Resuelto" : "Cerrado"}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(c.createdAt).toLocaleDateString("es-MX")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  c.priority === "critical" ? "bg-red-100 text-red-700" :
                  c.priority === "high" ? "bg-orange-100 text-orange-700" :
                  "bg-yellow-100 text-yellow-700"
                }`}>
                  {c.priority === "critical" ? "Crítico" : c.priority === "high" ? "Alto" : "Medio"}
                </span>
                <ExternalLink className="h-4 w-4 text-orange-500" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
