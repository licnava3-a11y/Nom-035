import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Breadcrumb } from "@/components/Breadcrumb";
import { toast } from "sonner";
import { Calendar, Mail, Send, Settings } from "lucide-react";

export default function AlertReportsConfig() {
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "disabled">("disabled");
  const [isLoading, setIsLoading] = useState(false);

  const utils = trpc.useUtils();

  // Query para obtener configuración actual
  const { data: currentSetting, isLoading: loadingSetting } = trpc.systemSettings.getSetting.useQuery({
    key: "alert_summary_frequency",
  });

  // Mutation para actualizar frecuencia
  const updateFrequencyMutation = trpc.systemSettings.updateAlertSummaryFrequency.useMutation({
    onSuccess: (data) => {
      toast.success(data.message || "Configuración actualizada exitosamente");
      utils.systemSettings.getSetting.invalidate();
    },
    onError: (error) => {
      toast.error(`Error al actualizar configuración: ${error.message}`);
    },
  });

  // Mutation para enviar resumen manual
  const sendManualSummaryMutation = trpc.alerts.sendSummary.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
      toast.error(`Error al enviar resumen: ${error.message}`);
    },
  });

  // Cargar configuración actual
  useEffect(() => {
    if (currentSetting?.settingValue) {
      setFrequency(currentSetting.settingValue as "weekly" | "monthly" | "disabled");
    }
  }, [currentSetting]);

  const handleSaveConfig = () => {
    setIsLoading(true);
    updateFrequencyMutation.mutate(
      { frequency },
      {
        onSettled: () => setIsLoading(false),
      }
    );
  };

  const handleSendManual = (freq: "weekly" | "monthly") => {
    sendManualSummaryMutation.mutate({ frequency: freq });
  };

  return (
    <div className="container py-6 space-y-6">
      <Breadcrumb
        items={[
          { label: "Administración", href: "/admin" },
          { label: "Configuración de Reportes de Alertas" },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración de Reportes de Alertas</h1>
        <p className="text-muted-foreground mt-2">
          Configura la frecuencia de envío automático de resúmenes de alertas para auditoría NOM-035
        </p>
      </div>

      {/* Configuración de Frecuencia */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" />
            <CardTitle>Frecuencia de Envío Automático</CardTitle>
          </div>
          <CardDescription>
            Selecciona la frecuencia con la que deseas recibir el resumen de alertas por correo electrónico
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <label className="text-sm font-medium">Frecuencia de Envío</label>
            <Select
              value={frequency}
              onValueChange={(v) => setFrequency(v as "weekly" | "monthly" | "disabled")}
              disabled={loadingSetting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="disabled">Deshabilitado</SelectItem>
                <SelectItem value="weekly">Semanal (Lunes 9:00 AM)</SelectItem>
                <SelectItem value="monthly">Mensual (Día 1 a las 9:00 AM)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-start gap-2">
              <Calendar className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Detalles del Resumen</p>
                <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                  <li>• Total de alertas generadas en el período</li>
                  <li>• Distribución por prioridad (Crítica, Advertencia, Informativa)</li>
                  <li>• Distribución por tipo (Casos Críticos, Cobertura Baja, Cumplimiento)</li>
                  <li>• Alertas activas vs resueltas</li>
                  <li>• Enlace directo al histórico completo</li>
                </ul>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSaveConfig}
            disabled={isLoading || loadingSetting}
            className="w-full sm:w-auto"
          >
            <Settings className="h-4 w-4 mr-2" />
            Guardar Configuración
          </Button>
        </CardContent>
      </Card>

      {/* Envío Manual */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Envío Manual de Resumen</CardTitle>
          </div>
          <CardDescription>
            Envía un resumen inmediato sin esperar al envío programado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-base">Resumen Semanal</CardTitle>
                <CardDescription>Últimos 7 días de alertas</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleSendManual("weekly")}
                  disabled={sendManualSummaryMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Resumen Semanal
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-base">Resumen Mensual</CardTitle>
                <CardDescription>Último mes de alertas</CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleSendManual("monthly")}
                  disabled={sendManualSummaryMutation.isPending}
                  variant="outline"
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Resumen Mensual
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Nota:</strong> El resumen se enviará al correo electrónico del administrador configurado en las variables de entorno del sistema.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
