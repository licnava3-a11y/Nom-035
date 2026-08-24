import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Shield,
  Upload,
  Trash2,
  CheckCircle,
  XCircle,
  FileKey,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function EfirmaSAT() {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [certToDelete, setCertToDelete] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [certificateFile, setCertificateFile] = useState<string | null>(null);
  const [keyFile, setKeyFile] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    certificateName: "",
    password: "",
    validFrom: "",
    validUntil: "",
    issuer: "",
    serialNumber: "",
  });

  // Queries
  const {
    data: certificates,
    isLoading,
    refetch,
  } = trpc.digitalCertificates.list.useQuery();
  const { data: activeCertificate } =
    trpc.digitalCertificates.getActiveCertificate.useQuery();

  // Mutations
  const uploadCertificate = trpc.digitalCertificates.upload.useMutation({
    onSuccess: () => {
      alert("Certificado cargado exitosamente");
      setDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: error => {
      alert(`Error: ${error.message}`);
      setIsUploading(false);
    },
  });

  const deleteCertificate = trpc.digitalCertificates.delete.useMutation({
    onSuccess: () => {
      alert("Certificado eliminado");
      refetch();
    },
    onError: error => {
      alert(`Error: ${error.message}`);
    },
  });

  const confirmDelete = () => {
    if (certToDelete) {
      deleteCertificate.mutate({ id: certToDelete });
    }
  };

  const validateCertificate =
    trpc.digitalCertificates.validateWithSAT.useMutation({
      onSuccess: data => {
        alert(
          `${data.message}\n\nDetalles:\n- Emisor: ${data.details.issuer || "N/A"}\n- Serie: ${data.details.serialNumber || "N/A"}\n- Vigencia: ${new Date(data.details.validFrom).toLocaleDateString()} - ${new Date(data.details.validUntil).toLocaleDateString()}`
        );
      },
      onError: error => {
        alert(`Error: ${error.message}`);
      },
    });

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "cert" | "key"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result?.toString().split(",")[1];
      if (base64) {
        if (type === "cert") {
          setCertificateFile(base64);
        } else {
          setKeyFile(base64);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    if (!certificateFile || !keyFile) {
      alert("Debes seleccionar ambos archivos (.cer y .key)");
      return;
    }

    if (
      !formData.certificateName ||
      !formData.password ||
      !formData.validFrom ||
      !formData.validUntil
    ) {
      alert("Completa todos los campos obligatorios");
      return;
    }

    setIsUploading(true);
    uploadCertificate.mutate({
      certificateName: formData.certificateName,
      certificateFile: certificateFile,
      keyFile: keyFile,
      password: formData.password,
      validFrom: formData.validFrom,
      validUntil: formData.validUntil,
      issuer: formData.issuer,
      serialNumber: formData.serialNumber,
    });
  };

  const resetForm = () => {
    setFormData({
      certificateName: "",
      password: "",
      validFrom: "",
      validUntil: "",
      issuer: "",
      serialNumber: "",
    });
    setCertificateFile(null);
    setKeyFile(null);
    setIsUploading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Activo
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Expirado
          </Badge>
        );
      case "revoked":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Revocado
          </Badge>
        );
      default:
        return <Badge variant="secondary">Desconocido</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="h-8 w-8" />
          Certificados Digitales e.firma SAT
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestiona tus certificados digitales del SAT para firma electrónica
          avanzada
        </p>
      </div>

      {/* Certificado activo */}
      {activeCertificate && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              Certificado Activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Nombre</div>
                <div className="font-medium">
                  {activeCertificate.certificateName}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Emisor</div>
                <div className="font-medium">
                  {activeCertificate.issuer || "N/A"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Número de Serie
                </div>
                <div className="font-medium font-mono text-sm">
                  {activeCertificate.serialNumber || "N/A"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Vigencia</div>
                <div className="font-medium">
                  {new Date(activeCertificate.validFrom).toLocaleDateString()} -{" "}
                  {new Date(activeCertificate.validUntil).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Panel de carga */}
        <Card>
          <CardHeader>
            <CardTitle>Cargar Nuevo Certificado</CardTitle>
            <CardDescription>
              Sube tus archivos .cer y .key del SAT
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Upload className="mr-2 h-4 w-4" />
                  Cargar Certificado Digital
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cargar Certificado e.firma SAT</DialogTitle>
                  <DialogDescription>
                    Completa la información y selecciona los archivos de tu
                    certificado digital
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="certificateName">
                      Nombre del Certificado *
                    </Label>
                    <Input
                      id="certificateName"
                      value={formData.certificateName}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          certificateName: e.target.value,
                        })
                      }
                      placeholder="Ej: Certificado SAT 2026"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="certFile">Archivo .cer *</Label>
                      <Input
                        id="certFile"
                        type="file"
                        accept=".cer"
                        onChange={e => handleFileChange(e, "cert")}
                      />
                      {certificateFile && (
                        <div className="text-xs text-green-600 mt-1">
                          ✓ Archivo cargado
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="keyFile">Archivo .key *</Label>
                      <Input
                        id="keyFile"
                        type="file"
                        accept=".key"
                        onChange={e => handleFileChange(e, "key")}
                      />
                      {keyFile && (
                        <div className="text-xs text-green-600 mt-1">
                          ✓ Archivo cargado
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password">
                      Contraseña de la Llave Privada *
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={formData.password}
                      onChange={e =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      placeholder="Contraseña del archivo .key"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="validFrom">Válido Desde *</Label>
                      <Input
                        id="validFrom"
                        type="date"
                        value={formData.validFrom}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            validFrom: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="validUntil">Válido Hasta *</Label>
                      <Input
                        id="validUntil"
                        type="date"
                        value={formData.validUntil}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            validUntil: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="issuer">Emisor (opcional)</Label>
                    <Input
                      id="issuer"
                      value={formData.issuer}
                      onChange={e =>
                        setFormData({ ...formData, issuer: e.target.value })
                      }
                      placeholder="Ej: SAT"
                    />
                  </div>

                  <div>
                    <Label htmlFor="serialNumber">
                      Número de Serie (opcional)
                    </Label>
                    <Input
                      id="serialNumber"
                      value={formData.serialNumber}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          serialNumber: e.target.value,
                        })
                      }
                      placeholder="Número de serie del certificado"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-800">
                        <strong>Importante:</strong> La contraseña se almacenará
                        de forma segura y encriptada. Asegúrate de que los
                        archivos .cer y .key correspondan al mismo certificado
                        digital.
                      </div>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleUpload}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>Cargando...</>
                    ) : (
                      <>
                        <FileKey className="mr-2 h-4 w-4" />
                        Cargar Certificado
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="mt-6 space-y-3">
              <div className="text-sm font-medium">Información</div>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  • Los certificados e.firma del SAT son necesarios para firmar
                  digitalmente documentos oficiales
                </p>
                <p>
                  • Debes tener ambos archivos (.cer y .key) y la contraseña de
                  la llave privada
                </p>
                <p>
                  • El sistema validará automáticamente la vigencia del
                  certificado
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Panel de certificados */}
        <Card>
          <CardHeader>
            <CardTitle>Certificados Registrados</CardTitle>
            <CardDescription>
              {certificates?.length || 0} certificado(s) en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Cargando...
              </div>
            ) : certificates && certificates.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {certificates.map((cert: any) => (
                  <div
                    key={cert.id}
                    className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium flex items-center gap-2">
                          {cert.certificateName}
                          {getStatusBadge(cert.status)}
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {cert.issuer && <div>Emisor: {cert.issuer}</div>}
                          {cert.serialNumber && (
                            <div className="font-mono text-xs">
                              Serie: {cert.serialNumber}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Vigencia:{" "}
                          {new Date(cert.validFrom).toLocaleDateString()} -{" "}
                          {new Date(cert.validUntil).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            validateCertificate.mutate({
                              certificateId: cert.id,
                            })
                          }
                          disabled={validateCertificate.isPending}
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setCertToDelete(cert.id);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay certificados registrados
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabla completa */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historial Completo</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando...
            </div>
          ) : certificates && certificates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Emisor</TableHead>
                  <TableHead>Número de Serie</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((cert: any) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium">
                      {cert.certificateName}
                    </TableCell>
                    <TableCell>{cert.issuer || "N/A"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {cert.serialNumber || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(cert.validFrom).toLocaleDateString()} -{" "}
                      {new Date(cert.validUntil).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(cert.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            validateCertificate.mutate({
                              certificateId: cert.id,
                            })
                          }
                        >
                          <Shield className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setCertToDelete(cert.id);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No hay certificados registrados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirm Dialog para Eliminar */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDelete}
        title="¿Eliminar certificado digital?"
        description="Esta acción no se puede deshacer. El certificado será eliminado permanentemente."
        impactMessage="Se eliminará el certificado, la llave privada y todos los registros de validación"
        variant="destructive"
        confirmText="Eliminar"
      />
    </div>
  );
}
