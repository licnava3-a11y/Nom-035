import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb } from "@/components/Breadcrumb";
import { DollarSign, ShoppingCart, Receipt, TrendingUp } from "lucide-react";
import Chart from "chart.js/auto";

export default function DashboardAdministrativo() {
  const [periodo, setPeriodo] = useState<"mes" | "trimestre" | "año">("mes");
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  // Queries
  const { data: invoices } = trpc.financial.getAllInvoices.useQuery();
  const { data: purchaseOrders } = trpc.financial.getAllPurchaseOrders.useQuery();
  const { data: expenseRequests } = trpc.financial.getAllExpenseRequests.useQuery();

  // Calcular KPIs
  const totalInvoices = invoices?.length || 0;
  const totalPurchaseOrders = purchaseOrders?.length || 0;
  const totalExpenseRequests = expenseRequests?.length || 0;

  const totalInvoiceAmount = invoices?.reduce((sum, inv) => sum + parseFloat(inv.monto), 0) || 0;
  const totalPurchaseAmount = purchaseOrders?.reduce((sum, po) => sum + parseFloat(po.monto), 0) || 0;
  const totalExpenseAmount = expenseRequests?.reduce((sum, exp) => sum + parseFloat(exp.monto), 0) || 0;

  // Preparar datos para gráfico de tendencias
  useEffect(() => {
    if (!chartRef.current || !invoices || !purchaseOrders || !expenseRequests) return;

    // Destruir gráfico anterior si existe
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    // Agrupar datos por mes
    const monthlyData = new Map<string, { invoices: number; purchaseOrders: number; expenseRequests: number }>();

    const processData = (items: any[], key: string) => {
      items.forEach((item) => {
        const date = new Date(item.fecha || item.fechaSolicitud);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        
        if (!monthlyData.has(monthKey)) {
          monthlyData.set(monthKey, { invoices: 0, purchaseOrders: 0, expenseRequests: 0 });
        }
        
        const current = monthlyData.get(monthKey)!;
        if (key === "invoices") current.invoices += 1;
        if (key === "purchaseOrders") current.purchaseOrders += 1;
        if (key === "expenseRequests") current.expenseRequests += 1;
      });
    };

    processData(invoices, "invoices");
    processData(purchaseOrders, "purchaseOrders");
    processData(expenseRequests, "expenseRequests");

    // Ordenar por fecha y obtener últimos N meses según periodo
    const sortedMonths = Array.from(monthlyData.keys()).sort();
    const monthsToShow = periodo === "mes" ? 6 : periodo === "trimestre" ? 12 : 24;
    const recentMonths = sortedMonths.slice(-monthsToShow);

    const labels = recentMonths.map((month) => {
      const [year, monthNum] = month.split("-");
      const date = new Date(parseInt(year), parseInt(monthNum) - 1);
      return date.toLocaleDateString("es-MX", { month: "short", year: "numeric" });
    });

    const invoicesData = recentMonths.map((month) => monthlyData.get(month)?.invoices || 0);
    const purchaseOrdersData = recentMonths.map((month) => monthlyData.get(month)?.purchaseOrders || 0);
    const expenseRequestsData = recentMonths.map((month) => monthlyData.get(month)?.expenseRequests || 0);

    // Crear gráfico con Chart.js
    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Facturas",
            data: invoicesData,
            borderColor: "#10b981", // Verde
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Órdenes de Compra",
            data: purchaseOrdersData,
            borderColor: "#1e3a8a", // Azul marino
            backgroundColor: "rgba(30, 58, 138, 0.1)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Solicitudes de Gasto",
            data: expenseRequestsData,
            borderColor: "#dc2626", // Rojo
            backgroundColor: "rgba(220, 38, 38, 0.1)",
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
            labels: {
              color: "#000000",
              font: {
                size: 12,
                weight: 500,
              },
            },
          },
          title: {
            display: true,
            text: "Tendencias Financieras Mensuales",
            color: "#000000",
            font: {
              size: 16,
              weight: "bold" as const,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: "#000000",
              stepSize: 1,
            },
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
          x: {
            ticks: {
              color: "#000000",
            },
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
          },
        },
      },
    });

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [invoices, purchaseOrders, expenseRequests, periodo]);

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb
        items={[
          { label: "Administración", href: "/administrative" },
          { label: "Dashboard Financiero" },
        ]}
      />

      <div className="flex justify-between items-center mb-6 mt-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Administrativo Financiero</h1>
          <p className="text-muted-foreground mt-2">Resumen y tendencias de facturas, órdenes de compra y solicitudes de gasto</p>
        </div>
        <Select value={periodo} onValueChange={(value: any) => setPeriodo(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mes">Últimos 6 meses</SelectItem>
            <SelectItem value="trimestre">Último año</SelectItem>
            <SelectItem value="año">Últimos 2 años</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Facturas Registradas</CardTitle>
            <Receipt className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: ${totalInvoiceAmount.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Órdenes de Compra</CardTitle>
            <ShoppingCart className="w-4 h-4 text-blue-900" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPurchaseOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: ${totalPurchaseAmount.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes de Gasto</CardTitle>
            <DollarSign className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenseRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: ${totalExpenseAmount.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Tendencias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Tendencias Financieras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <canvas ref={chartRef}></canvas>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
