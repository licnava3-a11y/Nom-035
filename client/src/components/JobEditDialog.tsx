import { useState, useEffect } from "react";
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
import { Users, AlertTriangle, BarChart3, Zap } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FactorValues {
  workload: number;
  control: number;
  leadership: number;
  relationships: number;
  workEnvironment: number;
}

interface JobEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  position: {
    id: number;
    title: string;
    department: string;
    description?: string;
    riskLevel: "low" | "medium" | "high" | "very_high";
    employees: number;
    factors: FactorValues;
  } | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const FACTOR_META: Record<
  keyof FactorValues,
  { label: string; description: string }
> = {
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

const LEVEL_LABELS: Record<number, string> = {
  1: "Muy Bajo",
  2: "Bajo",
  3: "Medio",
  4: "Alto",
  5: "Muy Alto",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function calcAvg(f: FactorValues) {
  return (
    Math.round(
      ((f.workload +
        f.control +
        f.leadership +
        f.relationships +
        f.workEnvironment) /
        5) *
        10
    ) / 10
  );
}

function indexToRisk(idx: number): "low" | "medium" | "high" | "very_high" {
  if (idx >= 4.5) return "very_high";
  if (idx >= 3.5) return "high";
  if (idx >= 2.5) return "medium";
  return "low";
}

const RISK_LABELS: Record<string, string> = {
  low: "Bajo",
  medium: "Medio",
  high: "Alto",
  very_high: "Muy Alto",
};

const RISK_COLORS: Record<string, string> = {
  low: "text-green-600",
  medium: "text-yellow-600",
  high: "text-red-500",
  very_high: "text-red-700",
};

function factorBg(value: number) {
  if (value >= 4) return "bg-red-50 border-red-200";
  if (value >= 3) return "bg-yellow-50 border-yellow-200";
  return "bg-green-50 border-green-200";
}

function factorColor(value: number) {
  if (value >= 4) return "text-red-600";
  if (value >= 3) return "text-yellow-600";
  return "text-green-600";
}

// ── Component ─────────────────────────────────────────────────────────────────
export function JobEditDialog({
  open,
  onOpenChange,
  onSuccess,
  position,
}: JobEditDialogProps) {
  const [formData, setFormData] = useState({
    positionName: "",
    department: "",
    description: "",
    notes: "",
    riskLevel: "low" as "low" | "medium" | "high" | "very_high",
    employeeCount: 0,
    autoRisk: true,
  });

  const [factors, setFactors] = useState<FactorValues>({
    workload: 2,
    control: 3,
    leadership: 3,
    relationships: 3,
    workEnvironment: 3,
  });

  // Preload data when position changes
  useEffect(() => {
    if (position && open) {
      setFormData({
        positionName: position.title,
        department: position.department || "",
        description: position.description || "",
        notes: "",
        riskLevel: position.riskLevel,
        employeeCount: position.employees,
        autoRisk: true,
      });
      setFactors({ ...position.factors });
    }
  }, [position, open]);

  // Auto-update riskLevel when factors change (if autoRisk is on)
  const avgIndex = calcAvg(factors);
  const autoRiskLevel = indexToRisk(avgIndex);

  useEffect(() => {
    if (formData.autoRisk) {
      setFormData(prev => ({ ...prev, riskLevel: autoRiskLevel }));
    }
  }, [autoRiskLevel, formData.autoRisk]);

  const utils = trpc.useUtils();
  const updateMutation = trpc.jobPositions.update.useMutation({
    onSuccess: () => {
      toast.success("Puesto actualizado y análisis guardado en historial");
      utils.jobPositions.list.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: error => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!position) return;
    if (!formData.positionName.trim()) {
      toast.error("El nombre del puesto es requerido");
      return;
    }
    updateMutation.mutate({
      id: position.id,
      positionName: formData.positionName,
      department: formData.department,
      description: formData.description,
      analysisNotes: formData.notes,
      riskLevel: formData.riskLevel,
      employeeCount: formData.employeeCount,
      factors,
    });
  };

  if (!position) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Actualizar Análisis de Puesto</DialogTitle>
          <DialogDescription>
            Modifica los datos y factores de riesgo psicosocial. El historial se
            actualiza automáticamente al guardar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ── Nombre + Departamento ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-positionName">
                Nombre del Puesto <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-positionName"
                value={formData.positionName}
                onChange={e =>
                  setFormData({ ...formData, positionName: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-department">Departamento</Label>
              <Input
                id="edit-department"
                value={formData.department}
                onChange={e =>
                  setFormData({ ...formData, department: e.target.value })
                }
              />
            </div>
          </div>

          {/* ── Empleados ─────────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label
              htmlFor="edit-employeeCount"
              className="flex items-center gap-1.5"
            >
              <Users className="h-3.5 w-3.5 text-blue-500" />
              Número de Empleados Asignados
            </Label>
            <Input
              id="edit-employeeCount"
              type="number"
              min={0}
              value={formData.employeeCount}
              onChange={e =>
                setFormData({
                  ...formData,
                  employeeCount: Math.max(0, parseInt(e.target.value) || 0),
                })
              }
            />
          </div>

          {/* ── Descripción ───────────────────────────────────────────────── */}
          <div className="space-y-2">
            <Label htmlFor="edit-description">Descripción del Puesto</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* Observaciones del análisis */}
          <div className="space-y-2">
            <Label htmlFor="edit-notes">
              Observaciones del Análisis
              <span className="text-xs text-muted-foreground font-normal ml-1">
                (opcional — se guardará en el historial)
              </span>
            </Label>
            <Textarea
              id="edit-notes"
              placeholder="Describe el contexto de este análisis, cambios relevantes en el puesto, acciones tomadas, etc."
              value={formData.notes}
              onChange={e =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
            />
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

            <div className="space-y-3">
              {(Object.keys(factors) as Array<keyof FactorValues>).map(key => (
                <div
                  key={key}
                  className={`rounded-lg border p-3 ${factorBg(factors[key])}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-medium">
                        {FACTOR_META[key].label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {FACTOR_META[key].description}
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
              ))}
            </div>
          </div>

          {/* ── Nivel de Riesgo (auto o manual) ──────────────────────────── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label
                htmlFor="edit-riskLevel"
                className="flex items-center gap-1.5"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                Nivel de Riesgo
              </Label>
              <button
                type="button"
                onClick={() =>
                  setFormData(p => ({ ...p, autoRisk: !p.autoRisk }))
                }
                className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border transition-colors ${
                  formData.autoRisk
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "bg-muted border-muted-foreground/20 text-muted-foreground"
                }`}
              >
                <Zap className="h-3 w-3" />
                {formData.autoRisk ? "Automático activado" : "Manual"}
              </button>
            </div>

            {formData.autoRisk ? (
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-md border bg-muted/30`}
              >
                <span className="text-sm text-muted-foreground">
                  Calculado automáticamente:
                </span>
                <span
                  className={`text-sm font-bold ${RISK_COLORS[formData.riskLevel]}`}
                >
                  {RISK_LABELS[formData.riskLevel]}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  (índice {avgIndex} → umbral{" "}
                  {avgIndex >= 4.5
                    ? "≥4.5"
                    : avgIndex >= 3.5
                      ? "≥3.5"
                      : avgIndex >= 2.5
                        ? "≥2.5"
                        : "<2.5"}
                  )
                </span>
              </div>
            ) : (
              <select
                id="edit-riskLevel"
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
            )}
            <p className="text-xs text-muted-foreground">
              Umbrales: Bajo &lt;2.5 · Medio 2.5–3.5 · Alto 3.5–4.5 · Muy Alto
              ≥4.5
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Guardando..." : "Guardar Análisis"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
