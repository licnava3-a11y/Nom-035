import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Upload, Image as ImageIcon } from "lucide-react";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function Logo() {
  const toast = (opts: { title: string; description: string; variant?: string }) => {
    alert(`${opts.title}: ${opts.description}`);
  };
  const { data: logoData, isLoading, refetch } = trpc.company.logo.get.useQuery();
  const uploadMutation = trpc.company.logo.upload.useMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Por favor seleccione un archivo de imagen válido",
        variant: "destructive",
      });
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "El archivo excede el tamaño máximo de 5MB",
        variant: "destructive",
      });
      return;
    }

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!fileInputRef.current?.files?.[0]) return;

    const file = fileInputRef.current.files[0];
    const reader = new FileReader();

    reader.onloadend = async () => {
      try {
        await uploadMutation.mutateAsync({
          fileData: reader.result as string,
          fileName: file.name,
          mimeType: file.type,
        });

        toast({
          title: "Logo actualizado",
          description: "El logo de la empresa se ha subido correctamente",
        });

        setPreviewUrl(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        refetch();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "No se pudo subir el logo",
          variant: "destructive",
        });
      }
    };

    reader.readAsDataURL(file);
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
        { label: "Logo" }
      ]} />
      
      <div className="mb-6 mt-4">
        <div className="flex items-center gap-3 mb-2">
          <ImageIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Logo de la Empresa</h1>
        </div>
        <p className="text-muted-foreground">
          Gestión del logotipo corporativo para uso en reportes y documentos oficiales
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Logo Actual */}
        <Card>
          <CardHeader>
            <CardTitle>Logo Actual</CardTitle>
            <CardDescription>Logo registrado en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {logoData ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center border-2 border-dashed border-border rounded-lg p-8 bg-muted/50">
                  <img
                    src={logoData.logoUrl}
                    alt="Logo de la empresa"
                    className="max-h-48 object-contain"
                  />
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    <span className="font-medium">Tamaño:</span>{" "}
                    {logoData.fileSize ? (logoData.fileSize / 1024).toFixed(2) : "N/A"} KB
                  </p>
                  <p>
                    <span className="font-medium">Formato:</span> {logoData.mimeType}
                  </p>
                  <p>
                    <span className="font-medium">Última actualización:</span>{" "}
                    {new Date(logoData.createdAt).toLocaleDateString("es-MX")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-12 text-center">
                <ImageIcon className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No hay logo registrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subir Nuevo Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Subir Nuevo Logo</CardTitle>
            <CardDescription>Seleccione una imagen (máximo 5MB)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewUrl ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center border-2 border-dashed border-primary rounded-lg p-8 bg-primary/5">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="max-h-48 object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending}
                    className="flex-1"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Confirmar y Subir
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPreviewUrl(null);
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="logo-upload"
                />
                <label htmlFor="logo-upload">
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-12 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                    <Upload className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium mb-1">Click para seleccionar archivo</p>
                    <p className="text-xs text-muted-foreground">PNG, JPG, GIF (máx. 5MB)</p>
                  </div>
                </label>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1 pt-4 border-t">
              <p className="font-medium">Recomendaciones:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Formato PNG con fondo transparente</li>
                <li>Resolución mínima: 300x300 px</li>
                <li>Proporción cuadrada o rectangular horizontal</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
