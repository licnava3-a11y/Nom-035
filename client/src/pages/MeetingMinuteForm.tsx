import { useState, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  Trash2,
  X,
  Users,
  Mail,
  Search,
  CheckSquare,
  Square,
  Info,
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";

interface Participant {
  name: string;
  curp: string;
  ine: string;
  role: string;
}

export default function MeetingMinuteForm() {
  const [, setLocation] = useLocation();
  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState("reunion");
  const [meetingDate, setMeetingDate] = useState("");
  const [location, setLocationField] = useState("");
  const [agenda, setAgenda] = useState("");
  const [observations, setObservations] = useState("");
  const [agreements, setAgreements] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [groupPhoto, setGroupPhoto] = useState<File | null>(null);

  // Destinatarios
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<number>>(
    new Set()
  );
  const [recipientSearch, setRecipientSearch] = useState("");

  const signatureRef = useRef<SignatureCanvas>(null);

  const { data: allRecipients = [] } = trpc.minuteRecipients.list.useQuery(
    { onlyActive: true },
    { staleTime: 60_000 }
  );

  const filteredRecipients = useMemo(() => {
    if (!recipientSearch.trim()) return allRecipients;
    const term = recipientSearch.toLowerCase();
    return allRecipients.filter(
      r =>
        r.name.toLowerCase().includes(term) ||
        r.email.toLowerCase().includes(term) ||
        r.position.toLowerCase().includes(term) ||
        (r.department ?? "").toLowerCase().includes(term)
    );
  }, [allRecipients, recipientSearch]);

  const createMutation = trpc.meetingMinutes.create.useMutation({
    onSuccess: async data => {
      // Si hay destinatarios seleccionados, vincularlos
      if (selectedRecipientIds.size > 0) {
        try {
          await addRecipientsMutation.mutateAsync({
            minuteId: data.id,
            recipientIds: Array.from(selectedRecipientIds),
          });
        } catch {
          // No bloquear el flujo si falla el vínculo
        }
      }
      toast.success("Minuta creada exitosamente");
      setLocation("/meeting-minutes");
    },
    onError: error => {
      toast.error(`Error al crear minuta: ${error.message}`);
    },
  });

  const addRecipientsMutation = trpc.meetingMinutes.addRecipients.useMutation();

  const toggleRecipient = (id: number) => {
    setSelectedRecipientIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () =>
    setSelectedRecipientIds(new Set(filteredRecipients.map(r => r.id)));
  const clearAll = () => setSelectedRecipientIds(new Set());

  const addParticipant = () =>
    setParticipants([
      ...participants,
      { name: "", curp: "", ine: "", role: "" },
    ]);
  const removeParticipant = (index: number) =>
    setParticipants(participants.filter((_, i) => i !== index));
  const updateParticipant = (
    index: number,
    field: keyof Participant,
    value: string
  ) => {
    const updated = [...participants];
    updated[index][field] = value;
    setParticipants(updated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files)
      setAttachments([...attachments, ...Array.from(e.target.files)]);
  };
  const handleGroupPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setGroupPhoto(e.target.files[0]);
  };
  const removeAttachment = (index: number) =>
    setAttachments(attachments.filter((_, i) => i !== index));
  const clearSignature = () => signatureRef.current?.clear();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !meetingDate || !agenda) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }
    if (participants.length === 0) {
      toast.error("Debes agregar al menos un participante");
      return;
    }
    const signature = signatureRef.current?.toDataURL();
    if (!signature || signatureRef.current?.isEmpty()) {
      toast.error("Por favor firma la minuta");
      return;
    }
    createMutation.mutate({
      title,
      meetingType,
      meetingDate: new Date(meetingDate).toISOString(),
      location,
      agenda,
      observations,
      agreements,
      participants: participants.map(p => ({
        name: p.name,
        curp: p.curp,
        ineNumber: p.ine,
        role: p.role,
      })),
    });
  };

  return (
    <div className="container mx-auto py-6">
      <Button
        variant="ghost"
        onClick={() => setLocation("/meeting-minutes")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Volver a Minutas
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Nueva Minuta de Reunión</CardTitle>
          <CardDescription>
            Complete todos los campos para crear una nueva minuta con foliado
            automático y código QR único (NOM-151)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información General */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Información General</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título de la Minuta *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Ej: Reunión de Comité de Seguridad"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetingType">Tipo de Reunión *</Label>
                  <select
                    id="meetingType"
                    value={meetingType}
                    onChange={e => setMeetingType(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
                    required
                  >
                    <option value="reunion">Reunión</option>
                    <option value="junta">Junta de Trabajo</option>
                    <option value="taller">Taller</option>
                    <option value="capacitacion">Capacitación</option>
                    <option value="seminario">Seminario</option>
                    <option value="foro">Foro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="meetingDate">Fecha de Reunión *</Label>
                  <Input
                    id="meetingDate"
                    type="date"
                    value={meetingDate}
                    onChange={e => setMeetingDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Lugar</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={e => setLocationField(e.target.value)}
                    placeholder="Ej: Sala de Juntas"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="agenda">Agenda/Orden del Día *</Label>
                <Textarea
                  id="agenda"
                  value={agenda}
                  onChange={e => setAgenda(e.target.value)}
                  placeholder="Describe la agenda y orden del día de la reunión"
                  rows={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="observations">Observaciones</Label>
                <Textarea
                  id="observations"
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  placeholder="Observaciones adicionales"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agreements">Acuerdos y Compromisos</Label>
                <Textarea
                  id="agreements"
                  value={agreements}
                  onChange={e => setAgreements(e.target.value)}
                  placeholder="Lista los acuerdos y compromisos establecidos"
                  rows={4}
                />
              </div>
            </div>

            {/* Destinatarios */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Destinatarios de la Minuta
                    {selectedRecipientIds.size > 0 && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                        {selectedRecipientIds.size} seleccionado
                        {selectedRecipientIds.size !== 1 ? "s" : ""}
                      </Badge>
                    )}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Selecciona a quiénes se enviará esta minuta para
                    trazabilidad documental
                  </p>
                </div>
              </div>

              {allRecipients.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">
                    No hay destinatarios en el catálogo
                  </p>
                  <p className="text-xs mt-1">
                    Agrega destinatarios en{" "}
                    <strong>Comité → Catálogo de Destinatarios</strong> antes de
                    crear la minuta.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border bg-card overflow-hidden">
                  {/* Barra de búsqueda y acciones */}
                  <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar destinatario..."
                        value={recipientSearch}
                        onChange={e => setRecipientSearch(e.target.value)}
                        className="pl-8 h-8 text-sm"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={selectAll}
                      className="text-xs gap-1 h-8"
                    >
                      <CheckSquare className="h-3.5 w-3.5" />
                      Todos
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAll}
                      className="text-xs gap-1 h-8"
                    >
                      <Square className="h-3.5 w-3.5" />
                      Ninguno
                    </Button>
                  </div>
                  {/* Lista de destinatarios */}
                  <div className="max-h-64 overflow-y-auto divide-y">
                    {filteredRecipients.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No se encontraron destinatarios con ese criterio.
                      </div>
                    ) : (
                      filteredRecipients.map(recipient => {
                        const selected = selectedRecipientIds.has(recipient.id);
                        return (
                          <button
                            key={recipient.id}
                            type="button"
                            onClick={() => toggleRecipient(recipient.id)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted/50 ${selected ? "bg-primary/5" : ""}`}
                          >
                            <div
                              className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors ${selected ? "bg-primary border-primary" : "border-muted-foreground/30"}`}
                            >
                              {selected && (
                                <svg
                                  className="h-2.5 w-2.5 text-primary-foreground"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {recipient.name}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {recipient.email}
                                </span>
                                {recipient.department && (
                                  <span>· {recipient.department}</span>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {recipient.position}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                  {/* Pie con resumen */}
                  {selectedRecipientIds.size > 0 && (
                    <div className="px-4 py-2 border-t bg-primary/5 flex items-center gap-2">
                      <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                      <p className="text-xs text-primary">
                        {selectedRecipientIds.size} destinatario
                        {selectedRecipientIds.size !== 1 ? "s" : ""} recibirán
                        esta minuta al crearla.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Participantes */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Participantes *</h3>
                <Button type="button" onClick={addParticipant} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Participante
                </Button>
              </div>
              {participants.map((participant, index) => (
                <Card key={index} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre Completo *</Label>
                      <Input
                        value={participant.name}
                        onChange={e =>
                          updateParticipant(index, "name", e.target.value)
                        }
                        placeholder="Nombre completo"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CURP *</Label>
                      <Input
                        value={participant.curp}
                        onChange={e =>
                          updateParticipant(index, "curp", e.target.value)
                        }
                        placeholder="CURP de 18 caracteres"
                        maxLength={18}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>INE/IFE *</Label>
                      <Input
                        value={participant.ine}
                        onChange={e =>
                          updateParticipant(index, "ine", e.target.value)
                        }
                        placeholder="Número de INE"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rol/Cargo *</Label>
                      <Input
                        value={participant.role}
                        onChange={e =>
                          updateParticipant(index, "role", e.target.value)
                        }
                        placeholder="Ej: Presidente del Comité"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeParticipant(index)}
                    className="mt-4"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar Participante
                  </Button>
                </Card>
              ))}
              {participants.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay participantes agregados. Haz clic en "Agregar
                  Participante" para comenzar.
                </p>
              )}
            </div>

            {/* Evidencia Fotográfica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Evidencia Fotográfica</h3>
              <div className="space-y-2">
                <Label htmlFor="groupPhoto">
                  Foto Grupal de Representantes
                </Label>
                <Input
                  id="groupPhoto"
                  type="file"
                  accept="image/*"
                  onChange={handleGroupPhotoChange}
                />
                {groupPhoto && (
                  <p className="text-sm text-muted-foreground">
                    Archivo seleccionado: {groupPhoto.name}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="attachments">
                  Documentos de Respaldo (PDF, imágenes)
                </Label>
                <Input
                  id="attachments"
                  type="file"
                  accept=".pdf,image/*"
                  multiple
                  onChange={handleFileChange}
                />
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <span className="text-sm">{file.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAttachment(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Firma Digital */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Firma Digital *</h3>
              <p className="text-sm text-muted-foreground">
                Firma en el recuadro usando tu dedo o mouse para validar la
                minuta
              </p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: "w-full h-40 border border-gray-200 rounded",
                  }}
                />
              </div>
              <Button type="button" variant="outline" onClick={clearSignature}>
                Limpiar Firma
              </Button>
            </div>

            {/* Botones de Acción */}
            <div className="flex gap-4 pt-6">
              <LoadingButton
                type="submit"
                loading={createMutation.isPending}
                loadingText="Creando..."
                className="flex-1"
              >
                Crear Minuta
                {selectedRecipientIds.size > 0
                  ? ` y Enviar a ${selectedRecipientIds.size} destinatario${selectedRecipientIds.size !== 1 ? "s" : ""}`
                  : ""}
              </LoadingButton>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/meeting-minutes")}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
