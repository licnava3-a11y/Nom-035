import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FileText, Shield, AlertCircle, TrendingUp, Users } from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function Compliance() {
  const complianceModules = [
    {
      id: 1,
      title: "Verificación de Numerales",
      description: "Checklist de cumplimiento de los numerales de la NOM-035-STPS-2018",
      icon: CheckCircle2,
      color: "bg-green-500",
      route: "/numerals-verification",
      status: "100%",
      statusColor: "bg-green-100 text-green-800"
    },
    {
      id: 2,
      title: "Dashboard de Cumplimiento",
      description: "Panel de control con métricas y estadísticas de cumplimiento normativo",
      icon: TrendingUp,
      color: "bg-blue-500",
      route: "/compliance-dashboard",
      status: "Activo",
      statusColor: "bg-blue-100 text-blue-800"
    },
    {
      id: 3,
      title: "Checklist de Cumplimiento",
      description: "Lista de verificación detallada de requisitos normativos",
      icon: FileText,
      color: "bg-purple-500",
      route: "/compliance/checklist",
      status: "Disponible",
      statusColor: "bg-purple-100 text-purple-800"
    },
    {
      id: 4,
      title: "Alertas de Cumplimiento",
      description: "Notificaciones y alertas sobre requisitos pendientes o próximos a vencer",
      icon: AlertCircle,
      color: "bg-orange-500",
      route: "/security-alerts",
      status: "3 Alertas",
      statusColor: "bg-orange-100 text-orange-800"
    },
    {
      id: 5,
      title: "Comité de Seguridad",
      description: "Gestión del comité de seguridad y salud en el trabajo",
      icon: Users,
      color: "bg-indigo-500",
      route: "/committee",
      status: "Activo",
      statusColor: "bg-indigo-100 text-indigo-800"
    },
    {
      id: 6,
      title: "Documentación Normativa",
      description: "Actas, políticas y documentos requeridos por la normativa",
      icon: Shield,
      color: "bg-red-500",
      route: "/documents",
      status: "12 Docs",
      statusColor: "bg-red-100 text-red-800"
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Cumplimiento Normativo</h1>
          <p className="text-muted-foreground mt-2">
            Gestión integral del cumplimiento de la NOM-035-STPS-2018 y otras normativas laborales
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Cumplimiento Global</CardDescription>
              <CardTitle className="text-4xl">100%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Todos los numerales verificados
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Documentos Generados</CardDescription>
              <CardTitle className="text-4xl">12</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Actas y políticas activas
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Alertas Activas</CardDescription>
              <CardTitle className="text-4xl">3</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Requieren atención
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Cobertura Encuestas</CardDescription>
              <CardTitle className="text-4xl">100%</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Empleados evaluados
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {complianceModules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.id} href={module.route}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`${module.color} p-3 rounded-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <Badge className={module.statusColor}>{module.status}</Badge>
                    </div>
                    <CardTitle className="mt-4">{module.title}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" className="w-full">
                      Acceder
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>Enlaces directos a funcionalidades de cumplimiento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 md:grid-cols-2">
              <Link href="/reports/regulatory">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Generar Reporte Regulatorio
                </Button>
              </Link>
              <Link href="/document-audit">
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="mr-2 h-4 w-4" />
                  Auditoría de Documentos
                </Button>
              </Link>
              <Link href="/meeting-minutes">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Minutas de Comité
                </Button>
              </Link>
              <Link href="/early-warnings">
                <Button variant="outline" className="w-full justify-start">
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Alertas Tempranas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
