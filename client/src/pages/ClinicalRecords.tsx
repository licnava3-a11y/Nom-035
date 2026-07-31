import { useState } from "react";
import { SignaturePad } from "@/components/SignaturePad";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Plus,
  Search,
  Eye,
  Brain,
  Calendar,
  ClipboardList,
  Lock,
  Users,
  Activity,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Download,
  History,
  ExternalLink,
  X,
} from "lucide-react";

const AUTHORIZED_ROLES = ["admin", "super_admin", "psychologist", "clinical_professional"];

// ─── Formulario de nuevo expediente ──────────────────────────────────────────
function NewRecordForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    patientName: "",
    patientAge: "",
    patientContact: "",
    professionalName: "",
    professionalLicense: "",
    professionalSpecialty: "",
    consultationReason: "",
    medicalHistory: "",
    personalHistory: "",
    familyHistory: "",
    treatmentObjectives: "",
    treatmentActivities: "",
    consentSigned: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      patientAge: form.patientAge ? parseInt(form.patientAge) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <Lock className="h-4 w-4 inline mr-1" />
        Este expediente es confidencial y solo accesible para personal clínico autorizado y administradores.
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nombre del paciente *</Label>
          <Input value={form.patientName} onChange={e => setForm(p => ({ ...p, patientName: e.target.value }))} required />
        </div>
        <div>
          <Label>Edad</Label>
          <Input type="number" min="0" max="120" value={form.patientAge} onChange={e => setForm(p => ({ ...p, patientAge: e.target.value }))} />
        </div>
      </div>
      <div>
        <Label>Contacto del paciente</Label>
        <Input placeholder="Teléfono o correo de contacto" value={form.patientContact} onChange={e => setForm(p => ({ ...p, patientContact: e.target.value }))} />
      </div>

      <div className="border-t pt-4">
        <h4 className="font-semibold mb-3 text-sm">Datos del profesional</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Nombre del profesional *</Label>
            <Input value={form.professionalName} onChange={e => setForm(p => ({ ...p, professionalName: e.target.value }))} required />
          </div>
          <div>
            <Label>Cédula profesional</Label>
            <Input value={form.professionalLicense} onChange={e => setForm(p => ({ ...p, professionalLicense: e.target.value }))} />
          </div>
        </div>
        <div className="mt-3">
          <Label>Especialidad</Label>
          <Input placeholder="Psicología clínica, Psiquiatría, etc." value={form.professionalSpecialty} onChange={e => setForm(p => ({ ...p, professionalSpecialty: e.target.value }))} />
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-semibold mb-3 text-sm">Historia clínica</h4>
        <div className="space-y-3">
          <div>
            <Label>Motivo de consulta</Label>
            <Textarea rows={2} value={form.consultationReason} onChange={e => setForm(p => ({ ...p, consultationReason: e.target.value }))} />
          </div>
          <div>
            <Label>Antecedentes médicos</Label>
            <Textarea rows={2} placeholder="Enfermedades, tratamientos previos, medicación actual..." value={form.medicalHistory} onChange={e => setForm(p => ({ ...p, medicalHistory: e.target.value }))} />
          </div>
          <div>
            <Label>Historia personal</Label>
            <Textarea rows={2} placeholder="Desarrollo, educación, relaciones, eventos significativos..." value={form.personalHistory} onChange={e => setForm(p => ({ ...p, personalHistory: e.target.value }))} />
          </div>
          <div>
            <Label>Historia familiar</Label>
            <Textarea rows={2} placeholder="Dinámica familiar, antecedentes relevantes..." value={form.familyHistory} onChange={e => setForm(p => ({ ...p, familyHistory: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-semibold mb-3 text-sm">Plan de tratamiento</h4>
        <div className="space-y-3">
          <div>
            <Label>Objetivos terapéuticos</Label>
            <Textarea rows={2} value={form.treatmentObjectives} onChange={e => setForm(p => ({ ...p, treatmentObjectives: e.target.value }))} />
          </div>
          <div>
            <Label>Actividades/Intervenciones planificadas</Label>
            <Textarea rows={2} value={form.treatmentActivities} onChange={e => setForm(p => ({ ...p, treatmentActivities: e.target.value }))} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
        <Switch checked={form.consentSigned} onCheckedChange={v => setForm(p => ({ ...p, consentSigned: v }))} />
        <Label>Consentimiento informado firmado</Label>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Guardando..." : "Crear Expediente"}
      </Button>
    </form>
  );
}

// ─── Panel de detalle del expediente ─────────────────────────────────────────
function RecordDetailPanel({ recordId, onClose }: { recordId: number; onClose: () => void }) {
  const { data, isLoading, refetch } = trpc.clinicalRecords.getDetail.useQuery({ id: recordId });
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = useState("historia");
  const [evalForm, setEvalForm] = useState({ testName: "", evaluationDate: "", result: "", interpretation: "" });
  const [sessionForm, setSessionForm] = useState({ sessionDate: "", observations: "", nextAppointment: "", sessionType: "individual" as const });
  const [showEvalForm, setShowEvalForm] = useState(false);
  const [showSessionForm, setShowSessionForm] = useState(false);

  const addEvalMutation = trpc.clinicalRecords.addEvaluation.useMutation({
    onSuccess: () => { refetch(); setShowEvalForm(false); setEvalForm({ testName: "", evaluationDate: "", result: "", interpretation: "" }); toast({ title: "Evaluación agregada" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteEvalMutation = trpc.clinicalRecords.deleteEvaluation.useMutation({
    onSuccess: () => { refetch(); toast({ title: "Evaluación eliminada" }); },
  });

  const addSessionMutation = trpc.clinicalRecords.addSessionNote.useMutation({
    onSuccess: () => { refetch(); setShowSessionForm(false); setSessionForm({ sessionDate: "", observations: "", nextAppointment: "", sessionType: "individual" }); toast({ title: "Nota de sesión agregada" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteSessionMutation = trpc.clinicalRecords.deleteSessionNote.useMutation({
    onSuccess: () => { refetch(); toast({ title: "Nota eliminada" }); },
  });

  const closeMutation = trpc.clinicalRecords.closeRecord.useMutation({
    onSuccess: () => { utils.clinicalRecords.list.invalidate(); toast({ title: "Expediente cerrado" }); onClose(); },
  });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewFolio, setPreviewFolio] = useState<string | null>(null);
  const saveSignatureMutation = trpc.clinicalRecords.saveProfessionalSignature.useMutation({
    onSuccess: () => { refetch(); toast({ title: "Firma guardada correctamente" }); },
    onError: (e) => toast({ title: "Error al guardar firma", description: e.message, variant: "destructive" }),
  });

  const { data: exportedPdfs, refetch: refetchPdfs } = trpc.clinicalRecords.getExportedPdfs.useQuery(
    { recordId },
    { enabled: activeTab === "documentos" }
  );

  const exportPdfMutation = trpc.clinicalRecords.exportPdf.useMutation({
    onSuccess: (data) => {
      toast({ title: "PDF generado", description: `Folio: ${data.folio}` });
      setPreviewUrl(data.url);
      setPreviewFolio(data.folio);
      refetchPdfs();
    },
    onError: (err) => toast({ title: "Error al generar PDF", description: err.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Cargando expediente...</div>;
  if (!data) return null;

  const { record, evaluations, sessionNotes } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-lg">{record.patientName}</h3>
          <p className="text-sm text-muted-foreground">{record.professionalName} · {record.professionalSpecialty}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={record.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
            {record.isActive ? "Activo" : "Cerrado"}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => exportPdfMutation.mutate({ id: record.id })}
            disabled={exportPdfMutation.isPending}
          >
            <Download className="h-4 w-4 mr-1" />
            {exportPdfMutation.isPending ? "Generando..." : "Exportar PDF"}
          </Button>
          {record.isActive && (
            <Button size="sm" variant="outline" onClick={() => closeMutation.mutate({ id: record.id })}>
              Cerrar expediente
            </Button>
          )}
        </div>
      </div>

      {/* Modal de vista previa del PDF */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-2xl w-full max-w-4xl flex flex-col" style={{ height: '90vh' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <div>
                <p className="font-semibold text-sm">Vista previa del Expediente Clínico</p>
                {previewFolio && <p className="text-xs text-muted-foreground">Folio: {previewFolio}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => window.open(previewUrl, '_blank')}>
                  <ExternalLink className="h-4 w-4 mr-1" />Abrir en nueva pestaña
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setPreviewUrl(null); setPreviewFolio(null); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <iframe
              src={previewUrl}
              className="flex-1 w-full rounded-b-xl"
              title="Vista previa del expediente clínico"
            />
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="historia"><ClipboardList className="h-4 w-4 mr-1" />Historia</TabsTrigger>
          <TabsTrigger value="evaluaciones"><Brain className="h-4 w-4 mr-1" />Evaluaciones ({evaluations.length})</TabsTrigger>
          <TabsTrigger value="sesiones"><Calendar className="h-4 w-4 mr-1" />Sesiones ({sessionNotes.length})</TabsTrigger>
          <TabsTrigger value="documentos"><History className="h-4 w-4 mr-1" />PDFs ({exportedPdfs?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="firma"><CheckCircle className="h-4 w-4 mr-1" />Firma</TabsTrigger>
        </TabsList>

        {/* Tab Historia Clínica */}
        <TabsContent value="historia" className="space-y-3 max-h-[50vh] overflow-y-auto">
          {[
            { label: "Motivo de consulta", value: record.consultationReason },
            { label: "Antecedentes médicos", value: record.medicalHistory },
            { label: "Historia personal", value: record.personalHistory },
            { label: "Historia familiar", value: record.familyHistory },
            { label: "Objetivos terapéuticos", value: record.treatmentObjectives },
            { label: "Actividades/Intervenciones", value: record.treatmentActivities },
          ].map(({ label, value }) => value ? (
            <div key={label} className="border rounded-lg p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
              <p className="text-sm whitespace-pre-wrap">{value}</p>
            </div>
          ) : null)}
          <div className="border rounded-lg p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Consentimiento informado</p>
            <div className="flex items-center gap-2">
              {record.consentSigned ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-500" />}
              <span className="text-sm">{record.consentSigned ? `Firmado el ${new Date(record.consentSignedAt!).toLocaleDateString()}` : "Pendiente"}</span>
            </div>
          </div>
        </TabsContent>

        {/* Tab Evaluaciones */}
        <TabsContent value="evaluaciones" className="space-y-3 max-h-[50vh] overflow-y-auto">
          <Button size="sm" onClick={() => setShowEvalForm(!showEvalForm)}>
            <Plus className="h-4 w-4 mr-1" />Nueva evaluación
          </Button>
          {showEvalForm && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nombre del test *</Label>
                  <Input placeholder="Ej: MMPI-2, Beck, Rorschach..." value={evalForm.testName} onChange={e => setEvalForm(p => ({ ...p, testName: e.target.value }))} />
                </div>
                <div>
                  <Label>Fecha de aplicación *</Label>
                  <Input type="date" value={evalForm.evaluationDate} onChange={e => setEvalForm(p => ({ ...p, evaluationDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Resultado</Label>
                <Textarea rows={2} placeholder="Puntuaciones, categorías, percentiles..." value={evalForm.result} onChange={e => setEvalForm(p => ({ ...p, result: e.target.value }))} />
              </div>
              <div>
                <Label>Interpretación clínica</Label>
                <Textarea rows={3} placeholder="Análisis e interpretación de los resultados..." value={evalForm.interpretation} onChange={e => setEvalForm(p => ({ ...p, interpretation: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addEvalMutation.mutate({ recordId: record.id, ...evalForm })} disabled={!evalForm.testName || !evalForm.evaluationDate || addEvalMutation.isPending}>
                  Guardar evaluación
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowEvalForm(false)}>Cancelar</Button>
              </div>
            </div>
          )}
          {evaluations.map((ev) => (
            <div key={ev.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold">{ev.testName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(ev.evaluationDate).toLocaleDateString()}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteEvalMutation.mutate({ id: ev.id })}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
              {ev.result && <div className="text-sm mb-2"><span className="font-medium">Resultado: </span>{ev.result}</div>}
              {ev.interpretation && <div className="text-sm text-muted-foreground italic">{ev.interpretation}</div>}
            </div>
          ))}
          {!evaluations.length && !showEvalForm && (
            <p className="text-center text-muted-foreground text-sm py-4">No hay evaluaciones registradas</p>
          )}
        </TabsContent>

        {/* Tab Notas de sesión */}
        <TabsContent value="sesiones" className="space-y-3 max-h-[50vh] overflow-y-auto">
          <Button size="sm" onClick={() => setShowSessionForm(!showSessionForm)}>
            <Plus className="h-4 w-4 mr-1" />Nueva nota de sesión
          </Button>
          {showSessionForm && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fecha de sesión *</Label>
                  <Input type="date" value={sessionForm.sessionDate} onChange={e => setSessionForm(p => ({ ...p, sessionDate: e.target.value }))} />
                </div>
                <div>
                  <Label>Tipo de sesión</Label>
                  <Select value={sessionForm.sessionType} onValueChange={v => setSessionForm(p => ({ ...p, sessionType: v as typeof sessionForm.sessionType }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="grupal">Grupal</SelectItem>
                      <SelectItem value="familiar">Familiar</SelectItem>
                      <SelectItem value="seguimiento">Seguimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Observaciones clínicas *</Label>
                <Textarea rows={4} placeholder="Descripción de la sesión, observaciones, avances, regresiones..." value={sessionForm.observations} onChange={e => setSessionForm(p => ({ ...p, observations: e.target.value }))} />
              </div>
              <div>
                <Label>Próxima cita</Label>
                <Input type="date" value={sessionForm.nextAppointment} onChange={e => setSessionForm(p => ({ ...p, nextAppointment: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => addSessionMutation.mutate({ recordId: record.id, ...sessionForm })} disabled={!sessionForm.sessionDate || !sessionForm.observations || addSessionMutation.isPending}>
                  Guardar nota
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowSessionForm(false)}>Cancelar</Button>
              </div>
            </div>
          )}
          {sessionNotes.map((note) => (
            <div key={note.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-semibold">{new Date(note.sessionDate).toLocaleDateString()}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs capitalize">{note.sessionType}</Badge>
                    <span className="text-xs text-muted-foreground">Por: {note.authorName}</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => deleteSessionMutation.mutate({ id: note.id })}>
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
              <p className="text-sm whitespace-pre-wrap">{note.observations}</p>
              {note.nextAppointment && (
                <p className="text-xs text-muted-foreground mt-2">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  Próxima cita: {new Date(note.nextAppointment).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
          {!sessionNotes.length && !showSessionForm && (
            <p className="text-center text-muted-foreground text-sm py-4">No hay notas de sesión registradas</p>
          )}
        </TabsContent>

        {/* Tab Documentos exportados */}
        <TabsContent value="documentos" className="space-y-3 max-h-[50vh] overflow-y-auto">
          {!exportedPdfs?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay PDFs exportados aún.</p>
              <p className="text-xs mt-1">Usa el botón "Exportar PDF" para generar el primer documento.</p>
            </div>
          ) : (
            exportedPdfs.map((pdf) => (
              <div key={pdf.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">Folio: {pdf.folio}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(pdf.createdAt).toLocaleString('es-MX')} — {pdf.generatedByName ?? 'Sistema'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  <Button size="sm" variant="outline" onClick={() => { setPreviewUrl(pdf.fileUrl); setPreviewFolio(pdf.folio); }}>
                    <Eye className="h-4 w-4 mr-1" />Vista previa
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => window.open(pdf.fileUrl, '_blank')}>
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        {/* Tab Firma electrónica del profesional */}
        <TabsContent value="firma" className="space-y-4 max-h-[55vh] overflow-y-auto">
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-sm">Firma electrónica del profesional responsable</h3>
              <p className="text-xs text-muted-foreground mt-1">
                La firma se incrusta automáticamente en los PDFs exportados del expediente.
                Solo el personal clínico autorizado puede modificarla.
              </p>
            </div>
            <SignaturePad
              onSave={(signatureDataUrl) =>
                saveSignatureMutation.mutate({ id: record.id, signatureBase64: signatureDataUrl })
              }
              onCancel={() => setActiveTab("historia")}
              signerName={record.professionalName}
              signerRole={record.professionalSpecialty ?? undefined}
              initialSignature={record.professionalSignature ?? undefined}
            />
            {record.professionalSignature && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Firma registrada. Se incluirá en el próximo PDF exportado.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ClinicalRecords() {
  const { user } = useAuth();
  const isAuthorized = AUTHORIZED_ROLES.includes(user?.role ?? "");

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Lock className="h-16 w-16 text-muted-foreground" />
        <h2 className="text-xl font-bold">Acceso Restringido</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Los expedientes clínicos psicométricos son confidenciales y solo accesibles para personal clínico autorizado y administradores del sistema.
        </p>
      </div>
    );
  }

  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showActive, setShowActive] = useState<boolean | undefined>(true);
  const [newRecordOpen, setNewRecordOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);

  const { data: listData, isLoading, refetch } = trpc.clinicalRecords.list.useQuery({
    search: search || undefined,
    isActive: showActive,
    page: 1,
    pageSize: 50,
  });

  const { data: stats } = trpc.clinicalRecords.getStats.useQuery();

  const createMutation = trpc.clinicalRecords.create.useMutation({
    onSuccess: () => {
      refetch();
      setNewRecordOpen(false);
      toast({ title: "Expediente creado correctamente" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 text-purple-600" />
            Expediente Clínico Psicométrico
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-1 mt-1">
            <Lock className="h-3 w-3" />
            Información confidencial — Acceso restringido a personal autorizado
          </p>
        </div>
        <Button onClick={() => setNewRecordOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />Nuevo Expediente
        </Button>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalRecords}</p>
                  <p className="text-xs text-muted-foreground">Total expedientes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.activeRecords}</p>
                  <p className="text-xs text-muted-foreground">Expedientes activos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalEvaluations}</p>
                  <p className="text-xs text-muted-foreground">Evaluaciones</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalSessions}</p>
                  <p className="text-xs text-muted-foreground">Notas de sesión</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre del paciente..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select
          value={showActive === undefined ? "all" : showActive ? "active" : "closed"}
          onValueChange={v => setShowActive(v === "all" ? undefined : v === "active")}
        >
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="closed">Cerrados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de expedientes */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando expedientes...</div>
      ) : !listData?.records.length ? (
        <div className="text-center py-12">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No hay expedientes registrados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {listData.records.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => setSelectedRecordId(record.id)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-700 font-bold text-sm">{record.patientName.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-medium">{record.patientName}</p>
                  <p className="text-xs text-muted-foreground">{record.professionalName} · {record.professionalSpecialty}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground">{new Date(record.createdAt).toLocaleDateString()}</p>
                <Badge className={record.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                  {record.isActive ? "Activo" : "Cerrado"}
                </Badge>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal nuevo expediente */}
      <Dialog open={newRecordOpen} onOpenChange={setNewRecordOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Expediente Clínico</DialogTitle>
          </DialogHeader>
          <NewRecordForm onSubmit={(data) => createMutation.mutate(data as Parameters<typeof createMutation.mutate>[0])} loading={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      {/* Modal detalle */}
      <Dialog open={selectedRecordId !== null} onOpenChange={(open) => !open && setSelectedRecordId(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expediente Clínico</DialogTitle>
          </DialogHeader>
          {selectedRecordId !== null && (
            <RecordDetailPanel recordId={selectedRecordId} onClose={() => setSelectedRecordId(null)} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
