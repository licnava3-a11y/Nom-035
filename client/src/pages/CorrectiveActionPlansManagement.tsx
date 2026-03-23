import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import {
  ClipboardList,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  PenTool,
  Calendar,
} from "lucide-react";

type PlanStatus = "draft" | "assigned" | "in_progress" | "completed" | "verified" | "closed";
type PlanPriority = "low" | "medium" | "high" | "critical";
type OriginType = "root_cause_analysis" | "intelligent_alert" | "manual_case" | "recommendation";

const statusConfig: Record<PlanStatus, { label: string; color: string; icon: any }> = {
  draft: { label: "Borrador", color: "bg-gray-500", icon: FileText },
  assigned: { label: "Asignado", color: "bg-blue-500", icon: ClipboardList },
  in_progress: { label: "En Progreso", color: "bg-yellow-500", icon: Clock },
  completed: { label: "Completado", color: "bg-green-500", icon: CheckCircle2 },
  verified: { label: "Verificado", color: "bg-purple-500", icon: CheckCircle2 },
  closed: { label: "Cerrado", color: "bg-gray-700", icon: CheckCircle2 },
};

const priorityConfig: Record<PlanPriority, { label: string; color: string }> = {
  low: { label: "Baja", color: "bg-gray-500" },
  medium: { label: "Media", color: "bg-blue-500" },
  high: { label: "Alta", color: "bg-orange-500" },
  critical: { label: "Crítica", color: "bg-red-500" },
};

