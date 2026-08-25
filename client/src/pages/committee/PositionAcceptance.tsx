import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import SignatureCanvas from "react-signature-canvas";

const POSITION_LABELS: Record<string, string> = {
  president: "Presidente",
  secretary: "Secretario",
  vocal: "Vocal",
  alternate: "Suplente",
  advisor: "Asesor",
};

const RESPONSIBILITIES: Record<string, string> = {
  president: `**RESPONSABILIDADES DEL PRESIDENTE DEL COMITÉ:**

1. Dirigir y coordinar las actividades del Comité
2. Convocar y presidir las reuniones
3. Representar al Comité ante la dirección
4. Supervisar acciones preventivas y correctivas
5. Tomar decisiones colegiadas
6. Dar seguimiento a los acuerdos
7. Mantener comunicación institucional
8. Promover la cultura de prevención`,

  secretary: `**RESPONSABILIDADES DEL SECRETARIO DEL COMITÉ:**

1. Elaborar minutas de reuniones
2. Mantener archivo documental actualizado
3. Apoyar en convocatorias
4. Llevar registro de asistencia
5. Difundir acuerdos del Comité
6. Dar seguimiento a compromisos
7. Preparar orden del día
8. Resguardar evidencias NOM-035`,

  vocal: `**RESPONSABILIDADES DEL VOCAL DEL COMITÉ:**

1. Asistir puntualmente a reuniones
2. Analizar casos de trabajadores expuestos
3. Investigar eventos traumáticos severos
4. Proponer acciones preventivas y correctivas
5. Difundir información de prevención
6. Representar intereses de trabajadores
7. Verificar implementación de acciones
8. Proporcionar retroalimentación`,

  alternate: `**RESPONSABILIDADES DEL SUPLENTE DEL COMITÉ:**

1. Sustituir al miembro titular en ausencias
2. Asistir a reuniones cuando sea convocado
3. Mantenerse informado sobre acuerdos
4. Apoyar al titular en sus funciones
5. Estar preparado para asumir el cargo
6. Participar en capacitaciones
7. Mantener comunicación con el titular
8. Mantener compromiso con la prevención`,

  advisor: `**RESPONSABILIDADES DEL ASESOR DEL COMITÉ:**

1. Proporcionar asesoría técnica especializada
2. Orientar en interpretación normativa
3. Impartir o coordinar capacitaciones
4. Apoyar en análisis de resultados
5. Colaborar en diseño de estrategias
6. Evaluar efectividad de acciones
7. Mantenerse actualizado en mejores prácticas
8. Brindar apoyo en casos complejos`,
};

export default function PositionAcceptance() {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [inePhoto, setInePhoto] = useState<string | null>(null);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const signatureRef = useRef<SignatureCanvas>(null);

  const { data: members, isLoading: membersLoading } =
    trpc.committeePositionAcceptance.listMembers.useQuery();
  const createMutation = trpc.committeePositionAcceptance.create.useMutation();
  const generatePDFMutation =
    trpc.committeePositionAcceptance.generatePDF.useMutation();

  const handleInePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setInePhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMemberId || !selectedPosition || !inePhoto) {
      alert("Por favor completa todos los campos requeridos");
      return;
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      alert("Por favor firma el documento");
      return;
    }

    const signatureBase64 = signatureRef.current.toDataURL();

    try {
      const result = await createMutation.mutateAsync({
        committeeMemberId: parseInt(selectedMemberId),
        positionType: selectedPosition as any,
        inePhotoBase64: inePhoto,
        signatureBase64,
        responsibilities: RESPONSIBILITIES[selectedPosition],
      });

      // Generate PDF
      const pdfResult = await generatePDFMutation.mutateAsync({
        acceptanceId: result.id,
      });

      // Open PDF in new window
      window.open(pdfResult.pdfUrl, "_blank");

      // Reset form
      setSelectedMemberId("");
      setSelectedPosition("");
      setInePhoto(null);
      setShowSignaturePad(false);
      signatureRef.current?.clear();

      alert("Aceptación de cargo creada exitosamente");
    } catch (error) {
      alert("Error al crear la aceptación");
    }
  };

  if (membersLoading) {
    return <div className="p-8">Cargando...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">
          Aceptación de Cargo - Comité NOM-035
        </h1>
        <p className="text-muted-foreground mt-2">
          Documento formal de aceptación de cargo con responsabilidades y firma
          digital
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulario de Aceptación</CardTitle>
          <CardDescription>
            Completa la información requerida para generar el documento oficial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Member Selection */}
          <div className="space-y-2">
            <Label htmlFor="member">Miembro del Comité *</Label>
            <Select
              value={selectedMemberId}
              onValueChange={setSelectedMemberId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un miembro" />
              </SelectTrigger>
              <SelectContent>
                {members?.map((member: any) => (
                  <SelectItem key={member.id} value={member.id.toString()}>
                    {member.employeeName} - {member.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Position Selection */}
          <div className="space-y-2">
            <Label htmlFor="position">Cargo en el Comité *</Label>
            <Select
              value={selectedPosition}
              onValueChange={setSelectedPosition}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el cargo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(POSITION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Responsibilities Preview */}
          {selectedPosition && (
            <div className="space-y-2">
              <Label>Responsabilidades del Cargo</Label>
              <Textarea
                value={RESPONSIBILITIES[selectedPosition]}
                readOnly
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          )}

          {/* INE Photo Upload */}
          <div className="space-y-2">
            <Label htmlFor="ine">Foto de INE *</Label>
            <input
              id="ine"
              type="file"
              accept="image/*"
              onChange={handleInePhotoUpload}
              className="block w-full text-sm text-slate-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
            />
            {inePhoto && (
              <div className="mt-2">
                <img
                  src={inePhoto}
                  alt="INE Preview"
                  className="max-w-md border rounded"
                />
              </div>
            )}
          </div>

          {/* Signature Pad */}
          <div className="space-y-2">
            <Label>Firma Digital *</Label>
            {!showSignaturePad ? (
              <Button
                onClick={() => setShowSignaturePad(true)}
                variant="outline"
                className="w-full"
              >
                Abrir Panel de Firma
              </Button>
            ) : (
              <div className="border rounded-lg p-4 bg-white">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: "w-full h-40 border rounded",
                  }}
                />
                <div className="mt-2 flex gap-2">
                  <Button
                    onClick={() => signatureRef.current?.clear()}
                    variant="outline"
                    size="sm"
                  >
                    Limpiar
                  </Button>
                  <Button
                    onClick={() => setShowSignaturePad(false)}
                    variant="outline"
                    size="sm"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || generatePDFMutation.isPending}
            className="w-full"
            size="lg"
          >
            {createMutation.isPending || generatePDFMutation.isPending
              ? "Generando documento..."
              : "Generar Documento de Aceptación"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
