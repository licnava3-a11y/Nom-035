import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Download, Plus, Search, Edit } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { ResourceDialog } from "@/components/ResourceDialog";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function Resources() {
  const { user } = useAuth();
  const { data: resources, isLoading } = trpc.resources.list.useQuery();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<any>(null);

  const handleEdit = (resource: any) => {
    setSelectedResource(resource);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedResource(null);
    setDialogOpen(true);
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      pdf: "PDF",
      presentation: "Presentación",
      protocol: "Protocolo",
      manual: "Manual",
      form: "Formulario",
      other: "Otro",
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      pdf: "bg-red-100 text-red-800",
      presentation: "bg-blue-100 text-blue-800",
      protocol: "bg-green-100 text-green-800",
      manual: "bg-purple-100 text-purple-800",
      form: "bg-yellow-100 text-yellow-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[category] || "bg-gray-100 text-gray-800";
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "N/A";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(2)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(2)} MB`;
  };

  const filteredResources = resources?.filter((resource: any) =>
    resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
      <Breadcrumb items={[
        {
                label: "Capacitación y Desarrollo",
                href: "/"
        },
        {
                label: "Recursos"
        }
]} />

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recursos</h1>
            <p className="text-muted-foreground mt-2">Biblioteca de materiales descargables</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i: any) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-full mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recursos</h1>
          <p className="text-muted-foreground mt-2">
            Biblioteca de manuales, protocolos y materiales de apoyo
          </p>
        </div>
        {(user?.role === "admin" || user?.role === "instructor") && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Subir Recurso
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar recursos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Resources Grid */}
      {filteredResources && filteredResources.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((resource: any) => (
            <Card key={resource.id} className="hover:shadow-lg transition-shadow flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{resource.title}</CardTitle>
                    <CardDescription className="line-clamp-3 mt-2">
                      {resource.description || "Sin descripción disponible"}
                    </CardDescription>
                  </div>
                  <Badge className={getCategoryColor(resource.category)}>
                    {getCategoryLabel(resource.category)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between">
                <div className="space-y-2 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>{formatFileSize(resource.fileSize)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span>{resource.downloadCount} descargas</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button className="flex-1" asChild>
                    <a href={resource.resourceUrl} download target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </a>
                  </Button>
                  {(user?.role === "admin" || user?.role === "instructor") && (
                    <Button variant="outline" size="icon" onClick={() => handleEdit(resource)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery ? "No se encontraron recursos" : "No hay recursos disponibles"}
            </h3>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {searchQuery
                ? "Intenta con otros términos de búsqueda"
                : "Aún no se han subido recursos a la biblioteca"}
            </p>
            {!searchQuery && (user?.role === "admin" || user?.role === "instructor") && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Subir Primer Recurso
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Resource Dialog */}
      <ResourceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        resource={selectedResource}
      />

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre los Recursos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            En esta sección encontrarás materiales de apoyo para la implementación de la NOM-035-STPS-2018,
            incluyendo:
          </p>
          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
            <li>Manuales del implementador y del comité de atención</li>
            <li>Protocolos de actuación para casos de mobbing y burnout</li>
            <li>Formatos y cuestionarios de evaluación</li>
            <li>Guías de referencia y documentación oficial</li>
            <li>Presentaciones y materiales de capacitación</li>
          </ul>
        </CardContent>
      </Card>

      {/* Course Descriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Contenido de los Cursos</CardTitle>
          <CardDescription>Descripción detallada de cada programa de capacitación</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="font-semibold text-base">1. Introducción a la NOM-035-STPS-2018</h3>
            <p className="text-sm text-muted-foreground">
              <strong>Duración:</strong> 4 horas | <strong>Modalidad:</strong> En línea
            </p>
            <p className="text-sm">
              Curso introductorio que aborda los fundamentos de la norma oficial mexicana sobre factores de riesgo psicosocial en el trabajo.
            </p>
            <div className="text-sm">
              <strong>Objetivos de aprendizaje:</strong>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                <li>Comprender el marco legal y obligaciones de la NOM-035</li>
                <li>Identificar los factores de riesgo psicosocial en el entorno laboral</li>
                <li>Conocer las responsabilidades del patrón y trabajadores</li>
                <li>Entender el proceso de identificación, análisis y prevención</li>
              </ul>
            </div>
            <div className="text-sm">
              <strong>Temario:</strong>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                <li>Módulo 1: Antecedentes y marco normativo</li>
                <li>Módulo 2: Factores de riesgo psicosocial y entorno organizacional</li>
                <li>Módulo 3: Obligaciones del patrón según el número de trabajadores</li>
                <li>Módulo 4: Política de prevención y medidas de control</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-6 space-y-3">
            <h3 className="font-semibold text-base">2. Identificación y Análisis de Factores de Riesgo Psicosocial</h3>
            <p className="text-sm text-muted-foreground">
              <strong>Duración:</strong> 6 horas | <strong>Modalidad:</strong> En línea
            </p>
            <p className="text-sm">
              Curso práctico para aplicar las guías de referencia II y III de la NOM-035, utilizando cuestionarios validados para identificar y evaluar factores de riesgo.
            </p>
            <div className="text-sm">
              <strong>Objetivos de aprendizaje:</strong>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                <li>Aplicar correctamente los cuestionarios de las Guías II y III</li>
                <li>Interpretar resultados de las evaluaciones</li>
                <li>Identificar áreas de riesgo alto, medio y bajo</li>
                <li>Elaborar informes de resultados</li>
              </ul>
            </div>
            <div className="text-sm">
              <strong>Temario:</strong>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                <li>Módulo 1: Guía de referencia II - Cuestionario de identificación</li>
                <li>Módulo 2: Guía de referencia III - Cuestionario de evaluación</li>
                <li>Módulo 3: Análisis e interpretación de resultados</li>
                <li>Módulo 4: Elaboración de informes y documentación</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-6 space-y-3">
            <h3 className="font-semibold text-base">3. Prevención del Mobbing y Burnout</h3>
            <p className="text-sm text-muted-foreground">
              <strong>Duración:</strong> 5 horas | <strong>Modalidad:</strong> En línea
            </p>
            <p className="text-sm">
              Curso especializado en la prevención, detección y atención de casos de acoso laboral (mobbing) y síndrome de desgaste ocupacional (burnout).
            </p>
            <div className="text-sm">
              <strong>Objetivos de aprendizaje:</strong>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                <li>Identificar señales de mobbing y burnout en el entorno laboral</li>
                <li>Aplicar protocolos de actuación ante casos detectados</li>
                <li>Implementar medidas preventivas organizacionales</li>
                <li>Conocer el marco legal y consecuencias jurídicas</li>
              </ul>
            </div>
            <div className="text-sm">
              <strong>Temario:</strong>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                <li>Módulo 1: Definición y tipos de mobbing</li>
                <li>Módulo 2: Síndrome de burnout - causas y consecuencias</li>
                <li>Módulo 3: Protocolo de atención y canalización</li>
                <li>Módulo 4: Estrategias de prevención y cultura organizacional</li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-6 space-y-3">
            <h3 className="font-semibold text-base">4. Formación del Comité de Atención</h3>
            <p className="text-sm text-muted-foreground">
              <strong>Duración:</strong> 8 horas | <strong>Modalidad:</strong> En línea
            </p>
            <p className="text-sm">
              Curso integral para miembros del comité de atención, cubriendo desde la constitución del comité hasta la investigación y dictaminación de casos.
            </p>
            <div className="text-sm">
              <strong>Objetivos de aprendizaje:</strong>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                <li>Constituir y formalizar el comité de atención</li>
                <li>Conocer funciones y responsabilidades de cada miembro</li>
                <li>Aplicar metodologías de investigación de casos</li>
                <li>Elaborar dictamenes y programas de atención</li>
              </ul>
            </div>
            <div className="text-sm">
              <strong>Temario:</strong>
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-muted-foreground">
                <li>Módulo 1: Constitución del comité y acta constitutiva</li>
                <li>Módulo 2: Funciones del coordinador, secretario y vocales</li>
                <li>Módulo 3: Recepción, investigación y seguimiento de casos</li>
                <li>Módulo 4: Elaboración de dictamenes y programas de intervención</li>
                <li>Módulo 5: Confidencialidad y aspectos éticos</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
