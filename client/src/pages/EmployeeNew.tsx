import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ArrowLeft, Save, CheckCircle2, XCircle, HelpCircle } from "lucide-react";
import { useValidation } from "@/hooks/useValidation";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { validateRFC, validateNSS } from "../../../shared/validators";
import { DepartmentSelector } from "@/components/DepartmentSelector";
import { toast } from "sonner";

export default function EmployeeNew() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    curp: "",
    rfc: "",
    nss: "",
    cedulaProfesional: "",
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
          toast.success("Trabajador creado exitosamente", {
            description: "Las credenciales de acceso han sido enviadas por correo electrónico."
          });
        } catch (error: any) {
          toast.warning("Trabajador creado con advertencia", {
            description: `Hubo un error al enviar las credenciales: ${error.message}`
          });
        }
      } else {
        toast.success("Trabajador creado exitosamente", {
          description: "El trabajador ha sido registrado en el sistema."
        });
      }
      setLocation("/employees");
    },
    onError: (error: any) => {
      toast.error("Error al crear trabajador", {
        description: error.message || "No se pudo crear el trabajador. Por favor, verifica los datos e intenta nuevamente."
      });
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
              <div>
                <InputWithValidation
                  id="email"
                  label="Correo Empresarial"
                  type="email"
                  value={formData.email}
                  onValueChange={(value: any) => handleChange("email", value)}
                  placeholder="juan.perez@empresa.com"
                  validationRules={{ required: true, email: true }}
                  showValidationIcon={true}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Correo corporativo del empleado
                </p>
              </div>

              <div>
                <InputWithValidation
                  id="personalEmail"
                  label="Correo Personal"
                  type="email"
                  value={formData.personalEmail}
                  onValueChange={(value: any) => handleChange("personalEmail", value)}
                  placeholder="juan.perez@gmail.com"
                  validationRules={{ email: true }}
                  showValidationIcon={true}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Opcional - usado como respaldo para envío de credenciales
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputWithValidation
                id="phone"
                label="Teléfono"
                type="tel"
                value={formData.phone}
                onValueChange={(value: any) => handleChange("phone", value)}
                placeholder="+52 614 123 4567"
                validationRules={{ phone: true }}
                showValidationIcon={true}
              />

              <div>
                <div className="flex items-center gap-2 mb-2">
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
                <InputWithValidation
                  id="curp"
                  label="CURP"
                  value={formData.curp}
                  onValueChange={(value: any) => {
                    handleChange("curp", value.toUpperCase());
                    if (value.length === 18) handleCURPBlur();
                  }}
                  placeholder="PEGG850101HCHRRN09"
                  validationRules={{ curp: true }}
                  showValidationIcon={true}
                  maxLength={18}
                />
                {curpValidation?.valid && curpValidation.data && (
                  <div className="text-xs text-muted-foreground space-y-1 mt-2">
                    <p>• Fecha de nacimiento: {curpValidation.data.fechaNacimiento}</p>
                    <p>• Género: {curpValidation.data.genero}</p>
                    <p>• Estado: {curpValidation.data.estado}</p>
                    <p>• Edad: {curpValidation.data.edad} años</p>
                  </div>
                )}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <InputWithValidation
                  id="rfc"
                  label="RFC"
                  value={formData.rfc}
                  onValueChange={(v: string) => handleChange("rfc", v.toUpperCase())}
                  placeholder="Ej: PEGJ850101ABC"
                  maxLength={13}
                  validationRules={{
                    custom: (v) => {
                      if (!v) return { isValid: true, message: "", type: "idle" };
                      const r = validateRFC(v, 'fisica');
                      return r.valid
                        ? { isValid: true, message: "RFC válido", type: "success" }
                        : { isValid: false, message: r.error || "RFC inválido", type: "error" };
                    }
                  }}
                  showValidationIcon={true}
                />
                {formData.rfc && formData.rfc.length >= 12 && (() => {
                  const r = validateRFC(formData.rfc, 'fisica');
                  if (!r.valid) return null;
                  const rfc = formData.rfc.toUpperCase();
                  const year = rfc.substring(4, 6);
                  const month = rfc.substring(6, 8);
                  const day = rfc.substring(8, 10);
                  const yearFull = parseInt(year) > 30 ? `19${year}` : `20${year}`;
                  return (
                    <div className="mt-1 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800 space-y-0.5">
                      <p className="font-semibold">✓ RFC válido — Desglose:</p>
                      <p>Iniciales nombre: <span className="font-mono">{rfc.substring(0, 4)}</span></p>
                      <p>Fecha nacimiento: <span className="font-mono">{day}/{month}/{yearFull}</span></p>
                      <p>Homoclave: <span className="font-mono">{rfc.substring(10, 12)}</span> · Dígito verificador: <span className="font-mono">{rfc.charAt(12)}</span></p>
                    </div>
                  );
                })()}
                <p className="text-xs text-muted-foreground">Registro Federal de Contribuyentes (12-13 caracteres)</p>
              </div>
              <div className="space-y-2">
                <InputWithValidation
                  id="nss"
                  label="NSS — Número de Seguridad Social"
                  value={formData.nss}
                  onValueChange={(v: string) => handleChange("nss", v.replace(/\D/g, ''))}
                  placeholder="Ej: 12345678901"
                  maxLength={11}
                  validationRules={{
                    custom: (v) => {
                      if (!v) return { isValid: true, message: "", type: "idle" };
                      const r = validateNSS(v);
                      return r.valid
                        ? { isValid: true, message: "NSS válido", type: "success" }
                        : { isValid: false, message: r.error || "NSS inválido", type: "error" };
                    }
                  }}
                  showValidationIcon={true}
                />
                <p className="text-xs text-muted-foreground">Número IMSS de 11 dígitos</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cedulaProfesional">
                Cédula Profesional
                <span className="ml-1 text-xs text-muted-foreground font-normal">(para responsables técnicos / personal clínico)</span>
              </Label>
              <Input
                id="cedulaProfesional"
                value={formData.cedulaProfesional}
                onChange={(e) => handleChange("cedulaProfesional", e.target.value)}
                placeholder="Ej: 12345678"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Número de cédula emitido por la SEP / DGP. Se auto-rellena en documentos NOM-035 al seleccionar este empleado como responsable clínico.
              </p>
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
              <DepartmentSelector
                value={formData.department}
                onChange={(value: any) => {
                  handleChange("department", value);
                  // Clear position when department changes
                  handleChange("position", "");
                }}
                required
                label="Departamento"
                placeholder="Seleccionar departamento"
                showAddButton={true}
              />

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
                  {positions?.map((pos: any) => pos && (
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
          <LoadingButton 
            type="submit" 
            loading={createMutation.isPending}
            loadingText="Guardando trabajador..."
          >
            <Save className="mr-2 h-4 w-4" />
            Guardar Trabajador
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}
