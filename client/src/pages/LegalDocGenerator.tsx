import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { FileText, Scale, ChevronDown, ChevronUp, Loader2, CheckCircle, Download, Save, Eye, Trash2, Plus } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

const INVESTIGACION_SECTIONS = [
  { key: "fundamento_normativo", label: "1. Fundamento Normativo", desc: "Artículos y puntos de la NOM-035 que exigen la investigación" },
  { key: "objetivo", label: "2. Objetivo de la Investigación", desc: "Objetivo general y específicos" },
  { key: "alcance", label: "3. Alcance", desc: "Puestos, áreas, modalidades de trabajo" },
  { key: "instrumentos", label: "4. Instrumentos de Evaluación", desc: "Guía de Referencia I, II y III" },
  { key: "poblacion_muestra", label: "5. Población Objetivo y Muestra", desc: "Criterios de inclusión, exclusión y cálculo muestral" },
  { key: "periodicidad", label: "6. Periodicidad", desc: "Cada 12 o 24 meses; eventos traumáticos" },
  { key: "responsables", label: "7. Responsables de la Investigación", desc: "Perfil: psicólogo con experiencia en SST, cédula profesional" },
  { key: "calendario", label: "8. Calendario de Etapas", desc: "Planeación, aplicación, análisis, integración del expediente" },
  { key: "confidencialidad", label: "9. Confidencialidad y No Represalias", desc: "Mecanismos de protección" },
  { key: "integracion_normas", label: "10. Integración con Otras Normas", desc: "Relación con NOM-036, NOM-037, etc." },
  { key: "aprobacion_registro", label: "11. Aprobación y Registro", desc: "Visto bueno del patrón o responsable de SST" },
];

const DICTAMEN_SECTIONS = [
  { key: "encabezado_formal", label: "1. Encabezado Formal", desc: "Razón social, domicilio, número de trabajadores por sexo" },
  { key: "numero_fecha", label: "2. Número de Dictamen y Fecha", desc: "Folio y fecha de emisión" },
  { key: "metodologia", label: "3. Metodología Aplicada", desc: "Instrumentos, fechas, muestra, tasa de respuesta" },
  { key: "hallazgos_clave", label: "4. Hallazgos Clave", desc: "Niveles de riesgo por dominio (bajo, medio, alto, muy alto)" },
  { key: "impacto_legal", label: "5. Análisis de Impacto Legal", desc: "Artículos de LFT o NOM incumplidos" },
  { key: "conclusiones_tecnicas", label: "6. Conclusiones Técnicas", desc: "Nivel de riesgo global determinado" },
  { key: "conclusiones_juridicas", label: "7. Conclusiones Jurídicas", desc: "Redacción de imputación normativa" },
  { key: "medidas_correctivas", label: "8. Medidas Correctivas", desc: "Acciones, plazos en días hábiles, responsable" },
  { key: "recomendaciones_seguimiento", label: "9. Recomendaciones de Seguimiento", desc: "Próxima evaluación, indicadores" },
  { key: "firmas", label: "10. Firmas", desc: "Responsable técnico y representante legal" },
  { key: "anexos", label: "11. Anexos", desc: "Listado de documentos que integran el expediente" },
];

const RIESGO_COLORS: Record<string, string> = {
  ausente: "bg-green-100 text-green-800",
  bajo: "bg-blue-100 text-blue-800",
  medio: "bg-yellow-100 text-yellow-800",
  alto: "bg-orange-100 text-orange-800",
  muy_alto: "bg-red-100 text-red-800",
};

const RIESGO_LABELS: Record<string, string> = {
  ausente: "Ausente",
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto",
  muy_alto: "Muy Alto",
};

// ── Section Viewer ────────────────────────────────────────────────────────────

