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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: {
    id: number;
    title: string;
    description: string;
    duration: number;
    category: string;
    level: string;
    status: string;
  };
}

export function CourseDialog({ open, onOpenChange, course }: CourseDialogProps) {
  const [title, setTitle] = useState(course?.title || "");
  const [description, setDescription] = useState(course?.description || "");
  const [duration, setDuration] = useState(course?.duration?.toString() || "");
  const [category, setCategory] = useState<"fundamentos" | "categorias_dominios" | "mobbing" | "burnout" | "protocolos" | "comite" | "analisis_puestos" | "otros">(course?.category as any || "fundamentos");
  const [level, setLevel] = useState<"basico" | "intermedio" | "avanzado">(course?.level as any || "basico");
  const [status, setStatus] = useState<"draft" | "published" | "archived">(course?.status as any || "draft");

  const utils = trpc.useUtils();
  const createMutation = trpc.courses.create.useMutation({
    onSuccess: () => {
      toast.success("Curso creado exitosamente");
      utils.courses.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error al crear el curso: ${error.message}`);
    },
  });

  const updateMutation = trpc.courses.update.useMutation({
    onSuccess: () => {
      toast.success("Curso actualizado exitosamente");
      utils.courses.list.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Error al actualizar el curso: ${error.message}`);
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setDuration("");
    setCategory("fundamentos");
    setLevel("basico");
    setStatus("draft");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("El título es requerido");
      return;
    }

    if (!description.trim()) {
      toast.error("La descripción es requerida");
      return;
    }

    if (!duration || parseInt(duration) <= 0) {
      toast.error("La duración debe ser mayor a 0");
      return;
    }

    const courseData = {
      title: title.trim(),
      description: description.trim(),
      duration: parseInt(duration),
      category,
      level,
      status,
    };

    if (course) {
      updateMutation.mutate({ id: course.id, ...courseData });
    } else {
      createMutation.mutate(courseData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{course ? "Editar Curso" : "Crear Nuevo Curso"}</DialogTitle>
            <DialogDescription>
              {course
                ? "Modifica la información del curso existente"
                : "Completa la información para crear un nuevo curso de capacitación"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título del Curso *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Fundamentos de la NOM-035 STPS 2018"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe los objetivos y contenido del curso"
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration">Duración (horas) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="1"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="Ej: 8"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoría *</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as any)}>
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fundamentos">Fundamentos NOM-035</SelectItem>
                    <SelectItem value="mobbing">Mobbing y Acoso Laboral</SelectItem>
                    <SelectItem value="burnout">Prevención del Burnout</SelectItem>
                    <SelectItem value="comite">Comité de Atención</SelectItem>
                    <SelectItem value="protocolos">Protocolos de Intervención</SelectItem>
                    <SelectItem value="evaluacion">Evaluación de Riesgos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="level">Nivel *</Label>
                <Select value={level} onValueChange={(value) => setLevel(value as any)}>
                  <SelectTrigger id="level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basico">Básico</SelectItem>
                    <SelectItem value="intermedio">Intermedio</SelectItem>
                    <SelectItem value="avanzado">Avanzado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Estado *</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as any)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Borrador</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="archived">Archivado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                if (!course) resetForm();
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
                : course
                ? "Actualizar"
                : "Crear Curso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
