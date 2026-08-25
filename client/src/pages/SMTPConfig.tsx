import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Mail,
  Server,
  Lock,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
  Bell,
  BellOff,
  Inbox,
  Trash2,
  RefreshCw,
  Download,
  Filter,
  Clock,
  History,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function SMTPConfig() {
  const [formData, setFormData] = useState({
    host: "",
    port: 587,
    secure: false,
    user: "",
    password: "",
    fromEmail: "",
    fromName: "Sistema NOM-035",
    testEmail: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Queries
  const {
    data: config,
    isLoading,
    refetch,
  } = trpc.smtpConfig.getConfig.useQuery();
  const { data: emailStatus, refetch: refetchStatus } =
    trpc.smtpConfig.getEmailStatus.useQuery();

  // Mutations
  const updateConfig = trpc.smtpConfig.updateConfig.useMutation({
    onSuccess: data => {
      toast.success(data.message);
      refetch();
      refetchStatus();
    },
    onError: error => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Toggle notificaciones internas
  const setNotificationsEnabled =
    trpc.smtpConfig.setNotificationsEnabled.useMutation({
      onSuccess: data => {
        toast.success(
          data.notificationsEnabled
            ? "Notificaciones internas activadas"
            : "Notificaciones internas pausadas"
        );
        refetchStatus();
      },
      onError: error => toast.error(`Error: ${error.message}`),
    });

  // Cola de correos
  const [queueTab, setQueueTab] = useState<"pending" | "sent" | "failed">(
    "pending"
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [exportFilter, setExportFilter] = useState<
    "all" | "pending" | "sent" | "failed"
  >("all");

  const { data: pendingQueueData, refetch: refetchPending } =
    trpc.smtpConfig.getEmailQueue.useQuery({ status: "pending", limit: 100 });
  const { data: sentQueueData, refetch: refetchSent } =
    trpc.smtpConfig.getEmailQueue.useQuery({ status: "sent", limit: 100 });
  const { data: failedQueueData, refetch: refetchFailed } =
    trpc.smtpConfig.getEmailQueue.useQuery({ status: "failed", limit: 100 });

  const refetchQueue = useCallback(() => {
    refetchPending();
    refetchSent();
    refetchFailed();
  }, [refetchPending, refetchSent, refetchFailed]);
  const emailQueueData = pendingQueueData;

  const flushQueue = trpc.smtpConfig.flushEmailQueue.useMutation({
    onSuccess: data => {
      toast.success(
        `Reenvío completado: ${data.sent} enviados, ${data.failed} fallidos`
      );
      refetchQueue();
      refetchStatus();
    },
    onError: error => toast.error(`Error: ${error.message}`),
  });

  const clearQueue = trpc.smtpConfig.clearEmailQueue.useMutation({
    onSuccess: () => {
      toast.success("Cola limpiada");
      refetchQueue();
    },
    onError: error => toast.error(`Error: ${error.message}`),
  });

  const exportToExcel = trpc.smtpConfig.exportEmailQueueToExcel.useMutation({
    onSuccess: data => {
      // Trigger browser download from base64
      const byteCharacters = atob(data.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exportado: ${data.total} registros descargados`);
    },
    onError: error => toast.error(`Error al exportar: ${error.message}`),
  });

  // Toggle envío de correos
  const setEmailEnabled = trpc.smtpConfig.setEmailEnabled.useMutation({
    onSuccess: data => {
      toast.success(data.message);
      refetchStatus();
      setTimeout(() => refetchQueue(), 1500); // small delay for flush to complete
    },
    onError: error => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const testConnection = trpc.smtpConfig.testConnection.useMutation({
    onSuccess: data => {
      setTestResult(data);
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: error => {
      setTestResult({ success: false, message: error.message });
      toast.error(`Error: ${error.message}`);
    },
  });

  // Load existing config
  useEffect(() => {
    if (config) {
      setFormData({
        host: config.host || "",
        port: config.port || 587,
        secure: config.secure || false,
        user: config.user || "",
        password: "", // Never pre-fill password
        fromEmail: config.fromEmail || "",
        fromName: config.fromName || "Sistema NOM-035",
        testEmail: "",
      });
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.host ||
      !formData.user ||
      !formData.password ||
      !formData.fromEmail
    ) {
      toast.error("Por favor completa todos los campos obligatorios");
      return;
    }

    updateConfig.mutate({
      host: formData.host,
      port: formData.port,
      secure: formData.secure,
      user: formData.user,
      password: formData.password,
      fromEmail: formData.fromEmail,
      fromName: formData.fromName,
    });
  };

  const handleTestConnection = () => {
    if (
      !formData.host ||
      !formData.user ||
      !formData.password ||
      !formData.fromEmail ||
      !formData.testEmail
    ) {
      toast.error(
        "Por favor completa todos los campos incluyendo el email de prueba"
      );
      return;
    }

    setTestResult(null);
    testConnection.mutate({
      host: formData.host,
      port: formData.port,
      secure: formData.secure,
      user: formData.user,
      password: formData.password,
      fromEmail: formData.fromEmail,
      testEmail: formData.testEmail,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Configuración SMTP
        </h1>
        <p className="text-muted-foreground mt-1">
          Configura el servidor de correo electrónico para enviar notificaciones
          automáticas
        </p>
      </div>

      {/* ── Estado del sistema de correo + Toggle ─────────────────────────── */}
      {emailStatus && (
        <div
          className={`rounded-lg border-2 p-4 mb-4 ${
            emailStatus.status === "active"
              ? "border-green-500 bg-green-50 dark:bg-green-950/30"
              : emailStatus.status === "paused"
                ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                : "border-red-400 bg-red-50 dark:bg-red-950/30"
          }`}
        >
          {/* Fila superior: ícono + título + badge + toggle */}
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                emailStatus.status === "active"
                  ? "bg-green-500"
                  : emailStatus.status === "paused"
                    ? "bg-amber-400"
                    : "bg-red-400"
              }`}
            >
              {emailStatus.status === "active" ? (
                <CheckCircle2 className="h-5 w-5 text-white" />
              ) : emailStatus.status === "paused" ? (
                <AlertCircle className="h-5 w-5 text-white" />
              ) : (
                <XCircle className="h-5 w-5 text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`font-semibold text-base ${
                  emailStatus.status === "active"
                    ? "text-green-800 dark:text-green-300"
                    : emailStatus.status === "paused"
                      ? "text-amber-800 dark:text-amber-300"
                      : "text-red-800 dark:text-red-300"
                }`}
              >
                {emailStatus.status === "active"
                  ? "Envío de correos ACTIVO"
                  : emailStatus.status === "paused"
                    ? "Envío de correos PAUSADO"
                    : "Sin configuración SMTP activa"}
              </p>
            </div>
            {/* Toggle de activación — solo visible si hay SMTP configurado */}
            {emailStatus.smtpConfigured && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium text-muted-foreground">
                  {emailStatus.emailEnabled ? "Activado" : "Pausado"}
                </span>
                <Switch
                  checked={emailStatus.emailEnabled}
                  disabled={setEmailEnabled.isPending}
                  onCheckedChange={checked =>
                    setEmailEnabled.mutate({ enabled: checked })
                  }
                  aria-label="Activar o pausar envío de correos"
                />
              </div>
            )}
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                emailStatus.status === "active"
                  ? "bg-green-500 text-white"
                  : emailStatus.status === "paused"
                    ? "bg-amber-400 text-white"
                    : "bg-red-400 text-white"
              }`}
            >
              {emailStatus.status === "active"
                ? "Activo"
                : emailStatus.status === "paused"
                  ? "Pausado"
                  : "Sin SMTP"}
            </span>
          </div>
          {/* Fila inferior: descripción */}
          <p className="text-sm text-muted-foreground mt-2 ml-12">
            {emailStatus.status === "active" && (
              <>
                Los correos se envían desde{" "}
                <strong>{emailStatus.smtpFromEmail}</strong> vía{" "}
                <strong>{emailStatus.smtpHost}</strong>. Usa el interruptor para
                pausar el envío sin perder la configuración.
              </>
            )}
            {emailStatus.status === "paused" && emailStatus.smtpConfigured && (
              <>
                El envío está pausado. Activa el interruptor para comenzar a
                enviar correos a través de{" "}
                <strong>{emailStatus.smtpHost}</strong>.
              </>
            )}
            {emailStatus.status === "paused" && !emailStatus.smtpConfigured && (
              <>
                El envío está desactivado. Guarda primero la configuración SMTP
                y luego activa el interruptor.
              </>
            )}
            {emailStatus.status === "no_smtp" && (
              <>
                El envío está habilitado pero no hay configuración SMTP activa.
                Completa el formulario a continuación para activarlo.
              </>
            )}
          </p>
        </div>
      )}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <div className="grid gap-6">
        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> La contraseña se almacena encriptada
            con AES-256. Las notificaciones críticas del sistema se enviarán
            automáticamente por email cuando esta configuración esté activa.
          </AlertDescription>
        </Alert>

        {/* Configuration Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Configuración del Servidor SMTP
              </CardTitle>
              <CardDescription>
                Ingresa los datos de tu servidor de correo electrónico
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="host">
                    Servidor SMTP <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="host"
                    value={formData.host}
                    onChange={e =>
                      setFormData({ ...formData, host: e.target.value })
                    }
                    placeholder="smtp.gmail.com"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Ejemplo: smtp.gmail.com, smtp.office365.com
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="port">
                    Puerto <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="port"
                    type="number"
                    value={formData.port}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        port: parseInt(e.target.value),
                      })
                    }
                    placeholder="587"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Común: 587 (STARTTLS), 465 (SSL/TLS), 25 (sin cifrado)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="secure"
                  checked={formData.secure}
                  onCheckedChange={checked =>
                    setFormData({ ...formData, secure: checked })
                  }
                />
                <Label htmlFor="secure" className="cursor-pointer">
                  Conexión segura (SSL/TLS)
                </Label>
                <p className="text-xs text-muted-foreground ml-2">
                  Activar para puerto 465, desactivar para 587
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="user">
                    Usuario SMTP <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="user"
                    value={formData.user}
                    onChange={e =>
                      setFormData({ ...formData, user: e.target.value })
                    }
                    placeholder="usuario@empresa.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    Contraseña <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={e =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder={config ? "••••••••" : "Contraseña SMTP"}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? "Ocultar" : "Mostrar"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Se almacenará encriptada con AES-256
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">
                    Email Remitente <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={formData.fromEmail}
                    onChange={e =>
                      setFormData({ ...formData, fromEmail: e.target.value })
                    }
                    placeholder="notificaciones@empresa.com"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fromName">
                    Nombre Remitente <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fromName"
                    value={formData.fromName}
                    onChange={e =>
                      setFormData({ ...formData, fromName: e.target.value })
                    }
                    placeholder="Sistema NOM-035"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <LoadingButton
                  type="submit"
                  loading={updateConfig.isPending}
                  loadingText="Guardando..."
                  className="flex items-center gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Guardar Configuración
                </LoadingButton>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Test Connection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Probar Conexión
            </CardTitle>
            <CardDescription>
              Envía un correo de prueba para verificar que la configuración
              funciona correctamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">
                Email de Prueba <span className="text-destructive">*</span>
              </Label>
              <Input
                id="testEmail"
                type="email"
                value={formData.testEmail}
                onChange={e =>
                  setFormData({ ...formData, testEmail: e.target.value })
                }
                placeholder="tu-email@ejemplo.com"
              />
              <p className="text-xs text-muted-foreground">
                Se enviará un correo de prueba a esta dirección
              </p>
            </div>

            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end">
              <LoadingButton
                type="button"
                variant="outline"
                loading={testConnection.isPending}
                loadingText="Enviando prueba..."
                onClick={handleTestConnection}
                className="flex items-center gap-2"
              >
                <Send className="h-4 w-4" />
                Enviar Email de Prueba
              </LoadingButton>
            </div>
          </CardContent>
        </Card>

        {/* Common Providers Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Guía de Configuración por Proveedor</CardTitle>
            <CardDescription>
              Configuraciones comunes para proveedores populares
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Gmail</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Host: smtp.gmail.com</li>
                    <li>• Puerto: 587</li>
                    <li>• Seguro: No</li>
                    <li>• Usuario: tu-email@gmail.com</li>
                    <li>• Contraseña: Contraseña de aplicación</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    <AlertCircle className="h-3 w-3 inline mr-1" />
                    Requiere habilitar "Contraseñas de aplicación" en tu cuenta
                    de Google
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">
                    Microsoft 365 / Outlook
                  </h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Host: smtp.office365.com</li>
                    <li>• Puerto: 587</li>
                    <li>• Seguro: No</li>
                    <li>• Usuario: tu-email@empresa.com</li>
                    <li>• Contraseña: Tu contraseña</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">SendGrid</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Host: smtp.sendgrid.net</li>
                    <li>• Puerto: 587</li>
                    <li>• Seguro: No</li>
                    <li>• Usuario: apikey</li>
                    <li>• Contraseña: Tu API Key</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Mailgun</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Host: smtp.mailgun.org</li>
                    <li>• Puerto: 587</li>
                    <li>• Seguro: No</li>
                    <li>• Usuario: postmaster@tu-dominio</li>
                    <li>• Contraseña: Tu contraseña SMTP</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Notificaciones Internas ──────────────────────────────────────────────── */}
      {emailStatus?.smtpConfigured && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificaciones Internas del Sistema
            </CardTitle>
            <CardDescription>
              Controla si el sistema envía alertas internas (departamentos sin
              manager, alertas de riesgo, etc.) a la plataforma Manus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex items-center gap-3">
                {emailStatus.notificationsEnabled !== false ? (
                  <Bell className="h-5 w-5 text-green-500" />
                ) : (
                  <BellOff className="h-5 w-5 text-amber-500" />
                )}
                <div>
                  <p className="font-medium">
                    {emailStatus.notificationsEnabled !== false
                      ? "Notificaciones Activas"
                      : "Notificaciones Pausadas"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {emailStatus.notificationsEnabled !== false
                      ? "El sistema envía alertas internas al administrador."
                      : "Las alertas internas están silenciadas. Útil durante pruebas y desarrollo."}
                  </p>
                </div>
              </div>
              <Switch
                checked={emailStatus.notificationsEnabled !== false}
                disabled={setNotificationsEnabled.isPending}
                onCheckedChange={checked =>
                  setNotificationsEnabled.mutate({ enabled: checked })
                }
                aria-label="Activar o pausar notificaciones internas"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Historial y Cola de Correos ──────────────────────────────────────────── */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Historial de Correos del Sistema
                {(pendingQueueData?.total ?? 0) > 0 && (
                  <Badge variant="destructive">
                    {pendingQueueData?.total} pendientes
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                Registro de todos los correos generados por el sistema. Los
                pendientes se reenvían al activar el SMTP.
              </CardDescription>
            </div>
            {/* Export controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="h-8 w-36 text-xs"
                  placeholder="Desde"
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="h-8 w-36 text-xs"
                  placeholder="Hasta"
                />
              </div>
              <Select
                value={exportFilter}
                onValueChange={v => setExportFilter(v as typeof exportFilter)}
              >
                <SelectTrigger className="h-8 w-32 text-xs">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="sent">Enviados</SelectItem>
                  <SelectItem value="failed">Fallidos</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-green-600 text-green-700 hover:bg-green-50"
                onClick={() =>
                  exportToExcel.mutate({
                    status: exportFilter,
                    dateFrom: dateFrom || undefined,
                    dateTo: dateTo || undefined,
                  })
                }
                disabled={exportToExcel.isPending}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                {exportToExcel.isPending ? "Exportando..." : "Exportar Excel"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8"
                onClick={() => refetchQueue()}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Action bar */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(pendingQueueData?.total ?? 0) > 0 &&
              emailStatus?.emailEnabled && (
                <Button
                  size="sm"
                  onClick={() => flushQueue.mutate()}
                  disabled={flushQueue.isPending}
                >
                  <Send className="h-4 w-4 mr-1" />
                  {flushQueue.isPending
                    ? "Enviando..."
                    : `Reenviar ${pendingQueueData?.total} pendientes`}
                </Button>
              )}
            {(sentQueueData?.total ?? 0) > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => clearQueue.mutate({ status: "sent" })}
                disabled={clearQueue.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Limpiar enviados (
                {sentQueueData?.total})
              </Button>
            )}
            {(failedQueueData?.total ?? 0) > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => clearQueue.mutate({ status: "failed" })}
                disabled={clearQueue.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Limpiar fallidos (
                {failedQueueData?.total})
              </Button>
            )}
          </div>

          {/* Tabs */}
          <Tabs
            value={queueTab}
            onValueChange={v => setQueueTab(v as typeof queueTab)}
          >
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="gap-1">
                <Clock className="h-3.5 w-3.5" /> Pendientes
                {(pendingQueueData?.total ?? 0) > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 text-xs px-1.5 py-0"
                  >
                    {pendingQueueData?.total}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Enviados
                {(sentQueueData?.total ?? 0) > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 text-xs px-1.5 py-0"
                  >
                    {sentQueueData?.total}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="failed" className="gap-1">
                <XCircle className="h-3.5 w-3.5" /> Fallidos
                {(failedQueueData?.total ?? 0) > 0 && (
                  <Badge
                    variant="outline"
                    className="ml-1 text-xs px-1.5 py-0 text-red-600 border-red-400"
                  >
                    {failedQueueData?.total}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Pending tab */}
            <TabsContent value="pending">
              {(pendingQueueData?.items?.length ?? 0) === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-400" />
                  <p>No hay correos pendientes.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {pendingQueueData?.items?.map(item => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-amber-50/50 dark:bg-amber-950/20 text-sm"
                    >
                      <Mail className="h-4 w-4 mt-0.5 shrink-0 text-amber-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.subject}</p>
                        <p className="text-muted-foreground text-xs truncate">
                          Para: {item.toAddress}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString("es-MX")} ·{" "}
                          {item.sourceModule ?? "Sistema"}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-amber-600 border-amber-400 text-xs"
                      >
                        Pendiente
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Sent tab */}
            <TabsContent value="sent">
              {(sentQueueData?.items?.length ?? 0) === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Inbox className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>No hay correos enviados registrados.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {sentQueueData?.items?.map(item => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-green-50/50 dark:bg-green-950/20 text-sm"
                    >
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.subject}</p>
                        <p className="text-muted-foreground text-xs truncate">
                          Para: {item.toAddress}
                        </p>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>
                            Creado:{" "}
                            {new Date(item.createdAt).toLocaleString("es-MX")}
                          </span>
                          {item.sentAt && (
                            <span>
                              · Enviado:{" "}
                              {new Date(item.sentAt).toLocaleString("es-MX")}
                            </span>
                          )}
                          {item.sourceModule && (
                            <span>· {item.sourceModule}</span>
                          )}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-green-600 border-green-400 text-xs"
                      >
                        Enviado
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Failed tab */}
            <TabsContent value="failed">
              {(failedQueueData?.items?.length ?? 0) === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-green-400" />
                  <p>No hay correos fallidos.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {failedQueueData?.items?.map(item => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-red-50/50 dark:bg-red-950/20 text-sm"
                    >
                      <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.subject}</p>
                        <p className="text-muted-foreground text-xs truncate">
                          Para: {item.toAddress}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString("es-MX")} ·
                          Intentos: {item.attempts}
                        </p>
                        {item.errorMessage && (
                          <p className="text-xs text-red-600 truncate mt-0.5">
                            {item.errorMessage}
                          </p>
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="shrink-0 text-red-600 border-red-400 text-xs"
                      >
                        Fallido
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
