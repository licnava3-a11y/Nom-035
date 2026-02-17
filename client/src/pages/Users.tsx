import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Users as UsersIcon, Search, Plus, Shield, BookOpen, AlertCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function Users() {
  const { user } = useAuth();

  // En producción, estos datos vendrían de la API
  const users = [
    {
      id: 1,
      name: "Juan Pérez",
      email: "juan.perez@empresa.com",
      role: "student",
      coursesCompleted: 5,
      coursesInProgress: 2,
      lastActivity: "2026-02-01",
    },
    {
      id: 2,
      name: "María González",
      email: "maria.gonzalez@empresa.com",
      role: "instructor",
      coursesCompleted: 12,
      coursesInProgress: 0,
      lastActivity: "2026-02-02",
    },
    {
      id: 3,
      name: "Carlos Ramírez",
      email: "carlos.ramirez@empresa.com",
      role: "committee",
      coursesCompleted: 8,
      coursesInProgress: 1,
      lastActivity: "2026-02-01",
    },
    {
      id: 4,
      name: "Ana Martínez",
      email: "ana.martinez@empresa.com",
      role: "student",
      coursesCompleted: 3,
      coursesInProgress: 3,
      lastActivity: "2026-01-30",
    },
  ];

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">Administrador</Badge>;
      case "instructor":
        return <Badge variant="secondary">Instructor</Badge>;
      case "student":
        return <Badge variant="outline">Estudiante</Badge>;
      case "committee":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Comité</Badge>;
      default:
        return null;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="h-5 w-5 text-primary" />;
      case "instructor":
        return <BookOpen className="h-5 w-5 text-primary" />;
      case "student":
        return <UsersIcon className="h-5 w-5 text-primary" />;
      case "committee":
        return <AlertCircle className="h-5 w-5 text-primary" />;
      default:
        return <UsersIcon className="h-5 w-5 text-primary" />;
    }
  };

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
      <Breadcrumb items={[
        {
                label: "Administración",
                href: "/"
        },
        {
                label: "Usuarios"
        }
]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground mt-2">
            Administración de usuarios y roles del sistema
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Usuarios activos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "student").length}
            </div>
            <p className="text-xs text-muted-foreground">En capacitación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Instructores</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "instructor").length}
            </div>
            <p className="text-xs text-muted-foreground">Personal docente</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comité</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.role === "committee").length}
            </div>
            <p className="text-xs text-muted-foreground">Miembros activos</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o correo electrónico..."
            className="pl-10"
          />
        </div>
        <Button variant="outline">Filtros</Button>
      </div>

      {/* Users List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Usuarios Registrados</h2>
        <div className="grid gap-4">
          {users.map((userData) => (
            <Card key={userData.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {getInitials(userData.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{userData.name}</CardTitle>
                        {getRoleBadge(userData.role)}
                      </div>
                      <CardDescription>{userData.email}</CardDescription>
                    </div>
                  </div>
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {getRoleIcon(userData.role)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>{userData.coursesCompleted} completados</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>{userData.coursesInProgress} en progreso</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Última actividad: {new Date(userData.lastActivity).toLocaleDateString("es-MX")}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      Ver Perfil
                    </Button>
                    <Button variant="outline" size="sm">
                      Editar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
