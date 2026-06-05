import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { 
  Users, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  BarChart3,
  Shield,
  Target,
  ArrowRight
} from 'lucide-react';
import { Bar, Line } from 'react-chartjs-2';

export default function DashboardGerente() {
  const { data: stats, isLoading } = trpc.dashboard.getManagerStats.useQuery();
  const { data: teamPerformance } = trpc.dashboard.getTeamPerformance.useQuery();
  // TODO: Implementar cases.getOpenCases procedure
  // const { data: openCases } = trpc.cases.getOpenCases.useQuery({ limit: 5 });
  const openCases: any[] = [];
  const { data: complianceMetrics } = trpc.dashboard.getNOM035Compliance.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i: any) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const performanceChartData = {
    labels: teamPerformance?.labels || ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Cumplimiento de Capacitación (%)',
        data: teamPerformance?.trainingCompletion || [75, 80, 85, 88, 90, 92],
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 2,
      },
    ],
  };

  const complianceChartData = {
    labels: complianceMetrics?.labels || ['Evaluaciones', 'Capacitaciones', 'Casos Atendidos', 'Documentación'],
    datasets: [
      {
        label: 'Cumplimiento NOM-035 (%)',
        data: complianceMetrics?.values || [95, 88, 92, 97],
        backgroundColor: [
          'rgba(34, 197, 94, 0.5)',
          'rgba(59, 130, 246, 0.5)',
          'rgba(251, 146, 60, 0.5)',
          'rgba(168, 85, 247, 0.5)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(251, 146, 60)',
          'rgb(168, 85, 247)',
        ],
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeEmployees || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.newEmployeesThisMonth || 0} este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumplimiento NOM-035</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.nom035Compliance || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {stats?.nom035Trend === 'up' ? '+' : ''}{stats?.nom035Change || 0}% vs mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casos Abiertos</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.openCases || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.casesInInvestigation || 0} en investigación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rendimiento General</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.overallPerformance || 0}%</div>
            <p className="text-xs text-muted-foreground">Promedio del equipo</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas de Rendimiento */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tendencia de Cumplimiento
            </CardTitle>
            <CardDescription>
              Porcentaje de cumplimiento de capacitación por mes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line 
                data={performanceChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Cumplimiento NOM-035
            </CardTitle>
            <CardDescription>
              Métricas de cumplimiento por categoría
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar 
                data={complianceChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Casos Abiertos */}
      {openCases && openCases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Casos Psicosociales Abiertos
            </CardTitle>
            <CardDescription>
              Casos que requieren seguimiento y atención
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {openCases.map((caso: any) => (
                <div key={caso.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">Caso #{caso.caseNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {caso.category} • {caso.status}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Reportado: {new Date(caso.reportedDate).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <Link href={`/cases/${caso.id}`}>
                    <Button variant="ghost" size="sm">
                      Ver Detalles
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Accesos Rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Accesos Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/employees">
              <Button variant="outline" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Gestión de Personal
              </Button>
            </Link>
            <Link href="/cases">
              <Button variant="outline" className="w-full justify-start">
                <Shield className="h-4 w-4 mr-2" />
                Casos Psicosociales
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
