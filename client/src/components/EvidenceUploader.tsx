/**
 * EvidenceUploader.tsx
 * Componente drag-and-drop para subir evidencias a una acción NOM-035.
 * Soporta múltiples archivos, validación de tipo/tamaño y muestra progreso.
 */
import { useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import {
  Upload,
  X,
  FileText,
  Image,
  File,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";

const TIPO_EVIDENCIA_LABELS: Record<string, string> = {
  acta_capacitacion: "Acta de Capacitación",
  registro_fotografico: "Registro Fotográfico",
  correo_electronico: "Correo Electrónico",
  lista_asistencia: "Lista de Asistencia",
  comunicado_interno: "Comunicado Interno",
  captura_pantalla: "Captura de Pantalla",
  acta_reunion: "Acta de Reunión",
  contrato_servicio: "Contrato de Servicio",
  politica_firmada: "Política Firmada",
  otro: "Otro",
};

const MAX_FILE_SIZE = 16 * 1024 * 1024; // 16 MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
  "text/plain",
];

interface FileItem {
  file: File;
  id: string;
  status: "pending" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
  tipoEvidencia: string;
  descripcion: string;
}

interface EvidenceUploaderProps {
  actionId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function getFileIcon(type: string) {
  if (type.startsWith("image/"))
    return <Image className="h-5 w-5 text-blue-500" />;
  if (type === "application/pdf")
    return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-gray-500" />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function EvidenceUploader({
  actionId,
  onSuccess,
  onCancel,
}: EvidenceUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const registerEvidence = trpc.nom035Matrix.registerEvidence.useMutation();

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles: FileItem[] = [];
    for (const file of newFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Archivo muy grande",
          description: `${file.name} supera el límite de 16 MB.`,
          variant: "destructive",
        });
        continue;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: "Tipo no permitido",
          description: `${file.name} no es un tipo de archivo soportado.`,
          variant: "destructive",
        });
        continue;
      }
      validFiles.push({
        file,
        id: Math.random().toString(36).substring(2),
        status: "pending",
        progress: 0,
        tipoEvidencia: "otro",
        descripcion: "",
      });
    }
    setFiles(prev => [...prev, ...validFiles]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const updateFile = (id: string, updates: Partial<FileItem>) => {
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f)));
  };

  const uploadAll = async () => {
    const pendingFiles = files.filter(f => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (const item of pendingFiles) {
      updateFile(item.id, { status: "uploading", progress: 10 });
      try {
        // 1. Subir el archivo al endpoint /api/upload
        const formData = new FormData();
        formData.append("file", item.file);
        formData.append("folder", "nom035-evidences");

        updateFile(item.id, { progress: 30 });

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error(`Error al subir: ${uploadRes.statusText}`);
        }

        const uploadData = await uploadRes.json();
        const fileUrl = uploadData.url;
        const fileKey = uploadData.key;
        updateFile(item.id, { progress: 70 });

        // 2. Registrar metadatos en BD via tRPC
        await registerEvidence.mutateAsync({
          actionId,
          nombreArchivo: item.file.name,
          tipoArchivo: item.file.type,
          tamanoBytes: item.file.size,
          fileKey,
          fileUrl,
          descripcion: item.descripcion || undefined,
          tipoEvidencia: item.tipoEvidencia as any,
        });

        updateFile(item.id, { status: "done", progress: 100 });
        successCount++;
      } catch (err: any) {
        updateFile(item.id, {
          status: "error",
          error: err.message || "Error desconocido",
        });
      }
    }

    setIsUploading(false);

    if (successCount > 0) {
      toast({
        title: `${successCount} evidencia(s) subida(s)`,
        description: "Las evidencias se registraron correctamente.",
      });
      if (successCount === pendingFiles.length) {
        onSuccess?.();
      }
    }
  };

  const pendingCount = files.filter(f => f.status === "pending").length;
  const doneCount = files.filter(f => f.status === "done").length;

  return (
    <div className="space-y-4">
      {/* Zona de drop */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${
            isDragging
              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
              : "border-gray-300 dark:border-gray-600 hover:border-blue-400 hover:bg-gray-50 dark:hover:bg-gray-800/50"
          }
        `}
      >
        <Upload className="h-10 w-10 mx-auto mb-3 text-gray-400" />
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Arrastra archivos aquí o haz clic para seleccionar
        </p>
        <p className="text-xs text-gray-500 mt-1">
          PDF, Word, Excel, imágenes — máx. 16 MB por archivo
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ALLOWED_TYPES.join(",")}
          className="hidden"
          onChange={e => addFiles(Array.from(e.target.files || []))}
        />
      </div>

      {/* Lista de archivos */}
      {files.length > 0 && (
        <div className="space-y-3">
          {files.map(item => (
            <div
              key={item.id}
              className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getFileIcon(item.file.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">
                      {item.file.name}
                    </p>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-xs text-gray-500">
                        {formatBytes(item.file.size)}
                      </span>
                      {item.status === "done" && (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      )}
                      {item.status === "error" && (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )}
                      {item.status === "uploading" && (
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      )}
                      {item.status === "pending" && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            removeFile(item.id);
                          }}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {item.status === "uploading" && (
                    <Progress value={item.progress} className="h-1.5 mt-1" />
                  )}
                  {item.status === "error" && (
                    <p className="text-xs text-red-500 mt-1">{item.error}</p>
                  )}

                  {item.status === "pending" && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-500">
                          Tipo de evidencia
                        </Label>
                        <Select
                          value={item.tipoEvidencia}
                          onValueChange={val =>
                            updateFile(item.id, { tipoEvidencia: val })
                          }
                        >
                          <SelectTrigger className="h-7 text-xs mt-0.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(TIPO_EVIDENCIA_LABELS).map(
                              ([val, label]) => (
                                <SelectItem
                                  key={val}
                                  value={val}
                                  className="text-xs"
                                >
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">
                          Descripción (opcional)
                        </Label>
                        <Textarea
                          value={item.descripcion}
                          onChange={e =>
                            updateFile(item.id, { descripcion: e.target.value })
                          }
                          placeholder="Breve descripción..."
                          className="h-7 text-xs mt-0.5 resize-none"
                          rows={1}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-between pt-2">
        <div className="text-sm text-gray-500">
          {doneCount > 0 && (
            <Badge variant="secondary" className="mr-2">
              {doneCount} subida(s)
            </Badge>
          )}
          {pendingCount > 0 && (
            <Badge variant="outline">{pendingCount} pendiente(s)</Badge>
          )}
        </div>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isUploading}
            >
              Cancelar
            </Button>
          )}
          <Button
            size="sm"
            onClick={uploadAll}
            disabled={pendingCount === 0 || isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-1" />
                Subir {pendingCount > 0 ? `(${pendingCount})` : ""}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
