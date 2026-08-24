import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  Bell,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { LoadingButton } from "@/components/ui/loading-button";

export default function RetentionAnalytics() {
  const { toast } = useToast();
  const [departmentFilter, setDepartmentFilter] = useState<number | undefined>(
    undefined
  );
  const [minScore, setMinScore] = useState(50);

  // Queries
  const { data: stats, isLoading: statsLoading } =
    trpc.predictiveAnalytics.getRetentionStats.useQuery();
  const {
    data: atRiskData,
    isLoading: atRiskLoading,
    refetch,
  } = trpc.predictiveAnalytics.identifyAtRiskEmployees.useQuery({
    departmentId: departmentFilter,
    minScore,
  });
  const { data: departments } = trpc.departments.list.useQuery({
    page: 1,
    pageSize: 100,
  });

  // Mutations
  const generateAlerts =
    trpc.predictiveAnalytics.generateRetentionAlerts.useMutation({
      onSuccess: data => {
        toast({
          title: "Alertas generadas",
          description: data.message,
        });
        refetch();
      },
      onError: error => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const getTrendIcon = (trend: string) => {
    if (trend === "descending")
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    if (trend === "ascending")
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getRiskBadge = (riskLevel: string) => {
    if (riskLevel === "critical")
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertTriangle className="h-3 w-3" />
          Crítico
        </Badge>
      );
    if (riskLevel === "high")
      return (
        <Badge variant="destructive" className="bg-orange-500 gap-1">
          <AlertTriangle className="h-3 w-3" />
          Alto
        </Badge>
      );
    return (
      <Badge variant="secondary" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        Medio
      </Badge>
    );
  };

  const getScoreColor = (score: number) => {
    if (score < 30) return "text-red-600 font-bold";
    if (score < 50) return "text-orange-600 font-semibold";
    return "text-yellow-600";
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            Análisis de Retención de Talento
          </h1>
          <p className="text-muted-foreground">
            Identificación de empleados en riesgo de rotación basado en
            tendencias de competencias (Evaluación 360°)
          </p>
        </div>
        <LoadingButton
          onClick={() => generateAlerts.mutate({ minScore })}
          loading={generateAlerts.isPending}
          className="gap-2"
        >
          <Bell className="h-4 w-4" />
          Generar Alertas RH
        </LoadingButton>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Empleados Activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.totalActiveEmployees || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Tasa de Retención
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? "..." : `${stats?.retentionRate || 0}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {statsLoading
                ? "..."
                : `${stats?.totalAtRisk || 0} en riesgo (${stats?.atRiskPercentage || 0}%)`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Riesgo Crítico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {statsLoading ? "..." : stats?.criticalRisk || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Score &lt; 30</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Riesgo Alto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statsLoading ? "..." : stats?.highRisk || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Score 30-49</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Personaliza la visualización de empleados en riesgo
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              Departamento
            </label>
            <Select
              value={departmentFilter?.toString() || "all"}
              onValueChange={v =>
                setDepartmentFilter(v === "all" ? undefined : Number(v))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {departments?.data?.map((dept: any) => (
                  <SelectItem key={dept.id} value={dept.id.toString()}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">
              Score Mínimo
            </label>
            <Select
              value={minScore.toString()}
              onValueChange={v => setMinScore(Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 (Crítico)</SelectItem>
                <SelectItem value="50">50 (Alto)</SelectItem>
                <SelectItem value="70">70 (Medio)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
        </CardContent>
      </Card>

      {/* Tabla de Empleados en Riesgo */}
      <Card>
        <CardHeader>
          <CardTitle>Empleados en Riesgo de Rotación</CardTitle>
          <CardDescription>
            {atRiskLoading
              ? "Cargando..."
              : `${atRiskData?.totalAtRisk || 0} empleados identificados con score &lt; ${minScore}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {atRiskLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando datos...
            </div>
          ) : atRiskData?.employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron empleados en riesgo con los filtros actuales
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead className="text-center">
                    Score de Retención
                  </TableHead>
                  <TableHead className="text-center">Tendencia</TableHead>
                  <TableHead className="text-center">Nivel de Riesgo</TableHead>
                  <TableHead className="text-center">Evaluaciones</TableHead>
                  <TableHead>Última Evaluación</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {atRiskData?.employees.map((employee: any) => (
                  <TableRow key={employee.employeeId}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{employee.employeeName}</div>
                        <div className="text-xs text-muted-foreground">
                          {employee.employeeEmail}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {employee.departmentName || "Sin departamento"}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={getScoreColor(employee.retentionScore)}>
                        {employee.retentionScore}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {getTrendIcon(employee.trend)}
                        <span className="text-sm">
                          {employee.trend === "descending" && "Descendente"}
                          {employee.trend === "ascending" && "Ascendente"}
                          {employee.trend === "stable" && "Estable"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({employee.trendValue > 0 ? "+" : ""}
                          {employee.trendValue})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getRiskBadge(employee.riskLevel)}
                    </TableCell>
                    <TableCell className="text-center">
                      {employee.evaluationCount}
                    </TableCell>
                    <TableCell>
                      {employee.lastEvaluationDate
                        ? new Date(
                            employee.lastEvaluationDate
                          ).toLocaleDateString("es-MX")
                        : "N/A"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
