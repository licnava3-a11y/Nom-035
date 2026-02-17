import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Mail } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function Settings() {
  const [hrEmail, setHrEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Get HR email setting
  const { data: hrEmailSetting, isLoading } = trpc.systemSettings.getSetting.useQuery({
    key: "hr_email",
  });

  // Update setting mutation
  const updateSettingMutation = trpc.systemSettings.updateSetting.useMutation({
    onSuccess: () => {
      alert("Configuración guardada exitosamente");
      setIsSaving(false);
    },
    onError: (error: any) => {
      alert(`Error: ${error.message || "No se pudo guardar la configuración"}`);
      setIsSaving(false);
    },
  });

  // Load current value
  useEffect(() => {
    if (hrEmailSetting) {
      setHrEmail(hrEmailSetting.settingValue || "");
    }
  }, [hrEmailSetting]);

  const handleSave = () => {
    if (!hrEmail.trim()) {
      alert("Por favor ingrese un correo electrónico válido");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hrEmail)) {
      alert("El correo electrónico no es válido");
      return;
    }

    setIsSaving(true);
    updateSettingMutation.mutate({
      key: "hr_email",
      value: hrEmail,
      description: "Correo electrónico de Recursos Humanos para notificaciones automáticas",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
      <Breadcrumb items={[
        {
                label: "Administración",
                href: "/"
        },
        {
                label: "Configuración"
        }
]} />

        <h1 className="text-3xl font-bold mb-6">Configuración del Sistema</h1>
        <Card>
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Configuración del Sistema</h1>
        <p className="text-muted-foreground mt-1">
          Gestiona las configuraciones globales de la plataforma
        </p>
      </div>

      <div className="space-y-6">
        {/* HR Email Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <CardTitle>Configuración de Recursos Humanos</CardTitle>
            </div>
            <CardDescription>
              Correo electrónico para recibir notificaciones automáticas del sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="hrEmail">Correo Electrónico de RRHH</Label>
              <Input
                id="hrEmail"
                type="email"
                value={hrEmail}
                onChange={(e) => setHrEmail(e.target.value)}
                placeholder="rrhh@empresa.com"
              />
              <p className="text-sm text-muted-foreground">
                Este correo recibirá notificaciones sobre:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1 ml-4">
                <li>Contratos próximos a vencer (7 días de anticipación)</li>
                <li>Reporte consolidado de contratos vencidos</li>
                <li>Alertas de documentos faltantes de empleados</li>
                <li>Notificaciones de acciones correctivas vencidas</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? "Guardando..." : "Guardar Configuración"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Future configuration sections can be added here */}
        <Card>
          <CardHeader>
            <CardTitle>Otras Configuraciones</CardTitle>
            <CardDescription>
              Configuraciones adicionales estarán disponibles próximamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              • Configuración SMTP personalizada<br />
              • Configuración de notificaciones por módulo<br />
              • Configuración de reportes automáticos<br />
              • Configuración de tokens de acceso anónimo
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
