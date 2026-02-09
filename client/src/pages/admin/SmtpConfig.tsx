import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Server, Key, User, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SmtpConfig() {
  const [formData, setFormData] = useState({
    host: '',
    port: 587,
    user: '',
    password: '',
    fromEmail: '',
    fromName: 'Sistema NOM-035',
  });

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Obtener estado actual de SMTP
  const { data: smtpStatus, isLoading: statusLoading } = trpc.system.getSmtpStatus.useQuery();

  // Mutation para probar conexión
  const testConnection = trpc.system.testSmtpConnection.useMutation({
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
      toast.error('Error al probar conexión SMTP');
    },
  });

  // Prellenar formulario con datos existentes
  useEffect(() => {
    if (smtpStatus) {
      setFormData({
        host: smtpStatus.host || '',
        port: smtpStatus.port || 587,
        user: smtpStatus.user || '',
        password: '', // No prellenamos la contraseña por seguridad
        fromEmail: smtpStatus.fromEmail || '',
        fromName: smtpStatus.fromName || 'Sistema NOM-035',
      });
    }
  }, [smtpStatus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTestResult(null);
    testConnection.mutate(formData);
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (statusLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Configuración SMTP</h1>
        <p className="text-gray-600 mt-2">
          Configura el servidor de correo electrónico para enviar notificaciones automáticas
        </p>
      </div>

      {/* Estado de configuración */}
      {smtpStatus && (
        <Alert className={`mb-6 ${smtpStatus.isConfigured ? 'border-green-500 bg-green-50' : 'border-yellow-500 bg-yellow-50'}`}>
          <AlertCircle className={`h-4 w-4 ${smtpStatus.isConfigured ? 'text-green-600' : 'text-yellow-600'}`} />
          <AlertDescription className={smtpStatus.isConfigured ? 'text-green-800' : 'text-yellow-800'}>
            {smtpStatus.isConfigured ? (
              <>
                <strong>SMTP Configurado:</strong> El sistema está listo para enviar correos electrónicos.
                <br />
                <span className="text-sm">Servidor: {smtpStatus.host}:{smtpStatus.port} | Usuario: {smtpStatus.user}</span>
              </>
            ) : (
              <>
                <strong>SMTP No Configurado:</strong> Las notificaciones por correo electrónico no funcionarán hasta que configures las credenciales SMTP.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Nota informativa */}
      <Alert className="mb-6 border-blue-500 bg-blue-50">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Nota:</strong> Para configurar las credenciales SMTP de forma permanente, el administrador del sistema debe usar{' '}
          <code className="bg-blue-100 px-2 py-1 rounded text-sm">webdev_request_secrets</code> para almacenar las variables de entorno:
          SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Probar Conexión SMTP
          </CardTitle>
          <CardDescription>
            Ingresa las credenciales SMTP para probar la conexión. El sistema enviará un correo de prueba al usuario configurado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Servidor SMTP */}
            <div className="space-y-2">
              <Label htmlFor="host" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Servidor SMTP *
              </Label>
              <Input
                id="host"
                type="text"
                placeholder="smtp.gmail.com, smtp.office365.com"
                value={formData.host}
                onChange={(e) => handleChange('host', e.target.value)}
                required
              />
              <p className="text-sm text-gray-500">Dirección del servidor SMTP (ejemplo: smtp.gmail.com)</p>
            </div>

            {/* Puerto SMTP */}
            <div className="space-y-2">
              <Label htmlFor="port" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Puerto SMTP *
              </Label>
              <Input
                id="port"
                type="number"
                placeholder="587"
                value={formData.port}
                onChange={(e) => handleChange('port', parseInt(e.target.value) || 587)}
                min={1}
                max={65535}
                required
              />
              <p className="text-sm text-gray-500">Puerto del servidor (587 para TLS, 465 para SSL)</p>
            </div>

            {/* Usuario SMTP */}
            <div className="space-y-2">
              <Label htmlFor="user" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Usuario SMTP *
              </Label>
              <Input
                id="user"
                type="email"
                placeholder="tu-correo@empresa.com"
                value={formData.user}
                onChange={(e) => handleChange('user', e.target.value)}
                required
              />
              <p className="text-sm text-gray-500">Correo electrónico o usuario para autenticación</p>
            </div>

            {/* Contraseña SMTP */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                Contraseña SMTP *
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
              />
              <p className="text-sm text-gray-500">Contraseña de la cuenta de correo</p>
            </div>

            {/* Campos opcionales */}
            <div className="border-t pt-6 space-y-6">
              <h3 className="text-lg font-semibold">Configuración Opcional</h3>

              {/* Email del remitente */}
              <div className="space-y-2">
                <Label htmlFor="fromEmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email del Remitente
                </Label>
                <Input
                  id="fromEmail"
                  type="email"
                  placeholder="noreply@empresa.com (opcional)"
                  value={formData.fromEmail}
                  onChange={(e) => handleChange('fromEmail', e.target.value)}
                />
                <p className="text-sm text-gray-500">Si no se especifica, se usará el usuario SMTP</p>
              </div>

              {/* Nombre del remitente */}
              <div className="space-y-2">
                <Label htmlFor="fromName" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Nombre del Remitente
                </Label>
                <Input
                  id="fromName"
                  type="text"
                  placeholder="Sistema NOM-035"
                  value={formData.fromName}
                  onChange={(e) => handleChange('fromName', e.target.value)}
                />
                <p className="text-sm text-gray-500">Nombre que aparecerá como remitente en los correos</p>
              </div>
            </div>

            {/* Botón de prueba */}
            <div className="flex items-center gap-4">
              <Button
                type="submit"
                disabled={testConnection.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {testConnection.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Probando conexión...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Probar Conexión
                  </>
                )}
              </Button>
            </div>

            {/* Resultado de la prueba */}
            {testResult && (
              <Alert className={`${testResult.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={testResult.success ? 'text-green-800' : 'text-red-800'}>
                  <strong>{testResult.success ? 'Éxito:' : 'Error:'}</strong> {testResult.message}
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Proveedores SMTP Comunes</CardTitle>
          <CardDescription>Configuraciones típicas para servicios populares</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h4 className="font-semibold">Gmail</h4>
              <p className="text-sm text-gray-600">Servidor: smtp.gmail.com | Puerto: 587 (TLS)</p>
              <p className="text-xs text-gray-500 mt-1">
                Nota: Requiere "Contraseña de aplicación" si tienes 2FA activado
              </p>
            </div>

            <div className="border-l-4 border-orange-500 pl-4">
              <h4 className="font-semibold">Outlook / Office 365</h4>
              <p className="text-sm text-gray-600">Servidor: smtp.office365.com | Puerto: 587 (TLS)</p>
            </div>

            <div className="border-l-4 border-green-500 pl-4">
              <h4 className="font-semibold">SendGrid</h4>
              <p className="text-sm text-gray-600">Servidor: smtp.sendgrid.net | Puerto: 587 (TLS)</p>
              <p className="text-xs text-gray-500 mt-1">Usuario: apikey | Contraseña: Tu API Key</p>
            </div>

            <div className="border-l-4 border-purple-500 pl-4">
              <h4 className="font-semibold">Mailgun</h4>
              <p className="text-sm text-gray-600">Servidor: smtp.mailgun.org | Puerto: 587 (TLS)</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
