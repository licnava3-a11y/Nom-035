import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Upload, File, X } from "lucide-react";
import { toast } from "sonner";

interface ResourceUploadProps {
  onUploadComplete: (fileData: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }) => void;
  acceptedTypes?: string;
  maxSize?: number; // in MB
}

export function ResourceUpload({
  onUploadComplete,
  acceptedTypes = ".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.xls",
  maxSize = 10,
}: ResourceUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSize) {
      toast.error(`El archivo excede el tamaño máximo de ${maxSize}MB`);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Por favor selecciona un archivo");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Create form data
      const formData = new FormData();
      formData.append("file", selectedFile);

      // Upload to server
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error("Error al subir el archivo");
      }

      const data = await response.json();
      setProgress(100);

      // Call callback with file data
      onUploadComplete({
        fileName: selectedFile.name,
        fileUrl: data.url,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
      });

      toast.success("Archivo subido exitosamente");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir el archivo");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="file-upload">Seleccionar Archivo</Label>
        <div className="flex items-center gap-2">
          <Input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            accept={acceptedTypes}
            onChange={handleFileSelect}
            disabled={uploading}
            className="flex-1"
          />
          {selectedFile && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleRemove}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Formatos aceptados: {acceptedTypes}. Tamaño máximo: {maxSize}MB
        </p>
      </div>

      {selectedFile && (
        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded">
              <File className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>

          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subiendo...</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {!uploading && (
            <Button onClick={handleUpload} className="w-full">
              <Upload className="h-4 w-4 mr-2" />
              Subir Archivo
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
