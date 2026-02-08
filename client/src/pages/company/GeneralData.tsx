import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Building2 } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function GeneralData() {
  const toast = (opts: { title: string; description: string; variant?: string }) => {
    alert(`${opts.title}: ${opts.description}`);
  };
  const { data: companyData, isLoading } = trpc.company.generalData.get.useQuery();
  const updateMutation = trpc.company.generalData.update.useMutation();

  const [formData, setFormData] = useState({
    razonSocial: "",
    rfc: "",
    direccionFiscal: "",
    giro: "",
    actividadesPreponderantes: "",
    numeroTrabajadores: "",
    representanteLegal: "",
    telefonoContacto: "",
    emailContacto: "",
    paginaWeb: "",
  });

  useEffect(() => {
    if (companyData) {
      setFormData({
        razonSocial: companyData.razonSocial || "",
        rfc: companyData.rfc || "",
        direccionFiscal: companyData.direccionFiscal || "",
        giro: companyData.giro || "",
        actividadesPreponderantes: companyData.actividadesPreponderantes || "",
        numeroTrabajadores: companyData.numeroTrabajadores?.toString() || "",
        representanteLegal: companyData.representanteLegal || "",
        telefonoContacto: companyData.telefonoContacto || "",
        emailContacto: companyData.emailContacto || "",
        paginaWeb: companyData.paginaWeb || "",
      });
    }
  }, [companyData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateMutation.mutateAsync({
        razonSocial: formData.razonSocial,
        rfc: formData.rfc.toUpperCase(),
        direccionFiscal: formData.direccionFiscal,
        giro: formData.giro || undefined,
        actividadesPreponderantes: formData.actividadesPreponderantes || undefined,
        numeroTrabajadores: formData.numeroTrabajadores ? parseInt(formData.numeroTrabajadores) : undefined,
        representanteLegal: formData.representanteLegal || undefined,
        telefonoContacto: formData.telefonoContacto || undefined,
        emailContacto: formData.emailContacto || undefined,
        paginaWeb: formData.paginaWeb || undefined,
      });

      toast({
        title: "Datos actualizados",
        description: "Los datos generales de la empresa se han guardado correctamente",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudieron guardar los datos",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <Breadcrumbs items={[
        { label: "Empresa", path: "/company/general" },
        { label: "Datos Generales" }
      ]} />
      
      <div className="mb-6 mt-4">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Datos Generales de la Empresa</h1>
        </div>
        <p className="text-muted-foreground">
          Información básica del centro de trabajo según NOM-035-STPS-2018 Capítulo 5.1
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Información Corporativa</CardTitle>
            <CardDescription>
              Complete los datos de identificación de la empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Razón Social */}
            <div className="space-y-2">
              <Label htmlFor="razonSocial">
                Razón Social <span className="text-red-500">*</span>
              </Label>
              <Input
                id="razonSocial"
                value={formData.razonSocial}
                onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                placeholder="Nombre legal de la empresa"
                required
              />
            </div>

            {/* RFC */}
            <div className="space-y-2">
              <Label htmlFor="rfc">
                RFC <span className="text-red-500">*</span>
              </Label>
              <Input
                id="rfc"
                value={formData.rfc}
                onChange={(e) => setFormData({ ...formData, rfc: e.target.value.toUpperCase() })}
                placeholder="ABC123456XYZ"
                maxLength={13}
                required
              />
              <p className="text-sm text-muted-foreground">
                Registro Federal de Contribuyentes (13 caracteres)
              </p>
            </div>

            {/* Dirección Fiscal */}
            <div className="space-y-2">
              <Label htmlFor="direccionFiscal">
                Dirección Fiscal <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="direccionFiscal"
                value={formData.direccionFiscal}
                onChange={(e) => setFormData({ ...formData, direccionFiscal: e.target.value })}
                placeholder="Calle, número, colonia, ciudad, estado, código postal"
                rows={3}
                required
              />
            </div>

            {/* Giro */}
            <div className="space-y-2">
              <Label htmlFor="giro">Giro de la Empresa</Label>
              <Input
                id="giro"
                value={formData.giro}
                onChange={(e) => setFormData({ ...formData, giro: e.target.value })}
                placeholder="Ej: Manufactura, Servicios, Comercio"
              />
            </div>

            {/* Actividades Preponderantes */}
            <div className="space-y-2">
              <Label htmlFor="actividadesPreponderantes">Actividades Preponderantes</Label>
              <Textarea
                id="actividadesPreponderantes"
                value={formData.actividadesPreponderantes}
                onChange={(e) => setFormData({ ...formData, actividadesPreponderantes: e.target.value })}
                placeholder="Describa las principales actividades económicas de la empresa"
                rows={3}
              />
            </div>

            {/* Número de Trabajadores */}
            <div className="space-y-2">
              <Label htmlFor="numeroTrabajadores">Número de Trabajadores</Label>
              <Input
                id="numeroTrabajadores"
                type="number"
                value={formData.numeroTrabajadores}
                onChange={(e) => setFormData({ ...formData, numeroTrabajadores: e.target.value })}
                placeholder="0"
                min="0"
              />
            </div>

            {/* Representante Legal */}
            <div className="space-y-2">
              <Label htmlFor="representanteLegal">Representante Legal</Label>
              <Input
                id="representanteLegal"
                value={formData.representanteLegal}
                onChange={(e) => setFormData({ ...formData, representanteLegal: e.target.value })}
                placeholder="Nombre completo del representante legal"
              />
            </div>

            {/* Teléfono de Contacto */}
            <div className="space-y-2">
              <Label htmlFor="telefonoContacto">Teléfono de Contacto</Label>
              <Input
                id="telefonoContacto"
                type="tel"
                value={formData.telefonoContacto}
                onChange={(e) => setFormData({ ...formData, telefonoContacto: e.target.value })}
                placeholder="(55) 1234-5678"
              />
            </div>

            {/* Email de Contacto */}
            <div className="space-y-2">
              <Label htmlFor="emailContacto">Email de Contacto</Label>
              <Input
                id="emailContacto"
                type="email"
                value={formData.emailContacto}
                onChange={(e) => setFormData({ ...formData, emailContacto: e.target.value })}
                placeholder="contacto@empresa.com"
              />
            </div>

            {/* Página Web */}
            <div className="space-y-2">
              <Label htmlFor="paginaWeb">Página Web</Label>
              <Input
                id="paginaWeb"
                type="url"
                value={formData.paginaWeb}
                onChange={(e) => setFormData({ ...formData, paginaWeb: e.target.value })}
                placeholder="https://www.empresa.com"
              />
            </div>

            {/* Botón de Guardar */}
            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Datos
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
