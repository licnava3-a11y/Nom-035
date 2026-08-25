import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FieldType =
  | "chiefComplaint"
  | "medicalHistory"
  | "personalHistory"
  | "familyHistory"
  | "treatmentPlan"
  | "sessionNote"
  | "therapeuticObjectives"
  | "psychometricInterpretation";

interface AIFieldAssistantProps {
  fieldType: FieldType;
  currentValue?: string;
  onApply: (text: string) => void;
  patientAge?: number;
  patientGender?: string;
  diagnosisContext?: string;
  className?: string;
}

const fieldLabels: Record<FieldType, string> = {
  chiefComplaint: "Motivo de consulta",
  medicalHistory: "Antecedentes médicos",
  personalHistory: "Antecedentes personales",
  familyHistory: "Antecedentes familiares",
  treatmentPlan: "Plan de tratamiento",
  sessionNote: "Nota de sesión",
  therapeuticObjectives: "Objetivos terapéuticos",
  psychometricInterpretation: "Interpretación psicométrica",
};

export function AIFieldAssistant({
  fieldType,
  currentValue,
  onApply,
  patientAge,
  patientGender,
  diagnosisContext,
  className,
}: AIFieldAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const suggestMutation = trpc.clinicalRecords.suggestFieldContent.useMutation({
    onSuccess: data => {
      setSuggestions(data.suggestions);
      setSelectedIndex(null);
      setIsOpen(true);
    },
    onError: err => {
      toast.error("Error al generar sugerencias: " + err.message);
    },
  });

  const handleGenerate = () => {
    suggestMutation.mutate({
      fieldType,
      context: currentValue,
      patientAge,
      patientGender,
      diagnosisContext,
    });
  };

  const handleApply = (index: number) => {
    setSelectedIndex(index);
    onApply(suggestions[index]);
    toast.success("Sugerencia aplicada. Puedes editarla libremente.");
    setIsOpen(false);
  };

  return (
    <div className={cn("mt-1", className)}>
      {/* Trigger button */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={suggestMutation.isPending}
          className="h-7 text-xs gap-1.5 text-purple-600 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
        >
          {suggestMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          {suggestMutation.isPending ? "Generando..." : "Sugerir con IA"}
        </Button>

        {suggestions.length > 0 && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
          >
            {isOpen ? (
              <>
                <ChevronUp className="h-3 w-3" /> Ocultar sugerencias
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Ver {suggestions.length}{" "}
                sugerencias
              </>
            )}
          </button>
        )}
      </div>

      {/* Suggestions panel */}
      {isOpen && suggestions.length > 0 && (
        <div className="mt-2 border border-purple-100 rounded-lg bg-purple-50/40 p-3 space-y-2">
          <p className="text-xs font-medium text-purple-700 mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Sugerencias de IA para "{fieldLabels[fieldType]}" — Selecciona una
            para aplicar
          </p>
          {suggestions.map((suggestion, i) => (
            <div
              key={i}
              className={cn(
                "relative rounded-md border bg-white p-3 text-sm cursor-pointer transition-all",
                selectedIndex === i
                  ? "border-purple-400 ring-1 ring-purple-300"
                  : "border-gray-200 hover:border-purple-300 hover:bg-purple-50/30"
              )}
              onClick={() => handleApply(i)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <span className="text-xs font-semibold text-purple-500 block mb-1">
                    Opción {i + 1}
                  </span>
                  <p className="text-gray-700 leading-relaxed text-xs">
                    {suggestion}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-7 text-xs gap-1 text-purple-600 border-purple-200 hover:bg-purple-100"
                  onClick={e => {
                    e.stopPropagation();
                    handleApply(i);
                  }}
                >
                  <Check className="h-3 w-3" />
                  Usar
                </Button>
              </div>
            </div>
          ))}
          <p className="text-xs text-muted-foreground pt-1">
            💡 Las sugerencias son un punto de partida — edítalas según el caso
            específico del paciente.
          </p>
        </div>
      )}
    </div>
  );
}
