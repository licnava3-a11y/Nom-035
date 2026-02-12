import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Mail, Phone, Shield, Plus, Edit, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Breadcrumb } from "@/components/Breadcrumb";
import ProtectedButton from "@/components/ProtectedButton";

export default function Committee() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: committeeMembers, isLoading } = trpc.committee.list.useQuery();

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
      <Breadcrumb items={[
        {
                label: "Prevención de Riesgos Psicosociales",
                href: "/"
        },
        {
                label: "Comité"
        }
]} />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Comité de Atención</h1>
            <p className="text-muted-foreground mt-2">Cargando...</p>
          </div>
        </div>
      </div>
    );
  }

  const activeMembers = committeeMembers?.filter((m) => m.isActive) || [];
  const coordinators = committeeMembers?.filter((m) => m.position?.toLowerCase().includes("coordinador")) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comité de Atención</h1>
          <p className="text-muted-foreground mt-2">
            Gestión de miembros del comité de atención de casos psicosociales
          </p>
        </div>
        <ProtectedButton
          requiredPermission="can_create"
          fallbackMessage="Solo los administradores pueden agregar miembros"
          hideIfNoPermission
          onClick={() => setLocation("/committee/new")}
        >
          <Plus className="h-4 w-4 mr-2" />
          Agregar Miembro
        </ProtectedButton>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miembros Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMembers.length}</div>
            <p className="text-xs text-muted-foreground">Total de miembros</p>
          </CardContent>
        </Card>



        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coordinadores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coordinators.length}</div>
            <p className="text-xs text-muted-foreground">Líderes del comité</p>
          </CardContent>
        </Card>


      </div>

      {/* Committee Members */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Miembros del Comité</h2>
        {committeeMembers && committeeMembers.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {committeeMembers.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(member.userName || "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{member.userName || "Sin nombre"}</CardTitle>
                        <Badge variant={member.isActive ? "default" : "secondary"}>
                          {member.isActive ? "Activo" : "Inactivo"}
                        </Badge>
                      </div>
                      <CardDescription>{member.position || "Sin posición asignada"}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{member.userEmail || "Sin email"}</span>
                    </div>
                    {member.responsibilities && (
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <Shield className="h-4 w-4 mt-0.5" />
                        <span className="text-xs">{member.responsibilities}</span>
                      </div>
                    )}

                  </div>
                  <div className="flex gap-2 pt-2">
                    <ProtectedButton
                      variant="outline"
                      size="sm"
                      requiredPermission="can_edit"
                      fallbackMessage="Solo los administradores pueden editar miembros"
                      hideIfNoPermission
                      onClick={() => setLocation(`/committee/edit/${member.id}`)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </ProtectedButton>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setLocation(`/committee/profile/${member.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Perfil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <p>No hay miembros del comité registrados.</p>
              <ProtectedButton
                className="mt-4"
                requiredPermission="can_create"
                fallbackMessage="Solo los administradores pueden agregar miembros"
                hideIfNoPermission
                onClick={() => setLocation("/committee/new")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Agregar Primer Miembro
              </ProtectedButton>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Funciones del Comité de Atención</CardTitle>
          <CardDescription>Responsabilidades según la NOM-035-STPS-2018</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Recibir, registrar y dar seguimiento a las quejas de los trabajadores sobre factores de riesgo psicosocial y violencia laboral</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Realizar entrevistas con las personas involucradas en los casos reportados</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Formular un plan de trabajo para la atención de los factores de riesgo psicosocial identificados</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Dar seguimiento a las acciones propuestas y evaluar su efectividad</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">•</span>
              <span>Mantener la confidencialidad de la información y garantizar la protección de los datos personales</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
