import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CaseFollowUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: number;
  onSuccess?: () => void;
}

export function CaseFollowUpDialog({ open, onOpenChange, caseId, onSuccess }: CaseFollowUpDialogProps) {
  const [action, setAction] = useState("");
  const [notes, setNotes] = useState("");

  const addFollowUpMutation = trpc.cases.addFollowUp.useMutation();
  const utils = trpc.useUtils();

  const resetForm = () => {
    setAction("");
    setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!action) {
      toast.error("Por favor describe la acción realizada");
      return;
    }

    try {
      await addFollowUpMutation.mutateAsync({
        caseId,
        action,
        notes,
      });

      toast.success("Seguimiento agregado exitosamente");
      utils.cases.getById.invalidate({ id: caseId });
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error("Error al agregar el seguimiento");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Agregar Seguimiento</DialogTitle>
          <DialogDescription>
            Registra las acciones y notas de seguimiento para este caso
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="action">Acción Realizada *</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="font-semibold mb-1">Acciones de Seguimiento</p>
                    <p className="text-xs mb-1">Describe brevemente la acción realizada para dar seguimiento al caso.</p>
                    <p className="text-xs">Ejemplos: Entrevista con el afectado, Revisión de documentos, Reunión con el supervisor, Implementación de medidas preventivas.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="action"
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="Ej: Entrevista con el afectado, Revisión de documentos..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notas Adicionales</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalles adicionales sobre la acción realizada..."
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={addFollowUpMutation.isPending}>
              Agregar Seguimiento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
