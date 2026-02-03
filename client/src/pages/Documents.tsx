import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Plus, Calendar, Users, ClipboardCheck } from "lucide-react";
import { Link } from "wouter";

export default function Documents() {
  const { user } = useAuth();

  const documentTypes = [
    {
      id: "acta-constitutiva",
      title: "Acta Constitutiva del Comité",
      description: "Documento de constitución formal del comité de atención",
      icon: FileText,
      route: "/documents/acta-constitutiva",
      color: "bg-blue-500/10 text-blue-500"
    },
    {
      id: "funciones-comite",
      title: "Funciones del Comité",
      description: "Descripción detallada de funciones y responsabilidades",
      icon: Users,
      route: "/documents/funciones-comite",
      color: "bg-green-500/10 text-green-500"
    },
    {
      id: "aceptacion-cargo",
      title: "Aceptación de Cargo",
      description: "Carta compromiso de aceptación de cargo",
      icon: FileText,
      route: "/documents/aceptacion-cargo",
      color: "bg-purple-500/10 text-purple-500"
    },
    {
      id: "acta-recorrido",
      title: "Acta de Recorrido NOM-019",
      description: "Inspección de seguridad e higiene",
      icon: Calendar,
      route: "/documents/acta-recorrido-nom019",
      color: "bg-orange-500/10 text-orange-500"
    },
    {
      id: "acta-final-resultados",
      title: "Acta Final de Resultados",
      description: "Resultados de evaluación y programa de atención NOM-035",
      icon: ClipboardCheck,
      route: "/documents/acta-final-resultados",
      color: "bg-red-500/10 text-red-500"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Documentos y Formatos</h1>
          <p className="text-muted-foreground mt-2">
            Gestión de formatos legales y documentación del comité
          </p>
        </div>
        <Link href="/documents/history">
          <Button>
            <FileText className="h-4 w-4 mr-2" />
            Ver Historial
          </Button>
        </Link>
      </div>

      {/* Document Types */}
      <div className="grid gap-4 md:grid-cols-2">
        {documentTypes.map((doc) => {
          const Icon = doc.icon;
          return (
            <Link key={doc.id} href={doc.route}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-lg ${doc.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <CardTitle>{doc.title}</CardTitle>
                      <CardDescription>{doc.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent Documents */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos Recientes</CardTitle>
          <CardDescription>Últimos documentos generados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            No hay documentos generados aún
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
