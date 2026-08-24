import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { validateRFC, validateNSS } from "../../../shared/validators";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { DepartmentSelector } from "@/components/DepartmentSelector";
import { toast } from "sonner";

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
    rfc: "",
    nss: "",
    cedulaProfesional: "",
    educationLevel: "" as string,
    employeeNumber: "",
    department: "" as string | number,
    position: "" as string | number,
    hireDate: "",
    contractType: "permanent" as "permanent" | "temporary" | "contract",
    contract1ExpirationDate: "",
    contract2ExpirationDate: "",
    contract3ExpirationDate: "",
    branchId: null as number | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch employee data
  const { data: employee, isLoading } = trpc.employees.getById.useQuery(
    { id: employeeId },
    { enabled: employeeId > 0 }
  );

  // Fetch departments for dropdown
  const { data: departments } = trpc.employees.getDepartments.useQuery();

  // Fetch branches for dropdown
  const { data: branches } = trpc.branches.listAll.useQuery();

  // Fetch positions filtered by selected department
  const { data: positions } = trpc.employees.getPositionsByDepartment.useQuery(
    {
      department:
        typeof formData.department === "number" ? formData.department : 0,
    },
    {
      enabled:
        typeof formData.department === "number" && formData.department > 0,
    } // Only fetch when department is selected
  );

  // Update form when employee data loads
  useEffect(() => {
    if (employee) {
      setFormData({
        firstName: employee.firstName || "",
        lastName: employee.lastName || "",
        email: employee.email || "",
        phone: employee.phone || "",
        curp: employee.curp || "",
        rfc: (employee as any).rfc || "",
        nss: (employee as any).nss || "",
        cedulaProfesional: (employee as any).cedulaProfesional || "",
        educationLevel: (employee as any).educationLevel || "",
        employeeNumber: employee.employeeNumber || "",
        department: (employee as any).department || employee.departmentId || "",
        position: (employee as any).position || employee.positionId || "",
        hireDate: employee.hireDate
          ? new Date(employee.hireDate).toISOString().split("T")[0]
          : "",
        contractType: employee.contractType || "permanent",
        contract1ExpirationDate: (employee as any).contract1ExpirationDate
          ? new Date((employee as any).contract1ExpirationDate)
              .toISOString()
              .split("T")[0]
          : "",
        contract2ExpirationDate: (employee as any).contract2ExpirationDate
          ? new Date((employee as any).contract2ExpirationDate)
              .toISOString()
              .split("T")[0]
          : "",
        contract3ExpirationDate: (employee as any).contract3ExpirationDate
          ? new Date((employee as any).contract3ExpirationDate)
              .toISOString()
              .split("T")[0]
          : "",
        branchId: (employee as any).branchId ?? null,
      });
    }
  }, [employee]);

  const updateMutation = trpc.employees.update.useMutation({
    onSuccess: () => {
      toast.success("Trabajador actualizado exitosamente", {
        description: "Los cambios han sido guardados correctamente.",
      });
      setLocation("/employees");
    },
    onError: (error: any) => {
      toast.error("Error al actualizar trabajador", {
        description:
          error.message ||
          "No se pudo actualizar el trabajador. Por favor, verifica los datos e intenta nuevamente.",
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
      id: employeeId,
      ...formData,
      department:
        typeof formData.department === "number"
          ? formData.department
          : undefined,
      position:
        typeof formData.position === "number" ? formData.position : undefined,
      branchId: formData.branchId ?? undefined,
    };
    updateMutation.mutate(dataToSubmit as any);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-muted-foreground">
          Cargando datos del trabajador...
        </p>
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
            <CardDescription>Datos básicos del trabajador</CardDescription>
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
                  onChange={e => handleChange("firstName", e.target.value)}
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
                  onChange={e => handleChange("lastName", e.target.value)}
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
                onChange={e => handleChange("email", e.target.value)}
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
                  onChange={e => handleChange("phone", e.target.value)}
                  placeholder="+52 614 123 4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="curp">CURP</Label>
                <Input
                  id="curp"
                  value={formData.curp}
                  onChange={e =>
                    handleChange("curp", e.target.value.toUpperCase())
                  }
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <InputWithValidation
                  id="rfc"
                  label="RFC"
                  value={formData.rfc}
                  onValueChange={(v: string) =>
                    handleChange("rfc", v.toUpperCase())
                  }
                  placeholder="Ej: PEGJ850101ABC"
                  maxLength={13}
                  validationRules={{
                    custom: v => {
                      if (!v)
                        return { isValid: true, message: "", type: "idle" };
                      const r = validateRFC(v, "fisica");
                      return r.valid
                        ? {
                            isValid: true,
                            message: "RFC válido",
                            type: "success",
                          }
                        : {
                            isValid: false,
                            message: r.error || "RFC inválido",
                            type: "error",
                          };
                    },
                  }}
                  showValidationIcon={true}
                />
                <p className="text-xs text-muted-foreground">
                  Registro Federal de Contribuyentes (12-13 caracteres)
                </p>
              </div>
              <div className="space-y-2">
                <InputWithValidation
                  id="nss"
                  label="NSS — Número de Seguridad Social"
                  value={formData.nss}
                  onValueChange={(v: string) =>
                    handleChange("nss", v.replace(/\D/g, ""))
                  }
                  placeholder="Ej: 12345678901"
                  maxLength={11}
                  validationRules={{
                    custom: v => {
                      if (!v)
                        return { isValid: true, message: "", type: "idle" };
                      const r = validateNSS(v);
                      return r.valid
                        ? {
                            isValid: true,
                            message: "NSS válido",
                            type: "success",
                          }
                        : {
                            isValid: false,
                            message: r.error || "NSS inválido",
                            type: "error",
                          };
                    },
                  }}
                  showValidationIcon={true}
                />
                <p className="text-xs text-muted-foreground">
                  Número IMSS de 11 dígitos
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cedulaProfesional">
                Cédula Profesional
                <span className="ml-1 text-xs text-muted-foreground font-normal">
                  (para responsables técnicos / personal clínico)
                </span>
              </Label>
              <Input
                id="cedulaProfesional"
                value={formData.cedulaProfesional}
                onChange={e =>
                  handleChange("cedulaProfesional", e.target.value)
                }
                placeholder="Ej: 12345678"
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground">
                Número de cédula emitido por la SEP / DGP. Se auto-rellena en
                documentos NOM-035 al seleccionar este empleado como responsable
                clínico.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="educationLevel">Nivel de Estudios</Label>
              <Select
                value={formData.educationLevel || ""}
                onValueChange={val => handleChange("educationLevel", val)}
              >
                <SelectTrigger id="educationLevel">
                  <SelectValue placeholder="Seleccionar nivel..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primaria">Primaria</SelectItem>
                  <SelectItem value="secundaria">Secundaria</SelectItem>
                  <SelectItem value="preparatoria">
                    Preparatoria / Bachillerato
                  </SelectItem>
                  <SelectItem value="tecnico">
                    Técnico / Carrera Técnica
                  </SelectItem>
                  <SelectItem value="licenciatura">Licenciatura</SelectItem>
                  <SelectItem value="especialidad">Especialidad</SelectItem>
                  <SelectItem value="maestria">Maestría</SelectItem>
                  <SelectItem value="doctorado">Doctorado</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Último grado de estudios concluido.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Información Laboral</CardTitle>
            <CardDescription>Datos del puesto y contrato</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeNumber">Número de Empleado</Label>
                <Input
                  id="employeeNumber"
                  value={formData.employeeNumber}
                  onChange={e => handleChange("employeeNumber", e.target.value)}
                  placeholder="EMP-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hireDate">Fecha de Ingreso</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={formData.hireDate}
                  onChange={e => handleChange("hireDate", e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DepartmentSelector
                value={formData.department}
                onChange={value => {
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
                  onChange={e => {
                    const value = e.target.value
                      ? parseInt(e.target.value)
                      : "";
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
                  {positions?.map(
                    (pos: any) =>
                      pos && (
                        <option key={pos.id} value={pos.id}>
                          {pos.title}
                        </option>
                      )
                  )}
                </select>
                {formData.department && positions && positions.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay puestos registrados para este departamento
                  </p>
                )}
              </div>
            </div>

            {/* Selector de Sucursal */}
            <div className="space-y-2">
              <Label htmlFor="branchId">Sucursal</Label>
              <Select
                value={
                  formData.branchId !== null
                    ? String(formData.branchId)
                    : "none"
                }
                onValueChange={value =>
                  setFormData(prev => ({
                    ...prev,
                    branchId: value === "none" ? null : parseInt(value),
                  }))
                }
              >
                <SelectTrigger id="branchId">
                  <SelectValue placeholder="Sin sucursal asignada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin sucursal asignada</SelectItem>
                  {branches
                    ?.filter((b: any) => b.isActive)
                    .map((branch: any) => (
                      <SelectItem key={branch.id} value={String(branch.id)}>
                        {branch.name}
                        {branch.city ? ` — ${branch.city}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {!branches?.length && (
                <p className="text-xs text-muted-foreground">
                  No hay sucursales activas.{" "}
                  <a href="/branches" className="underline text-primary">
                    Agregar sucursales
                  </a>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractType">Tipo de Contrato</Label>
              <select
                id="contractType"
                value={formData.contractType}
                onChange={e =>
                  handleChange(
                    "contractType",
                    e.target.value as "permanent" | "temporary" | "contract"
                  )
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="permanent">Permanente</option>
                <option value="temporary">Temporal</option>
                <option value="contract">Por Contrato</option>
              </select>
            </div>

            {/* Fechas de vencimiento de contratos */}
            <div className="pt-2">
              <p className="text-sm font-medium mb-3 text-muted-foreground">
                Fechas de Vencimiento de Contratos
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract1ExpirationDate">
                    Contrato 1 — Vencimiento
                  </Label>
                  <Input
                    id="contract1ExpirationDate"
                    type="date"
                    value={formData.contract1ExpirationDate}
                    onChange={e =>
                      handleChange("contract1ExpirationDate", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract2ExpirationDate">
                    Contrato 2 — Vencimiento
                  </Label>
                  <Input
                    id="contract2ExpirationDate"
                    type="date"
                    value={formData.contract2ExpirationDate}
                    onChange={e =>
                      handleChange("contract2ExpirationDate", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contract3ExpirationDate">
                    Contrato 3 — Vencimiento
                  </Label>
                  <Input
                    id="contract3ExpirationDate"
                    type="date"
                    value={formData.contract3ExpirationDate}
                    onChange={e =>
                      handleChange("contract3ExpirationDate", e.target.value)
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Se enviará alerta automática a RH 7 días antes del vencimiento.
              </p>
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
          <LoadingButton
            type="submit"
            loading={updateMutation.isPending}
            loadingText="Guardando cambios..."
          >
            <Save className="mr-2 h-4 w-4" />
            Guardar Cambios
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}
