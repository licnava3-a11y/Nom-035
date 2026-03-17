import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Plus, Edit, Trash2, FileText, CheckCircle, XCircle, Archive } from 'lucide-react';
import { useLocation } from 'wouter';

export default function AssessmentsManagement() {
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<'draft' | 'active' | 'archived' | undefined>();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: undefined as number | undefined,
    passingScore: 70,
    timeLimit: undefined as number | undefined,
    maxAttempts: 3,
    shuffleQuestions: false,
    shuffleOptions: false,
    showResults: true,
  });

  // Queries
  const { data: assessments, isLoading, refetch } = trpc.assessments.list.useQuery({
    status: selectedStatus,
  });
  const { data: courses } = trpc.courses.list.useQuery();

  // Mutations
  const createMutation = trpc.assessments.create.useMutation({
    onSuccess: () => {
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
      console.log('Evaluación creada exitosamente');
    },
  });

  const deleteMutation = trpc.assessments.delete.useMutation({
    onSuccess: () => {
      refetch();
      console.log('Evaluación eliminada exitosamente');
    },
  });

  const updateStatusMutation = trpc.assessments.update.useMutation({
    onSuccess: () => {
      refetch();
      console.log('Estado actualizado exitosamente');
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      courseId: undefined,
      passingScore: 70,
      timeLimit: undefined,
      maxAttempts: 3,
      shuffleQuestions: false,
      shuffleOptions: false,
      showResults: true,
    });
  };

  const handleCreate = () => {
    createMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    setAssessmentToDelete(id);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = () => {
    if (assessmentToDelete) {
      deleteMutation.mutate({ id: assessmentToDelete });
    }
  };

  const handleChangeStatus = (id: number, status: 'draft' | 'active' | 'archived') => {
    updateStatusMutation.mutate({ id, status });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Borrador</Badge>;
      case 'active':
        return <Badge className="bg-green-500">Activa</Badge>;
      case 'archived':
        return <Badge variant="outline">Archivada</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <p>Cargando evaluaciones...</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Evaluaciones</h1>
          <p className="text-muted-foreground">Administre exámenes y evaluaciones en línea</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Evaluación
        </Button>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Filtrar por estado</Label>
              <Select
                value={selectedStatus || 'all'}
                onValueChange={(value) => setSelectedStatus(value === 'all' ? undefined : value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="draft">Borradores</SelectItem>
                  <SelectItem value="active">Activas</SelectItem>
                  <SelectItem value="archived">Archivadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de evaluaciones */}
      <div className="grid gap-4">
        {assessments && assessments.length > 0 ? (
          assessments.map((assessment: any) => (
            <Card key={assessment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{assessment.title}</CardTitle>
                      {getStatusBadge(assessment.status)}
                    </div>
                    <CardDescription>{assessment.description || 'Sin descripción'}</CardDescription>
                    {assessment.courseName && (
                      <p className="text-sm text-muted-foreground mt-2">
                        Curso: {assessment.courseName}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/assessments/${assessment.id}/questions`)}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Preguntas
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/assessments/${assessment.id}/edit`)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(assessment.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Calificación mínima</p>
                    <p className="font-medium">{assessment.passingScore}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Tiempo límite</p>
                    <p className="font-medium">
                      {assessment.timeLimit ? `${assessment.timeLimit} min` : 'Sin límite'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Intentos máximos</p>
                    <p className="font-medium">{assessment.maxAttempts || 'Ilimitados'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Creado por</p>
                    <p className="font-medium">{assessment.creatorName || 'N/A'}</p>
                  </div>
                </div>

                {/* Acciones de estado */}
                <div className="flex gap-2 mt-4">
                  {assessment.status === 'draft' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleChangeStatus(assessment.id, 'active')}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Activar
                    </Button>
                  )}
                  {assessment.status === 'active' && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleChangeStatus(assessment.id, 'draft')}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Desactivar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleChangeStatus(assessment.id, 'archived')}
                      >
                        <Archive className="mr-2 h-4 w-4" />
                        Archivar
                      </Button>
                    </>
                  )}
                  {assessment.status === 'archived' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleChangeStatus(assessment.id, 'draft')}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Restaurar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No hay evaluaciones disponibles</p>
              <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Crear primera evaluación
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de creación */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nueva Evaluación</DialogTitle>
            <DialogDescription>
              Configure los parámetros de la evaluación. Podrá agregar preguntas después de crearla.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ej: Evaluación de Conocimientos NOM-035"
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción de la evaluación"
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="courseId">Curso asociado (opcional)</Label>
              <Select
                value={formData.courseId?.toString() || 'none'}
                onValueChange={(value) =>
                  setFormData({ ...formData, courseId: value === 'none' ? undefined : parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un curso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin curso asociado</SelectItem>
                  {courses?.map((course: any) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="passingScore">Calificación mínima (%)</Label>
                <Input
                  id="passingScore"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.passingScore}
                  onChange={(e) => setFormData({ ...formData, passingScore: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="timeLimit">Tiempo límite (minutos)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  min="0"
                  value={formData.timeLimit || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, timeLimit: e.target.value ? parseInt(e.target.value) : undefined })
                  }
                  placeholder="Sin límite"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="maxAttempts">Intentos máximos</Label>
              <Input
                id="maxAttempts"
                type="number"
                min="1"
                value={formData.maxAttempts}
                onChange={(e) => setFormData({ ...formData, maxAttempts: parseInt(e.target.value) })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shuffleQuestions"
                  checked={formData.shuffleQuestions}
                  onChange={(e) => setFormData({ ...formData, shuffleQuestions: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="shuffleQuestions" className="cursor-pointer">
                  Aleatorizar orden de preguntas
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="shuffleOptions"
                  checked={formData.shuffleOptions}
                  onChange={(e) => setFormData({ ...formData, shuffleOptions: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="shuffleOptions" className="cursor-pointer">
                  Aleatorizar opciones de respuesta
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showResults"
                  checked={formData.showResults}
                  onChange={(e) => setFormData({ ...formData, showResults: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="showResults" className="cursor-pointer">
                  Mostrar resultados al terminar
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!formData.title || createMutation.isPending}>
              {createMutation.isPending ? 'Creando...' : 'Crear Evaluación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog para Eliminar */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="¿Eliminar evaluación?"
        description="Esta acción no se puede deshacer. La evaluación será eliminada permanentemente."
        impactMessage="Se eliminarán todas las preguntas, respuestas y resultados de esta evaluación"
        variant="destructive"
        confirmText="Eliminar"
      />
    </div>
  );
}
