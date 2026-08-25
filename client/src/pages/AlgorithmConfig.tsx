import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  Loader2,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function AlgorithmConfig() {
  // Estado de los pesos
  const [rotationWeight, setRotationWeight] = useState(40);
  const [tenureWeight, setTenureWeight] = useState(30);
  const [managerWeight, setManagerWeight] = useState(20);
  const [teamSizeWeight, setTeamSizeWeight] = useState(10);

  // Query para obtener configuración actual
  const { data: config, isLoading: configLoading } =
    trpc.departments.getAlgorithmConfig.useQuery();

  // Mutation para actualizar configuración
  const updateConfig = trpc.departments.updateAlgorithmConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuración actualizada exitosamente");
    },
    onError: error => {
      toast.error(`Error al actualizar: ${error.message}`);
    },
  });

  // Cargar configuración actual
  useEffect(() => {
    if (config) {
      setRotationWeight(config.rotationWeight);
      setTenureWeight(config.tenureWeight);
      setManagerWeight(config.managerWeight);
      setTeamSizeWeight(config.teamSizeWeight);
    }
  }, [config]);

  // Calcular suma total
  const totalWeight =
    rotationWeight + tenureWeight + managerWeight + teamSizeWeight;
  const isValid = totalWeight === 100;

  // Handler para guardar configuración
  const handleSave = () => {
    if (!isValid) {
      toast.error("La suma de los pesos debe ser exactamente 100%");
      return;
    }

    updateConfig.mutate({
      rotationWeight,
      tenureWeight,
      managerWeight,
      teamSizeWeight,
    });
  };

  // Handler para restablecer valores por defecto
  const handleReset = () => {
    setRotationWeight(40);
    setTenureWeight(30);
    setManagerWeight(20);
    setTeamSizeWeight(10);
    toast.info("Valores restablecidos a configuración por defecto");
  };

  if (configLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">
            Configuración del Algoritmo Predictivo
          </h1>
          <p className="text-muted-foreground mt-2">
            Ajusta los pesos de los factores que determinan el score de riesgo
            de rotación
          </p>
        </div>

        <div className="grid gap-6">
          {/* Card de Configuración */}
          <Card>
            <CardHeader>
              <CardTitle>Pesos del Algoritmo</CardTitle>
              <CardDescription>
                Ajusta la importancia relativa de cada factor. La suma debe ser
                exactamente 100%.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Tasa de Rotación */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Tasa de Rotación
                  </label>
                  <span className="text-sm font-bold text-primary">
                    {rotationWeight}%
                  </span>
                </div>
                <Slider
                  value={[rotationWeight]}
                  onValueChange={value => setRotationWeight(value[0])}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Peso de las altas y bajas de empleados en los últimos 3 meses
                </p>
              </div>

              {/* Antigüedad Promedio */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Antigüedad Promedio
                  </label>
                  <span className="text-sm font-bold text-primary">
                    {tenureWeight}%
                  </span>
                </div>
                <Slider
                  value={[tenureWeight]}
                  onValueChange={value => setTenureWeight(value[0])}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Peso de la antigüedad promedio de los empleados del
                  departamento
                </p>
              </div>

              {/* Ausencia de Manager */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Ausencia de Manager
                  </label>
                  <span className="text-sm font-bold text-primary">
                    {managerWeight}%
                  </span>
                </div>
                <Slider
                  value={[managerWeight]}
                  onValueChange={value => setManagerWeight(value[0])}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Peso de la falta de un manager asignado al departamento
                </p>
              </div>

              {/* Tamaño del Equipo */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Tamaño del Equipo
                  </label>
                  <span className="text-sm font-bold text-primary">
                    {teamSizeWeight}%
                  </span>
                </div>
                <Slider
                  value={[teamSizeWeight]}
                  onValueChange={value => setTeamSizeWeight(value[0])}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Peso del número de empleados en el departamento
                </p>
              </div>

              {/* Indicador de Suma */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Suma Total:</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-lg font-bold ${isValid ? "text-green-600" : "text-red-600"}`}
                    >
                      {totalWeight}%
                    </span>
                    {isValid ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    )}
                  </div>
                </div>
                {!isValid && (
                  <p className="text-xs text-red-600 mt-2">
                    La suma debe ser exactamente 100%. Ajusta los valores.
                  </p>
                )}
              </div>

              {/* Botones de Acción */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={!isValid || updateConfig.isPending}
                  className="flex-1"
                >
                  {updateConfig.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Configuración
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleReset}
                  variant="outline"
                  disabled={updateConfig.isPending}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restablecer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card de Información */}
          <Card>
            <CardHeader>
              <CardTitle>¿Cómo funciona el algoritmo?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                El algoritmo predictivo calcula un score de riesgo (0-100) para
                cada departamento basándose en cuatro factores principales:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">
                    • Tasa de Rotación:
                  </span>
                  Mide las altas y bajas recientes. Mayor rotación = mayor
                  riesgo.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">
                    • Antigüedad Promedio:
                  </span>
                  Equipos con baja antigüedad tienen mayor probabilidad de
                  rotación.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">
                    • Ausencia de Manager:
                  </span>
                  Departamentos sin liderazgo claro tienen mayor riesgo de
                  deserción.
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-semibold text-foreground">
                    • Tamaño del Equipo:
                  </span>
                  Equipos muy pequeños o muy grandes pueden tener mayor
                  inestabilidad.
                </li>
              </ul>
              <div className="pt-4 border-t">
                <p className="text-sm font-medium">Niveles de Riesgo:</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>
                    •{" "}
                    <span className="text-green-600 font-medium">
                      Bajo (0-30):
                    </span>{" "}
                    Departamento estable
                  </li>
                  <li>
                    •{" "}
                    <span className="text-yellow-600 font-medium">
                      Medio (31-60):
                    </span>{" "}
                    Requiere monitoreo
                  </li>
                  <li>
                    •{" "}
                    <span className="text-red-600 font-medium">
                      Alto (61-100):
                    </span>{" "}
                    Acción inmediata requerida
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
