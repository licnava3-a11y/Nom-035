/**
 * Dashboard Comparativo de Vendedores
 * Muestra métricas de todos los vendedores lado a lado con ranking y gráficos
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Users, Target } from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function SalesComparativeDashboard() {
  const [months, setMonths] = useState(6);

  const { data, isLoading } = trpc.salespeople.getComparativeMetrics.useQuery({ months });

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando métricas comparativas...</div>
        </div>
      </div>
    );
  }

  if (!data || data.salespeople.length === 0) {
    return (
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard Comparativo de Vendedores</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <p>No hay vendedores activos con datos en el período seleccionado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const topPerformer = data.salespeople[0];
  const avgConversion =
    data.salespeople.reduce((sum, sp) => sum + sp.conversionRate, 0) / data.salespeople.length;
  const totalLeads = data.salespeople.reduce((sum, sp) => sum + sp.totalLeads, 0);
  const totalWon = data.salespeople.reduce((sum, sp) => sum + sp.wonLeads, 0);

  // Datos para gráfico de conversión
  const conversionChartData = {
    labels: data.salespeople.map((sp) => sp.nombre),
    datasets: [
      {
        label: "Tasa de Conversión (%)",
        data: data.salespeople.map((sp) => sp.conversionRate),
        backgroundColor: data.salespeople.map((sp, idx) =>
          idx === 0 ? "rgba(34, 197, 94, 0.7)" : "rgba(59, 130, 246, 0.7)"
        ),
        borderColor: data.salespeople.map((sp, idx) =>
          idx === 0 ? "rgba(34, 197, 94, 1)" : "rgba(59, 130, 246, 1)"
        ),
        borderWidth: 2,
      },
    ],
  };

  const conversionChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: true,
        text: "Tasa de Conversión por Vendedor",
        font: { size: 16 },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  // Datos para gráfico de leads
  const leadsChartData = {
    labels: data.salespeople.map((sp) => sp.nombre),
    datasets: [
      {
        label: "Ganados",
        data: data.salespeople.map((sp) => sp.wonLeads),
        backgroundColor: "rgba(34, 197, 94, 0.7)",
        borderColor: "rgba(34, 197, 94, 1)",
        borderWidth: 2,
      },
      {
        label: "Activos",
        data: data.salespeople.map((sp) => sp.activeLeads),
        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
      },
      {
        label: "Perdidos",
        data: data.salespeople.map((sp) => sp.lostLeads),
        backgroundColor: "rgba(239, 68, 68, 0.7)",
        borderColor: "rgba(239, 68, 68, 1)",
        borderWidth: 2,
      },
    ],
  };

  const leadsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Distribución de Leads por Vendedor",
        font: { size: 16 },
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
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-yellow-500 text-white">🥇 1er Lugar</Badge>;
    if (index === 1) return <Badge className="bg-gray-400 text-white">🥈 2do Lugar</Badge>;
    if (index === 2) return <Badge className="bg-orange-600 text-white">🥉 3er Lugar</Badge>;
    return <Badge variant="outline">{index + 1}º</Badge>;
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Comparativo de Vendedores</h1>
          <p className="text-muted-foreground mt-2">
            Métricas comparativas de rendimiento del equipo de ventas
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Período:</label>
          <Select value={months.toString()} onValueChange={(v) => setMonths(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último año</SelectItem>
              <SelectItem value="24">Últimos 2 años</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topPerformer.nombre}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {topPerformer.conversionRate}% conversión
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Conversión Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgConversion * 100) / 100}%</div>
            <p className="text-sm text-muted-foreground mt-1">Del equipo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4 text-green-500" />
              Total Leads
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-sm text-muted-foreground mt-1">Asignados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              Leads Ganados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalWon}</div>
            <p className="text-sm text-muted-foreground mt-1">
              {totalLeads > 0 ? Math.round((totalWon / totalLeads) * 100) : 0}% del total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Tasa de Conversión</CardTitle>
            <CardDescription>Comparativa de conversión por vendedor</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: "300px" }}>
              <Bar data={conversionChartData} options={conversionChartOptions} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Leads</CardTitle>
            <CardDescription>Ganados, activos y perdidos por vendedor</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: "300px" }}>
              <Bar data={leadsChartData} options={leadsChartOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla Comparativa */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Vendedores</CardTitle>
          <CardDescription>
            Tabla comparativa ordenada por tasa de conversión
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ranking</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Total Leads</TableHead>
                <TableHead className="text-right">Ganados</TableHead>
                <TableHead className="text-right">Activos</TableHead>
                <TableHead className="text-right">Perdidos</TableHead>
                <TableHead className="text-right">Conversión</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.salespeople.map((sp, index) => (
                <TableRow key={sp.salespersonId}>
                  <TableCell>{getRankBadge(index)}</TableCell>
                  <TableCell className="font-medium">{sp.nombre}</TableCell>
                  <TableCell className="text-muted-foreground">{sp.email}</TableCell>
                  <TableCell className="text-right">{sp.totalLeads}</TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-green-100 text-green-800">{sp.wonLeads}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-blue-100 text-blue-800">{sp.activeLeads}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-red-100 text-red-800">{sp.lostLeads}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span
                      className={`font-bold ${
                        sp.conversionRate >= avgConversion ? "text-green-600" : "text-gray-600"
                      }`}
                    >
                      {sp.conversionRate}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top Performers Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>🏆 Top 3 Performers</CardTitle>
          <CardDescription>
            Los vendedores con mejor rendimiento en los últimos {months} meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.salespeople.slice(0, 3).map((sp, index) => (
              <Card key={sp.salespersonId} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{sp.nombre}</CardTitle>
                    {index === 0 && <span className="text-2xl">🥇</span>}
                    {index === 1 && <span className="text-2xl">🥈</span>}
                    {index === 2 && <span className="text-2xl">🥉</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Conversión:</span>
                      <span className="font-bold text-green-600">{sp.conversionRate}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Leads Ganados:</span>
                      <span className="font-semibold">{sp.wonLeads}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Leads:</span>
                      <span className="font-semibold">{sp.totalLeads}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
