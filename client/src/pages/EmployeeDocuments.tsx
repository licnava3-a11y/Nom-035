import { useState, useEffect } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useParams, useLocation } from "wouter";
import { useDropzone } from "react-dropzone";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Image,
  FileCheck,
  AlertCircle,
  X,
  Eye,
  Download,
  Trash2,
} from "lucide-react";

const DOCUMENT_TYPES = [
  { value: "ine", label: "INE" },
  { value: "curp_document", label: "CURP" },
  { value: "rfc_document", label: "RFC" },
  { value: "nss_document", label: "NSS" },
  { value: "birth_certificate", label: "Acta de Nacimiento" },
  { value: "proof_of_address", label: "Comprobante de Domicilio" },
  { value: "contract", label: "Contrato" },
  { value: "job_offer", label: "Oferta de Trabajo" },
  { value: "resignation", label: "Renuncia" },
  { value: "termination", label: "Terminación" },
  { value: "recommendation", label: "Carta de Recomendación" },
  { value: "diploma", label: "Diploma" },
  { value: "certificate", label: "Certificado" },
  { value: "medical_exam", label: "Examen Médico" },
  { value: "background_check", label: "Carta de Antecedentes" },
  { value: "other", label: "Otro" },
];

export default function EmployeeDocuments() {
  const { id } = useParams();
  const employeeId = parseInt(id || "0");
  const [, navigate] = useLocation();
  const [selectedType, setSelectedType] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const [viewerDocument, setViewerDocument] = useState<{
    url: string;
    type: string;
  } | null>(null);

  const {
    data: documents,
    isLoading,
    refetch,
  } = trpc.employeeDocuments.list.useQuery({ employeeId });
  const { data: missingDocs } = trpc.employeeDocuments.getMissing.useQuery({
    employeeId,
  });
  const uploadMutation = trpc.employeeDocuments.upload.useMutation({
    onSuccess: () => {
      toast.success("Documento subido exitosamente");
      refetch();
      setSelectedType("");
    },
    onError: error => {
      toast.error(`Error al subir documento: ${error.message}`);
    },
  });
  const deleteMutation = trpc.employeeDocuments.delete.useMutation({
    onSuccess: () => {
      toast.success("Documento eliminado");
      refetch();
    },
    onError: error => {
      toast.error(`Error al eliminar documento: ${error.message}`);
    },
  });

  const onDrop = async (acceptedFiles: File[]) => {
    if (!selectedType) {
      toast.error("Por favor selecciona un tipo de documento");
      return;
    }

    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      toast.error("El archivo es demasiado grande. Máximo 10MB");
      return;
    }

    // Convertir archivo a base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(",")[1]; // Remover prefijo data:...;base64,

      uploadMutation.mutate({
        employeeId,
        documentType: selectedType as
          | "ine"
          | "curp_document"
          | "rfc_document"
          | "nss_document"
          | "birth_certificate"
          | "proof_of_address"
          | "contract"
          | "job_offer"
          | "resignation"
          | "termination"
          | "recommendation"
          | "diploma"
          | "certificate"
          | "medical_exam"
          | "background_check"
          | "other",
        fileName: file.name,
        fileData: base64Data,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
    maxFiles: 1,
  });

  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const handleDelete = (documentId: number, documentName: string) => {
    setDeleteConfirm({ id: documentId, name: documentName });
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteMutation.mutate({ documentId: deleteConfirm.id });
      setDeleteConfirm(null);
    }
  };

  const handleView = (url: string, mimeType: string) => {
    setViewerDocument({ url, type: mimeType });
  };

  const filteredDocuments = documents?.filter((doc: any) =>
    filterType === "all" ? true : doc.documentType === filterType
  );

  if (isLoading) {
    return (
      <div className="container py-8">
        <p>Cargando documentos...</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Expediente Electrónico</h1>
          <p className="text-muted-foreground">
            Gestión de documentos del trabajador
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/employees/${employeeId}`)}
        >
          Volver al Trabajador
        </Button>
      </div>

      {/* Alertas de documentos faltantes */}
      {missingDocs && missingDocs.length > 0 && (
        <Card className="p-4 mb-6 border-amber-500 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900">
                Documentos Faltantes
              </h3>
              <p className="text-sm text-amber-700 mt-1">
                Los siguientes documentos no han sido cargados:{" "}
                {missingDocs
                  .map(
                    (doc: any) =>
                      DOCUMENT_TYPES.find((t: any) => t.value === doc)?.label ||
                      doc
                  )
                  .join(", ")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Zona de carga */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Subir Documento</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Tipo de Documento
            </label>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo..." />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type: any) => (
                  <SelectItem key={`doc-type-${type.value}`} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            } ${!selectedType ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <input {...getInputProps()} disabled={!selectedType} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg font-medium">Suelta el archivo aquí...</p>
            ) : (
              <>
                <p className="text-lg font-medium mb-2">
                  Arrastra un archivo aquí o haz clic para seleccionar
                </p>
                <p className="text-sm text-muted-foreground">
                  Formatos: PDF, DOC, DOCX, JPG, PNG (máx. 10MB)
                </p>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Filtro y lista de documentos */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Documentos Cargados</h2>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Filtrar:</label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {DOCUMENT_TYPES.map((type: any) => (
                  <SelectItem key={`filter-${type.value}`} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredDocuments && filteredDocuments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Nombre del Archivo</th>
                  <th className="text-left p-3">Tamaño</th>
                  <th className="text-left p-3">Fecha de Carga</th>
                  <th className="text-right p-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc: any) => (
                  <tr key={doc.id} className="border-b hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {doc.mimeType?.startsWith("image/") ? (
                          <Image className="h-4 w-4 text-blue-600" />
                        ) : (
                          <FileText className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium">
                          {DOCUMENT_TYPES.find(
                            (t: any) => t.value === doc.documentType
                          )?.label || doc.documentType}
                        </span>
                      </div>
                    </td>
                    <td className="p-3">{doc.fileName}</td>
                    <td className="p-3">
                      {doc.fileSize
                        ? (doc.fileSize / 1024).toFixed(1) + " KB"
                        : "N/A"}
                    </td>
                    <td className="p-3">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleView(doc.fileUrl, doc.mimeType || "")
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(doc.fileUrl, "_blank")}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doc.id, doc.documentType)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <FileCheck className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p>No hay documentos cargados</p>
          </div>
        )}
      </Card>

      {/* Visualizador de documentos */}
      {viewerDocument && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                Visualizador de Documentos
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewerDocument(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {viewerDocument.type.startsWith("image/") ? (
                <img
                  src={viewerDocument.url}
                  alt="Documento"
                  className="max-w-full mx-auto"
                />
              ) : viewerDocument.type === "application/pdf" ? (
                <iframe
                  src={viewerDocument.url}
                  className="w-full h-full min-h-[600px]"
                  title="PDF Viewer"
                />
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground mb-4">
                    No se puede previsualizar este tipo de archivo
                  </p>
                  <Button
                    onClick={() => window.open(viewerDocument.url, "_blank")}
                  >
                    Descargar Archivo
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={open => !open && setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Eliminar Documento"
        description={`¿Estás seguro de eliminar el documento "${deleteConfirm?.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        cancelText="Cancelar"
      />
    </div>
  );
}
