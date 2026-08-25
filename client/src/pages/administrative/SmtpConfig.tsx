import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
// Toast no disponible, usar Alert nativo
import {
  Loader2,
  Mail,
  Server,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function SmtpConfig() {
  // const { toast } = useToast();
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
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Get existing config
  const { data: config, isLoading } = trpc.smtpConfig.getConfig.useQuery();

  // Update mutation
  const updateConfig = trpc.smtpConfig.updateConfig.useMutation({
    onSuccess: data => {
      alert(`✅ Configuración guardada: ${data.message}`);
    },
    onError: error => {
      alert(`❌ Error: ${error.message}`);
    },
  });

  // Test connection mutation
  const testConnection = trpc.smtpConfig.testConnection.useMutation({
    onSuccess: data => {
      setTestResult(data);
      setIsTestingConnection(false);
      if (data.success) {
        alert(`✅ Conexión exitosa: ${data.message}`);
      } else {
        alert(`❌ Error de conexión: ${data.message}`);
      }
    },
    onError: error => {
      setTestResult({ success: false, message: error.message });
      setIsTestingConnection(false);
      alert(`❌ Error: ${error.message}`);
    },
  });

  // Load existing config
  useEffect(() => {
    if (config) {
      setFormData({
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.user,
        password: "", // Don't prefill password
        fromEmail: config.fromEmail,
        fromName: config.fromName,
        testEmail: "",
      });
    }
  }, [config]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.password) {
      alert("❌ Error: La contraseña es requerida");
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
    if (!formData.testEmail) {
      alert("❌ Error: Ingresa un correo de prueba");
      return;
    }

    if (!formData.password) {
      alert("❌ Error: La contraseña es requerida para probar la conexión");
      return;
    }

    setIsTestingConnection(true);
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
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Configuración SMTP</h1>
        <p className="text-muted-foreground">
          Configura el servidor de correo electrónico para enviar notificaciones
          automáticas
        </p>
      </div>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Esta configuración es necesaria para habilitar el envío de correos
          electrónicos automáticos (recordatorios de acciones correctivas,
          notificaciones de encuestas, etc.)
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Configuración del Servidor
            </CardTitle>
            <CardDescription>
              Datos de conexión al servidor SMTP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">Host SMTP *</Label>
                <Input
                  id="host"
                  placeholder="smtp.gmail.com"
                  value={formData.host}
                  onChange={e =>
                    setFormData({ ...formData, host: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="port">Puerto *</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="587"
                  value={formData.port}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      port: parseInt(e.target.value) || 587,
                    })
                  }
                  required
                />
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
                Conexión segura (SSL/TLS) - Usar para puerto 465
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Credenciales de Autenticación
            </CardTitle>
            <CardDescription>
              Usuario y contraseña del servidor SMTP
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user">Usuario SMTP *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="user"
                  className="pl-9"
                  placeholder="usuario@ejemplo.com"
                  value={formData.user}
                  onChange={e =>
                    setFormData({ ...formData, user: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña SMTP *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  className="pl-9"
                  placeholder={config ? "••••••••" : "Contraseña"}
                  value={formData.password}
                  onChange={e =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required={!config}
                />
              </div>
              {config && (
                <p className="text-xs text-muted-foreground">
                  Deja en blanco para mantener la contraseña actual
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Configuración del Remitente
            </CardTitle>
            <CardDescription>
              Información que aparecerá en los correos enviados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fromEmail">Correo del remitente *</Label>
              <Input
                id="fromEmail"
                type="email"
                placeholder="noreply@empresa.com"
                value={formData.fromEmail}
                onChange={e =>
                  setFormData({ ...formData, fromEmail: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromName">Nombre del remitente *</Label>
              <Input
                id="fromName"
                placeholder="Sistema NOM-035"
                value={formData.fromName}
                onChange={e =>
                  setFormData({ ...formData, fromName: e.target.value })
                }
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Probar Conexión</CardTitle>
            <CardDescription>
              Envía un correo de prueba para verificar la configuración
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="testEmail">Correo de prueba</Label>
              <div className="flex gap-2">
                <Input
                  id="testEmail"
                  type="email"
                  placeholder="tu@correo.com"
                  value={formData.testEmail}
                  onChange={e =>
                    setFormData({ ...formData, testEmail: e.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTestingConnection || !formData.testEmail}
                >
                  {isTestingConnection ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Probando...
                    </>
                  ) : (
                    "Probar"
                  )}
                </Button>
              </div>
            </div>

            {testResult && (
              <Alert variant={testResult.success ? "default" : "destructive"}>
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>{testResult.message}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="submit" disabled={updateConfig.isPending}>
            {updateConfig.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Configuración"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
