import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Mail, Building2, Zap, Upload, X, ImageIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function Settings() {
  const [hrEmail, setHrEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Datos de empresa
  const [companyName, setCompanyName] = useState("");
  const [companyRfc, setCompanyRfc] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [companyLogo, setCompanyLogo] = useState(""); // URL del logo en S3
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const { data: companyInfo, refetch: refetchCompanyInfo } = trpc.systemSettings.getCompanyInfo.useQuery();
  const saveCompanyMutation = trpc.systemSettings.saveCompanyInfo.useMutation({
    onSuccess: () => {
      toast({ title: "Datos de empresa guardados", description: "La portada del PDF usará esta información." });
      setIsSavingCompany(false);
      refetchCompanyInfo();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setIsSavingCompany(false);
    },
  });

  useEffect(() => {
    if (companyInfo) {
      setCompanyName(companyInfo.company_name ?? "");
      setCompanyRfc(companyInfo.company_rfc ?? "");
      setCompanyAddress(companyInfo.company_address ?? "");
      setCompanyLogo(companyInfo.company_logo ?? "");
    }
  }, [companyInfo]);

  const handleSaveCompany = () => {
    setIsSavingCompany(true);
    saveCompanyMutation.mutate({
      company_name: companyName,
      company_rfc: companyRfc,
      company_address: companyAddress,
      company_logo: companyLogo,
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"].includes(file.type)) {
      toast({ title: "Formato no válido", description: "Solo se aceptan imágenes PNG, JPG, WEBP o SVG.", variant: "destructive" });
      return;
    }

    // Validar tamaño (máx 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Archivo muy grande", description: "El logo no debe superar 2 MB.", variant: "destructive" });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "company-logos");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Error al subir el archivo");

      const data = await res.json();
      setCompanyLogo(data.url);
      toast({ title: "Logo subido", description: "Haz clic en 'Guardar Datos de Empresa' para confirmar." });
    } catch (err: any) {
      toast({ title: "Error al subir logo", description: err.message, variant: "destructive" });
    } finally {
      setIsUploadingLogo(false);
      // Reset input so same file can be re-uploaded
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = () => {
    setCompanyLogo("");
  };

  // Get HR email setting
  const { data: hrEmailSetting, isLoading } = trpc.systemSettings.getSetting.useQuery({
    key: "hr_email",
  });

  // Update setting mutation
  const updateSettingMutation = trpc.systemSettings.updateSetting.useMutation({
    onSuccess: () => {
      toast({ title: "Configuración guardada", description: "El correo de RRHH fue actualizado." });
      setIsSaving(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "No se pudo guardar la configuración", variant: "destructive" });
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
      toast({ title: "Campo requerido", description: "Por favor ingrese un correo electrónico válido", variant: "destructive" });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hrEmail)) {
      toast({ title: "Correo inválido", description: "El correo electrónico no es válido", variant: "destructive" });
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
        <Breadcrumb items={[{ label: "Administración", href: "/" }, { label: "Configuración" }]} />
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
        <Breadcrumb items={[{ label: "Administración", href: "/" }, { label: "Configuración" }]} />
        <h1 className="text-3xl font-bold mt-4">Configuración del Sistema</h1>
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

        {/* Datos de empresa */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Datos de la Empresa</CardTitle>
            </div>
            <CardDescription>
              Esta información aparecerá en la portada del Reporte Ejecutivo PDF generado para la STPS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo de empresa */}
            <div className="space-y-2">
              <Label>Logotipo de la Empresa</Label>
              <div className="flex items-start gap-4">
                {/* Preview del logo */}
                <div className="flex-shrink-0 w-24 h-24 border-2 border-dashed border-muted-foreground/30 rounded-lg flex items-center justify-center bg-muted/20 overflow-hidden">
                  {companyLogo ? (
                    <img
                      src={companyLogo}
                      alt="Logo de la empresa"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </div>
                {/* Controles de upload */}
                <div className="flex-1 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Sube el logotipo en formato PNG, JPG o SVG (máx. 2 MB). Aparecerá en la portada del PDF del Reporte Ejecutivo.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploadingLogo}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {isUploadingLogo ? "Subiendo..." : companyLogo ? "Cambiar logo" : "Subir logo"}
                    </Button>
                    {companyLogo && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveLogo}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Razón Social / Nombre de la Empresa</Label>
              <Input
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Empresa S.A. de C.V."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyRfc">RFC</Label>
              <Input
                id="companyRfc"
                value={companyRfc}
                onChange={(e) => setCompanyRfc(e.target.value.toUpperCase())}
                placeholder="EMP010101ABC"
                maxLength={13}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyAddress">Domicilio Fiscal (opcional)</Label>
              <Input
                id="companyAddress"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Av. Reforma 100, Col. Centro, CDMX"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveCompany} disabled={isSavingCompany || isUploadingLogo}>
                <Save className="mr-2 h-4 w-4" />
                {isSavingCompany ? "Guardando..." : "Guardar Datos de Empresa"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Acceso rápido a Core Web Vitals */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <CardTitle>Performance del Sistema</CardTitle>
            </div>
            <CardDescription>
              Monitoreo de Core Web Vitals — latencia y experiencia de usuario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Las métricas LCP, CLS, INP, FCP y TTFB se recopilan automáticamente cuando los usuarios
              navegan por la plataforma y se almacenan en la base de datos para análisis histórico.
            </p>
            <Link href="/web-vitals">
              <Button variant="outline">
                <Zap className="mr-2 h-4 w-4" />
                Ver Dashboard de Core Web Vitals
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
