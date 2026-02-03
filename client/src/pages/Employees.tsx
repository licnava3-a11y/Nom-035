import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, User, Mail, Phone, Building, Briefcase, Calendar } from "lucide-react";
// Using alert for now instead of toast

export default function Employees() {
  const toast = (opts: { title: string; description: string; variant?: string }) => {
    alert(`${opts.title}\n${opts.description}`);
  };
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState<boolean | undefined>(true);

  // Fetch employees with filters
  const { data: employees, isLoading, refetch } = trpc.employees.list.useQuery({
    search: search || undefined,
    department: departmentFilter,
    isActive: statusFilter,
  });

  // Fetch departments for filter
  const { data: departments } = trpc.employees.getDepartments.useQuery();

  // Deactivate employee mutation
  const deactivateMutation = trpc.employees.deactivate.useMutation({
    onSuccess: () => {
      toast({
        title: "Empleado desactivado",
        description: "El empleado ha sido desactivado exitosamente",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo desactivar el empleado",
        // variant: "destructive",
      });
    },
  });

  // Reactivate employee mutation
  const reactivateMutation = trpc.employees.reactivate.useMutation({
    onSuccess: () => {
      toast({
        title: "Empleado reactivado",
        description: "El empleado ha sido reactivado exitosamente",
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo reactivar el empleado",
        // variant: "destructive",
      });
    },
  });

  const handleDeactivate = (id: number, name: string) => {
    if (window.confirm(`¿Está seguro de desactivar a ${name}?`)) {
      deactivateMutation.mutate({ id });
    }
  };

  const handleReactivate = (id: number, name: string) => {
    if (window.confirm(`¿Está seguro de reactivar a ${name}?`)) {
      reactivateMutation.mutate({ id });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Catálogo de Trabajadores</h1>
          <p className="text-muted-foreground mt-1">
            Gestiona la información de todos los empleados de la organización
          </p>
        </div>
        <Link href="/employees/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Trabajador
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Busca y filtra trabajadores</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, email o número..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={departmentFilter || "all"}
              onValueChange={(value) => setDepartmentFilter(value === "all" ? undefined : value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {departments?.map((dept) => dept && (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={statusFilter === undefined ? "all" : statusFilter ? "active" : "inactive"}
              onValueChange={(value) =>
                setStatusFilter(value === "all" ? undefined : value === "active")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activos</SelectItem>
                <SelectItem value="inactive">Inactivos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Employee List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Cargando trabajadores...</p>
        </div>
      ) : !employees || employees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No se encontraron trabajadores</h3>
            <p className="text-muted-foreground mb-4">
              {search || departmentFilter
                ? "Intenta ajustar los filtros de búsqueda"
                : "Comienza agregando el primer trabajador"}
            </p>
            {!search && !departmentFilter && (
              <Link href="/employees/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar Trabajador
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((employee) => (
            <Card key={employee.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {employee.firstName} {employee.lastName}
                      </CardTitle>
                      <CardDescription>{employee.position || "Sin puesto"}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={employee.isActive ? "default" : "secondary"}>
                    {employee.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {employee.email && (
                    <div className="flex items-center text-muted-foreground">
                      <Mail className="mr-2 h-4 w-4" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                  )}
                  {employee.phone && (
                    <div className="flex items-center text-muted-foreground">
                      <Phone className="mr-2 h-4 w-4" />
                      {employee.phone}
                    </div>
                  )}
                  {employee.department && (
                    <div className="flex items-center text-muted-foreground">
                      <Building className="mr-2 h-4 w-4" />
                      {employee.department}
                    </div>
                  )}
                  {employee.employeeNumber && (
                    <div className="flex items-center text-muted-foreground">
                      <Briefcase className="mr-2 h-4 w-4" />
                      No. {employee.employeeNumber}
                    </div>
                  )}
                  {employee.hireDate && (
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="mr-2 h-4 w-4" />
                      Ingreso: {new Date(employee.hireDate).toLocaleDateString("es-MX")}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 mt-4">
                  <Link href={`/employees/${employee.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Ver Perfil
                    </Button>
                  </Link>
                  <Link href={`/employees/${employee.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      Editar
                    </Button>
                  </Link>
                  {employee.isActive ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeactivate(employee.id, `${employee.firstName} ${employee.lastName}`)}
                      disabled={deactivateMutation.isPending}
                    >
                      Desactivar
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReactivate(employee.id, `${employee.firstName} ${employee.lastName}`)}
                      disabled={reactivateMutation.isPending}
                    >
                      Reactivar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
