import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Users, CalendarDays, ClipboardList, PenLine, Plus, Pencil,
  Trash2, FileText, CheckCircle2, Clock, AlertTriangle, RefreshCw,
  Download, UserCheck,
} from "lucide-react";
import SignatureCanvas from "./SignatureCanvas";

// ─── Helpers ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  presidente: "Presidente",
  secretario: "Secretario",
  vocal: "Vocal",
  suplente: "Suplente",
  asesor_externo: "Asesor Externo",
};

const ROLE_COLORS: Record<string, string> = {
  presidente: "bg-blue-100 text-blue-800",
  secretario: "bg-purple-100 text-purple-800",
  vocal: "bg-green-100 text-green-800",
  suplente: "bg-yellow-100 text-yellow-800",
  asesor_externo: "bg-gray-100 text-gray-700",
};

const STATUS_LABELS: Record<string, string> = {
  convocada: "Convocada",
  en_curso: "En Curso",
  celebrada: "Celebrada",
  cancelada: "Cancelada",
  reprogramada: "Reprogramada",
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  cumplido: "Cumplido",
  vencido: "Vencido",
};

const STATUS_COLORS: Record<string, string> = {
  convocada: "bg-blue-100 text-blue-800",
  en_curso: "bg-yellow-100 text-yellow-800",
  celebrada: "bg-green-100 text-green-800",
  cancelada: "bg-red-100 text-red-800",
  reprogramada: "bg-orange-100 text-orange-800",
  pendiente: "bg-yellow-100 text-yellow-800",
  en_proceso: "bg-blue-100 text-blue-800",
  cumplido: "bg-green-100 text-green-800",
  vencido: "bg-red-100 text-red-800",
};

const PRIORITY_COLORS: Record<string, string> = {
  alta: "text-red-600 font-bold",
  media: "text-yellow-600 font-semibold",
  baja: "text-green-600",
};

// ─── Componente Principal ────────────────────────────────────────────────────

