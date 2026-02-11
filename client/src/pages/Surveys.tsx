import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, TrendingUp, Users, ArrowRight } from "lucide-react";
import { Link, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";

export default function Surveys() {
  const [, setLocation] = useLocation();

  const surveyCategories = [
    {
      id: 1,
      title: "Encuestas NOM-035",
      description: "Cuestionarios de identificación y análisis de factores de riesgo psicosocial",
      icon: FileText,
      color: "bg-blue-500",
      count: 3,
      route: "/surveys-admin-panel"
    },
    {
      id: 2,
      title: "Clima Organizacional",
      description: "Evaluación del ambiente laboral y satisfacción de los empleados",
      icon: TrendingUp,
      color: "bg-green-500",
      count: 2,
      route: "/surveys/dashboard"
    },
    {
      id: 3,
      title: "Evaluación de Desempeño",
      description: "Encuestas de evaluación de competencias y desempeño laboral",
      icon: Users,
      color: "bg-purple-500",
      count: 5,
      route: "/competencies-dashboard"
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Encuestas y Evaluaciones</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona y aplica encuestas de clima laboral, riesgos psicosociales y evaluaciones de desempeño
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {surveyCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Card 
                key={category.id}
                className="hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setLocation(category.route)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`${category.color} p-3 rounded-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <Badge variant="secondary">{category.count} disponibles</Badge>
                  </div>
                  <CardTitle className="mt-4">{category.title}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between group">
                    Ver encuestas
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acceso Rápido</CardTitle>
            <CardDescription>Enlaces directos a funcionalidades de encuestas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <Link href="/surveys-admin-panel">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
                  Panel de Administración NOM-035
                </Button>
              </Link>
              <Link href="/survey-send">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  Enviar Encuestas
                </Button>
              </Link>
              <Link href="/trends-charts">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Análisis de Tendencias
                </Button>
              </Link>
              <Link href="/early-warnings">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="mr-2 h-4 w-4" />
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
