import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  AlertTriangle,
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
} from "lucide-react";
import { useLocation } from "wouter";

export default function WorkplaceViolenceProtocol() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<
    "activo" | "suspendido" | "cerrado" | "todos"
  >("todos");
  const [filterPriority, setFilterPriority] = useState<
    "baja" | "media" | "alta" | "critica" | "todas"
  >("todas");
  const [filterPhase, setFilterPhase] = useState<
    | "recepcion"
    | "evaluacion_inicial"
    | "medidas_cautelares"
    | "investigacion"
    | "resolucion"
    | "seguimiento"
    | "cerrado"
    | "todas"
  >("todas");

  // Form state
  const [formData, setFormData] = useState({
    isAnonymous: false,
    complainantId: "",
    complainantName: "",
    accusedId: "",
    complaintDate: new Date().toISOString().split("T")[0],
    incidentDate: "",
    description: "",
    priority: "media" as "baja" | "media" | "alta" | "critica",
  });

  // Queries
  const {
    data: cases,
    isLoading,
    refetch,
  } = trpc.workplaceViolence.listCases.useQuery({
    status: filterStatus,
    priority: filterPriority,
    phase: filterPhase,
  });

  const { data: employeesData } = trpc.employees.list.useQuery({
    pageSize: 1000,
  });
  const employees = employeesData?.employees;

  // Mutations
  const createCaseMutation = trpc.workplaceViolence.createCase.useMutation({
    onSuccess: data => {
      toast.success(`Caso creado exitosamente: ${data.folio}`);
      setIsDialogOpen(false);
      refetch();
      resetForm();
    },
    onError: error => {
      toast.error(`Error al crear caso: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      isAnonymous: false,
      complainantId: "",
      complainantName: "",
      accusedId: "",
      complaintDate: new Date().toISOString().split("T")[0],
      incidentDate: "",
      description: "",
      priority: "media",
    });
  };

  const handleSubmit = () => {
    if (!formData.accusedId) {
      toast.error("Debe seleccionar a la persona acusada");
      return;
    }
    if (!formData.description.trim()) {
      toast.error("Debe proporcionar una descripción de los hechos");
      return;
    }
    if (!formData.isAnonymous && !formData.complainantId) {
      toast.error("Debe seleccionar al denunciante o marcar como anónimo");
      return;
    }

    createCaseMutation.mutate({
      complainantId: formData.isAnonymous
        ? undefined
        : parseInt(formData.complainantId),
      complainantName: formData.isAnonymous
        ? formData.complainantName
        : undefined,
      accusedId: parseInt(formData.accusedId),
      complaintDate: formData.complaintDate,
      incidentDate: formData.incidentDate || undefined,
      description: formData.description,
      priority: formData.priority,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      activo: "default",
      suspendido: "secondary",
      cerrado: "destructive",
    };
    const labels: Record<string, string> = {
      activo: "Activo",
      suspendido: "Suspendido",
      cerrado: "Cerrado",
    };
    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      baja: "secondary",
      media: "default",
      alta: "destructive",
      critica: "destructive",
    };
    const labels: Record<string, string> = {
      baja: "Baja",
      media: "Media",
      alta: "Alta",
      critica: "Crítica",
    };
    return (
      <Badge variant={variants[priority] || "default"}>
        {labels[priority] || priority}
      </Badge>
    );
  };

  const getPhaseBadge = (phase: string) => {
    const labels: Record<string, string> = {
      recepcion: "Recepción",
      evaluacion_inicial: "Evaluación Inicial",
      medidas_cautelares: "Medidas Cautelares",
      investigacion: "Investigación",
      resolucion: "Resolución",
      seguimiento: "Seguimiento",
      cerrado: "Cerrado",
    };
    return <Badge variant="outline">{labels[phase] || phase}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando casos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            Protocolo de Violencia Laboral
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestión de casos de violencia laboral según NOM-035-STPS-2018
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Queja
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Recepción de Queja de Violencia Laboral</DialogTitle>
              <DialogDescription>
                Complete el formulario para registrar una nueva queja de
                violencia laboral
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Denunciante */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="anonymous"
                    checked={formData.isAnonymous}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        isAnonymous: e.target.checked,
                        complainantId: "",
                      })
                    }
                    className="h-4 w-4"
                  />
                  <Label htmlFor="anonymous">Denuncia anónima</Label>
                </div>
              </div>

              {formData.isAnonymous ? (
                <div className="space-y-2">
                  <Label htmlFor="complainantName">
                    Nombre del denunciante (opcional)
                  </Label>
                  <Input
                    id="complainantName"
                    placeholder="Puede dejarse en blanco para denuncias completamente anónimas"
                    value={formData.complainantName}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        complainantName: e.target.value,
                      })
                    }
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="complainant">Denunciante *</Label>
                  <Select
                    value={formData.complainantId}
                    onValueChange={value =>
                      setFormData({ ...formData, complainantId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione al denunciante" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map((emp: any) => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.firstName} {emp.lastName} - Depto ID:{" "}
                          {emp.departmentId || "N/A"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Persona Acusada */}
              <div className="space-y-2">
                <Label htmlFor="accused">Persona Acusada *</Label>
                <Select
                  value={formData.accusedId}
                  onValueChange={value =>
                    setFormData({ ...formData, accusedId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione a la persona acusada" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((emp: any) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.firstName} {emp.lastName} - Puesto ID:{" "}
                        {emp.positionId || "N/A"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Fechas */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="complaintDate">Fecha de Recepción *</Label>
                  <Input
                    id="complaintDate"
                    type="date"
                    value={formData.complaintDate}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        complaintDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="incidentDate">Fecha del Incidente</Label>
                  <Input
                    id="incidentDate"
                    type="date"
                    value={formData.incidentDate}
                    onChange={e =>
                      setFormData({ ...formData, incidentDate: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Prioridad */}
              <div className="space-y-2">
                <Label htmlFor="priority">Nivel de Prioridad *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: any) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="critica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <Label htmlFor="description">Descripción de los Hechos *</Label>
                <Textarea
                  id="description"
                  placeholder="Describa detalladamente los hechos de violencia laboral..."
                  value={formData.description}
                  onChange={e =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={6}
                />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={createCaseMutation.isPending}
                className="w-full"
              >
                {createCaseMutation.isPending
                  ? "Creando caso..."
                  : "Registrar Queja"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={filterStatus}
                onValueChange={(value: any) => setFilterStatus(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="suspendido">Suspendido</SelectItem>
                  <SelectItem value="cerrado">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridad</Label>
              <Select
                value={filterPriority}
                onValueChange={(value: any) => setFilterPriority(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fase del Protocolo</Label>
              <Select
                value={filterPhase}
                onValueChange={(value: any) => setFilterPhase(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="recepcion">Recepción</SelectItem>
                  <SelectItem value="evaluacion_inicial">
                    Evaluación Inicial
                  </SelectItem>
                  <SelectItem value="medidas_cautelares">
                    Medidas Cautelares
                  </SelectItem>
                  <SelectItem value="investigacion">Investigación</SelectItem>
                  <SelectItem value="resolucion">Resolución</SelectItem>
                  <SelectItem value="seguimiento">Seguimiento</SelectItem>
                  <SelectItem value="cerrado">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Casos */}
      <Card>
        <CardHeader>
          <CardTitle>Casos Registrados</CardTitle>
          <CardDescription>
            {cases?.length || 0} caso(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {cases && cases.length > 0 ? (
            <div className="space-y-4">
              {cases.map((caseItem: any) => (
                <div
                  key={caseItem.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono font-semibold">
                          {caseItem.folio}
                        </span>
                        {getStatusBadge(caseItem.status)}
                        {getPriorityBadge(caseItem.priority)}
                        {getPhaseBadge(caseItem.currentPhase)}
                      </div>
                      <div className="text-sm space-y-1">
                        <p>
                          <span className="font-medium">Acusado:</span>{" "}
                          {caseItem.accusedName} {caseItem.accusedLastName}
                        </p>
                        <p>
                          <span className="font-medium">Denunciante:</span>{" "}
                          {caseItem.complainantName || "Anónimo"}
                        </p>
                        <p className="text-muted-foreground">
                          Recibido:{" "}
                          {new Date(
                            caseItem.complaintDate
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setLocation(`/cases/workplace-violence/${caseItem.id}`)
                      }
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalles
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No se encontraron casos con los filtros seleccionados
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
