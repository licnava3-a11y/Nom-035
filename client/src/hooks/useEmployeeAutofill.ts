import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  toEmployeeAutofillData,
  toEmployeeAutofillOption,
  type EmployeeAutofillData,
  type EmployeeAutofillSource,
} from "@/lib/employeeAutofill";

export type { EmployeeAutofillData } from "@/lib/employeeAutofill";

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
    pageSize: 100,
  });

  const employees = useMemo(() => {
    const raw = (workersRaw as any)?.employees ?? workersRaw ?? [];
    return Array.isArray(raw) ? raw as EmployeeAutofillSource[] : [];
  }, [workersRaw]);

  const selectedEmployee = useMemo((): EmployeeAutofillData | null => {
    if (!selectedEmployeeId) return null;
    const emp = employees.find((e) => e.id === selectedEmployeeId);
    if (!emp) return null;
    return toEmployeeAutofillData(emp);
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
      const emp = employees.find((e) => e.id === id);
      if (emp) {
        const data = toEmployeeAutofillData(emp);
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
    () => employees.map(toEmployeeAutofillOption),
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