export default function CommitteeModule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("members");
  const [search, setSearch] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState<number | null>(null);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [showAgreementDialog, setShowAgreementDialog] = useState(false);
  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [editingMeeting, setEditingMeeting] = useState<any>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const statsQuery = trpc.committeeModule.getStats.useQuery({});
  const membersQuery = trpc.committeeModule.listMembers.useQuery({ activeOnly: false, search: search || undefined });
  const meetingsQuery = trpc.committeeModule.listMeetings.useQuery({ limit: 20, offset: 0 });
  const agreementsQuery = trpc.committeeModule.listAgreements.useQuery(
    selectedMeeting ? { meetingId: selectedMeeting } : {}
  );
  const meetingDetailQuery = trpc.committeeModule.getMeeting.useQuery(
    { id: selectedMeeting! },
    { enabled: !!selectedMeeting }
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const utils = trpc.useUtils();
  const invalidateAll = () => {
    utils.committeeModule.listMembers.invalidate();
    utils.committeeModule.listMeetings.invalidate();
    utils.committeeModule.getStats.invalidate();
    utils.committeeModule.listAgreements.invalidate();
  };

  const addMemberMut = trpc.committeeModule.addMember.useMutation({
    onSuccess: () => { invalidateAll(); setShowMemberDialog(false); toast({ title: "Integrante agregado" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateMemberMut = trpc.committeeModule.updateMember.useMutation({
    onSuccess: () => { invalidateAll(); setShowMemberDialog(false); setEditingMember(null); toast({ title: "Integrante actualizado" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const deleteMemberMut = trpc.committeeModule.deleteMember.useMutation({
    onSuccess: () => { invalidateAll(); toast({ title: "Integrante dado de baja" }); },
  });
  const createMeetingMut = trpc.committeeModule.createMeeting.useMutation({
    onSuccess: () => { invalidateAll(); setShowMeetingDialog(false); toast({ title: "Reunión creada" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateMeetingMut = trpc.committeeModule.updateMeeting.useMutation({
    onSuccess: () => { invalidateAll(); setShowMeetingDialog(false); setEditingMeeting(null); toast({ title: "Reunión actualizada" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const addAgreementMut = trpc.committeeModule.addAgreement.useMutation({
    onSuccess: () => { invalidateAll(); setShowAgreementDialog(false); toast({ title: "Acuerdo registrado" }); },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const updateAgreementMut = trpc.committeeModule.updateAgreement.useMutation({
    onSuccess: () => { invalidateAll(); toast({ title: "Acuerdo actualizado" }); },
  });
  const generateActaMut = trpc.committeeModule.generateActaPdf.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast({ title: "Acta generada", description: "El PDF se abrió en una nueva pestaña" });
    },
    onError: (e) => toast({ title: "Error al generar acta", description: e.message, variant: "destructive" }),
  });

  const stats = statsQuery.data;

  // ── Formulario de Integrante ──────────────────────────────────────────────
  const [memberForm, setMemberForm] = useState({
    employeeName: "", employeeEmail: "", position: "", department: "",
    role: "vocal" as const, startDate: "", endDate: "", notes: "",
  });

  const handleMemberSubmit = () => {
    if (editingMember) {
      updateMemberMut.mutate({ id: editingMember.id, ...memberForm });
    } else {
      addMemberMut.mutate(memberForm);
    }
  };

  const openEditMember = (m: any) => {
    setEditingMember(m);
    setMemberForm({
      employeeName: m.employeeName, employeeEmail: m.employeeEmail ?? "",
      position: m.position ?? "", department: m.department ?? "",
      role: m.role, startDate: m.startDate ? m.startDate.split("T")[0] : "",
      endDate: m.endDate ? m.endDate.split("T")[0] : "", notes: m.notes ?? "",
    });
    setShowMemberDialog(true);
  };

  // ── Formulario de Reunión ─────────────────────────────────────────────────
  const [meetingForm, setMeetingForm] = useState({
    title: "", meetingType: "ordinaria" as const, scheduledAt: "",
    location: "", agenda: "", status: "convocada" as const, minutesContent: "",
    attendeesJson: "", quorumReached: false,
  });

  const handleMeetingSubmit = () => {
    if (editingMeeting) {
      updateMeetingMut.mutate({ id: editingMeeting.id, ...meetingForm });
    } else {
      createMeetingMut.mutate(meetingForm);
    }
  };

  const openEditMeeting = (m: any) => {
    setEditingMeeting(m);
    setMeetingForm({
      title: m.title, meetingType: m.meetingType, location: m.location ?? "",
      agenda: m.agenda ?? "", status: m.status, minutesContent: m.minutesContent ?? "",
      attendeesJson: m.attendeesJson ?? "", quorumReached: m.quorumReached ?? false,
      scheduledAt: m.scheduledAt ? new Date(m.scheduledAt).toISOString().slice(0, 16) : "",
    });
    setShowMeetingDialog(true);
  };

  // ── Formulario de Acuerdo ─────────────────────────────────────────────────
  const [agreementForm, setAgreementForm] = useState({
    description: "", responsible: "", dueDate: "", priority: "media" as const,
  });

  const handleAgreementSubmit = () => {
    if (!selectedMeeting) return;
    addAgreementMut.mutate({ meetingId: selectedMeeting, ...agreementForm });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Comité NOM-035 STPS</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de integrantes, reuniones, actas y acuerdos</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => invalidateAll()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Actualizar
        </Button>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg"><Users className="w-5 h-5 text-blue-600" /></div>
              <div><div className="text-2xl font-bold">{stats.activeMembers}</div><div className="text-xs text-gray-500">Integrantes activos</div></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg"><CalendarDays className="w-5 h-5 text-purple-600" /></div>
              <div><div className="text-2xl font-bold">{stats.totalMeetings}</div><div className="text-xs text-gray-500">Reuniones totales</div></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg"><Clock className="w-5 h-5 text-yellow-600" /></div>
              <div><div className="text-2xl font-bold">{stats.pendingAgreements}</div><div className="text-xs text-gray-500">Acuerdos pendientes</div></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="w-5 h-5 text-green-600" /></div>
              <div><div className="text-2xl font-bold">{stats.completedAgreements}</div><div className="text-xs text-gray-500">Acuerdos cumplidos</div></div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="members"><Users className="w-4 h-4 mr-1" />Integrantes</TabsTrigger>
          <TabsTrigger value="meetings"><CalendarDays className="w-4 h-4 mr-1" />Reuniones</TabsTrigger>
          <TabsTrigger value="agreements"><ClipboardList className="w-4 h-4 mr-1" />Acuerdos</TabsTrigger>
          <TabsTrigger value="signatures"><PenLine className="w-4 h-4 mr-1" />Firmas</TabsTrigger>
        </TabsList>

        {/* ── Tab Integrantes ── */}
        <TabsContent value="members" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Input
              placeholder="Buscar integrante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Button onClick={() => { setEditingMember(null); setMemberForm({ employeeName: "", employeeEmail: "", position: "", department: "", role: "vocal", startDate: "", endDate: "", notes: "" }); setShowMemberDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Agregar Integrante
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Nombre</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Cargo</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Departamento</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Rol en Comité</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                      <th className="px-4 py-3 text-left font-medium text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {membersQuery.data?.map((m) => (
                      <tr key={m.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium">{m.employeeName}</div>
                          {m.employeeEmail && <div className="text-xs text-gray-400">{m.employeeEmail}</div>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{m.position ?? "-"}</td>
                        <td className="px-4 py-3 text-gray-600">{m.department ?? "-"}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[m.role] ?? ""}`}>
                            {ROLE_LABELS[m.role] ?? m.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${m.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                            {m.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-4 py-3 flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openEditMember(m)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteMemberMut.mutate({ id: m.id })}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {!membersQuery.isLoading && !membersQuery.data?.length && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No hay integrantes registrados</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab Reuniones ── */}
        <TabsContent value="meetings" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">{meetingsQuery.data?.total ?? 0} reuniones registradas</p>
            <Button onClick={() => { setEditingMeeting(null); setMeetingForm({ title: "", meetingType: "ordinaria", scheduledAt: "", location: "", agenda: "", status: "convocada", minutesContent: "", attendeesJson: "", quorumReached: false }); setShowMeetingDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Nueva Reunión
            </Button>
          </div>
          <div className="space-y-3">
            {meetingsQuery.data?.meetings.map((m) => (
              <Card key={m.id} className={`cursor-pointer transition-all ${selectedMeeting === m.id ? "ring-2 ring-blue-500" : ""}`}
                onClick={() => { setSelectedMeeting(m.id); setActiveTab("agreements"); }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-xs text-gray-400">{m.folio}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[m.status] ?? ""}`}>
                          {STATUS_LABELS[m.status] ?? m.status}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                          {m.meetingType.toUpperCase()}
                        </span>
                      </div>
                      <div className="font-semibold text-gray-900">{m.title}</div>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(m.scheduledAt).toLocaleString("es-MX")}
                        {m.location && <span className="ml-2">📍 {m.location}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 ml-3">
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEditMeeting(m); }}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); generateActaMut.mutate({ meetingId: m.id }); }}>
                        <FileText className="w-4 h-4 text-blue-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!meetingsQuery.isLoading && !meetingsQuery.data?.meetings.length && (
              <div className="text-center py-12 text-gray-400">No hay reuniones registradas</div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab Acuerdos ── */}
        <TabsContent value="agreements" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Select value={selectedMeeting?.toString() ?? ""} onValueChange={(v) => setSelectedMeeting(Number(v))}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Seleccionar reunión..." />
                </SelectTrigger>
                <SelectContent>
                  {meetingsQuery.data?.meetings.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.folio} — {m.title.substring(0, 40)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={!selectedMeeting} onClick={() => { setAgreementForm({ description: "", responsible: "", dueDate: "", priority: "media" }); setShowAgreementDialog(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Nuevo Acuerdo
            </Button>
          </div>
          {!selectedMeeting && (
            <div className="text-center py-12 text-gray-400">Selecciona una reunión para ver sus acuerdos</div>
          )}
          {selectedMeeting && (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Folio</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Descripción</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Responsable</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Fecha Límite</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Prioridad</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Estado</th>
                        <th className="px-4 py-3 text-left font-medium text-gray-600">Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agreementsQuery.data?.map((a) => (
                        <tr key={a.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs text-gray-400">{a.folio ?? "-"}</td>
                          <td className="px-4 py-3 max-w-xs">
                            <div className="line-clamp-2">{a.description}</div>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{a.responsible ?? "-"}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {a.dueDate ? new Date(a.dueDate).toLocaleDateString("es-MX") : "-"}
                          </td>
                          <td className={`px-4 py-3 ${PRIORITY_COLORS[a.priority] ?? ""}`}>
                            {a.priority.toUpperCase()}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[a.status] ?? ""}`}>
                              {STATUS_LABELS[a.status] ?? a.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {a.status !== "cumplido" && (
                              <Button variant="ghost" size="sm" className="text-green-600"
                                onClick={() => updateAgreementMut.mutate({ id: a.id, status: "cumplido" })}>
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {!agreementsQuery.isLoading && !agreementsQuery.data?.length && (
                        <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">Sin acuerdos para esta reunión</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab Firmas ── */}
        <TabsContent value="signatures" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Select value={selectedMeeting?.toString() ?? ""} onValueChange={(v) => setSelectedMeeting(Number(v))}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Seleccionar reunión..." />
              </SelectTrigger>
              <SelectContent>
                {meetingsQuery.data?.meetings.map((m) => (
                  <SelectItem key={m.id} value={m.id.toString()}>{m.folio} — {m.title.substring(0, 40)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button disabled={!selectedMeeting} onClick={() => setShowSignatureDialog(true)}>
              <PenLine className="w-4 h-4 mr-2" /> Registrar Firma
            </Button>
          </div>
          {selectedMeeting && meetingDetailQuery.data && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {meetingDetailQuery.data.signatures.map((s) => (
                <Card key={s.id}>
                  <CardContent className="p-4 text-center">
                    {s.signatureImageUrl ? (
                      <img src={s.signatureImageUrl} alt="Firma" className="max-h-20 mx-auto object-contain border rounded mb-2" />
                    ) : (
                      <div className="h-20 border-b border-gray-300 mb-2" />
                    )}
                    <div className="font-semibold text-sm">{s.signerName}</div>
                    <div className="text-xs text-gray-500">{s.signerRole}</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(s.signedAt).toLocaleString("es-MX")}
                    </div>
                    {s.signatureHash && (
                      <div className="text-xs text-gray-300 mt-1 truncate" title={s.signatureHash}>
                        SHA: {s.signatureHash.substring(0, 12)}...
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {!meetingDetailQuery.data.signatures.length && (
                <div className="col-span-3 text-center py-12 text-gray-400">No hay firmas registradas para esta reunión</div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Diálogo Integrante ── */}
      <Dialog open={showMemberDialog} onOpenChange={setShowMemberDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingMember ? "Editar Integrante" : "Agregar Integrante"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nombre completo *</Label>
                <Input value={memberForm.employeeName} onChange={(e) => setMemberForm(f => ({ ...f, employeeName: e.target.value }))} />
              </div>
              <div>
                <Label>Correo electrónico</Label>
                <Input type="email" value={memberForm.employeeEmail} onChange={(e) => setMemberForm(f => ({ ...f, employeeEmail: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cargo/Puesto</Label>
                <Input value={memberForm.position} onChange={(e) => setMemberForm(f => ({ ...f, position: e.target.value }))} />
              </div>
              <div>
                <Label>Departamento</Label>
                <Input value={memberForm.department} onChange={(e) => setMemberForm(f => ({ ...f, department: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Rol en el Comité</Label>
              <Select value={memberForm.role} onValueChange={(v: any) => setMemberForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Fecha de inicio</Label>
                <Input type="date" value={memberForm.startDate} onChange={(e) => setMemberForm(f => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <Label>Fecha de término</Label>
                <Input type="date" value={memberForm.endDate} onChange={(e) => setMemberForm(f => ({ ...f, endDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea value={memberForm.notes} onChange={(e) => setMemberForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMemberDialog(false)}>Cancelar</Button>
            <Button onClick={handleMemberSubmit} disabled={addMemberMut.isPending || updateMemberMut.isPending}>
              {editingMember ? "Guardar cambios" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo Reunión ── */}
      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMeeting ? "Editar Reunión" : "Nueva Reunión"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Título *</Label>
              <Input value={meetingForm.title} onChange={(e) => setMeetingForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tipo de reunión</Label>
                <Select value={meetingForm.meetingType} onValueChange={(v: any) => setMeetingForm(f => ({ ...f, meetingType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ordinaria">Ordinaria</SelectItem>
                    <SelectItem value="extraordinaria">Extraordinaria</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Estado</Label>
                <Select value={meetingForm.status} onValueChange={(v: any) => setMeetingForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="convocada">Convocada</SelectItem>
                    <SelectItem value="en_curso">En Curso</SelectItem>
                    <SelectItem value="celebrada">Celebrada</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="reprogramada">Reprogramada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha y hora *</Label>
                <Input type="datetime-local" value={meetingForm.scheduledAt} onChange={(e) => setMeetingForm(f => ({ ...f, scheduledAt: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Lugar</Label>
              <Input value={meetingForm.location} onChange={(e) => setMeetingForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <Label>Orden del día</Label>
              <Textarea value={meetingForm.agenda} onChange={(e) => setMeetingForm(f => ({ ...f, agenda: e.target.value }))} rows={3} placeholder="1. Bienvenida&#10;2. Revisión de acuerdos anteriores&#10;3. ..." />
            </div>
            {editingMeeting && (
              <>
                <div>
                  <Label>Desarrollo de la sesión (acta)</Label>
                  <Textarea value={meetingForm.minutesContent} onChange={(e) => setMeetingForm(f => ({ ...f, minutesContent: e.target.value }))} rows={4} />
                </div>
                <div>
                  <Label>Lista de asistentes (separados por coma)</Label>
                  <Input value={meetingForm.attendeesJson} onChange={(e) => setMeetingForm(f => ({ ...f, attendeesJson: e.target.value }))} placeholder="Juan Pérez, María García, ..." />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeetingDialog(false)}>Cancelar</Button>
            <Button onClick={handleMeetingSubmit} disabled={createMeetingMut.isPending || updateMeetingMut.isPending}>
              {editingMeeting ? "Guardar cambios" : "Crear reunión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo Acuerdo ── */}
      <Dialog open={showAgreementDialog} onOpenChange={setShowAgreementDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nuevo Acuerdo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Descripción del acuerdo *</Label>
              <Textarea value={agreementForm.description} onChange={(e) => setAgreementForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Responsable</Label>
                <Input value={agreementForm.responsible} onChange={(e) => setAgreementForm(f => ({ ...f, responsible: e.target.value }))} />
              </div>
              <div>
                <Label>Fecha límite</Label>
                <Input type="date" value={agreementForm.dueDate} onChange={(e) => setAgreementForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Prioridad</Label>
              <Select value={agreementForm.priority} onValueChange={(v: any) => setAgreementForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAgreementDialog(false)}>Cancelar</Button>
            <Button onClick={handleAgreementSubmit} disabled={addAgreementMut.isPending}>Registrar acuerdo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo Firma Digital ── */}
      {showSignatureDialog && selectedMeeting && (
        <SignatureCanvas
          meetingId={selectedMeeting}
          onClose={() => setShowSignatureDialog(false)}
          onSaved={() => {
            setShowSignatureDialog(false);
            utils.committeeModule.getMeeting.invalidate({ id: selectedMeeting });
            toast({ title: "Firma registrada exitosamente" });
          }}
        />
      )}
    </div>
  );
}
