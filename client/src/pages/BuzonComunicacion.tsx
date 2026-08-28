import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { EmployeeAutofillSelector } from "@/components/EmployeeAutofillSelector";
import type { EmployeeAutofillData } from "@/hooks/useEmployeeAutofill";
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
  DialogTrigger,
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
  AlertTriangle,
  Star,
  BookOpen,
  Lightbulb,
  Plus,
  Search,
  Eye,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
} from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────
const ADMIN_ROLES = ["admin", "super_admin", "committee", "committee_coordinator", "rh", "responsable_nom035"];

const STATUS_LABELS: Record<string, string> = {
  REGISTRADA: "Registrada",
  EN_ANALISIS: "En Análisis",
  EN_INVESTIGACION: "En Investigación",
  PENDIENTE_ACLARACION: "Pendiente Aclaración",
  RESUELTA: "Resuelta",
  NOTIFICADA: "Notificada",
};

const STATUS_COLORS: Record<string, string> = {
  REGISTRADA: "bg-blue-100 text-blue-800",
  EN_ANALISIS: "bg-yellow-100 text-yellow-800",
  EN_INVESTIGACION: "bg-orange-100 text-orange-800",
  PENDIENTE_ACLARACION: "bg-purple-100 text-purple-800",
  RESUELTA: "bg-green-100 text-green-800",
  NOTIFICADA: "bg-gray-100 text-gray-800",
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  REGISTRADA: ["EN_ANALISIS"],
  EN_ANALISIS: ["EN_INVESTIGACION", "RESUELTA"],
  EN_INVESTIGACION: ["PENDIENTE_ACLARACION", "RESUELTA"],
  PENDIENTE_ACLARACION: ["EN_INVESTIGACION"],
  RESUELTA: ["NOTIFICADA"],
  NOTIFICADA: [],
};

