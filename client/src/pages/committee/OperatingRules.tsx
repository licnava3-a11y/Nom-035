import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Calendar, MapPin } from "lucide-react";

export default function OperatingRules() {
  const [approvalDate, setApprovalDate] = useState(new Date().toISOString().split("T")[0]);
  const [approvalPlace, setApprovalPlace] = useState("");
  const [generatedPdfUrl, setGeneratedPdfUrl] = useState<string | null>(null);

  const generateMutation = trpc.committeeDocuments.generateOperatingRules.useMutation();

  const handleGenerate = async () => {
    if (!approvalPlace.trim()) {
      alert("Por favor ingrese el lugar de aprobación");
      return;
    }

    try {
      const result = await generateMutation.mutateAsync({
        approvalDate: new Date(approvalDate).toISOString(),
        approvalPlace: approvalPlace.trim(),
      });

      setGeneratedPdfUrl(result.pdfUrl);
      alert(`Bases de funcionamiento generadas exitosamente. Folio: ${result.folio}`);
    } catch (error: any) {
      alert(error.message || "Error al generar las bases de funcionamiento");
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Bases de Funcionamiento del Comité</h1>
        <p className="text-muted-foreground mt-2">
          Genere el reglamento interno del Comité de Seguridad y Salud en el Trabajo
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Datos de Aprobación
            </CardTitle>
            <CardDescription>
              Ingrese la información para generar las bases de funcionamiento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approvalDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Fecha de Aprobación
              </Label>
              <Input
                id="approvalDate"
                type="date"
                value={approvalDate}
                onChange={(e) => setApprovalDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="approvalPlace" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Lugar de Aprobación
              </Label>
              <Input
                id="approvalPlace"
                type="text"
                placeholder="Ej: Ciudad de México, CDMX"
                value={approvalPlace}
                onChange={(e) => setApprovalPlace(e.target.value)}
              />
            </div>

            <Button
              onClick={handleGenerate}
              disabled={generateMutation.isPending}
              className="w-full"
            >
              {generateMutation.isPending ? "Generando..." : "Generar Bases de Funcionamiento"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contenido del Documento</CardTitle>
            <CardDescription>
              Las bases de funcionamiento incluirán los siguientes capítulos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <div>
                  <p className="font-medium">Capítulo I: Disposiciones Generales</p>
                  <p className="text-muted-foreground">Objeto, fundamento legal y ámbito de aplicación</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <div>
                  <p className="font-medium">Capítulo II: Integración del Comité</p>
                  <p className="text-muted-foreground">Composición, miembros y duración del cargo</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <div>
                  <p className="font-medium">Capítulo III: Funciones del Comité</p>
                  <p className="text-muted-foreground">Funciones generales según NOM-035-STPS-2018</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <div>
                  <p className="font-medium">Capítulo IV: Reuniones del Comité</p>
                  <p className="text-muted-foreground">Periodicidad, convocatoria, quórum y actas</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <div>
                  <p className="font-medium">Capítulo V: Atribuciones de los Miembros</p>
                  <p className="text-muted-foreground">Presidente, Secretario y Vocales</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <p>Sección de firmas de conformidad de todos los miembros</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-primary mt-1.5" />
                <p>Código QR NOM-151 para validación</p>
              </div>
            </div>

            {generatedPdfUrl && (
              <div className="mt-6 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                  ✓ Bases de funcionamiento generadas exitosamente
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
