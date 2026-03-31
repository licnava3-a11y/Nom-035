import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Mail, Server, Lock, Send, CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";

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
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Queries
  const { data: config, isLoading, refetch } = trpc.smtpConfig.getConfig.useQuery();
  const { data: emailStatus, refetch: refetchStatus } = trpc.smtpConfig.getEmailStatus.useQuery();

  // Mutations
  const updateConfig = trpc.smtpConfig.updateConfig.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      refetch();
      refetchStatus();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const testConnection = trpc.smtpConfig.testConnection.useMutation({
    onSuccess: (data) => {
      setTestResult(data);
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    },
    onError: (error) => {
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

    if (!formData.host || !formData.user || !formData.password || !formData.fromEmail) {
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
    if (!formData.host || !formData.user || !formData.password || !formData.fromEmail || !formData.testEmail) {
      toast.error("Por favor completa todos los campos incluyendo el email de prueba");
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
          Configura el servidor de correo electrónico para enviar notificaciones automáticas
        </p>
      </div>

      {/* ── Estado del sistema de correo ─────────────────────────────────── */}
      {emailStatus && (
        <div
          className={`flex items-start gap-4 rounded-lg border-2 p-4 mb-4 ${
            emailStatus.status === "active"
              ? "border-green-500 bg-green-50 dark:bg-green-950/30"
              : emailStatus.status === "paused"
              ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
              : "border-red-400 bg-red-50 dark:bg-red-950/30"
          }`}
        >
          <div
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
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
            <p className="text-sm text-muted-foreground mt-0.5">
              {emailStatus.status === "active" && (
                <>
                  Los correos se envían desde{" "}
                  <strong>{emailStatus.smtpFromEmail}</strong> vía{" "}
                  <strong>{emailStatus.smtpHost}</strong>.
                </>
              )}
              {emailStatus.status === "paused" && (
                <>
                  El envío está desactivado por la variable de entorno{" "}
                  <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs font-mono">
                    EMAIL_ENABLED
                  </code>
                  . Los correos se registran en consola pero no salen al exterior. Para activar en
                  producción, establece{" "}
                  <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs font-mono">
                    EMAIL_ENABLED=true
                  </code>{" "}
                  en el archivo <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded text-xs font-mono">.env</code> del servidor.
                </>
              )}
              {emailStatus.status === "no_smtp" && (
                <>
                  El envío está habilitado pero no hay configuración SMTP activa. Completa el
                  formulario a continuación para activarlo.
                </>
              )}
            </p>
          </div>
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
      )}
      {/* ─────────────────────────────────────────────────────────────────── */}

      <div className="grid gap-6">
        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Importante:</strong> La contraseña se almacena encriptada con AES-256. 
            Las notificaciones críticas del sistema se enviarán automáticamente por email cuando esta configuración esté activa.
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
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
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
                  onCheckedChange={(checked) => setFormData({ ...formData, secure: checked })}
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
                    onChange={(e) => setFormData({ ...formData, user: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, fromEmail: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, fromName: e.target.value })}
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
              Envía un correo de prueba para verificar que la configuración funciona correctamente
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
                onChange={(e) => setFormData({ ...formData, testEmail: e.target.value })}
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
                    Requiere habilitar "Contraseñas de aplicación" en tu cuenta de Google
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-semibold mb-2">Microsoft 365 / Outlook</h4>
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
    </div>
  );
}
