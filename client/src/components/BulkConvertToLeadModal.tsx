import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { NORMATIVAS_MAP } from "@/lib/whatsapp";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";

interface BulkConvertToLeadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedEvents: any[];
  onConfirm: (eventIds: number[]) => void;
  isLoading: boolean;
}

export function BulkConvertToLeadModal({
  open,
  onOpenChange,
  selectedEvents,
  onConfirm,
  isLoading,
}: BulkConvertToLeadModalProps) {
  const [deselectedEvents, setDeselectedEvents] = useState<Set<number>>(new Set());

  const handleToggleEvent = (eventId: number) => {
    setDeselectedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };

  const handleConfirm = () => {
    const eventIds = selectedEvents
      .filter(event => !deselectedEvents.has(event.id))
      .map(event => event.id);
    onConfirm(eventIds);
  };

  const selectedCount = selectedEvents.length - deselectedEvents.size;
  const convertibleEvents = selectedEvents.filter(e => e.conversionStatus !== "converted");
  const alreadyConvertedCount = selectedEvents.length - convertibleEvents.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conversión Masiva a Leads</DialogTitle>
          <DialogDescription>
            Estás a punto de convertir {selectedCount} evento{selectedCount !== 1 ? "s" : ""} de WhatsApp en leads.
            {alreadyConvertedCount > 0 && (
              <span className="block mt-2 text-yellow-600">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                {alreadyConvertedCount} evento{alreadyConvertedCount !== 1 ? "s" : ""} ya {alreadyConvertedCount !== 1 ? "fueron convertidos" : "fue convertido"} previamente y {alreadyConvertedCount !== 1 ? "serán omitidos" : "será omitido"}.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-4">
          {selectedEvents.map((event: any) => {
            const isConverted = event.conversionStatus === "converted";
            const isDeselected = deselectedEvents.has(event.id);
            const userData = event.userData && typeof event.userData === "object" ? event.userData as any : {};

            return (
              <div
                key={event.id}
                className={`border rounded-lg p-4 ${
                  isConverted
                    ? "bg-muted opacity-60"
                    : isDeselected
                    ? "bg-muted/50"
                    : "bg-background"
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={!isDeselected && !isConverted}
                    onCheckedChange={() => handleToggleEvent(event.id)}
                    disabled={isConverted}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{userData.nombre || "Anónimo"}</span>
                        {isConverted && (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Ya Convertido
                          </Badge>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(event.createdAt).toLocaleDateString("es-MX", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {userData.email && (
                        <div>
                          <span className="text-muted-foreground">Email:</span> {userData.email}
                        </div>
                      )}
                      {userData.telefono && (
                        <div>
                          <span className="text-muted-foreground">Teléfono:</span> {userData.telefono}
                        </div>
                      )}
                      {userData.empresa && (
                        <div>
                          <span className="text-muted-foreground">Empresa:</span> {userData.empresa}
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Tipo:</span>{" "}
                        <span className="capitalize">{event.eventType.replace("_", " ")}</span>
                      </div>
                    </div>

                    {event.normativas && Array.isArray(event.normativas) && event.normativas.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {event.normativas.map((normativa: string) => (
                          <Badge key={normativa} variant="outline" className="text-xs">
                            {NORMATIVAS_MAP[normativa] || normativa}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || selectedCount === 0}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Convirtiendo...
              </>
            ) : (
              `Convertir ${selectedCount} Lead${selectedCount !== 1 ? "s" : ""}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
