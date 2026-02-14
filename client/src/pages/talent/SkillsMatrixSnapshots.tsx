import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Minus, ArrowLeft, Trash2, Calendar } from "lucide-react";
import { Link } from "wouter";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function SkillsMatrixSnapshots() {
  const [snapshot1Id, setSnapshot1Id] = useState<number | undefined>();
  const [snapshot2Id, setSnapshot2Id] = useState<number | undefined>();

  // Queries
  const { data: snapshotsData, refetch } = trpc.skillsMatrixSnapshots.getAll.useQuery({
    limit: 100,
    offset: 0,
  });

  const { data: comparisonData, isLoading: isComparing } = trpc.skillsMatrixSnapshots.compareSnapshots.useQuery(
    {
      snapshot1Id: snapshot1Id!,
      snapshot2Id: snapshot2Id!,
    },
    {
      enabled: !!snapshot1Id && !!snapshot2Id && snapshot1Id !== snapshot2Id,
    }
  );

  // Mutations
  const deleteSnapshotMutation = trpc.skillsMatrixSnapshots.deleteSnapshot.useMutation({
    onSuccess: () => {
      toast.success("Snapshot eliminado", { description: "El snapshot se eliminó correctamente" });
      refetch();
    },
    onError: (error: { message: string }) => {
      toast.error("Error", { description: error.message });
    },
  });

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el snapshot "${name}"?`)) {
      deleteSnapshotMutation.mutate({ id });
    }
  };

  const snapshots = snapshotsData?.snapshots || [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Breadcrumb
        items={[
          { label: "Gestión de Talento", href: "/" },
          { label: "Matriz de Habilidades", href: "/talent/skills-matrix" },
          { label: "Snapshots" },
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Snapshots de Matriz de Habilidades</h1>
          <p className="text-muted-foreground">
            Compara el progreso de competencias a lo largo del tiempo
          </p>
        </div>
        <Link href="/talent/skills-matrix">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Matriz
          </Button>
        </Link>
      </div>

      {/* Comparison Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Comparar Snapshots</CardTitle>
          <CardDescription>
            Selecciona dos snapshots para ver la evolución de competencias
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Snapshot Anterior</label>
              <Select
                value={snapshot1Id?.toString()}
                onValueChange={(value) => setSnapshot1Id(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona snapshot..." />
                </SelectTrigger>
                <SelectContent>
                  {snapshots.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name} - {new Date(s.snapshotDate).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Snapshot Actual</label>
              <Select
                value={snapshot2Id?.toString()}
                onValueChange={(value) => setSnapshot2Id(Number(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona snapshot..." />
                </SelectTrigger>
                <SelectContent>
                  {snapshots.map((s) => (
                    <SelectItem key={s.id} value={s.id.toString()}>
                      {s.name} - {new Date(s.snapshotDate).toLocaleDateString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Results */}
      {comparisonData && (
        <>
          {/* Summary Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Empleados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comparisonData.summaryComparison.totalEmployees.after}
                </div>
                <div className="flex items-center text-xs">
                  {comparisonData.summaryComparison.totalEmployees.change > 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                  ) : comparisonData.summaryComparison.totalEmployees.change < 0 ? (
                    <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
                  ) : (
                    <Minus className="mr-1 h-3 w-3 text-gray-600" />
                  )}
                  <span
                    className={
                      comparisonData.summaryComparison.totalEmployees.change > 0
                        ? "text-green-600"
                        : comparisonData.summaryComparison.totalEmployees.change < 0
                        ? "text-red-600"
                        : "text-gray-600"
                    }
                  >
                    {comparisonData.summaryComparison.totalEmployees.change > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.totalEmployees.change} (
                    {comparisonData.summaryComparison.totalEmployees.percentChange > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.totalEmployees.percentChange}%)
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Nivel Promedio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comparisonData.summaryComparison.averageCompetencyLevel.after.toFixed(2)}
                </div>
                <div className="flex items-center text-xs">
                  {comparisonData.summaryComparison.averageCompetencyLevel.change > 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-green-600" />
                  ) : comparisonData.summaryComparison.averageCompetencyLevel.change < 0 ? (
                    <TrendingDown className="mr-1 h-3 w-3 text-red-600" />
                  ) : (
                    <Minus className="mr-1 h-3 w-3 text-gray-600" />
                  )}
                  <span
                    className={
                      comparisonData.summaryComparison.averageCompetencyLevel.change > 0
                        ? "text-green-600"
                        : comparisonData.summaryComparison.averageCompetencyLevel.change < 0
                        ? "text-red-600"
                        : "text-gray-600"
                    }
                  >
                    {comparisonData.summaryComparison.averageCompetencyLevel.change > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.averageCompetencyLevel.change} (
                    {comparisonData.summaryComparison.averageCompetencyLevel.percentChange > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.averageCompetencyLevel.percentChange}%)
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Brechas Totales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comparisonData.summaryComparison.totalGaps.after}
                </div>
                <div className="flex items-center text-xs">
                  {comparisonData.summaryComparison.totalGaps.change < 0 ? (
                    <TrendingDown className="mr-1 h-3 w-3 text-green-600" />
                  ) : comparisonData.summaryComparison.totalGaps.change > 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-red-600" />
                  ) : (
                    <Minus className="mr-1 h-3 w-3 text-gray-600" />
                  )}
                  <span
                    className={
                      comparisonData.summaryComparison.totalGaps.change < 0
                        ? "text-green-600"
                        : comparisonData.summaryComparison.totalGaps.change > 0
                        ? "text-red-600"
                        : "text-gray-600"
                    }
                  >
                    {comparisonData.summaryComparison.totalGaps.change > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.totalGaps.change} (
                    {comparisonData.summaryComparison.totalGaps.percentChange > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.totalGaps.percentChange}%)
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Brechas Críticas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {comparisonData.summaryComparison.criticalGaps.after}
                </div>
                <div className="flex items-center text-xs">
                  {comparisonData.summaryComparison.criticalGaps.change < 0 ? (
                    <TrendingDown className="mr-1 h-3 w-3 text-green-600" />
                  ) : comparisonData.summaryComparison.criticalGaps.change > 0 ? (
                    <TrendingUp className="mr-1 h-3 w-3 text-red-600" />
                  ) : (
                    <Minus className="mr-1 h-3 w-3 text-gray-600" />
                  )}
                  <span
                    className={
                      comparisonData.summaryComparison.criticalGaps.change < 0
                        ? "text-green-600"
                        : comparisonData.summaryComparison.criticalGaps.change > 0
                        ? "text-red-600"
                        : "text-gray-600"
                    }
                  >
                    {comparisonData.summaryComparison.criticalGaps.change > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.criticalGaps.change} (
                    {comparisonData.summaryComparison.criticalGaps.percentChange > 0 ? "+" : ""}
                    {comparisonData.summaryComparison.criticalGaps.percentChange}%)
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Improvers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Top 10 Empleados con Mayor Mejora
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead className="text-right">Nivel Anterior</TableHead>
                    <TableHead className="text-right">Nivel Actual</TableHead>
                    <TableHead className="text-right">Cambio</TableHead>
                    <TableHead className="text-right">Brecha Anterior</TableHead>
                    <TableHead className="text-right">Brecha Actual</TableHead>
                    <TableHead className="text-right">Cambio Brecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.topImprovers.map((emp) => (
                    <TableRow key={emp.employeeId}>
                      <TableCell className="font-medium">{emp.employeeName}</TableCell>
                      <TableCell>{emp.departmentName}</TableCell>
                      <TableCell className="text-right">{emp.averageLevel.before.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{emp.averageLevel.after.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={emp.averageLevel.change > 0 ? "default" : "secondary"} className="bg-green-100 text-green-700">
                          +{emp.averageLevel.change.toFixed(2)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{emp.totalGap.before}</TableCell>
                      <TableCell className="text-right">{emp.totalGap.after}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={emp.totalGap.change < 0 ? "default" : "secondary"} className={emp.totalGap.change < 0 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                          {emp.totalGap.change}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Needs Attention */}
          {comparisonData.needsAttention.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Empleados que Requieren Atención
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead className="text-right">Nivel Anterior</TableHead>
                      <TableHead className="text-right">Nivel Actual</TableHead>
                      <TableHead className="text-right">Cambio</TableHead>
                      <TableHead className="text-right">Brecha Anterior</TableHead>
                      <TableHead className="text-right">Brecha Actual</TableHead>
                      <TableHead className="text-right">Cambio Brecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparisonData.needsAttention.map((emp) => (
                      <TableRow key={emp.employeeId}>
                        <TableCell className="font-medium">{emp.employeeName}</TableCell>
                        <TableCell>{emp.departmentName}</TableCell>
                        <TableCell className="text-right">{emp.averageLevel.before.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{emp.averageLevel.after.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className={emp.averageLevel.change < 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}>
                            {emp.averageLevel.change.toFixed(2)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{emp.totalGap.before}</TableCell>
                        <TableCell className="text-right">{emp.totalGap.after}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className={emp.totalGap.change > 0 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}>
                            {emp.totalGap.change > 0 ? "+" : ""}{emp.totalGap.change}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* All Snapshots List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Todos los Snapshots
          </CardTitle>
          <CardDescription>
            Total: {snapshots.length} snapshots guardados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Empleados</TableHead>
                <TableHead>Nivel Promedio</TableHead>
                <TableHead>Brechas Totales</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((snapshot) => {
                const data = snapshot.data as any;
                return (
                  <TableRow key={snapshot.id}>
                    <TableCell className="font-medium">{snapshot.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {snapshot.description || "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(snapshot.snapshotDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{data.summary.totalEmployees}</TableCell>
                    <TableCell>{data.summary.averageCompetencyLevel.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {data.summary.totalGaps} ({data.summary.criticalGaps} críticas)
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(snapshot.id, snapshot.name)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
