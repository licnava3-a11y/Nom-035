/**
 * Dashboard de IA Psicosocial — NOM-035 STPS 2018
 *
 * Centraliza las capacidades de Forge LLM para:
 * - Análisis de texto bajo demanda
 * - Reporte ejecutivo organizacional
 * - Perfil de riesgo por departamento
 * - Generación de planes de intervención
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Brain,
  AlertTriangle,
  FileText,
  Lightbulb,
  TrendingUp,
  CheckCircle2,
  Loader2,
  Sparkles,
  Target,
  Building2,
  User,
  ChevronRight,
  Shield,
  Clock,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

const RISK_LABELS: Record<string, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  critical: "Crítico",
};

const SENTIMENT_COLORS: Record<string, string> = {
  positive: "bg-emerald-100 text-emerald-800",
  neutral: "bg-slate-100 text-slate-700",
  negative: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Positivo",
  neutral: "Neutral",
  negative: "Negativo",
  critical: "Crítico",
};

const TREND_LABELS: Record<string, { label: string; icon: string }> = {
  improving: { label: "Mejorando", icon: "↑" },
  stable: { label: "Estable", icon: "→" },
  worsening: { label: "Empeorando", icon: "↓" },
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function PsychosocialAIDashboard() {
  const [activeTab, setActiveTab] = useState("analyze");

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg">
          <Brain className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">IA Psicosocial — Forge LLM</h1>
          <p className="text-slate-500 mt-0.5">
            Análisis inteligente de riesgos psicosociales basado en NOM-035-STPS-2018
          </p>
        </div>
        <Badge className="ml-auto bg-indigo-100 text-indigo-700 border-indigo-200 font-medium">
          <Sparkles className="h-3 w-3 mr-1" />
          Forge LLM Activo
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="analyze" className="gap-1.5">
            <Brain className="h-4 w-4" />
            Analizar Texto
          </TabsTrigger>
          <TabsTrigger value="department" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Departamento
          </TabsTrigger>
          <TabsTrigger value="report" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Reporte Org.
          </TabsTrigger>
          <TabsTrigger value="intervention" className="gap-1.5">
            <Target className="h-4 w-4" />
            Intervención
          </TabsTrigger>
        </TabsList>

        {/* Tab: Analizar Texto */}
        <TabsContent value="analyze" className="mt-6">
          <AnalyzeTextTab />
        </TabsContent>

        {/* Tab: Perfil de Departamento */}
        <TabsContent value="department" className="mt-6">
          <DepartmentRiskTab />
        </TabsContent>

        {/* Tab: Reporte Organizacional */}
        <TabsContent value="report" className="mt-6">
          <OrgReportTab />
        </TabsContent>

        {/* Tab: Plan de Intervención */}
        <TabsContent value="intervention" className="mt-6">
          <InterventionPlanTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Tab: Analizar Texto ──────────────────────────────────────────────────────