export default function CorrectiveActionPlansManagement() {
  const [statusFilter, setStatusFilter] = useState<PlanStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<PlanPriority | "all">("all");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showEvidenceDialog, setShowEvidenceDialog] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);

  // Form states
  const [newPlan, setNewPlan] = useState({
    title: "",
    description: "",
    originType: "manual_case" as OriginType,
    priority: "medium" as PlanPriority,
    assignedTo: undefined as number | undefined,
    dueDate: "",
    notes: "",
  });

  const [evidenceForm, setEvidenceForm] = useState({
    title: "",
    description: "",
    file: null as File | null,
  });

  const [signatureRole, setSignatureRole] = useState<"responsible" | "verifier">("responsible");

  // Queries
  const { data: dashboard } = trpc.correctiveActionPlans.getDashboard.useQuery();
  const { data: plansData } = trpc.correctiveActionPlans.list.useQuery({
    status: statusFilter !== "all" ? statusFilter : undefined,
    priority: priorityFilter !== "all" ? priorityFilter : undefined,
    page: 1,
    pageSize: 50,
  });
  const { data: expiringSoon } = trpc.correctiveActionPlans.getExpiringSoon.useQuery();

  // Mutations
  const createMutation = trpc.correctiveActionPlans.create.useMutation({
    onSuccess: () => {
      toast.success("Plan de acción creado exitosamente");
      setShowCreateDialog(false);
      setNewPlan({
        title: "",
        description: "",
        originType: "manual_case",
        priority: "medium",
        assignedTo: undefined,
        dueDate: "",
        notes: "",
      });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const autoAssignMutation = trpc.correctiveActionPlans.autoAssign.useMutation({
    onSuccess: (data) => {
      toast.success(`Asignado automáticamente a ${data.assignedToName}`);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const changeStatusMutation = trpc.correctiveActionPlans.changeStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado actualizado exitosamente");
      setShowDetailsDialog(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const uploadEvidenceMutation = trpc.correctiveActionPlans.uploadEvidence.useMutation({
    onSuccess: () => {
      toast.success("Evidencia subida exitosamente");
      setShowEvidenceDialog(false);
      setEvidenceForm({ title: "", description: "", file: null });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const signMutation = trpc.correctiveActionPlans.sign.useMutation({
    onSuccess: (data) => {
      if (data.verificationCode) {
        toast.success(`Firmado exitosamente. Código: ${data.verificationCode}`);
      } else {
        toast.success("Firmado exitosamente");
      }
      setShowSignDialog(false);
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleCreate = () => {
    if (!newPlan.title || !newPlan.description || !newPlan.dueDate) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    createMutation.mutate(newPlan);
  };

  const handleAutoAssign = (planId: number) => {
    autoAssignMutation.mutate({ planId });
  };

  const handleChangeStatus = (planId: number, status: PlanStatus) => {
    changeStatusMutation.mutate({ id: planId, status });
  };

  const handleUploadEvidence = async () => {
    if (!selectedPlan || !evidenceForm.title || !evidenceForm.file) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadEvidenceMutation.mutate({
        planId: selectedPlan.id,
        title: evidenceForm.title,
        description: evidenceForm.description,
        fileData: base64,
        fileName: evidenceForm.file!.name,
        fileType: evidenceForm.file!.type,
      });
    };
    reader.readAsDataURL(evidenceForm.file);
  };

  const handleSign = () => {
    if (!selectedPlan) return;

    // Simulación de firma (en producción, usar canvas de firma)
    const mockSignature = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;

    signMutation.mutate({
      id: selectedPlan.id,
      role: signatureRole,
      signature: mockSignature,
    });
  };

  const plans = plansData?.plans || [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Planes de Acción Correctiva</h1>
          <p className="text-muted-foreground">
            Gestión completa de planes de acción con workflow automatizado
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Crear Plan
        </Button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Planes</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.total || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{dashboard?.overdue || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Completitud</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {dashboard?.completionRate || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos a Vencer</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {expiringSoon?.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Label>Estado</Label>
            <Select modal={false} value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="assigned">Asignado</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="completed">Completado</SelectItem>
                <SelectItem value="verified">Verificado</SelectItem>
                <SelectItem value="closed">Cerrado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Label>Prioridad</Label>
            <Select modal={false} value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="low">Baja</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Plans List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Planes</CardTitle>
          <CardDescription>
            {plans.length} plan{plans.length !== 1 ? "es" : ""} encontrado
            {plans.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {plans.map((plan: any) => (
              <div
                key={plan.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent cursor-pointer"
                onClick={() => {
                  setSelectedPlan(plan);
                  setShowDetailsDialog(true);
                }}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{plan.title}</h3>
                    <Badge className={priorityConfig[plan.priority as PlanPriority].color}>
                      {priorityConfig[plan.priority as PlanPriority].label}
                    </Badge>
                    <Badge className={statusConfig[plan.status as PlanStatus].color}>
                      {statusConfig[plan.status as PlanStatus].label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Asignado a: {plan.assignedToName || "Sin asignar"}</span>
                    <span>
                      Vence:{" "}
                      {plan.dueDate
                        ? new Date(plan.dueDate).toLocaleDateString()
                        : "Sin fecha"}
                    </span>
                  </div>
                </div>

                {plan.status === "draft" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAutoAssign(plan.id);
                    }}
                  >
                    Asignar Automáticamente
                  </Button>
                )}
              </div>
            ))}

            {plans.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No se encontraron planes de acción
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crear Plan de Acción Correctiva</DialogTitle>
            <DialogDescription>
              Complete los detalles del nuevo plan de acción
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={newPlan.title}
                onChange={(e) => setNewPlan({ ...newPlan, title: e.target.value })}
                placeholder="Título del plan"
              />
            </div>

            <div>
              <Label>Descripción *</Label>
              <Textarea
                value={newPlan.description}
                onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                placeholder="Descripción detallada"
                rows={4}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioridad *</Label>
                <Select modal={false}
                  value={newPlan.priority}
                  onValueChange={(v) => setNewPlan({ ...newPlan, priority: v as PlanPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fecha Límite *</Label>
                <Input
                  type="date"
                  value={newPlan.dueDate}
                  onChange={(e) => setNewPlan({ ...newPlan, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Notas</Label>
              <Textarea
                value={newPlan.notes}
                onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
                placeholder="Notas adicionales (opcional)"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleCreate} loading={createMutation.isPending} loadingText="Creando...">Crear Plan</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedPlan?.title}</DialogTitle>
            <DialogDescription>Detalles del plan de acción correctiva</DialogDescription>
          </DialogHeader>

          {selectedPlan && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Badge className={priorityConfig[selectedPlan.priority as PlanPriority].color}>
                  {priorityConfig[selectedPlan.priority as PlanPriority].label}
                </Badge>
                <Badge className={statusConfig[selectedPlan.status as PlanStatus].color}>
                  {statusConfig[selectedPlan.status as PlanStatus].label}
                </Badge>
              </div>

              <div>
                <Label>Descripción</Label>
                <p className="text-sm">{selectedPlan.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Asignado a</Label>
                  <p className="text-sm">{selectedPlan.assignedToName || "Sin asignar"}</p>
                </div>
                <div>
                  <Label>Fecha Límite</Label>
                  <p className="text-sm">
                    {selectedPlan.dueDate
                      ? new Date(selectedPlan.dueDate).toLocaleDateString()
                      : "Sin fecha"}
                  </p>
                </div>
              </div>

              {selectedPlan.notes && (
                <div>
                  <Label>Notas</Label>
                  <p className="text-sm">{selectedPlan.notes}</p>
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {selectedPlan.status === "assigned" && (
                  <Button
                    variant="outline"
                    onClick={() => handleChangeStatus(selectedPlan.id, "in_progress")}
                  >
                    Marcar En Progreso
                  </Button>
                )}
                {selectedPlan.status === "in_progress" && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowEvidenceDialog(true);
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Subir Evidencia
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSignatureRole("responsible");
                        setShowSignDialog(true);
                      }}
                    >
                      <PenTool className="h-4 w-4 mr-2" />
                      Firmar como Responsable
                    </Button>
                  </>
                )}
                {selectedPlan.status === "completed" && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSignatureRole("verifier");
                      setShowSignDialog(true);
                    }}
                  >
                    <PenTool className="h-4 w-4 mr-2" />
                    Firmar como Verificador
                  </Button>
                )}
                {selectedPlan.status === "verified" && (
                  <Button
                    variant="outline"
                    onClick={() => handleChangeStatus(selectedPlan.id, "closed")}
                  >
                    Cerrar Plan
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evidence Upload Dialog */}
      <Dialog open={showEvidenceDialog} onOpenChange={setShowEvidenceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Evidencia</DialogTitle>
            <DialogDescription>Adjunta documentos o imágenes como evidencia</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={evidenceForm.title}
                onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })}
                placeholder="Título de la evidencia"
              />
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                value={evidenceForm.description}
                onChange={(e) =>
                  setEvidenceForm({ ...evidenceForm, description: e.target.value })
                }
                placeholder="Descripción (opcional)"
                rows={3}
              />
            </div>

            <div>
              <Label>Archivo *</Label>
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) =>
                  setEvidenceForm({ ...evidenceForm, file: e.target.files?.[0] || null })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEvidenceDialog(false)}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleUploadEvidence} loading={uploadEvidenceMutation.isPending} loadingText="Subiendo...">Subir</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sign Dialog */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Firma Digital</DialogTitle>
            <DialogDescription>
              Firma como {signatureRole === "responsible" ? "Responsable" : "Verificador"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <PenTool className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Área de firma (simulación)
                <br />
                En producción, usar canvas de firma digital
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSignDialog(false)}>
              Cancelar
            </Button>
            <LoadingButton onClick={handleSign} loading={signMutation.isPending} loadingText="Firmando...">Confirmar Firma</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
