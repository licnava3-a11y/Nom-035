import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { AlertCircle, Plus, Eye, Edit, FileText } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DateRangeFilter, DateRange } from "@/components/DateRangeFilter";
import { CaseDialog } from "@/components/CaseDialog";
import { CaseFollowUpDialog } from "@/components/CaseFollowUpDialog";
import { Breadcrumb } from "@/components/Breadcrumb";
import { TableSkeleton } from "@/components/TableSkeleton";

export default function Cases() {
  const { user } = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  // Preparar filtros
  const filters = useMemo(() => {
    if (!dateRange) return undefined;
    return {
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
    };
  }, [dateRange]);
  
  const { data: cases, isLoading } = trpc.cases.list.useQuery(filters, {
    enabled: user?.role === "admin" || user?.role === "committee",
  });

  const handleEditCase = (caseData: any) => {
    setSelectedCase(caseData);
    setEditDialogOpen(true);
  };

  const handleAddFollowUp = (caseData: any) => {
    setSelectedCase(caseData);
    setFollowUpDialogOpen(true);
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: "Abierto",
      investigating: "En Investigación",
      resolved: "Resuelto",
      closed: "Cerrado",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: "bg-red-100 text-red-800",
      investigating: "bg-yellow-100 text-yellow-800",
      resolved: "bg-green-100 text-green-800",
      closed: "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: "Baja",
      medium: "Media",
      high: "Alta",
      critical: "Crítica",
    };
    return labels[priority] || priority;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  const getCaseTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mobbing: "Mobbing",
      burnout: "Burnout",
      violence: "Violencia Laboral",
      stress: "Estrés Laboral",
      other: "Otro",
    };
    return labels[type] || type;
  };

  if (user?.role !== "admin" && user?.role !== "committee") {
    return (
      <div className="space-y-6">
      <Breadcrumb items={[
        {
                label: "Prevención de Riesgos Psicosociales",
                href: "/"
        },
        {
                label: "Casos"
        }
]} />

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Acceso Restringido</h3>
            <p className="text-sm text-muted-foreground text-center">
              Solo los miembros del comité y administradores pueden acceder a esta sección.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={[
          { label: "Prevención de Riesgos Psicosociales", href: "/" },
          { label: "Casos" }
        ]} />
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de Casos</h1>
            <p className="text-muted-foreground mt-2">Seguimiento de casos psicosociales</p>
          </div>
        </div>
        <TableSkeleton rows={8} columns={7} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Casos</h1>
          <p className="text-muted-foreground mt-2">
            Seguimiento y atención de casos de riesgo psicosocial
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Registrar Caso
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total de Casos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cases?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Abiertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {cases?.filter((c) => c.status === "open").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">En Investigación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {cases?.filter((c) => c.status === "investigating").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Resueltos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {cases?.filter((c) => c.status === "resolved").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cases Table */}
      <Card>
        <CardHeader>
          <CardTitle>Casos Registrados</CardTitle>
          <CardDescription>Listado completo de casos de riesgo psicosocial</CardDescription>
        </CardHeader>
        <CardContent>
          {cases && cases.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prioridad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((caseItem) => (
                  <TableRow key={caseItem.id}>
                    <TableCell className="font-medium">{caseItem.caseNumber}</TableCell>
                    <TableCell>{getCaseTypeLabel(caseItem.caseType)}</TableCell>
                    <TableCell>
                      <Badge className={getPriorityColor(caseItem.priority)}>
                        {getPriorityLabel(caseItem.priority)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(caseItem.status)}>
                        {getStatusLabel(caseItem.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(caseItem.createdAt), "dd/MM/yyyy", { locale: es })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Link href={`/cases/${caseItem.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalle
                          </Button>
                        </Link>
                        <Button variant="outline" size="sm" onClick={() => handleEditCase(caseItem)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleAddFollowUp(caseItem)}>
                          <FileText className="h-4 w-4 mr-2" />
                          Seguimiento
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay casos registrados</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Aún no se han reportado casos de riesgo psicosocial.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Registrar Primer Caso
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CaseDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
        }}
      />

      <CaseDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        caseData={selectedCase}
        onSuccess={() => {
          setEditDialogOpen(false);
          setSelectedCase(null);
        }}
      />

      <CaseFollowUpDialog
        open={followUpDialogOpen}
        onOpenChange={setFollowUpDialogOpen}
        caseId={selectedCase?.id || 0}
        onSuccess={() => {
          setFollowUpDialogOpen(false);
          setSelectedCase(null);
        }}
      />
    </div>
  );
}
