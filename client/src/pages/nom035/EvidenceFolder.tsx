import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Download, Search, Filter, FolderOpen } from "lucide-react";

const categoryLabels: Record<string, string> = {
  policies: "Políticas de Prevención",
  preventive_actions: "Acciones Preventivas",
  corrective_actions: "Acciones Correctivas",
  organizational_environment: "Entorno Organizacional Favorable",
  training_program: "Programa de Capacitación",
  surveys: "Reportes de Encuestas",
  cases: "Casos Documentados",
  minutes: "Minutas del Comité",
  certificates: "Certificados y Constancias",
  position_acceptance: "Documentos de Aceptación de Cargo",
  photographic_evidence: "Evidencias Fotográficas y Documentales",
};

export default function EvidenceFolder() {
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: evidences, isLoading } = trpc.evidenceFolder.list.useQuery({
    category: selectedCategory as any,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    searchTerm: searchTerm || undefined,
  });

  const { data: stats } = trpc.evidenceFolder.getStats.useQuery();

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(2)} KB` : `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Carpeta de Evidencias NOM-035</h1>
        <p className="text-muted-foreground mt-2">
          Repositorio centralizado de documentación para cumplimiento normativo
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total de Evidencias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Documentos consolidados
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Tamaño Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatFileSize(stats.totalSize)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Espacio utilizado
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Categorías Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(stats.byCategory).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                De 11 categorías totales
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Fecha Inicio</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Fecha Fin</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("");
              setStartDate("");
              setEndDate("");
              setSelectedCategory(undefined);
            }}
          >
            Limpiar Filtros
          </Button>
        </CardContent>
      </Card>

      {/* Evidence Table by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Evidencias por Categoría
          </CardTitle>
          <CardDescription>
            Navegue por las categorías para ver las evidencias consolidadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedCategory || "all"} onValueChange={(v) => setSelectedCategory(v === "all" ? undefined : v)}>
            <TabsList className="grid grid-cols-3 lg:grid-cols-6 gap-2 h-auto">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="policies">Políticas</TabsTrigger>
              <TabsTrigger value="preventive_actions">Preventivas</TabsTrigger>
              <TabsTrigger value="corrective_actions">Correctivas</TabsTrigger>
              <TabsTrigger value="organizational_environment">Entorno</TabsTrigger>
              <TabsTrigger value="training_program">Capacitación</TabsTrigger>
              <TabsTrigger value="surveys">Encuestas</TabsTrigger>
              <TabsTrigger value="cases">Casos</TabsTrigger>
              <TabsTrigger value="minutes">Minutas</TabsTrigger>
              <TabsTrigger value="certificates">Certificados</TabsTrigger>
              <TabsTrigger value="position_acceptance">Aceptaciones</TabsTrigger>
              <TabsTrigger value="photographic_evidence">Evidencias</TabsTrigger>
            </TabsList>

            <div className="mt-6">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Cargando evidencias...
                </div>
              ) : !evidences || evidences.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No se encontraron evidencias con los filtros aplicados
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Categoría</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tamaño</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evidences.map((evidence: any) => (
                      <TableRow key={evidence.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {categoryLabels[evidence.category] || evidence.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{evidence.title}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {evidence.description || "Sin descripción"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {evidence.documentType || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(evidence.generatedDate)}</TableCell>
                        <TableCell>{formatFileSize(evidence.fileSize)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(evidence.fileUrl, "_blank")}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
