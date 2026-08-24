import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// Select components replaced with native HTML elements
import { ResourceUpload } from "./ResourceUpload";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource?: {
    id: number;
    title: string;
    description: string;
    category: string;
    fileUrl: string;
    fileType: string;
  };
}

export function ResourceDialog({
  open,
  onOpenChange,
  resource,
}: ResourceDialogProps) {
  const [title, setTitle] = useState(resource?.title || "");
  const [description, setDescription] = useState(resource?.description || "");
  const [category, setCategory] = useState<
    "manual" | "protocol" | "form" | "pdf" | "presentation" | "other"
  >((resource?.category as any) || "manual");
  const [fileUrl, setFileUrl] = useState(resource?.fileUrl || "");
  const [fileType, setFileType] = useState(resource?.fileType || "");

  const utils = trpc.useUtils();
  const createMutation = trpc.resources.create.useMutation({
    onSuccess: () => {
      toast.success("Recurso creado exitosamente");
      utils.resources.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: error => {
      toast.error(`Error al crear el recurso: ${error.message}`);
    },
  });

  const updateMutation = trpc.resources.update.useMutation({
    onSuccess: () => {
      toast.success("Recurso actualizado exitosamente");
      utils.resources.list.invalidate();
      onOpenChange(false);
    },
    onError: error => {
      toast.error(`Error al actualizar el recurso: ${error.message}`);
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("manual");
    setFileUrl("");
    setFileType("");
  };

  const handleUploadComplete = (fileData: {
    fileName: string;
    fileUrl: string;
    fileType: string;
    fileSize: number;
  }) => {
    setFileUrl(fileData.fileUrl);
    setFileType(fileData.fileType);
    if (!title) {
      setTitle(fileData.fileName);
    }
    toast.success("Archivo cargado correctamente");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("El título es requerido");
      return;
    }

    if (!fileUrl && !resource) {
      toast.error("Debes subir un archivo");
      return;
    }

    const resourceData = {
      title: title.trim(),
      description: description.trim() || undefined,
      category,
      fileUrl: fileUrl || resource?.fileUrl || "",
      fileType: fileType || resource?.fileType || "",
    };

    if (resource) {
      updateMutation.mutate({ id: resource.id, ...resourceData });
    } else {
      createMutation.mutate(resourceData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {resource ? "Editar Recurso" : "Crear Nuevo Recurso"}
            </DialogTitle>
            <DialogDescription>
              {resource
                ? "Modifica la información del recurso existente"
                : "Sube un documento y completa la información"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {!resource && (
              <ResourceUpload
                onUploadComplete={handleUploadComplete}
                acceptedTypes=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.xls"
                maxSize={10}
              />
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Título del Recurso *</Label>
              <Input
                id="title"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ej: Manual del Implementador NOM-035"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe el contenido del recurso"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoría *</Label>
              <select
                id="category"
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="manual">Manual</option>
                <option value="protocol">Protocolo</option>
                <option value="form">Formato</option>
                <option value="pdf">PDF</option>
                <option value="presentation">Presentación</option>
                <option value="other">Otro</option>
              </select>
            </div>

            {fileUrl && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Archivo:{" "}
                  <span className="font-medium text-foreground">
                    {title || "Archivo cargado"}
                  </span>
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                if (!resource) resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Guardando..."
                : resource
                  ? "Actualizar"
                  : "Crear Recurso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
