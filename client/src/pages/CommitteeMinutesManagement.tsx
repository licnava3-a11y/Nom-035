import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Edit, Trash2, Download, Eye, X, UserPlus, ClipboardList, CheckSquare, PenTool, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import SignatureCanvas from "@/components/SignatureCanvas";
import FileUpload from "@/components/FileUpload";
import ProtectedButton from "@/components/ProtectedButton";

// Tipos para secciones dinámicas
interface Attendee {
  name: string;
  position: string;
  role: string;
  attended: boolean;
  signatureUrl?: string;
}

interface AgendaItem {
  topic: string;
  description: string;
  presenter: string;
  duration: number;
}

interface Agreement {
  description: string;
  responsibleName: string;
  dueDate: string;
  priority: 'baja' | 'media' | 'alta' | 'urgente';
}

export default function CommitteeMinutesManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'borrador' | 'finalizada' | 'archivada'>('all');

  // Form state básico
  const [formData, setFormData] = useState({
    numeroSesion: "",
    tipoReunion: "reunion_ordinaria",
    fecha: "",
    hora: "",
    lugar: "",
    desarrollo: "",
    observaciones: "",
    status: "borrador" as 'borrador' | 'finalizada' | 'archivada',
  });

  // Estados para secciones dinámicas
  const [attendees, setAttendees] = useState<Attendee[]>([
    { name: "", position: "", role: "", attended: true }
  ]);

  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([
    { topic: "", description: "", presenter: "", duration: 0 }
  ]);

  const [agreements, setAgreements] = useState<Agreement[]>([
    { description: "", responsibleName: "", dueDate: "", priority: "media" }
  ]);

  // Estado para modal de firma
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [currentAttendeeIndex, setCurrentAttendeeIndex] = useState<number | null>(null);

  // Estado para documentación de respaldo
  const [documentation, setDocumentation] = useState({
    objective: "",
    results: "",
    groupPhotoUrl: "",
    attendanceListUrl: "",
  });

  // Queries
  const { data: minutesData, refetch } = trpc.committeeMinutes.list.useQuery({
    status: filterStatus,
  });

  // Mutations
  const createMutation = trpc.committeeMinutes.create.useMutation({
    onSuccess: () => {
      alert('Minuta creada exitosamente');
      refetch();
      resetForm();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.committeeMinutes.update.useMutation({
    onSuccess: () => {
      alert('Minuta actualizada exitosamente');
      refetch();
      resetForm();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.committeeMinutes.delete.useMutation({
    onSuccess: () => {
      alert('Minuta eliminada exitosamente');
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const publishMutation = trpc.committeeMinutes.publish.useMutation({
    onSuccess: () => {
      alert('Minuta publicada exitosamente');
      refetch();
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const generatePDFMutation = trpc.compliance.generateCommitteeMinutesPDF.useMutation({
    onSuccess: (data) => {
      const byteCharacters = atob(data.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Minuta_Comite_${data.data.folio}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
      alert('PDF generado exitosamente');
    },
    onError: (error) => {
      alert(`Error al generar PDF: ${error.message}`);
    },
  });

  const uploadSignatureMutation = trpc.committeeMinutes.uploadSignature.useMutation();

  // Funciones para manejar asistentes
  const addAttendee = () => {
    setAttendees([...attendees, { name: "", position: "", role: "", attended: true }]);
  };

  const removeAttendee = (index: number) => {
    setAttendees(attendees.filter((_, i) => i !== index));
  };

  const updateAttendee = (index: number, field: keyof Attendee, value: string | boolean) => {
    const updated = [...attendees];
    updated[index] = { ...updated[index], [field]: value };
    setAttendees(updated);
  };

  const handleSignatureSave = async (signatureDataUrl: string) => {
    if (currentAttendeeIndex === null) return;

    try {
      // signatureDataUrl ya es base64
      const base64data = signatureDataUrl;
      
      // Subir firma a S3
      const result = await uploadSignatureMutation.mutateAsync({ signatureDataUrl: base64data, attendeeName: attendees[currentAttendeeIndex].name });
      
      // Actualizar asistente con URL de firma
      updateAttendee(currentAttendeeIndex, 'signatureUrl', result.signatureUrl);
      
      // Cerrar modal
      setSignatureModalOpen(false);
      setCurrentAttendeeIndex(null);
      
      alert('Firma guardada exitosamente');
    } catch (error) {
      alert('Error al guardar firma');
      console.error(error);
    }
  };

  const openSignatureModal = (index: number) => {
    setCurrentAttendeeIndex(index);
    setSignatureModalOpen(true);
  };

  // Funciones para manejar orden del día
  const addAgendaItem = () => {
    setAgendaItems([...agendaItems, { topic: "", description: "", presenter: "", duration: 0 }]);
  };

  const removeAgendaItem = (index: number) => {
    setAgendaItems(agendaItems.filter((_, i) => i !== index));
  };

  const updateAgendaItem = (index: number, field: keyof AgendaItem, value: string | number) => {
    const updated = [...agendaItems];
    updated[index] = { ...updated[index], [field]: value };
    setAgendaItems(updated);
  };

  // Funciones para manejar acuerdos
  const addAgreement = () => {
    setAgreements([...agreements, { description: "", responsibleName: "", dueDate: "", priority: "media" }]);
  };

  const removeAgreement = (index: number) => {
    setAgreements(agreements.filter((_, i) => i !== index));
  };

  const updateAgreement = (index: number, field: keyof Agreement, value: string) => {
    const updated = [...agreements];
    updated[index] = { ...updated[index], [field]: value };
    setAgreements(updated);
  };

  const resetForm = () => {
    setFormData({
      numeroSesion: "",
      tipoReunion: "reunion_ordinaria",
      fecha: "",
      hora: "",
      lugar: "",
      desarrollo: "",
      observaciones: "",
      status: "borrador",
    });
    setAttendees([{ name: "", position: "", role: "", attended: true }]);
    setAgendaItems([{ topic: "", description: "", presenter: "", duration: 0 }]);
    setAgreements([{ description: "", responsibleName: "", dueDate: "", priority: "media" }]);
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const minuteData = {
      ...formData,
      attendees: attendees.filter(a => a.name.trim() !== "").map(a => ({
        nombre: a.name,
        cargo: a.position,
        rolComite: a.role,
        asistencia: (a.attended ? "presente" : "ausente") as "presente" | "ausente" | "justificado"
      })),
      agendaItems: agendaItems.filter(a => a.topic.trim() !== "").map((a, index) => ({
        orden: index + 1,
        tema: a.topic,
        descripcion: a.description
      })),
      agreements: agreements.filter(a => a.description.trim() !== "").map((a, index) => ({
        numero: index + 1,
        descripcion: a.description,
        responsable: a.responsibleName,
        fechaCompromiso: a.dueDate,
        estado: 'pendiente' as 'pendiente' | 'en_proceso' | 'completado' | 'cancelado'
      })),
    };

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...minuteData });
    } else {
      createMutation.mutate(minuteData);
    }
  };

  const handleEdit = (minute: any) => {
    setFormData({
      numeroSesion: minute.numeroSesion,
      tipoReunion: minute.tipoReunion,
      fecha: minute.fecha,
      hora: minute.hora,
      lugar: minute.lugar,
      desarrollo: minute.desarrollo || "",
      observaciones: minute.observaciones || "",
      status: minute.status,
    });
    setEditingId(minute.id);
    setShowForm(true);
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Está seguro de eliminar esta minuta?')) {
      deleteMutation.mutate({ id });
    }
  };

  const handlePublish = (id: number) => {
    if (confirm('¿Está seguro de publicar esta minuta? No podrá editarla después.')) {
      publishMutation.mutate({ id });
    }
  };

  const handleGeneratePDF = (id: number) => {
    generatePDFMutation.mutate({ minuteId: id });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Minutas de Comité</h1>
          <p className="text-muted-foreground">CRUD completo con borradores, historial y exportación PDF</p>
        </div>
        <ProtectedButton 
          onClick={() => setShowForm(!showForm)}
          requiredPermission="can_create"
          fallbackMessage="Solo los administradores pueden crear minutas"
          hideIfNoPermission
        >
          {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? "Cancelar" : "Nueva Minuta"}
        </ProtectedButton>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
            >
              Todas
            </Button>
            <Button 
              variant={filterStatus === 'borrador' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('borrador')}
            >
              Borradores
            </Button>
            <Button 
              variant={filterStatus === 'finalizada' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('finalizada')}
            >
              Finalizadas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Formulario */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar Minuta" : "Nueva Minuta"}</CardTitle>
            <CardDescription>Complete los datos de la minuta del comité</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Información Básica */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numeroSesion">Número de Sesión</Label>
                  <Input
                    id="numeroSesion"
                    value={formData.numeroSesion}
                    onChange={(e) => setFormData({ ...formData, numeroSesion: e.target.value })}
                    placeholder="S-001"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tipoReunion">Tipo de Reunión</Label>
                  <Select
                    value={formData.tipoReunion}
                    onValueChange={(value) => setFormData({ ...formData, tipoReunion: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reunion_ordinaria">Reunión Ordinaria</SelectItem>
                      <SelectItem value="reunion_extraordinaria">Reunión Extraordinaria</SelectItem>
                      <SelectItem value="junta_trabajo">Junta de Trabajo</SelectItem>
                      <SelectItem value="taller">Taller</SelectItem>
                      <SelectItem value="capacitacion">Capacitación</SelectItem>
                      <SelectItem value="seminario">Seminario</SelectItem>
                      <SelectItem value="foro">Foro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="hora">Hora</Label>
                  <Input
                    id="hora"
                    type="time"
                    value={formData.hora}
                    onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="lugar">Lugar</Label>
                  <Input
                    id="lugar"
                    value={formData.lugar}
                    onChange={(e) => setFormData({ ...formData, lugar: e.target.value })}
                    placeholder="Sala de Juntas Principal"
                    required
                  />
                </div>
              </div>

              {/* Sección de Asistentes */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Asistentes
                  </h3>
                  <ProtectedButton 
                    type="button" 
                    size="sm" 
                    onClick={addAttendee}
                    requiredPermission="can_edit"
                    fallbackMessage="No tienes permisos para agregar asistentes"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Asistente
                  </ProtectedButton>
                </div>
                {attendees.map((attendee, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label>Nombre Completo</Label>
                        <Input
                          value={attendee.name}
                          onChange={(e) => updateAttendee(index, 'name', e.target.value)}
                          placeholder="Juan Pérez García"
                        />
                      </div>
                      <div>
                        <Label>Cargo</Label>
                        <Input
                          value={attendee.position}
                          onChange={(e) => updateAttendee(index, 'position', e.target.value)}
                          placeholder="Director General"
                        />
                      </div>
                      <div>
                        <Label>Rol en Comité</Label>
                        <Input
                          value={attendee.role}
                          onChange={(e) => updateAttendee(index, 'role', e.target.value)}
                          placeholder="Presidente"
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={attendee.attended}
                            onChange={(e) => updateAttendee(index, 'attended', e.target.checked)}
                          />
                          Asistió
                        </label>
                        <div className="flex gap-2">
                          <ProtectedButton
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openSignatureModal(index)}
                            requiredPermission="can_edit"
                            fallbackMessage="No tienes permisos para capturar firmas"
                          >
                            <PenTool className="h-4 w-4 mr-1" />
                            {attendee.signatureUrl ? 'Ver Firma' : 'Capturar Firma'}
                          </ProtectedButton>
                          {attendees.length > 1 && (
                          <ProtectedButton
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeAttendee(index)}
                            requiredPermission="can_edit"
                            fallbackMessage="No tienes permisos para eliminar asistentes"
                          >
                            <Trash2 className="h-4 w-4" />
                          </ProtectedButton>
                          )}
                        </div>
                        {attendee.signatureUrl && (
                          <img 
                            src={attendee.signatureUrl} 
                            alt="Firma" 
                            className="w-32 h-16 border rounded object-contain bg-white"
                          />
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Sección de Orden del Día */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Orden del Día
                  </h3>
                  <ProtectedButton 
                    type="button" 
                    size="sm" 
                    onClick={addAgendaItem}
                    requiredPermission="can_edit"
                    fallbackMessage="No tienes permisos para agregar temas"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Tema
                  </ProtectedButton>
                </div>
                {agendaItems.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label>Tema</Label>
                        <Input
                          value={item.topic}
                          onChange={(e) => updateAgendaItem(index, 'topic', e.target.value)}
                          placeholder="Verificación de quórum"
                        />
                      </div>
                      <div>
                        <Label>Descripción</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateAgendaItem(index, 'description', e.target.value)}
                          placeholder="Confirmación de asistencia"
                        />
                      </div>
                      <div>
                        <Label>Presentador</Label>
                        <Input
                          value={item.presenter}
                          onChange={(e) => updateAgendaItem(index, 'presenter', e.target.value)}
                          placeholder="Juan Pérez"
                        />
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <Label>Duración (min)</Label>
                          <Input
                            type="number"
                            value={item.duration}
                            onChange={(e) => updateAgendaItem(index, 'duration', parseInt(e.target.value) || 0)}
                            placeholder="15"
                          />
                        </div>
                        {agendaItems.length > 1 && (
                          <ProtectedButton
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeAgendaItem(index)}
                            requiredPermission="can_edit"
                            fallbackMessage="No tienes permisos para eliminar temas"
                          >
                            <Trash2 className="h-4 w-4" />
                          </ProtectedButton>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Sección de Acuerdos */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckSquare className="h-5 w-5" />
                    Acuerdos
                  </h3>
                  <ProtectedButton 
                    type="button" 
                    size="sm" 
                    onClick={addAgreement}
                    requiredPermission="can_edit"
                    fallbackMessage="No tienes permisos para agregar acuerdos"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar Acuerdo
                  </ProtectedButton>
                </div>
                {agreements.map((agreement, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <Label>Descripción del Acuerdo</Label>
                        <Textarea
                          value={agreement.description}
                          onChange={(e) => updateAgreement(index, 'description', e.target.value)}
                          placeholder="Implementar programa de capacitación..."
                          rows={2}
                        />
                      </div>
                      <div>
                        <Label>Responsable</Label>
                        <Input
                          value={agreement.responsibleName}
                          onChange={(e) => updateAgreement(index, 'responsibleName', e.target.value)}
                          placeholder="María López"
                        />
                      </div>
                      <div>
                        <Label>Fecha de Cumplimiento</Label>
                        <Input
                          type="date"
                          value={agreement.dueDate}
                          onChange={(e) => updateAgreement(index, 'dueDate', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Prioridad</Label>
                        <Select
                          value={agreement.priority}
                          onValueChange={(value) => updateAgreement(index, 'priority', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="baja">Baja</SelectItem>
                            <SelectItem value="media">Media</SelectItem>
                            <SelectItem value="alta">Alta</SelectItem>
                            <SelectItem value="urgente">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3"></div>
                      <div className="flex justify-end">
                        {agreements.length > 1 && (
                          <ProtectedButton
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeAgreement(index)}
                            requiredPermission="can_edit"
                            fallbackMessage="No tienes permisos para eliminar acuerdos"
                          >
                            <Trash2 className="h-4 w-4" />
                          </ProtectedButton>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Sección de Documentación de Respaldo */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Documentación de Respaldo
                </h3>
                <Card className="p-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <Label htmlFor="objective">Objetivo de la Actividad</Label>
                      <Textarea
                        id="objective"
                        value={documentation.objective}
                        onChange={(e) => setDocumentation({ ...documentation, objective: e.target.value })}
                        placeholder="Describir el objetivo principal de la reunión..."
                        rows={2}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="results">Resultados Obtenidos</Label>
                      <Textarea
                        id="results"
                        value={documentation.results}
                        onChange={(e) => setDocumentation({ ...documentation, results: e.target.value })}
                        placeholder="Describir los resultados alcanzados en la reunión..."
                        rows={2}
                      />
                    </div>
                    <div>
                      <Label>Foto Grupal</Label>
                      <FileUpload
                        label="Foto Grupal"
                        accept="image/*"
                        onFileSelect={(file) => {
                          // TODO: Implementar subida a S3
                          console.log('File selected:', file);
                        }}
                        currentFileUrl={documentation.groupPhotoUrl}
                      />
                    </div>
                    <div>
                      <Label>Lista de Asistencia (PDF)</Label>
                      <FileUpload
                        label="Lista de Asistencia"
                        accept="application/pdf"
                        onFileSelect={(file) => {
                          // TODO: Implementar subida a S3
                          console.log('File selected:', file);
                        }}
                        currentFileUrl={documentation.attendanceListUrl}
                      />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Desarrollo y Observaciones */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="desarrollo">Desarrollo de la Reunión</Label>
                  <Textarea
                    id="desarrollo"
                    value={formData.desarrollo}
                    onChange={(e) => setFormData({ ...formData, desarrollo: e.target.value })}
                    placeholder="Descripción del desarrollo de la reunión..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    value={formData.observaciones}
                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                    placeholder="Observaciones adicionales..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-4">
                <ProtectedButton 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  requiredPermissions={["can_create", "can_edit"]}
                  requireAll={false}
                  fallbackMessage="No tienes permisos para guardar minutas"
                >
                  {editingId ? "Actualizar" : "Guardar"} Borrador
                </ProtectedButton>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de Minutas */}
      <Card>
        <CardHeader>
          <CardTitle>Minutas Registradas</CardTitle>
          <CardDescription>
            {minutesData?.minutes?.length || 0} minutas encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {minutesData?.minutes && minutesData.minutes.length > 0 ? (
              minutesData.minutes.map((minute: any) => (
                <Card key={minute.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{minute.numeroSesion} - {minute.tipoReunion}</h3>
                      <p className="text-sm text-muted-foreground">
                        {minute.fecha} a las {minute.hora} - {minute.lugar}
                      </p>
                      <p className="text-sm mt-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          minute.status === 'published' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {minute.status === 'published' ? 'Publicada' : 'Borrador'}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {minute.status === 'draft' && (
                        <>
                          <ProtectedButton 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleEdit(minute)}
                            requiredPermission="can_edit"
                            fallbackMessage="No tienes permisos para editar minutas"
                          >
                            <Edit className="h-4 w-4" />
                          </ProtectedButton>
                          <ProtectedButton 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handlePublish(minute.id)}
                            requiredPermission="can_approve"
                            fallbackMessage="No tienes permisos para publicar minutas"
                          >
                            <Eye className="h-4 w-4" />
                          </ProtectedButton>
                        </>
                      )}
                      <ProtectedButton 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleGeneratePDF(minute.id)}
                        requiredPermission="can_export"
                        fallbackMessage="No tienes permisos para descargar PDFs"
                      >
                        <Download className="h-4 w-4" />
                      </ProtectedButton>
                      {minute.status === 'draft' && (
                        <ProtectedButton 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => handleDelete(minute.id)}
                          requiredPermission="can_delete"
                          fallbackMessage="No tienes permisos para eliminar minutas"
                        >
                          <Trash2 className="h-4 w-4" />
                        </ProtectedButton>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No hay minutas registradas. Cree una nueva minuta para comenzar.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Firma Digital */}
      <Dialog open={signatureModalOpen} onOpenChange={setSignatureModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Capturar Firma Digital</DialogTitle>
            <DialogDescription>
              {currentAttendeeIndex !== null && attendees[currentAttendeeIndex] && (
                <span>Firma para: <strong>{attendees[currentAttendeeIndex].name || 'Asistente'}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>
          <SignatureCanvas onSave={handleSignatureSave} onCancel={() => setSignatureModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
