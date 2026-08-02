import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export interface EmployeeAutofillData {
  employeeId: number;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  employeeNumber: string;
  departmentId: number | null;
  departmentName: string;
  positionId: number | null;
  positionName: string;
  curp: string;
  rfc: string;
  nss: string;
  gender: string;
  hireDate: string;
}

/**
 * Hook para prellenado automático de formularios desde la tabla employees.
 *
 * Uso:
 * ```tsx
 * const { selectedEmployee, selectEmployee, clearSelection, employeeOptions } = useEmployeeAutofill();
 *
 * // Al seleccionar un empleado, obtener sus datos para prellenar el formulario:
 * const handleSelect = (id: string) => {
 *   const data = selectEmployee(id);
 *   if (data) {
 *     setForm(prev => ({
 *       ...prev,
 *       name: data.fullName,
 *       email: data.email,
 *       departmentId: data.departmentId?.toString() ?? "",
 *     }));
 *   }
 * };
 * ```
 */
export function useEmployeeAutofill() {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);

  const { data: workersRaw, isLoading } = trpc.employees.list.useQuery({
    isActive: true,
  });

  const employees = useMemo(() => {
    const raw = (workersRaw as any)?.employees ?? workersRaw ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [workersRaw]);

  const selectedEmployee = useMemo((): EmployeeAutofillData | null => {
    if (!selectedEmployeeId) return null;
    const emp = employees.find((e: any) => e.id === selectedEmployeeId);
    if (!emp) return null;
    return {
      employeeId: emp.id,
      fullName: `${emp.firstName} ${emp.lastName}`.trim(),
      firstName: emp.firstName ?? "",
      lastName: emp.lastName ?? "",
      email: emp.email ?? "",
      phone: emp.phone ?? "",
      employeeNumber: emp.employeeNumber ?? "",
      departmentId: emp.departmentId ?? null,
      departmentName: emp.department ?? emp.departmentName ?? "",
      positionId: emp.positionId ?? null,
      positionName: emp.position ?? emp.positionName ?? "",
      curp: emp.curp ?? "",
      rfc: emp.rfc ?? "",
      nss: emp.nss ?? "",
      gender: emp.gender ?? "",
      hireDate: emp.hireDate ?? "",
    };
  }, [selectedEmployeeId, employees]);

  /**
   * Selecciona un empleado por su ID (string) y devuelve sus datos para prellenar.
   * Muestra un toast de confirmación.
   */
  const selectEmployee = useCallback(
    (employeeId: string): EmployeeAutofillData | null => {
      if (!employeeId || employeeId === "manual") {
        setSelectedEmployeeId(null);
        return null;
      }
      const id = parseInt(employeeId, 10);
      if (isNaN(id)) {
        setSelectedEmployeeId(null);
        return null;
      }
      setSelectedEmployeeId(id);
      const emp = employees.find((e: any) => e.id === id);
      if (emp) {
        const data: EmployeeAutofillData = {
          employeeId: emp.id,
          fullName: `${emp.firstName} ${emp.lastName}`.trim(),
          firstName: emp.firstName ?? "",
          lastName: emp.lastName ?? "",
          email: emp.email ?? "",
          phone: emp.phone ?? "",
          employeeNumber: emp.employeeNumber ?? "",
          departmentId: emp.departmentId ?? null,
          departmentName: emp.department ?? emp.departmentName ?? "",
          positionId: emp.positionId ?? null,
          positionName: emp.position ?? emp.positionName ?? "",
          curp: emp.curp ?? "",
          rfc: emp.rfc ?? "",
          nss: emp.nss ?? "",
          gender: emp.gender ?? "",
          hireDate: emp.hireDate ?? "",
        };
        toast.success("Datos del empleado prellenados", {
          description: `${data.fullName} — ${data.departmentName || "Sin departamento"}`,
        });
        return data;
      }
      return null;
    },
    [employees]
  );

  const clearSelection = useCallback(() => {
    setSelectedEmployeeId(null);
  }, []);

  /** Lista de opciones para un <Select> */
  const employeeOptions = useMemo(
    () =>
      employees.map((emp: any) => ({
        value: emp.id.toString(),
        label: `${emp.firstName} ${emp.lastName} — ${emp.email ?? ""}`,
        sublabel: emp.department ?? "",
      })),
    [employees]
  );

  return {
    selectedEmployee,
    selectedEmployeeId,
    selectEmployee,
    clearSelection,
    employeeOptions,
    isLoading,
    employees,
  };
}
