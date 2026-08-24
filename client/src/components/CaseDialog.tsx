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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { WorkerSelector } from "@/components/WorkerSelector";
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

export function CaseDialog({
  open,
  onOpenChange,
  caseData,
  onSuccess,
}: CaseDialogProps) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
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
    if (open && !caseData) {
      // Modo creación: resetear formulario cuando se abre el modal
      resetForm();
    } else if (caseData) {
      // Modo edición: cargar datos del caso
      setReporterName(caseData.reporterName || "");
      setReporterEmail(caseData.reporterEmail || "");
      setReporterPhone(caseData.reporterPhone || "");
      setIsAnonymous(caseData.isAnonymous);
      setCaseType(caseData.caseType);
      setDescription(caseData.description);
      setStatus(caseData.status);
      setPriority(caseData.priority);
    }
  }, [open, caseData]);

  const resetForm = () => {
    setSelectedWorkerId(null);
    setReporterName("");
    setReporterEmail("");
    setReporterPhone("");
    setIsAnonymous(false);
    setCaseType("");
    setDescription("");
    setStatus("open");
    setPriority("medium");
  };

  const handleWorkerSelect = (
    workerId: number | null,
    workerData?: {
      fullName: string;
      email: string;
      department: string | null;
      curp: string | null;
      employeeNumber: string | null;
      position: string | null;
    }
  ) => {
    setSelectedWorkerId(workerId);
    if (workerData) {
      setReporterName(workerData.fullName);
      setReporterEmail(workerData.email);
      // El teléfono no está disponible en los datos del trabajador, se mantiene vacío
    } else {
      setReporterName("");
      setReporterEmail("");
      setReporterPhone("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación básica
    if (!caseType || !description) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    if (description.length < 10) {
      toast.error("La descripción debe tener al menos 10 caracteres");
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
          caseType: caseType as
            | "mobbing"
            | "burnout"
            | "violence"
            | "stress"
            | "other",
          description,
        });
        toast.success("Caso creado exitosamente");
      }

      await utils.cases.list.invalidate();
      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar el caso:", error);
      toast.error("Error al guardar el caso");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {caseData ? "Editar Caso" : "Registrar Nuevo Caso"}
          </DialogTitle>
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
                  onCheckedChange={checked =>
                    setIsAnonymous(checked as boolean)
                  }
                />
                <Label htmlFor="anonymous" className="cursor-pointer">
                  Reporte anónimo
                </Label>
              </div>

              {!isAnonymous && (
                <>
                  <div className="space-y-2">
                    <Label>Trabajador</Label>
                    <WorkerSelector
                      value={selectedWorkerId}
                      onChange={handleWorkerSelect}
                      placeholder="Seleccionar trabajador..."
                    />
                    <p className="text-sm text-muted-foreground">
                      Selecciona un trabajador para prellenar automáticamente
                      nombre y correo
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reporterName">Nombre del Reportante</Label>
                    <Input
                      id="reporterName"
                      value={reporterName}
                      onChange={e => setReporterName(e.target.value)}
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
                        onChange={e => setReporterEmail(e.target.value)}
                        placeholder="correo@ejemplo.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reporterPhone">Teléfono</Label>
                      <Input
                        id="reporterPhone"
                        value={reporterPhone}
                        onChange={e => setReporterPhone(e.target.value)}
                        placeholder="+52 614 123 4567"
                      />
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="caseType">Tipo de Caso *</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="font-semibold mb-1">
                        Tipos de Riesgo Psicosocial
                      </p>
                      <ul className="text-xs space-y-1">
                        <li>
                          • <strong>Mobbing:</strong> Acoso laboral sistemático
                        </li>
                        <li>
                          • <strong>Burnout:</strong> Síndrome de desgaste
                          profesional
                        </li>
                        <li>
                          • <strong>Violencia Laboral:</strong> Agresión física
                          o verbal
                        </li>
                        <li>
                          • <strong>Estrés Laboral:</strong> Presión excesiva en
                          el trabajo
                        </li>
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Select
                value={caseType}
                onValueChange={value => setCaseType(value)}
                disabled={!!caseData}
              >
                <SelectTrigger>
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
                  <select
                    id="status"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="open">Abierto</option>
                    <option value="investigating">En Investigación</option>
                    <option value="resolved">Resuelto</option>
                    <option value="closed">Cerrado</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción del Caso *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe detalladamente el caso..."
              rows={6}
              disabled={!!caseData}
              required
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending || updateStatusMutation.isPending
              }
            >
              {caseData ? "Actualizar" : "Registrar Caso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
