import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { FileText, Download, Plus, Search } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

export default function Resources() {
  const { user } = useAuth();
  const { data: resources, isLoading } = trpc.resources.list.useQuery();
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredResources = resources?.filter((resource) =>
    resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Recursos</h1>
            <p className="text-muted-foreground mt-2">Biblioteca de materiales descargables</p>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
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
          <Button>
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
          {filteredResources.map((resource) => (
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
                <Button className="w-full" asChild>
                  <a href={resource.resourceUrl} download target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Descargar
                  </a>
                </Button>
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
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Subir Primer Recurso
              </Button>
            )}
          </CardContent>
        </Card>
      )}

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
    </div>
  );
}
