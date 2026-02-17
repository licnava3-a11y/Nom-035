import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, AlertCircle, FileText, Download } from "lucide-react";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Link } from "wouter";

export default function ComplianceDashboard() {
  const { data: stats, isLoading } = trpc.compliance.getComplianceStats.useQuery();
  const { data: pendingItems } = trpc.compliance.getPendingItems.useQuery();

  if (isLoading) {
    return (
      <div className="container py-8">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/prevention">Prevención de Riesgos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Cumplimiento</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const overallPercentage = stats?.overall.percentage || 0;
  const compliantCount = stats?.overall.compliant || 0;
  const totalCount = stats?.overall.total || 0;
  const pendingCount = totalCount - compliantCount;

  const getComplianceStatus = (percentage: number) => {
    if (percentage >= 90) return { label: "Excelente", color: "text-green-600", bgColor: "bg-green-100" };
    if (percentage >= 70) return { label: "Bueno", color: "text-blue-600", bgColor: "bg-blue-100" };
    if (percentage >= 50) return { label: "Regular", color: "text-yellow-600", bgColor: "bg-yellow-100" };
    return { label: "Crítico", color: "text-red-600", bgColor: "bg-red-100" };
  };

  const status = getComplianceStatus(overallPercentage);

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard de Cumplimiento NOM-035</h1>
            <p className="text-muted-foreground">
              Monitoreo del cumplimiento de requisitos normativos de prevención de riesgos psicosociales
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/compliance/checklist">
              <Button variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Ver Checklist
              </Button>
            </Link>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </div>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cumplimiento General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{overallPercentage.toFixed(1)}%</div>
                <div className={`text-sm font-medium mt-1 ${status.color}`}>{status.label}</div>
              </div>
              <div className={`h-16 w-16 rounded-full ${status.bgColor} flex items-center justify-center`}>
                {overallPercentage >= 70 ? (
                  <CheckCircle2 className={`h-8 w-8 ${status.color}`} />
                ) : (
                  <AlertCircle className={`h-8 w-8 ${status.color}`} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalCount}</div>
            <p className="text-sm text-muted-foreground mt-1">Requisitos normativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items Cumplidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{compliantCount}</div>
            <p className="text-sm text-muted-foreground mt-1">Verificados y cumplidos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{pendingCount}</div>
            <p className="text-sm text-muted-foreground mt-1">Por verificar</p>
          </CardContent>
        </Card>
      </div>

      {/* Cumplimiento por Sección */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Cumplimiento por Sección</CardTitle>
          <CardDescription>Progreso de verificación en cada sección de la NOM-035</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats?.sections.map((section) => (
              <div key={section.section} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">Sección {section.section}</span>
                    <span className="text-sm text-muted-foreground">{section.sectionName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {section.compliant}/{section.total}
                    </span>
                    <span className="text-sm font-medium w-12 text-right">{section.percentage.toFixed(0)}%</span>
                  </div>
                </div>
                <Progress value={section.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Items Pendientes */}
      {pendingItems && pendingItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Items Pendientes de Verificación</CardTitle>
            <CardDescription>Requisitos que aún no han sido marcados como cumplidos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50">
                  <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-muted-foreground">
                        Sección {item.section} - {item.itemCode}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{item.requirement}</p>
                    {item.evidence && (
                      <p className="text-sm text-muted-foreground mt-1">
                        <strong>Evidencia requerida:</strong> {item.evidence}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
