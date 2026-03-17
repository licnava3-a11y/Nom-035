import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileText, Users, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { Link } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function Prevention() {
  const preventionModules = [
    {
      id: 1,
      title: "Identificación de Riesgos",
      description: "Aplicación de cuestionarios NOM-035 para identificar factores de riesgo psicosocial",
      icon: AlertTriangle,
      color: "bg-orange-500",
      route: "/surveys-admin-panel",
      status: "Activo"
    },
    {
      id: 2,
      title: "Análisis de Resultados",
      description: "Evaluación y análisis de riesgos psicosociales identificados",
      icon: TrendingUp,
      color: "bg-blue-500",
      route: "/trends-charts",
      status: "Activo"
    },
    {
      id: 3,
      title: "Comité de Seguridad",
      description: "Gestión del comité de seguridad y salud en el trabajo",
      icon: Users,
      color: "bg-green-500",
      route: "/committee",
      status: "Activo"
    },
    {
      id: 4,
      title: "Alertas Tempranas",
      description: "Sistema de detección y atención de casos prioritarios",
      icon: Shield,
      color: "bg-red-500",
      route: "/early-warnings",
      status: "Activo"
    },
    {
      id: 5,
      title: "Cumplimiento Normativo",
      description: "Verificación de cumplimiento de numerales NOM-035",
      icon: CheckCircle2,
      color: "bg-purple-500",
      route: "/compliance-dashboard",
      status: "Activo"
    },
    {
      id: 6,
      title: "Documentación",
      description: "Actas, minutas y documentos del comité de seguridad",
      icon: FileText,
      color: "bg-indigo-500",
      route: "/meeting-minutes",
      status: "Activo"
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Prevención de Riesgos Psicosociales</h1>
          <p className="text-muted-foreground mt-2">
            Gestión integral de la prevención y atención de factores de riesgo psicosocial según NOM-035-STPS-2018
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {preventionModules.map((module: any) => {
            const Icon = module.icon;
            return (
              <Link key={module.id} href={module.route}>
                <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className={`${module.color} p-3 rounded-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        {module.status}
                      </span>
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
            <CardTitle>Recursos y Herramientas</CardTitle>
            <CardDescription>Documentos y guías para la prevención de riesgos psicosociales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/resources">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Biblioteca de Recursos
                </Button>
              </Link>
              <Link href="/nom035-admin-panel">
                <Button variant="outline" className="w-full justify-start">
                  <Shield className="mr-2 h-4 w-4" />
                  Panel de Administración NOM-035
                </Button>
              </Link>
              <Link href="/reports/regulatory">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Reportes Regulatorios
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
