import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import ProtectedButton from "@/components/ProtectedButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Download, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";

const dc2Schema = z.object({
  employeeId: z.number({ message: "Seleccione un empleado" }),
  courseTitle: z.string().min(1, "El título del curso es requerido"),
  courseDuration: z.number().min(1, "La duración debe ser mayor a 0"),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().min(1, "La fecha de fin es requerida"),
  grade: z.number().min(0).max(100, "La calificación debe estar entre 0 y 100"),
  instructorName: z.string().min(1, "El nombre del instructor es requerido"),
  instructorSignatureUrl: z.string().optional(),
  representativeName: z.string().min(1, "El nombre del representante es requerido"),
  representativeSignatureUrl: z.string().optional(),
  companyName: z.string().min(1, "El nombre de la empresa es requerido"),
  companyRfc: z.string().min(12).max(13, "RFC inválido"),
  companyAddress: z.string().min(1, "La dirección es requerida"),
});

type DC2FormData = z.infer<typeof dc2Schema>;

export function DC2Form() {
  // Hook de toast ya importado de sonner
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [generatedReport, setGeneratedReport] = useState<{ folio: string; pdfUrl: string } | null>(null);

  // Obtener lista de empleados
  const { data: employeesData } = trpc.employees.list.useQuery({ isActive: true });
  const employees = employeesData?.employees;

  // Mutation para generar DC-2
  const generateDC2 = trpc.stpsReports.generateDC2.useMutation({
    onSuccess: (data) => {
      toast.success("✅ Reporte DC-2 Generado Exitosamente", {
        description: `Folio: ${data.folio}. El PDF está disponible para descarga.`,
        action: {
          label: "Descargar PDF",
          onClick: () => window.open(data.pdfUrl, "_blank"),
        },
        duration: 10000, // 10 segundos
      });
      setGeneratedReport({ folio: data.folio, pdfUrl: data.pdfUrl });
      reset();
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
    setValue,
    reset,
    formState: { errors },
  } = useForm<DC2FormData>({
    resolver: zodResolver(dc2Schema),
    defaultValues: {
      companyName: "Empresa Ejemplo S.A. de C.V.",
      companyRfc: "EEJ123456789",
      companyAddress: "Av. Principal #123, Col. Centro, Ciudad, Estado, C.P. 12345",
      representativeName: "Lic. Roberto Gómez Pérez",
      instructorName: "Mtro. Fernando Sánchez Torres",
    },
  });

  const onSubmit = (data: DC2FormData) => {
    generateDC2.mutate(data);
  };

  const handleEmployeeChange = (employeeId: string) => {
    const id = parseInt(employeeId);
    setSelectedEmployee(id);
    setValue("employeeId", id);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Sección 1: Datos del Empleado */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">1. Datos del Empleado</h3>
          
          <div className="space-y-2">
            <Label htmlFor="employee">Empleado *</Label>
            <Select onValueChange={handleEmployeeChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un empleado" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((emp: any) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.firstName} {emp.lastName} - {emp.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employeeId && <p className="text-sm text-destructive">{errors.employeeId.message}</p>}
          </div>
        </Card>

        {/* Sección 2: Datos del Curso */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">2. Datos del Curso</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="courseTitle">Título del Curso *</Label>
              <Input
                id="courseTitle"
                {...register("courseTitle")}
                placeholder="Ej: Fundamentos de la NOM-035-STPS-2018"
              />
              {errors.courseTitle && <p className="text-sm text-destructive">{errors.courseTitle.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseDuration">Duración (horas) *</Label>
              <Input
                id="courseDuration"
                type="number"
                {...register("courseDuration", { valueAsNumber: true })}
                placeholder="Ej: 20"
              />
              {errors.courseDuration && <p className="text-sm text-destructive">{errors.courseDuration.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Calificación (0-100) *</Label>
              <Input
                id="grade"
                type="number"
                {...register("grade", { valueAsNumber: true })}
                placeholder="Ej: 85"
              />
              {errors.grade && <p className="text-sm text-destructive">{errors.grade.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha de Inicio *</Label>
              <Input
                id="startDate"
                type="date"
                {...register("startDate")}
              />
              {errors.startDate && <p className="text-sm text-destructive">{errors.startDate.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha de Fin *</Label>
              <Input
                id="endDate"
                type="date"
                {...register("endDate")}
              />
              {errors.endDate && <p className="text-sm text-destructive">{errors.endDate.message}</p>}
            </div>
          </div>
        </Card>

        {/* Sección 3: Datos del Instructor y Representante */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">3. Instructor y Representante Legal</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="instructorName">Nombre del Instructor *</Label>
              <Input
                id="instructorName"
                {...register("instructorName")}
                placeholder="Ej: Mtro. Fernando Sánchez Torres"
              />
              {errors.instructorName && <p className="text-sm text-destructive">{errors.instructorName.message}</p>}
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

        {/* Sección 4: Datos de la Empresa */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">4. Datos de la Empresa</h3>
          
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
          </div>
        </Card>

        {/* Botón de generación */}
        <div className="flex justify-end">
          <ProtectedButton
            type="submit"
            className="w-full"
            disabled={generateDC2.isPending}
            requiredPermission="can_create"
            fallbackMessage="Solo los administradores pueden generar reportes STPS"
          >
            {generateDC2.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando Reporte...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generar DC-2
              </>
            )}
          </ProtectedButton>
        </div>
      </form>

      {/* Resultado del reporte generado */}
      {generatedReport && (
        <Card className="p-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                ✅ Reporte DC-2 Generado Exitosamente
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
