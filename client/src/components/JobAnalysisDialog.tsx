import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface JobAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function JobAnalysisDialog({ open, onOpenChange, onSuccess }: JobAnalysisDialogProps) {
  const [formData, setFormData] = useState({
    positionName: "",
    department: "",
    description: "",
    riskLevel: "low" as "low" | "medium" | "high" | "very_high",
  });

  const createMutation = trpc.jobPositions.create.useMutation({
    onSuccess: () => {
      toast.success("Análisis de puesto creado exitosamente");
      setFormData({
        positionName: "",
        department: "",
        description: "",
        riskLevel: "low",
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Error al crear análisis: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.positionName.trim()) {
      toast.error("El nombre del puesto es requerido");
      return;
    }

    createMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Análisis de Puesto</DialogTitle>
          <DialogDescription>
            Registra un nuevo puesto de trabajo para análisis de factores de riesgo psicosocial según NOM-035-STPS-2018
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre del Puesto */}
          <div className="space-y-2">
            <Label htmlFor="positionName">
              Nombre del Puesto <span className="text-destructive">*</span>
            </Label>
            <Input
              id="positionName"
              value={formData.positionName}
              onChange={(e) => setFormData({ ...formData, positionName: e.target.value })}
              placeholder="Ej: Gerente de Recursos Humanos"
              required
            />
          </div>

          {/* Departamento */}
          <div className="space-y-2">
            <Label htmlFor="department">Departamento</Label>
            <Input
              id="department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="Ej: Recursos Humanos"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción del Puesto</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe las responsabilidades principales, actividades y objetivos del puesto..."
              rows={4}
            />
          </div>

          {/* Nivel de Riesgo Inicial */}
          <div className="space-y-2">
            <Label htmlFor="riskLevel">Nivel de Riesgo Inicial</Label>
            <select
              id="riskLevel"
              value={formData.riskLevel}
              onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value as any })}
              className="w-full px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="low">Bajo</option>
              <option value="medium">Medio</option>
              <option value="high">Alto</option>
              <option value="very_high">Muy Alto</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Este nivel puede ajustarse posteriormente según la evaluación de factores de riesgo
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creando..." : "Crear Análisis"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
