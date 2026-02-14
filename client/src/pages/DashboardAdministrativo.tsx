import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb } from "@/components/Breadcrumb";
import ProtectedButton from "@/components/ProtectedButton";
import { DollarSign, ShoppingCart, Receipt, TrendingUp } from "lucide-react";
import Chart from "chart.js/auto";

export default function DashboardAdministrativo() {
  const [periodo, setPeriodo] = useState<"mes" | "trimestre" | "áo">("mes");
  const [departamento, setDepartamento] = useState<string>("todos");
  const [categoria, setCategoria] = useState<string>("todos");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const barChartInstance = useRef<Chart | null>(null);

  // Funciones de exportación
  const exportToExcel = () => {
    // Preparar datos para Excel
    const data = [
      ["Dashboard Administrativo Financiero"],
      [""],
      ["KPIs Generales"],
      ["Métrica", "Cantidad", "Monto Total"],
      ["Facturas Registradas", totalInvoices, `$${totalInvoiceAmount.toFixed(2)}`],
      ["Órdenes de Compra", totalPurchaseOrders, `$${totalPurchaseAmount.toFixed(2)}`],
      ["Solicitudes de Gasto", totalExpenseRequests, `$${totalExpenseAmount.toFixed(2)}`],
      [""],
      ["Facturas Detalle"],
      ["Folio", "Proveedor", "Monto", "Fecha", "Estado"],
      ...filteredInvoices.map(inv => [inv.folio, inv.proveedor, inv.monto, inv.fecha, inv.estado]),
      [""],
      ["Órdenes de Compra Detalle"],
      ["Folio", "Proveedor", "Monto", "Fecha", "Estado"],
      ...filteredPurchaseOrders.map(po => [po.folio, po.proveedor, po.monto, po.fecha, po.estado]),
      [""],
      ["Solicitudes de Gasto Detalle"],
      ["Folio", "Concepto", "Monto", "Categoría", "Estado"],
      ...filteredExpenseRequests.map(exp => [exp.folio, exp.concepto, exp.monto, exp.categoria, exp.estado]),
    ];

    // Convertir a CSV
    const csv = data.map(row => row.join(",")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `dashboard-financiero-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    // Capturar gráfico como imagen
    const canvas = chartRef.current;
    if (!canvas) return;

    const chartImage = canvas.toDataURL("image/png");

    // Crear contenido HTML para PDF
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Dashboard Financiero</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #000; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .kpi { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          img { max-width: 100%; height: auto; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1>Dashboard Administrativo Financiero</h1>
        <p>Fecha: ${new Date().toLocaleDateString("es-MX")}</p>
        
        <h2>KPIs Generales</h2>
        <div class="kpi">
          <strong>Facturas Registradas:</strong> ${totalInvoices}<br>
          <strong>Total:</strong> $${totalInvoiceAmount.toFixed(2)}
        </div>
        <div class="kpi">
          <strong>Órdenes de Compra:</strong> ${totalPurchaseOrders}<br>
          <strong>Total:</strong> $${totalPurchaseAmount.toFixed(2)}
        </div>
        <div class="kpi">
          <strong>Solicitudes de Gasto:</strong> ${totalExpenseRequests}<br>
          <strong>Total:</strong> $${totalExpenseAmount.toFixed(2)}
        </div>
        
        <h2>Tendencias Financieras</h2>
        <img src="${chartImage}" alt="Gráfico de Tendencias" />
      </body>
      </html>
    `;

    // Abrir en nueva ventana para imprimir
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  // Queries
  const { data: invoices } = trpc.financial.getAllInvoices.useQuery();
  const { data: purchaseOrders } = trpc.financial.getAllPurchaseOrders.useQuery();
  const { data: expenseRequests } = trpc.financial.getAllExpenseRequests.useQuery();

  // Función de filtrado
  const filterData = (data: any[] | undefined, type: string) => {
    if (!data) return [];
    
    return data.filter((item) => {
      // Filtro por departamento
      if (departamento !== "todos" && item.departamento !== departamento) return false;
      
      // Filtro por categoría (solo para solicitudes de gasto)
      if (categoria !== "todos" && type === "expenses" && item.categoria !== categoria) return false;
      
      // Filtro por rango de fechas
      if (fechaInicio || fechaFin) {
        const itemDate = new Date(item.fecha || item.fechaSolicitud);
        if (fechaInicio && itemDate < new Date(fechaInicio)) return false;
        if (fechaFin && itemDate > new Date(fechaFin)) return false;
      }
      
      return true;
    });
  };

  // Aplicar filtros
  const filteredInvoices = filterData(invoices, "invoices");
  const filteredPurchaseOrders = filterData(purchaseOrders, "purchaseOrders");
  const filteredExpenseRequests = filterData(expenseRequests, "expenses");

  // Calcular KPIs con datos filtrados
  const totalInvoices = filteredInvoices.length;
  const totalPurchaseOrders = filteredPurchaseOrders.length;
  const totalExpenseRequests = filteredExpenseRequests.length;

  const totalInvoiceAmount = filteredInvoices.reduce((sum, inv) => sum + parseFloat(inv.monto), 0);
  const totalPurchaseAmount = filteredPurchaseOrders.reduce((sum, po) => sum + parseFloat(po.monto), 0);
  const totalExpenseAmount = filteredExpenseRequests.reduce((sum, exp) => sum + parseFloat(exp.monto), 0);

  // Preparar datos para gráfico de tendencias
  useEffect(() => {
    if (!chartRef.current || !filteredInvoices || !filteredPurchaseOrders || !filteredExpenseRequests) return;

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

    processData(filteredInvoices, "invoices");
    processData(filteredPurchaseOrders, "purchaseOrders");
    processData(filteredExpenseRequests, "expenseRequests");

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
  }, [filteredInvoices, filteredPurchaseOrders, filteredExpenseRequests, periodo]);

  // Preparar datos para bar chart comparativo por departamento
  useEffect(() => {
    if (!barChartRef.current || !filteredInvoices || !filteredPurchaseOrders || !filteredExpenseRequests) return;

    // Destruir gráfico anterior si existe
    if (barChartInstance.current) {
      barChartInstance.current.destroy();
    }

    // Agrupar datos por departamento
    const departmentData = new Map<string, { invoices: number; purchaseOrders: number; expenseRequests: number }>();

    const processByDepartment = (items: any[], key: string) => {
      items.forEach((item) => {
        const dept = item.departamento || "Sin departamento";
        
        if (!departmentData.has(dept)) {
          departmentData.set(dept, { invoices: 0, purchaseOrders: 0, expenseRequests: 0 });
        }
        
        const current = departmentData.get(dept)!;
        const amount = parseFloat(item.monto || 0);
        if (key === "invoices") current.invoices += amount;
        if (key === "purchaseOrders") current.purchaseOrders += amount;
        if (key === "expenseRequests") current.expenseRequests += amount;
      });
    };

    processByDepartment(filteredInvoices, "invoices");
    processByDepartment(filteredPurchaseOrders, "purchaseOrders");
    processByDepartment(filteredExpenseRequests, "expenseRequests");

    const departments = Array.from(departmentData.keys());
    const invoicesAmounts = departments.map((dept) => departmentData.get(dept)?.invoices || 0);
    const purchaseOrdersAmounts = departments.map((dept) => departmentData.get(dept)?.purchaseOrders || 0);
    const expenseRequestsAmounts = departments.map((dept) => departmentData.get(dept)?.expenseRequests || 0);

    // Crear bar chart con Chart.js
    const ctx = barChartRef.current.getContext("2d");
    if (!ctx) return;

    barChartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: departments,
        datasets: [
          {
            label: "Facturas",
            data: invoicesAmounts,
            backgroundColor: "#10b981", // Verde
            borderColor: "#10b981",
            borderWidth: 1,
          },
          {
            label: "Órdenes de Compra",
            data: purchaseOrdersAmounts,
            backgroundColor: "#1e3a8a", // Azul marino
            borderColor: "#1e3a8a",
            borderWidth: 1,
          },
          {
            label: "Solicitudes de Gasto",
            data: expenseRequestsAmounts,
            backgroundColor: "#dc2626", // Rojo
            borderColor: "#dc2626",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const index = elements[0].index;
            const clickedDepartment = departments[index];
            
            // Si ya está filtrado por este departamento, limpiar filtro
            if (departamento === clickedDepartment) {
              setDepartamento("todos");
            } else {
              setDepartamento(clickedDepartment);
            }
          }
        },
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
            text: "Comparativo de Montos por Departamento",
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
              callback: function(value) {
                return "$" + value.toLocaleString();
              },
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
              display: false,
            },
          },
        },
      },
    });

    return () => {
      if (barChartInstance.current) {
        barChartInstance.current.destroy();
      }
    };
  }, [filteredInvoices, filteredPurchaseOrders, filteredExpenseRequests, departamento]);

  return (
    <div className="container mx-auto py-6">
      <Breadcrumb
        items={[
          { label: "Administración", href: "/administrative" },
          { label: "Dashboard Financiero" },
        ]}
      />

      <div className="mb-6 mt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Administrativo Financiero</h1>
            <p className="text-muted-foreground mt-2">Resumen y tendencias de facturas, órdenes de compra y solicitudes de gasto</p>
          </div>
          <div className="flex gap-2">
            <ProtectedButton
              onClick={exportToExcel}
              requiredPermission="can_export"
              fallbackMessage="No tienes permisos para exportar datos"
              className="bg-green-600 hover:bg-green-700"
            >
              Exportar Excel
            </ProtectedButton>
            <ProtectedButton
              onClick={exportToPDF}
              requiredPermission="can_export"
              fallbackMessage="No tienes permisos para exportar datos"
              className="bg-red-600 hover:bg-red-700"
            >
              Exportar PDF
            </ProtectedButton>
          </div>
        </div>
        
        {/* Filtros Avanzados */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <label className="text-sm font-medium mb-2 block">Periodo</label>
            <Select value={periodo} onValueChange={(value: any) => setPeriodo(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Últimos 6 meses</SelectItem>
                <SelectItem value="trimestre">Último año</SelectItem>
                <SelectItem value="año">Últimos 2 años</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Departamento</label>
            <Select value={departamento} onValueChange={setDepartamento}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="Recursos Humanos">Recursos Humanos</SelectItem>
                <SelectItem value="Administración">Administración</SelectItem>
                <SelectItem value="Operaciones">Operaciones</SelectItem>
                <SelectItem value="Capacitación">Capacitación</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Categoría</label>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="materiales">Materiales</SelectItem>
                <SelectItem value="servicios">Servicios</SelectItem>
                <SelectItem value="capacitacion">Capacitación</SelectItem>
                <SelectItem value="viaje">Viaje</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Fecha Inicio</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">Fecha Fin</label>
            <input
              type="date"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
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

      {/* Gráfico Comparativo por Departamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            Comparativo por Departamento
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Haz clic en una barra para filtrar datos por departamento
            {departamento !== "todos" && (
              <span className="ml-2 inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium">
                Filtrado: {departamento}
              </span>
            )}
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-[350px]">
            <canvas ref={barChartRef} style={{ cursor: "pointer" }}></canvas>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
