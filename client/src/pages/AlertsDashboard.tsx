import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle2,
  Bell,
  BellOff,
  ExternalLink,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function AlertsDashboard() {
  const [category, setCategory] = useState<
    "all" | "departmental" | "survey" | "case"
  >("all");
  const [priority, setPriority] = useState<
    "all" | "low" | "medium" | "high" | "critical"
  >("all");
  const [status, setStatus] = useState<
    "all" | "active" | "resolved" | "silenced"
  >("active");

  // Query
  const { data, refetch } = trpc.alertsDashboard.getConsolidatedAlerts.useQuery(
    {
      category,
      priority,
      status,
    }
  );

  // Mutations
  const resolveAlert = trpc.alertsDashboard.resolveAlert.useMutation({
    onSuccess: () => {
      toast.success("Alerta marcada como resuelta");
      refetch();
    },
    onError: error => toast.error(`Error: ${error.message}`),
  });

  const silenceAlert = trpc.alertsDashboard.silenceAlert.useMutation({
    onSuccess: () => {
      toast.success("Alerta silenciada por 24 horas");
      refetch();
    },
    onError: error => toast.error(`Error: ${error.message}`),
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-300">
            Crítico
          </Badge>
        );
      case "high":
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-300">
            Alto
          </Badge>
        );
      case "medium":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
            Medio
          </Badge>
        );
      case "low":
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-300">
            Bajo
          </Badge>
        );
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "departmental":
        return <Badge variant="outline">Departamental</Badge>;
      case "survey":
        return <Badge variant="outline">Encuesta</Badge>;
      case "case":
        return <Badge variant="outline">Caso</Badge>;
      default:
        return <Badge variant="outline">{category}</Badge>;
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard de Alertas Consolidado</h1>
        <p className="text-muted-foreground mt-2">
          Monitoreo centralizado de alertas críticas del sistema
        </p>
      </div>

      {/* Resumen de Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{data?.total || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-red-700">
              Críticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-700">
              {data?.criticalCount || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-700">
              Altas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-700">
              {data?.highCount || 0}
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-yellow-700">
              Medias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-700">
              {data?.mediumCount || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
          <CardDescription>Personaliza la vista de alertas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">
                Categoría
              </label>
              <Select
                value={category}
                onValueChange={v => setCategory(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  <SelectItem value="departmental">Departamental</SelectItem>
                  <SelectItem value="survey">Encuesta</SelectItem>
                  <SelectItem value="case">Caso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">
                Prioridad
              </label>
              <Select
                value={priority}
                onValueChange={v => setPriority(v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las prioridades</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="medium">Medio</SelectItem>
                  <SelectItem value="low">Bajo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={status} onValueChange={v => setStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="active">Activas</SelectItem>
                  <SelectItem value="resolved">Resueltas</SelectItem>
                  <SelectItem value="silenced">Silenciadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas Activas</CardTitle>
          <CardDescription>
            {data?.total || 0} alertas encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.alerts && data.alerts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.alerts.map((alert: any) => (
                  <TableRow key={alert.id}>
                    <TableCell>{getPriorityBadge(alert.priority)}</TableCell>
                    <TableCell>{getCategoryBadge(alert.category)}</TableCell>
                    <TableCell className="font-medium">{alert.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                      {alert.description}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(alert.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {alert.actionUrl && (
                          <Link href={alert.actionUrl}>
                            <Button variant="ghost" size="sm">
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            resolveAlert.mutate({ alertId: alert.id })
                          }
                          disabled={resolveAlert.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            silenceAlert.mutate({
                              alertId: alert.id,
                              duration: 24,
                            })
                          }
                          disabled={silenceAlert.isPending}
                        >
                          <BellOff className="w-4 h-4 text-gray-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No hay alertas activas</p>
              <p className="text-sm text-muted-foreground mt-2">
                Todas las alertas han sido resueltas o no hay alertas que
                coincidan con los filtros seleccionados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
