import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Download,
  Eye,
  Filter,
  Calendar,
  CheckSquare,
  Square,
  DownloadCloud,
} from "lucide-react";

/**
 * Galería de Documentos Formales NOM-035
 *
 * Características:
 * - Lista todos los documentos guardados
 * - Filtros por tipo, estado y fecha
 * - Descarga individual de PDFs
 * - Selección múltiple para descarga masiva
 * - Vista de detalles de documento
 */
export default function DocumentGallery() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDocs, setSelectedDocs] = useState<Set<number>>(new Set());

  // Obtener lista de documentos
  const { data: documents, isLoading } = trpc.documents.list.useQuery({
    type: typeFilter === "all" ? undefined : typeFilter,
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 100,
  });

  // Mutation para generar PDF
  const generateActaRecorridoPDF =
    trpc.documents.generateActaRecorridoPDF.useMutation();
  const generateActaFinalResultadosPDF =
    trpc.documents.generateActaFinalResultadosPDF.useMutation();

  const handleGeneratePDF = async (documentId: number, type: string) => {
    try {
      let result: any;
      if (type === "acta_recorrido") {
        result = await generateActaRecorridoPDF.mutateAsync(documentId);
      } else if (type === "acta_final_resultados") {
        result = await generateActaFinalResultadosPDF.mutateAsync(documentId);
      } else {
        alert("Tipo de documento no soportado para generación PDF");
        return;
      }

      if (result.pdfUrl) {
        // Abrir PDF en nueva pestaña
        window.open(result.pdfUrl, "_blank");
      }
    } catch (error) {
      alert("Error al generar PDF. Por favor intente nuevamente.");
    }
  };

  const handleDownloadPDF = (pdfUrl: string, folio: string) => {
    // Crear enlace temporal para descarga
    const link = document.createElement("a");
    link.href = pdfUrl;
    link.download = `${folio}.pdf`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSelectDoc = (docId: number) => {
    const newSelected = new Set(selectedDocs);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocs(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === documents?.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documents?.map((d: any) => d.id) || []));
    }
  };

  const handleBulkDownload = async () => {
    if (selectedDocs.size === 0) {
      alert("Por favor seleccione al menos un documento");
      return;
    }

    // Descargar cada PDF seleccionado
    for (const docId of Array.from(selectedDocs)) {
      const doc = documents?.find((d: any) => d.id === docId);
      if (doc && doc.pdfUrl) {
        handleDownloadPDF(doc.pdfUrl, doc.folio);
        // Pequeño delay para evitar bloqueo del navegador
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    alert(`${selectedDocs.size} documentos descargados exitosamente`);
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      acta_constitutiva: "Acta Constitutiva",
      funciones_comite: "Funciones del Comité",
      aceptacion_cargo: "Aceptación de Cargo",
      acta_recorrido: "Acta de Recorrido NOM-019",
      acta_final_resultados: "Acta Final de Resultados",
    };
    return labels[type] || type;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: "bg-yellow-100 text-yellow-800",
      final: "bg-green-100 text-green-800",
      archived: "bg-gray-100 text-gray-800",
    };
    const labels: Record<string, string> = {
      draft: "Borrador",
      final: "Final",
      archived: "Archivado",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {labels[status] || status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando documentos...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Galería de Documentos</h1>
        <p className="text-muted-foreground">
          Gestión centralizada de documentos formales NOM-035 STPS 2018
        </p>
      </div>

      {/* Filtros */}
      <Card className="p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Filtros</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtro por tipo */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Tipo de Documento
            </label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="acta_constitutiva">
                  Acta Constitutiva
                </SelectItem>
                <SelectItem value="funciones_comite">
                  Funciones del Comité
                </SelectItem>
                <SelectItem value="aceptacion_cargo">
                  Aceptación de Cargo
                </SelectItem>
                <SelectItem value="acta_recorrido">
                  Acta de Recorrido NOM-019
                </SelectItem>
                <SelectItem value="acta_final_resultados">
                  Acta Final de Resultados
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por estado */}
          <div>
            <label className="text-sm font-medium mb-2 block">Estado</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
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

          {/* Acciones masivas */}
          <div className="flex items-end">
            <Button
              onClick={handleBulkDownload}
              disabled={selectedDocs.size === 0}
              className="w-full"
            >
              <DownloadCloud className="w-4 h-4 mr-2" />
              Descargar Seleccionados ({selectedDocs.size})
            </Button>
          </div>
        </div>
      </Card>

      {/* Lista de documentos */}
      {documents && documents.length > 0 ? (
        <>
          {/* Botón de seleccionar todos */}
          <div className="mb-4 flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleSelectAll}>
              {selectedDocs.size === documents.length ? (
                <>
                  <CheckSquare className="w-4 h-4 mr-2" />
                  Deseleccionar Todos
                </>
              ) : (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Seleccionar Todos
                </>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              {documents.length} documento(s) encontrado(s)
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {documents.map((doc: any) => (
              <Card
                key={doc.id}
                className="p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Checkbox de selección */}
                  <button
                    onClick={() => toggleSelectDoc(doc.id)}
                    className="mt-1"
                  >
                    {selectedDocs.has(doc.id) ? (
                      <CheckSquare className="w-6 h-6 text-primary" />
                    ) : (
                      <Square className="w-6 h-6 text-muted-foreground" />
                    )}
                  </button>

                  {/* Icono de documento */}
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                  </div>

                  {/* Información del documento */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">
                          {doc.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {getDocumentTypeLabel(doc.type)}
                        </p>
                      </div>
                      {getStatusBadge(doc.status)}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <FileText className="w-4 h-4" />
                        Folio: {doc.folio}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(doc.createdAt).toLocaleDateString("es-MX")}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2">
                      {doc.pdfUrl ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleDownloadPDF(doc.pdfUrl!, doc.folio)
                          }
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Descargar PDF
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleGeneratePDF(doc.id, doc.type)}
                          disabled={
                            generateActaRecorridoPDF.isPending ||
                            generateActaFinalResultadosPDF.isPending
                          }
                        >
                          <Download className="w-4 h-4 mr-2" />
                          {generateActaRecorridoPDF.isPending ||
                          generateActaFinalResultadosPDF.isPending
                            ? "Generando..."
                            : "Generar PDF"}
                        </Button>
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // TODO: Implementar vista de detalles
                          alert("Vista de detalles próximamente");
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Detalles
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay documentos</h3>
            <p className="text-muted-foreground mb-4">
              No se encontraron documentos con los filtros seleccionados.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setTypeFilter("all");
                setStatusFilter("all");
              }}
            >
              Limpiar Filtros
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
