import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Users, AlertTriangle, BarChart3 } from "lucide-react";

interface JobAnalysisDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const FACTOR_LABELS: Record<string, { label: string; description: string }> = {
  workload: {
    label: "Carga de Trabajo",
    description: "Exigencias que el trabajo impone al trabajador",
  },
  control: {
    label: "Control sobre el Trabajo",
    description: "Autonomía y toma de decisiones en el puesto",
  },
  leadership: {
    label: "Liderazgo",
    description: "Relación con superiores y estilo de mando",
  },
  relationships: {
    label: "Relaciones en el Trabajo",
    description: "Interacciones con compañeros y clima laboral",
  },
  workEnvironment: {
    label: "Ambiente de Trabajo",
    description: "Condiciones físicas y entorno organizacional",
  },
};

function factorColor(value: number) {
  if (value >= 4) return "text-red-600";
  if (value >= 3) return "text-yellow-600";
  return "text-green-600";
}

function factorBg(value: number) {
  if (value >= 4) return "bg-red-50 border-red-200";
  if (value >= 3) return "bg-yellow-50 border-yellow-200";
  return "bg-green-50 border-green-200";
}

const LEVEL_LABELS: Record<number, string> = {
  1: "Muy Bajo",
  2: "Bajo",
  3: "Medio",
  4: "Alto",
  5: "Muy Alto",
};

export function JobAnalysisDialog({
  open,
  onOpenChange,
  onSuccess,
}: JobAnalysisDialogProps) {
  const [formData, setFormData] = useState({
    positionName: "",
    department: "",
    description: "",
    riskLevel: "low" as "low" | "medium" | "high" | "very_high",
    employeeCount: 0,
  });

  const [factors, setFactors] = useState({
    workload: 2,
    control: 3,
    leadership: 3,
    relationships: 3,
    workEnvironment: 3,
  });

  const avgIndex =
    Math.round(
      ((factors.workload +
        factors.control +
        factors.leadership +
        factors.relationships +
        factors.workEnvironment) /
        5) *
        10
    ) / 10;

  const createMutation = trpc.jobPositions.create.useMutation({
    onSuccess: () => {
      toast.success("Análisis de puesto creado exitosamente");
      setFormData({
        positionName: "",
        department: "",
        description: "",
        riskLevel: "low",
        employeeCount: 0,
      });
      setFactors({
        workload: 2,
        control: 3,
        leadership: 3,
        relationships: 3,
        workEnvironment: 3,
      });
      onOpenChange(false);
      onSuccess?.();
    },
    onError: error => {
      toast.error(`Error al crear análisis: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.positionName.trim()) {
      toast.error("El nombre del puesto es requerido");
      return;
    }
    createMutation.mutate({ ...formData, factors });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Análisis de Puesto</DialogTitle>
          <DialogDescription>
            Registra un nuevo puesto de trabajo para análisis de factores de
            riesgo psicosocial según NOM-035-STPS-2018
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Nombre del Puesto ─────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="positionName">
              Nombre del Puesto <span className="text-destructive">*</span>
            </Label>
            <Input
              id="positionName"
              value={formData.positionName}
              onChange={e =>
                setFormData({ ...formData, positionName: e.target.value })
              }
              placeholder="Ej: Gerente de Recursos Humanos"
              required
            />
          </div>

          {/* ── Departamento + Empleados ──────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Departamento</Label>
              <Input
                id="department"
                value={formData.department}
                onChange={e =>
                  setFormData({ ...formData, department: e.target.value })
                }
                placeholder="Ej: Recursos Humanos"
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="employeeCount"
                className="flex items-center gap-1.5"
              >
                <Users className="h-3.5 w-3.5 text-blue-500" />
                Número de Empleados
              </Label>
              <Input
                id="employeeCount"
                type="number"
                min={0}
                value={formData.employeeCount}
                onChange={e =>
                  setFormData({
                    ...formData,
                    employeeCount: Math.max(0, parseInt(e.target.value) || 0),
                  })
                }
                placeholder="0"
              />
            </div>
          </div>

          {/* ── Descripción ───────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción del Puesto</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe las responsabilidades principales, actividades y objetivos del puesto..."
              rows={3}
            />
          </div>

          {/* ── Nivel de Riesgo ───────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="riskLevel" className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
              Nivel de Riesgo Inicial
            </Label>
            <select
              id="riskLevel"
              value={formData.riskLevel}
              onChange={e =>
                setFormData({ ...formData, riskLevel: e.target.value as any })
              }
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-sm"
            >
              <option value="low">Bajo</option>
              <option value="medium">Medio</option>
              <option value="high">Alto</option>
              <option value="very_high">Muy Alto</option>
            </select>
            <p className="text-xs text-muted-foreground">
              Este nivel puede ajustarse según la evaluación de factores de
              riesgo
            </p>
          </div>

          {/* ── Factores Psicosociales ────────────────────────────────────── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                Factores de Riesgo Psicosocial
              </Label>
              <span className={`text-sm font-bold ${factorColor(avgIndex)}`}>
                Índice: {avgIndex}/5
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Evalúa cada factor en escala 1 (muy bajo) a 5 (muy alto). Valores
              ≥ 4 indican riesgo elevado.
            </p>

            <div className="space-y-3">
              {(Object.keys(factors) as Array<keyof typeof factors>).map(
                key => (
                  <div
                    key={key}
                    className={`rounded-lg border p-3 ${factorBg(factors[key])}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">
                          {FACTOR_LABELS[key].label}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {FACTOR_LABELS[key].description}
                        </p>
                      </div>
                      <span
                        className={`text-sm font-bold min-w-[80px] text-right ${factorColor(factors[key])}`}
                      >
                        {factors[key]}/5 — {LEVEL_LABELS[factors[key]]}
                      </span>
                    </div>
                    <Slider
                      min={1}
                      max={5}
                      step={1}
                      value={[factors[key]]}
                      onValueChange={([v]) =>
                        setFactors({ ...factors, [key]: v })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between mt-1">
                      {[1, 2, 3, 4, 5].map(n => (
                        <span key={n} className="text-xs text-muted-foreground">
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
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
