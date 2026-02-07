import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, PenTool, CheckCircle, Clock, XCircle } from "lucide-react";

export default function DigitalSignature() {
  const toast = (opts: { title: string; description: string; variant?: string }) => {
    alert(`${opts.title}: ${opts.description}`);
  };

  const { data: signatures, isLoading, refetch } = trpc.company.digitalSignature.list.useQuery();
  const createMutation = trpc.company.digitalSignature.create.useMutation();
  const authorizeMutation = trpc.company.digitalSignature.authorize.useMutation();
  const deleteMutation = trpc.company.digitalSignature.delete.useMutation();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nombreFirmante: "",
    cargo: "",
    departamento: "",
    tipoFirmante: "externo" as "interno" | "externo",
  });
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormData({
      nombreFirmante: "",
      cargo: "",
      departamento: "",
      tipoFirmante: "externo",
    });
    setSignatureFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "El archivo excede el tamaño máximo de 2MB",
        variant: "destructive",
      });
      return;
    }

    setSignatureFile(file);

    // Crear preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!signatureFile) {
      toast({
        title: "Error",
        description: "Por favor seleccione un archivo de firma digital",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await createMutation.mutateAsync({
          nombreFirmante: formData.nombreFirmante,
          cargo: formData.cargo,
          departamento: formData.departamento || undefined,
          firmaData: reader.result as string,
          tipoFirmante: formData.tipoFirmante,
        });

        toast({
          title: "Solicitud enviada",
          description: "La solicitud de firma digital ha sido enviada para autorización del administrador",
        });

        setIsDialogOpen(false);
        resetForm();
        refetch();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "No se pudo crear la solicitud de firma digital",
          variant: "destructive",
        });
      }
    };

    reader.readAsDataURL(signatureFile);
  };

  const handleAuthorize = async (id: number) => {
    try {
      await authorizeMutation.mutateAsync({ id, approved: true });
      toast({
        title: "Firma autorizada",
        description: "La firma digital ha sido autorizada correctamente",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo autorizar la firma digital",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Está seguro de eliminar esta firma digital?")) return;

    try {
      await deleteMutation.mutateAsync({ id });
      toast({
        title: "Firma eliminada",
        description: "La firma digital se ha eliminado correctamente",
      });
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar la firma digital",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: "pendiente" | "autorizado" | "rechazado") => {
    switch (status) {
      case "autorizado":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="mr-1 h-3 w-3" />
            Autorizada
          </Badge>
        );
      case "pendiente":
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Pendiente
          </Badge>
        );
      case "rechazado":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Rechazada
          </Badge>
        );
      default:
        return null;
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
    <div className="container max-w-6xl py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <PenTool className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Catálogo de Firmas Digitales</h1>
          </div>
          <p className="text-muted-foreground">
            Gestión de firmas digitales autorizadas para documentos oficiales (NOM-151)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Solicitar Nueva Firma
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Solicitar Nueva Firma Digital</DialogTitle>
              <DialogDescription>
                Complete la información del firmante. La solicitud será enviada al administrador para autorización.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                {/* Nombre Firmante */}
                <div className="space-y-2">
                  <Label htmlFor="nombreFirmante">
                    Nombre del Firmante <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nombreFirmante"
                    value={formData.nombreFirmante}
                    onChange={(e) => setFormData({ ...formData, nombreFirmante: e.target.value })}
                    placeholder="Nombre completo"
                    required
                  />
                </div>

                {/* Cargo */}
                <div className="space-y-2">
                  <Label htmlFor="cargo">
                    Cargo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cargo"
                    value={formData.cargo}
                    onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                    placeholder="Cargo o puesto"
                    required
                  />
                </div>

                {/* Departamento */}
                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input
                    id="departamento"
                    value={formData.departamento}
                    onChange={(e) => setFormData({ ...formData, departamento: e.target.value })}
                    placeholder="Departamento o área"
                  />
                </div>

                {/* Firma Digital */}
                <div className="space-y-2">
                  <Label htmlFor="firmaFile">
                    Archivo de Firma Digital <span className="text-red-500">*</span>
                  </Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="firmaFile"
                  />
                  {previewUrl ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-center border-2 border-dashed border-primary rounded-lg p-4 bg-primary/5">
                        <img
                          src={previewUrl}
                          alt="Preview firma"
                          className="max-h-32 object-contain"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setPreviewUrl(null);
                          setSignatureFile(null);
                          if (fileInputRef.current) {
                            fileInputRef.current.value = "";
                          }
                        }}
                        className="w-full"
                      >
                        Cambiar Archivo
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="firmaFile">
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8 cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors">
                        <PenTool className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium">Click para seleccionar firma</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG (máx. 2MB)</p>
                      </div>
                    </label>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Suba una imagen de la firma autógrafa del firmante con fondo transparente
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Solicitud"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Firmas */}
      {signatures && signatures.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {signatures.map((sig) => (
            <Card key={sig.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{sig.nombreFirmante}</CardTitle>
                    <CardDescription>{sig.cargo}</CardDescription>
                  </div>
                  {getStatusBadge(sig.estadoAutorizacion)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Preview de Firma */}
                {sig.firmaUrl && (
                  <div className="flex items-center justify-center border rounded-lg p-4 bg-muted/50">
                    <img
                      src={sig.firmaUrl}
                      alt={`Firma de ${sig.nombreFirmante}`}
                      className="max-h-24 object-contain"
                    />
                  </div>
                )}

                {/* Información */}
                <div className="space-y-1 text-sm">
                  {sig.departamento && (
                    <div>
                      <span className="font-medium">Departamento:</span> {sig.departamento}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Fecha de solicitud:</span>{" "}
                    {new Date(sig.createdAt).toLocaleDateString("es-MX")}
                  </div>
                  {sig.fechaAutorizacion && (
                    <div>
                      <span className="font-medium">Fecha de autorización:</span>{" "}
                      {new Date(sig.fechaAutorizacion).toLocaleDateString("es-MX")}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex gap-2 pt-2">
                  {sig.estadoAutorizacion === "pendiente" && (
                    <Button
                      size="sm"
                      onClick={() => handleAuthorize(sig.id)}
                      disabled={authorizeMutation.isPending}
                      className="flex-1"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Autorizar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(sig.id)}
                    disabled={deleteMutation.isPending}
                    className={sig.estadoAutorizacion === "pendiente" ? "" : "flex-1"}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PenTool className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No hay firmas digitales registradas</p>
            <p className="text-sm text-muted-foreground mb-4">
              Solicite la primera firma digital para documentos oficiales
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
