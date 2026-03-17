import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/use-toast";
import { NORMATIVAS_MAP } from "@/lib/whatsapp";
import { useLocation } from "wouter";

interface ConvertToLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
  onSuccess?: () => void;
}

export function ConvertToLeadModal({ open, onOpenChange, event, onSuccess }: ConvertToLeadModalProps) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Estado del formulario
  const [formData, setFormData] = useState({
    nombre: "",
    email: "",
    telefono: "",
    empresa: "",
    normativas: [] as string[],
    notas: "",
  });

  // Pre-llenar datos del evento cuando se abre el modal
  useEffect(() => {
    if (event && open) {
      const userData = event.userData || {};
      setFormData({
        nombre: userData.nombre || "",
        email: userData.email || "",
        telefono: userData.telefono || "",
        empresa: userData.empresa || "",
        normativas: event.normativas || [],
        notas: `Contacto desde WhatsApp - ${event.eventType.replace("_", " ")}`,
      });
    }
  }, [event, open]);

  const [, setLocation] = useLocation();

  // Mutation para convertir evento a lead
  const convertMutation = trpc.leads.convertWhatsAppEventToLead.useMutation({
    onSuccess: (data) => {
      const leadId = data.leadId;
      toast({
        title: "Lead Creado",
        description: "El evento se convirtió exitosamente en un lead",
        action: (
          <Button
            size="sm"
            onClick={() => setLocation(`/leads-pipeline?leadId=${leadId}`)}
          >
            Ver Lead
          </Button>
        ),
      });
      // Invalidar queries
      utils.whatsappTracking.getRecentEvents.invalidate();
      utils.leads.getLeadsPipeline.invalidate();
      onOpenChange(false);
      if (onSuccess) onSuccess();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo convertir el evento a lead",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!event?.id) {
      toast({
        title: "Error",
        description: "No se encontró el ID del evento",
        variant: "destructive",
      });
      return;
    }

    convertMutation.mutate({
      whatsappEventId: event.id,
      nombre: formData.nombre,
      email: formData.email || undefined,
      telefono: formData.telefono || undefined,
      empresa: formData.empresa || undefined,
      normativas: formData.normativas,
      notas: formData.notas || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Convertir Evento a Lead</DialogTitle>
          <DialogDescription>
            Revisa y completa la información del contacto antes de crear el lead
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa</Label>
              <Input
                id="empresa"
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Normativas de Interés</Label>
            <div className="p-3 border rounded-md bg-muted/50">
              {formData.normativas.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {formData.normativas.map((norm: any) => (
                    <span key={norm} className="px-2 py-1 bg-primary/10 text-primary rounded-md text-sm">
                      {NORMATIVAS_MAP[norm] || norm}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No se especificaron normativas</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas Adicionales</Label>
            <Textarea
              id="notas"
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={convertMutation.isPending}>
              {convertMutation.isPending ? "Creando..." : "Crear Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
