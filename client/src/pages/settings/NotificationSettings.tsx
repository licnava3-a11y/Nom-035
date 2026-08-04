import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Bell, Clock, CalendarDays, RefreshCw, Save, CheckCircle2, Mail, Monitor, AlertTriangle, ShieldAlert, ClipboardList, FileText, Info } from "lucide-react";

// ─── Tipos de alerta configurables ───────────────────────────────────────────
const ALERT_TYPES = [
  { key: "alertsEnabled", label: "Alertas del sistema", description: "Avisos críticos de la plataforma, errores y mantenimiento", icon: AlertTriangle, color: "text-red-500" },
  { key: "casesEnabled", label: "Gestión de casos", description: "Nuevos casos asignados, actualizaciones y cierres", icon: ShieldAlert, color: "text-orange-500" },
  { key: "surveysEnabled", label: "Encuestas NOM-035", description: "Recordatorios de encuestas pendientes y resultados disponibles", icon: ClipboardList, color: "text-blue-500" },
  { key: "correctiveActionsEnabled", label: "Acciones correctivas", description: "Vencimientos de acciones correctivas y planes de intervención", icon: FileText, color: "text-yellow-600" },
  { key: "remindersEnabled", label: "Recordatorios", description: "Vencimientos de contratos, vacaciones pendientes y tareas", icon: Clock, color: "text-purple-500" },
  { key: "reportsEnabled", label: "Reportes automáticos", description: "Reportes ejecutivos, análisis de riesgo y dashboards programados", icon: FileText, color: "text-green-500" },
] as const;
type AlertKey = typeof ALERT_TYPES[number]["key"];

export default function NotificationSettings() {
  const { data: preferences, isLoading, refetch } = trpc.notificationPreferences.getPreferences.useQuery();
  const updateMutation = trpc.notificationPreferences.updatePreferences.useMutation();

  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [dailyEmailEnabled, setDailyEmailEnabled] = useState(false);
  const [dailyEmailHour, setDailyEmailHour] = useState("8");
  const [weeklyEmailEnabled, setWeeklyEmailEnabled] = useState(false);
  const [weeklyEmailDay, setWeeklyEmailDay] = useState("1");
  const [hasChanges, setHasChanges] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [alertTypes, setAlertTypes] = useState<Record<AlertKey, boolean>>({
    alertsEnabled: true, casesEnabled: true, surveysEnabled: true,
    correctiveActionsEnabled: true, remindersEnabled: true, reportsEnabled: true,
  });
  const handleAlertToggle = (key: AlertKey, value: boolean) => {
    setAlertTypes(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

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
    }
  };

  const handleReset = () => {
    setRealtimeEnabled(true);
    setDailyEmailEnabled(false);
    setDailyEmailHour("8");
    setWeeklyEmailEnabled(false);
    setWeeklyEmailDay("1");
    setEmailEnabled(true);
    setInAppEnabled(true);
    setAlertTypes({ alertsEnabled: true, casesEnabled: true, surveysEnabled: true, correctiveActionsEnabled: true, remindersEnabled: true, reportsEnabled: true });
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

  const activeAlerts = Object.values(alertTypes).filter(Boolean).length;

  if (isLoading) {
    return <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" />Cargando preferencias...</div>;
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
          <Badge variant="secondary" className="gap-1">
            <Info className="h-3 w-3" />
            Cambios sin guardar
          </Badge>
        )}
      </div>

      {/* Canales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Monitor className="h-4 w-4 text-blue-500" />
            Canales de Notificación
          </CardTitle>
          <CardDescription>Elige cómo quieres recibir las notificaciones</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="inApp" className="cursor-pointer">Notificaciones en la plataforma</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Alertas en tiempo real dentro de la aplicación</p>
              </div>
            </div>
            <Switch id="inApp" checked={inAppEnabled} onCheckedChange={(v) => { setInAppEnabled(v); setHasChanges(true); }} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="realtime" className="cursor-pointer">Notificaciones push en tiempo real</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Alertas inmediatas sin necesidad de recargar la página</p>
              </div>
            </div>
            <Switch id="realtime" checked={realtimeEnabled} onCheckedChange={(v) => { setRealtimeEnabled(v); setHasChanges(true); }} />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="emailCh" className="cursor-pointer">Notificaciones por correo electrónico</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Recibe alertas en tu correo registrado en el perfil</p>
              </div>
            </div>
            <Switch id="emailCh" checked={emailEnabled} onCheckedChange={(v) => { setEmailEnabled(v); setHasChanges(true); }} />
          </div>
        </CardContent>
      </Card>

      {/* Tipos de alerta */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="h-4 w-4 text-orange-500" />
                Tipos de Alerta
              </CardTitle>
              <CardDescription>Selecciona qué categorías de notificaciones deseas recibir</CardDescription>
            </div>
            <Badge variant="outline" className="text-xs">{activeAlerts}/{ALERT_TYPES.length} activas</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {ALERT_TYPES.map((type, idx) => {
            const Icon = type.icon;
            return (
              <div key={type.key}>
                {idx > 0 && <Separator className="my-3" />}
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${type.color}`} />
                    <div>
                      <Label htmlFor={type.key} className="cursor-pointer font-medium">{type.label}</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">{type.description}</p>
                    </div>
                  </div>
                  <Switch id={type.key} checked={alertTypes[type.key]} onCheckedChange={(v) => handleAlertToggle(type.key, v)} />
                </div>
              </div>
            );
          })}
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
