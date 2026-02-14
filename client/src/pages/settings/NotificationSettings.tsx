import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Bell, Mail, Smartphone, RefreshCw, Save, CheckCircle2 } from "lucide-react";

export default function NotificationSettings() {
  const { data: preferences, isLoading, refetch } = trpc.notificationPreferences.getPreferences.useQuery();
  const updateMutation = trpc.notificationPreferences.updatePreferences.useMutation();
  const resetMutation = trpc.notificationPreferences.resetToDefaults.useMutation();

  const [formData, setFormData] = useState({
    alertsEnabled: true,
    remindersEnabled: true,
    reportsEnabled: true,
    surveysEnabled: true,
    casesEnabled: true,
    correctiveActionsEnabled: true,
    frequency: "immediate" as "immediate" | "daily" | "weekly",
    dailySummaryEnabled: false,
    dailySummaryTime: "09:00",
    emailEnabled: true,
    inAppEnabled: true,
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (preferences) {
      setFormData({
        alertsEnabled: preferences.alertsEnabled ?? true,
        remindersEnabled: preferences.remindersEnabled ?? true,
        reportsEnabled: preferences.reportsEnabled ?? true,
        surveysEnabled: preferences.surveysEnabled ?? true,
        casesEnabled: preferences.casesEnabled ?? true,
        correctiveActionsEnabled: preferences.correctiveActionsEnabled ?? true,
        frequency: (preferences.frequency as "immediate" | "daily" | "weekly") ?? "immediate",
        dailySummaryEnabled: preferences.dailySummaryEnabled ?? false,
        dailySummaryTime: preferences.dailySummaryTime ?? "09:00",
        emailEnabled: preferences.emailEnabled ?? true,
        inAppEnabled: preferences.inAppEnabled ?? true,
      });
    }
  }, [preferences]);

  const handleChange = (field: string, value: boolean | string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(formData);
      toast.success("Preferencias guardadas exitosamente");
      setHasChanges(false);
      refetch();
    } catch (error) {
      toast.error("Error al guardar preferencias");
      console.error(error);
    }
  };

  const handleReset = async () => {
    if (!confirm("¿Estás seguro de que deseas restaurar las preferencias predeterminadas?")) {
      return;
    }

    try {
      await resetMutation.mutateAsync();
      toast.success("Preferencias restauradas a valores predeterminados");
      setHasChanges(false);
      refetch();
    } catch (error) {
      toast.error("Error al restaurar preferencias");
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Configuración de Notificaciones</h1>
            <p className="text-muted-foreground mt-2">
              Personaliza qué notificaciones deseas recibir y con qué frecuencia
            </p>
          </div>
          {hasChanges && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
              <Bell className="h-4 w-4" />
              <span>Cambios sin guardar</span>
            </div>
          )}
        </div>

        {/* Notification Types */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Tipos de Notificaciones
            </CardTitle>
            <CardDescription>
              Selecciona qué tipos de notificaciones deseas recibir
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="alerts">Alertas de Sistema</Label>
                <p className="text-sm text-muted-foreground">
                  Notificaciones sobre alertas de seguridad, cobertura y performance
                </p>
              </div>
              <Switch
                id="alerts"
                checked={formData.alertsEnabled}
                onCheckedChange={(checked) => handleChange("alertsEnabled", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="reminders">Recordatorios</Label>
                <p className="text-sm text-muted-foreground">
                  Recordatorios de tareas pendientes, fechas límite y vencimientos
                </p>
              </div>
              <Switch
                id="reminders"
                checked={formData.remindersEnabled}
                onCheckedChange={(checked) => handleChange("remindersEnabled", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="reports">Reportes Automáticos</Label>
                <p className="text-sm text-muted-foreground">
                  Reportes semanales y mensuales de cumplimiento y estadísticas
                </p>
              </div>
              <Switch
                id="reports"
                checked={formData.reportsEnabled}
                onCheckedChange={(checked) => handleChange("reportsEnabled", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="surveys">Encuestas NOM-035</Label>
                <p className="text-sm text-muted-foreground">
                  Notificaciones sobre encuestas pendientes y resultados
                </p>
              </div>
              <Switch
                id="surveys"
                checked={formData.surveysEnabled}
                onCheckedChange={(checked) => handleChange("surveysEnabled", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="cases">Casos y Denuncias</Label>
                <p className="text-sm text-muted-foreground">
                  Actualizaciones sobre casos asignados y nuevas denuncias
                </p>
              </div>
              <Switch
                id="cases"
                checked={formData.casesEnabled}
                onCheckedChange={(checked) => handleChange("casesEnabled", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="correctiveActions">Acciones Correctivas</Label>
                <p className="text-sm text-muted-foreground">
                  Notificaciones sobre acciones correctivas asignadas y vencimientos
                </p>
              </div>
              <Switch
                id="correctiveActions"
                checked={formData.correctiveActionsEnabled}
                onCheckedChange={(checked) => handleChange("correctiveActionsEnabled", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Frequency Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Frecuencia de Notificaciones
            </CardTitle>
            <CardDescription>
              Configura con qué frecuencia deseas recibir notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="frequency">Frecuencia General</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => handleChange("frequency", value)}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="immediate">Inmediata (en tiempo real)</SelectItem>
                  <SelectItem value="daily">Diaria (resumen al final del día)</SelectItem>
                  <SelectItem value="weekly">Semanal (resumen semanal)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Las notificaciones urgentes siempre se envían inmediatamente
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="dailySummary">Resumen Diario por Correo</Label>
                <p className="text-sm text-muted-foreground">
                  Recibe un resumen diario de todas las notificaciones por correo electrónico
                </p>
              </div>
              <Switch
                id="dailySummary"
                checked={formData.dailySummaryEnabled}
                onCheckedChange={(checked) => handleChange("dailySummaryEnabled", checked)}
              />
            </div>

            {formData.dailySummaryEnabled && (
              <div className="space-y-2 pl-6 border-l-2 border-primary/20">
                <Label htmlFor="dailySummaryTime">Hora del Resumen Diario</Label>
                <Input
                  id="dailySummaryTime"
                  type="time"
                  value={formData.dailySummaryTime}
                  onChange={(e) => handleChange("dailySummaryTime", e.target.value)}
                  className="max-w-xs"
                />
                <p className="text-sm text-muted-foreground">
                  El resumen se enviará todos los días a esta hora
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Channel Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Canales de Notificación
            </CardTitle>
            <CardDescription>
              Elige cómo deseas recibir las notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex items-center gap-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibir notificaciones por correo electrónico
                  </p>
                </div>
              </div>
              <Switch
                id="email"
                checked={formData.emailEnabled}
                onCheckedChange={(checked) => handleChange("emailEnabled", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5 flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <Label htmlFor="inApp">Notificaciones en la Aplicación</Label>
                  <p className="text-sm text-muted-foreground">
                    Mostrar notificaciones dentro de la plataforma
                  </p>
                </div>
              </div>
              <Switch
                id="inApp"
                checked={formData.inAppEnabled}
                onCheckedChange={(checked) => handleChange("inAppEnabled", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetMutation.isPending}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Restaurar Predeterminados
          </Button>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateMutation.isPending}
            className="min-w-32"
          >
            {updateMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : hasChanges ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar Cambios
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Guardado
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
