import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Plus, Calendar, Users, CheckCircle, Clock, Archive, HelpCircle } from "lucide-react";

export default function SurveyPeriodsManager() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"all" | "guia_i" | "guia_ii" | "guia_iii">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "draft" | "active" | "closed" | "archived">("all");

  // Queries
  const { data: periods, refetch: refetchPeriods } = trpc.surveyPeriods.list.useQuery({
    surveyType: filterType === "all" ? undefined : filterType,
    status: filterStatus === "all" ? undefined : filterStatus,
  });

  const { data: periodDetails } = trpc.surveyPeriods.getById.useQuery(selectedPeriod!, {
    enabled: !!selectedPeriod,
  });

  const { data: activeEmployees } = trpc.surveyPeriods.getActiveEmployees.useQuery();

  // Estabilizar opciones de Select para evitar errores de removeChild
  const surveyTypeOptions = useMemo(() => [
    { value: "all", label: "Todas las guías" },
    { value: "guia_i", label: "Guía I" },
    { value: "guia_ii", label: "Guía II" },
    { value: "guia_iii", label: "Guía III" },
  ], []);

  const statusOptions = useMemo(() => [
    { value: "all", label: "Todos los estados" },
    { value: "draft", label: "Borrador" },
    { value: "active", label: "Activo" },
    { value: "closed", label: "Cerrado" },
    { value: "archived", label: "Archivado" },
  ], []);

  const createSurveyTypeOptions = useMemo(() => [
    { value: "guia_i", label: "Guía I - Identificación y análisis de factores de riesgo psicosocial" },
    { value: "guia_ii", label: "Guía II - Identificación de trabajadores expuestos a acontecimientos traumáticos severos" },
    { value: "guia_iii", label: "Guía III - Identificación de trabajadores que fueron sujetos a acontecimientos traumáticos severos" },
  ], []);

  // Mutations
  const createPeriodMutation = trpc.surveyPeriods.create.useMutation({
    onSuccess: (data) => {
      toast.success("Periodo creado", {
        description: data.message,
      });
      setIsCreateDialogOpen(false);
      refetchPeriods();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const updatePeriodMutation = trpc.surveyPeriods.update.useMutation({
    onSuccess: () => {
      toast.success("Periodo actualizado", {
        description: "El periodo se actualizó correctamente",
      });
      refetchPeriods();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const deletePeriodMutation = trpc.surveyPeriods.delete.useMutation({
    onSuccess: () => {
      toast.success("Periodo eliminado", {
        description: "El periodo se eliminó correctamente",
      });
      refetchPeriods();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  const generateTokensMutation = trpc.surveyPeriods.generateTokens.useMutation({
    onSuccess: (data) => {
      toast.success("Tokens generados", {
        description: data.message,
      });
      refetchPeriods();
    },
    onError: (error) => {
      toast.error("Error", {
        description: error.message,
      });
    },
  });

  // Form handlers
  const handleCreatePeriod = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createPeriodMutation.mutate({
      name: formData.get("name") as string,
      surveyType: formData.get("surveyType") as "guia_i" | "guia_ii" | "guia_iii",
      startDate: formData.get("startDate") as string,
      endDate: formData.get("endDate") as string,
      description: formData.get("description") as string,
      generateTokens: formData.get("generateTokens") === "on",
    });
  };

  const handleUpdateStatus = (periodId: number, newStatus: "draft" | "active" | "closed" | "archived") => {
    updatePeriodMutation.mutate({
      id: periodId,
      status: newStatus,
    });
  };

  const handleGenerateTokens = (periodId: number) => {
    generateTokensMutation.mutate({ periodId });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      draft: "outline",
      active: "default",
      closed: "secondary",
      archived: "destructive",
    };

    const labels: Record<string, string> = {
      draft: "Borrador",
      active: "Activo",
      closed: "Cerrado",
      archived: "Archivado",
    };

    return <Badge variant={variants[status] || "default"}>{labels[status] || status}</Badge>;
  };

  const getSurveyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      guia_i: "Guía I",
      guia_ii: "Guía II",
      guia_iii: "Guía III",
    };
    return labels[type] || type;
  };

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Periodos de Aplicación NOM-035</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona los periodos de aplicación de encuestas NOM-035 STPS 2018
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Periodo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleCreatePeriod}>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Periodo de Aplicación</DialogTitle>
                <DialogDescription>
                  Define un nuevo periodo para aplicar encuestas NOM-035 a los trabajadores activos
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Nombre del Periodo *</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Ej: Evaluación Primer Semestre 2026"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="surveyType">Tipo de Encuesta *</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="font-semibold mb-1">Guías de Referencia NOM-035</p>
                          <ul className="text-xs space-y-1">
                            <li>• <strong>Guía I:</strong> Identificación y análisis de factores de riesgo psicosocial (todos los centros de trabajo)</li>
                            <li>• <strong>Guía II:</strong> Identificación de trabajadores expuestos a acontecimientos traumáticos severos</li>
                            <li>• <strong>Guía III:</strong> Evaluación del entorno organizacional (centros con +50 trabajadores)</li>
                          </ul>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Select name="surveyType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione el tipo de encuesta" />
                    </SelectTrigger>
                    <SelectContent>
                      {createSurveyTypeOptions.map((option) => (
                        <SelectItem key={`create-survey-${option.value}`} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="startDate">Fecha de Inicio *</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Fecha en que inicia el periodo de aplicación de la encuesta. Los trabajadores podrán responder a partir de esta fecha.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="date"
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="endDate">Fecha de Fin *</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Fecha límite para responder la encuesta. Después de esta fecha, el periodo se cerrará automáticamente y no se aceptarán más respuestas.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="date"
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descripción (Opcional)</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Descripción del periodo..."
                    rows={3}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="generateTokens"
                    name="generateTokens"
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="generateTokens" className="text-sm font-normal">
                    Generar tokens automáticamente para trabajadores activos ({activeEmployees?.total || 0} trabajadores)
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <LoadingButton type="submit" loading={createPeriodMutation.isPending} loadingText="Creando...">Crear Periodo</LoadingButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Tipo de Encuesta</Label>
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {surveyTypeOptions.map((option) => (
                    <SelectItem key={`filter-type-${option.value}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Estado</Label>
              <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={`filter-status-${option.value}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Periodos */}
      <div className="grid gap-4">
        {periods?.map((period) => (
          <Card key={period.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {period.name}
                    {getStatusBadge(period.status)}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(period.startDate).toLocaleDateString()} - {new Date(period.endDate).toLocaleDateString()}
                      </span>
                      <Badge variant="outline">{getSurveyTypeLabel(period.surveyType)}</Badge>
                    </div>
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {period.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(period.id, "active")}
                      disabled={updatePeriodMutation.isPending}
                    >
                      Activar
                    </Button>
                  )}
                  {period.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(period.id, "closed")}
                      disabled={updatePeriodMutation.isPending}
                    >
                      Cerrar
                    </Button>
                  )}
                  {period.status === "closed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(period.id, "archived")}
                      disabled={updatePeriodMutation.isPending}
                    >
                      <Archive className="h-4 w-4 mr-1" />
                      Archivar
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tokens Generados</p>
                    <p className="text-2xl font-bold">{period.totalTokens}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Respuestas Completadas</p>
                    <p className="text-2xl font-bold">{period.totalResponses}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tasa de Completitud</p>
                    <p className="text-2xl font-bold">{period.completionRate}%</p>
                  </div>
                </div>
              </div>
              {period.description && (
                <p className="text-sm text-muted-foreground mt-4">{period.description}</p>
              )}
              <div className="flex gap-2 mt-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleGenerateTokens(period.id)}
                  disabled={generateTokensMutation.isPending}
                >
                  Generar Tokens Adicionales
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedPeriod(period.id)}
                >
                  Ver Detalles
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {periods?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No se encontraron periodos de aplicación</p>
              <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear Primer Periodo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
