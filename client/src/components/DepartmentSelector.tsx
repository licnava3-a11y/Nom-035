import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";

interface DepartmentSelectorProps {
  value: string | number;
  onChange: (value: number | "") => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  label?: string;
  placeholder?: string;
  showAddButton?: boolean;
}

export function DepartmentSelector({
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  label = "Departamento",
  placeholder = "Seleccionar departamento",
  showAddButton = true,
}: DepartmentSelectorProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [newDepartmentDescription, setNewDepartmentDescription] = useState("");
  const [newDepartmentCode, setNewDepartmentCode] = useState("");

  // Obtener lista de departamentos activos
  const { data: departmentsData, isLoading } = trpc.departments.list.useQuery({
    page: 1,
    pageSize: 100,
    isActive: true,
  });

  // Filtrar departamentos inválidos
  const validDepartments = departmentsData?.data.filter((dept: any) =>
      dept.name !== "Comité NOM-035" &&
      dept.name !== "Sin departamento" &&
      dept.name !== "Sin Departamento"
  ) || [];

  const utils = trpc.useUtils();

  const createDepartmentMutation = trpc.departments.create.useMutation({
    onSuccess: async (newDept) => {
      // Invalidar cache y actualizar lista
      await utils.departments.list.invalidate();
      
      // Seleccionar el nuevo departamento automáticamente
      onChange(newDept.id);
      
      // Cerrar dialog y limpiar formulario
      setIsDialogOpen(false);
      setNewDepartmentName("");
      setNewDepartmentDescription("");
      setNewDepartmentCode("");
      
      alert(`Departamento "${(newDept as any).name ?? newDepartmentName}" creado exitosamente`);
    },
    onError: (error: any) => {
      alert(`Error al crear departamento: ${error.message}`);
    },
  });

  const handleCreateDepartment = () => {
    if (!newDepartmentName.trim()) {
      alert("El nombre del departamento es requerido");
      return;
    }

    // Generar código automático si no se proporciona
    const code = newDepartmentCode.trim() || 
      newDepartmentName.trim().substring(0, 3).toUpperCase() + Date.now().toString().slice(-4);

    createDepartmentMutation.mutate({
      name: newDepartmentName.trim(),
      description: newDepartmentDescription.trim() || undefined,
      code,
    });
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor="department">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
        {showAddButton && isAdmin && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsDialogOpen(true)}
            className="h-auto py-1 px-2 text-xs"
          >
            <Plus className="h-3 w-3 mr-1" />
            Agregar nuevo
          </Button>
        )}
      </div>

      <select
        id="department"
        value={value}
        onChange={(e) => {
          const newValue = e.target.value ? parseInt(e.target.value) : "";
          onChange(newValue);
        }}
        required={required}
        disabled={disabled || isLoading}
        className={`flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          error ? "border-destructive" : ""
        }`}
      >
        <option value="">{isLoading ? "Cargando..." : placeholder}</option>
        {validDepartments.map((dept: any) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {required && (
        <p className="text-xs text-muted-foreground">
          Campo obligatorio - seleccione un departamento válido
        </p>
      )}

      {/* Dialog para agregar nuevo departamento */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar Nuevo Departamento</DialogTitle>
            <DialogDescription>
              Complete la información del nuevo departamento. Los campos marcados con * son obligatorios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newDeptName">
                Nombre del Departamento <span className="text-destructive">*</span>
              </Label>
              <Input
                id="newDeptName"
                value={newDepartmentName}
                onChange={(e) => setNewDepartmentName(e.target.value)}
                placeholder="Ej: Recursos Humanos"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newDeptCode">Código (opcional)</Label>
              <Input
                id="newDeptCode"
                value={newDepartmentCode}
                onChange={(e) => setNewDepartmentCode(e.target.value)}
                placeholder="Ej: RH"
                maxLength={10}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newDeptDescription">Descripción (opcional)</Label>
              <Textarea
                id="newDeptDescription"
                value={newDepartmentDescription}
                onChange={(e) => setNewDepartmentDescription(e.target.value)}
                placeholder="Descripción del departamento..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false);
                setNewDepartmentName("");
                setNewDepartmentDescription("");
                setNewDepartmentCode("");
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateDepartment}
              disabled={createDepartmentMutation.isPending || !newDepartmentName.trim()}
            >
              {createDepartmentMutation.isPending ? "Creando..." : "Crear Departamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
