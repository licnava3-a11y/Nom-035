import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Download, FileText, Plus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const dc3Schema = z.object({
  employeeId: z.number({ message: "Seleccione un empleado" }),
  courseTitle: z.string().min(1, "El título del curso es requerido"),
  courseDuration: z.number().min(1, "La duración debe ser mayor a 0"),
  startDate: z.string().min(1, "La fecha de inicio es requerida"),
  endDate: z.string().min(1, "La fecha de fin es requerida"),
  grade: z.number().min(0).max(100, "La calificación debe estar entre 0 y 100"),
  skills: z.array(z.string()).min(1, "Debe agregar al menos una habilidad"),
  instructorName: z.string().min(1, "El nombre del instructor es requerido"),
  instructorSignatureUrl: z.string().optional(),
  representativeName: z.string().min(1, "El nombre del representante es requerido"),
  representativeSignatureUrl: z.string().optional(),
  companyName: z.string().min(1, "El nombre de la empresa es requerido"),
  companyRfc: z.string().min(12).max(13, "RFC inválido"),
  companyAddress: z.string().min(1, "La dirección es requerida"),
});

type DC3FormData = z.infer<typeof dc3Schema>;

export function DC3Form() {
  // Hook de toast ya importado de sonner
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(null);
  const [generatedReport, setGeneratedReport] = useState<{ folio: string; pdfUrl: string } | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");

  // Obtener lista de empleados
  const { data: employees } = trpc.employees.list.useQuery({ isActive: true });

  // Mutation para generar DC-3
  const generateDC3 = trpc.stpsReports.generateDC3.useMutation({
    onSuccess: (data) => {
      toast({
        title: "✅ Reporte DC-3 Generado",
        description: `Folio: ${data.folio}`,
      });
      setGeneratedReport({ folio: data.folio, pdfUrl: data.pdfUrl });
      reset();
      setSkills([]);
    },
    onError: (error) => {
      toast({
        title: "❌ Error al Generar Reporte",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<DC3FormData>({
    resolver: zodResolver(dc3Schema),
    defaultValues: {
      companyName: "Empresa Ejemplo S.A. de C.V.",
      companyRfc: "EEJ123456789",
      companyAddress: "Av. Principal #123, Col. Centro, Ciudad, Estado, C.P. 12345",
      representativeName: "Lic. Roberto Gómez Pérez",
      instructorName: "Mtro. Fernando Sánchez Torres",
      skills: [],
    },
  });

  const onSubmit = (data: DC3FormData) => {
    if (skills.length === 0) {
      toast({
        title: "❌ Error de Validación",
        description: "Debe agregar al menos una habilidad adquirida",
        variant: "destructive",
      });
      return;
    }
    generateDC3.mutate({ ...data, skills });
  };

  const handleEmployeeChange = (employeeId: string) => {
    const id = parseInt(employeeId);
    setSelectedEmployee(id);
    setValue("employeeId", id);
  };

  const addSkill = () => {
    if (newSkill.trim() === "") {
      toast({
        title: "⚠️ Campo Vacío",
        description: "Escriba una habilidad antes de agregar",
        variant: "destructive",
      });
      return;
    }
    setSkills([...skills, newSkill.trim()]);
    setNewSkill("");
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
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
                placeholder="Ej: Desarrollo de Habilidades de Liderazgo"
              />
              {errors.courseTitle && <p className="text-sm text-destructive">{errors.courseTitle.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseDuration">Duración (horas) *</Label>
              <Input
                id="courseDuration"
                type="number"
                {...register("courseDuration", { valueAsNumber: true })}
                placeholder="Ej: 40"
              />
              {errors.courseDuration && <p className="text-sm text-destructive">{errors.courseDuration.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Calificación (0-100) *</Label>
              <Input
                id="grade"
                type="number"
                {...register("grade", { valueAsNumber: true })}
                placeholder="Ej: 90"
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

        {/* Sección 3: Habilidades Adquiridas */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">3. Habilidades Adquiridas *</h3>
          
          <div className="flex gap-2">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              placeholder="Ej: Comunicación efectiva en equipos de trabajo"
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkill();
                }
              }}
            />
            <Button type="button" onClick={addSkill} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-sm py-2 px-3">
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(index)}
                    className="ml-2 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {skills.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              No se han agregado habilidades. Agregue al menos una habilidad adquirida durante el curso.
            </p>
          )}
        </Card>

        {/* Sección 4: Datos del Instructor y Representante */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">4. Instructor y Representante Legal</h3>
          
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

        {/* Sección 5: Datos de la Empresa */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold">5. Datos de la Empresa</h3>
          
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

        {/* Botón de envío */}
        <div className="flex justify-end">
          <Button type="submit" disabled={generateDC3.isPending} size="lg">
            {generateDC3.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando Reporte...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generar DC-3
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
                ✅ Reporte DC-3 Generado Exitosamente
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
