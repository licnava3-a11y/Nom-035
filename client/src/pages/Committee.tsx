import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Mail, Phone, Shield, Plus } from "lucide-react";

export default function Committee() {
  const { user } = useAuth();

  // Datos de ejemplo - en producción vendrían de la API
  const committeeMembers = [
    {
      id: 1,
      name: "Dr. María González",
      email: "maria.gonzalez@empresa.com",
      phone: "+52 55 1234 5678",
      role: "Coordinador",
      specialization: "Psicología Organizacional",
      status: "active",
      casesHandled: 12,
    },
    {
      id: 2,
      name: "Lic. Carlos Ramírez",
      email: "carlos.ramirez@empresa.com",
      phone: "+52 55 8765 4321",
      role: "Miembro",
      specialization: "Recursos Humanos",
      status: "active",
      casesHandled: 8,
    },
    {
      id: 3,
      name: "Psic. Ana Martínez",
      email: "ana.martinez@empresa.com",
      phone: "+52 55 2468 1357",
      role: "Miembro",
      specialization: "Psicología Clínica",
      status: "active",
      casesHandled: 15,
    },
  ];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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
        {user?.role === "admin" && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Agregar Miembro
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Miembros Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{committeeMembers.filter((m) => m.status === "active").length}</div>
            <p className="text-xs text-muted-foreground">Total de miembros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casos Atendidos</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {committeeMembers.reduce((acc, m) => acc + m.casesHandled, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total acumulado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coordinadores</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {committeeMembers.filter((m) => m.role === "Coordinador").length}
            </div>
            <p className="text-xs text-muted-foreground">Líderes del comité</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(committeeMembers.reduce((acc, m) => acc + m.casesHandled, 0) / committeeMembers.length)}
            </div>
            <p className="text-xs text-muted-foreground">Casos por miembro</p>
          </CardContent>
        </Card>
      </div>

      {/* Committee Members */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Miembros del Comité</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {committeeMembers.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {getInitials(member.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{member.name}</CardTitle>
                      <Badge variant={member.role === "Coordinador" ? "default" : "secondary"}>
                        {member.role}
                      </Badge>
                    </div>
                    <CardDescription>{member.specialization}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <span>{member.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Shield className="h-4 w-4" />
                    <span>{member.casesHandled} casos atendidos</span>
                  </div>
                </div>
                {user?.role === "admin" && (
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      Editar
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      Ver Perfil
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
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
