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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { UserCog, Building, Mail } from "lucide-react";

interface ReassignLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: any | null;
}

export function ReassignLeadModal({ open, onOpenChange, lead }: ReassignLeadModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>("");

  // Query para obtener vendedores activos
  const { data: salespeople, isLoading: loadingSalespeople } = trpc.salespeople.getActive.useQuery();

  // Mutation para reasignar lead
  const assignMutation = trpc.leads.assignLead.useMutation({
    onSuccess: () => {
      toast({
        title: "Lead reasignado",
        description: "El lead ha sido reasignado exitosamente al nuevo vendedor.",
      });
      onOpenChange(false);
      setSelectedSalespersonId("");
      utils.leads.getLeadsPipeline.invalidate();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleReassign = () => {
    if (!lead || !selectedSalespersonId) {
      toast({
        title: "Selecciona un vendedor",
        description: "Por favor selecciona un vendedor para reasignar el lead.",
        variant: "destructive",
      });
      return;
    }

    const selectedSalesperson = salespeople?.find(
      (s) => s.id.toString() === selectedSalespersonId
    );

    if (!selectedSalesperson) return;

    assignMutation.mutate({
      leadId: lead.id,
      asignadoA: selectedSalesperson.id,
      asignadoNombre: selectedSalesperson.nombre,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="w-5 h-5" />
            Reasignar Lead
          </DialogTitle>
          <DialogDescription>
            Selecciona el vendedor al que deseas reasignar este lead.
          </DialogDescription>
        </DialogHeader>

        {lead && (
          <div className="space-y-4">
            {/* Información del lead */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h4 className="font-semibold">{lead.nombre}</h4>
              {lead.empresa && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building className="w-4 h-4" />
                  {lead.empresa}
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  {lead.email}
                </div>
              )}
              {lead.asignadoNombre && (
                <div className="text-sm text-muted-foreground">
                  Actualmente asignado a: <span className="font-medium">{lead.asignadoNombre}</span>
                </div>
              )}
            </div>

            {/* Selector de vendedor */}
            <div className="space-y-2">
              <Label htmlFor="salesperson">Nuevo Vendedor *</Label>
              <Select
                value={selectedSalespersonId}
                onValueChange={setSelectedSalespersonId}
                disabled={loadingSalespeople}
              >
                <SelectTrigger id="salesperson">
                  <SelectValue placeholder="Selecciona un vendedor" />
                </SelectTrigger>
                <SelectContent>
                  {salespeople?.map((salesperson: any) => (
                    <SelectItem key={salesperson.id} value={salesperson.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{salesperson.nombre}</span>
                        <span className="text-xs text-muted-foreground">{salesperson.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {salespeople && salespeople.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-4">
                No hay vendedores activos disponibles. Activa al menos un vendedor en la gestión de vendedores.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleReassign}
            disabled={!selectedSalespersonId || assignMutation.isPending}
          >
            {assignMutation.isPending ? "Reasignando..." : "Reasignar Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
