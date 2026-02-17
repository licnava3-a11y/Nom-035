import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";
import { SignaturePad } from "@/components/SignaturePad";
import { Save, FileCheck } from "lucide-react";

export default function DocumentAceptacionCargo() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    organizacion: "",
    fecha: new Date().toISOString().split("T")[0],
    nombreCompleto: "",
    cargo: "",
    departamento: "",
    curp: "",
    email: "",
    telefono: "",
    declaracion: "",
    firma: "",
  });

  const cargos = useMemo(() => [
    "Coordinador del Comité",
    "Secretario del Comité",
    "Vocal del Comité",
    "Representante de los Trabajadores",
    "Representante del Patrón",
  ], []);

  const handleSave = () => {
    console.log("Guardando aceptación de cargo:", formData);
    alert("Aceptación de cargo guardada exitosamente");
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Aceptación de Cargo</h1>
        <p className="text-muted-foreground mt-2">
          Documento de aceptación formal de cargo en el Comité de Atención NOM-035
        </p>
      </div>

      {/* Información de la Organización */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Organización</CardTitle>
          <CardDescription>Datos de la empresa y fecha del documento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="organizacion">Nombre de la Organización</Label>
              <Input
                id="organizacion"
                value={formData.organizacion}
                onChange={(e) => setFormData({ ...formData, organizacion: e.target.value })}
                placeholder="Ingrese el nombre de la organización"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Datos del Aceptante */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Datos del Aceptante
          </CardTitle>
          <CardDescription>Información personal del miembro que acepta el cargo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombreCompleto">Nombre Completo</Label>
            <Input
              id="nombreCompleto"
              value={formData.nombreCompleto}
              onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })}
              placeholder="Nombre completo del aceptante"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo en el Comité</Label>
              <Select value={formData.cargo} onValueChange={(value) => setFormData({ ...formData, cargo: value })}>
                <SelectTrigger id="cargo">
                  <SelectValue placeholder="Seleccione el cargo" />
                </SelectTrigger>
                <SelectContent>
                  {cargos.map((cargo) => (
                    <SelectItem key={cargo} value={cargo}>
                      {cargo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="departamento">Departamento</Label>
              <Input
                id="departamento"
                value={formData.departamento}
                onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                placeholder="Departamento de adscripción"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="curp">CURP</Label>
              <Input
                id="curp"
                value={formData.curp}
                onChange={(e) => setFormData({ ...formData, curp: e.target.value.toUpperCase() })}
                placeholder="CURP del aceptante"
                maxLength={18}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="10 dígitos"
                maxLength={10}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Declaración de Aceptación */}
      <Card>
        <CardHeader>
          <CardTitle>Declaración de Aceptación</CardTitle>
          <CardDescription>Manifiesto de aceptación del cargo y sus responsabilidades</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-3 text-sm">
            <p className="font-semibold">Por medio de la presente, manifiesto que:</p>
            <ul className="space-y-2 ml-4 list-disc">
              <li>
                Acepto de manera voluntaria el cargo de <strong>{formData.cargo || "[CARGO]"}</strong> en el Comité de
                Atención a Factores de Riesgo Psicosocial.
              </li>
              <li>
                Conozco y acepto las funciones y responsabilidades inherentes al cargo conforme a lo establecido en la
                NOM-035-STPS-2018.
              </li>
              <li>
                Me comprometo a participar activamente en las reuniones del comité y en las actividades de prevención
                de riesgos psicosociales.
              </li>
              <li>
                Guardaré confidencialidad sobre la información sensible que conozca en el ejercicio de mis funciones.
              </li>
              <li>
                Actuaré con imparcialidad, profesionalismo y respeto en la atención de casos y situaciones relacionadas
                con factores de riesgo psicosocial.
              </li>
              <li>
                Me comprometo a recibir la capacitación necesaria para el desempeño adecuado de mis funciones en el
                comité.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="declaracion">Comentarios Adicionales (Opcional)</Label>
            <Textarea
              id="declaracion"
              value={formData.declaracion}
              onChange={(e) => setFormData({ ...formData, declaracion: e.target.value })}
              placeholder="Puede agregar comentarios o consideraciones adicionales..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Firma del Aceptante */}
      <Card>
        <CardHeader>
          <CardTitle>Firma del Aceptante</CardTitle>
          <CardDescription>Firma digital para validar la aceptación del cargo</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Firma Digital</Label>
            <SignaturePad
              onSave={(signatureData) => {
                setFormData({ ...formData, firma: signatureData });
              }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Al firmar este documento, confirmo que he leído y acepto todas las responsabilidades y compromisos
            establecidos en esta carta de aceptación de cargo.
          </p>
        </CardContent>
      </Card>

      {/* Botones de Acción */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline">Cancelar</Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Guardar Documento
        </Button>
      </div>
    </div>
  );
}
