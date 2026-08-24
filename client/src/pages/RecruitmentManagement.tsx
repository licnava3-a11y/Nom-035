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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Briefcase,
  Plus,
  Users,
  GraduationCap,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  Search,
  Filter,
  ExternalLink,
  Edit,
  Eye,
} from "lucide-react";

const EDUCATION_LABELS: Record<string, string> = {
  primaria: "Primaria",
  secundaria: "Secundaria",
  preparatoria: "Preparatoria / Bachillerato",
  tecnico: "Técnico Superior",
  licenciatura: "Licenciatura",
  especialidad: "Especialidad",
  maestria: "Maestría",
  doctorado: "Doctorado",
};

const EDUCATION_OPTIONS = Object.entries(EDUCATION_LABELS);

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new: { label: "Nuevo", color: "bg-blue-100 text-blue-800" },
  reviewing: { label: "En revisión", color: "bg-amber-100 text-amber-800" },
  interview: { label: "Entrevista", color: "bg-purple-100 text-purple-800" },
  offer: { label: "Oferta", color: "bg-indigo-100 text-indigo-800" },
  hired: { label: "Contratado", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-800" },
};

export default function RecruitmentManagement() {
  const [view, setView] = useState<"openings" | "candidates">("openings");
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedJobTitle, setSelectedJobTitle] = useState("");
  const [educationFilter, setEducationFilter] = useState<
    "all" | "meets" | "does_not_meet"
  >("all");
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<
    "all" | "new" | "reviewing" | "interview" | "offer" | "hired" | "rejected"
  >("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    requirements: "",
    responsibilities: "",
    salaryRange: "",
    location: "",
    employmentType: "permanent" as
      | "permanent"
      | "temporary"
      | "contract"
      | "internship",
    minimumEducation: "" as string,
  });

  const { data: jobOpenings, refetch: refetchJobs } =
    trpc.recruitment.getJobOpenings.useQuery({ status: "all" });
  const { data: candidates, refetch: refetchCandidates } =
    trpc.recruitment.getCandidatesByJob.useQuery(
      {
        jobOpeningId: selectedJobId!,
        status: candidateStatusFilter,
        educationFilter,
      },
      { enabled: selectedJobId !== null }
    );

  const createJobMutation = trpc.recruitment.createJobOpening.useMutation({
    onSuccess: () => {
      toast.success("Vacante creada exitosamente");
      setShowCreateForm(false);
      resetForm();
      refetchJobs();
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const updateJobMutation = trpc.recruitment.updateJobOpening.useMutation({
    onSuccess: () => {
      toast.success("Vacante actualizada");
      setEditingJobId(null);
      resetForm();
      refetchJobs();
    },
    onError: (e: any) => toast.error(`Error: ${e.message}`),
  });

  const updateCandidateMutation =
    trpc.recruitment.updateCandidateStatus.useMutation({
      onSuccess: () => {
        toast.success("Estado del candidato actualizado");
        refetchCandidates();
      },
      onError: (e: any) => toast.error(`Error: ${e.message}`),
    });

  const resetForm = () =>
    setForm({
      title: "",
      description: "",
      requirements: "",
      responsibilities: "",
      salaryRange: "",
      location: "",
      employmentType: "permanent",
      minimumEducation: "",
    });

  const handleSubmit = () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error("Título y descripción son obligatorios");
      return;
    }
    const payload = {
      ...form,
      minimumEducation: form.minimumEducation
        ? (form.minimumEducation as any)
        : undefined,
    };
    if (editingJobId) {
      updateJobMutation.mutate({ id: editingJobId, ...payload });
    } else {
      createJobMutation.mutate(payload);
    }
  };

  const handleEditJob = (job: any) => {
    setForm({
      title: job.title,
      description: job.description,
      requirements: job.requirements || "",
      responsibilities: job.responsibilities || "",
      salaryRange: job.salaryRange || "",
      location: job.location || "",
      employmentType: job.employmentType,
      minimumEducation: job.minimumEducation || "",
    });
    setEditingJobId(job.id);
    setShowCreateForm(true);
  };

  const handleViewCandidates = (job: any) => {
    setSelectedJobId(job.id);
    setSelectedJobTitle(job.title);
    setView("candidates");
    setEducationFilter("all");
    setCandidateStatusFilter("all");
  };

  const filteredCandidates = (candidates || []).filter((c: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.firstName?.toLowerCase().includes(term) ||
      c.lastName?.toLowerCase().includes(term) ||
      c.email?.toLowerCase().includes(term)
    );
  });

  const meetsCount = (candidates || []).filter(
    (c: any) => c.meetsEducation === true
  ).length;
  const doesNotMeetCount = (candidates || []).filter(
    (c: any) => c.meetsEducation === false
  ).length;
  const noRequirementCount = (candidates || []).filter(
    (c: any) => c.meetsEducation === null
  ).length;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view === "candidates" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView("openings")}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Vacantes
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              {view === "openings"
                ? "Gestión de Reclutamiento"
                : `Candidatos — ${selectedJobTitle}`}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {view === "openings"
                ? "Administra vacantes y filtra candidatos por nivel de escolaridad"
                : "Candidatos postulados con indicador de cumplimiento académico"}
            </p>
          </div>
        </div>
        {view === "openings" && (
          <Button
            onClick={() => {
              setShowCreateForm(true);
              setEditingJobId(null);
              resetForm();
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Nueva Vacante
          </Button>
        )}
      </div>

      {/* ── CREATE / EDIT FORM ── */}
      {showCreateForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base">
              {editingJobId ? "Editar Vacante" : "Nueva Vacante"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium">
                  Título de la vacante *
                </label>
                <input
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.title}
                  onChange={e =>
                    setForm(f => ({ ...f, title: e.target.value }))
                  }
                  placeholder="Ej: Analista de Recursos Humanos"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-sm font-medium">Descripción *</label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background min-h-[80px]"
                  value={form.description}
                  onChange={e =>
                    setForm(f => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Descripción del puesto..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Requisitos</label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background min-h-[60px]"
                  value={form.requirements}
                  onChange={e =>
                    setForm(f => ({ ...f, requirements: e.target.value }))
                  }
                  placeholder="Requisitos del candidato..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Responsabilidades</label>
                <textarea
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background min-h-[60px]"
                  value={form.responsibilities}
                  onChange={e =>
                    setForm(f => ({ ...f, responsibilities: e.target.value }))
                  }
                  placeholder="Responsabilidades del puesto..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Rango salarial</label>
                <input
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.salaryRange}
                  onChange={e =>
                    setForm(f => ({ ...f, salaryRange: e.target.value }))
                  }
                  placeholder="Ej: $15,000 - $20,000 MXN"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Ubicación</label>
                <input
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.location}
                  onChange={e =>
                    setForm(f => ({ ...f, location: e.target.value }))
                  }
                  placeholder="Ej: Chihuahua, Chih."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo de contrato</label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.employmentType}
                  onChange={e =>
                    setForm(f => ({
                      ...f,
                      employmentType: e.target.value as any,
                    }))
                  }
                >
                  <option value="permanent">Permanente</option>
                  <option value="temporary">Temporal</option>
                  <option value="contract">Por Contrato</option>
                  <option value="internship">Prácticas</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium flex items-center gap-1.5">
                  <GraduationCap className="h-4 w-4 text-primary" />
                  Escolaridad mínima requerida
                </label>
                <select
                  className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                  value={form.minimumEducation}
                  onChange={e =>
                    setForm(f => ({ ...f, minimumEducation: e.target.value }))
                  }
                >
                  <option value="">Sin requisito de escolaridad</option>
                  {EDUCATION_OPTIONS.map(([val, label]) => (
                    <option key={val} value={val}>
                      {label}
                    </option>
                  ))}
                </select>
                {form.minimumEducation && (
                  <p className="text-xs text-muted-foreground">
                    Los candidatos con escolaridad inferior serán marcados como
                    "No cumple".
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSubmit}
                disabled={
                  createJobMutation.isPending || updateJobMutation.isPending
                }
              >
                {editingJobId ? "Guardar cambios" : "Crear vacante"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingJobId(null);
                  resetForm();
                }}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── JOB OPENINGS LIST ── */}
      {view === "openings" && !showCreateForm && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(jobOpenings || []).length === 0 ? (
            <div className="col-span-3 text-center py-12 text-muted-foreground">
              <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>No hay vacantes registradas. Crea la primera.</p>
            </div>
          ) : (
            (jobOpenings || []).map((job: any) => (
              <Card key={job.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base leading-tight">
                      {job.title}
                    </CardTitle>
                    <Badge
                      variant={job.status === "open" ? "default" : "secondary"}
                      className="shrink-0 text-xs"
                    >
                      {job.status === "open"
                        ? "Abierta"
                        : job.status === "closed"
                          ? "Cerrada"
                          : job.status === "filled"
                            ? "Cubierta"
                            : "Borrador"}
                    </Badge>
                  </div>
                  {job.location && (
                    <CardDescription className="text-xs">
                      {job.location}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  {job.minimumEducation && (
                    <div className="flex items-center gap-1.5 text-xs bg-primary/5 border border-primary/20 rounded-md px-2 py-1.5">
                      <GraduationCap className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="font-medium text-primary">
                        Mín. escolaridad:
                      </span>
                      <span>
                        {EDUCATION_LABELS[job.minimumEducation] ??
                          job.minimumEducation}
                      </span>
                    </div>
                  )}
                  {job.salaryRange && (
                    <p className="text-xs text-muted-foreground">
                      💰 {job.salaryRange}
                    </p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 gap-1.5 text-xs"
                      onClick={() => handleViewCandidates(job)}
                    >
                      <Users className="h-3.5 w-3.5" />
                      Ver candidatos
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => handleEditJob(job)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ── CANDIDATES VIEW ── */}
      {view === "candidates" && (
        <div className="space-y-4">
          {/* Summary cards */}
          {candidates && candidates[0]?.minimumEducationRequired && (
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setEducationFilter("all")}
                className={`rounded-lg border p-3 text-left transition-colors ${educationFilter === "all" ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
              >
                <p className="text-xs text-muted-foreground">
                  Total candidatos
                </p>
                <p className="text-2xl font-bold">
                  {(candidates || []).length}
                </p>
              </button>
              <button
                onClick={() => setEducationFilter("meets")}
                className={`rounded-lg border p-3 text-left transition-colors ${educationFilter === "meets" ? "border-green-500 bg-green-50" : "hover:bg-muted/50"}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <p className="text-xs text-green-700 font-medium">
                    Cumple escolaridad
                  </p>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {meetsCount}
                </p>
              </button>
              <button
                onClick={() => setEducationFilter("does_not_meet")}
                className={`rounded-lg border p-3 text-left transition-colors ${educationFilter === "does_not_meet" ? "border-red-400 bg-red-50" : "hover:bg-muted/50"}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <XCircle className="h-3.5 w-3.5 text-red-500" />
                  <p className="text-xs text-red-700 font-medium">
                    No cumple escolaridad
                  </p>
                </div>
                <p className="text-2xl font-bold text-red-600">
                  {doesNotMeetCount}
                </p>
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                className="w-full border rounded-md pl-9 pr-3 py-2 text-sm bg-background"
                placeholder="Buscar candidato..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={candidateStatusFilter}
              onChange={e => setCandidateStatusFilter(e.target.value as any)}
            >
              <option value="all">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([val, { label }]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
            {candidates && candidates[0]?.minimumEducationRequired && (
              <select
                className="border rounded-md px-3 py-2 text-sm bg-background"
                value={educationFilter}
                onChange={e => setEducationFilter(e.target.value as any)}
              >
                <option value="all">Todos (escolaridad)</option>
                <option value="meets">✅ Cumple escolaridad</option>
                <option value="does_not_meet">❌ No cumple</option>
              </select>
            )}
          </div>

          {/* Candidates table */}
          {filteredCandidates.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>No hay candidatos que coincidan con los filtros.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left px-4 py-3 font-medium">
                          Candidato
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Escolaridad
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Cumple req.
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Estado
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Postulación
                        </th>
                        <th className="text-left px-4 py-3 font-medium">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCandidates.map((c: any) => (
                        <tr
                          key={c.id}
                          className="border-b hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium">
                              {c.firstName} {c.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {c.email}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            {c.educationLabel ? (
                              <span className="text-xs">
                                {c.educationLabel}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">
                                No especificada
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {c.meetsEducation === null ? (
                              <span className="text-xs text-muted-foreground">
                                Sin requisito
                              </span>
                            ) : c.meetsEducation ? (
                              <div className="flex items-center gap-1 text-green-700">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-xs font-medium">
                                  Cumple
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-red-600">
                                <XCircle className="h-4 w-4" />
                                <span className="text-xs font-medium">
                                  No cumple
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_LABELS[c.status]?.color ?? "bg-gray-100 text-gray-700"}`}
                            >
                              {STATUS_LABELS[c.status]?.label ?? c.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {c.appliedAt
                              ? new Date(c.appliedAt).toLocaleDateString(
                                  "es-MX"
                                )
                              : "-"}
                          </td>
                          <td className="px-4 py-3">
                            <select
                              className="border rounded text-xs px-2 py-1 bg-background"
                              value={c.status}
                              onChange={e =>
                                updateCandidateMutation.mutate({
                                  id: c.id,
                                  status: e.target.value as any,
                                })
                              }
                            >
                              {Object.entries(STATUS_LABELS).map(
                                ([val, { label }]) => (
                                  <option key={val} value={val}>
                                    {label}
                                  </option>
                                )
                              )}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
