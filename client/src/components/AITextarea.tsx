import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AITextareaProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
  fieldType: "mision" | "vision" | "valores" | "historia" | "politica" | "descripcion";
  companyName?: string;
  industry?: string;
  helperText?: string;
}

export function AITextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required = false,
  fieldType,
  companyName,
  industry,
  helperText,
}: AITextareaProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const generateMutation = trpc.ai.generateCompanyDescription.useMutation();

  const handleGenerateWithAI = async () => {
    setIsGenerating(true);
    try {
      const result = await generateMutation.mutateAsync({
        fieldType,
        companyName,
        industry,
        context: value || undefined, // Usar el texto existente como contexto
      });

      if (result.success && result.text) {
        onChange(result.text);
        toast.success("Texto generado con IA", {
          description: "El contenido ha sido generado exitosamente",
        });
      }
    } catch (error: any) {
      toast.error("Error al generar texto", {
        description: error.message || "No se pudo generar el texto con IA",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id}>
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleGenerateWithAI}
          disabled={isGenerating}
          className="gap-2"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generar con IA
            </>
          )}
        </Button>
      </div>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="resize-none"
      />
      {helperText && (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
