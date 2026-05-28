import { useState } from 'react';
import { Breadcrumb } from "@/components/Breadcrumb";
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, CheckCircle2, Clock, XCircle, Download, Search } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Dashboard de Seguimiento de Tokens de Encuestas NOM-035
 * 
 * Muestra métricas de participación, tokens enviados vs completados,
 * y análisis por departamento.
 */

export default function TokensDashboard() {
  const [selectedSurvey, setSelectedSurvey] = useState<number | undefined>(undefined);
  const [selectedDepartment, setSelectedDepartment] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');

  // Obtener estadísticas de tokens
  const { data: stats, isLoading } = trpc.surveys.getTokenStats.useQuery({
    surveyId: selectedSurvey,
    department: selectedDepartment,
  });

  // Obtener lista de encuestas para filtro
  const { data: surveys } = trpc.surveys.getAll.useQuery();

  if (isLoading) {
    return (
      <div className="container py-8">
      <Breadcrumb items={[
        { label: "Encuestas NOM-035", href: "/surveys" },
        { label: "Tokens de Acceso" }
      ]} />

        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">Cargando estadísticas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container py-8">
        <p className="text-center text-muted-foreground">No hay datos disponibles</p>
      </div>
    );
  }

  // Filtrar tokens por búsqueda
  const filteredTokens = stats.tokens.filter(t =>
    t.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.employeeEmail?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Datos para gráfica de estado general
  const statusChartData = {
    labels: ['Completados', 'Pendientes', 'Expirados'],
    datasets: [
      {
        data: [stats.completedTokens, stats.pendingTokens, stats.expiredTokens],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 0,
      },
    ],
  };

  // Datos para gráfica por departamento
  const departmentChartData = {
    labels: stats.byDepartment.map(d => d.department),
    datasets: [
      {
        label: 'Completados',
        data: stats.byDepartment.map(d => d.completed),
        backgroundColor: '#10B981',
      },
      {
        label: 'Pendientes',
        data: stats.byDepartment.map(d => d.pending),
        backgroundColor: '#F59E0B',
      },
      {
        label: 'Expirados',
        data: stats.byDepartment.map(d => d.expired),
        backgroundColor: '#EF4444',
      },
    ],
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Tokens</h1>
          <p className="text-muted-foreground mt-2">
            Seguimiento de participación en encuestas NOM-035
          </p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar Reporte
        </Button>
      </div>

      {/* Filtros */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Encuesta</label>
            <Select
              value={selectedSurvey?.toString() || 'all'}
              onValueChange={(value) => setSelectedSurvey(value === 'all' ? undefined : parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas las encuestas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las encuestas</SelectItem>
                {surveys?.map(s => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Departamento</label>
            <Select
              value={selectedDepartment || 'all'}
              onValueChange={(value) => setSelectedDepartment(value === 'all' ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {stats.byDepartment.map(d => (
                  <SelectItem key={d.department} value={d.department}>
                    {d.department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Send className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tokens Enviados</p>
              <p className="text-3xl font-bold">{stats.totalTokens}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completados</p>
              <p className="text-3xl font-bold">{stats.completedTokens}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="text-3xl font-bold">{stats.pendingTokens}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Expirados</p>
              <p className="text-3xl font-bold">{stats.expiredTokens}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tasa de completado */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Tasa de Completado General</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-4 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${stats.completionRate}%` }}
              />
            </div>
          </div>
          <span className="text-2xl font-bold">{stats.completionRate.toFixed(1)}%</span>
        </div>
      </Card>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Distribución por Estado</h2>
          <div className="h-[300px] flex items-center justify-center">
            <Doughnut
              data={statusChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Participación por Departamento</h2>
          <div className="h-[300px]">
            <Bar
              data={departmentChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  x: {
                    stacked: true,
                  },
                  y: {
                    stacked: true,
                  },
                },
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
              }}
            />
          </div>
        </Card>
      </div>

      {/* Trabajadores Pendientes de Responder */}
      {stats.pendingTokens > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600" />
            Trabajadores Pendientes de Responder ({stats.tokens.filter(t => t.status === 'pendiente').length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold">Empleado</th>
                  <th className="text-left p-3 font-semibold">Departamento</th>
                  <th className="text-left p-3 font-semibold">Email</th>
                  <th className="text-left p-3 font-semibold">Encuesta</th>
                  <th className="text-left p-3 font-semibold">Expira</th>
                  <th className="text-left p-3 font-semibold">Días Restantes</th>
                </tr>
              </thead>
              <tbody>
                {stats.tokens
                  .filter(t => t.status === 'pendiente')
                  .sort((a: any, b: any) => {
                    // Ordenar por días restantes (ascendente)
                    const daysA = a.expiresAt ? Math.ceil((new Date(a.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                    const daysB = b.expiresAt ? Math.ceil((new Date(b.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;
                    return daysA - daysB;
                  })
                  .map((token: any) => {
                    const daysRemaining = token.expiresAt
                      ? Math.ceil((new Date(token.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      : 0;
                    const isUrgent = daysRemaining <= 3;

                    return (
                      <tr
                        key={token.tokenId}
                        className={`border-b hover:bg-muted/50 ${
                          isUrgent ? 'bg-red-50' : ''
                        }`}
                      >
                        <td className="p-3 font-medium">{token.employeeName}</td>
                        <td className="p-3">
                          <Badge variant="outline">{token.department || 'Sin departamento'}</Badge>
                        </td>
                        <td className="p-3 text-sm text-muted-foreground">{token.employeeEmail}</td>
                        <td className="p-3 text-sm">{token.surveyTitle}</td>
                        <td className="p-3 text-sm">
                          {token.expiresAt ? new Date(token.expiresAt).toLocaleDateString('es-MX') : '-'}
                        </td>
                        <td className="p-3">
                          {daysRemaining > 0 ? (
                            <Badge
                              className={`${
                                isUrgent
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'}
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-800">Vencido</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Nota:</strong> Los trabajadores marcados en rojo tienen menos de 3 días para completar la encuesta.
            </p>
          </div>
        </Card>
      )}

      {/* Tabla de tokens */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Detalle de Tokens ({filteredTokens.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3">Empleado</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Departamento</th>
                <th className="text-left p-3">Encuesta</th>
                <th className="text-left p-3">Estado</th>
                <th className="text-left p-3">Fecha Uso</th>
                <th className="text-left p-3">Expira</th>
              </tr>
            </thead>
            <tbody>
              {filteredTokens.map((token: any) => (
                <tr key={token.tokenId} className="border-b hover:bg-muted/50">
                  <td className="p-3">{token.employeeName}</td>
                  <td className="p-3 text-sm text-muted-foreground">{token.employeeEmail}</td>
                  <td className="p-3">{token.department}</td>
                  <td className="p-3 text-sm">{token.surveyTitle}</td>
                  <td className="p-3">
                    {token.status === 'completado' && (
                      <Badge className="bg-green-100 text-green-800">Completado</Badge>
                    )}
                    {token.status === 'pendiente' && (
                      <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>
                    )}
                    {token.status === 'expirado' && (
                      <Badge className="bg-red-100 text-red-800">Expirado</Badge>
                    )}
                  </td>
                  <td className="p-3 text-sm">
                    {token.usedAt ? new Date(token.usedAt).toLocaleDateString('es-MX') : '-'}
                  </td>
                  <td className="p-3 text-sm">
                    {token.expiresAt ? new Date(token.expiresAt).toLocaleDateString('es-MX') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
