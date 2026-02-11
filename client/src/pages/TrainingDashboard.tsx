import { useState, useEffect, useRef } from 'react';
import { trpc } from '../lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, Users, BookOpen, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Chart from 'chart.js/auto';

export default function TrainingDashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });

  const monthlyChartRef = useRef<HTMLCanvasElement>(null);
  const departmentChartRef = useRef<HTMLCanvasElement>(null);
  const monthlyChartInstance = useRef<Chart | null>(null);
  const departmentChartInstance = useRef<Chart | null>(null);

  // Queries
  const { data: stats, isLoading: loadingStats } = trpc.trainingDashboard.getStats.useQuery(dateRange);
  const { data: monthlyData, isLoading: loadingMonthly } = trpc.trainingDashboard.getCertificatesByMonth.useQuery();
  const { data: departmentData, isLoading: loadingDepartment } = trpc.trainingDashboard.getEmployeesByDepartment.useQuery();
  const { data: popularCourses, isLoading: loadingCourses } = trpc.trainingDashboard.getPopularCourses.useQuery();
  const { data: renewalAlerts, isLoading: loadingAlerts } = trpc.trainingDashboard.getRenewalAlerts.useQuery();
  const { data: recentCertificates, isLoading: loadingRecent } = trpc.trainingDashboard.getRecentCertificates.useQuery({ limit: 10 });

  // Gráfica de certificados por mes
  useEffect(() => {
    if (!monthlyData || !monthlyChartRef.current) return;

    // Destruir gráfica anterior
    if (monthlyChartInstance.current) {
      monthlyChartInstance.current.destroy();
    }

    const ctx = monthlyChartRef.current.getContext('2d');
    if (!ctx) return;

    monthlyChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: monthlyData.map((d) => {
          const [year, month] = d.month.split('-');
          return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es-MX', {
            month: 'short',
            year: 'numeric',
          });
        }),
        datasets: [
          {
            label: 'Certificados Emitidos',
            data: monthlyData.map((d) => d.count),
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
            fill: true,
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    });

    return () => {
      if (monthlyChartInstance.current) {
        monthlyChartInstance.current.destroy();
      }
    };
  }, [monthlyData]);

  // Gráfica de empleados por departamento
  useEffect(() => {
    if (!departmentData || !departmentChartRef.current) return;

    // Destruir gráfica anterior
    if (departmentChartInstance.current) {
      departmentChartInstance.current.destroy();
    }

    const ctx = departmentChartRef.current.getContext('2d');
    if (!ctx) return;

    departmentChartInstance.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: departmentData.map((d) => d.department),
        datasets: [
          {
            label: 'Empleados Capacitados',
            data: departmentData.map((d) => d.count),
            backgroundColor: 'rgb(59, 130, 246)',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    });

    return () => {
      if (departmentChartInstance.current) {
        departmentChartInstance.current.destroy();
      }
    };
  }, [departmentData]);

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="h-8 w-8" />
          Dashboard de Capacitación
        </h1>
        <p className="text-muted-foreground mt-2">
          Estadísticas y métricas de certificados de capacitación STPS/RED CONOCER
        </p>
      </div>

      {/* Tarjetas de métricas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Certificados</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? '...' : stats?.totalCertificates || 0}
            </div>
            <p className="text-xs text-muted-foreground">Certificados emitidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados Capacitados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? '...' : stats?.uniqueEmployees || 0}
            </div>
            <p className="text-xs text-muted-foreground">Empleados únicos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursos Activos</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? '...' : stats?.activeCourses || 0}
            </div>
            <p className="text-xs text-muted-foreground">Programas disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calificación Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loadingStats ? '...' : stats?.averageGrade || 0}
            </div>
            <p className="text-xs text-muted-foreground">Sobre 100 puntos</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Certificados por Mes</CardTitle>
            <CardDescription>Últimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingMonthly ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : (
              <div style={{ height: '300px' }}>
                <canvas ref={monthlyChartRef}></canvas>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Empleados por Departamento</CardTitle>
            <CardDescription>Distribución de capacitación</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingDepartment ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : (
              <div style={{ height: '300px' }}>
                <canvas ref={departmentChartRef}></canvas>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cursos más populares y alertas */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Cursos Más Populares</CardTitle>
            <CardDescription>Top 10 por certificados emitidos</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCourses ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : popularCourses && popularCourses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Curso</TableHead>
                    <TableHead className="text-right">Certificados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {popularCourses.map((course, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{course.courseName}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{course.count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos disponibles
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              Alertas de Renovación
            </CardTitle>
            <CardDescription>Certificados que requieren renovación</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAlerts ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : renewalAlerts && renewalAlerts.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {renewalAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="border border-orange-300 rounded-lg p-3 bg-white"
                  >
                    <div className="font-medium text-sm">{alert.employeeName}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {alert.courseName}
                    </div>
                    <div className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Vencido hace {alert.daysOverdue} días
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay alertas de renovación
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Certificados recientes */}
      <Card>
        <CardHeader>
          <CardTitle>Certificados Recientes</CardTitle>
          <CardDescription>Últimos 10 certificados emitidos</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingRecent ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : recentCertificates && recentCertificates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Folio</TableHead>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>Calificación</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCertificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-mono text-sm">{cert.folio}</TableCell>
                    <TableCell>{cert.employeeName}</TableCell>
                    <TableCell>{cert.courseName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{cert.grade}</Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(cert.createdAt).toLocaleDateString('es-MX')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay certificados recientes
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
