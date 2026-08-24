/**
 * Página de Carpeta de Evidencias STPS
 * Muestra evidencias de cumplimiento NOM-035 organizadas por numerales
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  Upload,
  X,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export default function EvidencesFolder() {
  const [companySize, setCompanySize] = useState<"small" | "medium" | "large">(
    "large"
  );
  const [isExporting, setIsExporting] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedNumeral, setSelectedNumeral] = useState<string>("5.1");
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: number;
    title: string;
  } | null>(null);

  // Query para obtener evidencias
  const { data: evidences, isLoading } =
    trpc.evidencesFolder.getEvidences.useQuery({
      companySize,
    });

  // Mutation para exportar PDF (pendiente implementación)
  const exportPDF = trpc.evidencesFolder.generatePDF.useMutation({
    onSuccess: data => {
      // Descargar PDF
      const link = document.createElement("a");
      link.href = `data:application/pdf;base64,${data.pdfBase64}`;
      link.download = `carpeta-evidencias-nom035-${new Date().toISOString().split("T")[0]}.pdf`;
      link.click();

      toast.success("Carpeta exportada", {
        description: "La carpeta de evidencias se ha generado exitosamente",
      });
      setIsExporting(false);
    },
    onError: () => {
      toast.error("Error", {
        description: "No se pudo generar la carpeta de evidencias",
      });
      setIsExporting(false);
    },
  });

  const handleExportPDF = () => {
    setIsExporting(true);
    exportPDF.mutate({ companySize });
  };

  // Mutation para subir evidencia manual
  const utils = trpc.useUtils();
  const uploadEvidence = trpc.evidencesFolder.uploadEvidence.useMutation({
    onSuccess: () => {
      toast.success("Evidencia cargada", {
        description: "La evidencia se ha subido exitosamente",
      });
      setIsUploadDialogOpen(false);
      setUploadTitle("");
      setUploadDescription("");
      setSelectedFile(null);
      setIsUploading(false);
      utils.evidencesFolder.getEvidences.invalidate();
    },
    onError: error => {
      toast.error("Error", {
        description: error.message || "No se pudo subir la evidencia",
      });
      setIsUploading(false);
    },
  });

  // Mutation para eliminar evidencia manual
  const deleteEvidence = trpc.evidencesFolder.deleteEvidence.useMutation({
    onSuccess: () => {
      toast.success("Evidencia eliminada", {
        description: "La evidencia se ha eliminado exitosamente",
      });
      utils.evidencesFolder.getEvidences.invalidate();
    },
    onError: error => {
      toast.error("Error", {
        description: error.message || "No se pudo eliminar la evidencia",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar tamaño (máximo 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Archivo muy grande", {
          description: "El archivo no debe superar 10MB",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || !uploadTitle.trim()) {
      toast.error("Campos requeridos", {
        description: "Debes seleccionar un archivo y proporcionar un título",
      });
      return;
    }

    setIsUploading(true);

    // Convertir archivo a base64
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(",")[1]; // Remover prefijo data:...

      uploadEvidence.mutate({
        numeral: selectedNumeral,
        title: uploadTitle,
        description: uploadDescription || undefined,
        fileData: base64Data,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleDeleteEvidence = (evidenceId: number, title: string) => {
    setDeleteConfirm({ id: evidenceId, title });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "partial":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "pending":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      complete: "default",
      partial: "secondary",
      pending: "destructive",
    };

    const labels: Record<string, string> = {
      complete: "Completo",
      partial: "Parcial",
      pending: "Pendiente",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            Cargando carpeta de evidencias...
          </p>
        </div>
      </div>
    );
  }

  if (!evidences) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            No se pudo cargar la carpeta de evidencias
          </p>
        </div>
      </div>
    );
  }

  // Extraer información de la empresa
  const companyInfo = evidences.companyInfo;

  // Extraer numerales (excluir companyInfo)
  const numerals = Object.entries(evidences).filter(
    ([key]) => key !== "companyInfo"
  );

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Carpeta de Evidencias STPS</h1>
          <p className="text-muted-foreground mt-1">
            Documentación de cumplimiento NOM-035-STPS-2018
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog
            open={isUploadDialogOpen}
            onOpenChange={setIsUploadDialogOpen}
          >
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Cargar Evidencia
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Cargar Evidencia Manual</DialogTitle>
                <DialogDescription>
                  Sube documentos adicionales para complementar la carpeta de
                  evidencias
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Selector de numeral */}
                <div className="space-y-2">
                  <Label htmlFor="numeral">Numeral NOM-035</Label>
                  <Select
                    value={selectedNumeral}
                    onValueChange={setSelectedNumeral}
                  >
                    <SelectTrigger id="numeral">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5.1">
                        5.1 - Política de Prevención
                      </SelectItem>
                      <SelectItem value="5.2">
                        5.2 - Identificación de Factores de Riesgo
                      </SelectItem>
                      <SelectItem value="5.3">
                        5.3 - Acontecimientos Traumáticos
                      </SelectItem>
                      <SelectItem value="5.4">
                        5.4 - Difusión de Información
                      </SelectItem>
                      <SelectItem value="5.5">
                        5.5 - Evaluaciones NOM-035
                      </SelectItem>
                      <SelectItem value="5.6">
                        5.6 - Medidas de Control
                      </SelectItem>
                      <SelectItem value="5.7">5.7 - Difusión</SelectItem>
                      <SelectItem value="5.8">5.8 - Registros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Título */}
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    placeholder="Ej: Política firmada por dirección"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                  />
                </div>

                {/* Descripción */}
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción (opcional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe brevemente el contenido del documento"
                    value={uploadDescription}
                    onChange={e => setUploadDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Selección de archivo */}
                <div className="space-y-2">
                  <Label htmlFor="file">Archivo *</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="file"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={handleFileSelect}
                      className="cursor-pointer"
                    />
                  </div>
                  {selectedFile && (
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm flex-1">
                        {selectedFile.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Formatos: PDF, JPG, PNG, DOC, DOCX (máx. 10MB)
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsUploadDialogOpen(false)}
                  disabled={isUploading}
                >
                  Cancelar
                </Button>
                <Button onClick={handleUploadSubmit} disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Upload className="mr-2 h-4 w-4 animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Subir Evidencia
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={handleExportPDF} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Generando PDF..." : "Exportar PDF"}
          </Button>
        </div>
      </div>

      {/* Información de la empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Empresa</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total de Empleados</p>
            <p className="text-2xl font-bold">{companyInfo.totalEmployees}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tamaño de Empresa</p>
            <p className="text-2xl font-bold capitalize">
              {companyInfo.companySize}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fecha de Generación</p>
            <p className="text-2xl font-bold">
              {new Date(companyInfo.generatedAt).toLocaleDateString("es-MX")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Selector de tamaño de empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Tamaño de Empresa</CardTitle>
          <CardDescription>
            Selecciona el tamaño de empresa para ver los requisitos aplicables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={companySize}
            onValueChange={(value: "small" | "medium" | "large") =>
              setCompanySize(value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona tamaño de empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">
                Pequeña (hasta 15 trabajadores)
              </SelectItem>
              <SelectItem value="medium">
                Mediana (16-50 trabajadores)
              </SelectItem>
              <SelectItem value="large">
                Grande (más de 50 trabajadores)
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Acordeones de numerales */}
      <Card>
        <CardHeader>
          <CardTitle>Evidencias por Numeral NOM-035</CardTitle>
          <CardDescription>
            Documentación organizada según los numerales de la norma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {numerals.map(([key, numeral]: [string, any]) => (
              <AccordionItem key={key} value={key}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(numeral.status)}
                      <div className="text-left">
                        <p className="font-semibold">
                          {key} - {numeral.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {numeral.description}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(numeral.status)}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-4">
                    {numeral.evidences && numeral.evidences.length > 0 ? (
                      numeral.evidences.map((evidence: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <FileText className="h-5 w-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{evidence.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {evidence.description}
                                </p>
                              </div>
                              {evidence.type === "manual" && evidence.id && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteEvidence(
                                      evidence.id,
                                      evidence.title
                                    )
                                  }
                                  className="text-destructive hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {evidence.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(evidence.date).toLocaleDateString(
                                  "es-MX"
                                )}
                              </span>
                              {evidence.fileUrl && (
                                <a
                                  href={evidence.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline"
                                >
                                  Ver archivo
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay evidencias registradas para este numeral</p>
                        <p className="text-sm mt-1">
                          Sube documentos manualmente o genera evidencias
                          automáticas
                        </p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={open => !open && setDeleteConfirm(null)}
        onConfirm={() => {
          if (deleteConfirm) {
            deleteEvidence.mutate({ evidenceId: deleteConfirm.id });
            setDeleteConfirm(null);
          }
        }}
        title="Eliminar Evidencia"
        description={`¿Estás seguro de eliminar la evidencia "${deleteConfirm?.title}"?`}
        impactMessage="Esta evidencia se eliminará permanentemente de la carpeta de cumplimiento NOM-035."
        variant="destructive"
      />
    </div>
  );
}
