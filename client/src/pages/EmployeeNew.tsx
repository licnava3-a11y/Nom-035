import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Save, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { useValidation } from "@/hooks/useValidation";

export default function EmployeeNew() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    curp: "",
    employeeNumber: "",
    department: "" as string | number,
    position: "" as string | number,
    hireDate: "",
    contractType: "permanent" as "permanent" | "temporary" | "contract",
    sexo: "", // Campo obligatorio para sexo (Masculino, Femenino, Otro)
    birthState: "", // Nuevo campo para estado de nacimiento extraído de CURP
    personalEmail: "", // Correo personal opcional
  });

  const [generateCredentials, setGenerateCredentials] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [curpValidation, setCurpValidation] = useState<{
    valid: boolean;
    message: string;
    data?: any;
  } | null>(null);

  // Hook de validaciones en tiempo real
  const { validations, validateCURPField, validateRFCField, validateNSSField } = useValidation();

  // Fetch departments for dropdown
  const { data: departments } = trpc.employees.getDepartments.useQuery();
  
  // Fetch positions filtered by selected department
  const { data: positions } = trpc.employees.getPositionsByDepartment.useQuery(
    { department: typeof formData.department === 'number' ? formData.department : 0 },
    { enabled: typeof formData.department === 'number' && formData.department > 0 } // Only fetch when department is selected
  );

  const generateCredentialsMutation = trpc.hiring.createEmployeeAccount.useMutation();

  const createMutation = trpc.employees.create.useMutation({
    onSuccess: async (data) => {
      // Si se seleccionó generar credenciales, llamar al procedimiento
      if (generateCredentials && data?.employeeId) {
        try {
          await generateCredentialsMutation.mutateAsync({
            employeeId: data.employeeId,
            role: "student",
            sendToPersonalEmail: !formData.email && !!formData.personalEmail,
          });
          alert("Trabajador creado exitosamente. Las credenciales de acceso han sido enviadas por correo electrónico.");
        } catch (error: any) {
          alert(`Trabajador creado, pero hubo un error al enviar las credenciales: ${error.message}`);
        }
      } else {
        alert("Trabajador creado exitosamente");
      }
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

    if (!formData.sexo) {
      newErrors.sexo = "El sexo es requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Convert department and position to number before submitting
    const dataToSubmit = {
      ...formData,
      department: typeof formData.department === 'number' ? formData.department : undefined,
      position: typeof formData.position === 'number' ? formData.position : undefined,
    };
    createMutation.mutate(dataToSubmit as any);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Validaciones en tiempo real
    if (field === 'curp' && typeof value === 'string' && value.length === 18) {
      validateCURPField(value);
    }
    
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
          sexo: result.genero || "",
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
                  required
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
                  required
                  placeholder="Pérez García"
                  className={errors.lastName ? "border-destructive" : ""}
                />
                {errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">
                  Correo Empresarial <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  required
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="juan.perez@empresa.com"
                  className={errors.email ? "border-destructive" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Correo corporativo del empleado
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="personalEmail">Correo Personal</Label>
                <Input
                  id="personalEmail"
                  type="email"
                  value={formData.personalEmail}
                  onChange={(e) => handleChange("personalEmail", e.target.value)}
                  placeholder="juan.perez@gmail.com"
                />
                <p className="text-xs text-muted-foreground">
                  Opcional - usado como respaldo para envío de credenciales
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  required
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="+52 614 123 4567"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="curp">CURP</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold mb-1">Clave Única de Registro de Población</p>
                        <p className="text-xs">Formato: 18 caracteres alfanuméricos</p>
                        <p className="text-xs mt-1">Ejemplo: PEGG850101HCHRRN09</p>
                        <p className="text-xs mt-1">El sistema valida automáticamente el formato y extrae fecha de nacimiento, género y estado.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="relative">
                  <Input
                    id="curp"
                    value={formData.curp}
                    onChange={(e) => handleChange("curp", e.target.value.toUpperCase())}
                    required
                    minLength={18}
                    maxLength={18}
                    onBlur={handleCURPBlur}
                    placeholder="PEGG850101HCHRRN09"
                    className={`pr-10 ${
                      errors.curp || (validations.curp && !validations.curp.valid)
                        ? "border-destructive"
                        : validations.curp?.valid
                        ? "border-green-500"
                        : ""
                    }`}
                  />
                  {validations.curp && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {validations.curp.valid ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                    </div>
                  )}
                </div>
                {errors.curp && (
                  <p className="text-sm text-destructive">{errors.curp}</p>
                )}
                {validations.curp && !validations.curp.valid && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    CURP inválida
                  </p>
                )}
                {validations.curp?.valid && (
                  <p className="text-sm text-green-600 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" />
                    CURP válida
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

              <div className="space-y-2">
                <Label htmlFor="sexo">Sexo *</Label>
                <select
                  id="sexo"
                  value={formData.sexo}
                  onChange={(e) => handleChange("sexo", e.target.value)}
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Seleccionar sexo</option>
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
                {errors.sexo && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <XCircle className="h-4 w-4" />
                    {errors.sexo}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Campo obligatorio
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
                  required
                  placeholder="EMP-001"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="hireDate">Fecha de Ingreso</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="font-semibold mb-1">Fecha de Contratación</p>
                        <p className="text-xs">Fecha en que el empleado inició su relación laboral con la empresa.</p>
                        <p className="text-xs mt-1">Esta fecha se usa para calcular antigüedad, prestaciones y periodos de evaluación.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Input
                  id="hireDate"
                  type="date"
                  value={formData.hireDate}
                  required
                  onChange={(e) => handleChange("hireDate", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <select
                  id="department"
                  value={formData.department}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : "";
                    handleChange("department", value);
                    // Clear position when department changes
                    handleChange("position", "");
                  }}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Seleccionar departamento</option>
                  {departments?.map((dept) => dept && (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Seleccione primero el departamento
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position">Puesto</Label>
                <select
                  id="position"
                  value={formData.position}
                  onChange={(e) => {
                    const value = e.target.value ? parseInt(e.target.value) : "";
                    handleChange("position", value);
                  }}
                  disabled={!formData.department}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {formData.department 
                      ? "Seleccionar puesto" 
                      : "Seleccione departamento primero"}
                  </option>
                  {positions?.map((pos) => pos && (
                    <option key={pos.id} value={pos.id}>
                      {pos.title}
                    </option>
                  ))}
                </select>
                {formData.department && positions && positions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay puestos registrados para este departamento
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractType">Tipo de Contrato</Label>
              <select
                id="contractType"
                value={formData.contractType}
                onChange={(e) => handleChange("contractType", e.target.value as "permanent" | "temporary" | "contract")}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="permanent">Permanente</option>
                <option value="temporary">Temporal</option>
                <option value="contract">Por Contrato</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Generación Automática de Credenciales</CardTitle>
            <CardDescription>
              Configuración de acceso al sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="generateCredentials"
                checked={generateCredentials}
                onChange={(e) => setGenerateCredentials(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="generateCredentials" className="cursor-pointer">
                Generar usuario y contraseña automáticamente y enviar por correo
              </Label>
            </div>
            {generateCredentials && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-sm">
                <p className="font-medium text-blue-900 mb-2">ℹ️ Información importante:
                </p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Se generará un usuario y contraseña aleatorios</li>
                  <li>Las credenciales se enviarán al correo empresarial</li>
                  <li>Si no hay correo empresarial, se enviarán al correo personal</li>
                  <li>El empleado recibirá instrucciones para acceder al sistema</li>
                </ul>
              </div>
            )}
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
