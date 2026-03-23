import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Target,
  Plus,
  Edit,
  Trash2,
  Calendar,
  User,
  BarChart3
} from "lucide-react";

export default function RecommendationsTracking() {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPriority, setSelectedPriority] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState<any>(null);

  // Queries
  const { data: dashboard, isLoading: loadingDashboard } = trpc.recommendationsTracking.getDashboard.useQuery();
  const { data: recommendations, isLoading: loadingList, refetch } = trpc.recommendationsTracking.list.useQuery({
    status: selectedStatus !== "all" ? selectedStatus as any : undefined,
    priority: selectedPriority !== "all" ? selectedPriority as any : undefined,
  });

  // Mutations
  const createMutation = trpc.recommendationsTracking.create.useMutation({
    onSuccess: () => {
      toast.success("Recomendación creada exitosamente");
      setIsCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateMutation = trpc.recommendationsTracking.update.useMutation({
    onSuccess: () => {
      toast.success("Recomendación actualizada exitosamente");
      setIsEditDialogOpen(false);
      setSelectedRecommendation(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteMutation = trpc.recommendationsTracking.delete.useMutation({
    onSuccess: () => {
      toast.success("Recomendación eliminada exitosamente");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const calculateEffectivenessMutation = trpc.recommendationsTracking.calculateEffectiveness.useMutation({
    onSuccess: (data) => {
      toast.success(`Efectividad calculada: ${data.reductionPercentage?.toFixed(2)}% de reducción`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      analysisId: parseInt(formData.get("analysisId") as string),
      recommendation: formData.get("recommendation") as string,
      priority: formData.get("priority") as any,
      category: formData.get("category") as string,
      assignedTo: formData.get("assignedTo") ? parseInt(formData.get("assignedTo") as string) : undefined,
      dueDate: formData.get("dueDate") as string || undefined,
      targetCaseType: formData.get("targetCaseType") as string || undefined,
      baselineCaseCount: formData.get("baselineCaseCount") ? parseInt(formData.get("baselineCaseCount") as string) : undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedRecommendation) return;
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: selectedRecommendation.recommendation.id,
      recommendation: formData.get("recommendation") as string,
      priority: formData.get("priority") as any,
      category: formData.get("category") as string,
      status: formData.get("status") as any,
      assignedTo: formData.get("assignedTo") ? parseInt(formData.get("assignedTo") as string) : undefined,
      dueDate: formData.get("dueDate") as string || undefined,
      completionDate: formData.get("completionDate") as string || undefined,
      currentCaseCount: formData.get("currentCaseCount") ? parseInt(formData.get("currentCaseCount") as string) : undefined,
      notes: formData.get("notes") as string || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("¿Estás seguro de eliminar esta recomendación?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleCalculateEffectiveness = (id: number) => {
    calculateEffectivenessMutation.mutate({ id });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "default";
      case "medium": return "secondary";
      case "low": return "outline";
      default: return "outline";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in_progress": return "bg-blue-100 text-blue-800";
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "cancelled": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed": return "Completada";
      case "in_progress": return "En Progreso";
      case "pending": return "Pendiente";
      case "cancelled": return "Cancelada";
      default: return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case "critical": return "Crítica";
      case "high": return "Alta";
      case "medium": return "Media";
      case "low": return "Baja";
      default: return priority;
    }
  };

  if (loadingDashboard || loadingList) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats;
  const completionRate = stats?.total ? ((stats.completed || 0) / stats.total) * 100 : 0;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Seguimiento de Recomendaciones</h1>
          <p className="text-muted-foreground mt-2">
            Monitorea la implementación y efectividad de las recomendaciones preventivas
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Recomendación
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Crear Nueva Recomendación</DialogTitle>
                <DialogDescription>
                  Agrega una nueva recomendación preventiva al sistema
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="analysisId">ID del Análisis *</Label>
                  <Input id="analysisId" name="analysisId" type="number" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="recommendation">Recomendación *</Label>
                  <Textarea id="recommendation" name="recommendation" rows={3} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="priority">Prioridad *</Label>
                    <Select modal={false} name="priority" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baja</SelectItem>
                        <SelectItem value="medium">Media</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="critical">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Categoría</Label>
                    <Input id="category" name="category" placeholder="ej. Capacitación" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="assignedTo">ID del Responsable</Label>
                    <Input id="assignedTo" name="assignedTo" type="number" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="dueDate">Fecha Límite</Label>
                    <Input id="dueDate" name="dueDate" type="date" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="targetCaseType">Tipo de Caso Objetivo</Label>
                    <Input id="targetCaseType" name="targetCaseType" placeholder="ej. mobbing" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="baselineCaseCount">Casos Baseline</Label>
                    <Input id="baselineCaseCount" name="baselineCaseCount" type="number" />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea id="notes" name="notes" rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <LoadingButton type="submit" loading={createMutation.isPending} loadingText="Creando...">Crear Recomendación</LoadingButton>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recomendaciones</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.critical || 0} críticas, {stats?.high || 0} altas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Completitud</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.completed || 0} de {stats?.total || 0} completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.inProgress || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.pending || 0} pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efectividad Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgReduction ? `${parseFloat(stats.avgReduction.toString()).toFixed(1)}%` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Reducción de casos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Próximas a Vencer */}
      {dashboard?.upcomingDeadlines && dashboard.upcomingDeadlines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Recomendaciones Próximas a Vencer (7 días)
            </CardTitle>
            <CardDescription>
              Recomendaciones que requieren atención urgente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.upcomingDeadlines.map((item: any) => (
                <div key={item.recommendation.id} className="flex items-start justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.recommendation.recommendation}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {item.recommendation.dueDate ? new Date(item.recommendation.dueDate).toLocaleDateString() : "Sin fecha"}
                      </span>
                      {item.assignee && (
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {item.assignee.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={getPriorityColor(item.recommendation.priority)}>
                    {getPriorityLabel(item.recommendation.priority)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Efectivas */}
      {dashboard?.topEffective && dashboard.topEffective.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              Recomendaciones Más Efectivas
            </CardTitle>
            <CardDescription>
              Top 5 recomendaciones con mayor reducción de casos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.topEffective.map((item: any) => (
                <div key={item.recommendation.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{item.recommendation.recommendation}</p>
                    {item.department && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Departamento: {item.department.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-green-500" />
                    <span className="text-2xl font-bold text-green-600">
                      {item.recommendation.reductionPercentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Estado</Label>
              <Select modal={false} value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="in_progress">En Progreso</SelectItem>
                  <SelectItem value="completed">Completada</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label>Prioridad</Label>
              <Select modal={false} value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Recomendaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Todas las Recomendaciones</CardTitle>
          <CardDescription>
            {recommendations?.length || 0} recomendaciones encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations?.map((item: any) => (
              <div key={item.recommendation.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getPriorityColor(item.recommendation.priority)}>
                        {getPriorityLabel(item.recommendation.priority)}
                      </Badge>
                      <Badge className={getStatusColor(item.recommendation.status)}>
                        {getStatusLabel(item.recommendation.status)}
                      </Badge>
                      {item.recommendation.category && (
                        <Badge variant="outline">{item.recommendation.category}</Badge>
                      )}
                    </div>
                    <p className="font-medium text-lg">{item.recommendation.recommendation}</p>
                    {item.recommendation.notes && (
                      <p className="text-sm text-muted-foreground mt-2">{item.recommendation.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRecommendation(item);
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(item.recommendation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {item.assignee && (
                    <div>
                      <span className="text-muted-foreground">Responsable:</span>
                      <p className="font-medium">{item.assignee.name}</p>
                    </div>
                  )}
                  {item.recommendation.dueDate && (
                    <div>
                      <span className="text-muted-foreground">Fecha Límite:</span>
                      <p className="font-medium">{new Date(item.recommendation.dueDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  {item.recommendation.baselineCaseCount !== null && (
                    <div>
                      <span className="text-muted-foreground">Casos Baseline:</span>
                      <p className="font-medium">{item.recommendation.baselineCaseCount}</p>
                    </div>
                  )}
                  {item.recommendation.reductionPercentage !== null && (
                    <div>
                      <span className="text-muted-foreground">Reducción:</span>
                      <p className="font-medium text-green-600 flex items-center gap-1">
                        <TrendingDown className="h-4 w-4" />
                        {item.recommendation.reductionPercentage}%
                      </p>
                    </div>
                  )}
                </div>

                {item.recommendation.targetCaseType && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCalculateEffectiveness(item.recommendation.id)}
                      disabled={calculateEffectivenessMutation.isPending}
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Calcular Efectividad
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Editar Recomendación</DialogTitle>
              <DialogDescription>
                Actualiza los detalles de la recomendación
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-recommendation">Recomendación *</Label>
                <Textarea
                  id="edit-recommendation"
                  name="recommendation"
                  rows={3}
                  defaultValue={selectedRecommendation?.recommendation.recommendation}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-priority">Prioridad *</Label>
                  <Select modal={false} name="priority" defaultValue={selectedRecommendation?.recommendation.priority} required>
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
                <div className="grid gap-2">
                  <Label htmlFor="edit-status">Estado *</Label>
                  <Select modal={false} name="status" defaultValue={selectedRecommendation?.recommendation.status} required>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="in_progress">En Progreso</SelectItem>
                      <SelectItem value="completed">Completada</SelectItem>
                      <SelectItem value="cancelled">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-category">Categoría</Label>
                  <Input
                    id="edit-category"
                    name="category"
                    defaultValue={selectedRecommendation?.recommendation.category || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-assignedTo">ID del Responsable</Label>
                  <Input
                    id="edit-assignedTo"
                    name="assignedTo"
                    type="number"
                    defaultValue={selectedRecommendation?.recommendation.assignedTo || ""}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-dueDate">Fecha Límite</Label>
                  <Input
                    id="edit-dueDate"
                    name="dueDate"
                    type="date"
                    defaultValue={selectedRecommendation?.recommendation.dueDate || ""}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-completionDate">Fecha de Completación</Label>
                  <Input
                    id="edit-completionDate"
                    name="completionDate"
                    type="date"
                    defaultValue={selectedRecommendation?.recommendation.completionDate || ""}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-currentCaseCount">Casos Actuales</Label>
                <Input
                  id="edit-currentCaseCount"
                  name="currentCaseCount"
                  type="number"
                  defaultValue={selectedRecommendation?.recommendation.currentCaseCount || ""}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notas</Label>
                <Textarea
                  id="edit-notes"
                  name="notes"
                  rows={2}
                  defaultValue={selectedRecommendation?.recommendation.notes || ""}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <LoadingButton type="submit" loading={updateMutation.isPending} loadingText="Actualizando...">Actualizar</LoadingButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
