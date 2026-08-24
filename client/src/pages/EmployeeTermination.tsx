import { useLocation } from "wouter";
import { TerminationWizard } from "@/components/TerminationWizard";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";

export default function EmployeeTermination() {
  const [, navigate] = useLocation();

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/employees")}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Empleados
        </Button>
        <h1 className="text-3xl font-bold">Proceso de Baja de Empleado</h1>
        <p className="text-gray-600 mt-2">
          Completa el proceso guiado para dar de baja a un empleado del sistema.
        </p>
      </div>

      <TerminationWizard
        onComplete={() => navigate("/employees")}
        onCancel={() => navigate("/employees")}
      />
    </div>
  );
}
