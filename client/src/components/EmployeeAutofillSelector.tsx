import { UserCheck } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useEmployeeAutofill,
  type EmployeeAutofillData,
} from "@/hooks/useEmployeeAutofill";

interface EmployeeAutofillSelectorProps {
  /** Callback cuando se selecciona un empleado */
  onSelect: (data: EmployeeAutofillData | null) => void;
  /** Valor actual del selector (employeeId como string) */
  value?: string;
  /** Etiqueta del campo */
  label?: string;
  /** Texto de ayuda */
  helperText?: string;
  /** Placeholder del selector */
  placeholder?: string;
  /** Clase CSS adicional */
  className?: string;
}

/**
 * Selector de empleado con prellenado automático.
 * Al seleccionar un empleado, llama a `onSelect` con sus datos completos
 * para que el componente padre pueda prellenar los campos del formulario.
 */
export function EmployeeAutofillSelector({
  onSelect,
  value,
  label = "Seleccionar Empleado (Prellenado Automático)",
  helperText = "Al seleccionar un empleado, se prellenarán automáticamente nombre, email, teléfono y departamento",
  placeholder = "Buscar empleado existente...",
  className,
}: EmployeeAutofillSelectorProps) {
  const { selectEmployee, employeeOptions, isLoading } = useEmployeeAutofill();

  const handleChange = (employeeId: string) => {
    if (employeeId === "manual" || !employeeId) {
      onSelect(null);
      return;
    }
    const data = selectEmployee(employeeId);
    onSelect(data);
  };

  return (
    <div className={className}>
      <Label>
        <div className="flex items-center gap-2 mb-1.5">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          {label}
        </div>
      </Label>
      <Select
        value={value ?? ""}
        onValueChange={handleChange}
        disabled={isLoading}
      >
        <SelectTrigger>
          <SelectValue
            placeholder={isLoading ? "Cargando empleados..." : placeholder}
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manual">— Captura manual —</SelectItem>
          {employeeOptions.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {helperText && (
        <p className="text-xs text-muted-foreground mt-1">{helperText}</p>
      )}
    </div>
  );
}
