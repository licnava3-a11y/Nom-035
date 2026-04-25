import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Breadcrumb } from "@/components/Breadcrumb";
import { toast } from "sonner";
import {
  Bell,
  Settings,
  Mail,
  Users,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  Clock,
  Shield,
  Send,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const ALERT_TYPE_LABELS: Record<string, string> = {
  critical_cases: "Casos críticos abiertos",
  low_coverage: "Cobertura baja de encuestas (%)",
  excellent_compliance: "Cumplimiento excelente (%)",
};

const FREQUENCY_OPTIONS = [
  { value: "disabled", label: "Desactivado" },
  { value: "daily", label: "Diario (09:00 AM)" },
  { value: "weekly", label: "Semanal (lunes 09:00 AM)" },
  { value: "monthly", label: "Mensual (día 1 a las 09:00 AM)" },
];

export default function AlertAdminDashboard() {
  const utils = trpc.useUtils();

  // ─── Umbrales ───────────────────────────────────────────────────────────────
  const { data: thresholds = [], isLoading: loadingThresholds } =
    trpc.alertThresholds.getAll.useQuery();

  const [thresholdValues, setThresholdValues] = useState<Record<string, number>>({});

  useEffect(() => {
    if (thresholds.length > 0) {
      const vals: Record<string, number> = {};
      thresholds.forEach((t: any) => {
        vals[t.alertType] = t.threshold;
      });
      setThresholdValues(vals);
    }
  }, [thresholds]);

  const updateThreshold = trpc.alertThresholds.update.useMutation({
    onSuccess: () => {
      toast.success("Umbral actualizado correctamente");
      utils.alertThresholds.getAll.invalidate();
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const handleSaveThresholds = () => {
    const updates = Object.entries(thresholdValues).map(([alertType, threshold]) =>
      updateThreshold.mutateAsync({
        alertType: alertType as any,
        threshold,
      })
    );
    Promise.all(updates).catch(() => {});
  };

  // ─── Frecuencia de resumen ───────────────────────────────────────────────────
  const { data: freqSetting } = trpc.systemSettings.getSetting.useQuery({
    key: "alert_summary_frequency",
  });
  const [frequency, setFrequency] = useState<string>("disabled");

  useEffect(() => {
    if (freqSetting?.settingValue) {
      setFrequency(freqSetting.settingValue);
    }
  }, [freqSetting]);

  const updateFrequency = trpc.systemSettings.updateAlertSummaryFrequency.useMutation({
    onSuccess: () => {
      toast.success("Frecuencia actualizada correctamente");
      utils.systemSettings.getSetting.invalidate({ key: "alert_summary_frequency" });
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  // ─── Destinatarios ───────────────────────────────────────────────────────────
  const { data: recipientsSetting } = trpc.systemSettings.getSetting.useQuery({
    key: "alert_email_recipients",
  });
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");

  useEffect(() => {
    if (recipientsSetting?.settingValue) {
      try {
        setRecipients(JSON.parse(recipientsSetting.settingValue));
      } catch {
        setRecipients([]);
      }
    }
  }, [recipientsSetting]);

  const updateRecipients = trpc.systemSettings.updateSetting.useMutation({
    onSuccess: () => {
      toast.success("Destinatarios actualizados correctamente");
      utils.systemSettings.getSetting.invalidate({ key: "alert_email_recipients" });
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  const handleAddEmail = () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Ingresa un correo electrónico válido");
      return;
    }
    if (recipients.includes(trimmed)) {
      toast.error("Este correo ya está en la lista");
      return;
    }
    const updated = [...recipients, trimmed];
    setRecipients(updated);
    setNewEmail("");
    updateRecipients.mutate({
      key: "alert_email_recipients",
      value: JSON.stringify(updated),
      description: "Lista de destinatarios de alertas por correo electrónico",
    });
  };

  const handleRemoveEmail = (email: string) => {
    const updated = recipients.filter((r) => r !== email);
    setRecipients(updated);
    updateRecipients.mutate({
      key: "alert_email_recipients",
      value: JSON.stringify(updated),
      description: "Lista de destinatarios de alertas por correo electrónico",
    });
  };

  // ─── Prueba SMTP ─────────────────────────────────────────────────────────────
  const [smtpTestEmail, setSmtpTestEmail] = useState("");
  const [smtpTestResult, setSmtpTestResult] = useState<"idle" | "success" | "error">("idle");
  const testSMTP = trpc.systemSettings.testSMTP.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setSmtpTestResult("success");
      setTimeout(() => setSmtpTestResult("idle"), 5000);
    },
    onError: (err) => {
      toast.error(err.message);
      setSmtpTestResult("error");
      setTimeout(() => setSmtpTestResult("idle"), 8000);
    },
  });

  // ─── Intervalo de alertas en tiempo real ─────────────────────────────────────
  const { data: intervalSetting } = trpc.systemSettings.getSetting.useQuery({
    key: "realtime_alert_interval_minutes",
  });
  const [alertInterval, setAlertInterval] = useState<string>("15");

  useEffect(() => {
    if (intervalSetting?.settingValue) {
      setAlertInterval(intervalSetting.settingValue);
    }
  }, [intervalSetting]);

  const updateInterval = trpc.systemSettings.updateSetting.useMutation({
    onSuccess: () => {
      toast.success("Intervalo actualizado. Requiere reinicio del servidor para aplicarse.");
      utils.systemSettings.getSetting.invalidate({ key: "realtime_alert_interval_minutes" });
    },
    onError: (err) => toast.error(`Error: ${err.message}`),
  });

  return (
    <div className="container mx-auto py-8 space-y-6">
      <Breadcrumb
        items={[
          { label: "Inicio", href: "/" },
          { label: "Configuración", href: "/settings" },
          { label: "Administración de Alertas" },
        ]}
      />

      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
          <Bell className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Administración de Alertas</h1>
          <p className="text-muted-foreground text-sm">
            Configure umbrales, frecuencias y destinatarios de todas las alertas del sistema
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Umbrales ─────────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <CardTitle className="text-base">Umbrales de Alerta</CardTitle>
            </div>
            <CardDescription>
              Define los valores que disparan cada tipo de alerta automática
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingThresholds ? (
              <p className="text-sm text-muted-foreground">Cargando umbrales...</p>
            ) : (
              <>
                {Object.entries(ALERT_TYPE_LABELS).map(([key, label]) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={`threshold-${key}`} className="text-sm font-medium">
                      {label}
                    </Label>
                    <Input
                      id={`threshold-${key}`}
                      type="number"
                      min={0}
                      max={100}
                      value={thresholdValues[key] ?? ""}
                      onChange={(e) =>
                        setThresholdValues((prev) => ({
                          ...prev,
                          [key]: parseInt(e.target.value) || 0,
                        }))
                      }
                      className="h-9"
                    />
                  </div>
                ))}
                <Button
                  onClick={handleSaveThresholds}
                  disabled={updateThreshold.isPending}
                  className="w-full mt-2"
                  size="sm"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateThreshold.isPending ? "Guardando..." : "Guardar umbrales"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* ─── Frecuencia y Tiempo Real ──────────────────────────────────────── */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-base">Frecuencia de Resumen por Correo</CardTitle>
              </div>
              <CardDescription>
                Con qué periodicidad se envía el resumen consolidado de alertas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar frecuencia" />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => updateFrequency.mutate({ frequency: frequency as any })}
                disabled={updateFrequency.isPending}
                size="sm"
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateFrequency.isPending ? "Guardando..." : "Guardar frecuencia"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                <CardTitle className="text-base">Alertas en Tiempo Real (WebSocket)</CardTitle>
              </div>
              <CardDescription>
                Intervalo de verificación de tareas vencidas y contratos próximos a vencer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="alert-interval" className="text-sm font-medium">
                  Intervalo (minutos)
                </Label>
                <Input
                  id="alert-interval"
                  type="number"
                  min={5}
                  max={60}
                  value={alertInterval}
                  onChange={(e) => setAlertInterval(e.target.value)}
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 5 minutos. Requiere reinicio del servidor para aplicarse.
                </p>
              </div>
              <Button
                onClick={() =>
                  updateInterval.mutate({
                    key: "realtime_alert_interval_minutes",
                    value: alertInterval,
                    description: "Intervalo en minutos para el job de alertas en tiempo real",
                  })
                }
                disabled={updateInterval.isPending}
                size="sm"
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {updateInterval.isPending ? "Guardando..." : "Guardar intervalo"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Destinatarios ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-base">Destinatarios de Alertas por Correo</CardTitle>
          </div>
          <CardDescription>
            Correos electrónicos que recibirán las alertas automáticas del sistema (contratos,
            PAC, dictámenes, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agregar nuevo email */}
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="correo@empresa.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddEmail();
                }
              }}
              className="h-9"
            />
            <Button onClick={handleAddEmail} size="sm" className="shrink-0">
              <Plus className="h-4 w-4 mr-1" />
              Agregar
            </Button>
          </div>

          {/* Lista de destinatarios */}
          {recipients.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>No hay destinatarios configurados. Agrega al menos un correo.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {recipients.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/50 border"
                >
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveEmail(email)}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-1">
                {recipients.length} destinatario{recipients.length !== 1 ? "s" : ""} configurado
                {recipients.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Probar conexión SMTP ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-indigo-500" />
            <CardTitle className="text-base">Probar Conexión SMTP</CardTitle>
          </div>
          <CardDescription>
            Envía un correo de prueba para verificar que la configuración SMTP está funcionando
            correctamente antes de que el sistema envíe alertas reales.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="correo@empresa.com"
              value={smtpTestEmail}
              onChange={(e) => setSmtpTestEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (smtpTestEmail.trim()) testSMTP.mutate({ toEmail: smtpTestEmail.trim() });
                }
              }}
              className="h-9"
            />
            <Button
              onClick={() => {
                if (!smtpTestEmail.trim()) { toast.error("Ingresa un correo de destino"); return; }
                testSMTP.mutate({ toEmail: smtpTestEmail.trim() });
              }}
              disabled={testSMTP.isPending}
              size="sm"
              className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              {testSMTP.isPending ? "Enviando..." : "Enviar prueba"}
            </Button>
          </div>
          {smtpTestResult === "success" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Correo de prueba enviado exitosamente. Revisa la bandeja de entrada del destinatario.</span>
            </div>
          )}
          {smtpTestResult === "error" && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 border border-red-200 text-red-800 text-sm">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>No se pudo enviar el correo. Verifica las variables SMTP_HOST, SMTP_USER y SMTP_PASS en la configuración del servidor.</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Si el correo no llega, configura las variables de entorno <code className="bg-muted px-1 rounded">SMTP_HOST</code>,{" "}
            <code className="bg-muted px-1 rounded">SMTP_USER</code> y{" "}
            <code className="bg-muted px-1 rounded">SMTP_PASS</code> en el panel de Secrets del proyecto.
          </p>
        </CardContent>
      </Card>

      {/* ─── Estado del sistema ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-gray-500" />
            <CardTitle className="text-base">Estado del Sistema de Alertas</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Alertas en tiempo real", status: "activo", color: "green" },
              { label: "Resumen por correo", status: frequency === "disabled" ? "inactivo" : frequency, color: frequency === "disabled" ? "gray" : "blue" },
              { label: "Alertas de contratos", status: "activo", color: "green" },
              { label: "Alertas PAC", status: "activo", color: "green" },
            ].map((item) => (
              <div key={item.label} className="space-y-1">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <Badge
                  variant={item.color === "green" ? "default" : item.color === "blue" ? "secondary" : "outline"}
                  className={
                    item.color === "green"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200"
                      : item.color === "blue"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200"
                      : ""
                  }
                >
                  {item.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
