import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { SignaturePad } from "@/components/SignaturePad";
import { Save, MapPin, Plus, Trash2, Camera } from "lucide-react";

interface Observacion {
  id: string;
  area: string;
  descripcion: string;
  riesgo: string;
  accionCorrectiva: string;
  responsable: string;
  plazo: string;
}

interface Participante {
  id: string;
  nombre: string;
  cargo: string;
  firma: string;
}

export default function DocumentActaRecorridoNOM019() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const saveActaMutation = trpc.documents.saveActaRecorrido.useMutation();
  const [formData, setFormData] = useState({
    organizacion: "",
    fecha: new Date().toISOString().split("T")[0],
    horaInicio: "",
    horaFin: "",
    objetivo: "",
    alcance: "",
    evidenciaFotografica: [] as string[],
  });

  const [observaciones, setObservaciones] = useState<Observacion[]>([
    {
      id: "1",
      area: "",
      descripcion: "",
      riesgo: "",
      accionCorrectiva: "",
      responsable: "",
      plazo: "",
    },
  ]);

  const [participantes, setParticipantes] = useState<Participante[]>([
    {
      id: "1",
      nombre: "",
      cargo: "",
      firma: "",
    },
  ]);

  const agregarObservacion = () => {
    setObservaciones([
      ...observaciones,
      {
        id: Date.now().toString(),
        area: "",
        descripcion: "",
        riesgo: "",
        accionCorrectiva: "",
        responsable: "",
        plazo: "",
      },
    ]);
  };

  const eliminarObservacion = (id: string) => {
    setObservaciones(observaciones.filter((obs: any) => obs.id !== id));
  };

  const actualizarObservacion = (id: string, campo: keyof Observacion, valor: string) => {
    setObservaciones(observaciones.map((obs: any) => (obs.id === id ? { ...obs, [campo]: valor } : obs)));
  };

  const agregarParticipante = () => {
    setParticipantes([
      ...participantes,
      {
        id: Date.now().toString(),
        nombre: "",
        cargo: "",
        firma: "",
      },
    ]);
  };

  const eliminarParticipante = (id: string) => {
    setParticipantes(participantes.filter((part: any) => part.id !== id));
  };

  const actualizarParticipante = (id: string, campo: keyof Participante, valor: string) => {
    setParticipantes(participantes.map((part: any) => (part.id === id ? { ...part, [campo]: valor } : part)));
  };

  const handleSave = async () => {
    try {
      // Validar campos obligatorios
      if (!formData.organizacion || !formData.fecha || !formData.objetivo) {
        alert("Por favor complete todos los campos obligatorios: Organización, Fecha y Objetivo");
        return;
      }

      // Preparar firmas desde participantes
      const firmas = participantes
        .filter(p => p.firma)
        .map(p => ({
          url: p.firma,
          nombre: p.nombre,
          cargo: p.cargo,
          userId: user?.id,
        }));

      // Preparar participantes sin firma
      const participantesData = participantes.map(p => ({
        nombre: p.nombre,
        cargo: p.cargo,
        curp: undefined,
        ine: undefined,
      }));

      // Preparar observaciones
      const observacionesData = observaciones.map(obs => ({
        area: obs.area,
        descripcion: obs.descripcion,
        riesgo: obs.riesgo,
        accionCorrectiva: obs.accionCorrectiva,
        responsable: obs.responsable,
        plazo: obs.plazo,
      }));

      const result = await saveActaMutation.mutateAsync({
        title: `Acta de Recorrido - ${formData.organizacion}`,
        organizacion: formData.organizacion,
        fecha: formData.fecha,
        horaInicio: formData.horaInicio,
        horaFin: formData.horaFin,
        objetivo: formData.objetivo,
        alcance: formData.alcance,
        observaciones: observacionesData,
        participantes: participantesData,
        firmas,
        status: "final",
      });

      alert(`✅ Acta de recorrido guardada exitosamente con folio: ${result.folio}`);
      setLocation("/documents");
    } catch (error: any) {
      console.error("Error guardando acta:", error);
      alert(`Error al guardar el acta: ${error.message || "Ocurrió un error inesperado"}`);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Acta de Recorrido NOM-019</h1>
        <p className="text-muted-foreground mt-2">
          Registro de recorridos de verificación de condiciones de seguridad e higiene en el centro de trabajo
        </p>
      </div>

      {/* Información General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Información General del Recorrido
          </CardTitle>
          <CardDescription>Datos básicos del recorrido de verificación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="organizacion">Nombre de la Organización</Label>
            <Input
              id="organizacion"
              value={formData.organizacion}
              onChange={(e) => setFormData({ ...formData, organizacion: e.target.value })}
              placeholder="Ingrese el nombre de la organización"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha del Recorrido</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horaInicio">Hora de Inicio</Label>
              <Input
                id="horaInicio"
                type="time"
                value={formData.horaInicio}
                onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="horaFin">Hora de Fin</Label>
              <Input
                id="horaFin"
                type="time"
                value={formData.horaFin}
                onChange={(e) => setFormData({ ...formData, horaFin: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="objetivo">Objetivo del Recorrido</Label>
            <Textarea
              id="objetivo"
              value={formData.objetivo}
              onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
              placeholder="Describa el objetivo del recorrido de verificación..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alcance">Alcance (Áreas Inspeccionadas)</Label>
            <Textarea
              id="alcance"
              value={formData.alcance}
              onChange={(e) => setFormData({ ...formData, alcance: e.target.value })}
              placeholder="Liste las áreas o departamentos inspeccionados durante el recorrido..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Observaciones y Hallazgos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Observaciones y Hallazgos</CardTitle>
              <CardDescription>Registro detallado de observaciones durante el recorrido</CardDescription>
            </div>
            <Button onClick={agregarObservacion} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Observación
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {observaciones.map((obs, index) => (
            <div key={obs.id} className="p-4 border rounded-lg space-y-4 relative">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Observación #{index + 1}</h4>
                {observaciones.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => eliminarObservacion(obs.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Área o Departamento</Label>
                  <Input
                    value={obs.area}
                    onChange={(e) => actualizarObservacion(obs.id, "area", e.target.value)}
                    placeholder="Ej: Producción, Almacén, Oficinas"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Riesgo Identificado</Label>
                  <Input
                    value={obs.riesgo}
                    onChange={(e) => actualizarObservacion(obs.id, "riesgo", e.target.value)}
                    placeholder="Ej: Riesgo ergonómico, psicosocial, químico"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descripción de la Observación</Label>
                <Textarea
                  value={obs.descripcion}
                  onChange={(e) => actualizarObservacion(obs.id, "descripcion", e.target.value)}
                  placeholder="Describa detalladamente la observación o hallazgo..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Acción Correctiva Propuesta</Label>
                <Textarea
                  value={obs.accionCorrectiva}
                  onChange={(e) => actualizarObservacion(obs.id, "accionCorrectiva", e.target.value)}
                  placeholder="Describa la acción correctiva o preventiva recomendada..."
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Responsable de la Acción</Label>
                  <Input
                    value={obs.responsable}
                    onChange={(e) => actualizarObservacion(obs.id, "responsable", e.target.value)}
                    placeholder="Nombre del responsable"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plazo de Cumplimiento</Label>
                  <Input
                    type="date"
                    value={obs.plazo}
                    onChange={(e) => actualizarObservacion(obs.id, "plazo", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Evidencia Fotográfica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Evidencia Fotográfica
          </CardTitle>
          <CardDescription>Adjunte fotografías que documenten las observaciones realizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Haga clic para seleccionar imágenes o arrástrelas aquí
              </p>
              <Button variant="outline">Seleccionar Archivos</Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Formatos aceptados: JPG, PNG. Tamaño máximo: 5MB por archivo.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Participantes del Recorrido */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Participantes del Recorrido</CardTitle>
              <CardDescription>Personas que participaron en el recorrido de verificación</CardDescription>
            </div>
            <Button onClick={agregarParticipante} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Participante
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {participantes.map((part, index) => (
            <div key={part.id} className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold">Participante #{index + 1}</h4>
                {participantes.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => eliminarParticipante(part.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nombre Completo</Label>
                  <Input
                    value={part.nombre}
                    onChange={(e) => actualizarParticipante(part.id, "nombre", e.target.value)}
                    placeholder="Nombre completo del participante"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cargo o Puesto</Label>
                  <Input
                    value={part.cargo}
                    onChange={(e) => actualizarParticipante(part.id, "cargo", e.target.value)}
                    placeholder="Cargo en la organización"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Firma Digital</Label>
                <SignaturePad
                  onSave={(signatureData) => {
                    actualizarParticipante(part.id, "firma", signatureData);
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Botones de Acción */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline">Cancelar</Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Guardar Acta
        </Button>
      </div>
    </div>
  );
}
