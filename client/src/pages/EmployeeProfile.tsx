import { useLocation, useParams, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  FileText,
  Edit,
  UserX,
  UserCheck,
} from "lucide-react";

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const employeeId = parseInt(id || "0");

  const { data: employee, isLoading, refetch } = trpc.employees.getById.useQuery(
    { id: employeeId },
    { enabled: employeeId > 0 }
  );

  const deactivateMutation = trpc.employees.deactivate.useMutation({
    onSuccess: () => {
      alert("Empleado desactivado exitosamente");
      refetch();
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || "No se pudo desactivar el empleado"}`);
    },
  });

  const reactivateMutation = trpc.employees.reactivate.useMutation({
    onSuccess: () => {
      alert("Empleado reactivado exitosamente");
      refetch();
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || "No se pudo reactivar el empleado"}`);
    },
  });

  const handleDeactivate = () => {
    if (employee && window.confirm(`¿Está seguro de desactivar a ${employee.firstName} ${employee.lastName}?`)) {
      deactivateMutation.mutate({ id: employeeId });
    }
  };

  const handleReactivate = () => {
    if (employee && window.confirm(`¿Está seguro de reactivar a ${employee.firstName} ${employee.lastName}?`)) {
      reactivateMutation.mutate({ id: employeeId });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-muted-foreground">Cargando perfil del trabajador...</p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-destructive">Trabajador no encontrado</p>
        <div className="text-center mt-4">
          <Button onClick={() => setLocation("/employees")}>
            Volver a la lista
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/employees")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la lista
        </Button>
      </div>

      {/* Header Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-10 w-10 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <CardTitle className="text-3xl">
                    {employee.firstName} {employee.lastName}
                  </CardTitle>
                  <Badge variant={employee.isActive ? "default" : "secondary"}>
                    {employee.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <CardDescription className="text-lg mt-1">
                  {employee.position || "Sin puesto asignado"}
                </CardDescription>
                {employee.department && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {employee.department}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/employees/${employeeId}/edit`}>
                <Button variant="outline">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </Button>
              </Link>
              {employee.isActive ? (
                <Button
                  variant="destructive"
                  onClick={handleDeactivate}
                  disabled={deactivateMutation.isPending}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Desactivar
                </Button>
              ) : (
                <Button
                  variant="default"
                  onClick={handleReactivate}
                  disabled={reactivateMutation.isPending}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Reactivar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información de Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {employee.email && (
              <div className="flex items-start">
                <Mail className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Correo Electrónico</p>
                  <p className="text-sm text-muted-foreground">{employee.email}</p>
                </div>
              </div>
            )}
            {employee.phone && (
              <div className="flex items-start">
                <Phone className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Teléfono</p>
                  <p className="text-sm text-muted-foreground">{employee.phone}</p>
                </div>
              </div>
            )}
            {employee.curp && (
              <div className="flex items-start">
                <FileText className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">CURP</p>
                  <p className="text-sm text-muted-foreground font-mono">{employee.curp}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle>Información Laboral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {employee.employeeNumber && (
              <div className="flex items-start">
                <Briefcase className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Número de Empleado</p>
                  <p className="text-sm text-muted-foreground">{employee.employeeNumber}</p>
                </div>
              </div>
            )}
            {employee.department && (
              <div className="flex items-start">
                <Building className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Departamento</p>
                  <p className="text-sm text-muted-foreground">{employee.department}</p>
                </div>
              </div>
            )}
            {employee.hireDate && (
              <div className="flex items-start">
                <Calendar className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Fecha de Ingreso</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(employee.hireDate).toLocaleDateString("es-MX", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            )}
            {employee.contractType && (
              <div className="flex items-start">
                <FileText className="mr-3 h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Tipo de Contrato</p>
                  <p className="text-sm text-muted-foreground">
                    {employee.contractType === "permanent"
                      ? "Permanente"
                      : employee.contractType === "temporary"
                      ? "Temporal"
                      : "Por Contrato"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Información Adicional</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium mb-1">Fecha de Creación</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(employee.createdAt).toLocaleDateString("es-MX")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Última Actualización</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(employee.updatedAt).toLocaleDateString("es-MX")}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium mb-1">Estado</p>
                <Badge variant={employee.isActive ? "default" : "secondary"}>
                  {employee.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Future sections placeholder */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Secciones Adicionales</CardTitle>
          <CardDescription>
            Próximamente: Historial de capacitación, evaluaciones de desempeño, documentos del expediente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Esta sección se expandirá con información adicional del empleado como historial de cursos,
            evaluaciones, documentos del expediente digital, y más.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
