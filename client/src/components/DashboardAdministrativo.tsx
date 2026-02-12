import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';
import { 
  DollarSign, 
  FileText, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Receipt,
  CreditCard,
  Plane,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

export default function DashboardAdministrativo() {
  const { data: stats, isLoading } = trpc.administrative.getFinancialStats.useQuery();
  const { data: pendingPayments } = trpc.administrative.getPendingPayments.useQuery();
  const { data: purchaseOrders } = trpc.administrative.getPurchaseOrders.useQuery({ status: 'borrador' });
  const { data: expenseRequests } = trpc.administrative.getExpenseRequests.useQuery({ status: 'pendiente' });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", label: string }> = {
      pending: { variant: "outline", label: "Pendiente" },
      approved: { variant: "default", label: "Aprobado" },
      paid: { variant: "secondary", label: "Pagado" },
      rejected: { variant: "destructive", label: "Rechazado" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Estadísticas Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes de Pago</CardTitle>
            <DollarSign className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats?.pendingPaymentsAmount || 0).toLocaleString('es-MX')}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingPaymentsCount || 0} facturas pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes de Compra</CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.purchaseOrdersCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingPOCount || 0} pendientes de confirmar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursos Pagados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.paidCoursesCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingDocsCount || 0} pendientes de documentación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes de Viáticos</CardTitle>
            <Plane className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.expenseRequestsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingExpensesCount || 0} por aprobar
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pagos Pendientes */}
      {pendingPayments && pendingPayments.length > 0 && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="h-5 w-5" />
              Pagos Pendientes - Acción Requerida
            </CardTitle>
            <CardDescription className="text-red-700">
              Facturas que requieren procesamiento de pago
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingPayments.slice(0, 5).map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between border-b border-red-200 pb-3 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-red-900">{payment.supplier}</p>
                    <p className="text-sm text-red-700">
                      Factura: {payment.invoiceNumber} • ${payment.amount.toLocaleString('es-MX')}
                    </p>
                    <p className="text-xs text-red-600">
                      Vencimiento: {new Date(payment.dueDate).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <Link href={`/administrative/payments/${payment.id}`}>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700">
                      Procesar Pago
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Órdenes de Compra */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Órdenes de Compra Pendientes
          </CardTitle>
          <CardDescription>
            Órdenes que requieren confirmación o seguimiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {purchaseOrders && purchaseOrders.length > 0 ? (
            <div className="space-y-4">
              {purchaseOrders.slice(0, 5).map((order: any) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">OC-{order.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {order.supplier} • ${order.amount.toLocaleString('es-MX')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Fecha: {new Date(order.orderDate).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(order.status)}
                    <Link href={`/administrative/purchase-orders/${order.id}`}>
                      <Button variant="ghost" size="sm">
                        Ver
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No hay órdenes de compra pendientes
            </p>
          )}
        </CardContent>
      </Card>

      {/* Solicitudes de Viáticos */}
      {expenseRequests && expenseRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plane className="h-5 w-5" />
              Solicitudes de Viáticos
            </CardTitle>
            <CardDescription>
              Solicitudes pendientes de aprobación
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expenseRequests.map((request: any) => (
                <div key={request.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{request.employeeName}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.purpose} • ${request.amount.toLocaleString('es-MX')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Viaje: {new Date(request.travelDate).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(request.status)}
                    <Link href={`/administrative/expenses/${request.id}`}>
                      <Button variant="ghost" size="sm">
                        Revisar
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cursos Pagados - Documentación Pendiente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cursos Pagados - Documentación Pendiente
          </CardTitle>
          <CardDescription>
            Cursos que requieren entrega de constancias y documentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats?.coursesWithPendingDocs && stats.coursesWithPendingDocs.length > 0 ? (
            <div className="space-y-4">
              {stats.coursesWithPendingDocs.map((course: any) => (
                <div key={course.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{course.courseName}</p>
                    <p className="text-sm text-muted-foreground">
                      Instructor: {course.instructorName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Completado: {new Date(course.completionDate).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <Link href={`/training/course/${course.id}/documents`}>
                    <Button variant="outline" size="sm">
                      Gestionar Docs
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              Todos los cursos tienen documentación completa
            </p>
          )}
        </CardContent>
      </Card>

      {/* Accesos Rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Accesos Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            <Link href="/administrative/payments">
              <Button variant="outline" className="w-full justify-start">
                <CreditCard className="h-4 w-4 mr-2" />
                Gestión de Pagos
              </Button>
            </Link>
            <Link href="/administrative/purchase-orders">
              <Button variant="outline" className="w-full justify-start">
                <Receipt className="h-4 w-4 mr-2" />
                Órdenes de Compra
              </Button>
            </Link>
            <Link href="/administrative/expenses">
              <Button variant="outline" className="w-full justify-start">
                <Plane className="h-4 w-4 mr-2" />
                Viáticos
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
