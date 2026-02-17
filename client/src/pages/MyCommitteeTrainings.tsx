import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  BookOpen,
  Clock,
  CheckCircle2,
  AlertCircle,
  Download,
  Award,
} from "lucide-react";

export default function MyCommitteeTrainings() {
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);

  const { data: myTrainings, isLoading, refetch } = trpc.trainingAssignments.getMyTrainings.useQuery();
  const { data: myCertificates } = trpc.trainingCertificates.getMyCertificates.useQuery();

  const updateStatusMutation = trpc.trainingAssignments.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado actualizado exitosamente");
      setIsCompleteDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleStartTraining = (assignmentId: number) => {
    updateStatusMutation.mutate({
      id: assignmentId,
      status: "in_progress",
    });
  };

  const handleCompleteTraining = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    updateStatusMutation.mutate({
      id: selectedAssignment.assignment.id,
      status: "completed",
      score: formData.get("score") ? parseInt(formData.get("score") as string) : undefined,
      notes: formData.get("notes") as string,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string; icon: any }> = {
      pending: { variant: "secondary", label: "Pendiente", icon: AlertCircle },
      in_progress: { variant: "default", label: "En Progreso", icon: Clock },
      completed: { variant: "default", label: "Completada", icon: CheckCircle2 },
      expired: { variant: "destructive", label: "Vencida", icon: AlertCircle },
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const pendingCount = myTrainings?.filter((t) => t.assignment.status === "pending").length || 0;
  const inProgressCount = myTrainings?.filter((t) => t.assignment.status === "in_progress").length || 0;
  const completedCount = myTrainings?.filter((t) => t.assignment.status === "completed").length || 0;
  const totalCount = myTrainings?.length || 0;
  const completionPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mis Capacitaciones</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona tus capacitaciones asignadas y descarga tus certificados
        </p>
      </div>

      {/* Cards de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Asignadas</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Progreso General */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso General</CardTitle>
          <CardDescription>
            {completedCount} de {totalCount} capacitaciones completadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={completionPercentage} className="h-2" />
            <p className="text-sm text-muted-foreground text-right">
              {completionPercentage.toFixed(0)}% completado
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Capacitaciones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 text-center py-8">Cargando...</div>
        ) : myTrainings && myTrainings.length > 0 ? (
          myTrainings.map((item) => (
            <Card key={item.assignment.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{item.training?.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {item.training?.description}
                    </CardDescription>
                  </div>
                  {getStatusBadge(item.assignment.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Duración</p>
                    <p className="font-medium">{item.training?.duration} horas</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Asignada</p>
                    <p className="font-medium">
                      {new Date(item.assignment.assignedDate).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                  {item.assignment.startDate && (
                    <div>
                      <p className="text-muted-foreground">Iniciada</p>
                      <p className="font-medium">
                        {new Date(item.assignment.startDate).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                  )}
                  {item.assignment.completionDate && (
                    <div>
                      <p className="text-muted-foreground">Completada</p>
                      <p className="font-medium">
                        {new Date(item.assignment.completionDate).toLocaleDateString("es-MX")}
                      </p>
                    </div>
                  )}
                </div>

                {item.assignment.score !== null && item.assignment.score !== undefined && (
                  <div>
                    <p className="text-sm text-muted-foreground">Calificación</p>
                    <p className="text-2xl font-bold">{item.assignment.score}/100</p>
                  </div>
                )}

                {item.assignment.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notas</p>
                    <p className="text-sm">{item.assignment.notes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {item.assignment.status === "pending" && (
                    <Button
                      onClick={() => handleStartTraining(item.assignment.id)}
                      disabled={updateStatusMutation.isPending}
                      className="flex-1"
                    >
                      Iniciar Capacitación
                    </Button>
                  )}
                  {item.assignment.status === "in_progress" && (
                    <Button
                      onClick={() => {
                        setSelectedAssignment(item);
                        setIsCompleteDialogOpen(true);
                      }}
                      className="flex-1"
                    >
                      Marcar como Completada
                    </Button>
                  )}
                  {item.assignment.status === "completed" && item.certificate && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(item.certificate?.pdfUrl, "_blank")}
                      className="flex-1"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar Certificado
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-2 text-center py-8 text-muted-foreground">
            No tienes capacitaciones asignadas
          </div>
        )}
      </div>

      {/* Sección de Certificados */}
      {myCertificates && myCertificates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mis Certificados</CardTitle>
            <CardDescription>
              {myCertificates.length} certificados obtenidos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {myCertificates.map((item) => (
                <Card key={item.certificate.id} className="border-2 border-primary/20">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-primary" />
                      <CardTitle className="text-sm">{item.training?.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="text-xs space-y-1">
                      <p className="text-muted-foreground">
                        Certificado No. {item.certificate.certificateNumber}
                      </p>
                      <p className="text-muted-foreground">
                        Emitido: {new Date(item.certificate.issueDate).toLocaleDateString("es-MX")}
                      </p>
                      {item.certificate.expiryDate && (
                        <p className="text-muted-foreground">
                          Vence: {new Date(item.certificate.expiryDate).toLocaleDateString("es-MX")}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(item.certificate.pdfUrl, "_blank")}
                      className="w-full"
                    >
                      <Download className="h-3 w-3 mr-2" />
                      Descargar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog Completar Capacitación */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar Capacitación</DialogTitle>
            <DialogDescription>
              Marca esta capacitación como completada
            </DialogDescription>
          </DialogHeader>
          {selectedAssignment && (
            <form onSubmit={handleCompleteTraining} className="space-y-4">
              <div>
                <Label>Capacitación</Label>
                <Input value={selectedAssignment.training?.title} disabled />
              </div>
              <div>
                <Label htmlFor="score">Calificación (0-100)</Label>
                <Input id="score" name="score" type="number" min="0" max="100" />
              </div>
              <div>
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" name="notes" rows={3} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>
                  Cancelar
                </Button>
                <LoadingButton type="submit" loading={updateStatusMutation.isPending} loadingText="Guardando...">Completar</LoadingButton>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
