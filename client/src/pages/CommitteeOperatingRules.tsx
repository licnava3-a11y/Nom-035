import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
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
import { FileText, History, Eye, RotateCcw, GitCompare, Plus, Save, Check } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import VersionComparison from "@/components/VersionComparison";

export default function CommitteeOperatingRules() {
  const [selectedRuleId, setSelectedRuleId] = useState<number | null>(null);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<number | null>(null);
  const [compareVersionIds, setCompareVersionIds] = useState<[number | null, number | null]>([null, null]);
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
  const { data: rules, refetch: refetchRules } = trpc.committeeOperatingRules.list.useQuery();
  const { data: currentRule, refetch: refetchCurrentRule } = trpc.committeeOperatingRules.getById.useQuery(
    { id: selectedRuleId! },
    { enabled: !!selectedRuleId && !isCreating }
  );
  const { data: versions, refetch: refetchVersions } = trpc.committeeOperatingRules.listVersions.useQuery(
    { operatingRuleId: selectedRuleId! },
    { enabled: !!selectedRuleId && showVersionHistory }
  );
  const { data: selectedVersion } = trpc.committeeOperatingRules.getVersion.useQuery(
    { versionId: selectedVersionId! },
    { enabled: !!selectedVersionId }
  );
  const { data: comparison } = trpc.committeeOperatingRules.compareVersions.useQuery(
    { versionId1: compareVersionIds[0]!, versionId2: compareVersionIds[1]! },
    { enabled: !!compareVersionIds[0] && !!compareVersionIds[1] }
  );

  // Mutations
  const createMutation = trpc.committeeOperatingRules.create.useMutation({
    onSuccess: () => {
      toast.success("Bases de funcionamiento creadas exitosamente");
      refetchRules();
      setIsCreating(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(`Error al crear: ${error.message}`);
    },
  });

  const updateMutation = trpc.committeeOperatingRules.update.useMutation({
    onSuccess: () => {
      toast.success("Bases de funcionamiento actualizadas exitosamente");
      refetchCurrentRule();
      refetchVersions();
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  const restoreMutation = trpc.committeeOperatingRules.restoreVersion.useMutation({
    onSuccess: () => {
      toast.success("Versión restaurada exitosamente");
      refetchCurrentRule();
      refetchVersions();
      setShowRestoreDialog(false);
      setSelectedVersionId(null);
    },
    onError: (error) => {
      toast.error(`Error al restaurar: ${error.message}`);
    },
  });

  const approveMutation = trpc.committeeOperatingRules.approve.useMutation({
    onSuccess: () => {
      toast.success("Bases de funcionamiento aprobadas exitosamente");
      refetchRules();
      refetchCurrentRule();
    },
    onError: (error) => {
      toast.error(`Error al aprobar: ${error.message}`);
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
      effectiveDate: rule.effectiveDate || new Date().toISOString().split("T")[0],
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {isCreating ? "Crear Bases de Funcionamiento" : "Editar Bases de Funcionamiento"}
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
                  onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                  placeholder="V1.0"
                />
              </div>
              <div>
                <Label htmlFor="effectiveDate">Fecha de Vigencia</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="nextReviewDate">Próxima Revisión</Label>
                <Input
                  id="nextReviewDate"
                  type="date"
                  value={formData.nextReviewDate}
                  onChange={(e) => setFormData({ ...formData, nextReviewDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="objectives">Objetivos del Comité</Label>
              <Textarea
                id="objectives"
                value={formData.objectives}
                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                placeholder="Describa los objetivos del comité..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="structure">Estructura Organizacional</Label>
              <Textarea
                id="structure"
                value={formData.structure}
                onChange={(e) => setFormData({ ...formData, structure: e.target.value })}
                placeholder="Describa la integración y estructura del comité..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="roles">Funciones y Responsabilidades</Label>
              <Textarea
                id="roles"
                value={formData.roles}
                onChange={(e) => setFormData({ ...formData, roles: e.target.value })}
                placeholder="Describa las funciones de cada miembro..."
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="meetingFrequency">Periodicidad de Reuniones</Label>
                <Textarea
                  id="meetingFrequency"
                  value={formData.meetingFrequency}
                  onChange={(e) => setFormData({ ...formData, meetingFrequency: e.target.value })}
                  placeholder="Ej: Reuniones mensuales ordinarias..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="quorum">Quórum Mínimo</Label>
                <Textarea
                  id="quorum"
                  value={formData.quorum}
                  onChange={(e) => setFormData({ ...formData, quorum: e.target.value })}
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
                onChange={(e) => setFormData({ ...formData, decisionMaking: e.target.value })}
                placeholder="Describa el procedimiento de toma de decisiones..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="communication">Mecanismos de Comunicación</Label>
              <Textarea
                id="communication"
                value={formData.communication}
                onChange={(e) => setFormData({ ...formData, communication: e.target.value })}
                placeholder="Describa los canales de comunicación interna..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="caseHandling">Procedimiento de Atención de Casos</Label>
              <Textarea
                id="caseHandling"
                value={formData.caseHandling}
                onChange={(e) => setFormData({ ...formData, caseHandling: e.target.value })}
                placeholder="Describa el proceso de atención de casos..."
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="confidentiality">Confidencialidad y Manejo de Información</Label>
              <Textarea
                id="confidentiality"
                value={formData.confidentiality}
                onChange={(e) => setFormData({ ...formData, confidentiality: e.target.value })}
                placeholder="Describa las políticas de confidencialidad..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="amendments">Procedimiento de Modificación</Label>
              <Textarea
                id="amendments"
                value={formData.amendments}
                onChange={(e) => setFormData({ ...formData, amendments: e.target.value })}
                placeholder="Describa cómo se pueden modificar estas bases..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="signatures">Firmas de Aprobación (JSON)</Label>
              <Textarea
                id="signatures"
                value={formData.signatures}
                onChange={(e) => setFormData({ ...formData, signatures: e.target.value })}
                placeholder='[{"name": "Juan Pérez", "position": "Presidente", "date": "2024-01-15"}]'
                rows={3}
              />
            </div>

            {isEditing && (
              <div>
                <Label htmlFor="changeDescription">Descripción de Cambios</Label>
                <Textarea
                  id="changeDescription"
                  value={formData.changeDescription}
                  onChange={(e) => setFormData({ ...formData, changeDescription: e.target.value })}
                  placeholder="Describa los cambios realizados en esta versión..."
                  rows={2}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={isCreating ? handleCreate : handleUpdate} disabled={createMutation.isPending || updateMutation.isPending}>
                <Save className="h-4 w-4 mr-2" />
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bases de Funcionamiento del Comité</h1>
          <p className="text-muted-foreground">Gestión de bases de funcionamiento con historial de versiones</p>
        </div>
        <Button onClick={startCreating}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Base de Funcionamiento
        </Button>
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
              {rules?.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.version}</TableCell>
                  <TableCell>
                    {rule.effectiveDate
                      ? format(new Date(rule.effectiveDate), "dd/MM/yyyy", { locale: es })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {rule.nextReviewDate
                      ? format(new Date(rule.nextReviewDate), "dd/MM/yyyy", { locale: es })
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={rule.status === "active" ? "default" : "secondary"}>
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
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedRuleId(rule.id);
                          setShowVersionHistory(true);
                        }}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!rules || rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No hay bases de funcionamiento registradas
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detalle de la base de funcionamiento seleccionada */}
      {selectedRuleId && currentRule && !showVersionHistory && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Bases de Funcionamiento - {currentRule.version}</CardTitle>
                <CardDescription>
                  Vigente desde {format(new Date(currentRule.effectiveDate), "dd/MM/yyyy", { locale: es })}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {currentRule.status === "draft" && (
                  <Button size="sm" onClick={handleApprove} disabled={approveMutation.isPending}>
                    <Check className="h-4 w-4 mr-2" />
                    Aprobar
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={startEditing}>
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowVersionHistory(true)}
                >
                  <History className="h-4 w-4 mr-2" />
                  Ver Historial
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Objetivos del Comité</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentRule.objectives}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Estructura Organizacional</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentRule.structure}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Funciones y Responsabilidades</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentRule.roles}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Periodicidad de Reuniones</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentRule.meetingFrequency}</p>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Quórum Mínimo</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentRule.quorum}</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Toma de Decisiones</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentRule.decisionMaking}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Mecanismos de Comunicación</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentRule.communication}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Procedimiento de Atención de Casos</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentRule.caseHandling}</p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Confidencialidad</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentRule.confidentiality}</p>
            </div>
            {currentRule.amendments && (
              <div>
                <h3 className="font-semibold mb-2">Procedimiento de Modificación</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{currentRule.amendments}</p>
              </div>
            )}
          </CardContent>
        </Card>
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
                  <GitCompare className="h-4 w-4 mr-2" />
                  Comparar Versiones
                </Button>
                <Button variant="outline" onClick={() => setShowVersionHistory(false)}>
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
                    <TableCell className="font-medium">{version.version}</TableCell>
                    <TableCell>
                      <Badge variant={index === 0 ? "default" : "secondary"}>
                        V{version.versionNumber} {index === 0 && "(Actual)"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(version.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                    </TableCell>
                    <TableCell>{version.changeDescription || "-"}</TableCell>
                    <TableCell>{version.creatorName || "Desconocido"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedVersionId(version.id)}
                        >
                          <Eye className="h-4 w-4" />
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
                            <RotateCcw className="h-4 w-4" />
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
              ¿Está seguro de que desea restaurar esta versión? Se creará una nueva versión con el contenido seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="restoreDescription">Descripción del cambio</Label>
            <Textarea
              id="restoreDescription"
              value={formData.changeDescription}
              onChange={(e) => setFormData({ ...formData, changeDescription: e.target.value })}
              placeholder="Describa el motivo de la restauración..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRestore} disabled={restoreMutation.isPending}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de visualización de versión */}
      <Dialog open={!!selectedVersionId && !showRestoreDialog} onOpenChange={() => setSelectedVersionId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Versión {selectedVersion?.version} - V{selectedVersion?.versionNumber}
            </DialogTitle>
            <DialogDescription>
              Creada el {selectedVersion && format(new Date(selectedVersion.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
            </DialogDescription>
          </DialogHeader>
          {selectedVersion && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Descripción de Cambios</h4>
                <p className="text-sm text-muted-foreground">{selectedVersion.changeDescription || "Sin descripción"}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Objetivos</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedVersion.objectives}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Estructura</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedVersion.structure}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Roles</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedVersion.roles}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedVersionId(null)}>
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
              <GitCompare className="h-5 w-5" />
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
                    onChange={(e) => setCompareVersionIds([Number(e.target.value), compareVersionIds[1]])}
                  >
                    <option value="">Seleccione una versión</option>
                    {versions?.map((v) => (
                      <option key={v.id} value={v.id}>
                        V{v.versionNumber} - {v.version} ({format(new Date(v.createdAt), "dd/MM/yyyy", { locale: es })})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Segunda Versión</Label>
                  <select
                    className="w-full mt-2 p-2 border rounded-md"
                    value={compareVersionIds[1] || ""}
                    onChange={(e) => setCompareVersionIds([compareVersionIds[0], Number(e.target.value)])}
                  >
                    <option value="">Seleccione una versión</option>
                    {versions?.map((v) => (
                      <option key={v.id} value={v.id}>
                        V{v.versionNumber} - {v.version} ({format(new Date(v.createdAt), "dd/MM/yyyy", { locale: es })})
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
                      toast.error("Seleccione dos versiones para comparar");
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
    </div>
  );
}
