import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CaseFieldType = "description" | "resolution";

interface CaseAIAssistantProps {
  fieldType: CaseFieldType;
  currentValue?: string;
  onApply: (text: string) => void;
  caseType?: string;
  context?: string;
  className?: string;
}

const fieldLabels: Record<CaseFieldType, string> = {
  description: "Descripción del caso",
  resolution: "Resolución y acciones tomadas",
};

export function CaseAIAssistant({
  fieldType,
  currentValue,
  onApply,
  caseType,
  context,
  className,
}: CaseAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<string>("");

  const suggestMutation = trpc.casesManagement.suggestCaseField.useMutation({
    onSuccess: (data) => {
      setSuggestion(data.suggestion);
      setIsOpen(true);
    },
    onError: (err) => {
      toast.error("Error al generar sugerencia: " + err.message);
    },
  });

  const handleGenerate = () => {
    suggestMutation.mutate({
      fieldType,
      currentValue,
      caseType,
      context,
    });
  };

  const handleApply = () => {
    onApply(suggestion);
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
        {suggestion && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground transition-colors"
          >
            {isOpen ? (
              <>
                <ChevronUp className="h-3 w-3" /> Ocultar sugerencia
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> Ver sugerencia
              </>
            )}
          </button>
        )}
      </div>

      {/* Suggestion panel */}
      {isOpen && suggestion && (
        <div className="mt-2 border border-purple-100 rounded-lg bg-purple-50/40 p-3 space-y-2">
          <p className="text-xs font-medium text-purple-700 mb-2 flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            Sugerencia de IA para "{fieldLabels[fieldType]}"
          </p>
          <div className="relative rounded-md border border-purple-200 bg-white p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-gray-700 leading-relaxed text-xs flex-1">{suggestion}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="shrink-0 h-7 text-xs gap-1 text-purple-600 border-purple-200 hover:bg-purple-100"
                onClick={handleApply}
              >
                <Check className="h-3 w-3" />
                Usar
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            💡 La sugerencia es un punto de partida — edítala según el caso específico.
          </p>
        </div>
      )}
    </div>
  );
}
