import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Breadcrumb } from "@/components/Breadcrumb";
import { toast } from "sonner";
import { FileDown, Search, Calendar, Filter, Eye } from "lucide-react";
import { loadXlsx } from "@/lib/loadXlsx";
import ProtectedButton from "@/components/ProtectedButton";

type SurveyType = 'guia_i' | 'guia_ii' | 'guia_iii' | 'all';
type StatusFilter = 'completed' | 'in_progress' | 'all';
type DatePeriod = 'all' | 'today' | 'this_week' | 'this_month' | 'this_year' | 'last_week' | 'last_month' | 'last_year' | 'custom';

export default function SurveysAdminPanel() {
  const [surveyType, setSurveyType] = useState<SurveyType>('all');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [departamento, setDepartamento] = useState<string>('all');
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate date range based on period
  const getDateRange = () => {
    const now = new Date();
    let start = '';
    let end = '';

    switch (datePeriod) {
      case 'today':
        start = new Date(now.setHours(0, 0, 0, 0)).toISOString().split('T')[0];
        end = new Date(now.setHours(23, 59, 59, 999)).toISOString().split('T')[0];
        break;
      case 'this_week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        start = startOfWeek.toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        end = new Date().toISOString().split('T')[0];
        break;
      case 'last_week':
        const lastWeekEnd = new Date(now);
        lastWeekEnd.setDate(now.getDate() - now.getDay() - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        start = lastWeekStart.toISOString().split('T')[0];
        end = lastWeekEnd.toISOString().split('T')[0];
        break;
      case 'last_month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        start = lastMonth.toISOString().split('T')[0];
        end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'last_year':
        start = new Date(now.getFullYear() - 1, 0, 1).toISOString().split('T')[0];
        end = new Date(now.getFullYear() - 1, 11, 31).toISOString().split('T')[0];
        break;
      case 'custom':
        start = startDate;
        end = endDate;
        break;
      default:
        start = '';
        end = '';
    }

    return { start, end };
  };

  const dateRange = getDateRange();

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.surveysAdmin.getStats.useQuery({
    surveyType,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
  });

  const { data: responsesData, isLoading: responsesLoading } = trpc.surveysAdmin.getResponses.useQuery({
    surveyType,
    status,
    departamento: departamento !== 'all' ? departamento : undefined,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
    page,
    pageSize: 50,
  });

  const { data: departments } = trpc.surveysAdmin.getDepartments.useQuery();

  const exportMutation = trpc.surveysAdmin.exportData.useQuery({
    surveyType,
    status,
    departamento: departamento !== 'all' ? departamento : undefined,
    startDate: dateRange.start || undefined,
    endDate: dateRange.end || undefined,
  }, {
    enabled: false,
  });

  // Filter responses by search term
  const filteredResponses = responsesData?.responses.filter(r => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      r.userName?.toLowerCase().includes(search) ||
      r.userEmail?.toLowerCase().includes(search) ||
      r.userDepartamento?.toLowerCase().includes(search) ||
      r.userPuesto?.toLowerCase().includes(search) ||
      r.curp?.toLowerCase().includes(search)
    );
  }) || [];

  // Handle export to Excel
  const handleExport = async () => {
    try {
      const { refetch } = exportMutation;
      const { data } = await refetch();
      
      if (!data || data.length === 0) {
        toast.error("No hay datos para exportar");
        return;
      }

      const XLSX = await loadXlsx();

      // Prepare metadata
      const now = new Date();
      const metadata = [
        ['Reporte de Encuestas NOM-035 STPS 2018'],
        ['Fecha de Exportación:', now.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })],
        ['Filtros Aplicados:'],
        ['  - Tipo de Encuesta:', surveyType === 'all' ? 'Todas' : getSurveyTypeLabel(surveyType)],
        ['  - Estado:', status === 'all' ? 'Todos' : status === 'completed' ? 'Completadas' : 'En Progreso'],
        ['  - Departamento:', departamento === 'all' ? 'Todos' : departamento],
        ['  - Período:', datePeriod === 'all' ? 'Todo el historial' : 
          datePeriod === 'today' ? 'Hoy' :
          datePeriod === 'this_week' ? 'Esta semana' :
          datePeriod === 'this_month' ? 'Este mes' :
          datePeriod === 'this_year' ? 'Este año' :
          datePeriod === 'last_week' ? 'Semana anterior' :
          datePeriod === 'last_month' ? 'Mes anterior' :
          datePeriod === 'last_year' ? 'Año anterior' :
          `${startDate} a ${endDate}`],
        ['Total de Registros:', data.length.toString()],
        [], // Empty row
      ];

      // Prepare data for Excel
      const excelData = data.map(r => ({
        'Tipo de Encuesta': r.surveyType === 'guia_i' ? 'Guía I - ATS' : 
                           r.surveyType === 'guia_ii' ? 'Guía II - Identificación' : 
                           'Guía III - Evaluación',
        'Título': r.surveyTitle,
        'Nombre': r.userName || 'N/A',
        'Correo': r.userEmail || 'N/A',
        'CURP': r.curp || 'N/A',
        'Departamento': r.userDepartamento || 'N/A',
        'Puesto': r.userPuesto || 'N/A',
        'Fecha Inicio': r.startedAt ? new Date(r.startedAt).toLocaleString('es-MX') : 'N/A',
        'Fecha Completado': r.completedAt ? new Date(r.completedAt).toLocaleString('es-MX') : 'En progreso',
        'Estado': r.completedAt ? 'Completada' : 'En progreso',
        'Resultados': r.results || 'N/A',
      }));

      // Create workbook with metadata
      const wb = XLSX.utils.book_new();
      
      // Create worksheet with metadata first
      const ws = XLSX.utils.aoa_to_sheet(metadata);
      
      // Append data below metadata
      XLSX.utils.sheet_add_json(ws, excelData, { origin: -1, skipHeader: false });
      
      XLSX.utils.book_append_sheet(wb, ws, "Respuestas de Encuestas");

      // Auto-size columns
      const maxWidth = 50;
      const colWidths = Object.keys(excelData[0] || {}).map(key => {
        const maxLen = Math.max(
          key.length,
          ...excelData.map(row => String(row[key as keyof typeof row] || '').length)
        );
        return { wch: Math.min(maxLen + 2, maxWidth) };
      });
      ws['!cols'] = colWidths;

      // Generate filename with timestamp and filters
      const timestamp = now.toISOString().split('T')[0];
      const typeLabel = surveyType === 'all' ? 'todas' : surveyType.replace('guia_', 'guia');
      const filename = `encuestas_nom035_${typeLabel}_${timestamp}.xlsx`;

      // Download
      XLSX.writeFile(wb, filename);
      toast.success(`Archivo Excel generado: ${data.length} registros exportados`);
    } catch (error) {
      toast.error("Error al generar el archivo Excel");
    }
  };

  const getSurveyTypeLabel = (type: string) => {
    switch (type) {
      case 'guia_i': return 'Guía I - ATS';
      case 'guia_ii': return 'Guía II - Identificación';
      case 'guia_iii': return 'Guía III - Evaluación';
      default: return type;
    }
  };

  const getStatusBadge = (completedAt: Date | null) => {
    if (completedAt) {
      return <Badge className="bg-green-100 text-green-800">Completada</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800">En progreso</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb items={[
        { label: "Encuestas NOM-035", href: "/" },
        { label: "Panel de Administración" }
      ]} />
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Panel de Administración de Encuestas</h1>
          <p className="text-muted-foreground mt-1">
            Gestión consolidada de respuestas de encuestas NOM-035
          </p>
        </div>
        <ProtectedButton 
          onClick={handleExport} 
          disabled={exportMutation.isFetching}
          requiredPermission="can_export"
          fallbackMessage="No tienes permisos para exportar datos"
        >
          <FileDown className="mr-2 h-4 w-4" />
          {exportMutation.isFetching ? "Exportando..." : "Exportar a Excel"}
        </ProtectedButton>
      </div>

      {/* Statistics Cards */}
      {statsLoading ? (
        <div className="text-center py-8">Cargando estadísticas...</div>
      ) : stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Respuestas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalResponses}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.participationRate.toFixed(1)}% de participación
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Completadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.completedResponses}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.completionRate.toFixed(1)}% completadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                En Progreso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.inProgressResponses}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Pendientes de completar
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Usuarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Usuarios registrados
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
          <CardDescription>
            Filtra las respuestas por tipo de encuesta, estado, departamento y periodo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Survey Type Filter */}
            <div className="space-y-2">
              <Label>Tipo de Encuesta</Label>
              <Select value={surveyType} onValueChange={(v) => setSurveyType(v as SurveyType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las encuestas</SelectItem>
                  <SelectItem value="guia_i">Guía I - ATS</SelectItem>
                  <SelectItem value="guia_ii">Guía II - Identificación</SelectItem>
                  <SelectItem value="guia_iii">Guía III - Evaluación</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="completed">Completadas</SelectItem>
                  <SelectItem value="in_progress">En progreso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={departamento} onValueChange={setDepartamento}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {departments?.map((dept: any) => dept && (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Period Filter */}
            <div className="space-y-2">
              <Label>Periodo</Label>
              <Select value={datePeriod} onValueChange={(v) => setDatePeriod(v as DatePeriod)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el tiempo</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="this_week">Esta semana</SelectItem>
                  <SelectItem value="this_month">Este mes</SelectItem>
                  <SelectItem value="this_year">Este año</SelectItem>
                  <SelectItem value="last_week">Semana anterior</SelectItem>
                  <SelectItem value="last_month">Mes anterior</SelectItem>
                  <SelectItem value="last_year">Año anterior</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Custom Date Range */}
          {datePeriod === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha Inicio</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha Fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="space-y-2">
            <Label htmlFor="search">Búsqueda</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Buscar por nombre, correo, departamento, puesto o CURP..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Respuestas de Encuestas</CardTitle>
          <CardDescription>
            {filteredResponses.length} respuesta(s) encontrada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {responsesLoading ? (
            <div className="text-center py-8">Cargando respuestas...</div>
          ) : filteredResponses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron respuestas con los filtros seleccionados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResponses.map((response: any) => (
                    <TableRow key={response.id}>
                      <TableCell>
                        <Badge variant="outline">
                          {getSurveyTypeLabel(response.surveyType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {response.userName || response.curp || 'N/A'}
                      </TableCell>
                      <TableCell>{response.userEmail || 'N/A'}</TableCell>
                      <TableCell>{response.userDepartamento || 'N/A'}</TableCell>
                      <TableCell>{response.userPuesto || 'N/A'}</TableCell>
                      <TableCell>
                        {response.startedAt
                          ? new Date(response.startedAt).toLocaleDateString('es-MX')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{getStatusBadge(response.completedAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            toast.info("Funcionalidad de vista detallada próximamente");
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {responsesData && responsesData.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Página {responsesData.page} de {responsesData.totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(responsesData.totalPages, p + 1))}
                  disabled={page === responsesData.totalPages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Responses by Survey Type */}
      {stats && stats.responsesBySurvey.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Tipo de Encuesta</CardTitle>
            <CardDescription>
              Número de respuestas por cada tipo de encuesta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.responsesBySurvey.map((item: any) => (
                <div key={item.surveyType} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {getSurveyTypeLabel(item.surveyType)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {item.surveyTitle}
                    </span>
                  </div>
                  <div className="text-2xl font-bold">{item.count}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
