import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Search, Filter, Calendar } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function DocumentsHistory() {
  const { user } = useAuth();
  const [filterType, setFilterType] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchFolio, setSearchFolio] = useState("");

  // Obtener documentos con filtros
  const { data: documents, isLoading } = trpc.documents.list.useQuery({
    type: filterType || undefined,
    status: filterStatus || undefined,
    limit: 100,
  });

  // Filtrar por folio localmente
  const filteredDocuments = documents?.filter((doc) =>
    searchFolio ? doc.folio.toLowerCase().includes(searchFolio.toLowerCase()) : true
  );

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: "Borrador", variant: "secondary" as const },
      final: { label: "Final", variant: "default" as const },
      archived: { label: "Archivado", variant: "outline" as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      acta_constitutiva: "Acta Constitutiva",
      funciones_comite: "Funciones del Comité",
      aceptacion_cargo: "Aceptación de Cargo",
      acta_recorrido: "Acta de Recorrido NOM-019",
      acta_final_resultados: "Acta Final de Resultados",
    };
    return typeLabels[type] || type;
  };

  const handleDownloadPDF = (pdfUrl: string, folio: string) => {
    if (!pdfUrl) {
      alert("Este documento aún no tiene PDF generado");
      return;
    }
    window.open(pdfUrl, "_blank");
  };

  const handleViewDocument = (documentId: number) => {
    // TODO: Implementar vista previa del documento
    alert(`Vista previa del documento ID: ${documentId}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Historial de Documentos</h1>
        <p className="text-muted-foreground mt-2">
          Consulta, filtra y descarga todos los documentos generados
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
          <CardDescription>Filtra los documentos por tipo, estado o folio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Búsqueda por folio */}
            <div className="space-y-2">
              <Label htmlFor="searchFolio">Buscar por Folio</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="searchFolio"
                  placeholder="Ej: AC-001/2026"
                  value={searchFolio}
                  onChange={(e) => setSearchFolio(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filtro por tipo */}
            <div className="space-y-2">
              <Label htmlFor="filterType">Tipo de Documento</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filterType">
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="acta_constitutiva">Acta Constitutiva</SelectItem>
                  <SelectItem value="funciones_comite">Funciones del Comité</SelectItem>
                  <SelectItem value="aceptacion_cargo">Aceptación de Cargo</SelectItem>
                  <SelectItem value="acta_recorrido">Acta de Recorrido NOM-019</SelectItem>
                  <SelectItem value="acta_final_resultados">Acta Final de Resultados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por estado */}
            <div className="space-y-2">
              <Label htmlFor="filterStatus">Estado</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="filterStatus">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                  <SelectItem value="archived">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botón para limpiar filtros */}
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setFilterType("");
                setFilterStatus("");
                setSearchFolio("");
              }}
            >
              Limpiar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de documentos */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos Generados</CardTitle>
          <CardDescription>
            {filteredDocuments?.length || 0} documento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando documentos...</div>
          ) : !filteredDocuments || filteredDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron documentos con los filtros seleccionados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha de Creación</TableHead>
                    <TableHead>Fecha de Finalización</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-mono font-semibold">{doc.folio}</TableCell>
                      <TableCell>{doc.title}</TableCell>
                      <TableCell>{getTypeLabel(doc.type)}</TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(doc.createdAt).toLocaleDateString("es-MX", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {doc.finalizedAt ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {new Date(doc.finalizedAt).toLocaleDateString("es-MX", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDocument(doc.id)}
                            title="Vista previa"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {doc.pdfUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPDF(doc.pdfUrl!, doc.folio)}
                              title="Descargar PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
