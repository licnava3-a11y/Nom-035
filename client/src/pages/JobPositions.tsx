import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, AlertTriangle, TrendingUp, Plus, FileText,
  Search, ArrowUpDown, Users, ArrowUp, ArrowDown, X,
  ChevronUp, ChevronDown
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { JobAnalysisDialog } from "@/components/JobAnalysisDialog";
import { Breadcrumb } from "@/components/Breadcrumb";

type SortKey = "employees_desc" | "employees_asc" | "risk" | "name";
type RiskFilter = "all" | "bajo" | "medio" | "alto";

export default function JobPositions() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("employees_desc");
  const [filterRisk, setFilterRisk] = useState<RiskFilter>("all");

  const { data: jobPositions = [], refetch } = trpc.jobPositions.list.useQuery();

  // Datos de ejemplo para demostración cuando no hay datos reales
  const examplePositions = [
    {
      id: 1,
      title: "Gerente de Recursos Humanos",
      department: "Recursos Humanos",
      employees: 3,
      riskLevel: "bajo",
      lastAnalysis: "2026-01-15",
      factors: { workload: 2, control: 3, leadership: 4, relationships: 4, workEnvironment: 3 },
    },
    {
      id: 2,
      title: "Operador de Producción",
      department: "Producción",
      employees: 45,
      riskLevel: "alto",
      lastAnalysis: "2026-01-20",
      factors: { workload: 4, control: 2, leadership: 3, relationships: 3, workEnvironment: 2 },
    },
    {
      id: 3,
      title: "Analista de Sistemas",
      department: "Tecnología",
      employees: 8,
      riskLevel: "medio",
      lastAnalysis: "2026-01-25",
      factors: { workload: 3, control: 3, leadership: 3, relationships: 4, workEnvironment: 3 },
    },
    {
      id: 4,
      title: "Supervisor de Calidad",
      department: "Calidad",
      employees: 12,
      riskLevel: "medio",
      lastAnalysis: "2026-02-01",
      factors: { workload: 3, control: 3, leadership: 3, relationships: 3, workEnvironment: 3 },
    },
    {
      id: 5,
      title: "Auxiliar Administrativo",
      department: "Administración",
      employees: 6,
      riskLevel: "bajo",
      lastAnalysis: "2026-02-05",
      factors: { workload: 2, control: 3, leadership: 3, relationships: 4, workEnvironment: 3 },
    },
  ];

  const rawPositions = jobPositions.length > 0
    ? jobPositions.map(pos => ({
        id: pos.id,
        title: pos.positionName,
        department: pos.department || "Sin departamento",
        employees: (pos as any).employeeCount ?? 0,
        riskLevel:
          pos.riskLevel === "low" ? "bajo"
          : pos.riskLevel === "medium" ? "medio"
          : pos.riskLevel === "high" ? "alto"
          : "muy_alto",
        lastAnalysis: new Date(pos.createdAt).toISOString().split("T")[0],
        factors: { workload: 2, control: 3, leadership: 3, relationships: 3, workEnvironment: 3 },
      }))
    : examplePositions;

  const displayPositions = rawPositions
    .filter((p: any) => {
      const matchSearch =
        searchQuery === "" ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.department.toLowerCase().includes(searchQuery.toLowerCase());
      const matchRisk = filterRisk === "all" || p.riskLevel === filterRisk;
      return matchSearch && matchRisk;
    })
    .sort((a: any, b: any) => {
      if (sortBy === "employees_desc") return b.employees - a.employees;
      if (sortBy === "employees_asc") return a.employees - b.employees;
      if (sortBy === "risk") {
        const order: Record<string, number> = { alto: 0, medio: 1, bajo: 2 };
        return (order[a.riskLevel] ?? 3) - (order[b.riskLevel] ?? 3);
      }
      if (sortBy === "name") return a.title.localeCompare(b.title);
      return 0;
    });

  // Alternar entre mayor→menor y menor→mayor con un solo clic
  const toggleEmployeeSort = () => {
    setSortBy(prev => prev === "employees_desc" ? "employees_asc" : "employees_desc");
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "bajo":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Riesgo Bajo</Badge>;
      case "medio":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Riesgo Medio</Badge>;
      case "alto":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Riesgo Alto</Badge>;
      default:
        return null;
    }
  };

  const getEmployeesBadgeColor = (count: number) => {
    if (count >= 30) return "bg-blue-600 text-white";
    if (count >= 10) return "bg-blue-500 text-white";
    if (count >= 5) return "bg-blue-400 text-white";
    return "bg-blue-100 text-blue-700";
  };

  const calculateOverallRisk = (factors: any) => {
    const avg = (factors.workload + factors.control + factors.leadership + factors.relationships + factors.workEnvironment) / 5;
    return Math.round(avg * 10) / 10;
  };

  const sortLabel: Record<SortKey, { icon: React.ReactNode; text: string }> = {
    employees_desc: { icon: <ArrowDown className="h-3.5 w-3.5" />, text: "Más empleados primero" },
    employees_asc: { icon: <ArrowUp className="h-3.5 w-3.5" />, text: "Menos empleados primero" },
    risk: { icon: <AlertTriangle className="h-3.5 w-3.5" />, text: "Mayor riesgo primero" },
    name: { icon: <ArrowUpDown className="h-3.5 w-3.5" />, text: "Nombre A-Z" },
  };

  const hasActiveFilters = searchQuery !== "" || filterRisk !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setFilterRisk("all");
    setSortBy("employees_desc");
  };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Gestión de Talento", href: "/" }, { label: "Puestos" }]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análisis de Puestos</h1>
          <p className="text-muted-foreground mt-2">
            Evaluación de factores de riesgo psicosocial por puesto de trabajo
          </p>
        </div>
        {(user?.role === "admin" || user?.role === "instructor") && (
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Análisis
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puestos Analizados</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayPositions.length}</div>
            <p className="text-xs text-muted-foreground">Total de puestos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Riesgo Alto</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {displayPositions.filter((p: any) => p.riskLevel === "alto").length}
            </div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayPositions.reduce((acc: any, p: any) => acc + p.employees, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total evaluados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Riesgo Promedio</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.8</div>
            <p className="text-xs text-muted-foreground">Escala de 1 a 5</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Barra de filtros ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por puesto o departamento..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filtro de riesgo */}
          <Select value={filterRisk} onValueChange={(v) => setFilterRisk(v as RiskFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Nivel de riesgo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los riesgos</SelectItem>
              <SelectItem value="bajo">Riesgo Bajo</SelectItem>
              <SelectItem value="medio">Riesgo Medio</SelectItem>
              <SelectItem value="alto">Riesgo Alto</SelectItem>
            </SelectContent>
          </Select>

          {/* Selector de ordenamiento */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employees_desc">
                <span className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />Más empleados primero
                </span>
              </SelectItem>
              <SelectItem value="employees_asc">
                <span className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />Menos empleados primero
                </span>
              </SelectItem>
              <SelectItem value="risk">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="h-3.5 w-3.5" />Mayor riesgo primero
                </span>
              </SelectItem>
              <SelectItem value="name">
                <span className="flex items-center gap-2">
                  <ArrowUpDown className="h-3.5 w-3.5" />Nombre A-Z
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Limpiar filtros */}
          {(hasActiveFilters || sortBy !== "employees_desc") && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* ── Indicador del criterio activo ── */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Chip de ordenamiento activo */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
            {sortLabel[sortBy].icon}
            <span>Ordenado por: {sortLabel[sortBy].text}</span>
          </div>

          {/* Botones rápidos de orden por empleados */}
          <div className="flex items-center gap-1 border rounded-md overflow-hidden">
            <button
              onClick={() => setSortBy("employees_desc")}
              title="Más empleados primero"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
                sortBy === "employees_desc"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <Users className="h-3 w-3" />
              <ChevronDown className="h-3 w-3" />
            </button>
            <div className="w-px h-5 bg-border" />
            <button
              onClick={() => setSortBy("employees_asc")}
              title="Menos empleados primero"
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
                sortBy === "employees_asc"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <Users className="h-3 w-3" />
              <ChevronUp className="h-3 w-3" />
            </button>
          </div>

          {/* Contador de resultados */}
          <span className="text-xs text-muted-foreground ml-auto">
            {displayPositions.length} puesto{displayPositions.length !== 1 ? "s" : ""}
            {hasActiveFilters ? " encontrado" + (displayPositions.length !== 1 ? "s" : "") : " en total"}
          </span>
        </div>
      </div>

      {/* ── Lista de puestos ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Puestos de Trabajo</h2>
        </div>

        {displayPositions.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                No se encontraron puestos con los filtros aplicados.
              </p>
            </CardContent>
          </Card>
        )}

        {displayPositions.map((position: any, index: number) => (
          <Card key={position.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-2 bg-primary/10 rounded-lg mt-1 shrink-0">
                    <Briefcase className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <CardTitle className="text-lg">{position.title}</CardTitle>
                      {getRiskBadge(position.riskLevel)}
                    </div>
                    <CardDescription>{position.department}</CardDescription>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {/* ── Badge prominente de empleados ── */}
                      <div
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${getEmployeesBadgeColor(position.employees)}`}
                        title="Empleados asignados a este puesto"
                      >
                        <Users className="h-3.5 w-3.5" />
                        <span>{position.employees}</span>
                        <span className="font-normal opacity-90">
                          {position.employees === 1 ? "empleado" : "empleados"}
                        </span>
                      </div>

                      {/* Indicador de posición en el ranking (solo cuando se ordena por empleados) */}
                      {(sortBy === "employees_desc" || sortBy === "employees_asc") && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          #{index + 1} en ranking
                        </span>
                      )}

                      <span className="text-sm text-muted-foreground">
                        Último análisis: {new Date(position.lastAnalysis).toLocaleDateString("es-MX")}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Índice: {calculateOverallRisk(position.factors)}/5
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botón rápido de ordenar por empleados en la esquina de la tarjeta */}
                <button
                  onClick={toggleEmployeeSort}
                  title={sortBy === "employees_desc" ? "Cambiar a: menos empleados primero" : "Cambiar a: más empleados primero"}
                  className="shrink-0 ml-2 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                >
                  {sortBy === "employees_desc" ? (
                    <ArrowDown className="h-4 w-4" />
                  ) : sortBy === "employees_asc" ? (
                    <ArrowUp className="h-4 w-4" />
                  ) : (
                    <ArrowUpDown className="h-4 w-4" />
                  )}
                </button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Factores de riesgo */}
                <div className="grid grid-cols-5 gap-4">
                  {[
                    { label: "Carga de Trabajo", value: position.factors.workload },
                    { label: "Control", value: position.factors.control },
                    { label: "Liderazgo", value: position.factors.leadership },
                    { label: "Relaciones", value: position.factors.relationships },
                    { label: "Ambiente", value: position.factors.workEnvironment },
                  ].map(({ label, value }) => (
                    <div key={label} className="space-y-1">
                      <div className="text-xs text-muted-foreground">{label}</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${value >= 4 ? "bg-red-500" : value >= 3 ? "bg-yellow-500" : "bg-green-500"}`}
                            style={{ width: `${(value / 5) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm">Ver Detalles</Button>
                  <Button variant="outline" size="sm">Actualizar Análisis</Button>
                  <Button variant="outline" size="sm">Descargar Reporte</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Información sobre factores */}
      <Card>
        <CardHeader>
          <CardTitle>Factores de Riesgo Psicosocial</CardTitle>
          <CardDescription>Categorías evaluadas según la NOM-035-STPS-2018</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Carga de Trabajo</h4>
              <p className="text-sm text-muted-foreground">
                Evaluación de las exigencias que el trabajo impone al trabajador y que exceden su capacidad
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Falta de Control</h4>
              <p className="text-sm text-muted-foreground">
                Posibilidad del trabajador para influir y tomar decisiones sobre los diversos aspectos que intervienen en su actividad
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Liderazgo Negativo</h4>
              <p className="text-sm text-muted-foreground">
                Tipo de relación que se establece entre el patrón o sus representantes y los trabajadores
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Relaciones Negativas</h4>
              <p className="text-sm text-muted-foreground">
                Interacción que se establece en el contexto laboral y que puede generar conflictos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de creación */}
      <JobAnalysisDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