function SectionEditor({ sections, contenido, onChange }: {
  sections: typeof INVESTIGACION_SECTIONS;
  contenido: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <Collapsible
          key={section.key}
          open={openSections[section.key] ?? true}
          onOpenChange={(open) => setOpenSections(prev => ({ ...prev, [section.key]: open }))}
        >
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors border">
              <div>
                <p className="font-semibold text-sm">{section.label}</p>
                <p className="text-xs text-muted-foreground">{section.desc}</p>
              </div>
              {openSections[section.key] !== false ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-2 pb-3 px-1">
              <Textarea
                value={contenido[section.key] ?? ""}
                onChange={(e) => onChange(section.key, e.target.value)}
                rows={6}
                className="text-sm font-mono leading-relaxed"
                placeholder={`Contenido del ${section.label}...`}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

// ── Document History Table ────────────────────────────────────────────────────

function DocHistoryTable({ docs, onView, onDelete, type }: {
  docs: any[];
  onView: (doc: any) => void;
  onDelete: (id: number) => void;
  type: "investigacion" | "dictamen";
}) {
  if (!docs.length) return (
    <div className="text-center py-12 text-muted-foreground">
      <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
      <p>No hay documentos generados aún.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-semibold">Folio</th>
            {type === "investigacion" ? (
              <>
                <th className="text-left py-2 px-3 font-semibold">Empresa</th>
                <th className="text-left py-2 px-3 font-semibold">Área</th>
              </>
            ) : (
              <>
                <th className="text-left py-2 px-3 font-semibold">Razón Social</th>
                <th className="text-left py-2 px-3 font-semibold">Riesgo Global</th>
              </>
            )}
            <th className="text-left py-2 px-3 font-semibold">Estado</th>
            <th className="text-left py-2 px-3 font-semibold">Fecha</th>
            <th className="text-left py-2 px-3 font-semibold">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((doc) => (
            <tr key={doc.id} className="border-b hover:bg-muted/30">
              <td className="py-2 px-3 font-mono font-semibold text-primary">{doc.folio}</td>
              {type === "investigacion" ? (
                <>
                  <td className="py-2 px-3">{doc.empresa ?? "—"}</td>
                  <td className="py-2 px-3">{doc.area ?? "—"}</td>
                </>
              ) : (
                <>
                  <td className="py-2 px-3">{doc.razonSocial ?? "—"}</td>
                  <td className="py-2 px-3">
                    {doc.nivelRiesgoGlobal ? (
                      <Badge className={RIESGO_COLORS[doc.nivelRiesgoGlobal] ?? ""}>
                        {RIESGO_LABELS[doc.nivelRiesgoGlobal] ?? doc.nivelRiesgoGlobal}
                      </Badge>
                    ) : "—"}
                  </td>
                </>
              )}
              <td className="py-2 px-3">
                <Badge variant={doc.estado === "aprobado" ? "default" : doc.estado === "final" ? "secondary" : "outline"}>
                  {doc.estado}
                </Badge>
              </td>
              <td className="py-2 px-3 text-muted-foreground">
                {new Date(doc.createdAt).toLocaleDateString("es-MX")}
              </td>
              <td className="py-2 px-3">
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => onView(doc)} title="Ver documento">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(doc.id)} title="Eliminar" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Investigación de Caso Tab ─────────────────────────────────────────────────

function InvestigacionTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({ empresa: "", area: "", fechaInvestigacion: "", responsableSst: "" });
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [editedContenido, setEditedContenido] = useState<Record<string, string>>({});
  const [view, setView] = useState<"form" | "editor" | "history">("form");

  const { data: docs, refetch } = trpc.caseInvestigationDocs.list.useQuery();
  const generateMut = trpc.caseInvestigationDocs.generate.useMutation({
    onSuccess: (data) => {
      setActiveDoc(data.doc);
      setEditedContenido((data.doc?.contenido as Record<string, string>) ?? {});
      setView("editor");
      toast({ title: "Documento generado", description: `Folio: ${data.doc?.folio}` });
      refetch();
    },
    onError: (e) => toast({ title: "Error al generar", description: e.message, variant: "destructive" }),
  });
  const saveMut = trpc.caseInvestigationDocs.save.useMutation({
    onSuccess: () => { toast({ title: "Guardado exitosamente" }); refetch(); },
    onError: (e) => toast({ title: "Error al guardar", description: e.message, variant: "destructive" }),
  });
  const approveMut = trpc.caseInvestigationDocs.approve.useMutation({
    onSuccess: () => { toast({ title: "Documento aprobado" }); refetch(); },
  });
  const deleteMut = trpc.caseInvestigationDocs.delete.useMutation({
    onSuccess: () => { toast({ title: "Documento eliminado" }); refetch(); },
  });

  const handleGenerate = () => {
    if (!form.empresa || !form.area || !form.fechaInvestigacion || !form.responsableSst) {
      toast({ title: "Campos requeridos", description: "Completa todos los campos antes de generar", variant: "destructive" });
      return;
    }
    generateMut.mutate(form);
  };

  const handleSave = (estado: "borrador" | "final") => {
    if (!activeDoc) return;
    saveMut.mutate({ id: activeDoc.id, contenido: editedContenido, estado });
  };

  const handleExportPDF = () => {
    if (!activeDoc) return;
    const sections = INVESTIGACION_SECTIONS;
    const contenido = editedContenido;
    let html = `<html><head><meta charset="UTF-8"><style>
      body { font-family: Arial, sans-serif; font-size: 11pt; margin: 40px; color: #1a1a1a; }
      h1 { font-size: 16pt; text-align: center; border-bottom: 2px solid #1a1a1a; padding-bottom: 10px; }
      h2 { font-size: 12pt; margin-top: 24px; color: #1a3a6e; }
      p { line-height: 1.6; margin: 8px 0; text-align: justify; }
      .folio { text-align: right; font-size: 9pt; color: #666; }
      .footer { margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px; font-size: 9pt; color: #666; text-align: center; }
    </style></head><body>`;
    html += `<div class="folio">Folio: ${activeDoc.folio} | Versión: 1.0 | Ref: NOM-035-STPS-2018</div>`;
    html += `<h1>INVESTIGACIÓN DE CASO<br><small>NOM-035-STPS-2018</small></h1>`;
    html += `<p><strong>Empresa:</strong> ${activeDoc.empresa} | <strong>Área:</strong> ${activeDoc.area} | <strong>Fecha:</strong> ${activeDoc.fechaInvestigacion}</p>`;
    sections.forEach(s => {
      html += `<h2>${s.label}</h2><p>${(contenido[s.key] ?? "").replace(/\n/g, "<br>")}</p>`;
    });
    html += `<div class="footer">Folio: ${activeDoc.folio} | NOM-035-STPS-2018 | Generado: ${new Date().toLocaleDateString("es-MX")}</div>`;
    html += `</body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Investigacion_Caso_${activeDoc.folio.replace("/", "-")}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Documento exportado", description: "Abre el archivo HTML en tu navegador e imprime como PDF" });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button variant={view === "form" ? "default" : "outline"} size="sm" onClick={() => setView("form")}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
        <Button variant={view === "history" ? "default" : "outline"} size="sm" onClick={() => setView("history")}>
          <FileText className="h-4 w-4 mr-1" /> Historial ({docs?.length ?? 0})
        </Button>
        {activeDoc && (
          <Button variant={view === "editor" ? "default" : "outline"} size="sm" onClick={() => setView("editor")}>
            <Eye className="h-4 w-4 mr-1" /> Editar: {activeDoc.folio}
          </Button>
        )}
      </div>

      {view === "form" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-blue-600" /> Generar Investigación de Caso</CardTitle>
            <CardDescription>El sistema generará automáticamente los 11 apartados obligatorios usando IA especializada en derecho laboral y SST.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Nombre de la Empresa *</Label>
                <Input placeholder="Ej: Industrias XYZ S.A. de C.V." value={form.empresa} onChange={e => setForm(p => ({ ...p, empresa: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Área / Departamento *</Label>
                <Input placeholder="Ej: Operaciones, Producción, Ventas" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Fecha de Investigación *</Label>
                <Input type="date" value={form.fechaInvestigacion} onChange={e => setForm(p => ({ ...p, fechaInvestigacion: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Responsable SST *</Label>
                <Input placeholder="Ej: Psic. María García López, Cédula 1234567" value={form.responsableSst} onChange={e => setForm(p => ({ ...p, responsableSst: e.target.value }))} />
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={generateMut.isPending} className="w-full" size="lg">
              {generateMut.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando documento con IA (puede tardar 15-30 segundos)...</>
              ) : (
                <><FileText className="h-4 w-4 mr-2" /> Generar Investigación de Caso con IA</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {view === "editor" && activeDoc && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
            <div>
              <p className="font-bold text-blue-800 dark:text-blue-200 font-mono text-lg">{activeDoc.folio}</p>
              <p className="text-sm text-blue-600 dark:text-blue-400">{activeDoc.empresa} — {activeDoc.area}</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleSave("borrador")} disabled={saveMut.isPending}>
                <Save className="h-4 w-4 mr-1" /> Borrador
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleSave("final")} disabled={saveMut.isPending}>
                <CheckCircle className="h-4 w-4 mr-1" /> Versión Final
              </Button>
              <Button size="sm" onClick={() => approveMut.mutate({ id: activeDoc.id })} disabled={approveMut.isPending}>
                <CheckCircle className="h-4 w-4 mr-1" /> Aprobar
              </Button>
              <Button size="sm" variant="secondary" onClick={handleExportPDF} title="Genera un archivo HTML listo para imprimir como PDF con espacios de firma">
                <Download className="h-4 w-4 mr-1" /> Exportar PDF Firmable
              </Button>
            </div>
          </div>
          <SectionEditor
            sections={INVESTIGACION_SECTIONS}
            contenido={editedContenido}
            onChange={(key, val) => setEditedContenido(prev => ({ ...prev, [key]: val }))}
          />
        </div>
      )}

      {view === "history" && (
        <Card>
          <CardHeader><CardTitle>Historial de Investigaciones de Caso</CardTitle></CardHeader>
          <CardContent>
            <DocHistoryTable
              docs={docs ?? []}
              type="investigacion"
              onView={(doc) => {
                setActiveDoc(doc);
                setEditedContenido((doc.contenido as Record<string, string>) ?? {});
                setView("editor");
              }}
              onDelete={(id) => deleteMut.mutate({ id })}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Dictamen Tab ──────────────────────────────────────────────────────────────

function DictamenTab() {
  const { toast } = useToast();
  const [form, setForm] = useState({
    razonSocial: "", domicilio: "", totalTrabajadores: 0,
    trabajadoresHombres: 0, trabajadoresMujeres: 0, periodoEvaluado: "",
    responsableTecnico: "", cedulaProfesional: "", representanteLegal: "",
    investigationDocId: undefined as number | undefined,
  });
  const [activeDoc, setActiveDoc] = useState<any>(null);
  const [editedContenido, setEditedContenido] = useState<Record<string, string>>({});
  const [view, setView] = useState<"form" | "editor" | "history">("form");

  const { data: docs, refetch } = trpc.dictamenDocs.list.useQuery();
  const { data: investigaciones } = trpc.dictamenDocs.listInvestigaciones.useQuery();

  const generateMut = trpc.dictamenDocs.generate.useMutation({
    onSuccess: (data) => {
      setActiveDoc(data.doc);
      setEditedContenido((data.doc?.contenido as Record<string, string>) ?? {});
      setView("editor");
      toast({ title: "Dictamen generado", description: `Folio: ${data.doc?.folio}` });
      refetch();
    },
    onError: (e) => toast({ title: "Error al generar", description: e.message, variant: "destructive" }),
  });
  const saveMut = trpc.dictamenDocs.save.useMutation({
    onSuccess: () => { toast({ title: "Guardado exitosamente" }); refetch(); },
    onError: (e) => toast({ title: "Error al guardar", description: e.message, variant: "destructive" }),
  });
  const approveMut = trpc.dictamenDocs.approve.useMutation({
    onSuccess: () => { toast({ title: "Dictamen aprobado" }); refetch(); },
  });
  const deleteMut = trpc.dictamenDocs.delete.useMutation({
    onSuccess: () => { toast({ title: "Dictamen eliminado" }); refetch(); },
  });

  const handleGenerate = () => {
    if (!form.razonSocial || !form.domicilio || !form.periodoEvaluado || !form.responsableTecnico || !form.cedulaProfesional || !form.representanteLegal) {
      toast({ title: "Campos requeridos", description: "Completa todos los campos obligatorios", variant: "destructive" });
      return;
    }
    generateMut.mutate({ ...form, totalTrabajadores: Number(form.totalTrabajadores), trabajadoresHombres: Number(form.trabajadoresHombres), trabajadoresMujeres: Number(form.trabajadoresMujeres) });
  };

  const handleSave = (estado: "borrador" | "final") => {
    if (!activeDoc) return;
    saveMut.mutate({ id: activeDoc.id, contenido: editedContenido, estado });
  };

  const handleExportPDF = () => {
    if (!activeDoc) return;
    const sections = DICTAMEN_SECTIONS;
    const contenido = editedContenido;
    const fechaEmision = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    const riesgoLabel = RIESGO_LABELS[activeDoc.nivelRiesgoGlobal] ?? activeDoc.nivelRiesgoGlobal ?? 'No determinado';
    const riesgoColor = activeDoc.nivelRiesgoGlobal === 'muy_alto' ? '#991b1b' : activeDoc.nivelRiesgoGlobal === 'alto' ? '#c2410c' : activeDoc.nivelRiesgoGlobal === 'medio' ? '#92400e' : '#166534';
    const riesgoBg = activeDoc.nivelRiesgoGlobal === 'muy_alto' ? '#fee2e2' : activeDoc.nivelRiesgoGlobal === 'alto' ? '#ffedd5' : activeDoc.nivelRiesgoGlobal === 'medio' ? '#fef9c3' : '#dcfce7';

    let html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <style>
      @page { size: letter; margin: 20mm 20mm 25mm 25mm; }
      * { box-sizing: border-box; }
      body { font-family: 'Arial', sans-serif; font-size: 10.5pt; color: #1a1a1a; line-height: 1.5; }
      .header-bar { background: #7f1d1d; color: white; padding: 10px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
      .header-bar h1 { font-size: 14pt; margin: 0; letter-spacing: 1px; }
      .header-bar .folio-box { font-size: 9pt; text-align: right; }
      .sub-header { background: #fef2f2; border: 1px solid #fecaca; padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-size: 9pt; color: #7f1d1d; }
      .riesgo-badge { display: inline-block; padding: 3px 10px; border-radius: 3px; font-weight: bold; font-size: 10pt; background: ${riesgoBg}; color: ${riesgoColor}; border: 1px solid ${riesgoColor}; }
      h2 { font-size: 10.5pt; margin-top: 18px; margin-bottom: 4px; color: #7f1d1d; border-left: 3px solid #7f1d1d; padding-left: 8px; }
      p { margin: 4px 0 10px 0; text-align: justify; white-space: pre-wrap; }
      .firma-section { margin-top: 40px; page-break-inside: avoid; }
      .firma-section h2 { border-left: 3px solid #1e3a5f; color: #1e3a5f; }
      .firma-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 20px; }
      .firma-box { border: 1px solid #ccc; padding: 16px; border-radius: 4px; }
      .firma-line { border-bottom: 1px solid #333; margin: 50px 0 6px 0; }
      .firma-label { font-size: 9pt; color: #555; text-align: center; }
      .firma-name { font-size: 9.5pt; font-weight: bold; text-align: center; margin-top: 4px; }
      .firma-cedula { font-size: 8.5pt; color: #666; text-align: center; }
      .firma-date { font-size: 8.5pt; color: #666; text-align: center; margin-top: 8px; }
      .sello-box { border: 2px dashed #999; width: 100px; height: 100px; margin: 10px auto; display: flex; align-items: center; justify-content: center; font-size: 8pt; color: #999; text-align: center; border-radius: 50%; }
      .footer { position: fixed; bottom: 0; left: 0; right: 0; border-top: 1px solid #ccc; padding: 6px 20mm; font-size: 8pt; color: #666; display: flex; justify-content: space-between; }
      .aviso-confidencial { background: #fffbeb; border: 1px solid #fcd34d; padding: 6px 12px; font-size: 8.5pt; color: #92400e; margin-bottom: 12px; text-align: center; }
      @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    </style>
    <script>window.onload = function() { window.print(); }<\/script>
    </head><body>`;

    // Encabezado
    html += `
    <div class="header-bar">
      <h1>DICTAMEN NOM-035-STPS-2018</h1>
      <div class="folio-box">
        <div><strong>Folio:</strong> ${activeDoc.folio}</div>
        <div><strong>Fecha:</strong> ${fechaEmision}</div>
      </div>
    </div>
    <div class="sub-header">
      <span>Ref. Normativa: NOM-035-STPS-2018 | Factores de Riesgo Psicosocial en el Trabajo</span>
      <span>Nivel de Riesgo Global: <span class="riesgo-badge">${riesgoLabel}</span></span>
    </div>
    <div class="aviso-confidencial">⚠️ DOCUMENTO CONFIDENCIAL — Uso exclusivo del área de Seguridad y Salud en el Trabajo. Prohibida su reproducción parcial sin autorización.</div>`;

    // Secciones 1-9
    sections.filter(s => s.key !== 'firmas').forEach(s => {
      html += `<h2>${s.label}</h2><p>${(contenido[s.key] ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
    });

    // Sección 10: Firmas con espacios firmables
    html += `
    <div class="firma-section">
      <h2>10. Firmas y Validación</h2>
      <div class="firma-grid">
        <div class="firma-box">
          <div class="sello-box">SELLO<br>EMPRESA</div>
          <div class="firma-line"></div>
          <div class="firma-label">Firma del Responsable Técnico</div>
          <div class="firma-name">${form.responsableTecnico || '___________________________'}</div>
          <div class="firma-cedula">Cédula Profesional: ${form.cedulaProfesional || '_______________'}</div>
          <div class="firma-date">Lugar y fecha: _________________________, ${new Date().getFullYear()}</div>
        </div>
        <div class="firma-box">
          <div class="sello-box">SELLO<br>EMPRESA</div>
          <div class="firma-line"></div>
          <div class="firma-label">Firma del Representante Legal</div>
          <div class="firma-name">${form.representanteLegal || '___________________________'}</div>
          <div class="firma-cedula">Cargo: Representante Legal</div>
          <div class="firma-date">Lugar y fecha: _________________________, ${new Date().getFullYear()}</div>
        </div>
      </div>
    </div>`;

    // Sección 11: Anexos
    html += `<h2>11. Anexos</h2><p>${(contenido['anexos'] ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;

    // Footer
    html += `
    <div class="footer">
      <span>Folio: ${activeDoc.folio} | NOM-035-STPS-2018</span>
      <span>Generado: ${fechaEmision}</span>
      <span>Página <span class="page-num"></span></span>
    </div>
    </body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Dictamen_NOM035_${activeDoc.folio.replace(/\//g, '-')}_${new Date().getFullYear()}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Dictamen exportado para imprimir como PDF', description: 'El archivo se abrirá con el diálogo de impresión. Selecciona “Guardar como PDF”. Incluye espacios de firma para el Responsable Técnico y el Representante Legal.' });
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button variant={view === "form" ? "default" : "outline"} size="sm" onClick={() => setView("form")}>
          <Plus className="h-4 w-4 mr-1" /> Nuevo
        </Button>
        <Button variant={view === "history" ? "default" : "outline"} size="sm" onClick={() => setView("history")}>
          <Scale className="h-4 w-4 mr-1" /> Historial ({docs?.length ?? 0})
        </Button>
        {activeDoc && (
          <Button variant={view === "editor" ? "default" : "outline"} size="sm" onClick={() => setView("editor")}>
            <Eye className="h-4 w-4 mr-1" /> Editar: {activeDoc.folio}
          </Button>
        )}
      </div>

      {view === "form" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-red-600" /> Generar Dictamen NOM-035</CardTitle>
            <CardDescription>El sistema generará el Dictamen con los 11 apartados técnico-jurídicos obligatorios, incluyendo hallazgos, impacto legal y medidas correctivas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {investigaciones && investigaciones.length > 0 && (
              <div className="space-y-1 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200">
                <Label>Vincular con Investigación de Caso (opcional)</Label>
                <Select onValueChange={(v) => setForm(p => ({ ...p, investigationDocId: v === "none" ? undefined : Number(v) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar investigación de caso..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin vinculación</SelectItem>
                    {investigaciones.map(inv => (
                      <SelectItem key={inv.id} value={String(inv.id)}>
                        {inv.folio} — {inv.empresa} ({inv.area})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label>Razón Social *</Label>
                <Input placeholder="Ej: Industrias XYZ S.A. de C.V." value={form.razonSocial} onChange={e => setForm(p => ({ ...p, razonSocial: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Domicilio Fiscal *</Label>
                <Input placeholder="Calle, número, colonia, municipio, estado, C.P." value={form.domicilio} onChange={e => setForm(p => ({ ...p, domicilio: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Total de Trabajadores *</Label>
                <Input type="number" min={1} value={form.totalTrabajadores || ""} onChange={e => setForm(p => ({ ...p, totalTrabajadores: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Período Evaluado *</Label>
                <Input placeholder="Ej: Enero - Marzo 2026" value={form.periodoEvaluado} onChange={e => setForm(p => ({ ...p, periodoEvaluado: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Trabajadores Hombres</Label>
                <Input type="number" min={0} value={form.trabajadoresHombres || ""} onChange={e => setForm(p => ({ ...p, trabajadoresHombres: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Trabajadoras Mujeres</Label>
                <Input type="number" min={0} value={form.trabajadoresMujeres || ""} onChange={e => setForm(p => ({ ...p, trabajadoresMujeres: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Responsable Técnico *</Label>
                <Input placeholder="Ej: Psic. María García López" value={form.responsableTecnico} onChange={e => setForm(p => ({ ...p, responsableTecnico: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Cédula Profesional *</Label>
                <Input placeholder="Ej: 1234567" value={form.cedulaProfesional} onChange={e => setForm(p => ({ ...p, cedulaProfesional: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Representante Legal *</Label>
                <Input placeholder="Ej: Lic. Juan Pérez Rodríguez, Director General" value={form.representanteLegal} onChange={e => setForm(p => ({ ...p, representanteLegal: e.target.value }))} />
              </div>
            </div>
            <Button onClick={handleGenerate} disabled={generateMut.isPending} className="w-full" size="lg">
              {generateMut.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generando Dictamen con IA (puede tardar 15-30 segundos)...</>
              ) : (
                <><Scale className="h-4 w-4 mr-2" /> Generar Dictamen NOM-035 con IA</>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {view === "editor" && activeDoc && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200">
            <div>
              <p className="font-bold text-red-800 dark:text-red-200 font-mono text-lg">{activeDoc.folio}</p>
              <p className="text-sm text-red-600 dark:text-red-400">{activeDoc.razonSocial}</p>
              {activeDoc.nivelRiesgoGlobal && (
                <Badge className={`mt-1 ${RIESGO_COLORS[activeDoc.nivelRiesgoGlobal] ?? ""}`}>
                  Riesgo Global: {RIESGO_LABELS[activeDoc.nivelRiesgoGlobal] ?? activeDoc.nivelRiesgoGlobal}
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => handleSave("borrador")} disabled={saveMut.isPending}>
                <Save className="h-4 w-4 mr-1" /> Borrador
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleSave("final")} disabled={saveMut.isPending}>
                <CheckCircle className="h-4 w-4 mr-1" /> Versión Final
              </Button>
              <Button size="sm" onClick={() => approveMut.mutate({ id: activeDoc.id })} disabled={approveMut.isPending}>
                <CheckCircle className="h-4 w-4 mr-1" /> Aprobar
              </Button>
              <Button size="sm" variant="secondary" onClick={handleExportPDF} title="Genera un archivo HTML listo para imprimir como PDF con espacios de firma">
                <Download className="h-4 w-4 mr-1" /> Exportar PDF Firmable
              </Button>
            </div>
          </div>
          <SectionEditor
            sections={DICTAMEN_SECTIONS}
            contenido={editedContenido}
            onChange={(key, val) => setEditedContenido(prev => ({ ...prev, [key]: val }))}
          />
        </div>
      )}

      {view === "history" && (
        <Card>
          <CardHeader><CardTitle>Historial de Dictámenes</CardTitle></CardHeader>
          <CardContent>
            <DocHistoryTable
              docs={docs ?? []}
              type="dictamen"
              onView={(doc) => {
                setActiveDoc(doc);
                setEditedContenido((doc.contenido as Record<string, string>) ?? {});
                setView("editor");
              }}
              onDelete={(id) => deleteMut.mutate({ id })}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LegalDocGenerator() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Scale className="h-6 w-6 text-primary" />
              Documentos Técnico-Jurídicos NOM-035
            </h1>
            <p className="text-muted-foreground mt-1">
              Generación automática con IA especializada en derecho laboral y seguridad y salud en el trabajo (SST).
            </p>
          </div>
          <Badge variant="outline" className="text-xs">NOM-035-STPS-2018</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="font-semibold">Documento 1</p>
                  <p className="text-sm text-muted-foreground">Investigación de Caso — 11 apartados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Scale className="h-8 w-8 text-red-600" />
                <div>
                  <p className="font-semibold">Documento 2</p>
                  <p className="text-sm text-muted-foreground">Dictamen — 11 apartados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="investigacion">
          <TabsList className="w-full">
            <TabsTrigger value="investigacion" className="flex-1">
              <FileText className="h-4 w-4 mr-2" /> Investigación de Caso
            </TabsTrigger>
            <TabsTrigger value="dictamen" className="flex-1">
              <Scale className="h-4 w-4 mr-2" /> Dictamen
            </TabsTrigger>
          </TabsList>
          <TabsContent value="investigacion" className="mt-4">
            <InvestigacionTab />
          </TabsContent>
          <TabsContent value="dictamen" className="mt-4">
            <DictamenTab />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
