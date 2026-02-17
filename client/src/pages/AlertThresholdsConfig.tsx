import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Settings, Save, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function AlertThresholdsConfig() {
  const toast = (opts: { title: string; description: string; variant?: string }) => {
    alert(`${opts.title}\n${opts.description}`);
  };

  const { data: thresholds, isLoading, refetch } = trpc.alertThresholds.getAll.useQuery();
  const updateMutation = trpc.alertThresholds.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Éxito",
        description: "Umbrales actualizados correctamente",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "No se pudieron actualizar los umbrales",
        variant: "destructive",
      });
    },
  });

  const [formData, setFormData] = useState({
    critical_cases: 50,
    low_coverage: 80,
    excellent_compliance: 95,
  });

  useEffect(() => {
    if (thresholds) {
      const data: any = {};
      thresholds.forEach((t) => {
        data[t.alertType] = t.threshold;
      });
      setFormData(data);
    }
  }, [thresholds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Actualizar cada umbral
    const updates = [
      updateMutation.mutateAsync({
        alertType: "critical_cases",
        threshold: formData.critical_cases,
        description: "Número de casos críticos abiertos que disparan alerta",
      }),
      updateMutation.mutateAsync({
        alertType: "low_coverage",
        threshold: formData.low_coverage,
        description: "Porcentaje mínimo de cobertura de encuestas (alerta si está por debajo)",
      }),
      updateMutation.mutateAsync({
        alertType: "excellent_compliance",
        threshold: formData.excellent_compliance,
        description: "Porcentaje de cumplimiento excelente para reconocimiento",
      }),
    ];

    Promise.all(updates).catch(console.error);
  };

  if (isLoading) {
    return (
      <div className="container py-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      <Breadcrumb
        items={[
          { label: "Administración", href: "/admin" },
          { label: "Configuración de Umbrales de Alertas" },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Configuración de Umbrales de Alertas
        </h1>
        <p className="text-muted-foreground mt-2">
          Define los valores que disparan alertas automáticas en el sistema NOM-035
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Umbrales Configurables</CardTitle>
          <CardDescription>
            Ajusta los valores numéricos que determinan cuándo se generan alertas automáticas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Casos Críticos */}
            <div className="space-y-2">
              <Label htmlFor="critical_cases" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                Casos Críticos Abiertos
              </Label>
              <Input
                id="critical_cases"
                type="number"
                min="1"
                value={formData.critical_cases}
                onChange={(e) =>
                  setFormData({ ...formData, critical_cases: parseInt(e.target.value) || 0 })
                }
                required
              />
              <p className="text-sm text-muted-foreground">
                Número de casos críticos abiertos que disparan una alerta (actualmente: {formData.critical_cases})
              </p>
            </div>

            {/* Cobertura Baja */}
            <div className="space-y-2">
              <Label htmlFor="low_coverage" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Cobertura Mínima de Encuestas (%)
              </Label>
              <Input
                id="low_coverage"
                type="number"
                min="1"
                max="100"
                value={formData.low_coverage}
                onChange={(e) =>
                  setFormData({ ...formData, low_coverage: parseInt(e.target.value) || 0 })
                }
                required
              />
              <p className="text-sm text-muted-foreground">
                Porcentaje mínimo de cobertura de encuestas (alerta si está por debajo de {formData.low_coverage}%)
              </p>
            </div>

            {/* Cumplimiento Excelente */}
            <div className="space-y-2">
              <Label htmlFor="excellent_compliance" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-green-500" />
                Cumplimiento Excelente (%)
              </Label>
              <Input
                id="excellent_compliance"
                type="number"
                min="1"
                max="100"
                value={formData.excellent_compliance}
                onChange={(e) =>
                  setFormData({ ...formData, excellent_compliance: parseInt(e.target.value) || 0 })
                }
                required
              />
              <p className="text-sm text-muted-foreground">
                Porcentaje de cumplimiento excelente para reconocimiento (actualmente: {formData.excellent_compliance}%)
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => refetch()}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {updateMutation.isPending ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800">⚠️ Nota Importante</CardTitle>
        </CardHeader>
        <CardContent className="text-yellow-700">
          <p>
            Los cambios en los umbrales afectarán las alertas generadas a partir de este momento.
            Las alertas históricas mantendrán los umbrales con los que fueron creadas.
          </p>
          <p className="mt-2">
            Los jobs automáticos utilizarán estos nuevos valores en su próxima ejecución.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
