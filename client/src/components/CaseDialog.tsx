import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface CaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseData?: {
    id: number;
    caseNumber: string;
    reporterName?: string | null;
    reporterEmail?: string | null;
    reporterPhone?: string | null;
    isAnonymous: boolean;
    caseType: string;
    description: string;
    status: string;
    priority: string;
  };
  onSuccess?: () => void;
}

export function CaseDialog({ open, onOpenChange, caseData, onSuccess }: CaseDialogProps) {
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [caseType, setCaseType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("open");
  const [priority, setPriority] = useState<string>("medium");

  const createMutation = trpc.cases.create.useMutation();
  const updateStatusMutation = trpc.cases.updateStatus.useMutation();

  const utils = trpc.useUtils();

  useEffect(() => {
    if (caseData) {
      setReporterName(caseData.reporterName || "");
      setReporterEmail(caseData.reporterEmail || "");
      setReporterPhone(caseData.reporterPhone || "");
      setIsAnonymous(caseData.isAnonymous);
      setCaseType(caseData.caseType);
      setDescription(caseData.description);
      setStatus(caseData.status);
      setPriority(caseData.priority);
    } else {
      resetForm();
    }
  }, [caseData, open]);

  const resetForm = () => {
    setReporterName("");
    setReporterEmail("");
    setReporterPhone("");
    setIsAnonymous(false);
    setCaseType("");
    setDescription("");
    setStatus("open");
    setPriority("medium");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!caseType || !description) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    try {
      if (caseData) {
        // Update existing case status
        await updateStatusMutation.mutateAsync({
          id: caseData.id,
          status: status as "open" | "investigating" | "resolved" | "closed",
        });
        toast.success("Caso actualizado exitosamente");
      } else {
        // Create new case
        await createMutation.mutateAsync({
          reporterName: isAnonymous ? undefined : reporterName,
          reporterEmail: isAnonymous ? undefined : reporterEmail,
          reporterPhone: isAnonymous ? undefined : reporterPhone,
          isAnonymous,
          caseType: caseType as "mobbing" | "burnout" | "violence" | "stress" | "other",
          description,
        });
        toast.success("Caso creado exitosamente");
      }

      utils.cases.list.invalidate();
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      toast.error("Error al guardar el caso");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{caseData ? "Editar Caso" : "Registrar Nuevo Caso"}</DialogTitle>
          <DialogDescription>
            {caseData
              ? "Actualiza la información del caso de riesgo psicosocial"
              : "Registra un nuevo caso de riesgo psicosocial en el sistema"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {caseData && (
            <div className="space-y-2">
              <Label>Número de Caso</Label>
              <Input value={caseData.caseNumber} disabled />
            </div>
          )}

          {!caseData && (
            <>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous"
                  checked={isAnonymous}
                  onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
                />
                <Label htmlFor="anonymous" className="cursor-pointer">
                  Reporte anónimo
                </Label>
              </div>

              {!isAnonymous && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="reporterName">Nombre del Reportante</Label>
                    <Input
                      id="reporterName"
                      value={reporterName}
                      onChange={(e) => setReporterName(e.target.value)}
                      placeholder="Nombre completo"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="reporterEmail">Correo Electrónico</Label>
                      <Input
                        id="reporterEmail"
                        type="email"
                        value={reporterEmail}
                        onChange={(e) => setReporterEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reporterPhone">Teléfono</Label>
                      <Input
                        id="reporterPhone"
                        value={reporterPhone}
                        onChange={(e) => setReporterPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="caseType">Tipo de Caso *</Label>
              <Select value={caseType} onValueChange={setCaseType} disabled={!!caseData}>
                <SelectTrigger id="caseType">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobbing">Mobbing</SelectItem>
                  <SelectItem value="burnout">Burnout</SelectItem>
                  <SelectItem value="violence">Violencia Laboral</SelectItem>
                  <SelectItem value="stress">Estrés Laboral</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {caseData && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Selecciona el estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Abierto</SelectItem>
                      <SelectItem value="investigating">En Investigación</SelectItem>
                      <SelectItem value="resolved">Resuelto</SelectItem>
                      <SelectItem value="closed">Cerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción del Caso *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe detalladamente el caso..."
              rows={6}
              disabled={!!caseData}
              required
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateStatusMutation.isPending}
            >
              {caseData ? "Actualizar" : "Registrar Caso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
