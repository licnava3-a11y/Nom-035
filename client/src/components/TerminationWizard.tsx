import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  FileText,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface TerminationWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface TerminationData {
  employeeId: number;
  terminationReason: string;
  terminationDate: string;
  notes: string;
  documents: File[];
  documentChecklist: {
    [key: string]: boolean;
  };
}

const TERMINATION_REASONS = [
  { value: "voluntary", label: "Renuncia Voluntaria" },
  { value: "mutual_agreement", label: "Mutuo Acuerdo" },
  { value: "contract_end", label: "Fin de Contrato" },
  { value: "performance", label: "Bajo Desempeño" },
  { value: "misconduct", label: "Falta Grave" },
  { value: "restructuring", label: "Reestructuración" },
  { value: "other", label: "Otro" },
];

const REQUIRED_DOCUMENTS = {
  voluntary: [
    "Carta de renuncia firmada",
    "Acta de entrega de herramientas y equipos",
    "Finiquito firmado",
    "Carta de recomendación (opcional)",
  ],
  mutual_agreement: [
    "Convenio de terminación firmado",
    "Acta de entrega de herramientas y equipos",
    "Finiquito firmado",
    "Carta de recomendación (opcional)",
  ],
  contract_end: [
    "Notificación de no renovación",
    "Acta de entrega de herramientas y equipos",
    "Finiquito firmado",
  ],
  performance: [
    "Evaluaciones de desempeño",
    "Avisos de bajo rendimiento",
    "Acta de entrega de herramientas y equipos",
    "Finiquito firmado",
  ],
  misconduct: [
    "Acta administrativa",
    "Evidencias de la falta",
    "Acta de entrega de herramientas y equipos",
    "Finiquito firmado",
  ],
  restructuring: [
    "Notificación de reestructuración",
    "Acta de entrega de herramientas y equipos",
    "Finiquito firmado",
    "Carta de recomendación (opcional)",
  ],
  other: [
    "Documentación relevante",
    "Acta de entrega de herramientas y equipos",
    "Finiquito firmado",
  ],
};

