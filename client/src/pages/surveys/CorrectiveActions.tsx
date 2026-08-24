import { useState } from "react";
import { Breadcrumb } from "@/components/Breadcrumb";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Download,
} from "lucide-react";

type RiskLevel = "nulo" | "bajo" | "medio" | "alto" | "muy_alto";
type ActionStatus = "pendiente" | "en_proceso" | "completada" | "cancelada";

export default function CorrectiveActions() {
  const [activeTab, setActiveTab] = useState("registro");

  // Form state
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("medio");
  const [department, setDepartment] = useState("");
  const [responsibleUserId, setResponsibleUserId] = useState("");
  const [dueDate, setDueDate] = useState("");
  // PROMPT 8.5 — REQ-1
  const [actionLevel, setActionLevel] = useState<
    "organizacional" | "grupal" | "individual"
  >("organizacional");
  const [startDate, setStartDate] = useState("");
  // PROMPT 8.5 — REQ-2
  const [clinicalTitle, setClinicalTitle] = useState<
    "medico" | "psicologo" | "psiquiatra" | ""
  >("");
  const [cedulaProfesional, setCedulaProfesional] = useState("");
  const [selectedClinicalEmployeeId, setSelectedClinicalEmployeeId] = useState<
    number | null
  >(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState<ActionStatus | "todas">(
    "todas"
  );
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [riskLevelFilter, setRiskLevelFilter] = useState<RiskLevel | "todos">(
    "todos"
  );
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Edit modal state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<any>(null);

  // Queries
  const { data: actions, refetch: refetchActions } =
    trpc.correctiveActions.getAll.useQuery();
  const { data: stats } = trpc.correctiveActions.getStatistics.useQuery();
  const { data: users } = trpc.users.list.useQuery() as any;
  // PROMPT 8.5 — REQ-2: Catálogo de empleados clínicos
  const { data: clinicalEmployees } =
    trpc.employees.getClinicalEmployees.useQuery();
  // PROMPT 8.5 — REQ-3, REQ-4, REQ-5
  const { data: complianceByLevel } =
    trpc.correctiveActions.getComplianceByLevel.useQuery();
  const { data: level3Alerts } =
    trpc.correctiveActions.alertLevel3WithoutClinical.useQuery();
  const { data: executiveSummary } =
    trpc.correctiveActions.getExecutiveSummary.useQuery();
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const generateResumen85PDF =
    trpc.correctiveActions.generateResumen85PDF.useMutation({
      onSuccess: data => {
        window.open(data.pdfUrl, "_blank");
        toast.success(`PDF generado: ${data.filename} (Folio: ${data.folio})`);
        setIsExportingPdf(false);
      },
      onError: error => {
        toast.error(`Error al generar PDF: ${error.message}`);
        setIsExportingPdf(false);
      },
    });

  // Mutations
  const createAction = trpc.correctiveActions.create.useMutation({
    onSuccess: () => {
      toast.success("Acción correctiva registrada exitosamente");
      setDescription("");
      setTitle("");
      setRiskLevel("medio");
      setDepartment("");
      setResponsibleUserId("");
      setDueDate("");
      setStartDate("");
      setActionLevel("organizacional");
      setClinicalTitle("");
      setCedulaProfesional("");
      setSelectedClinicalEmployeeId(null);
      refetchActions();
      setActiveTab("seguimiento");
    },
    onError: error => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateAction = trpc.correctiveActions.update.useMutation({
    onSuccess: () => {
      toast.success("Acción actualizada exitosamente");
      setEditDialogOpen(false);
      setEditingAction(null);
      refetchActions();
    },
    onError: error => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateStatus = trpc.correctiveActions.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado actualizado exitosamente");
      refetchActions();
    },
    onError: error => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteAction = trpc.correctiveActions.delete.useMutation({
    onSuccess: () => {
      toast.success("Acción eliminada exitosamente");
      refetchActions();
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const generatePDF = trpc.correctiveActions.generatePDF.useMutation({
    onSuccess: data => {
      toast.success("¡PDF generado exitosamente!");
      window.open(data.pdfUrl, "_blank");
      refetchActions();
    },
    onError: error => {
      toast.error(`Error al generar PDF: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!description || !department || !responsibleUserId || !dueDate) {
      toast.error("Por favor complete todos los campos obligatorios");
      return;
    }
    // REQ-2: Validar responsable clínico para nivel individual
    if (actionLevel === "individual" && !clinicalTitle) {
      toast.error(
        "Las acciones de Nivel 3 (individual) requieren un responsable clínico válido."
      );
      return;
    }

    createAction.mutate({
      description,
      title: title || undefined,
      riskLevel,
      departamento: department,
      responsibleUserId: parseInt(responsibleUserId),
      dueDate,
      actionLevel,
      startDate: startDate || undefined,
      clinicalTitle: clinicalTitle || undefined,
      cedulaProfesional: cedulaProfesional || undefined,
    });
  };

  const handleStatusChange = (id: number, newStatus: ActionStatus) => {
    if (
      confirm(
        `¿Está seguro de cambiar el estado a "${getStatusLabel(newStatus)}"?`
      )
    ) {
      updateStatus.mutate({ id, status: newStatus });
    }
  };

  const handleEdit = (action: any) => {
    setEditingAction(action);
    setEditDialogOpen(true);
  };

  const handleUpdateAction = () => {
    if (!editingAction) return;

    updateAction.mutate({
      id: editingAction.id,
      description: editingAction.description,
      riskLevel: editingAction.riskLevel,
      departamento: editingAction.departamento,
      responsibleUserId: editingAction.responsibleUserId,
      dueDate: editingAction.dueDate,
    });
  };

  const handleDelete = (id: number, description: string) => {
    if (
      confirm(
        `¿Está seguro de eliminar la acción "${description.substring(0, 50)}..."?`
      )
    ) {
      deleteAction.mutate({ id });
    }
  };

  // Filter actions
  const filteredActions = actions?.filter((action: any) => {
    if (statusFilter !== "todas" && action.status !== statusFilter)
      return false;
    if (departmentFilter && action.departamento !== departmentFilter)
      return false;
    if (riskLevelFilter !== "todos" && action.riskLevel !== riskLevelFilter)
      return false;
    if (
      searchText &&
      !action.description.toLowerCase().includes(searchText.toLowerCase())
    )
      return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil((filteredActions?.length || 0) / itemsPerPage);
  const paginatedActions = filteredActions?.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get upcoming actions (due in next 7 days)
  const upcomingActions = actions
    ?.filter((action: any) => {
      if (action.status === "completada" || action.status === "cancelada")
        return false;
      if (!action.dueDate) return false;
      const dueDate = new Date(action.dueDate);
      const today = new Date();
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    })
    .sort((a: any, b: any) => {
      if (!a.dueDate || !b.dueDate) return 0;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  // Get unique departments
  const departments = Array.from(
    new Set(actions?.map((a: any) => a.departamento).filter(Boolean) || [])
  );

  const getRiskLevelColor = (level: RiskLevel) => {
    switch (level) {
      case "nulo":
        return "bg-blue-100 text-blue-800 border-blue-300";
      case "bajo":
        return "bg-green-100 text-green-800 border-green-300";
      case "medio":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "alto":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "muy_alto":
        return "bg-red-100 text-red-800 border-red-300";
    }
  };

  const getStatusColor = (status: ActionStatus) => {
    switch (status) {
      case "pendiente":
        return "bg-gray-100 text-gray-800";
      case "en_proceso":
        return "bg-blue-100 text-blue-800";
      case "completada":
        return "bg-green-100 text-green-800";
      case "cancelada":
        return "bg-red-100 text-red-800";
    }
  };

  const getStatusLabel = (status: ActionStatus) => {
    switch (status) {
      case "pendiente":
        return "Pendiente";
      case "en_proceso":
        return "En Proceso";
      case "completada":
        return "Completada";
      case "cancelada":
        return "Cancelada";
    }
  };

  const getRiskLevelLabel = (level: RiskLevel) => {
    switch (level) {
      case "nulo":
        return "Nulo";
      case "bajo":
        return "Bajo";
      case "medio":
        return "Medio";
      case "alto":
        return "Alto";
      case "muy_alto":
        return "Muy Alto";
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Breadcrumb
        items={[
          { label: "Prevención de Riesgos", href: "/prevention" },
          { label: "Acciones Correctivas" },
        ]}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Acciones Correctivas NOM-035
        </h1>
        <p className="text-gray-600 mt-2">
          Registro y seguimiento de medidas implementadas según nivel de riesgo
          detectado
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="registro">Registro</TabsTrigger>
          <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
          <TabsTrigger value="estadisticas">Estadísticas</TabsTrigger>
          <TabsTrigger value="resumen85">Resumen 8.5</TabsTrigger>
        </TabsList>

        {/* TAB: REGISTRO */}
        <TabsContent value="registro">
          <Card>
            <CardHeader>
              <CardTitle>Registrar Nueva Acción Correctiva</CardTitle>
              <CardDescription>
                Complete el formulario para registrar una nueva medida
                correctiva
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="description">
                    Descripción de la Acción *
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describa la acción correctiva a implementar..."
                    rows={4}
                    required
                  />
                </div>

                {/* PROMPT 8.5 — REQ-1: Nivel de intervención */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título de la Acción</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="Ej: Programa de bienestar laboral"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="actionLevel">
                      Nivel de Intervención 8.5 *
                    </Label>
                    <select
                      id="actionLevel"
                      value={actionLevel}
                      onChange={e => setActionLevel(e.target.value as any)}
                      className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="organizacional">
                        Nivel 1 — Organizacional
                      </option>
                      <option value="grupal">Nivel 2 — Grupal</option>
                      <option value="individual">
                        Nivel 3 — Individual (clínico)
                      </option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Fecha de Inicio</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                    />
                  </div>
                  {actionLevel === "individual" && (
                    <>
                      <div className="space-y-2 col-span-2">
                        <Label htmlFor="clinicalEmployee">
                          Responsable Clínico *
                        </Label>
                        {clinicalEmployees && clinicalEmployees.length > 0 ? (
                          <>
                            <select
                              id="clinicalEmployee"
                              value={selectedClinicalEmployeeId ?? ""}
                              onChange={e => {
                                const empId = e.target.value
                                  ? Number(e.target.value)
                                  : null;
                                setSelectedClinicalEmployeeId(empId);
                                if (empId) {
                                  const emp = clinicalEmployees.find(
                                    c => c.id === empId
                                  );
                                  if (emp) {
                                    setClinicalTitle(emp.clinicalTitle as any);
                                    // Auto-rellenar cédula desde el catálogo de empleados
                                    if (emp.cedulaProfesional) {
                                      setCedulaProfesional(
                                        emp.cedulaProfesional
                                      );
                                    } else {
                                      setCedulaProfesional("");
                                    }
                                  }
                                } else {
                                  setClinicalTitle("");
                                  setCedulaProfesional("");
                                }
                              }}
                              className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                            >
                              <option value="">
                                Seleccione responsable clínico del catálogo...
                              </option>
                              {clinicalEmployees.map(emp => (
                                <option key={emp.id} value={emp.id}>
                                  {emp.fullName} — {emp.positionTitle}
                                </option>
                              ))}
                            </select>
                            <p className="text-xs text-gray-500">
                              Empleados con puesto clínico registrado en el
                              catálogo
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-amber-600 mb-2">
                              ⚠️ No hay empleados con puesto clínico en el
                              catálogo. Capture manualmente:
                            </p>
                            <select
                              id="clinicalTitle"
                              value={clinicalTitle}
                              onChange={e =>
                                setClinicalTitle(e.target.value as any)
                              }
                              className="w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                            >
                              <option value="">
                                Seleccione título clínico
                              </option>
                              <option value="medico">Médico</option>
                              <option value="psicologo">Psicólogo</option>
                              <option value="psiquiatra">Psiquiatra</option>
                            </select>
                          </>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cedula">Cédula Profesional *</Label>
                        <Input
                          id="cedula"
                          value={cedulaProfesional}
                          onChange={e => setCedulaProfesional(e.target.value)}
                          placeholder="Ej: 12345678"
                          className={`border-red-300 focus:ring-red-500 ${selectedClinicalEmployeeId && cedulaProfesional ? "bg-green-50 border-green-400" : ""}`}
                        />
                        <p className="text-xs text-gray-500">
                          {selectedClinicalEmployeeId && cedulaProfesional
                            ? "✅ Cédula auto-rellenada desde el catálogo de empleados"
                            : "Número de cédula profesional del responsable clínico"}
                        </p>
                      </div>
                      {clinicalTitle && (
                        <div className="space-y-2">
                          <Label>Título Clínico Detectado</Label>
                          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-800 font-medium">
                            {clinicalTitle === "medico"
                              ? "👨‍⚕️ Médico"
                              : clinicalTitle === "psicologo"
                                ? "🧠 Psicólogo"
                                : "🏥 Psiquiatra"}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="riskLevel">Nivel de Riesgo *</Label>
                    <select
                      id="riskLevel"
                      value={riskLevel}
                      onChange={e => setRiskLevel(e.target.value as RiskLevel)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="nulo">Nulo</option>
                      <option value="bajo">Bajo</option>
                      <option value="medio">Medio</option>
                      <option value="alto">Alto</option>
                      <option value="muy_alto">Muy Alto</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Departamento *</Label>
                    <Input
                      id="department"
                      value={department}
                      onChange={e => setDepartment(e.target.value)}
                      placeholder="Ej: Recursos Humanos"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="responsible">Responsable *</Label>
                    <select
                      id="responsible"
                      value={responsibleUserId}
                      onChange={e => setResponsibleUserId(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Seleccione un responsable</option>
                      {users?.map((user: any) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Fecha Límite *</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createAction.isPending}
                >
                  {createAction.isPending
                    ? "Registrando..."
                    : "Registrar Acción Correctiva"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: RESUMEN EJECUTIVO 8.5 */}
        <TabsContent value="resumen85">
          <div className="space-y-6">
            {executiveSummary && (
              <Card
                className={`border-2 ${
                  executiveSummary.cumplimiento === "cumple"
                    ? "border-green-500 bg-green-50"
                    : executiveSummary.cumplimiento === "riesgo"
                      ? "border-yellow-500 bg-yellow-50"
                      : "border-red-500 bg-red-50"
                }`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {executiveSummary.cumplimiento === "cumple" ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-red-600" />
                    )}
                    Resumen Ejecutivo — Punto 8.5 NOM-035-STPS-2018
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p
                    className={`text-lg font-semibold mb-4 ${
                      executiveSummary.cumplimiento === "cumple"
                        ? "text-green-800"
                        : executiveSummary.cumplimiento === "riesgo"
                          ? "text-yellow-800"
                          : "text-red-800"
                    }`}
                  >
                    {executiveSummary.mensaje}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold">
                        {executiveSummary.totalAcciones}
                      </div>
                      <div className="text-sm text-gray-600">
                        Total acciones
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-700">
                        {executiveSummary.totalCompletadas}
                      </div>
                      <div className="text-sm text-gray-600">Completadas</div>
                    </div>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-700">
                        {executiveSummary.porcentajeCompletado}%
                      </div>
                      <div className="text-sm text-gray-600">Avance</div>
                    </div>
                    <div className="text-center">
                      <div
                        className={`text-3xl font-bold ${
                          executiveSummary.alertasNivel3SinClinico > 0
                            ? "text-red-700"
                            : "text-green-700"
                        }`}
                      >
                        {executiveSummary.alertasNivel3SinClinico}
                      </div>
                      <div className="text-sm text-gray-600">
                        Alertas Nivel 3
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    {(
                      [
                        "tieneOrganizacional",
                        "tieneGrupal",
                        "tieneIndividual",
                      ] as const
                    ).map((key, i) => (
                      <span
                        key={key}
                        className={`px-3 py-1 rounded-full ${
                          executiveSummary[key]
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {executiveSummary[key] ? "✓" : "✕"} Nivel {i + 1}{" "}
                        {["Organizacional", "Grupal", "Individual"][i]}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <Button
                      onClick={() => {
                        setIsExportingPdf(true);
                        generateResumen85PDF.mutate();
                      }}
                      disabled={isExportingPdf}
                      className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white"
                    >
                      <Download className="h-4 w-4" />
                      {isExportingPdf
                        ? "Generando PDF..."
                        : "Exportar Resumen 8.5 como PDF"}
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">
                      Genera un PDF con sello digital y folio único, válido como
                      evidencia ante la STPS.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Reporte por Nivel de Intervención</CardTitle>
                <CardDescription>
                  Acciones registradas según los tres niveles del punto 8.5
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(complianceByLevel ?? []).map((row: any) => (
                    <div key={row.level} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold">{row.label}</h4>
                        <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                          {row.total} acciones
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm text-center">
                        <div>
                          <div className="font-bold text-green-700 text-xl">
                            {row.completadas}
                          </div>
                          <div className="text-gray-500">Completadas</div>
                        </div>
                        <div>
                          <div className="font-bold text-yellow-700 text-xl">
                            {row.enProceso}
                          </div>
                          <div className="text-gray-500">En proceso</div>
                        </div>
                        <div>
                          <div className="font-bold text-red-700 text-xl">
                            {row.pendientes}
                          </div>
                          <div className="text-gray-500">Pendientes</div>
                        </div>
                      </div>
                      {row.total > 0 && (
                        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{
                              width: `${Math.round((row.completadas / row.total) * 100)}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {level3Alerts?.hasAlerts && (
              <Card className="border-red-400 bg-red-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="h-5 w-5" />
                    Alerta: {level3Alerts.count} acción(es) Nivel 3 sin
                    responsable clínico
                  </CardTitle>
                  <CardDescription className="text-red-700">
                    Estas acciones individuales no tienen asignado un médico,
                    psiólogo o psiquiatra. Incumple el punto 8.5.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {level3Alerts.actions.map((a: any) => (
                      <div
                        key={a.id}
                        className="flex justify-between items-center p-3 bg-white rounded border border-red-200"
                      >
                        <div>
                          <div className="font-medium text-sm">
                            {a.title || a.description?.substring(0, 60)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {a.departamento} — {a.status}
                          </div>
                        </div>
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Sin clínico
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB: SEGUIMIENTO */}
        <TabsContent value="seguimiento">
          <Card>
            <CardHeader>
              <CardTitle>Seguimiento de Acciones Correctivas</CardTitle>
              <CardDescription>
                Visualice y gestione todas las acciones correctivas registradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="statusFilter">Filtrar por Estado</Label>
                  <select
                    id="statusFilter"
                    value={statusFilter}
                    onChange={e =>
                      setStatusFilter(e.target.value as ActionStatus | "todas")
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todas">Todas</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="completada">Completada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departmentFilter">
                    Filtrar por Departamento
                  </Label>
                  <select
                    id="departmentFilter"
                    value={departmentFilter}
                    onChange={e => setDepartmentFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Todos</option>
                    {departments.map((dept: any) => (
                      <option key={dept} value={dept || ""}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="riskLevelFilter">
                    Filtrar por Nivel de Riesgo
                  </Label>
                  <select
                    id="riskLevelFilter"
                    value={riskLevelFilter}
                    onChange={e =>
                      setRiskLevelFilter(e.target.value as RiskLevel | "todos")
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todos">Todos</option>
                    <option value="nulo">Nulo</option>
                    <option value="bajo">Bajo</option>
                    <option value="medio">Medio</option>
                    <option value="alto">Alto</option>
                    <option value="muy_alto">Muy Alto</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="searchText">Buscar</Label>
                  <Input
                    id="searchText"
                    value={searchText}
                    onChange={e => setSearchText(e.target.value)}
                    placeholder="Buscar en descripción..."
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        ID
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Descripción
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Nivel
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Departamento
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Estado
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Fecha Límite
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        PDF
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedActions?.map((action: any) => (
                      <tr key={action.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{action.id}</td>
                        <td className="px-4 py-3 text-sm max-w-xs truncate">
                          {action.description}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskLevelColor(action.riskLevel)}`}
                          >
                            {getRiskLevelLabel(action.riskLevel)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {action.departamento}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(action.status)}`}
                          >
                            {getStatusLabel(action.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {action.dueDate
                            ? new Date(action.dueDate).toLocaleDateString(
                                "es-MX"
                              )
                            : "Sin fecha"}
                        </td>
                        <td className="px-4 py-3">
                          {action.pdfUrl ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                action.pdfUrl &&
                                window.open(action.pdfUrl, "_blank")
                              }
                              className="text-green-600 hover:text-green-700"
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Ver PDF
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                generatePDF.mutate({ id: action.id })
                              }
                              disabled={generatePDF.isPending}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              {generatePDF.isPending
                                ? "Generando..."
                                : "Generar PDF"}
                            </Button>
                          )}
                        </td>
                        <td className="px-4 py-3 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(action)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDelete(action.id, action.description)
                            }
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <select
                            value={action.status}
                            onChange={e =>
                              handleStatusChange(
                                action.id,
                                e.target.value as ActionStatus
                              )
                            }
                            className="text-sm px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_proceso">En Proceso</option>
                            <option value="completada">Completada</option>
                            <option value="cancelada">Cancelada</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredActions?.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    No se encontraron acciones correctivas
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-600">
                    Mostrando {(currentPage - 1) * itemsPerPage + 1} -{" "}
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredActions?.length || 0
                    )}{" "}
                    de {filteredActions?.length || 0} acciones
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page: any) => (
                          <Button
                            key={page}
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                          >
                            {page}
                          </Button>
                        )
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage(p => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: ESTADÍSTICAS */}
        <TabsContent value="estadisticas">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total de Acciones
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{actions?.length || 0}</div>
                <p className="text-xs text-gray-600 mt-1">
                  Registradas en el sistema
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pendientes
                </CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {stats?.byStatus.find(s => s.status === "pendiente")?.count ||
                    0}
                </div>
                <p className="text-xs text-gray-600 mt-1">Sin iniciar</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  En Proceso
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.byStatus.find(s => s.status === "en_proceso")
                    ?.count || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">En ejecución</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completadas
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {stats?.byStatus.find(s => s.status === "completada")
                    ?.count || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">Finalizadas</p>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Actions */}
          {upcomingActions && upcomingActions.length > 0 && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Próximas Acciones a Vencer (7 días)</CardTitle>
                <CardDescription>
                  Acciones correctivas que vencen en los próximos 7 días
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingActions.slice(0, 5).map((action: any) => {
                    if (!action.dueDate) return null;
                    const dueDate = new Date(action.dueDate);
                    const today = new Date();
                    const diffTime = dueDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(
                      diffTime / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <div
                        key={action.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            {action.description.substring(0, 80)}...
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskLevelColor(action.riskLevel)}`}
                            >
                              {getRiskLevelLabel(action.riskLevel)}
                            </span>
                            <span className="text-xs text-gray-600">
                              {action.departamento}
                            </span>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <p
                            className={`text-sm font-semibold ${diffDays <= 2 ? "text-red-600" : "text-orange-600"}`}
                          >
                            {diffDays === 0
                              ? "Hoy"
                              : diffDays === 1
                                ? "Mañana"
                                : `${diffDays} días`}
                          </p>
                          <p className="text-xs text-gray-600">
                            {dueDate.toLocaleDateString("es-MX")}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Distribution Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Estado</CardTitle>
                <CardDescription>
                  Cantidad de acciones por estado actual
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.byStatus.map((item: any) => {
                    const percentage = actions?.length
                      ? (item.count / actions.length) * 100
                      : 0;
                    return (
                      <div key={item.status} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">
                            {getStatusLabel(item.status)}
                          </span>
                          <span className="text-gray-600">
                            {item.count} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              item.status === "completada"
                                ? "bg-green-600"
                                : item.status === "en_proceso"
                                  ? "bg-blue-600"
                                  : item.status === "pendiente"
                                    ? "bg-yellow-600"
                                    : "bg-red-600"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cumplimiento por Departamento</CardTitle>
                <CardDescription>
                  Porcentaje de acciones completadas por área
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departments.map((dept: any) => {
                    const deptActions =
                      actions?.filter(a => a.departamento === dept) || [];
                    const completed = deptActions.filter(
                      a => a.status === "completada"
                    ).length;
                    const percentage = deptActions.length
                      ? (completed / deptActions.length) * 100
                      : 0;

                    return (
                      <div key={dept} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-medium">{dept}</span>
                          <span className="text-gray-600">
                            {completed}/{deptActions.length} (
                            {percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Porcentaje de Cumplimiento General</CardTitle>
              <CardDescription>
                Indicador de progreso en la implementación de acciones
                correctivas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats && actions && actions.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Progreso General
                    </span>
                    <span className="text-2xl font-bold text-green-600">
                      {Math.round(
                        ((stats.byStatus.find(s => s.status === "completada")
                          ?.count || 0) /
                          actions.length) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-green-600 h-4 rounded-full transition-all duration-500"
                      style={{
                        width: `${((stats.byStatus.find(s => s.status === "completada")?.count || 0) / actions.length) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {stats.byStatus.find(s => s.status === "pendiente")
                          ?.count || 0}
                      </div>
                      <div className="text-xs text-gray-600">Pendientes</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {stats.byStatus.find(s => s.status === "en_proceso")
                          ?.count || 0}
                      </div>
                      <div className="text-xs text-gray-600">En Proceso</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {stats.byStatus.find(s => s.status === "completada")
                          ?.count || 0}
                      </div>
                      <div className="text-xs text-gray-600">Completadas</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No hay datos de cumplimiento disponibles
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Acción Correctiva</DialogTitle>
            <DialogDescription>
              Modifique los detalles de la acción correctiva
            </DialogDescription>
          </DialogHeader>
          {editingAction && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-description">Descripción *</Label>
                <Textarea
                  id="edit-description"
                  value={editingAction.description}
                  onChange={e =>
                    setEditingAction({
                      ...editingAction,
                      description: e.target.value,
                    })
                  }
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-riskLevel">Nivel de Riesgo *</Label>
                  <select
                    id="edit-riskLevel"
                    value={editingAction.riskLevel}
                    onChange={e =>
                      setEditingAction({
                        ...editingAction,
                        riskLevel: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="nulo">Nulo</option>
                    <option value="bajo">Bajo</option>
                    <option value="medio">Medio</option>
                    <option value="alto">Alto</option>
                    <option value="muy_alto">Muy Alto</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-department">Departamento *</Label>
                  <Input
                    id="edit-department"
                    value={editingAction.departamento}
                    onChange={e =>
                      setEditingAction({
                        ...editingAction,
                        departamento: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-responsible">Responsable *</Label>
                  <select
                    id="edit-responsible"
                    value={editingAction.responsibleUserId}
                    onChange={e =>
                      setEditingAction({
                        ...editingAction,
                        responsibleUserId: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {users?.map((user: any) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-dueDate">Fecha Límite *</Label>
                  <Input
                    id="edit-dueDate"
                    type="date"
                    value={editingAction.dueDate}
                    onChange={e =>
                      setEditingAction({
                        ...editingAction,
                        dueDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleUpdateAction}
                  disabled={updateAction.isPending}
                >
                  {updateAction.isPending ? "Actualizando..." : "Actualizar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
