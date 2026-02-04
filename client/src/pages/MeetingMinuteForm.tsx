import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Upload, X } from "lucide-react";
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
  
  const signatureRef = useRef<SignatureCanvas>(null);

  const createMutation = trpc.meetingMinutes.create.useMutation({
    onSuccess: () => {
      toast.success("Minuta creada exitosamente");
      setLocation("/meeting-minutes");
    },
    onError: (error) => {
      toast.error(`Error al crear minuta: ${error.message}`);
    },
  });

  const addParticipant = () => {
    setParticipants([...participants, { name: "", curp: "", ine: "", role: "" }]);
  };

  const removeParticipant = (index: number) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const updated = [...participants];
    updated[index][field] = value;
    setParticipants(updated);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments([...attachments, ...Array.from(e.target.files)]);
    }
  };

  const handleGroupPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setGroupPhoto(e.target.files[0]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
  };

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
            Complete todos los campos para crear una nueva minuta con foliado automático y código QR único (NOM-151)
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
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Reunión de Comité de Seguridad"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="meetingType">Tipo de Reunión *</Label>
                  <select
                    id="meetingType"
                    value={meetingType}
                    onChange={(e) => setMeetingType(e.target.value)}
                    className="w-full px-3 py-2 border border-input rounded-md"
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
                    onChange={(e) => setMeetingDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Lugar</Label>
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocationField(e.target.value)}
                    placeholder="Ej: Sala de Juntas"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="agenda">Agenda/Orden del Día *</Label>
                <Textarea
                  id="agenda"
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
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
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Observaciones adicionales"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agreements">Acuerdos y Compromisos</Label>
                <Textarea
                  id="agreements"
                  value={agreements}
                  onChange={(e) => setAgreements(e.target.value)}
                  placeholder="Lista los acuerdos y compromisos establecidos"
                  rows={4}
                />
              </div>
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
                        onChange={(e) => updateParticipant(index, "name", e.target.value)}
                        placeholder="Nombre completo"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>CURP *</Label>
                      <Input
                        value={participant.curp}
                        onChange={(e) => updateParticipant(index, "curp", e.target.value)}
                        placeholder="CURP de 18 caracteres"
                        maxLength={18}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>INE/IFE *</Label>
                      <Input
                        value={participant.ine}
                        onChange={(e) => updateParticipant(index, "ine", e.target.value)}
                        placeholder="Número de INE"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Rol/Cargo *</Label>
                      <Input
                        value={participant.role}
                        onChange={(e) => updateParticipant(index, "role", e.target.value)}
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
                  No hay participantes agregados. Haz clic en "Agregar Participante" para comenzar.
                </p>
              )}
            </div>

            {/* Evidencia Fotográfica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Evidencia Fotográfica</h3>
              
              <div className="space-y-2">
                <Label htmlFor="groupPhoto">Foto Grupal de Representantes</Label>
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
                <Label htmlFor="attachments">Documentos de Respaldo (PDF, imágenes)</Label>
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
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
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
                Firma en el recuadro usando tu dedo o mouse para validar la minuta
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
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? "Creando..." : "Crear Minuta"}
              </Button>
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
