import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Breadcrumb } from "@/components/Breadcrumb";
import { Building2, Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import LegalRepresentatives from '@/components/LegalRepresentatives';

export default function CompanySettings() {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Queries
  const { data: companyData, isLoading, refetch } = trpc.company.generalData.get.useQuery();
  const { data: logoData } = trpc.company.logo.get.useQuery();

  // Mutations
  const updateCompany = trpc.company.generalData.update.useMutation({
    onSuccess: () => {
      toast.success('Datos actualizados correctamente');
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const uploadLogo = trpc.company.logo.upload.useMutation({
    onSuccess: () => {
      toast.success('Logo subido correctamente');
      setLogoFile(null);
      setLogoPreview(null);
      refetch();
    },
    onError: (error) => {
      toast.error(`Error al subir logo: ${error.message}`);
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    razonSocial: '',
    rfc: '',
    direccionFiscal: '',
    giro: '',
    actividadesPreponderantes: '',
    numeroTrabajadores: 0,
    representanteLegal: '',
    telefonoContacto: '',
    emailContacto: '',
    paginaWeb: '',
    notificationEmail: '',
  });

  // Cargar datos existentes
  useEffect(() => {
    if (companyData) {
      setFormData({
        razonSocial: companyData.razonSocial || '',
        rfc: companyData.rfc || '',
        direccionFiscal: companyData.direccionFiscal || '',
        giro: companyData.giro || '',
        actividadesPreponderantes: companyData.actividadesPreponderantes || '',
        numeroTrabajadores: companyData.numeroTrabajadores || 0,
        representanteLegal: companyData.representanteLegal || '',
        telefonoContacto: companyData.telefonoContacto || '',
        emailContacto: companyData.emailContacto || '',
        paginaWeb: companyData.paginaWeb || '',
        notificationEmail: companyData.notificationEmail || '',
      });
    }
  }, [companyData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'numeroTrabajadores' ? parseInt(value) || 0 : value,
    }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona un archivo de imagen');
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('El archivo no debe exceder 5MB');
        return;
      }

      setLogoFile(file);

      // Crear preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        await uploadLogo.mutateAsync({
          fileData: base64Data,
          fileName: logoFile.name,
          mimeType: logoFile.type,
        });
        setIsUploading(false);
      };
      reader.readAsDataURL(logoFile);
    } catch (error) {
      setIsUploading(false);
      toast.error('Error al procesar el archivo');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompany.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      <Breadcrumb items={[
        { label: "Configuración de Empresa" }
      ]} />

      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Building2 className="h-8 w-8 text-blue-600" />
          Configuración de Empresa
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestiona los datos generales de tu empresa y el logotipo corporativo
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Logo de la empresa */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Logotipo Corporativo</CardTitle>
            <CardDescription>
              Sube el logo de tu empresa para personalizar reportes y documentos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo actual */}
            {logoData && (
              <div className="space-y-2">
                <Label>Logo Actual</Label>
                <div className="border rounded-lg p-4 bg-muted/50 flex items-center justify-center">
                  <img 
                    src={logoData.logoUrl} 
                    alt="Logo actual" 
                    className="max-h-32 object-contain"
                  />
                </div>
              </div>
            )}

            {/* Preview del nuevo logo */}
            {logoPreview && (
              <div className="space-y-2">
                <Label>Vista Previa</Label>
                <div className="border rounded-lg p-4 bg-muted/50 flex items-center justify-center">
                  <img 
                    src={logoPreview} 
                    alt="Preview" 
                    className="max-h-32 object-contain"
                  />
                </div>
              </div>
            )}

            {/* Input de archivo */}
            <div className="space-y-2">
              <Label htmlFor="logo">Seleccionar Logo</Label>
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                disabled={isUploading}
              />
              <p className="text-xs text-muted-foreground">
                Formatos: PNG, JPG, SVG. Máximo 5MB
              </p>
            </div>

            <Button
              onClick={handleUploadLogo}
              disabled={!logoFile || isUploading}
              className="w-full"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Subiendo...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Subir Logo
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Formulario de datos */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Datos Generales</CardTitle>
            <CardDescription>
              Información legal y de contacto de la empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="razonSocial">
                    Razón Social <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="razonSocial"
                    name="razonSocial"
                    value={formData.razonSocial}
                    onChange={handleInputChange}
                    required
                    placeholder="Nombre legal de la empresa"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rfc">
                    RFC <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="rfc"
                    name="rfc"
                    value={formData.rfc}
                    onChange={handleInputChange}
                    required
                    placeholder="ABC123456XYZ"
                    maxLength={13}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccionFiscal">
                  Dirección Fiscal <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="direccionFiscal"
                  name="direccionFiscal"
                  value={formData.direccionFiscal}
                  onChange={handleInputChange}
                  required
                  placeholder="Calle, número, colonia, ciudad, estado, CP"
                  rows={2}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="giro">Giro</Label>
                  <Input
                    id="giro"
                    name="giro"
                    value={formData.giro}
                    onChange={handleInputChange}
                    placeholder="Ej: Comercial, Industrial, Servicios"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeroTrabajadores">Número de Trabajadores</Label>
                  <Input
                    id="numeroTrabajadores"
                    name="numeroTrabajadores"
                    type="number"
                    value={formData.numeroTrabajadores}
                    onChange={handleInputChange}
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="actividadesPreponderantes">Actividades Preponderantes</Label>
                <Textarea
                  id="actividadesPreponderantes"
                  name="actividadesPreponderantes"
                  value={formData.actividadesPreponderantes}
                  onChange={handleInputChange}
                  placeholder="Describe las principales actividades de la empresa"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="representanteLegal">Representante Legal</Label>
                <Input
                  id="representanteLegal"
                  name="representanteLegal"
                  value={formData.representanteLegal}
                  onChange={handleInputChange}
                  placeholder="Nombre completo"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="telefonoContacto">Teléfono de Contacto</Label>
                  <Input
                    id="telefonoContacto"
                    name="telefonoContacto"
                    value={formData.telefonoContacto}
                    onChange={handleInputChange}
                    placeholder="(55) 1234-5678"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailContacto">Email de Contacto</Label>
                  <Input
                    id="emailContacto"
                    name="emailContacto"
                    type="email"
                    value={formData.emailContacto}
                    onChange={handleInputChange}
                    placeholder="contacto@empresa.com"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="paginaWeb">Página Web</Label>
                  <Input
                    id="paginaWeb"
                    name="paginaWeb"
                    type="url"
                    value={formData.paginaWeb}
                    onChange={handleInputChange}
                    placeholder="https://www.empresa.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notificationEmail">Email de Notificaciones</Label>
                  <Input
                    id="notificationEmail"
                    name="notificationEmail"
                    type="email"
                    value={formData.notificationEmail}
                    onChange={handleInputChange}
                    placeholder="notificaciones@empresa.com"
                  />
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Los campos marcados con <span className="text-destructive">*</span> son obligatorios
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-2">
                <Button
                  type="submit"
                  disabled={updateCompany.isPending}
                >
                  {updateCompany.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Sección de Representantes Legales */}
      <LegalRepresentatives />
    </div>
  );
}
