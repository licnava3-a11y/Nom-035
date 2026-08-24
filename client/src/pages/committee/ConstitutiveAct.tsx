import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileText, Download, Calendar, MapPin } from "lucide-react";

export default function ConstitutiveAct() {
  const [constitutionDate, setConstitutionDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [constitutionPlace, setConstitutionPlace] = useState("");
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

  const generateMutation =
    trpc.committeeDocuments.generateConstitutiveAct.useMutation();

  const handleGenerate = async () => {
    if (!constitutionPlace.trim()) {
      alert("Por favor ingrese el lugar de constitución");
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        constitutionDate: new Date(constitutionDate).toISOString(),
        constitutionPlace: constitutionPlace.trim(),
      });

      setGeneratedPdfUrl(result.pdfUrl);
      alert(`Acta constitutiva generada exitosamente. Folio: ${result.folio}`);
    } catch (error: any) {
      alert(error.message || "Error al generar el acta constitutiva");
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Acta Constitutiva del Comité</h1>
        <p className="text-muted-foreground mt-2">
          Genere el documento formal de constitución del Comité de Seguridad y
          Salud en el Trabajo
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Datos de Constitución
            </CardTitle>
            <CardDescription>
              Ingrese la información para generar el acta constitutiva
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label
                htmlFor="constitutionDate"
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Fecha de Constitución
              </Label>
              <Input
                id="constitutionDate"
                type="date"
                value={constitutionDate}
                onChange={e => setConstitutionDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="constitutionPlace"
                className="flex items-center gap-2"
              >
                <MapPin className="h-4 w-4" />
                Lugar de Constitución
              </Label>
              <Input
                id="constitutionPlace"
                type="text"
                placeholder="Ej: Ciudad de México, CDMX"
                value={constitutionPlace}
                onChange={e => setConstitutionPlace(e.target.value)}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending
                ? "Generando..."
                : "Generar Acta Constitutiva"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Información del Documento</CardTitle>
            <CardDescription>
              El acta constitutiva incluirá la siguiente información
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <p>Datos de la empresa (razón social, RFC, domicilio)</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <p>Fecha y lugar de constitución</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <p>Objetivos del comité según NOM-035-STPS-2018</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <p>Lista de miembros fundadores con sus cargos</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <p>Sección de firmas de conformidad</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <p>Código QR NOM-151 para validación</p>
              </div>
            </div>

            {generatedPdfUrl && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                  ✓ Acta constitutiva generada exitosamente
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(generatedPdfUrl, "_blank")}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
