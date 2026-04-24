import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, CheckCircle2, BarChart3, Layers, Grid3X3, Lightbulb, ClipboardList, RefreshCw } from "lucide-react";

const NIVEL_COLORS: Record<string, string> = {
  nulo: "bg-green-100 text-green-800 border-green-300",
  bajo: "bg-cyan-100 text-cyan-800 border-cyan-300",
  medio: "bg-yellow-100 text-yellow-800 border-yellow-300",
  alto: "bg-orange-100 text-orange-800 border-orange-300",
  muy_alto: "bg-red-100 text-red-800 border-red-300",
};
const NIVEL_BAR_COLORS: Record<string, string> = {
  nulo: "bg-green-500", bajo: "bg-cyan-500", medio: "bg-yellow-500", alto: "bg-orange-500", muy_alto: "bg-red-600",
};

function NivelBadge({ nivel, labelClass }: { nivel: string; labelClass: string }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${NIVEL_COLORS[labelClass] ?? "bg-gray-100 text-gray-700 border-gray-300"}`}>{nivel}</span>;
}
function ScoreBar({ puntaje, labelClass }: { puntaje: number; labelClass: string }) {
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${NIVEL_BAR_COLORS[labelClass] ?? "bg-gray-400"}`} style={{ width: `${Math.min(puntaje, 100)}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-600 w-12 text-right">{puntaje}%</span>
    </div>
  );
}

export default function NOM035DetailedReport() {
  const [showCategoria, setShowCategoria] = useState(true);
  const [showDominio, setShowDominio] = useState(true);
  const [showDimension, setShowDimension] = useState(true);
  const [showRecomendaciones, setShowRecomendaciones] = useState(false);
  const [showPlanTrabajo, setShowPlanTrabajo] = useState(false);
  const [queryParams, setQueryParams] = useState({ showCategoria: true, showDominio: true, showDimension: true, showRecomendaciones: false, showPlanTrabajo: false, surveyPeriodId: undefined as number | undefined });

  const { data, isLoading } = trpc.nom035Admin.getDetailedResults.useQuery(queryParams, { retry: false });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Dictamen NOM-035 — Análisis Extendido
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Cálculo por <strong>Categoría, Dominio y Dimensión</strong> conforme a la NOM-035-STPS-2018.
              Fórmula: (PuntajeDirecto / MáximoPosible) × 100.
            </p>
          </div>
          <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50 whitespace-nowrap">NOM-035-STPS-2018</Badge>
        </div>

        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Grid3X3 className="w-4 h-4 text-slate-500" />Personaliza tu reporte final</CardTitle>
            <CardDescription>Selecciona qué secciones incluir en el dictamen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              {[
                { label: "Resultados por Categoría", value: showCategoria, set: setShowCategoria },
                { label: "Resultados por Dominio", value: showDominio, set: setShowDominio },
                { label: "Resultados por Dimensión", value: showDimension, set: setShowDimension },
                { label: "Recomendaciones (Guía STPS)", value: showRecomendaciones, set: setShowRecomendaciones },
                { label: "Plan de trabajo / Intervención", value: showPlanTrabajo, set: setShowPlanTrabajo },
              ].map(({ label, value, set }) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 rounded-full px-4 py-2 hover:bg-blue-50">
                  <Checkbox checked={value} onCheckedChange={(v) => set(!!v)} />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </label>
              ))}
            </div>
            <Button onClick={() => setQueryParams({ showCategoria, showDominio, showDimension, showRecomendaciones, showPlanTrabajo, surveyPeriodId: undefined })} className="bg-slate-800 hover:bg-slate-700 text-white rounded-full px-6">
              <RefreshCw className="w-4 h-4 mr-2" />Generar Dictamen NOM-035
            </Button>
          </CardContent>
        </Card>

        {isLoading && <div className="text-center py-12 text-slate-400"><RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" /><p>Calculando resultados...</p></div>}
        {!isLoading && data && data.totalRespuestas === 0 && (
          <Card className="border-dashed border-slate-300"><CardContent className="py-12 text-center text-slate-400"><BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" /><p>No hay respuestas completadas. Aplica la encuesta NOM-035 primero.</p></CardContent></Card>
        )}

        {!isLoading && data && data.totalRespuestas > 0 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-blue-200 bg-blue-50"><CardContent className="pt-5"><p className="text-xs font-semibold text-blue-600 uppercase">Total respuestas</p><p className="text-3xl font-bold text-blue-900 mt-1">{data.totalRespuestas}</p></CardContent></Card>
              {data.categoriaGeneral && (
                <Card><CardContent className="pt-5"><p className="text-xs font-semibold text-slate-500 uppercase">Categoría General</p><p className="text-3xl font-bold text-slate-900 mt-1">{data.categoriaGeneral.puntaje}%</p><NivelBadge nivel={data.categoriaGeneral.nivel.nivel} labelClass={data.categoriaGeneral.nivel.labelClass} /></CardContent></Card>
              )}
              <Card className={`border-2 ${data.requierePlanObligatorio ? "border-orange-300 bg-orange-50" : "border-green-300 bg-green-50"}`}>
                <CardContent className="pt-5">
                  <p className={`text-xs font-semibold uppercase ${data.requierePlanObligatorio ? "text-orange-600" : "text-green-600"}`}>Plan de intervención</p>
                  <div className="flex items-center gap-2 mt-2">
                    {data.requierePlanObligatorio ? <AlertTriangle className="w-6 h-6 text-orange-500" /> : <CheckCircle2 className="w-6 h-6 text-green-500" />}
                    <span className={`text-sm font-semibold ${data.requierePlanObligatorio ? "text-orange-800" : "text-green-800"}`}>{data.requierePlanObligatorio ? "Obligatorio (NOM-035 §8.4)" : "No requerido"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {data.dominios.length > 0 && queryParams.showDominio && (
              <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Layers className="w-4 h-4 text-purple-500" />Dominios Evaluados</CardTitle></CardHeader>
                <CardContent><div className="overflow-x-auto"><table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100"><th className="text-left py-2 px-3 text-slate-500 font-medium">Dominio</th><th className="text-left py-2 px-3 text-slate-500 font-medium">Puntaje</th><th className="text-left py-2 px-3 text-slate-500 font-medium">Nivel</th><th className="text-right py-2 px-3 text-slate-500 font-medium">Dimensiones</th></tr></thead>
                  <tbody>{data.dominios.map((dom) => (<tr key={dom.nombre} className="border-b border-slate-50 hover:bg-slate-50"><td className="py-2.5 px-3 font-medium text-slate-800">{dom.nombre}</td><td className="py-2.5 px-3"><ScoreBar puntaje={dom.puntaje} labelClass={dom.nivel.labelClass} /></td><td className="py-2.5 px-3"><NivelBadge nivel={dom.nivel.nivel} labelClass={dom.nivel.labelClass} /></td><td className="py-2.5 px-3 text-right text-slate-400 text-xs">{dom.totalDimensiones}</td></tr>))}</tbody>
                </table></div></CardContent>
              </Card>
            )}

            {data.dimensiones.length > 0 && queryParams.showDimension && (
              <Card><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Grid3X3 className="w-4 h-4 text-teal-500" />Dimensiones — Cálculo NOM-035 Extendido</CardTitle><CardDescription className="text-xs">Fórmula: (PuntajeDirecto / MáximoPosible) × 100</CardDescription></CardHeader>
                <CardContent><div className="overflow-x-auto"><table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100"><th className="text-left py-2 px-3 text-slate-500 font-medium">Dimensión</th><th className="text-left py-2 px-3 text-slate-500 font-medium">Dominio</th><th className="text-left py-2 px-3 text-slate-500 font-medium">Puntaje (%)</th><th className="text-left py-2 px-3 text-slate-500 font-medium">Nivel</th><th className="text-right py-2 px-3 text-slate-500 font-medium">Reactivos</th></tr></thead>
                  <tbody>{data.dimensiones.map((dim) => (<tr key={dim.nombre} className="border-b border-slate-50 hover:bg-slate-50"><td className="py-2.5 px-3 font-medium text-slate-800">{dim.nombre}</td><td className="py-2.5 px-3 text-slate-500 text-xs">{dim.domain || dim.category || "—"}</td><td className="py-2.5 px-3"><ScoreBar puntaje={dim.puntaje} labelClass={dim.nivel.labelClass} /></td><td className="py-2.5 px-3"><NivelBadge nivel={dim.nivel.nivel} labelClass={dim.nivel.labelClass} /></td><td className="py-2.5 px-3 text-right text-slate-400 text-xs">{dim.totalReactivos}</td></tr>))}</tbody>
                </table></div></CardContent>
              </Card>
            )}

            {data.recomendaciones.length > 0 && queryParams.showRecomendaciones && (
              <Card className="border-indigo-200 bg-indigo-50"><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2 text-indigo-800"><Lightbulb className="w-4 h-4 text-indigo-500" />Recomendaciones basadas en NOM-035</CardTitle></CardHeader>
                <CardContent><ul className="space-y-2">{data.recomendaciones.map((rec, i) => (<li key={i} className="flex items-start gap-2 text-sm text-indigo-800"><span className="mt-0.5 text-indigo-400">•</span>{rec}</li>))}</ul></CardContent>
              </Card>
            )}

            {data.planTrabajo && queryParams.showPlanTrabajo && (
              <Card className="border-orange-200 bg-orange-50"><CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2 text-orange-800"><ClipboardList className="w-4 h-4 text-orange-500" />Plan de trabajo sugerido (NOM-035, numeral 8.4)</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Nivel 1 — Acción inmediata", value: data.planTrabajo.nivel1 },
                    { label: "Nivel 2 — Intervención organizacional", value: data.planTrabajo.nivel2 },
                    { label: "Nivel 3 — Seguimiento", value: data.planTrabajo.nivel3 },
                    { label: "Comité de seguridad", value: data.planTrabajo.comite },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-lg p-3 border border-orange-200">
                      <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-sm text-slate-700">{value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {data.requierePlanObligatorio && !queryParams.showPlanTrabajo && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg p-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div><p className="text-sm font-semibold text-amber-800">Aviso normativo</p><p className="text-sm text-amber-700 mt-0.5">Se detectaron niveles <strong>Alto</strong> o <strong>Muy Alto</strong>. La NOM-035 obliga a un plan de intervención (numeral 8.4).</p></div>
              </div>
            )}
            <p className="text-xs text-center text-slate-400 pt-2">NOM-035-STPS-2018 — Niveles: Nulo (0-5), Bajo (6-40), Medio (41-60), Alto (61-85), Muy Alto (86-100)</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
