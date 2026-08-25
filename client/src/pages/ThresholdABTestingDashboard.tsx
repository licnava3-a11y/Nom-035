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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Trophy, Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ThresholdABTestingDashboard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [experimentName, setExperimentName] = useState("");
  const [experimentDescription, setExperimentDescription] = useState("");
  const [configIdA, setConfigIdA] = useState<number | null>(null);
  const [configIdB, setConfigIdB] = useState<number | null>(null);

  const {
    data: experiments = [],
    isLoading: loadingExperiments,
    refetch,
  } = trpc.thresholdExperiments.getExperiments.useQuery({ limit: 20 });
  const { data: availableConfigs = [], isLoading: loadingConfigs } =
    trpc.thresholdExperiments.getAvailableConfigs.useQuery();

  const createExperimentMutation =
    trpc.thresholdExperiments.createExperiment.useMutation({
      onSuccess: () => {
        toast.success("Experimento creado exitosamente");
        setIsDialogOpen(false);
        setExperimentName("");
        setExperimentDescription("");
        setConfigIdA(null);
        setConfigIdB(null);
        refetch();
      },
      onError: error => {
        toast.error(error.message || "Error al crear experimento");
      },
    });

  const handleCreateExperiment = () => {
    if (!experimentName || !configIdA || !configIdB) {
      toast.error("Completa todos los campos requeridos");
      return;
    }

    if (configIdA === configIdB) {
      toast.error("Selecciona dos configuraciones diferentes");
      return;
    }

    createExperimentMutation.mutate({
      name: experimentName,
      description: experimentDescription,
      configIdA,
      configIdB,
    });
  };

  const getMetricComparison = (
    metricA: string | null,
    metricB: string | null
  ) => {
    if (!metricA || !metricB)
      return <Minus className="h-4 w-4 text-gray-400" />;
    const diff = parseFloat(metricA) - parseFloat(metricB);
    if (Math.abs(diff) < 0.5)
      return <Minus className="h-4 w-4 text-gray-400" />;
    return diff > 0 ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  if (loadingExperiments || loadingConfigs) {
    return (
      <div className="container mx-auto py-8">
        <p>Cargando experimentos...</p>
      </div>
    );
  }

  // Preparar datos para gráfico comparativo del último experimento
  const latestExperiment = experiments[0];
  const chartData = latestExperiment
    ? [
        {
          metric: "Precisión",
          ConfigA: parseFloat(latestExperiment.precisionA || "0"),
          ConfigB: parseFloat(latestExperiment.precisionB || "0"),
        },
        {
          metric: "Recall",
          ConfigA: parseFloat(latestExperiment.recallA || "0"),
          ConfigB: parseFloat(latestExperiment.recallB || "0"),
        },
        {
          metric: "F1-Score",
          ConfigA: parseFloat(latestExperiment.f1ScoreA || "0"),
          ConfigB: parseFloat(latestExperiment.f1ScoreB || "0"),
        },
        {
          metric: "Accuracy",
          ConfigA: parseFloat(latestExperiment.accuracyA || "0"),
          ConfigB: parseFloat(latestExperiment.accuracyB || "0"),
        },
      ]
    : [];

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            A/B Testing de Configuraciones de Umbrales
          </h1>
          <p className="text-muted-foreground mt-2">
            Compara el rendimiento de diferentes configuraciones de umbrales
            para optimizar el modelo predictivo
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Crear Experimento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Crear Nuevo Experimento A/B</DialogTitle>
              <DialogDescription>
                Compara dos configuraciones de umbrales para determinar cuál
                optimiza mejor el modelo predictivo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Experimento *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Comparación Config Default vs Optimizada"
                  value={experimentName}
                  onChange={e => setExperimentName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  placeholder="Describe el objetivo del experimento..."
                  value={experimentDescription}
                  onChange={e => setExperimentDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="configA">Configuración A *</Label>
                <Select
                  value={configIdA?.toString() || ""}
                  onValueChange={value => setConfigIdA(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona configuración A" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableConfigs.map((config: any) => (
                      <SelectItem key={config.id} value={config.id.toString()}>
                        {config.description || `Config ${config.id}`} -
                        Críticos: {config.criticalCommentsWeight}%, Casos:{" "}
                        {config.openCasesWeight}%, Riesgo:{" "}
                        {config.highRiskSurveysWeight}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="configB">Configuración B *</Label>
                <Select
                  value={configIdB?.toString() || ""}
                  onValueChange={value => setConfigIdB(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona configuración B" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableConfigs.map((config: any) => (
                      <SelectItem key={config.id} value={config.id.toString()}>
                        {config.description || `Config ${config.id}`} -
                        Críticos: {config.criticalCommentsWeight}%, Casos:{" "}
                        {config.openCasesWeight}%, Riesgo:{" "}
                        {config.highRiskSurveysWeight}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateExperiment}
                disabled={createExperimentMutation.isPending}
              >
                {createExperimentMutation.isPending
                  ? "Creando..."
                  : "Crear Experimento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Gráfico Comparativo del Último Experimento */}
      {latestExperiment && (
        <Card>
          <CardHeader>
            <CardTitle>Último Experimento: {latestExperiment.name}</CardTitle>
            <CardDescription>
              Comparación de métricas entre configuraciones -{" "}
              {format(new Date(latestExperiment.createdAt), "PPP", {
                locale: es,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={value => `${value}%`} />
                <Legend />
                <Bar dataKey="ConfigA" fill="#3b82f6" name="Configuración A" />
                <Bar dataKey="ConfigB" fill="#10b981" name="Configuración B" />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 flex items-center justify-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              <span className="font-medium">
                Configuración Ganadora:{" "}
                {latestExperiment.winnerConfigId === latestExperiment.configIdA
                  ? "A"
                  : "B"}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de Experimentos */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Experimentos</CardTitle>
          <CardDescription>
            Resultados de comparaciones A/B anteriores
          </CardDescription>
        </CardHeader>
        <CardContent>
          {experiments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No hay experimentos registrados
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Crea tu primer experimento para comparar configuraciones
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Experimento</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Config A</TableHead>
                  <TableHead>Config B</TableHead>
                  <TableHead>Precisión</TableHead>
                  <TableHead>Recall</TableHead>
                  <TableHead>F1-Score</TableHead>
                  <TableHead>Ganador</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {experiments.map((exp: any) => (
                  <TableRow key={exp.id}>
                    <TableCell className="font-medium">{exp.name}</TableCell>
                    <TableCell className="text-sm">
                      {format(new Date(exp.createdAt), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-sm">
                      {exp.configA?.description || `Config ${exp.configIdA}`}
                    </TableCell>
                    <TableCell className="text-sm">
                      {exp.configB?.description || `Config ${exp.configIdB}`}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {exp.precisionA}% vs {exp.precisionB}%
                        </span>
                        {getMetricComparison(exp.precisionA, exp.precisionB)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {exp.recallA}% vs {exp.recallB}%
                        </span>
                        {getMetricComparison(exp.recallA, exp.recallB)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          {exp.f1ScoreA}% vs {exp.f1ScoreB}%
                        </span>
                        {getMetricComparison(exp.f1ScoreA, exp.f1ScoreB)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-800"
                      >
                        <Trophy className="mr-1 h-3 w-3" />
                        Config{" "}
                        {exp.winnerConfigId === exp.configIdA ? "A" : "B"}
                      </Badge>
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
