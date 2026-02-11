import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ListChecks, Award } from "lucide-react";
import { DC2Form } from "@/components/stps/DC2Form";
import { DC3Form } from "@/components/stps/DC3Form";
import { DC4Form } from "@/components/stps/DC4Form";
import { ReportsList } from "@/components/stps/ReportsList";

/**
 * Página principal de generación de reportes STPS automatizados
 * - DC-2: Constancia de Competencias o de Habilidades Laborales
 * - DC-3: Constancia de Habilidades Laborales
 * - DC-4: Lista de Constancias de Competencias o de Habilidades Laborales
 */
export default function STPSReports() {
  const [activeTab, setActiveTab] = useState("dc2");

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Reportes STPS Automatizados</h1>
        <p className="text-muted-foreground">
          Generación automática de formatos oficiales de la Secretaría del Trabajo y Previsión Social
        </p>
      </div>

      {/* Tabs de navegación */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dc2" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            DC-2
          </TabsTrigger>
          <TabsTrigger value="dc3" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            DC-3
          </TabsTrigger>
          <TabsTrigger value="dc4" className="flex items-center gap-2">
            <ListChecks className="h-4 w-4" />
            DC-4
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {/* DC-2: Constancia de Competencias */}
        <TabsContent value="dc2" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DC-2: Constancia de Competencias o de Habilidades Laborales</CardTitle>
              <CardDescription>
                Formato oficial para certificar las competencias adquiridas por un trabajador en un curso de capacitación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DC2Form />
            </CardContent>
          </Card>
        </TabsContent>

        {/* DC-3: Constancia de Habilidades Laborales */}
        <TabsContent value="dc3" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DC-3: Constancia de Habilidades Laborales</CardTitle>
              <CardDescription>
                Formato oficial para certificar las habilidades laborales específicas adquiridas durante la capacitación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DC3Form />
            </CardContent>
          </Card>
        </TabsContent>

        {/* DC-4: Lista de Constancias */}
        <TabsContent value="dc4" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>DC-4: Lista de Constancias de Competencias o de Habilidades Laborales</CardTitle>
              <CardDescription>
                Formato oficial para reportar el listado consolidado de constancias emitidas en un periodo determinado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DC4Form />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historial de reportes generados */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Reportes Generados</CardTitle>
              <CardDescription>
                Consulta y descarga de reportes STPS generados previamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReportsList />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
