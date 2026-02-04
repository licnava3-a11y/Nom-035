import { useState } from "react";
import { useLocation } from "wouter";
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

export default function EmployeeNew() {
  const [, setLocation] = useLocation();
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
    gender: "", // Nuevo campo para género extraído de CURP
    birthState: "", // Nuevo campo para estado de nacimiento extraído de CURP
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [curpValidation, setCurpValidation] = useState<{
    valid: boolean;
    message: string;
    data?: any;
  } | null>(null);

  // Fetch departments for dropdown
  const { data: departments } = trpc.employees.getDepartments.useQuery();
  
  // Fetch positions filtered by selected department
  const { data: positions } = trpc.employees.getPositionsByDepartment.useQuery(
    { department: formData.department },
    { enabled: !!formData.department } // Only fetch when department is selected
  );

  const createMutation = trpc.employees.create.useMutation({
    onSuccess: () => {
      alert("Trabajador creado exitosamente");
      setLocation("/employees");
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || "No se pudo crear el trabajador"}`);
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

    createMutation.mutate(formData);
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

  const utils = trpc.useUtils();

  // Validar CURP cuando el usuario termina de escribir
  const handleCURPBlur = async () => {
    if (!formData.curp || formData.curp.length !== 18) {
      setCurpValidation(null);
      return;
    }

    try {
      const result = await utils.employees.validateCURP.fetch({ curp: formData.curp });
      
      if (result.valid) {
        setCurpValidation({
          valid: true,
          message: "✓ CURP válida",
          data: result
        });
        
        // Autocompletar campos
        setFormData(prev => ({
          ...prev,
          hireDate: prev.hireDate || result.fechaNacimiento || "",
          gender: result.genero || "",
          birthState: result.estado || ""
        }));
      } else {
        setCurpValidation({
          valid: false,
          message: "✗ CURP inválida: " + (result.errors?.join(", ") || "Formato incorrecto")
        });
      }
    } catch (error) {
      setCurpValidation({
        valid: false,
        message: "Error al validar CURP"
      });
    }
  };

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
        <h1 className="text-3xl font-bold">Agregar Nuevo Trabajador</h1>
        <p className="text-muted-foreground mt-1">
          Complete la información del nuevo empleado
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
                  onBlur={handleCURPBlur}
                  placeholder="PEGG850101HCHRRN09"
                  maxLength={18}
                  className={errors.curp ? "border-destructive" : ""}
                />
                {errors.curp && (
                  <p className="text-sm text-destructive">{errors.curp}</p>
                )}
                {curpValidation && (
                  <p className={`text-sm ${
                    curpValidation.valid ? "text-green-600" : "text-destructive"
                  }`}>
                    {curpValidation.message}
                  </p>
                )}
                {curpValidation?.valid && curpValidation.data && (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Fecha de nacimiento: {curpValidation.data.fechaNacimiento}</p>
                    <p>• Género: {curpValidation.data.genero}</p>
                    <p>• Estado: {curpValidation.data.estado}</p>
                    <p>• Edad: {curpValidation.data.edad} años</p>
                  </div>
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
                <Select
                  value={formData.department}
                  onValueChange={(value) => {
                    handleChange("department", value);
                    // Clear position when department changes
                    handleChange("position", "");
                  }}
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Seleccionar departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((dept) => dept && (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Seleccione primero el departamento
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Puesto</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value) => handleChange("position", value)}
                  disabled={!formData.department}
                >
                  <SelectTrigger id="position">
                    <SelectValue placeholder={
                      formData.department 
                        ? "Seleccionar puesto" 
                        : "Seleccione departamento primero"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    {positions?.map((pos) => pos && (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formData.department && positions && positions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay puestos registrados para este departamento
                  </p>
                )}
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
          <Button type="submit" disabled={createMutation.isPending}>
            <Save className="mr-2 h-4 w-4" />
            {createMutation.isPending ? "Guardando..." : "Guardar Trabajador"}
          </Button>
        </div>
      </form>
    </div>
  );
}
