import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  AlertTriangle, 
  TrendingUp, 
  Download,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye
} from "lucide-react";
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Página de administración de violaciones CSRF
 * Muestra tabla de violaciones, gráficas de estadísticas y panel de alertas activas
 * Solo accesible para administradores
 */
export default function CSRFViolationsPage() {
  // Estados para filtros y paginación
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [ipFilter, setIpFilter] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string | undefined>(undefined);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Queries de tRPC
  const { data: violationsData, isLoading: loadingViolations, refetch: refetchViolations } = trpc.csrfViolations.getViolations.useQuery({
    offset: (page - 1) * pageSize,
    limit: pageSize,
    ipAddress: ipFilter || undefined,
    reason: reasonFilter,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: statsData, isLoading: loadingStats } = trpc.csrfViolations.getStatistics.useQuery();
  const { data: recentData, isLoading: loadingRecent } = trpc.csrfViolations.getRecentViolations.useQuery();

  // Datos para gráficas
  const violationsByReasonData = {
    labels: statsData?.violationsByReason.map(v => v.reason) || [],
    datasets: [{
      label: 'Violaciones por Razón',
      data: statsData?.violationsByReason.map(v => v.count) || [],
      backgroundColor: [
        '#dc2626', // rojo - missing_token
        '#ea580c', // naranja - invalid_token
        '#ca8a04', // amarillo - expired_token
        '#16a34a', // verde - user_mismatch
        '#0284c7', // azul - malformed_token
      ],
      borderColor: '#1e293b',
      borderWidth: 2,
    }],
  };

  const topIPsData = {
    labels: statsData?.topAttackerIPs.slice(0, 10).map(v => v.ipAddress) || [],
    datasets: [{
      label: 'Intentos Fallidos',
      data: statsData?.topAttackerIPs.slice(0, 10).map(v => v.count) || [],
      backgroundColor: '#dc2626',
      borderColor: '#1e293b',
      borderWidth: 2,
    }],
  };

  const topEndpointsData = {
    labels: statsData?.topTargetedEndpoints.slice(0, 10).map(v => v.endpoint || 'unknown') || [],
    datasets: [{
      label: 'Ataques',
      data: statsData?.topTargetedEndpoints.slice(0, 10).map(v => v.count) || [],
      backgroundColor: '#0f172a', // azul marino oscuro
      borderColor: '#1e293b',
      borderWidth: 2,
    }],
  };

  // Función para exportar a Excel (simplificada - en producción usar librería como xlsx)
  const handleExport = () => {
    if (!violationsData?.violations) return;
    
    const csv = [
      ['ID', 'IP Address', 'Razón', 'Endpoint', 'User Agent', 'Fecha'].join(','),
      ...violationsData.violations.map(v => [
        v.id,
        v.ipAddress,
        v.reason,
        v.endpoint || '',
        `"${v.userAgent || ''}"`,
        new Date(v.attemptedAt).toLocaleString('es-MX')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `csrf-violations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Mapeo de razones a etiquetas legibles
  const reasonLabels: Record<string, string> = {
    missing_token: 'Token Faltante',
    invalid_token: 'Token Inválido',
    expired_token: 'Token Expirado',
    user_mismatch: 'Usuario No Coincide',
    malformed_token: 'Token Malformado',
  };

  // Mapeo de razones a colores de badge
  const reasonColors: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
    missing_token: 'destructive',
    invalid_token: 'destructive',
    expired_token: 'secondary',
    user_mismatch: 'default',
    malformed_token: 'destructive',
  };

  if (loadingViolations || loadingStats) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Seguridad CSRF
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitoreo de violaciones y alertas de seguridad
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Violaciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{statsData?.totalViolations || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Últimas 24h
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {recentData?.violations.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              IPs Únicas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statsData?.topAttackerIPs.length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Endpoints Afectados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {statsData?.topTargetedEndpoints.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="violations" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="violations">Violaciones</TabsTrigger>
          <TabsTrigger value="statistics">Estadísticas</TabsTrigger>
          <TabsTrigger value="alerts">Alertas Activas</TabsTrigger>
        </TabsList>

        {/* Tab: Violaciones */}
        <TabsContent value="violations" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filtros</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">IP Address</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="192.168.1.1"
                    value={ipFilter}
                    onChange={(e) => setIpFilter(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Razón</label>
                <Select value={reasonFilter} onValueChange={setReasonFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="missing_token">Token Faltante</SelectItem>
                    <SelectItem value="invalid_token">Token Inválido</SelectItem>
                    <SelectItem value="expired_token">Token Expirado</SelectItem>
                    <SelectItem value="user_mismatch">Usuario No Coincide</SelectItem>
                    <SelectItem value="malformed_token">Token Malformado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha Inicio</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Fecha Fin</label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabla de Violaciones */}
          <Card>
            <CardHeader>
              <CardTitle>Violaciones Registradas</CardTitle>
              <CardDescription>
                {violationsData?.totalCount || 0} violaciones encontradas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Razón</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violationsData?.violations.map((violation) => (
                    <TableRow key={violation.id}>
                      <TableCell className="font-mono text-sm">{violation.id}</TableCell>
                      <TableCell className="font-mono">{violation.ipAddress}</TableCell>
                      <TableCell>
                        <Badge variant={reasonColors[violation.reason]}>
                          {reasonLabels[violation.reason]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {violation.endpoint || 'N/A'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(violation.attemptedAt).toLocaleString('es-MX')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Paginación */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Página {page} de {violationsData?.totalPages || 1}
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
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= (violationsData?.totalPages || 1)}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Estadísticas */}
        <TabsContent value="statistics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Gráfica: Violaciones por Razón */}
            <Card>
              <CardHeader>
                <CardTitle>Violaciones por Razón</CardTitle>
                <CardDescription>Distribución de tipos de violaciones</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div style={{ maxWidth: '400px', maxHeight: '400px' }}>
                  <Pie data={violationsByReasonData} options={{
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }} />
                </div>
              </CardContent>
            </Card>

            {/* Gráfica: Top 10 IPs Atacantes */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 IPs Atacantes</CardTitle>
                <CardDescription>IPs con más intentos fallidos</CardDescription>
              </CardHeader>
              <CardContent>
                <Bar data={topIPsData} options={{
                  responsive: true,
                  indexAxis: 'y',
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                    },
                  },
                }} />
              </CardContent>
            </Card>

            {/* Gráfica: Endpoints Más Atacados */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Endpoints Más Atacados</CardTitle>
                <CardDescription>Top 10 endpoints con más violaciones</CardDescription>
              </CardHeader>
              <CardContent>
                <Bar data={topEndpointsData} options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                    },
                  },
                }} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab: Alertas Activas */}
        <TabsContent value="alerts" className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Las alertas se generan automáticamente cuando una IP tiene más de 10 intentos fallidos en 1 hora.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Alertas Activas</CardTitle>
              <CardDescription>
                Patrones de ataque detectados pendientes de revisión
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Panel de alertas en desarrollo</p>
                <p className="text-sm mt-2">
                  Próximamente: gestión de alertas, resolución y bloqueo de IPs
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
