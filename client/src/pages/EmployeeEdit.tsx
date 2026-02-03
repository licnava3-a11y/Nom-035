import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";

export default function EmployeeEdit() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const employeeId = parseInt(id || "0");

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    curp: "",
    employeeNumber: "",
    department: "",
    position: "",
    hireDate: "",
    contractType: "permanent" as "permanent" | "temporary" | "contract",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch employee data
  const { data: employee, isLoading } = trpc.employees.getById.useQuery(
    { id: employeeId },
    { enabled: employeeId > 0 }
  );

  // Fetch departments and positions for autocomplete
  const { data: departments } = trpc.employees.getDepartments.useQuery();
  const { data: positions } = trpc.employees.getPositions.useQuery();

  // Update form when employee data loads
  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || "",
        lastName: employee.lastName || "",
        email: employee.email || "",
        phone: employee.phone || "",
        curp: employee.curp || "",
        employeeNumber: employee.employeeNumber || "",
        department: employee.department || "",
        position: employee.position || "",
        hireDate: employee.hireDate ? new Date(employee.hireDate).toISOString().split("T")[0] : "",
        contractType: employee.contractType || "permanent",
      });
    }
  }, [employee]);

  const updateMutation = trpc.employees.update.useMutation({
    onSuccess: () => {
      alert("Trabajador actualizado exitosamente");
      setLocation("/employees");
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || "No se pudo actualizar el trabajador"}`);
    },
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "El nombre es requerido";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "El apellido es requerido";
    }

    if (!formData.email.trim()) {
      newErrors.email = "El correo electrónico es requerido";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "El correo electrónico no es válido";
    }

    if (formData.curp && formData.curp.length !== 18) {
      newErrors.curp = "El CURP debe tener 18 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    updateMutation.mutate({
      id: employeeId,
      ...formData,
    });
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-muted-foreground">Cargando datos del trabajador...</p>
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
    <div className="container mx-auto py-8 max-w-3xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => setLocation("/employees")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a la lista
        </Button>
        <h1 className="text-3xl font-bold">Editar Trabajador</h1>
        <p className="text-muted-foreground mt-1">
          Actualiza la información de {employee.firstName} {employee.lastName}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información Personal</CardTitle>
            <CardDescription>
              Datos básicos del trabajador
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">
                  Nombre(s) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  placeholder="Juan"
                  className={errors.firstName ? "border-destructive" : ""}
                />
                {errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">
                  Apellido(s) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  placeholder="Pérez García"
                  className={errors.lastName ? "border-destructive" : ""}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                Correo Electrónico <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="juan.perez@empresa.com"
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+52 614 123 4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="curp">CURP</Label>
                <Input
                  id="curp"
                  value={formData.curp}
                  onChange={(e) => handleChange("curp", e.target.value.toUpperCase())}
                  placeholder="PEGG850101HCHRRN09"
                  maxLength={18}
                  className={errors.curp ? "border-destructive" : ""}
                />
                {errors.curp && (
                  <p className="text-sm text-destructive">{errors.curp}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  18 caracteres alfanuméricos
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Información Laboral</CardTitle>
            <CardDescription>
              Datos del puesto y contrato
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeNumber">Número de Empleado</Label>
                <Input
                  id="employeeNumber"
                  value={formData.employeeNumber}
                  onChange={(e) => handleChange("employeeNumber", e.target.value)}
                  placeholder="EMP-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hireDate">Fecha de Ingreso</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => handleChange("hireDate", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => handleChange("department", e.target.value)}
                  placeholder="Recursos Humanos"
                  list="departments-list"
                />
                <datalist id="departments-list">
                  {departments?.map((dept) => dept && (
                    <option key={dept} value={dept} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Puesto</Label>
                <Input
                  id="position"
                  value={formData.position}
                  onChange={(e) => handleChange("position", e.target.value)}
                  placeholder="Gerente de Recursos Humanos"
                  list="positions-list"
                />
                <datalist id="positions-list">
                  {positions?.map((pos) => pos && (
                    <option key={pos} value={pos} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractType">Tipo de Contrato</Label>
              <Select
                value={formData.contractType}
                onValueChange={(value: "permanent" | "temporary" | "contract") =>
                  handleChange("contractType", value)
                }
              >
                <SelectTrigger id="contractType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanente</SelectItem>
                  <SelectItem value="temporary">Temporal</SelectItem>
                  <SelectItem value="contract">Por Contrato</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setLocation("/employees")}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={updateMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  );
}
