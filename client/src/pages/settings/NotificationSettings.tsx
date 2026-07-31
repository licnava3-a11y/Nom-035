import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Bell, Clock, CalendarDays, RefreshCw, Save, CheckCircle2 } from "lucide-react";

export default function NotificationSettings() {
  const { data: preferences, isLoading, refetch } = trpc.notificationPreferences.getPreferences.useQuery();
  const updateMutation = trpc.notificationPreferences.updatePreferences.useMutation();

  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [dailyEmailEnabled, setDailyEmailEnabled] = useState(false);
  const [dailyEmailHour, setDailyEmailHour] = useState("8");
  const [weeklyEmailEnabled, setWeeklyEmailEnabled] = useState(false);
  const [weeklyEmailDay, setWeeklyEmailDay] = useState("1");
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (preferences) {
      setRealtimeEnabled(preferences.realtimeEnabled ?? true);
      setDailyEmailEnabled(preferences.dailyEmailEnabled ?? false);
      setDailyEmailHour(String(preferences.dailyEmailHour ?? 8));
      setWeeklyEmailEnabled(preferences.weeklyEmailEnabled ?? false);
      setWeeklyEmailDay(String(preferences.weeklyEmailDay ?? 1));
    }
  }, [preferences]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        realtimeEnabled,
        dailyEmailEnabled,
        dailyEmailHour: parseInt(dailyEmailHour),
        weeklyEmailEnabled,
        weeklyEmailDay: parseInt(weeklyEmailDay),
      });
      toast.success("Preferencias guardadas exitosamente");
      setHasChanges(false);
      refetch();
    } catch (error) {
      toast.error("Error al guardar preferencias");
      console.error(error);
    }
  };

  const handleReset = () => {
    setRealtimeEnabled(true);
    setDailyEmailEnabled(false);
    setDailyEmailHour("8");
    setWeeklyEmailEnabled(false);
    setWeeklyEmailDay("1");
    setHasChanges(true);
  };

  const hourOptions = Array.from({ length: 24 }, (_, i) => ({
    value: String(i),
    label: `${String(i).padStart(2, "0")}:00 hrs`,
  }));

  const dayOptions = [
    { value: "1", label: "Lunes" },
    { value: "2", label: "Martes" },
    { value: "3", label: "Miércoles" },
    { value: "4", label: "Jueves" },
    { value: "5", label: "Viernes" },
    { value: "6", label: "Sábado" },
    { value: "7", label: "Domingo" },
  ];

  if (isLoading) {
    return <div className="text-sm text-muted-foreground p-4">Cargando preferencias...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configuración de Notificaciones</h2>
          <p className="text-muted-foreground mt-1">
            Configura cómo y cuándo deseas recibir notificaciones del sistema NOM-035
          </p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-md">
            <Bell className="h-4 w-4" />
            <span>Cambios sin guardar</span>
          </div>
        )}
      </div>

      {/* Tiempo real */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4 text-blue-500" />
            Notificaciones en Tiempo Real
          </CardTitle>
          <CardDescription>
            Alertas instantáneas dentro de la plataforma cuando ocurran eventos importantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="realtime">Activar notificaciones en tiempo real</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                Recibirás alertas al instante en la barra de notificaciones
              </p>
            </div>
            <Switch
              id="realtime"
              checked={realtimeEnabled}
              onCheckedChange={(v) => { setRealtimeEnabled(v); setHasChanges(true); }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Resumen diario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-green-500" />
            Resumen Diario por Correo
          </CardTitle>
          <CardDescription>
            Recibe un correo con el resumen de actividades del día a la hora que elijas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="daily">Activar resumen diario</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                Se enviará al correo registrado en tu perfil
              </p>
            </div>
            <Switch
              id="daily"
              checked={dailyEmailEnabled}
              onCheckedChange={(v) => { setDailyEmailEnabled(v); setHasChanges(true); }}
            />
          </div>
          {dailyEmailEnabled && (
            <>
              <Separator />
              <div className="flex items-center gap-4">
                <Label className="text-sm whitespace-nowrap">Hora de envío:</Label>
                <Select
                  value={dailyEmailHour}
                  onValueChange={(v) => { setDailyEmailHour(v); setHasChanges(true); }}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Seleccionar hora" />
                  </SelectTrigger>
                  <SelectContent>
                    {hourOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Resumen semanal */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4 text-purple-500" />
            Resumen Semanal por Correo
          </CardTitle>
          <CardDescription>
            Recibe un correo con el resumen semanal de actividades el día que elijas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="weekly">Activar resumen semanal</Label>
              <p className="text-sm text-muted-foreground mt-0.5">
                Se enviará al correo registrado en tu perfil
              </p>
            </div>
            <Switch
              id="weekly"
              checked={weeklyEmailEnabled}
              onCheckedChange={(v) => { setWeeklyEmailEnabled(v); setHasChanges(true); }}
            />
          </div>
          {weeklyEmailEnabled && (
            <>
              <Separator />
              <div className="flex items-center gap-4">
                <Label className="text-sm whitespace-nowrap">Día de envío:</Label>
                <Select
                  value={weeklyEmailDay}
                  onValueChange={(v) => { setWeeklyEmailDay(v); setHasChanges(true); }}
                >
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Seleccionar día" />
                  </SelectTrigger>
                  <SelectContent>
                    {dayOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Acciones */}
      <div className="flex items-center justify-between pt-2">
        <Button variant="outline" onClick={handleReset} disabled={updateMutation.isPending}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Restaurar predeterminados
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || updateMutation.isPending}
          className="min-w-36"
        >
          {updateMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : hasChanges ? (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar cambios
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
  );
}
