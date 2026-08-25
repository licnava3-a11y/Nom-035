import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { showSuccessToast, showErrorToast } from "@/lib/toasts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ICONS } from "@/lib/iconography";
import { EmptyState } from "@/components/EmptyState";
import { EMPTY_STATES } from "@/lib/emptyStates";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import VersionComparison from "@/components/VersionComparison";
import ApprovalWorkflow from "@/components/ApprovalWorkflow";
import { OperatingRulesTimeline } from "@/components/OperatingRulesTimeline";
import { SearchOperatingRules } from "@/components/SearchOperatingRules";
import { Search } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";
import { LabelWithTooltip } from "@/components/InfoTooltip";
import { TableSkeleton } from "@/components/skeletons";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export default function CommitteeOperatingRules() {
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(
    null
  );
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    null
  );
  const [customTitle, setCustomTitle] = useState("");
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [compareVersionIds, setCompareVersionIds] = useState<
    [number | null, number | null]
  >([null, null]);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [formData, setFormData] = useState({
    version: "V1.0",
    effectiveDate: new Date().toISOString().split("T")[0],
    reviewDate: "",
    nextReviewDate: "",
    objectives: "",
    structure: "",
    roles: "",
    meetingFrequency: "",
    quorum: "",
    decisionMaking: "",
    communication: "",
    caseHandling: "",
    confidentiality: "",
    amendments: "",
    signatures: "",
    changeDescription: "",
  });

  // Queries
  const {
    data: rules,
    refetch: refetchRules,
    isLoading: isLoadingRules,
  } = trpc.committeeOperatingRules.list.useQuery();
  const { data: templates } = trpc.operatingRulesTemplates.list.useQuery();
  const { data: currentRule, refetch: refetchCurrentRule } =
    trpc.committeeOperatingRules.getById.useQuery(
      { id: selectedRuleId! },
      { enabled: !!selectedRuleId && !isCreating }
    );
  const { data: versions, refetch: refetchVersions } =
    trpc.committeeOperatingRules.listVersions.useQuery(
      { operatingRuleId: selectedRuleId! },
      { enabled: !!selectedRuleId && showVersionHistory }
    );
  const { data: selectedVersion } =
    trpc.committeeOperatingRules.getVersion.useQuery(
      { versionId: selectedVersionId! },
      { enabled: !!selectedVersionId }
    );
  const { data: comparison } =
    trpc.committeeOperatingRules.compareVersions.useQuery(
      { versionId1: compareVersionIds[0]!, versionId2: compareVersionIds[1]! },
      { enabled: !!compareVersionIds[0] && !!compareVersionIds[1] }
    );

  // Mutations
  const generatePDFMutation =
    trpc.committeeOperatingRules.generatePDF.useMutation({
      onSuccess: data => {
        // Convertir base64 a blob y descargar
        const byteCharacters = atob(data.pdfBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        showSuccessToast(
          "PDF generado",
          "El documento PDF se ha descargado exitosamente"
        );
      },
      onError: error => {
        showErrorToast(
          "Error al generar PDF",
          error.message ||
            "No se pudo generar el documento PDF. Intenta nuevamente."
        );
      },
    });

  const createMutation = trpc.committeeOperatingRules.create.useMutation({
    onSuccess: () => {
      showSuccessToast(
        "Bases de funcionamiento creadas",
        "La nueva base de funcionamiento se ha registrado exitosamente"
      );
      refetchRules();
      setIsCreating(false);
      resetForm();
    },
    onError: error => {
      showErrorToast(
        "Error al crear base de funcionamiento",
        error.message ||
          "No se pudo crear la base de funcionamiento. Intenta nuevamente."
      );
    },
  });

  const updateMutation = trpc.committeeOperatingRules.update.useMutation({
    onSuccess: () => {
      showSuccessToast(
        "Bases de funcionamiento actualizadas",
        "Los cambios se han guardado exitosamente"
      );
      refetchCurrentRule();
      refetchVersions();
      setIsEditing(false);
    },
    onError: error => {
      showErrorToast(
        "Error al actualizar",
        error.message ||
          "No se pudieron guardar los cambios. Intenta nuevamente."
      );
    },
  });

  const restoreMutation =
    trpc.committeeOperatingRules.restoreVersion.useMutation({
      onSuccess: () => {
        showSuccessToast(
          "Versión restaurada",
          "La versión anterior se ha restaurado exitosamente"
        );
        refetchCurrentRule();
        refetchVersions();
        setShowRestoreDialog(false);
        setSelectedVersionId(null);
      },
      onError: error => {
        showErrorToast(
          "Error al restaurar versión",
          error.message ||
            "No se pudo restaurar la versión. Intenta nuevamente."
        );
      },
    });

  const approveMutation = trpc.committeeOperatingRules.approve.useMutation({
    onSuccess: () => {
      showSuccessToast(
        "Base de funcionamiento aprobada",
        "La base de funcionamiento ha sido aprobada y activada"
      );
      refetchRules();
      refetchCurrentRule();
    },
    onError: error => {
      showErrorToast(
        "Error al aprobar",
        error.message ||
          "No se pudo aprobar la base de funcionamiento. Intenta nuevamente."
      );
    },
  });

  const createFromTemplateMutation =
    trpc.operatingRulesTemplates.createFromTemplate.useMutation({
      onSuccess: data => {
        showSuccessToast(
          "Base creada desde plantilla",
          "La base de funcionamiento se ha creado exitosamente usando la plantilla seleccionada"
        );
        setShowTemplateDialog(false);
        setSelectedTemplateId(null);
        setCustomTitle("");
        refetchRules();
        setSelectedRuleId(data.id);
        setIsCreating(false);
      },
      onError: error => {
        showErrorToast(
          "Error al crear desde plantilla",
          error.message ||
            "No se pudo crear la base de funcionamiento desde la plantilla. Intenta nuevamente."
        );
      },
    });

  const resetForm = () => {
    setFormData({
      version: "V1.0",
      effectiveDate: new Date().toISOString().split("T")[0],
      reviewDate: "",
      nextReviewDate: "",
      objectives: "",
      structure: "",
      roles: "",
      meetingFrequency: "",
      quorum: "",
      decisionMaking: "",
      communication: "",
      caseHandling: "",
      confidentiality: "",
      amendments: "",
      signatures: "",
      changeDescription: "",
    });
  };

  const loadRuleData = (rule: any) => {
    setFormData({
      version: rule.version || "V1.0",
      effectiveDate:
        rule.effectiveDate || new Date().toISOString().split("T")[0],
      reviewDate: rule.reviewDate || "",
      nextReviewDate: rule.nextReviewDate || "",
      objectives: rule.objectives || "",
      structure: rule.structure || "",
      roles: rule.roles || "",
      meetingFrequency: rule.meetingFrequency || "",
      quorum: rule.quorum || "",
      decisionMaking: rule.decisionMaking || "",
      communication: rule.communication || "",
      caseHandling: rule.caseHandling || "",
      confidentiality: rule.confidentiality || "",
      amendments: rule.amendments || "",
      signatures: rule.signatures || "",
      changeDescription: "",
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedRuleId) return;
    updateMutation.mutate({ id: selectedRuleId, ...formData });
  };

  const handleRestore = () => {
    if (!selectedRuleId || !selectedVersionId) return;
    restoreMutation.mutate({
      operatingRuleId: selectedRuleId,
      versionId: selectedVersionId,
      changeDescription: formData.changeDescription,
    });
  };

  const handleApprove = () => {
    if (!selectedRuleId) return;
    approveMutation.mutate({ id: selectedRuleId });
  };

  // Atajos de teclado
  useKeyboardShortcuts([
    {
      key: "s",
      ctrl: true,
      callback: () => {
        if (isEditing) {
          if (isCreating) {
            handleCreate();
          } else {
            handleUpdate();
          }
        }
      },
      description: "Guardar cambios (Ctrl+S)",
    },
    {
      key: "Escape",
      callback: () => {
        if (showVersionHistory) {
          setShowVersionHistory(false);
        } else if (showCompareDialog) {
          setShowCompareDialog(false);
        } else if (showRestoreDialog) {
          setShowRestoreDialog(false);
        } else if (showTemplateDialog) {
          setShowTemplateDialog(false);
        } else if (showSearchDialog) {
          setShowSearchDialog(false);
        } else if (isEditing) {
          setIsEditing(false);
          setIsCreating(false);
          setSelectedRuleId(null);
          resetForm();
        }
      },
      description: "Cerrar diálogo o cancelar edición (Esc)",
    },
  ]);

  const startEditing = () => {
    if (currentRule) {
      loadRuleData(currentRule);
      setIsEditing(true);
    }
  };

  const startCreating = () => {
    resetForm();
    setIsCreating(true);
    setSelectedRuleId(null);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setIsCreating(false);
    resetForm();
  };

  if (isCreating || isEditing) {
    return (
      <div className="container mx-auto py-6">
        <Breadcrumb
          items={[
            { label: "Comité", href: "/committee" },
            {
              label: "Bases de Funcionamiento",
              href: "/committee-operating-rules",
            },
            { label: isCreating ? "Crear" : "Editar" },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ICONS.documents.generic className="h-5 w-5" />
              {isCreating
                ? "Crear Bases de Funcionamiento"
                : "Editar Bases de Funcionamiento"}
            </CardTitle>
            <CardDescription>
              {isCreating
                ? "Complete todos los campos para crear las bases de funcionamiento del comité"
                : "Modifique los campos necesarios. Se creará una nueva versión automáticamente"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="version">Versión</Label>
                <Input
                  id="version"
                  value={formData.version}
                  onChange={e =>
                    setFormData({ ...formData, version: e.target.value })
                  }
                  placeholder="V1.0"
                />
              </div>
              <div>
                <Label htmlFor="effectiveDate">Fecha de Vigencia</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={formData.effectiveDate}
                  onChange={e =>
                    setFormData({ ...formData, effectiveDate: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="nextReviewDate">Próxima Revisión</Label>
                <Input
                  id="nextReviewDate"
                  type="date"
                  value={formData.nextReviewDate}
                  onChange={e =>
                    setFormData({ ...formData, nextReviewDate: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <LabelWithTooltip
                label="Objetivos del Comité"
                htmlFor="objectives"
                tooltip="Define los propósitos generales del comité según la NOM-035: identificar, analizar y prevenir factores de riesgo psicosocial."
                required
              />
              <Textarea
                id="objectives"
                value={formData.objectives}
                onChange={e =>
                  setFormData({ ...formData, objectives: e.target.value })
                }
                placeholder="Describa los objetivos del comité..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="structure">Estructura Organizacional</Label>
              <Textarea
                id="structure"
                value={formData.structure}
                onChange={e =>
                  setFormData({ ...formData, structure: e.target.value })
                }
                placeholder="Describa la integración y estructura del comité..."
                rows={4}
              />
            </div>

            <div>
              <LabelWithTooltip
                label="Funciones y Responsabilidades"
                htmlFor="roles"
                tooltip="Especifica las funciones de cada miembro: presidente, secretario, vocales. Incluye responsabilidades de coordinación, seguimiento y toma de decisiones."
                required
              />
              <Textarea
                id="roles"
                value={formData.roles}
                onChange={e =>
                  setFormData({ ...formData, roles: e.target.value })
                }
                placeholder="Describa las funciones de cada miembro..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="meetingFrequency">
                  Periodicidad de Reuniones
                </Label>
                <Textarea
                  id="meetingFrequency"
                  value={formData.meetingFrequency}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      meetingFrequency: e.target.value,
                    })
                  }
                  placeholder="Ej: Reuniones mensuales ordinarias..."
                  rows={3}
                />
              </div>
              <div>
                <LabelWithTooltip
                  label="Quórum Mínimo"
                  htmlFor="quorum"
                  tooltip="Número o porcentaje mínimo de miembros requeridos para que las reuniones sean válidas. Ejemplo: 50% + 1 de los integrantes."
                  required
                />
                <Textarea
                  id="quorum"
                  value={formData.quorum}
                  onChange={e =>
                    setFormData({ ...formData, quorum: e.target.value })
                  }
                  placeholder="Ej: 50% + 1 de los miembros..."
                  rows={3}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="decisionMaking">Toma de Decisiones</Label>
              <Textarea
                id="decisionMaking"
                value={formData.decisionMaking}
                onChange={e =>
                  setFormData({ ...formData, decisionMaking: e.target.value })
                }
                placeholder="Describa el procedimiento de toma de decisiones..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="communication">Mecanismos de Comunicación</Label>
              <Textarea
                id="communication"
                value={formData.communication}
                onChange={e =>
                  setFormData({ ...formData, communication: e.target.value })
                }
                placeholder="Describa los canales de comunicación interna..."
                rows={3}
              />
            </div>

            <div>
              <LabelWithTooltip
                label="Procedimiento de Atención de Casos"
                htmlFor="caseHandling"
                tooltip="Describe el proceso para atender casos de riesgo psicosocial: recepción, evaluación, canalización, seguimiento y cierre."
                required
              />
              <Textarea
                id="caseHandling"
                value={formData.caseHandling}
                onChange={e =>
                  setFormData({ ...formData, caseHandling: e.target.value })
                }
                placeholder="Describa el proceso de atención de casos..."
                rows={4}
              />
            </div>

            <div>
              <LabelWithTooltip
                label="Confidencialidad y Manejo de Información"
                htmlFor="confidentiality"
                tooltip="Establece cómo se protegerá la información sensible de los trabajadores, quiénes tienen acceso y los protocolos de resguardo."
                required
              />
              <Textarea
                id="confidentiality"
                value={formData.confidentiality}
                onChange={e =>
                  setFormData({ ...formData, confidentiality: e.target.value })
                }
                placeholder="Describa las políticas de confidencialidad..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="amendments">Procedimiento de Modificación</Label>
              <Textarea
                id="amendments"
                value={formData.amendments}
                onChange={e =>
                  setFormData({ ...formData, amendments: e.target.value })
                }
                placeholder="Describa cómo se pueden modificar estas bases..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="signatures">Firmas de Aprobación (JSON)</Label>
              <Textarea
                id="signatures"
                value={formData.signatures}
                onChange={e =>
                  setFormData({ ...formData, signatures: e.target.value })
                }
                placeholder='[{"name": "Juan Pérez", "position": "Presidente", "date": "2024-01-15"}]'
                rows={3}
              />
            </div>

            {isEditing && (
              <div>
                <Label htmlFor="changeDescription">
                  Descripción de Cambios
                </Label>
                <Textarea
                  id="changeDescription"
                  value={formData.changeDescription}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      changeDescription: e.target.value,
                    })
                  }
                  placeholder="Describa los cambios realizados en esta versión..."
                  rows={2}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={isCreating ? handleCreate : handleUpdate}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                <ICONS.actions.save className="h-4 w-4 mr-2" />
                {isCreating ? "Crear" : "Guardar Cambios"}
              </Button>
              <Button variant="outline" onClick={cancelEditing}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb
        items={[
          { label: "Comité", href: "/committee" },
          { label: "Bases de Funcionamiento" },
        ]}
      />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Bases de Funcionamiento del Comité
          </h1>
          <p className="text-muted-foreground">
            Gestión de bases de funcionamiento con historial de versiones
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSearchDialog(true)}>
            <Search className="h-4 w-4 mr-2" />
            Buscar
          </Button>
          <Button variant="outline" onClick={() => setShowTemplateDialog(true)}>
            <ICONS.documents.generic className="h-4 w-4 mr-2" />
            Crear desde Plantilla
          </Button>
          <Button onClick={startCreating}>
            <ICONS.actions.create className="h-4 w-4 mr-2" />
            Nueva Base de Funcionamiento
          </Button>
        </div>
      </div>

      {/* Lista de bases de funcionamiento */}
      <Card>
        <CardHeader>
          <CardTitle>Bases de Funcionamiento Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Versión</TableHead>
                <TableHead>Fecha Vigencia</TableHead>
                <TableHead>Próxima Revisión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado Por</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingRules ? (
                <TableSkeleton rows={3} columns={6} />
              ) : (
                rules?.map((rule: any) => (
                  <TableRow key={rule.id}>
                    <TableCell className="font-medium">
                      {rule.version}
                    </TableCell>
                    <TableCell>
                      {rule.effectiveDate
                        ? format(new Date(rule.effectiveDate), "dd/MM/yyyy", {
                            locale: es,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {rule.nextReviewDate
                        ? format(new Date(rule.nextReviewDate), "dd/MM/yyyy", {
                            locale: es,
                          })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          rule.status === "active" ? "default" : "secondary"
                        }
                      >
                        {rule.status === "active" ? "Activo" : "Borrador"}
                      </Badge>
                    </TableCell>
                    <TableCell>{rule.creatorName || "Desconocido"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRuleId(rule.id);
                            setShowVersionHistory(false);
                          }}
                        >
                          <ICONS.actions.view className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedRuleId(rule.id);
                            setShowVersionHistory(true);
                          }}
                        >
                          <ICONS.navigation.back className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Empty State cuando no hay documentos */}
      {!isLoadingRules && (!rules || rules.length === 0) && (
        <EmptyState
          icon={EMPTY_STATES.operating_rules_empty.icon}
          title={EMPTY_STATES.operating_rules_empty.title}
          description={EMPTY_STATES.operating_rules_empty.description}
          action={{
            label: "Crear Primera Base de Funcionamiento",
            onClick: startCreating,
          }}
          secondaryAction={{
            label: "Usar Plantilla Predefinida",
            onClick: () => setShowTemplateDialog(true),
          }}
        />
      )}

      {/* Detalle de la base de funcionamiento seleccionada */}
      {selectedRuleId && currentRule && !showVersionHistory && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>
                  Bases de Funcionamiento - {currentRule.version}
                </CardTitle>
                <CardDescription>
                  Vigente desde{" "}
                  {format(new Date(currentRule.effectiveDate), "dd/MM/yyyy", {
                    locale: es,
                  })}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {currentRule.status === "draft" && (
                  <Button
                    size="sm"
                    onClick={handleApprove}
                    disabled={approveMutation.isPending}
                  >
                    <ICONS.status.success className="h-4 w-4 mr-2" />
                    Aprobar
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={startEditing}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    generatePDFMutation.mutate({ id: selectedRuleId })
                  }
                  disabled={generatePDFMutation.isPending}
                >
                  <ICONS.actions.download className="h-4 w-4 mr-2" />
                  {generatePDFMutation.isPending
                    ? "Generando..."
                    : "Exportar PDF"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowVersionHistory(true)}
                >
                  <ICONS.navigation.back className="h-4 w-4 mr-2" />
                  Ver Historial
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Objetivos del Comité</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {currentRule.objectives}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Estructura Organizacional</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {currentRule.structure}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">
                Funciones y Responsabilidades
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {currentRule.roles}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">
                  Periodicidad de Reuniones
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {currentRule.meetingFrequency}
                </p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Quórum Mínimo</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {currentRule.quorum}
                </p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Toma de Decisiones</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {currentRule.decisionMaking}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Mecanismos de Comunicación</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {currentRule.communication}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">
                Procedimiento de Atención de Casos
              </h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {currentRule.caseHandling}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Confidencialidad</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {currentRule.confidentiality}
              </p>
            </div>
            {currentRule.amendments && (
              <div>
                <h3 className="font-semibold mb-2">
                  Procedimiento de Modificación
                </h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {currentRule.amendments}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Workflow de Aprobación */}
      {selectedRuleId && !showVersionHistory && (
        <ApprovalWorkflow
          operatingRuleId={selectedRuleId}
          operatingRuleVersion={(currentRule as any)?.version || ""}
        />
      )}

      {/* Historial de Cambios con Timeline */}
      {selectedRuleId && !showVersionHistory && (
        <OperatingRulesTimeline operatingRuleId={selectedRuleId} />
      )}

      {/* Historial de versiones */}
      {selectedRuleId && showVersionHistory && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Historial de Versiones</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCompareDialog(true)}
                  disabled={!versions || versions.length < 2}
                >
                  <ICONS.data.chart className="h-4 w-4 mr-2" />
                  Comparar Versiones
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowVersionHistory(false)}
                >
                  Volver al Detalle
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versión</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción de Cambios</TableHead>
                  <TableHead>Creado Por</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions?.map((version, index) => (
                  <TableRow key={version.id}>
                    <TableCell className="font-medium">
                      {version.version}
                    </TableCell>
                    <TableCell>
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        V{version.versionNumber} {index === 0 && "(Actual)"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(version.createdAt), "dd/MM/yyyy HH:mm", {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell>{version.changeDescription || "-"}</TableCell>
                    <TableCell>
                      {version.creatorName || "Desconocido"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedVersionId(version.id)}
                        >
                          <ICONS.actions.view className="h-4 w-4" />
                        </Button>
                        {index !== 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedVersionId(version.id);
                              setShowRestoreDialog(true);
                            }}
                          >
                            <ICONS.actions.undo className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog de restauración */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restaurar Versión Anterior</DialogTitle>
            <DialogDescription>
              ¿Está seguro de que desea restaurar esta versión? Se creará una
              nueva versión con el contenido seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="restoreDescription">Descripción del cambio</Label>
            <Textarea
              id="restoreDescription"
              value={formData.changeDescription}
              onChange={e =>
                setFormData({ ...formData, changeDescription: e.target.value })
              }
              placeholder="Describa el motivo de la restauración..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRestoreDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRestore}
              disabled={restoreMutation.isPending}
            >
              <ICONS.actions.undo className="h-4 w-4 mr-2" />
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de visualización de versión */}
      <Dialog
        open={!!selectedVersionId && !showRestoreDialog}
        onOpenChange={() => setSelectedVersionId(null)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Versión {selectedVersion?.version} - V
              {selectedVersion?.versionNumber}
            </DialogTitle>
            <DialogDescription>
              Creada el{" "}
              {selectedVersion &&
                format(
                  new Date(selectedVersion.createdAt),
                  "dd/MM/yyyy HH:mm",
                  { locale: es }
                )}
            </DialogDescription>
          </DialogHeader>
          {selectedVersion && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Descripción de Cambios</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedVersion.changeDescription || "Sin descripción"}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Objetivos</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedVersion.objectives}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Estructura</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedVersion.structure}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Roles</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {selectedVersion.roles}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedVersionId(null)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de comparación de versiones */}
      <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ICONS.data.chart className="h-5 w-5" />
              Comparar Versiones
            </DialogTitle>
            <DialogDescription>
              Seleccione dos versiones para comparar sus diferencias
            </DialogDescription>
          </DialogHeader>

          {!compareVersionIds[0] || !compareVersionIds[1] ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Primera Versión</Label>
                  <select
                    className="w-full mt-2 p-2 border rounded-md"
                    value={compareVersionIds[0] || ""}
                    onChange={e =>
                      setCompareVersionIds([
                        Number(e.target.value),
                        compareVersionIds[1],
                      ])
                    }
                  >
                    <option value="">Seleccione una versión</option>
                    {versions?.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        V{v.versionNumber} - {v.version} (
                        {format(new Date(v.createdAt), "dd/MM/yyyy", {
                          locale: es,
                        })}
                        )
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Segunda Versión</Label>
                  <select
                    className="w-full mt-2 p-2 border rounded-md"
                    value={compareVersionIds[1] || ""}
                    onChange={e =>
                      setCompareVersionIds([
                        compareVersionIds[0],
                        Number(e.target.value),
                      ])
                    }
                  >
                    <option value="">Seleccione una versión</option>
                    {versions?.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        V{v.versionNumber} - {v.version} (
                        {format(new Date(v.createdAt), "dd/MM/yyyy", {
                          locale: es,
                        })}
                        )
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (compareVersionIds[0] && compareVersionIds[1]) {
                      // La comparación se cargará automáticamente
                    } else {
                      showErrorToast(
                        "Selección incompleta",
                        "Debes seleccionar exactamente dos versiones para comparar"
                      );
                    }
                  }}
                  disabled={!compareVersionIds[0] || !compareVersionIds[1]}
                >
                  Comparar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCompareDialog(false);
                    setCompareVersionIds([null, null]);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : comparison ? (
            <div className="space-y-4">
              <VersionComparison
                version1={comparison.version1}
                version2={comparison.version2}
                differences={comparison.differences}
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCompareVersionIds([null, null])}
                >
                  Comparar Otras Versiones
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCompareDialog(false);
                    setCompareVersionIds([null, null]);
                  }}
                >
                  Cerrar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Cargando comparación...
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de selección de plantillas */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Crear Base de Funcionamiento desde Plantilla
            </DialogTitle>
            <DialogDescription>
              Selecciona una plantilla predefinida según el tamaño de tu empresa
              para agilizar la creación.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Selector de plantilla */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {templates?.map((template: any) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all ${
                    selectedTemplateId === template.id
                      ? "ring-2 ring-primary"
                      : "hover:border-primary"
                  }`}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <CardDescription>
                      {template.companySize === "small" && "Hasta 15 empleados"}
                      {template.companySize === "medium" && "16-50 empleados"}
                      {template.companySize === "large" &&
                        "Más de 50 empleados"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-sm">
                      <p className="font-semibold">Características:</p>
                      <ul className="list-disc list-inside text-muted-foreground mt-1 space-y-1">
                        <li>{template.structure}</li>
                        <li>{template.meetingSchedule}</li>
                        <li>Roles predefinidos</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Preview de plantilla seleccionada */}
            {selectedTemplateId && (
              <Card>
                <CardHeader>
                  <CardTitle>Vista Previa de Contenido</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {templates?.find((t: any) => t.id === selectedTemplateId) && (
                    <>
                      <div>
                        <h4 className="font-semibold mb-2">Objetivos:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {
                            templates.find(
                              (t: any) => t.id === selectedTemplateId
                            )?.objectives
                          }
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Estructura:</h4>
                        <p className="text-sm text-muted-foreground">
                          {
                            templates.find(
                              (t: any) => t.id === selectedTemplateId
                            )?.structure
                          }
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Roles:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {
                            templates.find(
                              (t: any) => t.id === selectedTemplateId
                            )?.roles
                          }
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Campo de título personalizado */}
            {selectedTemplateId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Título Personalizado (Opcional)
                </label>
                <Input
                  value={customTitle}
                  onChange={e => setCustomTitle(e.target.value)}
                  placeholder="Deja en blanco para usar el título de la plantilla"
                />
                <p className="text-xs text-muted-foreground">
                  Si no especificas un título, se usará: "
                  {
                    templates?.find((t: any) => t.id === selectedTemplateId)
                      ?.title
                  }
                  "
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTemplateDialog(false);
                setSelectedTemplateId(null);
                setCustomTitle("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedTemplateId) {
                  createFromTemplateMutation.mutate({
                    templateId: selectedTemplateId,
                    customTitle: customTitle || undefined,
                  });
                }
              }}
              disabled={
                !selectedTemplateId || createFromTemplateMutation.isPending
              }
            >
              {createFromTemplateMutation.isPending
                ? "Creando..."
                : "Crear Base de Funcionamiento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de búsqueda */}
      <SearchOperatingRules
        open={showSearchDialog}
        onOpenChange={setShowSearchDialog}
        onSelectResult={ruleId => {
          setSelectedRuleId(ruleId);
          setShowSearchDialog(false);
        }}
      />
    </div>
  );
}
