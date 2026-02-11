import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";

interface FileUploadProps {
  label: string;
  accept?: string; // e.g., "image/*" or ".pdf"
  currentFileUrl?: string;
  onFileSelect: (file: File) => void;
  onFileRemove?: () => void;
}

export default function FileUpload({
  label,
  accept = "*/*",
  currentFileUrl,
  onFileSelect,
  onFileRemove,
}: FileUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentFileUrl || null);
  const [fileName, setFileName] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    onFileSelect(file);

    // Generar preview para imágenes
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setFileName("");
    if (onFileRemove) {
      onFileRemove();
    }
  };

  const isImage = preview && (preview.startsWith("data:image") || preview.includes("/uploads/") || preview.includes("/storage/"));
  const isPDF = fileName.endsWith(".pdf") || currentFileUrl?.endsWith(".pdf");

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      
      {/* Preview o estado actual */}
      {(preview || currentFileUrl) ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isImage ? (
                  <img
                    src={preview || currentFileUrl}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded"
                  />
                ) : isPDF ? (
                  <div className="flex items-center gap-2">
                    <FileText className="h-8 w-8 text-red-500" />
                    <span className="text-sm">{fileName || "Archivo PDF"}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <FileText className="h-8 w-8 text-gray-500" />
                    <span className="text-sm">{fileName || "Archivo"}</span>
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <input
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="hidden"
            id={`file-upload-${label.replace(/\s/g, "-")}`}
          />
          <label
            htmlFor={`file-upload-${label.replace(/\s/g, "-")}`}
            className="cursor-pointer flex flex-col items-center gap-2"
          >
            {accept.includes("image") ? (
              <ImageIcon className="h-10 w-10 text-gray-400" />
            ) : (
              <Upload className="h-10 w-10 text-gray-400" />
            )}
            <span className="text-sm text-gray-600">
              Haz clic para seleccionar archivo
            </span>
            <span className="text-xs text-gray-500">
              {accept === "image/*" ? "Imágenes (JPG, PNG)" : accept === ".pdf" ? "Archivos PDF" : "Cualquier archivo"}
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
