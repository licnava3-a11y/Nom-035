import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function ModelRetrainingHistory() {
  const { data: retrainingHistory = [], isLoading: loadingHistory } =
    trpc.modelRetraining.getRetrainingHistory.useQuery({ limit: 20 });
  const { data: stats, isLoading: loadingStats } =
    trpc.modelRetraining.getRetrainingStats.useQuery();
  const { data: lastRetraining } =
    trpc.modelRetraining.getLastRetraining.useQuery();

  if (loadingHistory || loadingStats) {
    return (
      <div className="container mx-auto py-8">
        <p>Cargando historial de reentrena mientos...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Historial de Reentrenamiento Automático
        </h1>
        <p className="text-muted-foreground mt-2">
          Registro de ajustes automáticos del modelo predictivo basados en
          degradación de métricas
        </p>
      </div>

      {/* Estadísticas Generales */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Reentrena mientos
            </CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Desde el inicio del sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aplicados</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.applied || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Configuraciones activas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revertidos</CardTitle>
            <Activity className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.reverted || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Configuraciones revertidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Mejora Promedio
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              +{stats?.averageImprovement || 0}%
            </div>
            <p className="text-xs text-muted-foreground">En F1-Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Último Reentrenamiento */}
      {lastRetraining && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-blue-600" />
              Último Reentrenamiento
            </CardTitle>
            <CardDescription>
              {format(new Date(lastRetraining.appliedAt), "PPP 'a las' HH:mm", {
                locale: es,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Razón</p>
              <p className="text-sm">{lastRetraining.reason}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Configuración Anterior
                </p>
                <p className="text-sm">
                  {lastRetraining.oldConfig?.description ||
                    `Config ${lastRetraining.oldConfigId}`}
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs">
                    Precisión: {lastRetraining.oldPrecision || "N/A"}%
                  </p>
                  <p className="text-xs">
                    Recall: {lastRetraining.oldRecall || "N/A"}%
                  </p>
                  <p className="text-xs">
                    F1-Score: {lastRetraining.oldF1Score || "N/A"}%
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Nueva Configuración
                </p>
                <p className="text-sm">
                  {lastRetraining.newConfig?.description ||
                    `Config ${lastRetraining.newConfigId}`}
                </p>
                <div className="mt-2 space-y-1">
                  <p className="text-xs">
                    Precisión: {lastRetraining.newPrecision || "N/A"}%
                  </p>
                  <p className="text-xs">
                    Recall: {lastRetraining.newRecall || "N/A"}%
                  </p>
                  <p className="text-xs">
                    F1-Score: {lastRetraining.newF1Score || "N/A"}%
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">
                Mejora esperada: +{lastRetraining.improvementPercentage}% en
                F1-Score
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de Historial */}
      <Card>
        <CardHeader>
          <CardTitle>Historial Completo</CardTitle>
          <CardDescription>
            Todos los reentrena mientos automáticos del modelo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {retrainingHistory.length === 0 ? (
            <div className="text-center py-12">
              <RefreshCw className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                No hay reentrena mientos registrados
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                El sistema aplicará reentrena mientos automáticos cuando detecte
                degradación persistente
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Razón</TableHead>
                  <TableHead>Config Anterior</TableHead>
                  <TableHead>Nueva Config</TableHead>
                  <TableHead>Alertas</TableHead>
                  <TableHead>Mejora</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retrainingHistory.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell className="text-sm">
                      {format(new Date(record.appliedAt), "dd/MM/yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs truncate">
                      {record.reason}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.oldConfig?.description ||
                        `Config ${record.oldConfigId}`}
                    </TableCell>
                    <TableCell className="text-sm">
                      {record.newConfig?.description ||
                        `Config ${record.newConfigId}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{record.alertCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {parseFloat(record.improvementPercentage || "0") > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        <span className="text-sm font-medium">
                          {record.improvementPercentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === "applied" ? "default" : "secondary"
                        }
                      >
                        {record.status === "applied" ? "Aplicado" : "Revertido"}
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