export function TerminationWizard({
  onComplete,
  onCancel,
}: TerminationWizardProps) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<TerminationData>({
    employeeId: 0,
    terminationReason: "",
    terminationDate: new Date().toISOString().split("T")[0],
    notes: "",
    documents: [],
    documentChecklist: {},
  });

  const { data: employeesData } = trpc.employees.list.useQuery({
    pageSize: 1000,
  });
  const employees = employeesData?.employees;
  const terminateMutation = trpc.employees.terminate.useMutation({
    onSuccess: () => {
      toast.success("Baja procesada exitosamente", {
        description: "El empleado ha sido dado de baja del sistema.",
      });
      onComplete();
    },
    onError: error => {
      toast.error("Error al procesar la baja", {
        description: error.message,
      });
    },
  });

  const handleNext = () => {
    if (step === 1 && (!data.employeeId || !data.terminationReason)) {
      toast.error("Campos requeridos", {
        description:
          "Por favor selecciona un empleado y un motivo de terminación.",
      });
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => setStep(step - 1);

  const handleSubmit = async () => {
    try {
      // Upload documents to S3 first
      const documentUrls: string[] = [];

      if (data.documents.length > 0) {
        toast.info("Subiendo documentos...", {
          description: `Cargando ${data.documents.length} archivo(s) a S3`,
        });

        for (const file of data.documents) {
          try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("folder", "terminations");

            const response = await fetch("/api/upload", {
              method: "POST",
              body: formData,
            });

            if (!response.ok) {
              throw new Error(`Error al subir ${file.name}`);
            }

            const result = await response.json();
            documentUrls.push(result.url);
          } catch (uploadError) {
            console.error(`Error uploading ${file.name}:`, uploadError);
            toast.error("Error al subir archivo", {
              description: `No se pudo subir ${file.name}`,
            });
          }
        }
      }

      await terminateMutation.mutateAsync({
        employeeId: data.employeeId,
        terminationReason: data.terminationReason,
        terminationDate: data.terminationDate,
        notes: data.notes,
        documentUrls,
      });
    } catch (error) {
      console.error("Error al procesar terminación:", error);
    }
  };

  const requiredDocs = data.terminationReason
    ? REQUIRED_DOCUMENTS[
        data.terminationReason as keyof typeof REQUIRED_DOCUMENTS
      ] || []
    : [];

  const allDocsChecked = requiredDocs.every(
    (doc: any) => data.documentChecklist[doc]
  );

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Proceso de Baja de Empleado</CardTitle>
        <CardDescription>Paso {step} de 4</CardDescription>
      </CardHeader>
      <CardContent className="min-h-[400px]">
        {/* Paso 1: Selección de empleado y motivo */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="employee">Empleado *</Label>
              <Select
                value={data.employeeId.toString()}
                onValueChange={value =>
                  setData({ ...data, employeeId: parseInt(value) })
                }
              >
                <SelectTrigger id="employee">
                  <SelectValue placeholder="Selecciona un empleado" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo de Terminación *</Label>
              <Select
                value={data.terminationReason}
                onValueChange={value =>
                  setData({
                    ...data,
                    terminationReason: value,
                    documentChecklist: {},
                  })
                }
              >
                <SelectTrigger id="reason">
                  <SelectValue placeholder="Selecciona un motivo" />
                </SelectTrigger>
                <SelectContent>
                  {TERMINATION_REASONS.map((reason: any) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Fecha de Terminación *</Label>
              <Input
                id="date"
                type="date"
                value={data.terminationDate}
                onChange={e =>
                  setData({ ...data, terminationDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                placeholder="Detalles adicionales sobre la terminación..."
                value={data.notes}
                onChange={e => setData({ ...data, notes: e.target.value })}
                rows={4}
              />
            </div>
          </div>
        )}

        {/* Paso 2: Checklist de documentación */}
        {step === 2 && (
          <div className="space-y-6">
            <Alert>
              <FileText className="h-4 w-4" />
              <AlertDescription>
                Verifica que cuentas con la siguiente documentación requerida
                para procesar la baja.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              {requiredDocs.map((doc: any) => (
                <div key={doc} className="flex items-center space-x-2">
                  <Checkbox
                    id={doc}
                    checked={data.documentChecklist[doc] || false}
                    onCheckedChange={checked =>
                      setData({
                        ...data,
                        documentChecklist: {
                          ...data.documentChecklist,
                          [doc]: checked as boolean,
                        },
                      })
                    }
                  />
                  <Label
                    htmlFor={doc}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {doc}
                  </Label>
                </div>
              ))}
            </div>

            {!allDocsChecked && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Debes confirmar que cuentas con toda la documentación
                  requerida antes de continuar.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Paso 3: Carga de evidencias */}
        {step === 3 && (
          <div className="space-y-6">
            <Alert>
              <Upload className="h-4 w-4" />
              <AlertDescription>
                Carga los documentos de evidencia. Los archivos se almacenarán
                de forma segura en el sistema.
              </AlertDescription>
            </Alert>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-2">
                Arrastra archivos aquí o haz clic para seleccionar
              </p>
              <Input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={e => {
                  const files = Array.from(e.target.files || []);
                  setData({
                    ...data,
                    documents: [...data.documents, ...files],
                  });
                }}
                className="hidden"
                id="file-upload"
              />
              <Label htmlFor="file-upload" className="cursor-pointer">
                <Button type="button" variant="outline" size="sm">
                  Seleccionar Archivos
                </Button>
              </Label>
            </div>

            {data.documents.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Archivos seleccionados:</p>
                <ul className="space-y-1">
                  {data.documents.map((file, index) => (
                    <li
                      key={index}
                      className="text-sm text-gray-600 flex items-center"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-500 mr-2" />
                      {file.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Paso 4: Confirmación */}
        {step === 4 && (
          <div className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Revisa cuidadosamente la información antes de confirmar. Esta
                acción no se puede deshacer.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-600">Empleado</p>
                <p className="text-base">
                  {
                    employees?.find((e: any) => e.id === data.employeeId)
                      ?.firstName
                  }{" "}
                  {
                    employees?.find((e: any) => e.id === data.employeeId)
                      ?.lastName
                  }
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">
                  Motivo de Terminación
                </p>
                <p className="text-base">
                  {
                    TERMINATION_REASONS.find(
                      (r: any) => r.value === data.terminationReason
                    )?.label
                  }
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-600">
                  Fecha de Terminación
                </p>
                <p className="text-base">
                  {new Date(data.terminationDate).toLocaleDateString("es-MX")}
                </p>
              </div>

              {data.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Notas</p>
                  <p className="text-base">{data.notes}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-gray-600">
                  Documentos Cargados
                </p>
                <p className="text-base">{data.documents.length} archivo(s)</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={step === 1 ? onCancel : handleBack}
          disabled={terminateMutation.isPending}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {step === 1 ? "Cancelar" : "Anterior"}
        </Button>
        {step < 4 ? (
          <Button onClick={handleNext} disabled={step === 2 && !allDocsChecked}>
            Siguiente
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={terminateMutation.isPending}>
            {terminateMutation.isPending ? "Procesando..." : "Confirmar Baja"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
