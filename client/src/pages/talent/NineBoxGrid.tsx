import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Sparkles, TrendingUp, Users, AlertTriangle } from "lucide-react";

export default function NineBoxGrid() {
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [quadrantFilter, setQuadrantFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Queries
  const { data: assessmentsData, isLoading } = trpc.nineBoxGrid.getAll.useQuery({
    search,
    departmentId: departmentFilter === "all" ? undefined : departmentFilter ? Number(departmentFilter) : undefined,
    quadrant: quadrantFilter === "all" ? undefined : quadrantFilter || undefined,
    page,
    pageSize: 50,
  });

  const { data: stats } = trpc.nineBoxGrid.getStats.useQuery();
  const { data: departmentsData } = trpc.departments.list.useQuery({ page: 1, pageSize: 100 });
  const departments = departmentsData?.data || [];

  // Mutations
  const calculateAllMutation = trpc.nineBoxGrid.calculateAll.useMutation({
    onSuccess: (result) => {
      toast.success(
        `Evaluación completada: ${result.successCount} empleados evaluados, ${result.errorCount} errores`
      );
      // Refetch data
      trpc.useUtils().nineBoxGrid.getAll.invalidate();
      trpc.useUtils().nineBoxGrid.getStats.invalidate();
    },
    onError: (error) => {
      toast.error(`Error al calcular evaluaciones: ${error.message}`);
    },
  });

  const handleCalculateAll = () => {
    if (window.confirm("¿Desea calcular automáticamente las evaluaciones Nine Box para todos los empleados?")) {
      calculateAllMutation.mutate();
    }
  };

  // Mapeo de cuadrantes a colores
  const getQuadrantColor = (quadrant: string) => {
    if (quadrant.includes("Alto Desempeño / Alto Potencial")) return "bg-green-100 text-green-800 border-green-300";
    if (quadrant.includes("Alto Desempeño")) return "bg-blue-100 text-blue-800 border-blue-300";
    if (quadrant.includes("Alto Potencial")) return "bg-purple-100 text-purple-800 border-purple-300";
    if (quadrant.includes("Medio Desempeño / Medio Potencial")) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (quadrant.includes("Bajo Desempeño")) return "bg-red-100 text-red-800 border-red-300";
    return "bg-gray-100 text-gray-800 border-gray-300";
  };

  // Visualización de 9 cuadrantes
  const quadrants = [
    { name: "Alto Desempeño / Alto Potencial", perf: 3, pot: 3, color: "bg-green-500" },
    { name: "Alto Desempeño / Medio Potencial", perf: 3, pot: 2, color: "bg-blue-500" },
    { name: "Alto Desempeño / Bajo Potencial", perf: 3, pot: 1, color: "bg-blue-300" },
    { name: "Medio Desempeño / Alto Potencial", perf: 2, pot: 3, color: "bg-purple-500" },
    { name: "Medio Desempeño / Medio Potencial", perf: 2, pot: 2, color: "bg-yellow-500" },
    { name: "Medio Desempeño / Bajo Potencial", perf: 2, pot: 1, color: "bg-yellow-300" },
    { name: "Bajo Desempeño / Alto Potencial", perf: 1, pot: 3, color: "bg-purple-300" },
    { name: "Bajo Desempeño / Medio Potencial", perf: 1, pot: 2, color: "bg-orange-300" },
    { name: "Bajo Desempeño / Bajo Potencial", perf: 1, pot: 1, color: "bg-red-500" },
  ];

  const getQuadrantCount = (quadrantName: string) => {
    return stats?.byQuadrant.find((q) => q.quadrant === quadrantName)?.count || 0;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Nine Box Grid</h1>
          <p className="text-muted-foreground">
            Matriz de evaluación de talento: desempeño vs potencial
          </p>
        </div>
        <Button onClick={handleCalculateAll} disabled={calculateAllMutation.isPending}>
          <Sparkles className="mr-2 h-4 w-4" />
          {calculateAllMutation.isPending ? "Calculando..." : "Calcular Automáticamente"}
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Evaluados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Empleados con evaluación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alto Potencial</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.byQuadrant.filter((q) => q.quadrant.includes("Alto Potencial")).reduce((sum, q) => sum + q.count, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Candidatos para sucesión</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bajo Desempeño</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.byQuadrant.filter((q) => q.quadrant.includes("Bajo Desempeño")).reduce((sum, q) => sum + q.count, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Requieren atención inmediata</p>
          </CardContent>
        </Card>
      </div>

      {/* Visualización de 9 Cuadrantes */}
      <Card>
        <CardHeader>
          <CardTitle>Visualización de Matriz 9-Box</CardTitle>
          <CardDescription>
            Distribución de empleados por desempeño (eje X) y potencial (eje Y)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {/* Fila 3: Alto Potencial */}
            {quadrants.filter((q) => q.pot === 3).map((quadrant) => (
              <div
                key={quadrant.name}
                className={`${quadrant.color} p-4 rounded-lg text-white text-center cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => setQuadrantFilter(quadrant.name)}
              >
                <div className="text-2xl font-bold">{getQuadrantCount(quadrant.name)}</div>
                <div className="text-xs mt-1">{quadrant.name}</div>
              </div>
            ))}

            {/* Fila 2: Medio Potencial */}
            {quadrants.filter((q) => q.pot === 2).map((quadrant) => (
              <div
                key={quadrant.name}
                className={`${quadrant.color} p-4 rounded-lg text-white text-center cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => setQuadrantFilter(quadrant.name)}
              >
                <div className="text-2xl font-bold">{getQuadrantCount(quadrant.name)}</div>
                <div className="text-xs mt-1">{quadrant.name}</div>
              </div>
            ))}

            {/* Fila 1: Bajo Potencial */}
            {quadrants.filter((q) => q.pot === 1).map((quadrant) => (
              <div
                key={quadrant.name}
                className={`${quadrant.color} p-4 rounded-lg text-white text-center cursor-pointer hover:opacity-80 transition-opacity`}
                onClick={() => setQuadrantFilter(quadrant.name)}
              >
                <div className="text-2xl font-bold">{getQuadrantCount(quadrant.name)}</div>
                <div className="text-xs mt-1">{quadrant.name}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between text-xs text-muted-foreground">
            <span>← Bajo Desempeño</span>
            <span>Alto Desempeño →</span>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Búsqueda por nombre</label>
              <Input
                placeholder="Buscar empleado..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Departamento</label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departments?.map((dept: { id: number; name: string }) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Cuadrante</label>
              <Select value={quadrantFilter} onValueChange={setQuadrantFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los cuadrantes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {quadrants.map((q) => (
                    <SelectItem key={q.name} value={q.name}>
                      {q.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(search || departmentFilter || quadrantFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setDepartmentFilter("all");
                setQuadrantFilter("all");
              }}
            >
              Limpiar filtros
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Tabla de Evaluaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluaciones Nine Box</CardTitle>
          <CardDescription>
            {assessmentsData?.total || 0} evaluaciones encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : assessmentsData?.data.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron evaluaciones. Haga clic en "Calcular Automáticamente" para generar.
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Desempeño</TableHead>
                    <TableHead>Potencial</TableHead>
                    <TableHead>Cuadrante</TableHead>
                    <TableHead>Fecha Evaluación</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessmentsData?.data.map((assessment) => (
                    <TableRow key={assessment.id}>
                      <TableCell className="font-medium">{assessment.employeeName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {assessment.performanceScore === 3 ? "Alto" : assessment.performanceScore === 2 ? "Medio" : "Bajo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {assessment.potentialScore === 3 ? "Alto" : assessment.potentialScore === 2 ? "Medio" : "Bajo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getQuadrantColor(assessment.quadrant)}>
                          {assessment.quadrant}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(assessment.assessmentDate).toLocaleDateString("es-MX")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {assessment.notes}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Paginación */}
              {assessmentsData && assessmentsData.totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Página {page} de {assessmentsData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(assessmentsData.totalPages, p + 1))}
                    disabled={page === assessmentsData.totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
