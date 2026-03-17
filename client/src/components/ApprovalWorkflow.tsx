import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { showSuccessToast, showErrorToast } from "@/lib/toasts";
import { UserPlus, CheckCircle2, Clock, FileSignature, X } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import DigitalSignaturePad from "@/components/DigitalSignaturePad";

interface ApprovalWorkflowProps {
  operatingRuleId: number;
  operatingRuleVersion: string;
}

export default function ApprovalWorkflow({ operatingRuleId, operatingRuleVersion }: ApprovalWorkflowProps) {
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showSignDialog, setShowSignDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedApprovalId, setSelectedApprovalId] = useState<number | null>(null);
  const [signComments, setSignComments] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [deadline, setDeadline] = useState("");
  
  const [approvers, setApprovers] = useState<Array<{
    approverId: string;
    approverRole: "president" | "secretary" | "vocal" | "other";
    approverRoleDescription: string;
    approvalOrder: number;
  }>>([{ approverId: "", approverRole: "president", approverRoleDescription: "", approvalOrder: 1 }]);

  // Queries
  const { data: approvalStatus, refetch: refetchApprovalStatus } = trpc.committeeOperatingRules.getApprovalStatus.useQuery(
    { operatingRuleId },
    { enabled: !!operatingRuleId }
  );

  const { data: committeeMembers } = trpc.committeeMembers.list.useQuery();

  // Mutations
  const requestApprovalsMutation = trpc.committeeOperatingRules.requestApprovals.useMutation({
    onSuccess: () => {
      showSuccessToast(
        "Solicitudes enviadas",
        "Las solicitudes de aprobación se han enviado correctamente a los aprobadores"
      );
      setShowRequestDialog(false);
      setApprovers([{ approverId: "", approverRole: "president", approverRoleDescription: "", approvalOrder: 1 }]);
      refetchApprovalStatus();
    },
    onError: (error) => {
      showErrorToast(
        "Error al solicitar aprobaciones",
        error.message || "No se pudieron enviar las solicitudes. Intenta nuevamente."
      );
    },
  });

  const signApprovalMutation = trpc.committeeOperatingRules.signApproval.useMutation({
    onSuccess: (data) => {
      if (data.allApproved) {
        showSuccessToast(
          "¡Todas las aprobaciones completadas!",
          "La base de funcionamiento ha sido aprobada automáticamente"
        );
      } else {
        showSuccessToast(
          "Firma registrada",
          "Tu firma digital se ha registrado correctamente"
        );
      }
      setShowSignDialog(false);
      setSelectedApprovalId(null);
      setSignComments("");
      refetchApprovalStatus();
    },
    onError: (error) => {
      showErrorToast(
        "Error al firmar",
        error.message || "No se pudo registrar la firma. Intenta nuevamente."
      );
    },
  });

  const rejectApprovalMutation = trpc.committeeOperatingRules.rejectApproval.useMutation({
    onSuccess: () => {
      showSuccessToast(
        "Aprobación rechazada",
        "La base de funcionamiento ha regresado a estado borrador"
      );
      setShowRejectDialog(false);
      setSelectedApprovalId(null);
      setRejectionReason("");
      refetchApprovalStatus();
    },
    onError: (error) => {
      showErrorToast(
        "Error al rechazar",
        error.message || "No se pudo rechazar la aprobación. Intenta nuevamente."
      );
    },
  });

  const handleAddApprover = () => {
    setApprovers([
      ...approvers,
      {
        approverId: "",
        approverRole: "vocal",
        approverRoleDescription: "",
        approvalOrder: approvers.length + 1,
      },
    ]);
  };

  const handleRemoveApprover = (index: number) => {
    setApprovers(approvers.filter((_, i) => i !== index));
  };

  const handleApproverChange = (index: number, field: string, value: string) => {
    const updated = [...approvers];
    updated[index] = { ...updated[index], [field]: value };
    setApprovers(updated);
  };

  const handleRequestApprovals = () => {
    // Validar que todos los aprobadores tengan un usuario seleccionado
    if (approvers.some((a: any) => !a.approverId)) {
      toast.error("Debe seleccionar un usuario para cada aprobador");
      return;
    }

    requestApprovalsMutation.mutate({
      operatingRuleId,
      approvers: approvers.map((a: any) => ({
        approverId: parseInt(a.approverId),
        approverRole: a.approverRole,
        approverRoleDescription: a.approverRoleDescription || undefined,
        approvalOrder: a.approvalOrder,
      })),
      deadline: deadline || undefined,
    });
  };

  const handleSignApproval = (approvalId: number) => {
    setSelectedApprovalId(approvalId);
    setShowSignDialog(true);
  };

  const handleSignatureComplete = (signatureData: string) => {
    if (!selectedApprovalId) return;

    signApprovalMutation.mutate({
      approvalId: selectedApprovalId,
      signatureData,
      signatureMethod: "digital_pad",
      comments: signComments || undefined,
    });
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      president: "Presidente",
      secretary: "Secretario",
      vocal: "Vocal",
      other: "Otro",
    };
    return roles[role] || role;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pendiente" },
      signed: { variant: "default", label: "Firmado" },
      rejected: { variant: "destructive", label: "Rechazado" },
    };
    const config = variants[status] || { variant: "outline" as const, label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Resumen de Aprobaciones */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estado de Aprobaciones</CardTitle>
              <CardDescription>
                Versión: {operatingRuleVersion}
              </CardDescription>
            </div>
            <Button onClick={() => setShowRequestDialog(true)} disabled={!!approvalStatus?.approvals.length}>
              <UserPlus className="h-4 w-4 mr-2" />
              Solicitar Aprobaciones
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {approvalStatus && approvalStatus.approvals.length > 0 ? (
            <div className="space-y-4">
              {/* Progreso */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progreso de Aprobación</span>
                    <span className="font-medium">
                      {approvalStatus.summary.signed} de {approvalStatus.summary.total} firmas
                    </span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{
                        width: `${(approvalStatus.summary.signed / approvalStatus.summary.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                {approvalStatus.summary.allApproved && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Aprobado
                  </Badge>
                )}
              </div>

              {/* Lista de Aprobadores */}
              <div className="space-y-3">
                {approvalStatus.approvals.map((approval: any) => (
                  <div
                    key={approval.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div>
                        {approval.status === "signed" ? (
                          <CheckCircle2 className="h-8 w-8 text-green-600" />
                        ) : (
                          <Clock className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{approval.approverName}</div>
                        <div className="text-sm text-muted-foreground">
                          {getRoleLabel(approval.approverRole)}
                          {approval.approverRoleDescription && ` - ${approval.approverRoleDescription}`}
                        </div>
                        {approval.signedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Firmado el {format(new Date(approval.signedAt), "dd/MM/yyyy HH:mm", { locale: es })}
                          </div>
                        )}
                        {approval.comments && (
                          <div className="text-xs text-muted-foreground mt-1 italic">
                            "{approval.comments}"
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(approval.status)}
                      {approval.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => handleSignApproval(approval.id)}>
                            <FileSignature className="h-4 w-4 mr-2" />
                            Firmar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => {
                              setSelectedApprovalId(approval.id);
                              setShowRejectDialog(true);
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Rechazar
                          </Button>
                        </>
                      )}
                      {approval.status === "signed" && approval.signatureData && (
                        <img
                          src={approval.signatureData}
                          alt="Firma"
                          className="h-12 w-24 object-contain border rounded"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileSignature className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se han solicitado aprobaciones para esta base de funcionamiento.</p>
              <p className="text-sm mt-2">Haga clic en "Solicitar Aprobaciones" para comenzar el proceso.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Solicitar Aprobaciones */}
      <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Solicitar Aprobaciones</DialogTitle>
            <DialogDescription>
              Seleccione los miembros del comité que deben aprobar esta base de funcionamiento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {approvers.map((approver, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Aprobador *</Label>
                      <Select
                        value={approver.approverId}
                        onValueChange={(value) => handleApproverChange(index, "approverId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar usuario" />
                        </SelectTrigger>
                        <SelectContent>
                          {committeeMembers?.map((member: any) => (
                            <SelectItem key={member.id} value={member.id.toString()}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Rol *</Label>
                      <Select
                        value={approver.approverRole}
                        onValueChange={(value) => handleApproverChange(index, "approverRole", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="president">Presidente</SelectItem>
                          <SelectItem value="secretary">Secretario</SelectItem>
                          <SelectItem value="vocal">Vocal</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {approver.approverRole === "other" && (
                      <div className="col-span-2">
                        <Label>Descripción del Rol</Label>
                        <Input
                          value={approver.approverRoleDescription}
                          onChange={(e) => handleApproverChange(index, "approverRoleDescription", e.target.value)}
                          placeholder="Ej: Representante de los trabajadores"
                        />
                      </div>
                    )}

                    <div className="col-span-2 flex justify-end">
                      {approvers.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveApprover(index)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Eliminar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Button variant="outline" onClick={handleAddApprover} className="w-full">
              <UserPlus className="h-4 w-4 mr-2" />
              Agregar Aprobador
            </Button>

            {/* Campo de fecha límite */}
            <div className="mt-4">
              <Label htmlFor="deadline">Fecha Límite (Opcional)</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Si se especifica, se enviarán recordatorios automáticos cuando se acerque la fecha límite.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowRequestDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRequestApprovals} disabled={requestApprovalsMutation.isPending}>
              {requestApprovalsMutation.isPending ? "Enviando..." : "Enviar Solicitudes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Firmar Aprobación */}
      <Dialog open={showSignDialog} onOpenChange={setShowSignDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Firmar Aprobación</DialogTitle>
            <DialogDescription>
              Dibuje su firma en el recuadro para aprobar esta base de funcionamiento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <DigitalSignaturePad
              onSignatureComplete={handleSignatureComplete}
              onCancel={() => setShowSignDialog(false)}
              title="Firma Digital"
              description="Dibuje su firma usando el mouse o pantalla táctil"
            />

            <div>
              <Label>Comentarios (opcional)</Label>
              <Textarea
                value={signComments}
                onChange={(e) => setSignComments(e.target.value)}
                placeholder="Agregue comentarios adicionales sobre su aprobación..."
                rows={3}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Rechazar Aprobación */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-destructive">Rechazar Aprobación</DialogTitle>
            <DialogDescription>
              Al rechazar esta aprobación, la base de funcionamiento regresará a estado borrador y se cancelarán todas las demás aprobaciones pendientes. Debe proporcionar un motivo detallado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Motivo del Rechazo *</Label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explique detalladamente por qué rechaza esta base de funcionamiento (mínimo 10 caracteres)..."
                rows={5}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {rejectionReason.length} / 10 caracteres mínimos
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => {
              setShowRejectDialog(false);
              setRejectionReason("");
            }}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (rejectionReason.length < 10) {
                  toast.error("El motivo de rechazo debe tener al menos 10 caracteres");
                  return;
                }
                if (selectedApprovalId) {
                  rejectApprovalMutation.mutate({
                    approvalId: selectedApprovalId,
                    rejectionReason,
                  });
                }
              }}
              disabled={rejectApprovalMutation.isPending || rejectionReason.length < 10}
            >
              {rejectApprovalMutation.isPending ? "Rechazando..." : "Confirmar Rechazo"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
