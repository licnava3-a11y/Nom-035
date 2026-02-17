import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { SignaturePad } from "@/components/SignaturePad";
import { Save, FileText } from "lucide-react";

export default function DocumentFuncionesComite() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    organizacion: "",
    fecha: new Date().toISOString().split("T")[0],
    coordinadorNombre: "",
    coordinadorFirma: "",
  });

  const funciones = [
    {
      categoria: "Funciones Generales del Comité",
      items: [
        "Establecer, implementar, mantener y difundir en el centro de trabajo una política de prevención de riesgos psicosociales",
        "Identificar y analizar los factores de riesgo psicosocial y evaluar el entorno organizacional favorable",
        "Adoptar las medidas para prevenir y controlar los factores de riesgo psicosocial",
        "Promover el entorno organizacional favorable y la prevención de la violencia laboral",
        "Difundir y sensibilizar al personal sobre los factores de riesgo psicosocial y el entorno organizacional favorable",
        "Realizar el seguimiento a las medidas de control implementadas",
        "Practicar exámenes médicos y evaluaciones psicológicas a los trabajadores expuestos a violencia laboral",
      ],
    },
    {
      categoria: "Funciones del Coordinador",
      items: [
        "Presidir las reuniones del comité y coordinar las actividades",
        "Representar al comité ante la dirección de la organización",
        "Supervisar el cumplimiento de las acciones acordadas",
        "Firmar las actas y documentos oficiales del comité",
        "Convocar a reuniones ordinarias y extraordinarias",
        "Dar seguimiento a los casos reportados de violencia laboral",
      ],
    },
    {
      categoria: "Funciones del Secretario",
      items: [
        "Elaborar el orden del día de las reuniones",
        "Levantar las actas de las reuniones del comité",
        "Llevar el archivo y control de la documentación",
        "Dar seguimiento a los acuerdos tomados",
        "Notificar las convocatorias a reuniones",
        "Mantener actualizado el registro de actividades",
      ],
    },
    {
      categoria: "Funciones de los Vocales",
      items: [
        "Participar activamente en las reuniones del comité",
        "Colaborar en la identificación de factores de riesgo psicosocial",
        "Apoyar en la implementación de medidas preventivas",
        "Atender y dar seguimiento a casos asignados",
        "Promover la difusión de información sobre riesgos psicosociales",
        "Proponer mejoras al programa de prevención",
      ],
    },
  ];

  const handleSave = () => {
    console.log("Guardando funciones del comité:", formData);
    alert("Funciones del comité guardadas exitosamente");
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Funciones del Comité</h1>
        <p className="text-muted-foreground mt-2">
          Descripción detallada de funciones y responsabilidades del Comité de Atención NOM-035
        </p>
      </div>

      {/* Información General */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
          <CardDescription>Datos de la organización y fecha del documento</CardDescription>
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

      {/* Funciones por Categoría */}
      {funciones.map((seccion, idx) => (
        <Card key={idx}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {seccion.categoria}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {seccion.items.map((item, itemIdx) => (
                <li key={itemIdx} className="flex gap-3">
                  <span className="text-primary font-semibold">{itemIdx + 1}.</span>
                  <span className="text-sm">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      {/* Firma del Coordinador */}
      <Card>
        <CardHeader>
          <CardTitle>Firma del Coordinador</CardTitle>
          <CardDescription>El coordinador del comité debe firmar este documento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="coordinadorNombre">Nombre del Coordinador</Label>
            <Input
              id="coordinadorNombre"
              value={formData.coordinadorNombre}
              onChange={(e) => setFormData({ ...formData, coordinadorNombre: e.target.value })}
              placeholder="Nombre completo del coordinador"
            />
          </div>

          <div className="space-y-2">
            <Label>Firma Digital</Label>
            <SignaturePad
              onSave={(signatureData) => {
                setFormData({ ...formData, coordinadorFirma: signatureData });
              }}
            />
          </div>
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