function AnalyzeTextTab() {
  const [text, setText] = useState("");
  const [questionContext, setQuestionContext] = useState("");
  const [department, setDepartment] = useState("");
  const [result, setResult] = useState<any>(null);

  const analyzeText = trpc.sentimentAnalysis.analyzeText.useMutation({
    onSuccess: (data) => {
      setResult(data.analysis);
      toast.success("Análisis completado con Forge LLM");
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  const handleAnalyze = () => {
    if (!text.trim() || text.length < 10) {
      toast.error("Ingresa al menos 10 caracteres para analizar");
      return;
    }
    analyzeText.mutate({
      text,
      questionContext: questionContext || undefined,
      employeeContext: department ? { department } : undefined,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Brain className="h-4 w-4 text-indigo-500" />
            Texto a Analizar
          </CardTitle>
          <CardDescription>
            Ingresa una respuesta de encuesta o comentario para detectar factores de riesgo psicosocial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Respuesta del trabajador *</Label>
            <Textarea
              placeholder="Ej: Me siento muy presionado por los plazos, mi jefe constantemente me exige más de lo que puedo dar y siento que no tengo apoyo del equipo..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-slate-400">{text.length}/2000 caracteres</p>
          </div>

          <div className="space-y-1.5">
            <Label>Contexto de la pregunta (opcional)</Label>
            <Input
              placeholder="Ej: ¿Cómo describe su ambiente de trabajo?"
              value={questionContext}
              onChange={(e) => setQuestionContext(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Departamento (opcional)</Label>
            <Input
              placeholder="Ej: Producción, Ventas, Administración..."
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <Button
            onClick={handleAnalyze}
            disabled={analyzeText.isPending || text.length < 10}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            {analyzeText.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analizando con Forge LLM...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analizar con IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Resultado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4 text-indigo-500" />
            Resultado del Análisis
          </CardTitle>
          <CardDescription>Evaluación de riesgo psicosocial generada por IA</CardDescription>
        </CardHeader>
        <CardContent>
          {!result ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Brain className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">El análisis aparecerá aquí</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Badges principales */}
              <div className="flex flex-wrap gap-2">
                <Badge className={`${RISK_COLORS[result.riskLevel]} border font-semibold`}>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Riesgo {RISK_LABELS[result.riskLevel]}
                </Badge>
                <Badge className={`${SENTIMENT_COLORS[result.sentiment]} font-medium`}>
                  Sentimiento {SENTIMENT_LABELS[result.sentiment]}
                </Badge>
                <Badge variant="outline" className="text-slate-600">
                  Confianza: {result.confidence}%
                </Badge>
              </div>

              <Separator />

              {/* Resumen */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Resumen</p>
                <p className="text-sm text-slate-700">{result.summary}</p>
              </div>

              {/* Indicadores de riesgo */}
              {result.riskIndicators?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Indicadores NOM-035 detectados
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.riskIndicators.map((ind: string) => (
                      <Badge key={ind} variant="outline" className="text-xs text-red-700 border-red-200 bg-red-50">
                        {ind.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Palabras clave */}
              {result.keywords?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Palabras clave</p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.keywords.map((kw: string) => (
                      <Badge key={kw} variant="secondary" className="text-xs">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Recomendaciones */}
              <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <Lightbulb className="h-3 w-3" />
                  Recomendaciones para el Comité
                </p>
                <p className="text-sm text-indigo-800">{result.recommendations}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Perfil de Departamento ──────────────────────────────────────────────

function DepartmentRiskTab() {
  const [departmentName, setDepartmentName] = useState("");
  const [dateRange, setDateRange] = useState("90");
  const [enabled, setEnabled] = useState(false);

  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString();

  const { data, isLoading, refetch } = trpc.sentimentAnalysis.getDepartmentRiskProfile.useQuery(
    { departmentName, startDate, endDate },
    { enabled: enabled && departmentName.length > 0 }
  );

  const handleGenerate = () => {
    if (!departmentName.trim()) {
      toast.error("Ingresa el nombre del departamento");
      return;
    }
    setEnabled(true);
    refetch();
  };

  const profile = data?.profile;

  return (
    <div className="space-y-6">
      {/* Configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-indigo-500" />
            Perfil de Riesgo Departamental
          </CardTitle>
          <CardDescription>
            Genera un análisis de riesgo psicosocial para un departamento específico usando IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48 space-y-1.5">
              <Label>Nombre del departamento</Label>
              <Input
                placeholder="Ej: Producción, Ventas, RH..."
                value={departmentName}
                onChange={(e) => setDepartmentName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Período de análisis</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="60">Últimos 60 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                  <SelectItem value="180">Últimos 6 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGenerate}
                disabled={isLoading || !departmentName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generar Perfil
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resultado */}
      {profile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Resumen */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{profile.departmentName}</CardTitle>
                <Badge className={`${RISK_COLORS[profile.overallRiskLevel]} border font-semibold`}>
                  Riesgo {RISK_LABELS[profile.overallRiskLevel]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">Tendencia:</span>
                <span className={`font-medium ${profile.trendDirection === "worsening" ? "text-red-600" : profile.trendDirection === "improving" ? "text-emerald-600" : "text-amber-600"}`}>
                  {TREND_LABELS[profile.trendDirection]?.icon} {TREND_LABELS[profile.trendDirection]?.label}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-slate-400" />
                <span className="text-slate-600">Prioridad:</span>
                <span className="font-bold text-slate-900">{profile.priorityScore}/100</span>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Factores de riesgo principales</p>
                <ul className="space-y-1">
                  {profile.primaryRiskFactors?.map((f: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-red-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600 border">
                <strong>Impacto estimado:</strong> {profile.estimatedImpact}
              </div>
            </CardContent>
          </Card>

          {/* Acciones */}
          <div className="space-y-4">
            {profile.urgentActions?.length > 0 && (
              <Card className="border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-4 w-4" />
                    Acciones Urgentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {profile.urgentActions.map((a: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="mt-0.5 h-4 w-4 rounded-full bg-red-100 text-red-700 text-xs flex items-center justify-center shrink-0 font-bold">{i + 1}</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {profile.preventiveActions?.length > 0 && (
              <Card className="border-emerald-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
                    <Shield className="h-4 w-4" />
                    Acciones Preventivas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {profile.preventiveActions.map((a: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Reporte Organizacional ──────────────────────────────────────────────

function OrgReportTab() {
  const [companyName, setCompanyName] = useState("");
  const [dateRange, setDateRange] = useState("90");
  const [report, setReport] = useState<any>(null);

  const generateReport = trpc.sentimentAnalysis.generateOrgReport.useMutation({
    onSuccess: (data) => {
      setReport(data.report);
      toast.success("Reporte ejecutivo generado con Forge LLM");
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  const handleGenerate = () => {
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - parseInt(dateRange) * 24 * 60 * 60 * 1000).toISOString();
    generateReport.mutate({ companyName: companyName || "La Organización", startDate, endDate });
  };

  return (
    <div className="space-y-6">
      {/* Configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-indigo-500" />
            Reporte Ejecutivo Organizacional
          </CardTitle>
          <CardDescription>
            Genera un reporte completo de riesgo psicosocial con estado de cumplimiento NOM-035 y plan de acción
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48 space-y-1.5">
              <Label>Nombre de la empresa</Label>
              <Input
                placeholder="Ej: Empresa S.A. de C.V."
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Período</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Últimos 30 días</SelectItem>
                  <SelectItem value="90">Últimos 90 días</SelectItem>
                  <SelectItem value="180">Últimos 6 meses</SelectItem>
                  <SelectItem value="365">Último año</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleGenerate}
                disabled={generateReport.isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {generateReport.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generando reporte...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generar Reporte
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reporte */}
      {report && (
        <div className="space-y-4">
          {/* Resumen ejecutivo */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Resumen Ejecutivo</CardTitle>
                <Badge className={`${RISK_COLORS[report.overallOrganizationRisk]} border font-semibold`}>
                  Riesgo Organizacional {RISK_LABELS[report.overallOrganizationRisk]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-700 leading-relaxed">{report.executiveSummary}</p>
              {report.criticalDepartments?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="text-xs text-slate-500 font-medium">Departamentos críticos:</span>
                  {report.criticalDepartments.map((d: string) => (
                    <Badge key={d} variant="outline" className="text-xs text-red-700 border-red-200 bg-red-50">
                      {d}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Factores de riesgo */}
          {report.topRiskFactors?.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  Principales Factores de Riesgo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {report.topRiskFactors.map((f: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <span className="text-sm text-slate-700">{f.factor}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">×{f.frequency}</span>
                        <Badge variant="outline" className={`text-xs ${f.severity === "critical" ? "text-red-700 border-red-200" : f.severity === "high" ? "text-orange-700 border-orange-200" : "text-amber-700 border-amber-200"}`}>
                          {f.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Plan de acción */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionCard title="Acciones Inmediatas" subtitle="Próximos 7 días" items={report.immediateActions} color="red" icon={<AlertTriangle className="h-4 w-4" />} />
            <ActionCard title="Corto Plazo" subtitle="30-90 días" items={report.shortTermActions} color="amber" icon={<Clock className="h-4 w-4" />} />
            <ActionCard title="Largo Plazo" subtitle="6-12 meses" items={report.longTermActions} color="emerald" icon={<TrendingUp className="h-4 w-4" />} />
          </div>

          {/* Cumplimiento NOM-035 */}
          <Card className="border-indigo-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-indigo-700">
                <Shield className="h-4 w-4" />
                Estado de Cumplimiento NOM-035-STPS-2018
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-700">{report.complianceStatus}</p>
              {report.nom035Recommendations?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">Recomendaciones normativas</p>
                  <ul className="space-y-1.5">
                    {report.nom035Recommendations.map((r: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 text-indigo-400 shrink-0" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Plan de Intervención ────────────────────────────────────────────────

function InterventionPlanTab() {
  const [targetType, setTargetType] = useState<"individual" | "department" | "organization">("department");
  const [targetName, setTargetName] = useState("");
  const [riskLevel, setRiskLevel] = useState<"low" | "medium" | "high" | "critical">("high");
  const [indicators, setIndicators] = useState("");
  const [concerns, setConcerns] = useState("");
  const [plan, setPlan] = useState<any>(null);

  const generatePlan = trpc.sentimentAnalysis.generateInterventionPlan.useMutation({
    onSuccess: (data) => {
      setPlan(data.plan);
      toast.success("Plan de intervención generado con Forge LLM");
    },
    onError: (err) => {
      toast.error(`Error: ${err.message}`);
    },
  });

  const handleGenerate = () => {
    if (!targetName.trim()) {
      toast.error("Ingresa el nombre del objetivo de intervención");
      return;
    }
    const riskIndicators = indicators.split(",").map((s) => s.trim()).filter(Boolean);
    generatePlan.mutate({ targetType, targetName, riskLevel, riskIndicators, specificConcerns: concerns || undefined });
  };

  return (
    <div className="space-y-6">
      {/* Configuración */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-indigo-500" />
            Generador de Plan de Intervención
          </CardTitle>
          <CardDescription>
            Crea un plan de intervención personalizado basado en los factores de riesgo detectados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo de intervención</Label>
              <Select value={targetType} onValueChange={(v) => setTargetType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="department">Departamental</SelectItem>
                  <SelectItem value="organization">Organizacional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Objetivo</Label>
              <Input
                placeholder={targetType === "individual" ? "Nombre del empleado" : targetType === "department" ? "Nombre del departamento" : "Nombre de la empresa"}
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nivel de riesgo</Label>
              <Select value={riskLevel} onValueChange={(v) => setRiskLevel(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Bajo</SelectItem>
                  <SelectItem value="medium">Medio</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Indicadores de riesgo detectados (separados por coma)</Label>
            <Input
              placeholder="Ej: burnout, estrés_crónico, carga_excesiva, liderazgo_negativo"
              value={indicators}
              onChange={(e) => setIndicators(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Preocupaciones específicas (opcional)</Label>
            <Textarea
              placeholder="Describe cualquier situación particular que deba considerarse en el plan..."
              value={concerns}
              onChange={(e) => setConcerns(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generatePlan.isPending || !targetName.trim()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {generatePlan.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generando plan...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generar Plan de Intervención
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Plan generado */}
      {plan && (
        <div className="space-y-4">
          <Card className="border-indigo-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base">{plan.title}</CardTitle>
                  <CardDescription className="mt-1">{plan.objective}</CardDescription>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <div className="flex items-center gap-1">
                    <User className="h-3.5 w-3.5" />
                    {plan.targetGroup}
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="h-3.5 w-3.5" />
                    {plan.estimatedDuration}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Actividades */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Actividades del Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {plan.activities?.map((act: any, i: number) => (
                  <div key={i} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-sm text-slate-900">{act.name}</h4>
                      <Badge variant="outline" className={`text-xs ${act.priority === "high" ? "text-red-700 border-red-200" : act.priority === "medium" ? "text-amber-700 border-amber-200" : "text-slate-600"}`}>
                        {act.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600">{act.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                      <span><strong>Responsable:</strong> {act.responsible}</span>
                      <span><strong>Plazo:</strong> {act.timeline}</span>
                      <span><strong>Resultado esperado:</strong> {act.expectedOutcome}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Indicadores de éxito */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  Indicadores de Éxito
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {plan.successIndicators?.map((ind: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-emerald-500 shrink-0" />
                      {ind}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Recursos */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-indigo-700">
                  <Lightbulb className="h-4 w-4" />
                  Recursos Necesarios
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {plan.resources?.map((res: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <ChevronRight className="h-3.5 w-3.5 mt-0.5 text-indigo-400 shrink-0" />
                      {res}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Componente auxiliar ──────────────────────────────────────────────────────

function ActionCard({ title, subtitle, items, color, icon }: { title: string; subtitle: string; items: string[]; color: string; icon: React.ReactNode }) {
  const colorMap: Record<string, string> = {
    red: "border-red-200 bg-red-50",
    amber: "border-amber-200 bg-amber-50",
    emerald: "border-emerald-200 bg-emerald-50",
  };
  const textMap: Record<string, string> = {
    red: "text-red-700",
    amber: "text-amber-700",
    emerald: "text-emerald-700",
  };

  return (
    <Card className={`border ${colorMap[color]}`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm flex items-center gap-2 ${textMap[color]}`}>
          {icon}
          {title}
        </CardTitle>
        <CardDescription className="text-xs">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items?.map((item: string, i: number) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
              <span className={`mt-0.5 h-4 w-4 rounded-full text-white text-xs flex items-center justify-center shrink-0 font-bold ${color === "red" ? "bg-red-500" : color === "amber" ? "bg-amber-500" : "bg-emerald-500"}`}>{i + 1}</span>
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
