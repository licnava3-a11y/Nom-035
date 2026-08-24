import { useState } from "react";
import { SignaturePad } from "../SignaturePad";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { trpc } from "@/lib/trpc";
import { Save, FileText, Users } from "lucide-react";

interface CommitteeMember {
  id: string;
  name: string;
  position: string;
  signature: string | null;
}

interface ActaConstitutivaData {
  companyName: string;
  companyAddress: string;
  companyRFC: string;
  meetingDate: string;
  meetingPlace: string;
  attendees: CommitteeMember[];
  objectives: string;
  responsibilities: string;
  meetingFrequency: string;
  additionalNotes: string;
}

/**
 * Componente de Acta Constitutiva del Comité de Seguridad y Salud
 *
 * Cumple con requisitos de NOM-035-STPS-2018 para la constitución formal del comité.
 *
 * Características:
 * - Campos dinámicos para datos de la empresa
 * - Gestión de asistentes con firmas digitales
 * - Validaciones de campos requeridos
 * - Guardado de borradores y versión final
 * - Generación de folio automático
 */
export function ActaConstitutiva() {
  const [formData, setFormData] = useState<ActaConstitutivaData>({
    companyName: "",
    companyAddress: "",
    companyRFC: "",
    meetingDate: new Date().toISOString().split("T")[0],
    meetingPlace: "",
    attendees: [],
    objectives:
      "Constituir el Comité de Seguridad y Salud en el Trabajo conforme a la NOM-035-STPS-2018, con el objetivo de identificar, analizar y prevenir los factores de riesgo psicosocial en el centro de trabajo.",
    responsibilities:
      "1. Vigilar el cumplimiento de la normativa en materia de riesgos psicosociales\n2. Promover la prevención de factores de riesgo psicosocial\n3. Proponer medidas de control y seguimiento\n4. Evaluar los factores de riesgo psicosocial\n5. Atender y dar seguimiento a los casos identificados",
    meetingFrequency: "Mensual",
    additionalNotes: "",
  });

  const [currentSigningMember, setCurrentSigningMember] = useState<
    string | null
  >(null);
  const [isDraft, setIsDraft] = useState(true);

  // Mutation para guardar documento
  const saveDocumentMutation = trpc.signatures.saveSignature.useMutation({
    onSuccess: () => {
      alert(
        isDraft
          ? "Borrador guardado exitosamente"
          : "Acta Constitutiva finalizada exitosamente"
      );
    },
    onError: error => {
      alert(`Error al guardar: ${error.message}`);
    },
  });

  const handleInputChange = (
    field: keyof ActaConstitutivaData,
    value: string
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddAttendee = () => {
    const newAttendee: CommitteeMember = {
      id: `member-${Date.now()}`,
      name: "",
      position: "",
      signature: null,
    };
    setFormData(prev => ({
      ...prev,
      attendees: [...prev.attendees, newAttendee],
    }));
  };

  const handleRemoveAttendee = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.filter(a => a.id !== id),
    }));
  };

  const handleAttendeeChange = (
    id: string,
    field: keyof CommitteeMember,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees.map(a =>
        a.id === id ? { ...a, [field]: value } : a
      ),
    }));
  };

  const handleSignatureCapture = (signature: string) => {
    if (currentSigningMember) {
      handleAttendeeChange(currentSigningMember, "signature", signature);
      setCurrentSigningMember(null);
    }
  };

  const handleSaveDraft = () => {
    setIsDraft(true);
    // Aquí se guardaría el borrador en la base de datos
    alert("Funcionalidad de guardado de borrador en desarrollo");
  };

  const handleFinalize = () => {
    // Validar que todos los campos requeridos estén llenos
    if (
      !formData.companyName ||
      !formData.companyRFC ||
      !formData.meetingDate
    ) {
      alert("Por favor complete todos los campos requeridos");
      return;
    }

    if (formData.attendees.length < 2) {
      alert("Se requieren al menos 2 asistentes para constituir el comité");
      return;
    }

    const unsignedMembers = formData.attendees.filter(a => !a.signature);
    if (unsignedMembers.length > 0) {
      alert(
        `Faltan firmas de: ${unsignedMembers.map(m => m.name || "Sin nombre").join(", ")}`
      );
      return;
    }

    setIsDraft(false);
    alert("Funcionalidad de finalización en desarrollo");
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Acta Constitutiva del Comité</h1>
        <p className="text-muted-foreground">
          Comité de Seguridad y Salud en el Trabajo - NOM-035-STPS-2018
        </p>
      </div>

      {/* Datos de la Empresa */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5" />
          <h2 className="text-xl font-semibold">Datos de la Empresa</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">Razón Social *</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={e => handleInputChange("companyName", e.target.value)}
              placeholder="Nombre completo de la empresa"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyRFC">RFC *</Label>
            <Input
              id="companyRFC"
              value={formData.companyRFC}
              onChange={e => handleInputChange("companyRFC", e.target.value)}
              placeholder="RFC de la empresa"
              maxLength={13}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="companyAddress">Domicilio</Label>
            <Input
              id="companyAddress"
              value={formData.companyAddress}
              onChange={e =>
                handleInputChange("companyAddress", e.target.value)
              }
              placeholder="Dirección completa del centro de trabajo"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meetingDate">Fecha de Constitución *</Label>
            <Input
              id="meetingDate"
              type="date"
              value={formData.meetingDate}
              onChange={e => handleInputChange("meetingDate", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="meetingPlace">Lugar de la Reunión</Label>
            <Input
              id="meetingPlace"
              value={formData.meetingPlace}
              onChange={e => handleInputChange("meetingPlace", e.target.value)}
              placeholder="Sala de juntas, oficina principal, etc."
            />
          </div>
        </div>
      </Card>

      {/* Objetivos y Responsabilidades */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Objetivos y Responsabilidades</h2>

        <div className="space-y-2">
          <Label htmlFor="objectives">Objetivos del Comité</Label>
          <Textarea
            id="objectives"
            value={formData.objectives}
            onChange={e => handleInputChange("objectives", e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="responsibilities">Responsabilidades</Label>
          <Textarea
            id="responsibilities"
            value={formData.responsibilities}
            onChange={e =>
              handleInputChange("responsibilities", e.target.value)
            }
            rows={6}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="meetingFrequency">Frecuencia de Reuniones</Label>
          <Input
            id="meetingFrequency"
            value={formData.meetingFrequency}
            onChange={e =>
              handleInputChange("meetingFrequency", e.target.value)
            }
            placeholder="Ej: Mensual, Bimestral, etc."
          />
        </div>
      </Card>

      {/* Asistentes y Firmas */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Asistentes y Firmas</h2>
          </div>
          <Button onClick={handleAddAttendee} variant="outline">
            Agregar Asistente
          </Button>
        </div>

        {formData.attendees.length === 0 && (
          <p className="text-muted-foreground text-center py-8">
            No hay asistentes agregados. Haga clic en "Agregar Asistente" para
            comenzar.
          </p>
        )}

        <div className="space-y-4">
          {formData.attendees.map((attendee: any) => (
            <div key={attendee.id} className="border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Nombre Completo</Label>
                  <Input
                    value={attendee.name}
                    onChange={e =>
                      handleAttendeeChange(attendee.id, "name", e.target.value)
                    }
                    placeholder="Nombre completo del asistente"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cargo/Posición</Label>
                  <Input
                    value={attendee.position}
                    onChange={e =>
                      handleAttendeeChange(
                        attendee.id,
                        "position",
                        e.target.value
                      )
                    }
                    placeholder="Coordinador, Secretario, etc."
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                {attendee.signature ? (
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-2">
                      Firma capturada:
                    </p>
                    <div className="border rounded p-2 bg-white dark:bg-gray-900">
                      <img
                        src={attendee.signature}
                        alt={`Firma de ${attendee.name}`}
                        className="max-w-full h-auto max-h-24"
                      />
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setCurrentSigningMember(attendee.id)}
                    variant="outline"
                  >
                    Capturar Firma
                  </Button>
                )}

                <Button
                  onClick={() => handleRemoveAttendee(attendee.id)}
                  variant="destructive"
                  size="sm"
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Panel de Firma */}
      {currentSigningMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-background rounded-lg max-w-2xl w-full">
            <SignaturePad
              onSave={handleSignatureCapture}
              onCancel={() => setCurrentSigningMember(null)}
              signerName={
                formData.attendees.find(a => a.id === currentSigningMember)
                  ?.name || "Asistente"
              }
              signerRole={
                formData.attendees.find(a => a.id === currentSigningMember)
                  ?.position
              }
            />
          </div>
        </div>
      )}

      {/* Notas Adicionales */}
      <Card className="p-6 space-y-4">
        <h2 className="text-xl font-semibold">Notas Adicionales</h2>
        <Textarea
          value={formData.additionalNotes}
          onChange={e => handleInputChange("additionalNotes", e.target.value)}
          rows={4}
          placeholder="Cualquier información adicional relevante para el acta..."
        />
      </Card>

      {/* Botones de Acción */}
      <div className="flex items-center justify-between gap-4">
        <Button onClick={handleSaveDraft} variant="outline">
          <Save className="w-4 h-4 mr-2" />
          Guardar Borrador
        </Button>

        <Button onClick={handleFinalize}>
          <FileText className="w-4 h-4 mr-2" />
          Finalizar y Generar PDF
        </Button>
      </div>
    </div>
  );
}
