import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { User, Mail, Shield, Calendar, Award, Bell, Clock, CalendarDays, CheckCircle2 } from "lucide-react";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Notification preferences state
  const [realtimeEnabled, setRealtimeEnabled] = useState(true);
  const [dailyEmailEnabled, setDailyEmailEnabled] = useState(false);
  const [dailyEmailHour, setDailyEmailHour] = useState("8");
  const [weeklyEmailEnabled, setWeeklyEmailEnabled] = useState(false);
  const [weeklyEmailDay, setWeeklyEmailDay] = useState("1");
  const [prefsSaved, setPrefsSaved] = useState(false);

  // Fetch existing preferences
  const { isLoading: prefsLoading } = trpc.notificationPreferences.getPreferences.useQuery(undefined, {
    onSuccess: (data: any) => {
      if (data) {
        setRealtimeEnabled(data.realtimeEnabled ?? true);
        setDailyEmailEnabled(data.dailyEmailEnabled ?? false);
        setDailyEmailHour(String(data.dailyEmailHour ?? 8));
        setWeeklyEmailEnabled(data.weeklyEmailEnabled ?? false);
        setWeeklyEmailDay(String(data.weeklyEmailDay ?? 1));
      }
    },
  });

  const updatePrefsMutation = trpc.notificationPreferences.updatePreferences.useMutation({
    onSuccess: () => {
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 3000);
      toast({ title: "Preferencias guardadas", description: "Tus preferencias de notificación han sido actualizadas." });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudieron guardar las preferencias.", variant: "destructive" });
    },
  });

  const handleSavePrefs = () => {
    updatePrefsMutation.mutate({
      realtimeEnabled,
      dailyEmailEnabled,
      dailyEmailHour: parseInt(dailyEmailHour),
      weeklyEmailEnabled,
      weeklyEmailDay: parseInt(weeklyEmailDay),
    });
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map((n: any) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      instructor: "Instructor",
      student: "Estudiante",
      committee: "Comité de Atención",
      empleado: "Empleado",
      rh: "Recursos Humanos",
      supervisor: "Supervisor",
    };
    return labels[role] || role;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi Perfil</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tu información personal y configuración de cuenta
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Información de Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                  {getInitials(user?.name || "")}
                </AvatarFallback>
              </Avatar>
              <div className="text-center space-y-1">
                <h3 className="font-semibold text-lg">{user?.name || "Usuario"}</h3>
                <Badge variant="secondary">{getRoleLabel(user?.role || "student")}</Badge>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground truncate">{user?.email || "No disponible"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">{getRoleLabel(user?.role || "student")}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Miembro desde {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("es-MX") : "N/A"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile Form */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Editar Información Personal</CardTitle>
            <CardDescription>
              Actualiza tu información de perfil y datos de contacto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre Completo</Label>
                <Input id="name" defaultValue={user?.name || ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" type="email" defaultValue={user?.email || ""} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" type="tel" placeholder="+52 55 1234 5678" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Departamento</Label>
                <Input id="department" placeholder="Ej: Recursos Humanos" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Puesto</Label>
              <Input id="position" placeholder="Ej: Gerente de Recursos Humanos" />
            </div>

            <div className="flex gap-2 pt-4">
              <Button>Guardar Cambios</Button>
              <Button variant="outline">Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Preferencias de Notificaciones ─── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Preferencias de Notificaciones</CardTitle>
          </div>
          <CardDescription>
            Elige cómo y cuándo deseas recibir notificaciones del sistema NOM-035
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {prefsLoading ? (
            <div className="text-sm text-muted-foreground">Cargando preferencias...</div>
          ) : (
            <>
              {/* Tiempo real */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Bell className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Notificaciones en tiempo real</p>
                    <p className="text-xs text-muted-foreground">
                      Recibe alertas instantáneas dentro de la plataforma cuando ocurran eventos importantes
                    </p>
                  </div>
                </div>
                <Switch
                  checked={realtimeEnabled}
                  onCheckedChange={setRealtimeEnabled}
                />
              </div>

              <Separator />

              {/* Resumen diario */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Clock className="h-4 w-4 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Resumen diario por correo</p>
                      <p className="text-xs text-muted-foreground">
                        Recibe un correo con el resumen de actividades del día a la hora que elijas
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={dailyEmailEnabled}
                    onCheckedChange={setDailyEmailEnabled}
                  />
                </div>
                {dailyEmailEnabled && (
                  <div className="ml-12 flex items-center gap-3">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Hora de envío:</Label>
                    <Select value={dailyEmailHour} onValueChange={setDailyEmailHour}>
                      <SelectTrigger className="w-40">
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
                )}
              </div>

              <Separator />

              {/* Resumen semanal */}
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <CalendarDays className="h-4 w-4 text-purple-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Resumen semanal por correo</p>
                      <p className="text-xs text-muted-foreground">
                        Recibe un correo con el resumen semanal de actividades el día que elijas
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={weeklyEmailEnabled}
                    onCheckedChange={setWeeklyEmailEnabled}
                  />
                </div>
                {weeklyEmailEnabled && (
                  <div className="ml-12 flex items-center gap-3">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Día de envío:</Label>
                    <Select value={weeklyEmailDay} onValueChange={setWeeklyEmailDay}>
                      <SelectTrigger className="w-40">
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
                )}
              </div>

              <Separator />

              <div className="flex items-center gap-3 pt-2">
                <Button
                  onClick={handleSavePrefs}
                  disabled={updatePrefsMutation.isPending}
                  className="min-w-[160px]"
                >
                  {updatePrefsMutation.isPending ? "Guardando..." : "Guardar preferencias"}
                </Button>
                {prefsSaved && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Guardado correctamente</span>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Activity Stats */}
      {user?.role === "student" && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cursos Completados</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5</div>
              <p className="text-xs text-muted-foreground">Certificaciones obtenidas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">Cursos activos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Promedio</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">85%</div>
              <p className="text-xs text-muted-foreground">Calificación promedio</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Seguridad de la Cuenta</CardTitle>
          <CardDescription>
            Gestiona la seguridad y privacidad de tu cuenta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Cambiar Contraseña</h4>
              <p className="text-sm text-muted-foreground">
                Actualiza tu contraseña periódicamente para mantener tu cuenta segura
              </p>
            </div>
            <Button variant="outline">Cambiar</Button>
          </div>
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <h4 className="font-medium">Autenticación de Dos Factores</h4>
              <p className="text-sm text-muted-foreground">
                Agrega una capa adicional de seguridad a tu cuenta
              </p>
            </div>
            <Button variant="outline">Configurar</Button>
          </div>
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              <h4 className="font-medium">Sesiones Activas</h4>
              <p className="text-sm text-muted-foreground">
                Gestiona los dispositivos donde has iniciado sesión
              </p>
            </div>
            <Button variant="outline">Ver Sesiones</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