// ─── Formulario de Queja/Denuncia ─────────────────────────────────────────────
function QuejaForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    incidentDate: "",
    incidentLocation: "",
    involvedPersons: "",
    detailedNarrative: "",
    evidenceDescription: "",
    requestedAction: "",
    witnessNames: "",
    previousReportFiled: false,
    // Datos del empleado afectado (prellenado automático)
    affectedEmployeeId: "",
    affectedEmployeeName: "",
    affectedEmployeeDepartment: "",
    affectedEmployeePosition: "",
    affectedEmployeeEmail: "",
  });

  const handleAffectedEmployeeSelect = (data: EmployeeAutofillData | null) => {
    if (data) {
      setForm(p => ({
        ...p,
        affectedEmployeeId: String(data.employeeId),
        affectedEmployeeName: data.fullName,
        affectedEmployeeDepartment: data.departmentName,
        affectedEmployeePosition: data.positionName,
        affectedEmployeeEmail: data.email,
        incidentLocation: p.incidentLocation || data.departmentName, // prellenar ubicación si está vacía
      }));
    } else {
      setForm(p => ({
        ...p,
        affectedEmployeeId: "",
        affectedEmployeeName: "",
        affectedEmployeeDepartment: "",
        affectedEmployeePosition: "",
        affectedEmployeeEmail: "",
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.detailedNarrative.length < 50) {
      alert("La narrativa debe tener al menos 50 caracteres.");
      return;
    }
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Sección: Empleado Afectado */}
      <div className="rounded-lg border border-orange-100 bg-orange-50/40 p-3 space-y-3">
        <p className="text-xs font-semibold text-orange-700 flex items-center gap-1">
          <span>👤</span> Empleado Afectado (opcional — datos se guardan en el expediente del caso)
        </p>
        <EmployeeAutofillSelector
          onSelect={handleAffectedEmployeeSelect}
          value={form.affectedEmployeeId || undefined}
          label="Seleccionar empleado afectado"
          helperText="Al seleccionar, se registran automáticamente nombre, departamento, puesto y correo"
          placeholder="Buscar empleado afectado..."
        />
        {form.affectedEmployeeName && (
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input
                value={form.affectedEmployeeName}
                onChange={e => setForm(p => ({ ...p, affectedEmployeeName: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Departamento</Label>
              <Input
                value={form.affectedEmployeeDepartment}
                onChange={e => setForm(p => ({ ...p, affectedEmployeeDepartment: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Puesto</Label>
              <Input
                value={form.affectedEmployeePosition}
                onChange={e => setForm(p => ({ ...p, affectedEmployeePosition: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Correo</Label>
              <Input
                value={form.affectedEmployeeEmail}
                onChange={e => setForm(p => ({ ...p, affectedEmployeeEmail: e.target.value }))}
                className="h-8 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Fecha del incidente *</Label>
          <Input type="date" value={form.incidentDate} onChange={e => setForm(p => ({ ...p, incidentDate: e.target.value }))} required />
        </div>
        <div>
          <Label>Lugar del incidente *</Label>
          <Input placeholder="Área, departamento, instalación..." value={form.incidentLocation} onChange={e => setForm(p => ({ ...p, incidentLocation: e.target.value }))} required />
        </div>
      </div>
      <div>
        <Label>Personas involucradas</Label>
        <Input placeholder="Nombres o cargos (puede ser genérico si desea anonimato)" value={form.involvedPersons} onChange={e => setForm(p => ({ ...p, involvedPersons: e.target.value }))} />
      </div>
      <div>
        <Label>Narrativa detallada * <span className="text-xs text-muted-foreground">(mín. 50 caracteres)</span></Label>
        <Textarea
          placeholder="Describa los hechos de manera objetiva y cronológica..."
          rows={5}
          value={form.detailedNarrative}
          onChange={e => setForm(p => ({ ...p, detailedNarrative: e.target.value }))}
          required
        />
        <p className="text-xs text-muted-foreground mt-1">{form.detailedNarrative.length}/50 caracteres mínimos</p>
      </div>
      <div>
        <Label>Descripción de evidencias</Label>
        <Textarea placeholder="Correos, mensajes, documentos, testigos..." rows={2} value={form.evidenceDescription} onChange={e => setForm(p => ({ ...p, evidenceDescription: e.target.value }))} />
      </div>
      <div>
        <Label>Acción solicitada</Label>
        <Input placeholder="¿Qué espera que se haga al respecto?" value={form.requestedAction} onChange={e => setForm(p => ({ ...p, requestedAction: e.target.value }))} />
      </div>
      <div>
        <Label>Testigos (opcional)</Label>
        <Input placeholder="Nombres o cargos de posibles testigos" value={form.witnessNames} onChange={e => setForm(p => ({ ...p, witnessNames: e.target.value }))} />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.previousReportFiled} onCheckedChange={v => setForm(p => ({ ...p, previousReportFiled: v }))} />
        <Label>Ya reporté este incidente anteriormente</Label>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Enviando..." : "Enviar Queja/Denuncia"}
      </Button>
    </form>
  );
}

// ─── Formulario de Felicitación ───────────────────────────────────────────────
function FelicitacionForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    recognizedEmployeeId: "",
    recognizedName: "",
    recognizedDepartment: "",
    recognizedDate: "",
    recognitionCategory: "SERVICIO_EXCEPCIONAL",
    specificBehavior: "",
    impactDescription: "",
    publicRecognition: false,
  });

  const handleRecognizedEmployeeSelect = (data: EmployeeAutofillData | null) => {
    setForm(p => data ? {
      ...p,
      recognizedEmployeeId: String(data.employeeId),
      recognizedName: data.fullName,
      recognizedDepartment: data.departmentName,
    } : {
      ...p,
      recognizedEmployeeId: "",
      recognizedName: "",
      recognizedDepartment: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <EmployeeAutofillSelector
        onSelect={handleRecognizedEmployeeSelect}
        value={form.recognizedEmployeeId || undefined}
        label="Seleccionar persona reconocida"
        helperText="Prellena nombre y departamento desde el catálogo de empleados"
        placeholder="Buscar empleado reconocido..."
      />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nombre del reconocido *</Label>
          <Input placeholder="Nombre completo o cargo" value={form.recognizedName} onChange={e => setForm(p => ({ ...p, recognizedName: e.target.value }))} required />
        </div>
        <div>
          <Label>Departamento</Label>
          <Input placeholder="Área o departamento" value={form.recognizedDepartment} onChange={e => setForm(p => ({ ...p, recognizedDepartment: e.target.value }))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Fecha del hecho</Label>
          <Input type="date" value={form.recognizedDate} onChange={e => setForm(p => ({ ...p, recognizedDate: e.target.value }))} />
        </div>
        <div>
          <Label>Categoría de reconocimiento</Label>
          <Select value={form.recognitionCategory} onValueChange={v => setForm(p => ({ ...p, recognitionCategory: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="SERVICIO_EXCEPCIONAL">Servicio excepcional</SelectItem>
              <SelectItem value="TRABAJO_EN_EQUIPO">Trabajo en equipo</SelectItem>
              <SelectItem value="INNOVACION">Innovación</SelectItem>
              <SelectItem value="LIDERAZGO">Liderazgo</SelectItem>
              <SelectItem value="COMPROMISO">Compromiso</SelectItem>
              <SelectItem value="OTRO">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Comportamiento específico *</Label>
        <Textarea placeholder="Describa qué hizo la persona que merece reconocimiento..." rows={3} value={form.specificBehavior} onChange={e => setForm(p => ({ ...p, specificBehavior: e.target.value }))} required />
      </div>
      <div>
        <Label>Impacto en el equipo/organización</Label>
        <Textarea placeholder="¿Cómo benefició al equipo, cliente o empresa?" rows={2} value={form.impactDescription} onChange={e => setForm(p => ({ ...p, impactDescription: e.target.value }))} />
      </div>
      <div className="flex items-center gap-2">
        <Switch checked={form.publicRecognition} onCheckedChange={v => setForm(p => ({ ...p, publicRecognition: v }))} />
        <Label>Autorizo compartir este reconocimiento públicamente</Label>
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Enviando..." : "Enviar Felicitación"}
      </Button>
    </form>
  );
}

// ─── Formulario de Solicitud de Capacitación (DNC) ───────────────────────────
function CapacitacionForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    topic: "",
    trainingType: "TECNICA",
    justification: "",
    expectedBenefit: "",
    urgencyLevel: "NORMAL",
    preferredFormat: "PRESENCIAL",
    preferredDates: "",
    participantCount: "",
    externalProvider: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Tema de capacitación *</Label>
        <Input placeholder="Ej: Excel avanzado, Comunicación efectiva, NOM-035..." value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tipo de capacitación</Label>
          <Select value={form.trainingType} onValueChange={v => setForm(p => ({ ...p, trainingType: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TECNICA">Técnica/Operativa</SelectItem>
              <SelectItem value="HABILIDADES_BLANDAS">Habilidades blandas</SelectItem>
              <SelectItem value="NORMATIVA">Normativa/Legal</SelectItem>
              <SelectItem value="SEGURIDAD">Seguridad e higiene</SelectItem>
              <SelectItem value="LIDERAZGO">Liderazgo</SelectItem>
              <SelectItem value="OTRO">Otro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Nivel de urgencia</Label>
          <Select value={form.urgencyLevel} onValueChange={v => setForm(p => ({ ...p, urgencyLevel: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALTA">Alta (1 mes)</SelectItem>
              <SelectItem value="NORMAL">Normal (3 meses)</SelectItem>
              <SelectItem value="BAJA">Baja (6 meses)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Justificación *</Label>
        <Textarea placeholder="¿Por qué es necesaria esta capacitación? ¿Qué brecha de conocimiento cubre?" rows={3} value={form.justification} onChange={e => setForm(p => ({ ...p, justification: e.target.value }))} required />
      </div>
      <div>
        <Label>Beneficio esperado</Label>
        <Textarea placeholder="¿Cómo mejorará el desempeño o los resultados del área?" rows={2} value={form.expectedBenefit} onChange={e => setForm(p => ({ ...p, expectedBenefit: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Formato preferido</Label>
          <Select value={form.preferredFormat} onValueChange={v => setForm(p => ({ ...p, preferredFormat: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PRESENCIAL">Presencial</SelectItem>
              <SelectItem value="EN_LINEA">En línea</SelectItem>
              <SelectItem value="HIBRIDO">Híbrido</SelectItem>
              <SelectItem value="INDIFERENTE">Indiferente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>No. de participantes estimados</Label>
          <Input type="number" min="1" placeholder="1" value={form.participantCount} onChange={e => setForm(p => ({ ...p, participantCount: e.target.value }))} />
        </div>
      </div>
      <div>
        <Label>Fechas preferidas</Label>
        <Input placeholder="Ej: Enero 2025, entre semana, mañanas..." value={form.preferredDates} onChange={e => setForm(p => ({ ...p, preferredDates: e.target.value }))} />
      </div>
      <div>
        <Label>Proveedor externo sugerido (opcional)</Label>
        <Input placeholder="Nombre de empresa o instructor externo si tiene preferencia" value={form.externalProvider} onChange={e => setForm(p => ({ ...p, externalProvider: e.target.value }))} />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Enviando..." : "Enviar Solicitud de Capacitación"}
      </Button>
    </form>
  );
}

// ─── Formulario de Sugerencia ─────────────────────────────────────────────────
function SugerenciaForm({ onSubmit, loading }: { onSubmit: (data: Record<string, unknown>) => void; loading: boolean }) {
  const [form, setForm] = useState({
    problemDescription: "",
    proposedSolution: "",
    expectedBenefit: "",
    implementationDifficulty: "MEDIA",
    affectedArea: "",
    resourcesNeeded: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Problema u oportunidad identificada</Label>
        <Textarea placeholder="¿Qué situación desea mejorar?" rows={3} value={form.problemDescription} onChange={e => setForm(p => ({ ...p, problemDescription: e.target.value }))} />
      </div>
      <div>
        <Label>Solución propuesta *</Label>
        <Textarea placeholder="Describa su propuesta de mejora con el mayor detalle posible..." rows={4} value={form.proposedSolution} onChange={e => setForm(p => ({ ...p, proposedSolution: e.target.value }))} required />
      </div>
      <div>
        <Label>Beneficio esperado</Label>
        <Textarea placeholder="¿Qué mejoraría con esta solución? (tiempo, costo, calidad, bienestar...)" rows={2} value={form.expectedBenefit} onChange={e => setForm(p => ({ ...p, expectedBenefit: e.target.value }))} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Dificultad de implementación estimada</Label>
          <Select value={form.implementationDifficulty} onValueChange={v => setForm(p => ({ ...p, implementationDifficulty: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="BAJA">Baja (sin costo/recursos)</SelectItem>
              <SelectItem value="MEDIA">Media (recursos moderados)</SelectItem>
              <SelectItem value="ALTA">Alta (inversión significativa)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Área afectada</Label>
          <Input placeholder="Departamento o proceso" value={form.affectedArea} onChange={e => setForm(p => ({ ...p, affectedArea: e.target.value }))} />
        </div>
      </div>
      <div>
        <Label>Recursos necesarios</Label>
        <Input placeholder="Presupuesto, personal, tecnología..." value={form.resourcesNeeded} onChange={e => setForm(p => ({ ...p, resourcesNeeded: e.target.value }))} />
      </div>
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Enviando..." : "Enviar Sugerencia"}
      </Button>
    </form>
  );
}

// ─── Modal de detalle de solicitud ───────────────────────────────────────────
function RequestDetailModal({ requestId, isAdmin }: { requestId: number; isAdmin: boolean }) {
  const { data, isLoading } = trpc.buzon.getRequestDetail.useQuery({ id: requestId });
  const utils = trpc.useUtils();
  const { toast } = useToast();

  const [newStatus, setNewStatus] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [resolutionText, setResolutionText] = useState("");
  const [noteText, setNoteText] = useState("");

  const updateStatusMutation = trpc.buzon.updateStatus.useMutation({
    onSuccess: () => {
      utils.buzon.getRequestDetail.invalidate({ id: requestId });
      utils.buzon.listRequests.invalidate();
      setNewStatus("");
      setInternalNotes("");
      setResolutionText("");
      toast({ title: "Estado actualizado correctamente" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const addNoteMutation = trpc.buzon.addAuditNote.useMutation({
    onSuccess: () => {
      utils.buzon.getRequestDetail.invalidate({ id: requestId });
      setNoteText("");
      toast({ title: "Nota agregada" });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Cargando...</div>;
  if (!data) return null;

  const { request, auditEntries, attachments } = data;
  const validNext = VALID_TRANSITIONS[request.status] ?? [];
  let parsedPayload: Record<string, unknown> = {};
  try { parsedPayload = JSON.parse(request.formPayload); } catch { /* empty */ }

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Folio</p>
          <p className="font-mono font-bold text-lg">{request.publicFolio}</p>
        </div>
        <Badge className={STATUS_COLORS[request.status]}>{STATUS_LABELS[request.status]}</Badge>
      </div>

      {/* Payload del formulario */}
      <div>
        <h4 className="font-semibold mb-2">Contenido de la solicitud</h4>
        <div className="bg-muted rounded-lg p-4 text-sm space-y-2">
          {Object.entries(parsedPayload).map(([k, v]) => (
            <div key={k} className="grid grid-cols-3 gap-2">
              <span className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}:</span>
              <span className="col-span-2">{String(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Acciones de administrador */}
      {isAdmin && (
        <div className="space-y-4 border rounded-lg p-4">
          <h4 className="font-semibold">Gestión de la solicitud</h4>

          {validNext.length > 0 && (
            <div className="space-y-2">
              <Label>Cambiar estado</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger><SelectValue placeholder="Seleccionar nuevo estado..." /></SelectTrigger>
                <SelectContent>
                  {validNext.map(s => (
                    <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {newStatus && (
                <>
                  <Textarea
                    placeholder="Notas internas sobre este cambio de estado..."
                    value={internalNotes}
                    onChange={e => setInternalNotes(e.target.value)}
                    rows={2}
                  />
                  {(newStatus === "RESUELTA" || newStatus === "NOTIFICADA") && (
                    <Textarea
                      placeholder="Texto de resolución (visible para el solicitante)..."
                      value={resolutionText}
                      onChange={e => setResolutionText(e.target.value)}
                      rows={3}
                    />
                  )}
                  <Button
                    size="sm"
                    onClick={() => updateStatusMutation.mutate({ requestId: request.id, newStatus, internalNotes, resolutionText })}
                    disabled={!internalNotes || updateStatusMutation.isPending}
                  >
                    Actualizar estado
                  </Button>
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Agregar nota interna</Label>
            <Textarea placeholder="Nota de seguimiento..." value={noteText} onChange={e => setNoteText(e.target.value)} rows={2} />
            <Button size="sm" variant="outline" onClick={() => addNoteMutation.mutate({ requestId: request.id, notes: noteText })} disabled={!noteText || addNoteMutation.isPending}>
              Agregar nota
            </Button>
          </div>
        </div>
      )}

      {/* Resolución */}
      {request.resolutionText && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-1">Resolución</h4>
          <p className="text-sm text-green-700">{request.resolutionText}</p>
        </div>
      )}

      {/* Historial de auditoría */}
      <div>
        <h4 className="font-semibold mb-2">Historial de seguimiento</h4>
        <div className="space-y-2">
          {auditEntries.map((entry) => (
            <div key={entry.id} className="border rounded-lg p-3 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{entry.actionByName}</span>
                <span className="text-muted-foreground text-xs">{new Date(entry.createdAt).toLocaleString()}</span>
              </div>
              {entry.fromStatus !== entry.toStatus && (
                <div className="flex items-center gap-1 text-xs mb-1">
                  <Badge variant="outline" className="text-xs">{STATUS_LABELS[entry.fromStatus ?? ""] ?? entry.fromStatus ?? "—"}</Badge>
                  <ChevronRight className="h-3 w-3" />
                  <Badge variant="outline" className="text-xs">{STATUS_LABELS[entry.toStatus]}</Badge>
                </div>
              )}
              {entry.internalNotes && isAdmin && (
                <p className="text-muted-foreground italic">{entry.internalNotes}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function BuzonComunicacion() {
  const { user } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(user?.role ?? "");
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("mis-solicitudes");
  const [newRequestType, setNewRequestType] = useState<"QUEJA" | "FELICITACION" | "CAPACITACION" | "SUGERENCIA">("QUEJA");
  const [anonymityFlag, setAnonymityFlag] = useState(false);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [autofillEmployeeId, setAutofillEmployeeId] = useState<string | undefined>(undefined);
  const [autofillData, setAutofillData] = useState<EmployeeAutofillData | null>(null);

  const handleAutofillSelect = (data: EmployeeAutofillData | null) => {
    setAutofillData(data);
    setAutofillEmployeeId(data ? String(data.employeeId) : undefined);
    if (data) {
      toast({ title: "Datos prellenados", description: `Empleado: ${data.fullName}` });
    }
  };
  const [detailRequestId, setDetailRequestId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: listData, isLoading } = trpc.buzon.listRequests.useQuery({
    requestType: filterType as "QUEJA" | "FELICITACION" | "CAPACITACION" | "SUGERENCIA" | "ALL",
    status: filterStatus === "ALL" ? undefined : filterStatus,
    search: searchQuery || undefined,
    page: 1,
    pageSize: 50,
  });

  const { data: statsData } = trpc.buzon.getStats.useQuery(undefined, { enabled: isAdmin });

  const submitMutation = trpc.buzon.submitRequest.useMutation({
    onSuccess: (result) => {
      toast({ title: "Solicitud enviada", description: `Folio: ${result.folio}` });
      setNewRequestOpen(false);
    },
    onError: (e) => toast({ title: "Error al enviar", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = (type: typeof newRequestType) => (data: Record<string, unknown>) => {
    submitMutation.mutate({
      requestType: type,
      formPayload: JSON.stringify(data),
      anonymityFlag,
    });
  };

  const typeIcons: Record<string, React.ReactNode> = {
    QUEJA: <AlertTriangle className="h-4 w-4" />,
    FELICITACION: <Star className="h-4 w-4" />,
    CAPACITACION: <BookOpen className="h-4 w-4" />,
    SUGERENCIA: <Lightbulb className="h-4 w-4" />,
  };

  const typeColors: Record<string, string> = {
    QUEJA: "text-red-600",
    FELICITACION: "text-yellow-600",
    CAPACITACION: "text-blue-600",
    SUGERENCIA: "text-green-600",
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Cabecera */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Buzón de Comunicación Interna</h1>
          <p className="text-muted-foreground text-sm">Canal seguro para quejas, felicitaciones, solicitudes de capacitación y sugerencias</p>
        </div>
        <Dialog open={newRequestOpen} onOpenChange={setNewRequestOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Nueva Solicitud</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nueva Solicitud</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tipo de solicitud</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {(["QUEJA", "FELICITACION", "CAPACITACION", "SUGERENCIA"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setNewRequestType(t)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-colors ${newRequestType === t ? "border-primary bg-primary/10" : "border-border hover:bg-muted"}`}
                    >
                      <span className={typeColors[t]}>{typeIcons[t]}</span>
                      {t === "QUEJA" ? "Queja/Denuncia" : t === "FELICITACION" ? "Felicitación" : t === "CAPACITACION" ? "Solicitud DNC" : "Sugerencia"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <Switch checked={anonymityFlag} onCheckedChange={setAnonymityFlag} />
                <div>
                  <Label className="text-sm font-medium">Solicitar anonimato</Label>
                  <p className="text-xs text-muted-foreground">Tu nombre no será visible para el equipo de RH</p>
                </div>
              </div>
              {/* Prellenado de empleado (solo si no es anónimo) */}
              {!anonymityFlag && (
                <EmployeeAutofillSelector
                  onSelect={handleAutofillSelect}
                  value={autofillEmployeeId}
                  label="Prellenar datos del solicitante (opcional)"
                  helperText="Al seleccionar un empleado, sus datos quedarán asociados a la solicitud"
                />
              )}
              {newRequestType === "QUEJA" && <QuejaForm onSubmit={handleSubmit("QUEJA")} loading={submitMutation.isPending} />}
              {newRequestType === "FELICITACION" && <FelicitacionForm onSubmit={handleSubmit("FELICITACION")} loading={submitMutation.isPending} />}
              {newRequestType === "CAPACITACION" && <CapacitacionForm onSubmit={handleSubmit("CAPACITACION")} loading={submitMutation.isPending} />}
              {newRequestType === "SUGERENCIA" && <SugerenciaForm onSubmit={handleSubmit("SUGERENCIA")} loading={submitMutation.isPending} />}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas (solo admin) */}
      {isAdmin && statsData && (
        <div className="grid grid-cols-4 gap-4 mb-6">
          {statsData.byType.map((t) => (
            <Card key={t.requestType}>
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <span className={typeColors[t.requestType]}>{typeIcons[t.requestType]}</span>
                  <div>
                    <p className="text-2xl font-bold">{t.count}</p>
                    <p className="text-xs text-muted-foreground">{t.requestType === "QUEJA" ? "Quejas" : t.requestType === "FELICITACION" ? "Felicitaciones" : t.requestType === "CAPACITACION" ? "Solicitudes DNC" : "Sugerencias"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por folio..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los tipos</SelectItem>
            <SelectItem value="QUEJA">Quejas/Denuncias</SelectItem>
            <SelectItem value="FELICITACION">Felicitaciones</SelectItem>
            <SelectItem value="CAPACITACION">Solicitudes DNC</SelectItem>
            <SelectItem value="SUGERENCIA">Sugerencias</SelectItem>
          </SelectContent>
        </Select>
        {isAdmin && (
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Lista de solicitudes */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Cargando solicitudes...</div>
      ) : !listData?.requests.length ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No hay solicitudes registradas</p>
          <p className="text-sm text-muted-foreground">Usa el botón "Nueva Solicitud" para enviar una</p>
        </div>
      ) : (
        <div className="space-y-2">
          {listData.requests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => setDetailRequestId(req.id)}
            >
              <div className="flex items-center gap-3">
                <span className={typeColors[req.requestType]}>{typeIcons[req.requestType]}</span>
                <div>
                  <p className="font-mono text-sm font-medium">{req.publicFolio}</p>
                  <p className="text-xs text-muted-foreground">{new Date(req.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {req.anonymityFlag && <Badge variant="outline" className="text-xs">Anónimo</Badge>}
                <Badge className={`text-xs ${STATUS_COLORS[req.status]}`}>{STATUS_LABELS[req.status]}</Badge>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalle */}
      <Dialog open={detailRequestId !== null} onOpenChange={(open) => !open && setDetailRequestId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Solicitud</DialogTitle>
          </DialogHeader>
          {detailRequestId !== null && (
            <RequestDetailModal requestId={detailRequestId} isAdmin={isAdmin} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
