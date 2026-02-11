import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Download, FileText, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const dc4Schema = z.object({
  reportTitle: z.string().min(1, "El título del reporte es requerido"),
  reportPeriod: z.string().min(1, "El periodo es requerido"),
  certificates: z.array(
    z.object({
      employeeId: z.number(),
      employeeName: z.string(),
      employeeCurp: z.string(),
      courseTitle: z.string(),
      courseDuration: z.number(),
      completionDate: z.string(),
      grade: z.number(),
      folio: z.string(),
    })
  ).min(1, "Debe agregar al menos un certificado"),
  companyName: z.string().min(1, "El nombre de la empresa es requerido"),
  companyRfc: z.string().min(12).max(13, "RFC inválido"),
  companyAddress: z.string().min(1, "La dirección es requerida"),
  representativeName: z.string().min(1, "El nombre del representante es requerido"),
  representativeSignatureUrl: z.string().optional(),
});

type DC4FormData = z.infer<typeof dc4Schema>;

interface Certificate {
  employeeId: number;
  employeeName: string;
  employeeCurp: string;
  courseTitle: string;
  courseDuration: number;
  completionDate: string;
  grade: number;
  folio: string;
}

export function DC4Form() {
  // Hook de toast ya importado de sonner
  const [generatedReport, setGeneratedReport] = useState<{ folio: string; pdfUrl: string } | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  
  // Estado para nuevo certificado
  const [newCert, setNewCert] = useState({
    employeeName: "",
    employeeCurp: "",
    courseTitle: "",
    courseDuration: 0,
    completionDate: "",
    grade: 0,
    folio: "",
  });

  // Mutation para generar DC-4
  const generateDC4 = trpc.stpsReports.generateDC4.useMutation({
    onSuccess: (data) => {
      toast.success("✅ Reporte DC-4 Generado", {
        description: `Folio: ${data.folio}`,
      });
      setGeneratedReport({ folio: data.folio, pdfUrl: data.pdfUrl });
      reset();
      setCertificates([]);
    },
    onError: (error) => {
      toast.error("❌ Error al Generar Reporte", {
        description: error.message,
      });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DC4FormData>({
    resolver: zodResolver(dc4Schema),
    defaultValues: {
      reportTitle: "Lista de Constancias de Capacitación",
      reportPeriod: `Enero - Diciembre ${new Date().getFullYear()}`,
      companyName: "Empresa Ejemplo S.A. de C.V.",
      companyRfc: "EEJ123456789",
      companyAddress: "Av. Principal #123, Col. Centro, Ciudad, Estado, C.P. 12345",
      representativeName: "Lic. Roberto Gómez Pérez",
      certificates: [],
    },
  });

  const onSubmit = (data: DC4FormData) => {
    if (certificates.length === 0) {
      toast.error("❌ Error de Validación", {
        description: "Debe agregar al menos un certificado a la lista",
      });
      return;
    }
    generateDC4.mutate({ ...data, certificates });
  };

  const addCertificate = () => {
    if (!newCert.employeeName || !newCert.courseTitle || !newCert.folio) {
      toast.error("⚠️ Campos Incompletos", {
        description: "Complete todos los campos requeridos antes de agregar",
      });
      return;
    }

    const cert: Certificate = {
      employeeId: Date.now(), // ID temporal
      employeeName: newCert.employeeName,
      employeeCurp: newCert.employeeCurp || "N/A",
      courseTitle: newCert.courseTitle,
      courseDuration: newCert.courseDuration,
      completionDate: newCert.completionDate,
      grade: newCert.grade,
      folio: newCert.folio,
    };

    setCertificates([...certificates, cert]);
    setNewCert({
      employeeName: "",
      employeeCurp: "",
      courseTitle: "",
      courseDuration: 0,
      completionDate: "",
      grade: 0,
      folio: "",
    });

    toast.success("✅ Certificado Agregado", {
      description: `${newCert.employeeName} - ${newCert.courseTitle}`,
    });
  };

  const removeCertificate = (index: number) => {
    setCertificates(certificates.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Sección 1: Datos del Reporte */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">1. Datos del Reporte</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportTitle">Título del Reporte *</Label>
              <Input
                id="reportTitle"
                {...register("reportTitle")}
                placeholder="Ej: Lista de Constancias de Capacitación 2026"
              />
              {errors.reportTitle && <p className="text-sm text-destructive">{errors.reportTitle.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="reportPeriod">Periodo *</Label>
              <Input
                id="reportPeriod"
                {...register("reportPeriod")}
                placeholder="Ej: Enero - Diciembre 2026"
              />
              {errors.reportPeriod && <p className="text-sm text-destructive">{errors.reportPeriod.message}</p>}
            </div>
          </div>
        </Card>

        {/* Sección 2: Agregar Certificados */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">2. Agregar Certificados a la Lista</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Nombre del Empleado *</Label>
              <Input
                value={newCert.employeeName}
                onChange={(e) => setNewCert({ ...newCert, employeeName: e.target.value })}
                placeholder="Ej: Juan Pérez López"
              />
            </div>

            <div className="space-y-2">
              <Label>CURP</Label>
              <Input
                value={newCert.employeeCurp}
                onChange={(e) => setNewCert({ ...newCert, employeeCurp: e.target.value })}
                placeholder="Ej: PELJ850101HDFRPN01"
              />
            </div>

            <div className="space-y-2">
              <Label>Curso *</Label>
              <Input
                value={newCert.courseTitle}
                onChange={(e) => setNewCert({ ...newCert, courseTitle: e.target.value })}
                placeholder="Ej: NOM-035 Fundamentos"
              />
            </div>

            <div className="space-y-2">
              <Label>Duración (hrs)</Label>
              <Input
                type="number"
                value={newCert.courseDuration}
                onChange={(e) => setNewCert({ ...newCert, courseDuration: parseInt(e.target.value) || 0 })}
                placeholder="Ej: 20"
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha de Conclusión</Label>
              <Input
                type="date"
                value={newCert.completionDate}
                onChange={(e) => setNewCert({ ...newCert, completionDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Calificación</Label>
              <Input
                type="number"
                value={newCert.grade}
                onChange={(e) => setNewCert({ ...newCert, grade: parseInt(e.target.value) || 0 })}
                placeholder="Ej: 85"
              />
            </div>

            <div className="space-y-2">
              <Label>Folio *</Label>
              <Input
                value={newCert.folio}
                onChange={(e) => setNewCert({ ...newCert, folio: e.target.value })}
                placeholder="Ej: DC2-0001/2026"
              />
            </div>

            <div className="space-y-2 flex items-end">
              <Button type="button" onClick={addCertificate} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Agregar
              </Button>
            </div>
          </div>

          {/* Tabla de certificados agregados */}
          {certificates.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-2">Certificados Agregados ({certificates.length})</h4>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>CURP</TableHead>
                      <TableHead>Curso</TableHead>
                      <TableHead>Duración</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Calificación</TableHead>
                      <TableHead>Folio</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {certificates.map((cert, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{cert.employeeName}</TableCell>
                        <TableCell className="font-mono text-xs">{cert.employeeCurp}</TableCell>
                        <TableCell>{cert.courseTitle}</TableCell>
                        <TableCell>{cert.courseDuration} hrs</TableCell>
                        <TableCell>{cert.completionDate}</TableCell>
                        <TableCell>{cert.grade}</TableCell>
                        <TableCell className="font-mono text-xs">{cert.folio}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCertificate(index)}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {certificates.length === 0 && (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              No se han agregado certificados. Agregue al menos un certificado para generar el reporte DC-4.
            </p>
          )}
        </Card>

        {/* Sección 3: Datos de la Empresa */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">3. Datos de la Empresa y Representante Legal</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nombre de la Empresa *</Label>
              <Input
                id="companyName"
                {...register("companyName")}
                placeholder="Ej: Empresa Ejemplo S.A. de C.V."
              />
              {errors.companyName && <p className="text-sm text-destructive">{errors.companyName.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyRfc">RFC de la Empresa *</Label>
              <Input
                id="companyRfc"
                {...register("companyRfc")}
                placeholder="Ej: EEJ123456789"
                maxLength={13}
              />
              {errors.companyRfc && <p className="text-sm text-destructive">{errors.companyRfc.message}</p>}
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="companyAddress">Domicilio de la Empresa *</Label>
              <Input
                id="companyAddress"
                {...register("companyAddress")}
                placeholder="Ej: Av. Principal #123, Col. Centro, Ciudad, Estado, C.P. 12345"
              />
              {errors.companyAddress && <p className="text-sm text-destructive">{errors.companyAddress.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="representativeName">Nombre del Representante Legal *</Label>
              <Input
                id="representativeName"
                {...register("representativeName")}
                placeholder="Ej: Lic. Roberto Gómez Pérez"
              />
              {errors.representativeName && <p className="text-sm text-destructive">{errors.representativeName.message}</p>}
            </div>
          </div>
        </Card>

        {/* Botón de envío */}
        <div className="flex justify-end">
          <Button type="submit" disabled={generateDC4.isPending} size="lg">
            {generateDC4.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando Reporte...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generar DC-4
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Resultado del reporte generado */}
      {generatedReport && (
        <Card className="p-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                ✅ Reporte DC-4 Generado Exitosamente
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Folio: <span className="font-mono font-bold">{generatedReport.folio}</span>
              </p>
            </div>
            <Button asChild variant="outline">
              <a href={generatedReport.pdfUrl} download target="_blank" rel="noopener noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Descargar PDF
              </a>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
